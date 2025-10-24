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
  poke_10_people: {
    id: 'poke_10_people',
    name: 'Friendly Poker',
    description: 'Poked 10 different people',
    icon: '👉',
    unlockMessage: 'You love poking people! Just like Facebook 2007.',
    rarity: 'common',
    funFact: 'Poking was the original way to say "thinking of you"!'
  },
  profile_viewer_detective: {
    id: 'profile_viewer_detective',
    name: 'Profile Detective',
    description: 'Checked who viewed your profile 10 times',
    icon: '🕵️',
    unlockMessage: 'Someone\'s curious about who\'s curious!',
    rarity: 'common',
    funFact: 'Most profile views happen within the first 24 hours!'
  },
  anonymous_viewer: {
    id: 'anonymous_viewer',
    name: 'Incognito Mode',
    description: 'Viewed 5 profiles anonymously',
    icon: '👤',
    unlockMessage: 'Sneaky! You like browsing in stealth mode.',
    rarity: 'rare',
    funFact: 'Anonymous viewing keeps your visits private!'
  },
  easter_egg_hunter: {
    id: 'easter_egg_hunter',
    name: 'Master Hunter',
    description: 'Found all easter eggs',
    icon: '🏆',
    unlockMessage: 'You found them all! You\'re a master hunter!',
    rarity: 'legendary',
    funFact: 'Only 1% of users find all the easter eggs!'
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

    // Check if user just found all eggs (delayed to avoid double-toast)
    if (eggId !== 'easter_egg_hunter') {
      setTimeout(() => checkMasterHunter(), 1000);
    }

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

// Check for milestone-based easter eggs
export const checkMilestoneEasterEgg = (type, count) => {
  const milestones = {
    messages: { 100: 'messages_100' },
    friends: { 10: 'friends_10' },
    profile_views: { 40: 'profile_views_40' },
    testimony_shares: { 5: 'share_testimony_5x' }
  };

  const eggId = milestones[type]?.[count];
  if (eggId) {
    unlockEasterEgg(eggId);
  }
};

// Check if user found all eggs (Master Hunter)
export const checkMasterHunter = () => {
  const discovered = getDiscoveredEggs();
  const totalEggs = Object.keys(easterEggs).length;

  // Exclude master hunter itself from the count
  const eggsNeeded = totalEggs - 1;

  if (discovered.length >= eggsNeeded && !discovered.includes('easter_egg_hunter')) {
    unlockEasterEgg('easter_egg_hunter');
  }
};

// Check bio for "hallelujah"
export const checkBioEasterEgg = (bio) => {
  if (bio && bio.toLowerCase().includes('hallelujah')) {
    unlockEasterEgg('hallelujah_bio');
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
