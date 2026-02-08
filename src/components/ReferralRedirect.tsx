import { useEffect } from 'react';

/**
 * Captures referral code from URL (/ref/:code) and stores in localStorage
 * Then redirects to the main app for signup
 */
const ReferralRedirect: React.FC = () => {
  useEffect(() => {
    // Check URL for referral code pattern: /ref/{code}
    const path = window.location.pathname;
    const match = path.match(/^\/ref\/([a-zA-Z0-9]+)$/);

    if (match) {
      const code = match[1];
      localStorage.setItem('lightning_referral_code', code);
      console.log('🔗 Referral code captured:', code);
      // Redirect to home (clear the /ref/ path)
      window.history.replaceState({}, '', '/');
    }
  }, []);

  return null;
};

export default ReferralRedirect;
