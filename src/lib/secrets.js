/**
 * Secrets System for Lightning App
 * Tracks discoveries, shows animations, awards badges
 */

import { showSuccess } from './toast';

const STORAGE_KEY = 'lightning_secrets';

// All available secrets
export const secrets = {
  logo_10_clicks: {
    id: 'logo_10_clicks',
    name: 'Lightning Fast',
    description: 'Clicked the logo 10 times rapidly',
    icon: '⚡',
    unlockMessage: 'You found the Lightning Fast secret!',
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
  },
  messages_100: {
    id: 'messages_100',
    name: 'Century Messenger',
    description: 'Sent 100 messages',
    icon: '💬',
    unlockMessage: '100 messages! You\'re spreading the light.',
    rarity: 'rare',
    funFact: 'You\'ve sent over 100 messages of encouragement!'
  },
  friends_10: {
    id: 'friends_10',
    name: 'Community Builder',
    description: 'Made 10 friends',
    icon: '🤝',
    unlockMessage: '10 friends! You\'re building community.',
    rarity: 'common',
    funFact: 'Iron sharpens iron - keep connecting!'
  },
  konami_code: {
    id: 'konami_code',
    name: 'OG Believer',
    description: 'Entered the secret Konami code',
    icon: '🎮',
    unlockMessage: 'You found the legendary Konami code!',
    rarity: 'legendary',
    funFact: 'Up Up Down Down Left Right Left Right - a gaming legend!'
  },
  night_mode_7_days: {
    id: 'night_mode_7_days',
    name: 'Night Owl',
    description: 'Used night mode for 7 days',
    icon: '🌙',
    unlockMessage: 'You love the dark side... of the app!',
    rarity: 'common',
    funFact: 'Night mode reduces eye strain by 70%!'
  },
  share_testimony_5x: {
    id: 'share_testimony_5x',
    name: 'Evangelist',
    description: 'Shared testimony 5 times',
    icon: '📣',
    unlockMessage: 'Sharing the Good News! Keep it up.',
    rarity: 'rare',
    funFact: 'Your story could change someone\'s life!'
  },
  profile_views_40: {
    id: 'profile_views_40',
    name: 'Wilderness Explorer',
    description: 'Viewed 40 profiles',
    icon: '🏜️',
    unlockMessage: '40 profiles! Like 40 days in the wilderness.',
    rarity: 'rare',
    funFact: '40 is a biblical number representing testing and trial!'
  },
  hallelujah_bio: {
    id: 'hallelujah_bio',
    name: 'Praise Warrior',
    description: 'Added "hallelujah" to your bio',
    icon: '🙌',
    unlockMessage: 'Hallelujah means "Praise the Lord"!',
    rarity: 'common',
    funFact: 'Hallelujah appears 24 times in the Bible!'
  },
  secret_hunter: {
    id: 'secret_hunter',
    name: 'Master Hunter',
    description: 'Found all secrets',
    icon: '🏆',
    unlockMessage: 'You found them all! You\'re a master hunter!',
    rarity: 'legendary',
    funFact: 'Only 1% of users find all the secrets!'
  }
};

// Get discovered secrets from localStorage
export const getDiscoveredSecrets = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load secrets:', error);
    return [];
  }
};

// Check if a secret has been discovered
export const isSecretDiscovered = (secretId) => {
  const discovered = getDiscoveredSecrets();
  return discovered.includes(secretId);
};

// Unlock a secret
export const unlockSecret = (secretId) => {
  const secret = secrets[secretId];
  if (!secret) {
    console.warn('Unknown secret:', secretId);
    return false;
  }

  // Check if already discovered
  if (isSecretDiscovered(secretId)) {
    console.log('🔒 Already found:', secret.name);
    return false;
  }

  // Add to discovered list
  const discovered = getDiscoveredSecrets();
  discovered.push(secretId);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(discovered));
    console.log('🎉 Secret Unlocked:', secret.name);

    // Show toast notification
    showSecretToast(secret);

    // Check if user just found all secrets (delayed to avoid double-toast)
    if (secretId !== 'secret_hunter') {
      setTimeout(() => checkMasterHunter(), 1000);
    }

    return true;
  } catch (error) {
    console.error('Failed to save secret:', error);
    return false;
  }
};

// Show secret toast notification
const showSecretToast = (secret) => {
  const rarityColors = {
    common: '#10b981',
    rare: '#3b82f6',
    epic: '#8b5cf6',
    legendary: '#f59e0b'
  };

  const color = rarityColors[secret.rarity] || rarityColors.common;

  showSuccess(
    `${secret.icon} Secret: ${secret.name}!\n${secret.unlockMessage}`,
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
export const getSecretProgress = () => {
  const discovered = getDiscoveredSecrets();
  const total = Object.keys(secrets).length;
  return {
    found: discovered.length,
    total,
    percentage: Math.round((discovered.length / total) * 100)
  };
};

// Get all secrets with discovered status
export const getAllSecretsWithStatus = () => {
  const discovered = getDiscoveredSecrets();
  return Object.values(secrets).map(secret => ({
    ...secret,
    discovered: discovered.includes(secret.id)
  }));
};

// Check for time-based secrets
export const checkTimeBasedSecrets = () => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // John 3:16 secret (3:16 AM or PM)
  if ((hour === 3 || hour === 15) && minute === 16) {
    unlockSecret('john_316_time');
  }
};

// Check for milestone-based secrets
export const checkMilestoneSecret = (type, count) => {
  const milestones = {
    messages: { 100: 'messages_100' },
    friends: { 10: 'friends_10' },
    profile_views: { 40: 'profile_views_40' },
    testimony_shares: { 5: 'share_testimony_5x' }
  };

  const secretId = milestones[type]?.[count];
  if (secretId) {
    unlockSecret(secretId);
  }
};

// Check if user found all secrets (Master Hunter)
export const checkMasterHunter = () => {
  const discovered = getDiscoveredSecrets();
  const totalSecrets = Object.keys(secrets).length;

  // Exclude master hunter itself from the count
  const secretsNeeded = totalSecrets - 1;

  if (discovered.length >= secretsNeeded && !discovered.includes('secret_hunter')) {
    unlockSecret('secret_hunter');
  }
};

// Check bio for "hallelujah"
export const checkBioSecret = (bio) => {
  if (bio && bio.toLowerCase().includes('hallelujah')) {
    unlockSecret('hallelujah_bio');
  }
};

// Start checking for time-based secrets every minute
let timeCheckInterval = null;

export const startTimeBasedSecrets = () => {
  if (timeCheckInterval) return; // Already running

  // Check immediately
  checkTimeBasedSecrets();

  // Check every minute
  timeCheckInterval = setInterval(() => {
    checkTimeBasedSecrets();
  }, 60000); // 60 seconds

  console.log('⏰ Time-based secrets activated');
};

export const stopTimeBasedSecrets = () => {
  if (timeCheckInterval) {
    clearInterval(timeCheckInterval);
    timeCheckInterval = null;
    console.log('⏰ Time-based secrets stopped');
  }
};
