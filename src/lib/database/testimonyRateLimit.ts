// @ts-nocheck
/**
 * Server-Side Testimony Generation Rate Limiting
 *
 * Tracks and enforces rate limits for AI testimony generation via Supabase.
 * This is Layer 2 of the 3-layer rate limiting system:
 *   Layer 1: Client-side localStorage (rateLimiter.ts) — 3 generations/hour
 *   Layer 2: Supabase testimony_generations table — 5 generations/24hr per user
 *   Layer 3: Backend proxy (Edge Function) — enforces limits server-side
 *
 * This layer is harder to bypass than localStorage since it requires DB access.
 */

import { supabase } from '../supabase';

// Rate limit constants
const MAX_GENERATIONS_PER_DAY = 5; // Authenticated users: 5 per 24 hours
const MAX_GENERATIONS_PER_HOUR_GUEST = 3; // Guest/anonymous: 3 per hour (matched to client-side)
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in ms
const GUEST_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms

/**
 * Check if an authenticated user has exceeded their generation limit
 * @param userId - Supabase user UUID
 * @returns { allowed, remaining, retryAfterMs }
 */
export async function checkUserGenerationLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterMs: number | null;
    reason: string | null;
}> {
    if (!supabase) {
        // If Supabase isn't configured, fall back to allowing (client-side limits still apply)
        return { allowed: true, remaining: MAX_GENERATIONS_PER_DAY, retryAfterMs: null, reason: null };
    }

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { data, error } = await supabase
        .from('testimony_generations')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error checking generation rate limit:', error);
        // On error, allow the request (fail open) — client-side limits still protect
        return { allowed: true, remaining: MAX_GENERATIONS_PER_DAY, retryAfterMs: null, reason: null };
    }

    const generationCount = data?.length || 0;
    const remaining = Math.max(0, MAX_GENERATIONS_PER_DAY - generationCount);

    if (generationCount >= MAX_GENERATIONS_PER_DAY) {
        // Calculate when the oldest generation in the window expires
        const oldestGeneration = data![0];
        const oldestTime = new Date(oldestGeneration.created_at).getTime();
        const retryAfterMs = (oldestTime + RATE_LIMIT_WINDOW_MS) - Date.now();

        const retryHours = Math.ceil(retryAfterMs / (60 * 60 * 1000));

        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(0, retryAfterMs),
            reason: `You've reached the daily limit of ${MAX_GENERATIONS_PER_DAY} testimony generations. Please try again in about ${retryHours} hour${retryHours !== 1 ? 's' : ''}.`
        };
    }

    return { allowed: true, remaining, retryAfterMs: null, reason: null };
}

/**
 * Check if a guest (by IP hash) has exceeded their generation limit
 * @param ipHash - SHA-256 hash of the user's IP address
 * @returns { allowed, remaining, retryAfterMs }
 */
export async function checkGuestGenerationLimit(ipHash: string): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterMs: number | null;
    reason: string | null;
}> {
    if (!supabase) {
        return { allowed: true, remaining: MAX_GENERATIONS_PER_HOUR_GUEST, retryAfterMs: null, reason: null };
    }

    const windowStart = new Date(Date.now() - GUEST_RATE_LIMIT_WINDOW_MS).toISOString();

    const { data, error } = await supabase
        .from('testimony_generations')
        .select('id, created_at')
        .eq('ip_hash', ipHash)
        .is('user_id', null)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error checking guest generation rate limit:', error);
        return { allowed: true, remaining: MAX_GENERATIONS_PER_HOUR_GUEST, retryAfterMs: null, reason: null };
    }

    const generationCount = data?.length || 0;
    const remaining = Math.max(0, MAX_GENERATIONS_PER_HOUR_GUEST - generationCount);

    if (generationCount >= MAX_GENERATIONS_PER_HOUR_GUEST) {
        const oldestGeneration = data![0];
        const oldestTime = new Date(oldestGeneration.created_at).getTime();
        const retryAfterMs = (oldestTime + GUEST_RATE_LIMIT_WINDOW_MS) - Date.now();

        const retryMinutes = Math.ceil(retryAfterMs / (60 * 1000));

        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(0, retryAfterMs),
            reason: `You've reached the limit of ${MAX_GENERATIONS_PER_HOUR_GUEST} testimony generations per hour. Please try again in about ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''}.`
        };
    }

    return { allowed: true, remaining, retryAfterMs: null, reason: null };
}

/**
 * Log a testimony generation attempt (called after successful or failed generation)
 * @param params - Generation details to log
 */
export async function logTestimonyGeneration(params: {
    userId?: string;
    ipHash?: string;
    model: string;
    inputWordCount: number;
    outputWordCount?: number;
    success: boolean;
    errorType?: string;
}): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from('testimony_generations')
        .insert({
            user_id: params.userId || null,
            ip_hash: params.ipHash || null,
            model: params.model,
            input_word_count: params.inputWordCount,
            output_word_count: params.outputWordCount || null,
            success: params.success,
            error_type: params.errorType || null,
        });

    if (error) {
        console.error('Error logging testimony generation:', error);
    }
}

/**
 * Get generation stats for a user (for UI display)
 * @param userId - Supabase user UUID
 * @returns Generation count and remaining
 */
export async function getUserGenerationStats(userId: string): Promise<{
    generationsToday: number;
    remaining: number;
    limit: number;
}> {
    if (!supabase) {
        return { generationsToday: 0, remaining: MAX_GENERATIONS_PER_DAY, limit: MAX_GENERATIONS_PER_DAY };
    }

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { count, error } = await supabase
        .from('testimony_generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', windowStart);

    if (error) {
        console.error('Error fetching generation stats:', error);
        return { generationsToday: 0, remaining: MAX_GENERATIONS_PER_DAY, limit: MAX_GENERATIONS_PER_DAY };
    }

    const generationsToday = count || 0;

    return {
        generationsToday,
        remaining: Math.max(0, MAX_GENERATIONS_PER_DAY - generationsToday),
        limit: MAX_GENERATIONS_PER_DAY
    };
}
