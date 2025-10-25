/**
 * Secure Error Logging Utility
 * Prevents sensitive data exposure in browser console
 * Routes errors to Sentry in production
 */

/**
 * Log error securely without exposing sensitive data
 * @param context - Description of where the error occurred
 * @param error - The error object
 * @param metadata - Additional context (will be sanitized)
 */
export const logError = (
  context: string,
  error: unknown,
  metadata?: Record<string, any>
): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Send to Sentry in production (with sanitized metadata)
  if (window.Sentry && import.meta.env.PROD) {
    const sanitizedMetadata = sanitizeMetadata(metadata);

    window.Sentry.captureException(error, {
      tags: { context },
      extra: sanitizedMetadata,
      level: 'error'
    });
  }

  // Only log to console in development
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }
    if (metadata) {
      console.error('Context:', sanitizeMetadata(metadata));
    }
  }
};

/**
 * Log warning securely
 */
export const logWarning = (
  context: string,
  message: string,
  metadata?: Record<string, any>
): void => {
  if (window.Sentry && import.meta.env.PROD) {
    window.Sentry.captureMessage(`[${context}] ${message}`, {
      level: 'warning',
      extra: sanitizeMetadata(metadata)
    });
  }

  if (import.meta.env.DEV) {
    console.warn(`[${context}]`, message, sanitizeMetadata(metadata));
  }
};

/**
 * Log info message (only in development)
 */
export const logInfo = (context: string, message: string): void => {
  if (import.meta.env.DEV) {
    console.log(`[${context}]`, message);
  }
};

/**
 * Sanitize metadata to remove sensitive information
 */
const sanitizeMetadata = (metadata?: Record<string, any>): Record<string, any> => {
  if (!metadata) return {};

  const sanitized: Record<string, any> = {};
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'secret',
    'accessToken',
    'refreshToken',
    'email', // Keep email hashed only
    'phone',
    'ssn',
    'creditCard',
    'clerkUserId'
  ];

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();

    // Skip sensitive keys
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Truncate long strings (prevent logging entire API responses)
    if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '... [TRUNCATED]';
      continue;
    }

    // Keep safe values
    sanitized[key] = value;
  }

  return sanitized;
};

/**
 * Track authentication events (for security monitoring)
 */
export const logAuthEvent = (
  event: 'login' | 'logout' | 'signup' | 'failed_login',
  userId?: string,
  metadata?: Record<string, any>
): void => {
  if (window.Sentry) {
    window.Sentry.captureMessage(`Auth Event: ${event}`, {
      level: 'info',
      tags: { event_type: 'auth', auth_event: event },
      extra: {
        userId: userId ? hashUserId(userId) : undefined,
        ...sanitizeMetadata(metadata)
      }
    });
  }

  if (import.meta.env.DEV) {
    console.log(`[AUTH] ${event}`, { userId, ...sanitizeMetadata(metadata) });
  }
};

/**
 * Hash user ID for privacy (one-way hash for analytics)
 */
const hashUserId = (userId: string): string => {
  // Simple hash for user ID (not cryptographic, just for privacy)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `user_${Math.abs(hash)}`;
};

/**
 * Track performance metrics
 */
export const logPerformance = (
  metric: string,
  duration: number,
  metadata?: Record<string, any>
): void => {
  if (window.Sentry && import.meta.env.PROD) {
    window.Sentry.captureMessage(`Performance: ${metric}`, {
      level: 'info',
      tags: { metric_type: 'performance' },
      extra: {
        duration_ms: duration,
        ...sanitizeMetadata(metadata)
      }
    });
  }

  if (import.meta.env.DEV && duration > 1000) {
    console.warn(`[PERFORMANCE] ${metric} took ${duration}ms`, metadata);
  }
};
