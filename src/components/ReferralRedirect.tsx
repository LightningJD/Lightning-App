import React, { useEffect } from 'react';

/**
 * Captures referral code from URL (/ref/:code) and ambassador invite from /ambassador
 * Stores in localStorage and redirects to the main app
 */
const ReferralRedirect: React.FC = () => {
  useEffect(() => {
    const path = window.location.pathname;

    // Check URL for referral code pattern: /ref/{code}
    const refMatch = path.match(/^\/ref\/([a-zA-Z0-9]+)$/);
    if (refMatch) {
      const code = refMatch[1];
      localStorage.setItem('lightning_referral_code', code);
      window.history.replaceState({}, '', '/');
      return;
    }

    // Check for ambassador invite: /ambassador
    if (path === '/ambassador' || path === '/ambassador/') {
      localStorage.setItem('lightning_ambassador_invite', 'true');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  return null;
};

export default ReferralRedirect;
