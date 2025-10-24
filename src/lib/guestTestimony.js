/**
 * Guest Testimony Storage
 *
 * Handles storing and retrieving testimonies for guests before they sign up
 * Part of the Testimony-First Conversion Strategy (65-80% conversion rate)
 */

const STORAGE_KEY = 'lightning_guest_testimony';

/**
 * Save guest testimony to localStorage
 * @param {Object} testimonyData - Testimony data to save
 * @param {string} testimonyData.content - Generated testimony content
 * @param {Object} testimonyData.answers - Answers to 4 questions
 * @param {string} testimonyData.lesson - Optional lesson learned
 */
export const saveGuestTestimony = (testimonyData) => {
  try {
    const data = {
      ...testimonyData,
      createdAt: new Date().toISOString(),
      version: 1
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('💾 Guest testimony saved to localStorage', data);
    return true;
  } catch (error) {
    console.error('Failed to save guest testimony:', error);
    return false;
  }
};

/**
 * Get guest testimony from localStorage
 * @returns {Object|null} Testimony data or null if not found
 */
export const getGuestTestimony = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const testimony = JSON.parse(data);
    console.log('📖 Guest testimony loaded from localStorage', testimony);
    return testimony;
  } catch (error) {
    console.error('Failed to load guest testimony:', error);
    return null;
  }
};

/**
 * Check if guest has a saved testimony
 * @returns {boolean} True if testimony exists
 */
export const hasGuestTestimony = () => {
  return !!getGuestTestimony();
};

/**
 * Clear guest testimony (called after successful signup)
 */
export const clearGuestTestimony = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Guest testimony cleared from localStorage');
    return true;
  } catch (error) {
    console.error('Failed to clear guest testimony:', error);
    return false;
  }
};

/**
 * Get how long ago the testimony was created
 * @returns {number} Minutes since creation
 */
export const getTestimonyAge = () => {
  const testimony = getGuestTestimony();
  if (!testimony || !testimony.createdAt) return 0;

  const created = new Date(testimony.createdAt);
  const now = new Date();
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);

  return diffMins;
};

/**
 * Check if testimony should show reminder (> 24 hours old)
 * @returns {boolean} True if reminder should be shown
 */
export const shouldShowTestimonyReminder = () => {
  const age = getTestimonyAge();
  return age > 1440; // 24 hours = 1440 minutes
};
