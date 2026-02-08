/**
 * Claude AI Service for Testimony Generation
 *
 * Uses Anthropic Claude API (Sonnet 4) to generate authentic Christian
 * testimonies based on user answers to 4 questions.
 *
 * Authenticity-first approach: the AI rephrases and polishes the user's
 * own words into narrative prose, but NEVER invents details, emotions,
 * or experiences they didn't describe.
 *
 * 3-Layer Rate Limiting:
 *   Layer 1: Client-side localStorage (rateLimiter.ts) — checked in TestimonyQuestionnaire
 *   Layer 2: Supabase testimony_generations table — checked in backend proxy
 *   Layer 3: Cloudflare Pages Function proxy (/api/generate-testimony) — server-side enforcement
 *
 * Architecture: ALL requests go through the Cloudflare Pages Function proxy.
 * The API key is stored server-side only — never exposed to the browser.
 */

// Backend proxy URL — Cloudflare Pages Function
const PROXY_URL = '/api/generate-testimony';

export interface TestimonyAnswers {
    question1: string; // Background/pre-crisis life
    question2: string; // Struggles/crisis experienced
    question3: string; // Turning point/transformation
    question4: string; // Current calling/mission
}

export interface TestimonyGenerationOptions {
    answers: TestimonyAnswers;
    userAge?: number;
    userName?: string;
    userId?: string; // Supabase user UUID for server-side rate limiting
}

export interface TestimonyGenerationResult {
    success: boolean;
    testimony?: string;
    error?: string;
    wordCount?: number;
}

/**
 * Profanity check using word boundaries to avoid false positives
 * (e.g. "class" matching "ass", "hello" matching "hell")
 */
function containsProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    const profanityWords = [
        'fuck', 'fucking', 'fucked',
        'shit', 'shitty',
        'bitch',
        'bastard',
        'cunt',
    ];

    return profanityWords.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerText);
    });
}


/**
 * Generate a testimony story from user answers using Claude AI.
 *
 * All requests go through the Cloudflare Pages Function proxy.
 * The API key never touches the browser.
 */
export async function generateTestimony(
    options: TestimonyGenerationOptions
): Promise<TestimonyGenerationResult> {
    const { answers } = options;

    // Basic validation
    if (!answers.question1 || !answers.question2 || !answers.question3 || !answers.question4) {
        return {
            success: false,
            error: 'All 4 questions must be answered to generate a testimony.'
        };
    }

    // Content moderation - word-boundary profanity check (client-side pre-check)
    const combinedText = Object.values(answers).join(' ');
    if (containsProfanity(combinedText)) {
        return {
            success: false,
            error: 'Please remove any profanity or inappropriate language from your answers and try again.'
        };
    }

    // Send to server proxy (API key is server-side only)
    try {
        const proxyResult = await generateViaProxy(options);
        if (proxyResult !== null) {
            return proxyResult;
        }
        // Proxy returned null (404 — not deployed), give clear error
        return {
            success: false,
            error: 'The testimony generation service is not available. Please try again later.'
        };
    } catch (e) {
        console.error('Testimony generation failed:', e);
        return {
            success: false,
            error: 'Unable to connect to the testimony generation service. Please check your connection and try again.'
        };
    }
}

/**
 * Generate via Cloudflare Pages Function proxy (preferred — hides API key)
 * Returns null if proxy is unavailable (404, network error, etc.)
 */
async function generateViaProxy(
    options: TestimonyGenerationOptions
): Promise<TestimonyGenerationResult | null> {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                answers: options.answers,
                userName: options.userName,
                userAge: options.userAge,
                userId: options.userId,
            }),
        });

        // If proxy doesn't exist (404), return null to trigger fallback
        if (response.status === 404) {
            return null;
        }

        const data = await response.json();

        // Rate limit hit (429) — return the error directly
        if (response.status === 429) {
            return {
                success: false,
                error: data.error || 'Rate limit exceeded. Please try again later.',
            };
        }

        // Any other error from proxy
        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Failed to generate testimony. Please try again.',
            };
        }

        return {
            success: data.success,
            testimony: data.testimony,
            wordCount: data.wordCount,
            error: data.error,
        };
    } catch (error) {
        // Network error, proxy unreachable — return null for fallback
        console.warn('Proxy fetch failed:', error);
        return null;
    }
}

