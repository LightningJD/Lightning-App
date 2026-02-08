import { supabase } from '../supabase';

// ============================================
// REFERRAL & POINTS SYSTEM
// ============================================

/**
 * Get the next biweekly Sunday reset at 7:30 PM PST (03:30 UTC Monday).
 * Cycles are every 2 weeks. Given the current cycle's end date,
 * the next cycle ends 14 days later on the same day/time.
 *
 * When no previous cycle end is known (fresh start), finds the next
 * Monday 03:30 UTC (= Sunday 7:30 PM PST) and adds 14 days.
 */
function getNextBiweeklyReset(from: Date = new Date()): Date {
  // Work in UTC. Sunday 7:30 PM PST = Monday 03:30 UTC
  // So we find the next Monday 03:30 UTC after `from`, then add 14 days
  const target = new Date(from);

  // Set to 03:30 UTC
  target.setUTCHours(3, 30, 0, 0);

  // Find the next Monday (day 1 in JS getUTCDay())
  const currentDay = target.getUTCDay(); // 0=Sun, 1=Mon, ...
  let daysUntilMonday = (1 - currentDay + 7) % 7;

  // If today IS Monday but we're past 03:30 UTC, go to next Monday
  if (daysUntilMonday === 0 && from >= target) {
    daysUntilMonday = 7;
  }

  target.setUTCDate(target.getUTCDate() + daysUntilMonday);

  // Ensure it's in the future
  if (target <= from) {
    target.setUTCDate(target.getUTCDate() + 7);
  }

  // Add 14 days for biweekly cycle (2 weeks from next Sunday reset)
  target.setUTCDate(target.getUTCDate() + 14);

  return target;
}

/**
 * Get the next reset 14 days after a known cycle end date.
 * Used when closing a cycle to calculate the next cycle's end.
 */
function getNextResetFromCycleEnd(cycleEnd: Date): Date {
  const next = new Date(cycleEnd);
  next.setUTCDate(next.getUTCDate() + 14);
  return next;
}

/**
 * Generate a referral code from username: {username}{4 random digits}
 */
