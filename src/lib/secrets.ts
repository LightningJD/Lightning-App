/**
 * Secrets System for Lightning App
 * Tracks discoveries, shows animations, awards badges
 */

import { showSuccess } from './toast';
import { hasUsedNightModeForDays } from './activityTracker';
import { getTestimonyViewCount, getTestimonyLikeCount, getTestimonyComments } from './database';

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
    name: 'Loved by God',
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
  night_mode_7_days: {
    id: 'night_mode_7_days',
    name: 'Lightbringer',
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

  // === TESTIMONY SECRETS ===
  testimony_316_chars: {
    id: 'testimony_316_chars',
    name: 'John 3:16 Writer',
    description: 'Created testimony with exactly 316 characters',
    icon: '📝',
    unlockMessage: 'Perfect length! John 3:16 would be proud.',
    rarity: 'rare',
    funFact: '316 characters - a divine coincidence!'
  },
  testimony_1000_words: {
    id: 'testimony_1000_words',
    name: 'Storyteller',
    description: 'Wrote testimony over 1000 words',
    icon: '📚',
    unlockMessage: 'Your testimony is a full story! Powerful.',
    rarity: 'rare',
    funFact: 'Long-form testimonies get 3x more engagement!'
  },
  testimony_100_views: {
    id: 'testimony_100_views',
    name: 'Viral Testimony',
    description: 'Your testimony reached 100 views',
    icon: '🔥',
    unlockMessage: 'Your story is spreading like wildfire!',
    rarity: 'rare',
    funFact: 'Testimonies that reach 100 views average 25 new connections!'
  },
  testimony_50_hearts: {
    id: 'testimony_50_hearts',
    name: 'Heart Toucher',
    description: 'Received 50 hearts on your testimony',
    icon: '💖',
    unlockMessage: 'You touched 50 hearts with your story!',
    rarity: 'rare',
    funFact: 'Every heart represents someone you encouraged!'
  },
  first_comment_received: {
    id: 'first_comment_received',
    name: 'Conversation Starter',
    description: 'Received your first comment on testimony',
    icon: '💬',
    unlockMessage: 'Someone was moved enough to respond!',
    rarity: 'common',
    funFact: 'First comment is always the most meaningful!'
  },
  testimony_updated_7_days: {
    id: 'testimony_updated_7_days',
    name: 'Living Testimony',
    description: 'Updated your testimony after 7 days',
    icon: '🔄',
    unlockMessage: 'Your testimony grows with you!',
    rarity: 'common',
    funFact: 'Testimonies that evolve show authentic journey!'
  },
  testimony_monthly_updater: {
    id: 'testimony_monthly_updater',
    name: 'Journey Documenter',
    description: 'Updated testimony 3 months in a row',
    icon: '📅',
    unlockMessage: 'You\'re documenting your faith journey!',
    rarity: 'epic',
    funFact: 'Monthly updates show consistent growth!'
  },
  testimony_speed_writer: {
    id: 'testimony_speed_writer',
    name: 'Lightning Writer',
    description: 'Created testimony in under 5 minutes',
    icon: '⚡',
    unlockMessage: 'The Spirit moved through you quickly!',
    rarity: 'common',
    funFact: 'Fast testimonies are often the most authentic!'
  },
  testimony_thoughtful_writer: {
    id: 'testimony_thoughtful_writer',
    name: 'Thoughtful Scribe',
    description: 'Spent over 30 minutes crafting testimony',
    icon: '✍️',
    unlockMessage: 'Your patience shows in your powerful words.',
    rarity: 'rare',
    funFact: 'Detailed testimonies inspire deeper connections!'
  },
  testimony_morning_glory: {
    id: 'testimony_morning_glory',
    name: 'Morning Glory',
    description: 'Created testimony between 5-7 AM',
    icon: '🌅',
    unlockMessage: 'You start your day with testimony!',
    rarity: 'rare',
    funFact: 'Morning testimonies have 40% more clarity!'
  },
  testimony_midnight_warrior: {
    id: 'testimony_midnight_warrior',
    name: 'Midnight Warrior',
    description: 'Created testimony between 12-2 AM',
    icon: '🌃',
    unlockMessage: 'Late night testimony hits different!',
    rarity: 'rare',
    funFact: 'Midnight testimonies are often the most vulnerable!'
  },

  // === FRIENDSHIP SECRETS ===
  friends_25: {
    id: 'friends_25',
    name: 'Circle Builder',
    description: 'Made 25 friends',
    icon: '⭕',
    unlockMessage: 'Your circle is growing strong!',
    rarity: 'rare',
    funFact: 'Average person has 23 close friends - you\'re above average!'
  },
  friends_50: {
    id: 'friends_50',
    name: 'Network Weaver',
    description: 'Made 50 friends',
    icon: '🕸️',
    unlockMessage: 'You\'re weaving a beautiful community!',
    rarity: 'epic',
    funFact: 'You\'re in the top 5% of connectors!'
  },
  friends_100: {
    id: 'friends_100',
    name: 'Ambassador',
    description: 'Made 100 friends',
    icon: '🌟',
    unlockMessage: 'You\'re a Lightning Ambassador!',
    rarity: 'legendary',
    funFact: 'Only 1% of users reach 100 connections!'
  },

  // === MESSAGING SECRETS ===
  first_message_sent: {
    id: 'first_message_sent',
    name: 'First Contact',
    description: 'Sent your first message',
    icon: '📨',
    unlockMessage: 'Every journey starts with hello!',
    rarity: 'common',
    funFact: 'The first message is always the hardest!'
  },
  messages_streak_7: {
    id: 'messages_streak_7',
    name: 'Consistent Encourager',
    description: 'Sent messages 7 days in a row',
    icon: '🔥',
    unlockMessage: 'You\'re consistently spreading encouragement!',
    rarity: 'rare',
    funFact: '7-day streaks lead to lasting friendships!'
  },
  early_bird_messenger: {
    id: 'early_bird_messenger',
    name: 'Early Bird',
    description: 'Sent 10 messages before 8 AM',
    icon: '🐦',
    unlockMessage: 'The early bird spreads the Word!',
    rarity: 'common',
    funFact: 'Morning messages have 60% reply rate!'
  },
  night_owl_messenger: {
    id: 'night_owl_messenger',
    name: 'Night Watchman',
    description: 'Sent 10 messages after 10 PM',
    icon: '🦉',
    unlockMessage: 'You\'re there when others need it most!',
    rarity: 'common',
    funFact: 'Late messages show true dedication!'
  },
  message_response_speed: {
    id: 'message_response_speed',
    name: 'Quick Responder',
    description: 'Replied to 10 messages within 1 minute',
    icon: '⚡',
    unlockMessage: 'Lightning-fast responses!',
    rarity: 'rare',
    funFact: 'Fast replies strengthen bonds by 40%!'
  },

  // === GROUP SECRETS ===
  group_creator: {
    id: 'group_creator',
    name: 'Group Starter',
    description: 'Created your first group',
    icon: '🎪',
    unlockMessage: 'You\'re building something special!',
    rarity: 'rare',
    funFact: 'Group creators are natural leaders!'
  },

  // === SPIRITUAL SECRETS ===
  scripture_shared_5: {
    id: 'scripture_shared_5',
    name: 'Scripture Sharer',
    description: 'Shared 5 Bible verses',
    icon: '📖',
    unlockMessage: 'The Word spreads through you!',
    rarity: 'common',
    funFact: 'Shared verses bless both giver and receiver!'
  },
  psalm_23_shared: {
    id: 'psalm_23_shared',
    name: 'Shepherd\'s Follower',
    description: 'Shared Psalm 23',
    icon: '🐑',
    unlockMessage: 'The Lord is your shepherd!',
    rarity: 'common',
    funFact: 'Psalm 23 is the most comforting scripture!'
  },
  verse_philippians_413: {
    id: 'verse_philippians_413',
    name: 'Strength Finder',
    description: 'Shared Philippians 4:13',
    icon: '💪',
    unlockMessage: 'I can do all things through Christ!',
    rarity: 'common',
    funFact: 'This verse empowered millions!'
  },
  daily_devotional_7: {
    id: 'daily_devotional_7',
    name: 'Devoted One',
    description: 'Opened app for devotional 7 days straight',
    icon: '📿',
    unlockMessage: 'Your consistency honors God!',
    rarity: 'rare',
    funFact: 'Daily devotionals create lasting habits!'
  },

  // === PROFILE SECRETS ===
  profile_complete: {
    id: 'profile_complete',
    name: 'Profile Perfectionist',
    description: 'Filled out 100% of profile fields',
    icon: '✅',
    unlockMessage: 'Your profile is complete!',
    rarity: 'common',
    funFact: 'Complete profiles get 5x more connections!'
  },
  bio_inspiring: {
    id: 'bio_inspiring',
    name: 'Bio Wordsmith',
    description: 'Bio has over 200 characters',
    icon: '✏️',
    unlockMessage: 'Your bio tells your story beautifully!',
    rarity: 'common',
    funFact: 'Detailed bios attract kindred spirits!'
  },
  avatar_changed_5x: {
    id: 'avatar_changed_5x',
    name: 'Identity Explorer',
    description: 'Changed avatar 5 times',
    icon: '🎭',
    unlockMessage: 'You love trying new looks!',
    rarity: 'common',
    funFact: 'Profile changes show personality!'
  },
  theme_switcher: {
    id: 'theme_switcher',
    name: 'Theme Master',
    description: 'Switched between night/day mode 10 times',
    icon: '🌓',
    unlockMessage: 'You appreciate every mode!',
    rarity: 'common',
    funFact: 'Theme switching shows attention to detail!'
  },

  // === HOLIDAY SECRETS ===
  christmas_day: {
    id: 'christmas_day',
    name: 'Christmas Celebrator',
    description: 'Opened app on Christmas Day',
    icon: '🎄',
    unlockMessage: 'Merry Christmas! Jesus is born!',
    rarity: 'epic',
    funFact: 'You celebrated with the Lightning family!'
  },
  easter_sunday: {
    id: 'easter_sunday',
    name: 'Resurrection Witness',
    description: 'Opened app on Easter Sunday',
    icon: '🐣',
    unlockMessage: 'He is risen! He is risen indeed!',
    rarity: 'epic',
    funFact: 'You celebrated the resurrection!'
  },
  new_year_midnight: {
    id: 'new_year_midnight',
    name: 'New Year Believer',
    description: 'Opened app at midnight on New Year',
    icon: '🎆',
    unlockMessage: 'New year, new mercies!',
    rarity: 'legendary',
    funFact: 'You started the year with faith!'
  },
  pentecost_sunday: {
    id: 'pentecost_sunday',
    name: 'Spirit-Filled',
    description: 'Opened app on Pentecost Sunday',
    icon: '🔥',
    unlockMessage: 'The Spirit moves today!',
    rarity: 'legendary',
    funFact: 'Pentecost celebrates the Holy Spirit!'
  },
  good_friday: {
    id: 'good_friday',
    name: 'Cross Bearer',
    description: 'Opened app on Good Friday',
    icon: '✝️',
    unlockMessage: 'He died so we might live.',
    rarity: 'epic',
    funFact: 'Good Friday changed everything!'
  },

  // === ACHIEVEMENT SECRETS ===
  app_anniversary_1_year: {
    id: 'app_anniversary_1_year',
    name: 'One Year Strong',
    description: 'Been a member for 1 year',
    icon: '🎂',
    unlockMessage: 'Happy Lightning Anniversary!',
    rarity: 'epic',
    funFact: 'You\'re part of the foundation!'
  },
  daily_login_30: {
    id: 'daily_login_30',
    name: 'Faithful 30',
    description: 'Logged in 30 days in a row',
    icon: '📆',
    unlockMessage: 'Your consistency is inspiring!',
    rarity: 'rare',
    funFact: '30-day streaks create habits!'
  },
  daily_login_100: {
    id: 'daily_login_100',
    name: 'Centurion',
    description: 'Logged in 100 days in a row',
    icon: '💯',
    unlockMessage: 'You\'re a Lightning centurion!',
    rarity: 'legendary',
    funFact: 'Only 0.5% reach 100 days!'
  },
  early_adopter: {
    id: 'early_adopter',
    name: 'Pioneer',
    description: 'Joined in the first 1000 users',
    icon: '🚀',
    unlockMessage: 'You\'re a Lightning pioneer!',
    rarity: 'legendary',
    funFact: 'Early adopters are the foundation!'
  },
  beta_tester: {
    id: 'beta_tester',
    name: 'Beta Legend',
    description: 'Used the app during beta',
    icon: '🧪',
    unlockMessage: 'You helped build Lightning!',
    rarity: 'legendary',
    funFact: 'Beta testers shaped the app!'
  },

  // === META SECRET ===
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
export const isSecretDiscovered = (secretId: string): boolean => {
  const discovered = getDiscoveredSecrets();
  return discovered.includes(secretId);
};

// Unlock a secret
export const unlockSecret = (secretId: string): boolean => {
  const secret = secrets[secretId as keyof typeof secrets];
  if (!secret) {
    return false;
  }

  // Check if already discovered
  if (isSecretDiscovered(secretId)) {
    return false;
  }

  // Add to discovered list
  const discovered = getDiscoveredSecrets();
  discovered.push(secretId);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(discovered));

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
const showSecretToast = (secret: any): void => {
  const rarityColors: Record<string, string> = {
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
export const checkMilestoneSecret = (type: string, count: number): void => {
  const milestones: Record<string, Record<number, string>> = {
    messages: { 1: 'first_message_sent', 100: 'messages_100' },
    friends: { 10: 'friends_10', 25: 'friends_25', 50: 'friends_50', 100: 'friends_100' },
    profile_views: { 40: 'profile_views_40' },
    testimony_shares: { 5: 'share_testimony_5x' },
    messages_streak_days: { 7: 'messages_streak_7' },
    daily_login_streak: { 30: 'daily_login_30', 100: 'daily_login_100' },
    group_created: { 1: 'group_creator' },
    scriptures_shared: { 5: 'scripture_shared_5' },
    devotional_streak: { 7: 'daily_devotional_7' },
    avatar_changes: { 5: 'avatar_changed_5x' },
    theme_switches: { 10: 'theme_switcher' },
    early_messages: { 10: 'early_bird_messenger' },
    late_messages: { 10: 'night_owl_messenger' },
    quick_replies: { 10: 'message_response_speed' },
    testimony_views: { 100: 'testimony_100_views' },
    testimony_hearts: { 50: 'testimony_50_hearts' },
    testimony_comments: { 1: 'first_comment_received' }
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
export const checkBioSecret = (bio: string): void => {
  if (bio && bio.toLowerCase().includes('hallelujah')) {
    unlockSecret('hallelujah_bio');
  }
};

// Start checking for time-based secrets every minute
let timeCheckInterval: NodeJS.Timeout | null = null;

export const startTimeBasedSecrets = () => {
  if (timeCheckInterval) return; // Already running

  // Check immediately
  checkTimeBasedSecrets();

  // Check every minute
  timeCheckInterval = setInterval(() => {
    checkTimeBasedSecrets();
  }, 60000); // 60 seconds
};

export const stopTimeBasedSecrets = () => {
  if (timeCheckInterval) {
    clearInterval(timeCheckInterval);
    timeCheckInterval = null;
  }
};

// Check for holiday-based secrets
export const checkHolidaySecrets = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const hour = now.getHours();

  // Christmas (December 25)
  if (month === 12 && day === 25) {
    unlockSecret('christmas_day');
  }

  // New Year's Midnight (January 1, 12 AM)
  if (month === 1 && day === 1 && hour === 0) {
    unlockSecret('new_year_midnight');
  }

  // Good Friday (calculated - Friday before Easter)
  // Easter Sunday (calculated - varies each year)
  // Pentecost Sunday (calculated - 50 days after Easter)
  // Note: These require a date calculation library or manual input
  // For now, we can add them when we implement a proper church calendar
};

// Check testimony-specific secrets
export const checkTestimonySecrets = (testimony: any, timeSpent?: number): void => {
  const content = testimony.content || '';
  const charCount = content.length;
  const wordCount = content.trim().split(/\s+/).length;
  const hour = new Date().getHours();

  // Check character count secrets
  if (charCount === 316) {
    unlockSecret('testimony_316_chars');
  }

  // Check word count secrets
  if (wordCount >= 1000) {
    unlockSecret('testimony_1000_words');
  }

  // Check time spent writing
  if (timeSpent && timeSpent < 5 * 60 * 1000) { // Under 5 minutes
    unlockSecret('testimony_speed_writer');
  }
  if (timeSpent && timeSpent > 30 * 60 * 1000) { // Over 30 minutes
    unlockSecret('testimony_thoughtful_writer');
  }

  // Check time of day
  if (hour >= 5 && hour < 7) {
    unlockSecret('testimony_morning_glory');
  }
  if (hour >= 0 && hour < 2) {
    unlockSecret('testimony_midnight_warrior');
  }
};

// Check profile completion secrets
export const checkProfileSecrets = (profile: any): void => {
  // Check if profile is 100% complete
  const requiredFields = ['username', 'displayName', 'bio', 'location', 'avatarEmoji'];
  const completedFields = requiredFields.filter(field => profile[field] && profile[field].trim() !== '');

  if (completedFields.length === requiredFields.length) {
    unlockSecret('profile_complete');
  }

  // Check bio length
  if (profile.bio && profile.bio.length >= 200) {
    unlockSecret('bio_inspiring');
  }

  // Check bio content for "hallelujah"
  checkBioSecret(profile.bio);
};

// Check scripture sharing secrets
export const checkScriptureSecret = (text: string): void => {
  const lowerText = text.toLowerCase();

  // Check for Psalm 23
  if (lowerText.includes('psalm 23') || lowerText.includes('the lord is my shepherd')) {
    unlockSecret('psalm_23_shared');
  }

  // Check for Philippians 4:13
  if (lowerText.includes('philippians 4:13') || lowerText.includes('i can do all things')) {
    unlockSecret('verse_philippians_413');
  }
};

// Check user anniversary
export const checkAnniversarySecret = (userCreatedDate: string | Date): void => {
  const now = new Date();
  const created = new Date(userCreatedDate);
  const yearsDiff = now.getFullYear() - created.getFullYear();
  const monthsDiff = now.getMonth() - created.getMonth();
  const daysDiff = now.getDate() - created.getDate();

  // Check if it's exactly 1 year
  if (yearsDiff === 1 && monthsDiff === 0 && daysDiff === 0) {
    unlockSecret('app_anniversary_1_year');
  }
};

// Check early adopter status
export const checkEarlyAdopterSecret = (userNumber: number): void => {
  // If user is in first 1000 users
  if (userNumber <= 1000) {
    unlockSecret('early_adopter');
  }
};

// Check message content for secrets
export const checkMessageSecrets = (messageText: string): void => {
  if (!messageText) return;

  const lowerText = messageText.toLowerCase();

  // Count occurrences of "amen" (whole word only)
  const amenMatches = lowerText.match(/\bamen\b/g);
  if (amenMatches && amenMatches.length >= 3) {
    unlockSecret('amen_3x');
  }

  // Check for scripture references
  checkScriptureSecret(messageText);
};

// Check activity-based secrets
export const checkActivitySecrets = () => {
  // Check 7-day night mode usage
  if (hasUsedNightModeForDays(7)) {
    unlockSecret('night_mode_7_days');
  }
};

// Check testimony analytics secrets (views, likes, comments)
export const checkTestimonyAnalyticsSecrets = async (testimonyId: string): Promise<void> => {
  // This will be called after testimony interactions
  // We'll check the counts from the database to unlock secrets

  // Check if testimony has 100 views (Viral Testimony)
  const { count: viewCount } = await getTestimonyViewCount(testimonyId);
  if (viewCount >= 100) {
    unlockSecret('testimony_100_views');
  }

  // Check if testimony has 50 hearts (Heart Toucher)
  const { count: likeCount } = await getTestimonyLikeCount(testimonyId);
  if (likeCount >= 50) {
    unlockSecret('testimony_50_hearts');
  }

  // Check if testimony received its first comment (Conversation Starter)
  const { comments } = await getTestimonyComments(testimonyId);
  if (comments.length === 1) {
    // First comment ever on this testimony
    // Only unlock for the testimony AUTHOR, not the commenter
    // This will be called from the UI where we know the testimony author
    unlockSecret('first_comment_received');
  }
};
