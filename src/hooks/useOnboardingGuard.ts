import { useEffect } from 'react';

/**
 * Shared exit-warning constant used across all onboarding screens
 * (TestimonyQuestionnaire + ProfileSetup).
 */
export const EXIT_WARNING_MSG =
  "Your testimony is ready \u2014 leave now and everything will be lost.";

/**
 * Attaches a beforeunload listener while `isActive` is true.
 * Handles: browser close, tab close, refresh, and navigating away.
 * The browser shows its own generic dialog but the event is captured.
 */
export function useBeforeUnloadGuard(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;
    const handle = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = EXIT_WARNING_MSG;
      return EXIT_WARNING_MSG;
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isActive]);
}