export function generateReferralCode(username: string): string {
  const clean = username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 12);
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${clean}${digits}`;
}

/**
 * Ensure a user has a referral code (create one if missing)
 * Retries up to 3 times on collision
 */
export async function ensureReferralCode(userId: string, username: string): Promise<string | null> {
  if (!supabase) return null;

  // Check if user already has a code
  const { data: user } = await supabase
    .from('users')
    .select('referral_code' as any)
    .eq('id', userId)
    .single();

  if ((user as any)?.referral_code) {
    return (user as any).referral_code;
  }

  // Generate and save a new code, retry on collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateReferralCode(username);

    const { error } = await supabase
      .from('users')
      // @ts-ignore - referral_code not in generated types
      .update({ referral_code: code })
      .eq('id', userId);

    if (!error) return code;

    // If it's a unique constraint violation, retry
    if (error.code === '23505') continue;

    console.error('Error setting referral code:', error);
    return null;
  }

  console.error('Failed to generate unique referral code after 3 attempts');
  return null;
}

/**
 * Resolve a referral code to the referrer's user info
 */
export async function resolveReferralCode(code: string): Promise<{ id: string; username: string; display_name: string } | null> {
  if (!supabase || !code.trim()) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name')
    .eq('referral_code' as any, code.trim().toLowerCase())
    .single();

  if (error || !data) return null;
  return data as any;
}

/**
 * Create a pending referral when a new user signs up with a referral code
 */
export async function createPendingReferral(referrerId: string, referredId: string, code: string): Promise<boolean> {
  if (!supabase) return false;

  // Validation: can't refer yourself
  if (referrerId === referredId) return false;

  const { error } = await supabase
    .from('referrals' as any)
    // @ts-ignore
    .insert({
      referrer_id: referrerId,
      referred_id: referredId,
      code,
      status: 'pending'
    });

  if (error) {
    // Duplicate referral — user already referred, silently ignore
    if (error.code === '23505') return true;
    console.error('Error creating referral:', error);
    return false;
  }

  return true;
}

/**
 * Check if a referred user has completed profile + testimony,
 * and if so, confirm their referral and award points to the referrer
 */
export async function checkAndConfirmReferral(userId: string): Promise<boolean> {
  if (!supabase) return false;

  // Check if user has a pending referral
  const { data: referral } = await supabase
    .from('referrals' as any)
    .select('*')
    .eq('referred_id', userId)
    .eq('status', 'pending')
    .single();

  if (!referral) return false;

  // Check if user has completed profile and testimony
  const { data: user } = await supabase
    .from('users')
    .select('profile_completed, has_testimony, is_flagged' as any)
    .eq('id', userId)
    .single();

  if (!user) return false;

  const u = user as any;
  if (!u.profile_completed || !u.has_testimony) return false;

  // Check if the referrer is flagged
  const { data: referrer } = await supabase
    .from('users')
    .select('is_flagged' as any)
    .eq('id', (referral as any).referrer_id)
    .single();

  // If either user is flagged, don't award points but still confirm
  const isFlagged = u.is_flagged || (referrer as any)?.is_flagged;

  // Confirm the referral
  const { error: updateError } = await supabase
    .from('referrals' as any)
    // @ts-ignore
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    })
    .eq('id', (referral as any).id);

  if (updateError) {
    console.error('Error confirming referral:', updateError);
    return false;
  }

  // Award points to referrer (1 BP + 1 OP) only if not flagged
  if (!isFlagged) {
    await awardPoints((referral as any).referrer_id, 1);
  }

  return true;
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string): Promise<{
  code: string | null;
  totalReferred: number;
  confirmed: number;
  pending: number;
}> {
  if (!supabase) return { code: null, totalReferred: 0, confirmed: 0, pending: 0 };

  // Get referral code
  const { data: user } = await supabase
    .from('users')
    .select('referral_code' as any)
    .eq('id', userId)
    .single();

  // Get referral counts
  const { data: referrals } = await supabase
    .from('referrals' as any)
    .select('status')
    .eq('referrer_id', userId);

  const refs = (referrals || []) as any[];
  return {
    code: (user as any)?.referral_code || null,
    totalReferred: refs.length,
    confirmed: refs.filter(r => r.status === 'confirmed').length,
    pending: refs.filter(r => r.status === 'pending').length
  };
}

// ============================================
// POINTS
// ============================================

/**
 * Award points to a user (increments both BP and OP)
 * Uses raw SQL increment to avoid read-modify-write race conditions
 */
export async function awardPoints(userId: string, amount: number): Promise<boolean> {
  if (!supabase || amount <= 0) return false;

  try {
    // Use rpc to atomically increment — avoids read-modify-write race
    // Fallback: read-then-write if rpc not available
    const { data: user } = await supabase
      .from('users')
      .select('blessing_points, overall_points' as any)
      .eq('id', userId)
      .single();

    if (!user) return false;

    const u = user as any;
    const { error } = await supabase
      .from('users')
      // @ts-ignore
      .update({
        blessing_points: (u.blessing_points || 0) + amount,
        overall_points: (u.overall_points || 0) + amount
      })
      .eq('id', userId);

    if (error) {
      console.error('Error awarding points:', error);
      return false;
    }

    // Rebuild leaderboard after awarding points
    try {
      await rebuildLeaderboardCache();
    } catch (cacheErr) {
      console.error('Error rebuilding leaderboard cache:', cacheErr);
      // Non-fatal — points were still awarded
    }
    return true;
  } catch (err) {
    console.error('Error in awardPoints:', err);
    return false;
  }
}

/**
 * Get a user's current points
 */
export async function getUserPoints(userId: string): Promise<{ bp: number; op: number }> {
  if (!supabase) return { bp: 0, op: 0 };

  const { data } = await supabase
    .from('users')
    .select('blessing_points, overall_points' as any)
    .eq('id', userId)
    .single();

  const u = data as any;
  return {
    bp: u?.blessing_points || 0,
    op: u?.overall_points || 0
  };
}

// ============================================
// LEADERBOARD
// ============================================

/**
 * Rebuild the leaderboard cache (top 7 for BP and OP)
 */
export async function rebuildLeaderboardCache(): Promise<void> {
  if (!supabase) return;

  try {
    // Delete existing cache
    await supabase
      .from('leaderboard_cache' as any)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

    // Get top 7 by blessing_points
    const { data: topBp } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_emoji, avatar_url, blessing_points' as any)
      .gt('blessing_points' as any, 0)
      .order('blessing_points' as any, { ascending: false })
      .limit(7);

    // Get top 7 by overall_points
    const { data: topOp } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_emoji, avatar_url, overall_points' as any)
      .gt('overall_points' as any, 0)
      .order('overall_points' as any, { ascending: false })
      .limit(7);

    const rows: any[] = [];

    (topBp || []).forEach((u: any, i: number) => {
      rows.push({
        type: 'bp',
        user_id: u.id,
        rank: i + 1,
        points: u.blessing_points || 0,
        display_name: u.display_name,
        username: u.username,
        avatar_emoji: u.avatar_emoji,
        avatar_url: u.avatar_url,
        updated_at: new Date().toISOString()
      });
    });

    (topOp || []).forEach((u: any, i: number) => {
      rows.push({
        type: 'op',
        user_id: u.id,
        rank: i + 1,
        points: u.overall_points || 0,
        display_name: u.display_name,
        username: u.username,
        avatar_emoji: u.avatar_emoji,
        avatar_url: u.avatar_url,
        updated_at: new Date().toISOString()
      });
    });

    if (rows.length > 0) {
      await supabase
        .from('leaderboard_cache' as any)
        // @ts-ignore
        .insert(rows);
    }
  } catch (error) {
    console.error('Error rebuilding leaderboard cache:', error);
  }
}

/**
 * Get leaderboard data (top 7 BP + OP) plus personal rank
 */
export async function getLeaderboard(currentUserId: string): Promise<{
  bp: Array<{ user_id: string; rank: number; points: number; display_name: string; username: string; avatar_emoji: string; avatar_url: string | null }>;
  op: Array<{ user_id: string; rank: number; points: number; display_name: string; username: string; avatar_emoji: string; avatar_url: string | null }>;
  personalBpRank: number | null;
  personalOpRank: number | null;
  personalBp: number;
  personalOp: number;
  gapToTop7Bp: number;
  gapToTop7Op: number;
}> {
  if (!supabase) {
    return { bp: [], op: [], personalBpRank: null, personalOpRank: null, personalBp: 0, personalOp: 0, gapToTop7Bp: 0, gapToTop7Op: 0 };
  }

  // Get cached leaderboard
  const { data: cache } = await supabase
    .from('leaderboard_cache' as any)
    .select('*')
    .order('rank', { ascending: true });

  const entries = (cache || []) as any[];
  const bp = entries.filter(e => e.type === 'bp');
  const op = entries.filter(e => e.type === 'op');

  // Get personal points
  const { data: personal } = await supabase
    .from('users')
    .select('blessing_points, overall_points' as any)
    .eq('id', currentUserId)
    .single();

  const personalBp = (personal as any)?.blessing_points || 0;
  const personalOp = (personal as any)?.overall_points || 0;

  // Calculate personal rank for BP (count users with more BP + 1)
  let personalBpRank: number | null = null;
  let personalOpRank: number | null = null;

  if (personalBp > 0) {
    const { data: bpAbove } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .gt('blessing_points' as any, personalBp);
    personalBpRank = ((bpAbove as any)?.length || 0) + 1;
  }

  if (personalOp > 0) {
    const { data: opAbove } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .gt('overall_points' as any, personalOp);
    personalOpRank = ((opAbove as any)?.length || 0) + 1;
  }

  // Gap to top 7
  const last7Bp = bp.length >= 7 ? bp[6].points : 0;
  const last7Op = op.length >= 7 ? op[6].points : 0;
  const gapToTop7Bp = Math.max(0, last7Bp - personalBp + 1);
  const gapToTop7Op = Math.max(0, last7Op - personalOp + 1);

  return { bp, op, personalBpRank, personalOpRank, personalBp, personalOp, gapToTop7Bp, gapToTop7Op };
}

// ============================================
// BP RESET CYCLES
// ============================================

/**
 * Get the current active BP cycle
 */
export async function getCurrentCycle(): Promise<any | null> {
  if (!supabase) return null;

  const { data } = await supabase
    .from('bp_cycles' as any)
    .select('*')
    .eq('is_current', true)
    .single();

  return data;
}

/**
 * Execute a BP reset: snapshot top 3, reset all BP, close current cycle, create new
 */
export async function executeBpReset(): Promise<{ winners: any[] } | null> {
  if (!supabase) return null;

  try {
    // Get current cycle
    const cycle = await getCurrentCycle();
    if (!cycle) return null;

    // Get top 3 by BP
    const { data: top3 } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_emoji, avatar_url, blessing_points' as any)
      .gt('blessing_points' as any, 0)
      .order('blessing_points' as any, { ascending: false })
      .limit(3);

    const winners = (top3 || []).map((u: any, i: number) => ({
      rank: i + 1,
      user_id: u.id,
      display_name: u.display_name,
      username: u.username,
      avatar_emoji: u.avatar_emoji,
      avatar_url: u.avatar_url,
      points: u.blessing_points || 0
    }));

    // Close current cycle with top 3
    await supabase
      .from('bp_cycles' as any)
      // @ts-ignore
      .update({
        is_current: false,
        top_3: winners
      })
      .eq('id', (cycle as any).id);

    // Reset all users' blessing_points to 0 (single bulk update)
    const { error: resetError } = await supabase
      .from('users')
      // @ts-ignore
      .update({ blessing_points: 0 })
      .gt('blessing_points' as any, 0);

    if (resetError) {
      console.error('Error resetting blessing points:', resetError);
      // Continue anyway — cycle must still close
    }

    // Create new cycle ending 2 weeks from the old cycle's end (biweekly)
    const now = new Date();
    const cycleEnd = new Date((cycle as any).cycle_end);
    const nextReset = getNextResetFromCycleEnd(cycleEnd);

    const { error: cycleError } = await supabase
      .from('bp_cycles' as any)
      // @ts-ignore
      .insert({
        cycle_start: now.toISOString(),
        cycle_end: nextReset.toISOString(),
        is_current: true
      });

    if (cycleError) {
      // If unique constraint violation, another client already created the cycle (race condition)
      if (cycleError.code === '23505') {
        console.log('BP cycle already created by another client');
      } else {
        console.error('Error creating new BP cycle:', cycleError);
      }
    }

    // Rebuild leaderboard cache
    await rebuildLeaderboardCache();

    return { winners };
  } catch (error) {
    console.error('Error executing BP reset:', error);
    return null;
  }
}

/**
 * Check if BP reset is needed and run it if so
 * Race-condition safe: only first client to create the new cycle succeeds
 */
export async function checkAndRunBpReset(): Promise<{ winners: any[] } | null> {
  if (!supabase) return null;

  const cycle = await getCurrentCycle();
  if (!cycle) {
    // No current cycle — create one ending in 2 weeks on a Sunday 7:30 PM PST
    const now = new Date();
    const nextReset = getNextBiweeklyReset(now);

    await supabase
      .from('bp_cycles' as any)
      // @ts-ignore
      .insert({
        cycle_start: now.toISOString(),
        cycle_end: nextReset.toISOString(),
        is_current: true
      });

    return null;
  }

  const cycleEnd = new Date((cycle as any).cycle_end);
  if (cycleEnd > new Date()) {
    // Cycle hasn't ended yet
    return null;
  }

  // Cycle has ended — execute reset
  return executeBpReset();
}

/**
 * Get the most recently completed cycle's winners
 */
export async function getLastCycleWinners(): Promise<{ cycleId: string; winners: any[] } | null> {
  if (!supabase) return null;

  const { data } = await supabase
    .from('bp_cycles' as any)
    .select('*')
    .eq('is_current', false)
    .order('cycle_end', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    cycleId: (data as any).id,
    winners: (data as any).top_3 || []
  };
}

/**
 * Check if user has dismissed the latest BP reset announcement
 */
export async function hasDismissedBpReset(userId: string, cycleId: string): Promise<boolean> {
  if (!supabase) return true;

  const { data } = await supabase
    .from('bp_reset_dismissals' as any)
    .select('id')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .single();

  return !!data;
}

/**
 * Dismiss the BP reset announcement for a user
 */
export async function dismissBpResetAnnouncement(userId: string, cycleId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('bp_reset_dismissals' as any)
    // @ts-ignore
    .insert({ user_id: userId, cycle_id: cycleId });

  if (error && error.code !== '23505') {
    console.error('Error dismissing BP reset:', error);
    return false;
  }

  return true;
}

// ============================================
// DEVICE FINGERPRINTING (Anti-Gaming)
// ============================================

/**
 * Record a device fingerprint for a user
 * If 3+ accounts share the same fingerprint, flag all of them
 */
export async function recordDeviceFingerprint(userId: string, fingerprint: string): Promise<boolean> {
  if (!supabase || !fingerprint) return false;

  // Insert fingerprint (ignore duplicate)
  const { error } = await supabase
    .from('device_fingerprints' as any)
    // @ts-ignore
    .insert({ user_id: userId, fingerprint });

  if (error && error.code !== '23505') {
    console.error('Error recording fingerprint:', error);
    return false;
  }

  // Check how many distinct users have this fingerprint
  const { data: matches } = await supabase
    .from('device_fingerprints' as any)
    .select('user_id')
    .eq('fingerprint', fingerprint);

  const uniqueUsers = new Set((matches || []).map((m: any) => m.user_id));

  if (uniqueUsers.size >= 3) {
    // Flag all users with this fingerprint
    for (const flagUserId of uniqueUsers) {
      await supabase
        .from('users')
        // @ts-ignore
        .update({ is_flagged: true })
        .eq('id', flagUserId);
    }
  }

  return true;
}

// ============================================
// AMBASSADOR TERMS
// ============================================

/**
 * Accept ambassador terms
 */
export async function acceptAmbassadorTerms(userId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('users')
    // @ts-ignore
    .update({ ambassador_terms_accepted_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error accepting ambassador terms:', error);
    return false;
  }

  return true;
}

/**
 * Check if user has accepted ambassador terms
 */
export async function hasAcceptedAmbassadorTerms(userId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data } = await supabase
    .from('users')
    .select('ambassador_terms_accepted_at' as any)
    .eq('id', userId)
    .single();

  return !!(data as any)?.ambassador_terms_accepted_at;
}

/**
 * Get the current BP cycle end time (for countdown display)
 */
export async function getCycleEndTime(): Promise<Date | null> {
  const cycle = await getCurrentCycle();
  if (!cycle) return null;
  return new Date((cycle as any).cycle_end);
}
