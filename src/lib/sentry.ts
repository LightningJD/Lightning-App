import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error monitoring
 *
 * To activate:
 * 1. Sign up at https://sentry.io (free tier)
 * 2. Create new project "Lightning"
 * 3. Copy your DSN from project settings
 * 4. Add to .env.local: VITE_SENTRY_DSN=your_dsn_here
 * 5. Restart dev server
 */
export const initSentry = () => {
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDSN) {
    console.warn('⚠️  Sentry DSN not found. Error monitoring disabled.');
    console.warn('Add VITE_SENTRY_DSN to .env.local to enable error tracking.');
    return;
  }

  Sentry.init({
    dsn: sentryDSN,

    // Set environment
    environment: import.meta.env.MODE, // 'development' or 'production'

    // Performance monitoring (sample 10% of transactions in production)
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Enable session replay (captures user interactions leading to errors)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      // Capture user interactions
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text in replays
        blockAllMedia: true, // Privacy: block images/videos in replays
      }),

      // React error boundary integration
      Sentry.browserTracingIntegration(),
    ],

    // Filter out sensitive errors
    beforeSend(event, hint) {
      // Don't send errors in development (unless you want to test)
      if (import.meta.env.MODE === 'development') {
        console.log('🐛 Sentry would send error in production:', event);
        return null; // Don't actually send in dev
      }

      // Filter out non-critical errors
      const error = hint.originalException as any;

      // Ignore network errors (user's internet issue, not our bug)
      if (error?.message?.includes('NetworkError') ||
          error?.message?.includes('Failed to fetch')) {
        return null;
      }

      // Ignore ad blocker errors
      if (error?.message?.includes('adsbygoogle')) {
        return null;
      }

      return event;
    },
  });

  console.log('✅ Sentry error monitoring initialized');
};

/**
 * Manually capture an error
 */
export const captureError = (error: any, context: Record<string, any> = {}) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Manually capture a message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context (for better error tracking)
 */
export const setUser = (user: any) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username || user.displayName,
  });
};

/**
 * Add breadcrumb (track user actions leading to errors)
 */
export const addBreadcrumb = (message: string, category: string = 'action') => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
  });
};
