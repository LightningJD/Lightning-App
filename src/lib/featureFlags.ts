/**
 * Feature Flags Configuration
 *
 * Centralized feature flag system for controlling feature visibility.
 * Uses environment variables to toggle features on/off without code changes.
 *
 * Usage:
 * ```tsx
 * import { features } from '@/lib/featureFlags';
 *
 * {features.premium && <PricingPage />}
 * ```
 */

export const features = {
  /**
   * Premium Features (Pricing, Subscriptions, Payments)
   *
   * When enabled (true):
   * - Shows pricing pages and subscription tiers
   * - Displays upgrade prompts and premium badges
   * - Enables payment processing flows
   * - Enforces feature limits based on subscription tier
   *
   * When disabled (false):
   * - Hides all pricing/subscription UI
   * - Removes upgrade prompts
   * - Disables payment flows
   * - All users have access to all features
   *
   * Set in .env.local:
   * VITE_ENABLE_PREMIUM=true|false
   */
  premium: import.meta.env.VITE_ENABLE_PREMIUM === 'true',

  /**
   * Future feature flags can be added here:
   *
   * videoTestimonies: import.meta.env.VITE_ENABLE_VIDEO_TESTIMONIES === 'true',
   * liveEvents: import.meta.env.VITE_ENABLE_LIVE_EVENTS === 'true',
   * analyticsDashboard: import.meta.env.VITE_ENABLE_ANALYTICS_DASHBOARD === 'true',
   */
} as const;

/**
 * Helper function to check if a feature is enabled
 *
 * @param feature - Feature name from features object
 * @returns boolean - Whether the feature is enabled
 */
export const isFeatureEnabled = (feature: keyof typeof features): boolean => {
  return features[feature];
};

/**
 * Development helper: Log all feature flags
 * Useful for debugging feature flag configuration
 */
export const logFeatureFlags = (): void => {
  if (import.meta.env.DEV) {
    console.log('🚩 Feature Flags:', features);
  }
};

// Auto-log feature flags in development
if (import.meta.env.DEV) {
  logFeatureFlags();
}
