/**
 * Profile Cache - localStorage-based caching for instant profile loads
 *
 * Stores user profile data in localStorage for instant display on app load.
 * Data is still refreshed from Supabase in the background to ensure accuracy.
 */

const CACHE_KEY = 'lightning_profile_cache';
const CACHE_VERSION = 1;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedProfile {
  version: number;
  timestamp: number;
  clerkUserId: string;
  data: any;
}

/**
 * Save profile data to localStorage cache
 */
export const cacheProfile = (clerkUserId: string, profileData: any): void => {
  try {
    const cached: CachedProfile = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      clerkUserId,
      data: profileData
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    console.log('✅ Profile cached for instant load');
  } catch (error) {
    console.warn('Failed to cache profile:', error);
    // Silent fail - caching is an optimization, not critical
  }
};

/**
 * Get cached profile data if available and valid
 */
export const getCachedProfile = (clerkUserId: string): any | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedProfile = JSON.parse(cached);

    // Version mismatch - cache invalid
    if (parsed.version !== CACHE_VERSION) {
      console.log('ℹ️ Cache version mismatch, clearing');
      clearProfileCache();
      return null;
    }

    // Different user - cache invalid
    if (parsed.clerkUserId !== clerkUserId) {
      console.log('ℹ️ Cache belongs to different user, clearing');
      clearProfileCache();
      return null;
    }

    // Expired cache
    const age = Date.now() - parsed.timestamp;
    if (age > CACHE_TTL) {
      console.log('ℹ️ Cache expired, clearing');
      clearProfileCache();
      return null;
    }

    console.log(`✅ Using cached profile (${Math.round(age / 1000 / 60)}m old)`);
    return parsed.data;
  } catch (error) {
    console.warn('Failed to read cached profile:', error);
    clearProfileCache();
    return null;
  }
};

/**
 * Clear profile cache
 */
export const clearProfileCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear profile cache:', error);
  }
};
