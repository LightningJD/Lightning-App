/**
 * Activity Tracker for Lightning App
 * Tracks user activities for secret unlocking: daily logins, streaks, changes
 */

const STORAGE_KEY = 'lightning_activity';

interface ActivityData {
  dailyLogins: string[];
  lastLogin: string | null;
  loginStreak: number;
  avatarChanges: number;
  themeChanges: number;
  lastTheme: string | null;
  nightModeUsage: string[];
  messagesByHour: Record<number, number>;
  lastMessageTime: number | null;
  messageStreak: {
    current: number;
    lastDate: string | null;
  };
}

// Initialize or get activity data
const getActivityData = (): ActivityData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        dailyLogins: [],
        lastLogin: null,
        loginStreak: 0,
        avatarChanges: 0,
        themeChanges: 0,
        lastTheme: null,
        nightModeUsage: [],
        messagesByHour: {}, // { hour: count }
        lastMessageTime: null,
        messageStreak: {
          current: 0,
          lastDate: null
        }
      };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load activity data:', error);
    return {
      dailyLogins: [],
      lastLogin: null,
      loginStreak: 0,
      avatarChanges: 0,
      themeChanges: 0,
      lastTheme: null,
      nightModeUsage: [],
      messagesByHour: {},
      lastMessageTime: null,
      messageStreak: {
        current: 0,
        lastDate: null
      }
    };
  }
};

// Save activity data
const saveActivityData = (data: ActivityData): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save activity data:', error);
    return false;
  }
};

// Track daily login
export const trackDailyLogin = (): number => {
  const data = getActivityData();
  const today = new Date().toDateString();

  // Check if already logged in today
  if (data.dailyLogins.includes(today)) {
    return data.loginStreak;
  }

  // Add today to login history
  data.dailyLogins.push(today);

  // Calculate streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (data.lastLogin === yesterdayStr) {
    // Continuing streak
    data.loginStreak += 1;
  } else if (data.lastLogin === today) {
    // Already counted today
    // Do nothing
  } else {
    // Streak broken, start over
    data.loginStreak = 1;
  }

  data.lastLogin = today;

  // Keep only last 365 days of logins
  if (data.dailyLogins.length > 365) {
    data.dailyLogins = data.dailyLogins.slice(-365);
  }

  saveActivityData(data);
  return data.loginStreak;
};

// Get current login streak
export const getLoginStreak = (): number => {
  const data = getActivityData();
  return data.loginStreak || 0;
};

// Get total days logged in
export const getTotalLoginDays = (): number => {
  const data = getActivityData();
  return data.dailyLogins.length;
};

// Track avatar change
export const trackAvatarChange = (): number => {
  const data = getActivityData();
  data.avatarChanges = (data.avatarChanges || 0) + 1;
  saveActivityData(data);
  return data.avatarChanges;
};

// Get avatar change count
export const getAvatarChangeCount = (): number => {
  const data = getActivityData();
  return data.avatarChanges || 0;
};

// Track theme change
export const trackThemeChange = (newTheme: string): number => {
  const data = getActivityData();

  // Only count if theme actually changed
  if (data.lastTheme !== null && data.lastTheme !== newTheme) {
    data.themeChanges = (data.themeChanges || 0) + 1;
  }

  data.lastTheme = newTheme;
  saveActivityData(data);
  return data.themeChanges;
};

// Get theme change count
export const getThemeChangeCount = (): number => {
  const data = getActivityData();
  return data.themeChanges || 0;
};

// Track night mode usage (for 7-day tracking)
export const trackNightModeUsage = (isNightMode: boolean): void => {
  if (!isNightMode) return;

  const data = getActivityData();
  const today = new Date().toDateString();

  if (!data.nightModeUsage.includes(today)) {
    data.nightModeUsage.push(today);

    // Keep only last 30 days
    if (data.nightModeUsage.length > 30) {
      data.nightModeUsage = data.nightModeUsage.slice(-30);
    }

    saveActivityData(data);
  }
};

// Check if used night mode for N consecutive days
export const hasUsedNightModeForDays = (days: number): boolean => {
  const data = getActivityData();

  if (!data.nightModeUsage || data.nightModeUsage.length < days) {
    return false;
  }

  // Check last N days
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toDateString());
  }

  return dates.every((date: string) => data.nightModeUsage.includes(date));
};

// Track message by hour (for early bird / night owl secrets)
export const trackMessageByHour = (): number => {
  const data = getActivityData();
  const hour = new Date().getHours();

  data.messagesByHour[hour] = (data.messagesByHour[hour] || 0) + 1;
  saveActivityData(data);

  return data.messagesByHour[hour];
};

// Get message count by hour
export const getMessageCountByHour = (hour: number): number => {
  const data = getActivityData();
  return data.messagesByHour[hour] || 0;
};

// Get early bird messages (6-8 AM)
export const getEarlyBirdMessages = (): number => {
  const data = getActivityData();
  let count = 0;
  for (let hour = 6; hour < 8; hour++) {
    count += data.messagesByHour[hour] || 0;
  }
  return count;
};

// Get night owl messages (10 PM - midnight)
export const getNightOwlMessages = (): number => {
  const data = getActivityData();
  let count = 0;
  for (let hour = 22; hour < 24; hour++) {
    count += data.messagesByHour[hour] || 0;
  }
  return count;
};

// Track message streak (7 consecutive days)
export const trackMessageStreak = (): number => {
  const data = getActivityData();
  const today = new Date().toDateString();

  if (data.messageStreak.lastDate === today) {
    // Already sent message today
    return data.messageStreak.current;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (data.messageStreak.lastDate === yesterdayStr) {
    // Continue streak
    data.messageStreak.current += 1;
  } else {
    // Streak broken, restart
    data.messageStreak.current = 1;
  }

  data.messageStreak.lastDate = today;
  saveActivityData(data);

  return data.messageStreak.current;
};

// Get current message streak
export const getMessageStreak = (): number => {
  const data = getActivityData();
  return data.messageStreak.current || 0;
};

// Track quick response time (for response speed secret)
export const trackQuickResponse = (responseTimeMs: number): boolean => {
  // Response time tracking would need to be implemented
  // For now, just return true if under 1 minute
  return responseTimeMs < 60000;
};
