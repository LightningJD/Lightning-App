// Guest Session Tracking for Freemium Authentication
// Hybrid Strategy: 2 testimonies, 1 dismissal, 3-minute window

const GUEST_SESSION_KEY = 'lightning_guest_session';

// Hybrid limits (split between lenient and aggressive)
const HYBRID_LIMITS = {
  testimoniesViewed: 2,        // Down from 3 (Instagram-level)
  profilesViewed: 0,           // Preview only (no full profiles)
  profilePreviewsViewed: 1,    // Can see 1 preview
  usersScrolled: 3,            // Down from 5
  modalDismissCount: 1,        // Down from 2 (one chance)
  timeLimit: 180000,           // 3 minutes (down from 5)
};

interface GuestSession {
  testimoniesViewed: number;
  profilesViewed: number;
  profilePreviewsViewed: number;
  usersScrolled: number;
  firstVisit: string;
  lastVisit: string;
  modalDismissCount: number;
  hasSeenModal: boolean;
  modalVersion: number | null;
  isReturningVisitor: boolean;
}

/**
 * Initialize or retrieve guest session from localStorage
 */
export const initGuestSession = (): GuestSession => {
  const session = localStorage.getItem(GUEST_SESSION_KEY);

  if (!session) {
    const newSession: GuestSession = {
      testimoniesViewed: 0,
      profilesViewed: 0,
      profilePreviewsViewed: 0,
      usersScrolled: 0,
      firstVisit: new Date().toISOString(),
      lastVisit: new Date().toISOString(),
      modalDismissCount: 0,
      hasSeenModal: false,
      modalVersion: null,
      isReturningVisitor: false
    };
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(newSession));
    return newSession;
  }

  const parsed = JSON.parse(session);

  // Mark as returning visitor if session exists
  if (!parsed.isReturningVisitor) {
    parsed.isReturningVisitor = true;
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(parsed));
  }

  return parsed;
};

/**
 * Update guest session with new data
 */
export const updateGuestSession = (updates: Partial<GuestSession>): GuestSession => {
  const session = initGuestSession();
  const updated = {
    ...session,
    ...updates,
    lastVisit: new Date().toISOString()
  };
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Check if guest has exceeded any limits
 * Returns { blocked: boolean, reason: string, version: number }
 */
export const checkGuestLimit = (): {
  blocked: boolean;
  reason?: string;
  version?: number;
} => {
  const session = initGuestSession();

  // Returning visitors get blocked immediately
  if (session.isReturningVisitor && session.testimoniesViewed > 0) {
    return { blocked: true, reason: 'returning_visitor', version: 2 };
  }

  // Already dismissed once = hard block
  if (session.modalDismissCount >= HYBRID_LIMITS.modalDismissCount) {
    return { blocked: true, reason: 'dismissals', version: 2 };
  }

  // Viewed 2 testimonies = soft block (can dismiss)
  if (session.testimoniesViewed >= HYBRID_LIMITS.testimoniesViewed) {
    return { blocked: true, reason: 'testimonies', version: 1 };
  }

  // Viewed 1 profile preview and trying to see full = soft block
  if (session.profilePreviewsViewed >= HYBRID_LIMITS.profilePreviewsViewed) {
    return { blocked: true, reason: 'profiles', version: 1 };
  }

  // Scrolled past 3 users = soft block
  if (session.usersScrolled >= HYBRID_LIMITS.usersScrolled) {
    return { blocked: true, reason: 'users', version: 1 };
  }

  // 3 minutes elapsed = soft block
  const timeElapsed = Date.now() - new Date(session.firstVisit).getTime();
  if (timeElapsed > HYBRID_LIMITS.timeLimit) {
    return { blocked: true, reason: 'time', version: 1 };
  }

  return { blocked: false };
};

/**
 * Increment testimony view count
 */
export const trackTestimonyView = (): GuestSession => {
  const session = initGuestSession();
  return updateGuestSession({
    testimoniesViewed: session.testimoniesViewed + 1
  });
};

/**
 * Increment profile preview count
 */
export const trackProfilePreview = (): GuestSession => {
  const session = initGuestSession();
  return updateGuestSession({
    profilePreviewsViewed: session.profilePreviewsViewed + 1
  });
};

/**
 * Increment profile view count (full profile)
 */
export const trackProfileView = (): GuestSession => {
  const session = initGuestSession();
  return updateGuestSession({
    profilesViewed: session.profilesViewed + 1
  });
};

/**
 * Increment users scrolled count
 */
export const trackUserScroll = (): GuestSession => {
  const session = initGuestSession();
  return updateGuestSession({
    usersScrolled: session.usersScrolled + 1
  });
};

/**
 * Record modal dismissal
 */
export const trackModalDismiss = (): GuestSession => {
  const session = initGuestSession();
  return updateGuestSession({
    modalDismissCount: session.modalDismissCount + 1,
    hasSeenModal: true
  });
};

/**
 * Clear guest session (e.g., when user signs up)
 */
export const clearGuestSession = (): void => {
  localStorage.removeItem(GUEST_SESSION_KEY);
};

/**
 * Get remaining views for display
 */
export const getRemainingViews = (): {
  testimonies: number;
  profiles: number;
  users: number;
  dismissals: number;
} => {
  const session = initGuestSession();
  return {
    testimonies: Math.max(0, HYBRID_LIMITS.testimoniesViewed - session.testimoniesViewed),
    profiles: Math.max(0, HYBRID_LIMITS.profilePreviewsViewed - session.profilePreviewsViewed),
    users: Math.max(0, HYBRID_LIMITS.usersScrolled - session.usersScrolled),
    dismissals: Math.max(0, HYBRID_LIMITS.modalDismissCount - session.modalDismissCount)
  };
};
