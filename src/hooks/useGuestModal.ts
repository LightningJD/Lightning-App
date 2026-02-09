import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import {
  initGuestSession,
  checkGuestLimit,
  trackModalDismiss,
  clearGuestSession
} from '../lib/guestSession';

/**
 * Custom hook to manage guest modal state and display logic
 * Returns { showModal, modalVersion, handleDismiss }
 */
export const useGuestModal = () => {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const [showModal, setShowModal] = useState(false);
  const [modalVersion, setModalVersion] = useState(1);

  // Initialize guest session on mount
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      initGuestSession();
      console.log('👋 Guest session initialized');
    }
  }, [isLoading, isAuthenticated]);

  // Clear guest session when user signs in
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🎉 User signed in - clearing guest session');
      clearGuestSession();
      setShowModal(false);
    }
  }, [isAuthenticated]);

  // Check guest limits and show modal if needed
  const checkAndShowModal = () => {
    if (isAuthenticated) return false;

    const limit = checkGuestLimit();

    if (limit.blocked) {
      console.log(`🚫 Guest limit reached: ${limit.reason} - showing modal v${limit.version}`);
      setModalVersion(limit.version || 1);
      setShowModal(true);
      return true;
    }

    return false;
  };

  // Handle modal dismissal (only for version 1)
  const handleDismiss = () => {
    console.log('👋 Guest dismissed modal');
    trackModalDismiss();
    setShowModal(false);
  };

  return {
    showModal,
    modalVersion,
    handleDismiss,
    checkAndShowModal,
    isGuest: !isAuthenticated
  };
};
