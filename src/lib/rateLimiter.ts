/**
 * Client-Side Rate Limiter
 *
 * Prevents users from spamming actions (messages, friend requests, etc.)
 * Uses localStorage to persist rate limits across page refreshes
 *
 * Note: This is CLIENT-SIDE rate limiting. For production at scale,
 * add SERVER-SIDE rate limiting using Supabase Edge Functions or API gateway.
 */

const RATE_LIMIT_STORAGE_KEY = 'lightning_rate_limits';

// Rate limit configurations (action: { maxAttempts, windowMs, cooldownMs })
const RATE_LIMITS = {
  // Messaging
  send_message: { maxAttempts: 10, windowMs: 60000, cooldownMs: 5000 }, // 10 messages per minute, 5s cooldown
  send_group_message: { maxAttempts: 15, windowMs: 60000, cooldownMs: 3000 }, // 15 group messages per minute, 3s cooldown

  // Social Actions
  send_friend_request: { maxAttempts: 5, windowMs: 300000, cooldownMs: 10000 }, // 5 requests per 5 min, 10s cooldown
  create_group: { maxAttempts: 3, windowMs: 600000, cooldownMs: 30000 }, // 3 groups per 10 min, 30s cooldown

  // Content Creation
  create_testimony: { maxAttempts: 1, windowMs: 3600000, cooldownMs: 60000 }, // 1 testimony per hour, 1min cooldown
  generate_testimony: { maxAttempts: 3, windowMs: 3600000, cooldownMs: 30000 }, // 3 Lightning generations per hour, 30s cooldown
  update_profile: { maxAttempts: 5, windowMs: 300000, cooldownMs: 5000 }, // 5 updates per 5 min, 5s cooldown

  // Reactions & Interactions
  add_reaction: { maxAttempts: 30, windowMs: 60000, cooldownMs: 500 }, // 30 reactions per minute, 0.5s cooldown
  like_testimony: { maxAttempts: 20, windowMs: 60000, cooldownMs: 1000 }, // 20 likes per minute, 1s cooldown

  // File Uploads
  upload_image: { maxAttempts: 5, windowMs: 300000, cooldownMs: 10000 }, // 5 uploads per 5 min, 10s cooldown
};

interface RateLimitActionData {
  attempts: number[];
  lastAttempt: number;
}

type RateLimitData = Record<string, RateLimitActionData>;

/**
 * Get rate limit data from localStorage
 */
const getRateLimitData = (): RateLimitData => {
  try {
    const data = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading rate limit data:', error);
    return {};
  }
};

/**
 * Save rate limit data to localStorage
 */
const saveRateLimitData = (data: RateLimitData): void => {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving rate limit data:', error);
  }
};

/**
 * Check if action is rate limited
 *
 * @param {string} action - Action name (e.g., 'send_message')
 * @returns {Object} { allowed: boolean, retryAfter: number|null, reason: string|null }
 */
export const checkRateLimit = (action: string): {
  allowed: boolean;
  retryAfter: number | null;
  reason: string | null;
} => {
  // @ts-ignore
  const config = RATE_LIMITS[action];

  if (!config) {
    console.warn(`No rate limit configured for action: ${action}`);
    return { allowed: true, retryAfter: null, reason: null };
  }

  const now = Date.now();
  const rateLimitData = getRateLimitData();
  const actionData = rateLimitData[action] || { attempts: [], lastAttempt: 0 };

  // Clean up old attempts outside the time window
  const recentAttempts = actionData.attempts.filter(
    (timestamp: number) => now - timestamp < config.windowMs
  );

  // Check if cooldown period has passed
  const timeSinceLastAttempt = now - actionData.lastAttempt;
  if (timeSinceLastAttempt < config.cooldownMs) {
    const retryAfter = Math.ceil((config.cooldownMs - timeSinceLastAttempt) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: `Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''} before trying again.`
    };
  }

  // Check if max attempts exceeded
  if (recentAttempts.length >= config.maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const retryAfter = Math.ceil((config.windowMs - (now - oldestAttempt)) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: `You're doing that too much. Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''}.`
    };
  }

  return { allowed: true, retryAfter: null, reason: null };
};

/**
 * Record an action attempt (call after checkRateLimit returns allowed: true)
 *
 * @param {string} action - Action name
 */
export const recordAttempt = (action: string): void => {
  // @ts-ignore
  const config = RATE_LIMITS[action];

  if (!config) {
    return;
  }

  const now = Date.now();
  const rateLimitData = getRateLimitData();
  const actionData = rateLimitData[action] || { attempts: [], lastAttempt: 0 };

  // Clean up old attempts
  const recentAttempts = actionData.attempts.filter(
    (timestamp: number) => now - timestamp < config.windowMs
  );

  // Add new attempt
  recentAttempts.push(now);

  // Save updated data
  rateLimitData[action] = {
    attempts: recentAttempts,
    lastAttempt: now
  };

  saveRateLimitData(rateLimitData);
};

/**
 * Convenience function: check rate limit and show toast if blocked
 *
 * @param {string} action - Action name
 * @param {Function} showErrorToast - Toast error function
 * @returns {boolean} - Whether action is allowed
 */
export const checkAndNotify = (action: string, showErrorToast?: (message: string | null) => void): boolean => {
  const { allowed, reason } = checkRateLimit(action);

  if (!allowed && showErrorToast) {
    showErrorToast(reason);
  }

  return allowed;
};

/**
 * Get remaining attempts for an action
 *
 * @param {string} action - Action name
 * @returns {number} - Number of attempts remaining
 */
export const getRemainingAttempts = (action: string): number => {
  // @ts-ignore
  const config = RATE_LIMITS[action];

  if (!config) {
    return Infinity;
  }

  const now = Date.now();
  const rateLimitData = getRateLimitData();
  const actionData = rateLimitData[action] || { attempts: [] };

  const recentAttempts = actionData.attempts.filter(
    (timestamp: number) => now - timestamp < config.windowMs
  );

  return Math.max(0, config.maxAttempts - recentAttempts.length);
};

/**
 * Clear rate limit data (for testing or admin override)
 *
 * @param {string} action - Action name (optional, clears all if not provided)
 */
export const clearRateLimits = (action: string | null = null): void => {
  if (action) {
    const rateLimitData = getRateLimitData();
    delete rateLimitData[action];
    saveRateLimitData(rateLimitData);
  } else {
    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
  }
};

/**
 * Get rate limit configuration for display
 *
 * @param {string} action - Action name
 * @returns {Object} - Rate limit config
 */
export const getRateLimitConfig = (action: string): any => {
  // @ts-ignore
  return RATE_LIMITS[action] || null;
};
