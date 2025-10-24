/**
 * Easter Egg System for Lightning App
 * Tracks discoveries, shows animations, awards badges
 */

import { showSuccess } from './toast';

const STORAGE_KEY = 'lightning_easter_eggs';

// All available easter eggs
export const easterEggs = {
  logo_10_clicks: {
    id: 'logo_10_clicks',
    name: 'Lightning Fast',
    description: 'Clicked the logo 10 times rapidly',
    icon: '⚡',
    unlockMessage: 'You found the Lightning Fast easter egg!',
    rarity: 'common',
    funFact: 'The Lightning logo was designed in one night!'
  },
  first_testimony: {
    id: 'first_testimony',
    name: 'First Fruits',
    description: 'Created your first testimony',
    icon: '✨',
    unlockMessage: 'Your testimony is powerful! This is just the beginning.',
    rarity: 'common',
    funFact: 'Every great journey starts with a single testimony.'
  },
  john_316_time: {
    id: 'john_316_time',
    name: 'For God So Loved',
    description: 'Opened the app at exactly 3:16',
    icon: '📖',
    unlockMessage: 'John 3:16 - For God so loved the world...',
    rarity: 'rare',
    funFact: 'You found the most famous verse at the perfect time!'
  },
  triple_tap_profile: {
    id: 'triple_tap_profile',
    name: 'Self Love',
    description: 'Triple-tapped your own profile picture',
    icon: '🎉',
    unlockMessage: 'You are fearfully and wonderfully made!',
    rarity: 'common',
    funFact: 'Self-care is God-care. You matter!'
  },
  amen_3x: {
    id: 'amen_3x',
    name: 'Amen Corner',
    description: 'Said "Amen" 3 times in a message',
    icon: '🙏',
    unlockMessage: 'Triple amen! Your faith is strong.',
    rarity: 'common',
    funFact: 'Amen means "so be it" or "truly"!'
  }
};

// Get discovered easter eggs from localStorage
export const getDiscoveredEggs = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load easter eggs:', error);
    return [];
  }
};

// Check if an easter egg has been discovered
export const isEggDiscovered = (eggId) => {
  const discovered = getDiscoveredEggs();
  return discovered.includes(eggId);
};

// Unlock an easter egg
export const unlockEasterEgg = (eggId) => {
  const egg = easterEggs[eggId];
  if (!egg) {
    console.warn('Unknown easter egg:', eggId);
    return false;
  }

  // Check if already discovered
  if (isEggDiscovered(eggId)) {
    console.log('🥚 Already found:', egg.name);
    return false;
  }

  // Add to discovered list
  const discovered = getDiscoveredEggs();
  discovered.push(eggId);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(discovered));
    console.log('🎉 Easter Egg Unlocked:', egg.name);

    // Show toast notification
    showEasterEggToast(egg);

    return true;
  } catch (error) {
    console.error('Failed to save easter egg:', error);
    return false;
  }
};

// Show easter egg toast notification
const showEasterEggToast = (egg) => {
  const rarityColors = {
    common: '#10b981',
    rare: '#3b82f6',
    epic: '#8b5cf6',
    legendary: '#f59e0b'
  };

  const color = rarityColors[egg.rarity] || rarityColors.common;

  showSuccess(
    `${egg.icon} Easter Egg: ${egg.name}!\n${egg.unlockMessage}`,
    {
      duration: 6000,
      style: {
        background: color,
        color: '#fff',
        padding: '16px 24px',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        boxShadow: `0 8px 24px ${color}40`,
      }
    }
  );
};

// Get progress (X out of Y found)
export const getEasterEggProgress = () => {
  const discovered = getDiscoveredEggs();
  const total = Object.keys(easterEggs).length;
  return {
    found: discovered.length,
    total,
    percentage: Math.round((discovered.length / total) * 100)
  };
};

// Get all eggs with discovered status
export const getAllEggsWithStatus = () => {
  const discovered = getDiscoveredEggs();
  return Object.values(easterEggs).map(egg => ({
    ...egg,
    discovered: discovered.includes(egg.id)
  }));
};

// Check for time-based easter eggs
export const checkTimeBasedEasterEggs = () => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // John 3:16 easter egg (3:16 AM or PM)
  if ((hour === 3 || hour === 15) && minute === 16) {
    unlockEasterEgg('john_316_time');
  }
};

// Start checking for time-based easter eggs every minute
let timeCheckInterval = null;

export const startTimeBasedEasterEggs = () => {
  if (timeCheckInterval) return; // Already running

  // Check immediately
  checkTimeBasedEasterEggs();

  // Check every minute
  timeCheckInterval = setInterval(() => {
    checkTimeBasedEasterEggs();
  }, 60000); // 60 seconds

  console.log('⏰ Time-based easter eggs activated');
};

export const stopTimeBasedEasterEggs = () => {
  if (timeCheckInterval) {
    clearInterval(timeCheckInterval);
    timeCheckInterval = null;
    console.log('⏰ Time-based easter eggs stopped');
  }
};
