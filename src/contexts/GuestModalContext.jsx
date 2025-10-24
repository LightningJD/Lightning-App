import React, { createContext, useContext } from 'react';
import { useGuestModal } from '../hooks/useGuestModal';
import SignupModal from '../components/SignupModal';

const GuestModalContext = createContext();

export const GuestModalProvider = ({ children, nightMode }) => {
  const guestModal = useGuestModal();

  return (
    <GuestModalContext.Provider value={guestModal}>
      {children}

      {/* Global Guest Modal */}
      {guestModal.showModal && (
        <SignupModal
          version={guestModal.modalVersion}
          onDismiss={guestModal.modalVersion === 1 ? guestModal.handleDismiss : null}
          nightMode={nightMode}
        />
      )}
    </GuestModalContext.Provider>
  );
};

// Custom hook to use the guest modal context
export const useGuestModalContext = () => {
  const context = useContext(GuestModalContext);
  if (!context) {
    throw new Error('useGuestModalContext must be used within GuestModalProvider');
  }
  return context;
};
