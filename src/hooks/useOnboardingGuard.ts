import { useEffect } from 'react';

/**
 * Shared exit-warning constants used across all onboarding screens.
 */

/** Shown after the AI draft is ready (preview step). */
export const EXIT_WARNING_MSG =
  "Your testimony is ready \u2014 leave now and everything will be lost.";

/** Shown on the first close attempt while answering questions. */
export const EXIT_WARNING_MSG_ANSWERING =
  "Someone needs to hear this \u2014 leave now and everything will be lost.";

/** Shown on the second+ close attempt while still answering questions. */
export const EXIT_WARNING_MSG_REPEAT =
  "It\u2019s time to shine your light \u2014 leave now and everything will be lost.";

/**
 * Attaches a beforeunload listener while `isActive` is true.
 * Accepts an optional `message` so callers can pass a dynamic string.
 * Handles: browser close, tab close, refresh, and navigating away.
 */
export function useBeforeUnloadGuard(isActive: boolean, message?: string): void {
  useEffect(() => {
    if (!isActive) return;
    const msg = message ?? EXIT_WARNING_MSG;
    const handle = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isActive, message]);
}
