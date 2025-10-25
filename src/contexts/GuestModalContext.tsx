import React, { createContext, useContext } from 'react';
import { useGuestModal } from '../hooks/useGuestModal';
import SignupModal from '../components/SignupModal';

interface GuestModalContextType {
  isGuest: boolean;
  showModal: boolean;
  modalVersion: 1 | 2;
  checkAndShowModal: () => void;
  handleDismiss: () => void;
}

interface GuestModalProviderProps {
  children: React.ReactNode;
  nightMode: boolean;
}

const GuestModalContext = createContext<GuestModalContextType | undefined>(undefined);

export const GuestModalProvider: React.FC<GuestModalProviderProps> = ({ children, nightMode }) => {
  const guestModal = useGuestModal();

  return (
    <GuestModalContext.Provider value={guestModal as GuestModalContextType}>
      {children}

      {/* Global Guest Modal */}
      {guestModal.showModal && (
        <SignupModal
          version={guestModal.modalVersion as 1 | 2}
          onDismiss={guestModal.modalVersion === 1 ? guestModal.handleDismiss : undefined}
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
