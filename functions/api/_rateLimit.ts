/**
 * Simple in-memory rate limiter for Cloudflare Pages Functions.
 *
 * Uses a sliding window counter per IP address. Since Cloudflare Workers
 * are stateless across invocations on different isolates, this provides
 * per-isolate rate limiting — not globally consistent, but enough to
 * throttle individual abusers hitting the same edge location.
 *
 * For stricter enforcement, upgrade to Cloudflare KV or D1.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per-isolate, cleared on cold start)
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 100 checks
let checkCount = 0;

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Check if a request should be rate limited.
 *
 * @param ip - Client IP address (from CF-Connecting-IP header)
 * @param endpoint - Endpoint name (for separate limits per endpoint)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean, remaining: number, retryAfterMs: number }
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  // Periodic cleanup
  checkCount++;
  if (checkCount % 100 === 0) {
    cleanup();
  }

  const key = `${endpoint}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  // Increment
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 };
}

/**
 * Get the client IP from a Cloudflare request.
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Create a 429 Too Many Requests response with appropriate headers.
 */
export function rateLimitResponse(
  retryAfterMs: number,
  corsHeaders: Record<string, string>
): Response {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({
      success: false,
      error: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
