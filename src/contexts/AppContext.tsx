import React, { createContext, useContext, useState, useCallback } from 'react';
import { useClerk, useSession } from '@clerk/clerk-react';
import { useUserProfile } from '../components/useUserProfile';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../lib/toast';
import { checkBeforeSend } from '../lib/contentFilter';
import { geocodeCity } from '../hooks/useGeolocation';
import {
  createTestimony, updateUserProfile, updateUserLocation, updateTestimony,
  getTestimonyByUserId, syncUserToSupabase, getUserByClerkId, getPendingFriendRequests,
  createChurch, resolveReferralCode, createPendingReferral, checkAndRunBpReset,
  recordDeviceFingerprint, updateOnlineStatus
} from '../lib/database';
import { isAdmin } from '../lib/database/users';
import { generateDeviceFingerprint } from '../lib/deviceFingerprint';
import { supabase } from '../lib/supabase';
import {
  registerServiceWorker, setupPushNotifications, isPushSupported,
  getNotificationPermission, unsubscribeFromPush
} from '../lib/webPush';
import { saveGuestTestimony, getGuestTestimony, clearGuestTestimony } from '../lib/guestTestimony';
import {
  unlockSecret, startTimeBasedSecrets, stopTimeBasedSecrets,
  checkTestimonySecrets, checkHolidaySecrets, checkProfileSecrets,
  checkMilestoneSecret, checkActivitySecrets
} from '../lib/secrets';
import {
  trackDailyLogin, trackThemeChange, trackNightModeUsage,
  trackAvatarChange
} from '../lib/activityTracker';
import { initSentry, setUser as setSentryUser } from '../lib/sentry';
import type { UserUpdate } from '../types';
import type { TestimonyAnswers } from '../lib/api/claude';

// ============================================
// TYPES
// ============================================

export interface AppContextType {
  // Theme
  nightMode: boolean;
  handleNightModeToggle: () => void;
  themes: Record<string, { name: string; lightGradient: string; darkGradient: string; description: string }>;
  selectedTheme: string;

  // User / Profile
  isLoading: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  userProfile: any;
  clerkUser: any;
  profile: any;
  localProfile: any;
  setLocalProfile: React.Dispatch<React.SetStateAction<any>>;
  userIsAdmin: boolean;

  // Navigation
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  startChatWith: { id: string; name: string; avatar?: string } | null;
  setStartChatWith: (user: { id: string; name: string; avatar?: string } | null) => void;
  activeServerName: string | null;
  setActiveServerName: (name: string | null) => void;
  activeServerEmoji: string | null;
  setActiveServerEmoji: (emoji: string | null) => void;

  // Notification counts
  notificationCounts: { messages: number; find: number };
  handleConversationsCountChange: (count: number) => void;

  // Settings state
  privacySettings: { isPrivate: boolean; testimonyVisibility: string; messagePrivacy: string };
  notificationSettings: { notifyMessages: boolean; notifyFriendRequests: boolean; notifyNearby: boolean };
  searchRadius: number;
  setSearchRadius: (r: number) => void;
  handlePrivacyToggle: (setting: string, value: boolean | string) => Promise<void>;
  handleNotificationToggle: (setting: string, value: boolean) => Promise<void>;
  handleSaveSearchRadius: () => Promise<void>;

  // Push notifications
  pushPermission: string;
  handleEnablePush: () => Promise<void>;
  handleDisablePush: () => Promise<void>;

  // Discover tab state (for NearbyTab)
  sortBy: string;
  setSortBy: (s: string) => void;
  activeDiscoverTab: string;
  setActiveDiscoverTab: (t: string) => void;

  // Profile dialogs
  showProfileWizard: boolean;
  setShowProfileWizard: (v: boolean) => void;
  showProfileEdit: boolean;
  setShowProfileEdit: (v: boolean) => void;
  showChangePicture: boolean;
  setShowChangePicture: (v: boolean) => void;
  showTestimonyEdit: boolean;
  setShowTestimonyEdit: (v: boolean) => void;
  testimonyData: any;

  // Testimony
  showTestimonyQuestionnaire: boolean;
  setShowTestimonyQuestionnaire: (v: boolean) => void;
  testimonyStartTime: number | null;
  setTestimonyStartTime: (t: number | null) => void;
  handleTestimonyQuestionnaireComplete: (data: { content: string; answers: TestimonyAnswers; visibility?: 'my_church' | 'all_churches' | 'shareable' }) => Promise<void>;
  handleEditTestimony: () => Promise<void>;
  handleTestimonySave: (data: { formData: any; finalContent: string }) => Promise<void>;

  // Profile handlers
  handleProfileComplete: (profileData: UserUpdate) => Promise<void>;
  handleSkipProfileWizard: () => void;
  handleProfileEdit: (profileData: any) => Promise<void>;

  // Menu
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;

  // Misc dialogs
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (v: boolean) => void;
  showSaveTestimonyModal: boolean;
  setShowSaveTestimonyModal: (v: boolean) => void;
  showSecretsMuseum: boolean;
  setShowSecretsMuseum: (v: boolean) => void;
  showBugReport: boolean;
  setShowBugReport: (v: boolean) => void;
  showTerms: boolean;
  setShowTerms: (v: boolean) => void;
  showPrivacy: boolean;
  setShowPrivacy: (v: boolean) => void;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
  showContactSupport: boolean;
  setShowContactSupport: (v: boolean) => void;
  showBlockedUsers: boolean;
  setShowBlockedUsers: (v: boolean) => void;
  showReportContent: boolean;
  setShowReportContent: (v: boolean) => void;
  reportData: { type: 'user' | 'testimony' | 'message' | 'group' | null; content: { id: string; ownerId?: string; name?: string } | null };
  setReportData: (data: any) => void;
  showLinkSpotify: boolean;
  setShowLinkSpotify: (v: boolean) => void;
  showAdminDashboard: boolean;
  setShowAdminDashboard: (v: boolean) => void;

  // Auth
  signOut: () => void;

  // Guest testimony
  handleContinueAsGuest: () => void;
  handleSaveTestimonyModalClose: () => void;

  // Logo easter egg
  handleLogoClick: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================
// THEME DEFINITIONS
// ============================================

const THEMES: Record<string, { name: string; lightGradient: string; darkGradient: string; description: string }> = {
  periwinkle: {
    name: 'Periwinkle',
    lightGradient: `linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%),
                    radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%),
                    linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)`,
    darkGradient: `linear-gradient(135deg, rgba(17, 24, 39, 0.42) 0%, transparent 100%),
                   radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.035) 0%, transparent 60%),
                   linear-gradient(45deg, #0a0a0a 0%, #15121c 50%, #191e27 100%)`,
    description: 'Periwinkle blue with purple accents'
  }
};

const DEMO_PROFILE = {
  username: "king_david",
  displayName: "David",
  avatar: "\u{1F451}",
  bio: "Shepherd. Warrior. King. A man after God's own heart, saved by His grace.",
  hasTestimony: false,
  music: null,
  story: {
    title: "My Testimony",
    content: "Today, I lead God's people as king over all Israel...",
    lesson: "My life taught me that being 'a man after God's own heart' doesn't mean never falling..."
  }
};

// ============================================
// PROVIDER
// ============================================

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useClerk();
  const { session } = useSession();
  const { isLoading, isAuthenticated, isSyncing, profile: userProfile, user: clerkUser } = useUserProfile();
  const [localProfile, setLocalProfile] = useState<any>(null);

  const [currentTab, setCurrentTab] = useState('home');
  const [showMenu, setShowMenu] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [activeDiscoverTab, setActiveDiscoverTab] = useState('home');
  const selectedTheme = localStorage.getItem('lightningTheme') || 'periwinkle';
  const [nightMode, setNightMode] = useState(localStorage.getItem('lightningNightMode') === 'true');
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showTestimonyEdit, setShowTestimonyEdit] = useState(false);
  const [testimonyData, setTestimonyData] = useState<any>(null);
  const [showTestimonyQuestionnaire, setShowTestimonyQuestionnaire] = useState(false);
  const [notificationCounts, setNotificationCounts] = React.useState({ messages: 0, find: 0 });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSaveTestimonyModal, setShowSaveTestimonyModal] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [startChatWith, setStartChatWith] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const handleConversationsCountChange = useCallback((count: number) => {
    setNotificationCounts((prev) => ({ ...prev, messages: count }));
  }, []);
  const [logoClickTimer, setLogoClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSecretsMuseum, setShowSecretsMuseum] = useState(false);
  const [testimonyStartTime, setTestimonyStartTime] = useState<number | null>(null);
  const [showBugReport, setShowBugReport] = useState(false);
  const [activeServerName, setActiveServerName] = useState<string | null>(null);
  const [activeServerEmoji, setActiveServerEmoji] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showReportContent, setShowReportContent] = useState(false);
  const [reportData, setReportData] = useState<{ type: 'user' | 'testimony' | 'message' | 'group' | null; content: { id: string; ownerId?: string; name?: string } | null }>({ type: null, content: null });
  const [showLinkSpotify, setShowLinkSpotify] = useState(false);
  const [showChangePicture, setShowChangePicture] = useState(false);

  const [privacySettings, setPrivacySettings] = useState({
    isPrivate: userProfile?.isPrivate || false,
    testimonyVisibility: userProfile?.testimonyVisibility || 'everyone',
    messagePrivacy: userProfile?.messagePrivacy || 'everyone'
  });
  const [notificationSettings, setNotificationSettings] = useState({
    notifyMessages: userProfile?.notifyMessages !== false,
    notifyFriendRequests: userProfile?.notifyFriendRequests !== false,
    notifyNearby: userProfile?.notifyNearby !== false
  });
  const [searchRadius, setSearchRadius] = useState(userProfile?.searchRadius || 25);

  const [pushPermission, setPushPermission] = React.useState<string>(
    isPushSupported() ? getNotificationPermission() : 'unsupported'
  );

  const [userIsAdmin, setUserIsAdmin] = React.useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = React.useState(false);

  // ============================================
  // EFFECTS — Sync local profile mirror
  // ============================================

  React.useEffect(() => {
    if (userProfile) {
      setLocalProfile((prev: any) => {
        if (!prev || prev.supabaseId !== userProfile.supabaseId) {
          return userProfile;
        }
        if (prev.hasTestimony !== userProfile.hasTestimony || prev.story?.id !== userProfile.story?.id) {
          return { ...prev, ...userProfile };
        }
        const hasChanges = Object.keys(userProfile).some((key: string) =>
          (userProfile as any)[key] !== (prev as any)[key] && !prev.hasOwnProperty(key)
        );
        return hasChanges ? { ...userProfile, ...prev } : prev;
      });
    } else {
      setLocalProfile(null);
    }
  }, [userProfile?.supabaseId, userProfile?.displayName, userProfile?.username, userProfile?.bio, userProfile?.location, userProfile?.avatar, userProfile?.avatarImage, userProfile?.hasTestimony, userProfile?.story?.id]);

  React.useEffect(() => {
    if (userProfile?.username && localProfile?.username !== userProfile.username) {
      setLocalProfile((prev: any) => prev ? { ...prev, username: userProfile.username } : null);
    }
  }, [userProfile?.username, localProfile?.username]);

  // Update settings when user profile loads
  React.useEffect(() => {
    if (userProfile) {
      setPrivacySettings({
        isPrivate: userProfile.isPrivate || false,
        testimonyVisibility: userProfile.testimonyVisibility || 'everyone',
        messagePrivacy: userProfile.messagePrivacy || 'everyone'
      });
      setNotificationSettings({
        notifyMessages: userProfile.notifyMessages !== false,
        notifyFriendRequests: userProfile.notifyFriendRequests !== false,
        notifyNearby: userProfile.notifyNearby !== false
      });
      setSearchRadius(userProfile.searchRadius || 25);
    }
  }, [userProfile?.supabaseId]);

  // Theme-color meta tag
  React.useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const darkBg = '#0a0a0a';
    const lightBg = '#E8F3FE';
    if (meta) meta.setAttribute('content', nightMode ? darkBg : lightBg);
    document.documentElement.style.backgroundColor = nightMode ? darkBg : lightBg;
    document.body.style.backgroundColor = nightMode ? darkBg : lightBg;
  }, [nightMode]);

  // Poll for friend request badges
  React.useEffect(() => {
    if (!userProfile?.supabaseId) return;
    let isMounted = true;
    const pollFriendRequests = async () => {
      try {
        const pending = await getPendingFriendRequests(userProfile.supabaseId);
        if (isMounted) {
          setNotificationCounts(prev => ({ ...prev, find: pending.length }));
        }
      } catch {
        // Silently fail
      }
    };
    pollFriendRequests();
    const interval = setInterval(pollFriendRequests, 30000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [userProfile?.supabaseId]);

  // Online presence
  React.useEffect(() => {
    if (!userProfile?.supabaseId) return;
    const userId = userProfile.supabaseId;
    updateOnlineStatus(userId, true);
    const heartbeat = setInterval(() => { updateOnlineStatus(userId, true); }, 60000);
    const handleVisibility = () => {
      if (document.hidden) { updateOnlineStatus(userId, false); }
      else { updateOnlineStatus(userId, true); }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const handleUnload = () => { updateOnlineStatus(userId, false); };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      updateOnlineStatus(userId, false);
    };
  }, [userProfile?.supabaseId]);

  // Clear find badge when user opens Find tab
  React.useEffect(() => {
    if (currentTab === 'find') {
      setNotificationCounts(prev => ({ ...prev, find: 0 }));
    }
  }, [currentTab]);

  // Service worker
  React.useEffect(() => {
    registerServiceWorker().then((reg) => {
      if (reg) console.log('[App] Service worker registered');
    });
  }, []);

  // Admin check
  React.useEffect(() => {
    if (!userProfile?.supabaseId) return;
    isAdmin(userProfile.supabaseId).then(setUserIsAdmin);
  }, [userProfile?.supabaseId]);

  // Sentry
  React.useEffect(() => { initSentry(); }, []);
  React.useEffect(() => {
    if (isAuthenticated && userProfile) {
      setSentryUser({ id: userProfile.supabaseId, email: userProfile.email, username: userProfile.username, displayName: userProfile.displayName });
    } else {
      setSentryUser(null);
    }
  }, [isAuthenticated, userProfile]);

  // Secrets & activity tracking
  React.useEffect(() => {
    startTimeBasedSecrets();
    checkHolidaySecrets();
    const streak = trackDailyLogin();
    if (streak === 30) checkMilestoneSecret('daily_login', 30);
    else if (streak === 100) checkMilestoneSecret('daily_login', 100);
    trackNightModeUsage(nightMode);
    checkActivitySecrets();
    return () => stopTimeBasedSecrets();
  }, []);

  // Device fingerprinting
  const referralInitRef = React.useRef(false);
  React.useEffect(() => {
    if (!isAuthenticated || !userProfile?.supabaseId) return;
    if (referralInitRef.current) return;
    referralInitRef.current = true;
    try {
      const fp = generateDeviceFingerprint();
      recordDeviceFingerprint(userProfile.supabaseId, fp);
    } catch (err) { console.error('Device fingerprint error:', err); }
    checkAndRunBpReset().catch(err => { console.error('BP reset check error:', err); });
  }, [isAuthenticated, userProfile?.supabaseId]);

  // Auto-save guest testimony
  React.useEffect(() => {
    let isMounted = true;
    const autoSaveGuestTestimony = async () => {
      if (!isMounted) return;
      if (isAuthenticated && userProfile?.supabaseId) {
        const guestTestimony = getGuestTestimony();
        if (guestTestimony) {
          console.log('Guest testimony found, auto-saving...');
          const guestProfanityResult = checkBeforeSend(guestTestimony.content);
          if (guestProfanityResult.severity === 'high') {
            console.warn('Guest testimony blocked by profanity filter');
            clearGuestTestimony();
            return;
          }
          const toastId = showLoading('Saving your testimony...');
          try {
            const saved = await createTestimony(userProfile.supabaseId, {
              content: guestTestimony.content,
              question1: guestTestimony.answers.question1,
              question2: guestTestimony.answers.question2,
              question3: guestTestimony.answers.question3,
              question4: guestTestimony.answers.question4,
              lesson: guestTestimony.lesson || 'My journey taught me that transformation is possible through faith.',
              isPublic: true,
              visibility: 'my_church'
            });
            if (!isMounted) return;
            if (saved) {
              clearGuestTestimony();
              updateToSuccess(toastId, 'Your testimony has been published!');
              unlockSecret('first_testimony');
              if (isMounted) setShowSaveTestimonyModal(false);
              if (isMounted) window.dispatchEvent(new CustomEvent('profileUpdated'));
            } else {
              throw new Error('Failed to save testimony');
            }
          } catch (error) {
            console.error('Failed to auto-save guest testimony:', error);
            if (isMounted) updateToError(toastId, 'Testimony saved locally. You can publish it from your profile.');
          }
        }
      }
    };
    autoSaveGuestTestimony();
    return () => { isMounted = false; };
  }, [isAuthenticated, userProfile?.supabaseId]);

  // Profile wizard check
  React.useEffect(() => {
    if (isAuthenticated && userProfile && userProfile.supabaseId) {
      const isProfileIncomplete = !userProfile.profileCompleted;
      if (isProfileIncomplete && !profileCompleted) {
        const timer = setTimeout(() => { setShowProfileWizard(true); }, 500);
        return () => clearTimeout(timer);
      } else if (userProfile.profileCompleted) {
        setShowProfileWizard(false);
        setProfileCompleted(true);
      }
    }
  }, [isAuthenticated, userProfile, profileCompleted]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (logoClickTimer) clearTimeout(logoClickTimer);
    if (newCount === 10) {
      unlockSecret('logo_10_clicks');
      setLogoClicks(0);
    } else {
      const timer = setTimeout(() => { setLogoClicks(0); }, 2000);
      setLogoClickTimer(timer);
    }
  };

  const handleNightModeToggle = () => {
    const newNightMode = !nightMode;
    setNightMode(newNightMode);
    localStorage.setItem('lightningNightMode', newNightMode.toString());
    const changes = trackThemeChange(newNightMode ? 'night' : 'day');
    if (changes === 10) unlockSecret('theme_switcher');
    trackNightModeUsage(newNightMode);
  };

  const handleEnablePush = async () => {
    if (!userProfile?.supabaseId) return;
    try {
      const result = await setupPushNotifications(userProfile.supabaseId);
      setPushPermission(result.permission);
      if (result.success) showSuccess('Push notifications enabled!');
      else if (result.permission === 'denied') showError('Notifications blocked. Enable in browser settings.');
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      showError('Failed to enable push notifications');
    }
  };

  const handleDisablePush = async () => {
    if (!userProfile?.supabaseId) return;
    try {
      await unsubscribeFromPush(userProfile.supabaseId);
      setPushPermission('default');
      showSuccess('Push notifications disabled');
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      showError('Failed to disable push notifications');
    }
  };

  const handlePrivacyToggle = async (setting: string, value: boolean | string): Promise<void> => {
    if (!userProfile) return;
    const newSettings = { ...privacySettings, [setting]: value };
    setPrivacySettings(newSettings);
    try {
      await updateUserProfile(userProfile.supabaseId, { [setting]: value });
      showSuccess('Privacy setting updated');
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      showError('Failed to update setting');
      setPrivacySettings(privacySettings);
    }
  };

  const handleNotificationToggle = async (setting: string, value: boolean): Promise<void> => {
    if (!userProfile) return;
    const newSettings = { ...notificationSettings, [setting]: value };
    setNotificationSettings(newSettings);
    try {
      await updateUserProfile(userProfile.supabaseId, { [setting]: value });
      showSuccess('Notification setting updated');
    } catch (error) {
      console.error('Error updating notification setting:', error);
      showError('Failed to update setting');
      setNotificationSettings(notificationSettings);
    }
  };

  const handleSaveSearchRadius = async (): Promise<void> => {
    if (!userProfile) return;
    if (!searchRadius || isNaN(searchRadius) || searchRadius < 5 || searchRadius > 100) {
      showError('Search radius must be between 5 and 100 miles');
      setSearchRadius(userProfile.searchRadius || 25);
      return;
    }
    try {
      await updateUserProfile(userProfile.supabaseId, { search_radius: searchRadius });
      showSuccess('Search radius updated');
    } catch (error) {
      console.error('Error updating search radius:', error);
      showError('Failed to update search radius');
      setSearchRadius(userProfile.searchRadius || 25);
    }
  };

  const ensureSupabaseSession = async (): Promise<boolean> => {
    if (!session || !supabase) return false;
    try {
      const token = await session.getToken({ template: 'supabase' });
      if (!token) {
        console.warn('Supabase token missing');
        return false;
      }
      const { error } = await supabase.auth.setSession({ access_token: token, refresh_token: token });
      if (error) { console.error('Error setting Supabase session:', error); return false; }
      return true;
    } catch (error) {
      console.error('Failed to set Supabase session:', error);
      return false;
    }
  };

  const getExistingSupabaseUserId = async (): Promise<string | null> => {
    if (userProfile?.supabaseId) return userProfile.supabaseId;
    if (!clerkUser?.id) return null;
    const existing = await getUserByClerkId(clerkUser.id);
    return existing?.id || null;
  };

  const handleProfileComplete = async (profileData: UserUpdate): Promise<void> => {
    if (!userProfile || !userProfile.supabaseId) {
      showError('No user profile found. Please try logging in again.');
      return;
    }
    const toastId = showLoading('Setting up your profile...');
    try {
      const churchData = (profileData as any)._churchId;
      const pendingChurch = (profileData as any)._pendingChurch;
      const updated = await updateUserProfile(userProfile.supabaseId, { ...profileData, profileCompleted: true });
      if (updated) {
        if (pendingChurch?._pendingCreate) {
          try {
            const newChurch = await createChurch(pendingChurch.name, userProfile.supabaseId, undefined, pendingChurch.denomination || undefined);
            if (newChurch) console.log('Created church during onboarding:', newChurch.name);
          } catch (churchErr) { console.error('Failed to create church during onboarding:', churchErr); }
        } else if (churchData) {
          try {
            await updateUserProfile(userProfile.supabaseId, { church_id: churchData } as any);
          } catch (churchErr) { console.error('Failed to join church during onboarding:', churchErr); }
        }
        const referralCode = (profileData as any)._referralCode;
        if (referralCode) {
          try {
            const referrer = await resolveReferralCode(referralCode);
            if (referrer && referrer.id !== userProfile.supabaseId) {
              await createPendingReferral(referrer.id, userProfile.supabaseId, referralCode);
              await updateUserProfile(userProfile.supabaseId, { referred_by_code: referralCode } as any);
            }
            localStorage.removeItem('lightning_referral_code');
          } catch (refErr) { console.error('Failed to process referral code:', refErr); }
        }
        if ((profileData as any)._coords?.lat && (profileData as any)._coords?.lng) {
          try { await updateUserLocation(userProfile.supabaseId, (profileData as any)._coords.lat, (profileData as any)._coords.lng); }
          catch (locErr) { console.error('Failed to save location coordinates:', locErr); }
        } else if (profileData.location && typeof profileData.location === 'string') {
          try {
            const coords = await geocodeCity(profileData.location);
            if (coords) await updateUserLocation(userProfile.supabaseId, coords.lat, coords.lng);
          } catch (geoErr) { console.error('Failed to geocode city:', geoErr); }
        }
        updateToSuccess(toastId, 'Profile setup complete! Welcome to Lightning!');
        setProfileCompleted(true);
        setShowProfileWizard(false);
        checkProfileSecrets({ ...profileData, profileCompleted: true });
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        setTimeout(() => { setShowTestimonyQuestionnaire(true); setTestimonyStartTime(Date.now()); }, 500);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to setup profile. Please try again.';
      updateToError(toastId, errorMessage);
      throw error;
    }
  };

  const handleSkipProfileWizard = () => {
    setShowProfileWizard(false);
    setProfileCompleted(true);
  };

  const handleContinueAsGuest = () => {
    setShowSaveTestimonyModal(false);
    showSuccess('Testimony saved! Sign up anytime to publish it.');
  };

  const handleSaveTestimonyModalClose = () => {
    console.log('User tried to close save testimony modal');
  };

  const handleProfileEdit = async (profileData: any): Promise<void> => {
    if (!userProfile || !userProfile.supabaseId) {
      showError('No user profile found. Please try logging in again.');
      return;
    }
    const toastId = showLoading('Updating profile...');
    try {
      const dbData = { ...profileData };
      if (profileData.churchName !== undefined) dbData.church_name = profileData.churchName;
      if (profileData.churchLocation !== undefined) dbData.church_location = profileData.churchLocation;
      if (profileData.denomination !== undefined) dbData.denomination = profileData.denomination;
      if (profileData.yearSaved !== undefined) dbData.year_saved = profileData.yearSaved;
      if (profileData.isBaptized !== undefined) dbData.is_baptized = profileData.isBaptized;
      if (profileData.yearBaptized !== undefined) dbData.year_baptized = profileData.yearBaptized;
      if (profileData.favoriteVerse !== undefined) dbData.favorite_verse = profileData.favoriteVerse;
      if (profileData.favoriteVerseRef !== undefined) dbData.favorite_verse_ref = profileData.favoriteVerseRef;
      if (profileData.faithInterests !== undefined) dbData.faith_interests = profileData.faithInterests;
      const updated = await updateUserProfile(userProfile.supabaseId, dbData);
      if (updated) {
        let savedCoords: { lat: number; lng: number } | null = null;
        if (profileData._coords?.lat && profileData._coords?.lng) {
          try { await updateUserLocation(userProfile.supabaseId, profileData._coords.lat, profileData._coords.lng); savedCoords = { lat: profileData._coords.lat, lng: profileData._coords.lng }; }
          catch (locErr) { console.error('Failed to update location coordinates:', locErr); }
        } else if (profileData.location && typeof profileData.location === 'string') {
          try {
            const coords = await geocodeCity(profileData.location);
            if (coords) { await updateUserLocation(userProfile.supabaseId, coords.lat, coords.lng); savedCoords = coords; }
          } catch (geoErr) { console.error('Failed to geocode city:', geoErr); }
        }
        setLocalProfile((prev: any) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (profileData.displayName !== undefined) next.displayName = profileData.displayName;
          if (profileData.username !== undefined) next.username = profileData.username;
          if (profileData.bio !== undefined) next.bio = profileData.bio;
          if (profileData.location !== undefined) next.location = profileData.location;
          if (profileData.avatar !== undefined) next.avatar = profileData.avatar;
          if (profileData.avatarUrl !== undefined) next.avatarImage = profileData.avatarUrl;
          if (savedCoords) { next.locationLat = savedCoords.lat; next.locationLng = savedCoords.lng; }
          else if (profileData._coords) { next.locationLat = profileData._coords.lat; next.locationLng = profileData._coords.lng; }
          if (profileData.churchName !== undefined) next.churchName = profileData.churchName;
          if (profileData.churchLocation !== undefined) next.churchLocation = profileData.churchLocation;
          if (profileData.denomination !== undefined) next.denomination = profileData.denomination;
          if (profileData.yearSaved !== undefined) next.yearSaved = profileData.yearSaved;
          if (profileData.isBaptized !== undefined) next.isBaptized = profileData.isBaptized;
          if (profileData.yearBaptized !== undefined) next.yearBaptized = profileData.yearBaptized;
          if (profileData.favoriteVerse !== undefined) next.favoriteVerse = profileData.favoriteVerse;
          if (profileData.favoriteVerseRef !== undefined) next.favoriteVerseRef = profileData.favoriteVerseRef;
          if (profileData.faithInterests !== undefined) next.faithInterests = profileData.faithInterests;
          return next;
        });
        if (profileData.testimonyContent && userProfile.story?.id && userProfile.supabaseId) {
          await updateTestimony(userProfile.story.id, userProfile.supabaseId, { content: profileData.testimonyContent, lesson: profileData.testimonyLesson });
        }
        updateToSuccess(toastId, 'Profile updated successfully!');
        setShowProfileEdit(false);
        if (profileData.avatarEmoji && profileData.avatarEmoji !== userProfile.avatar) {
          const changes = trackAvatarChange();
          if (changes === 5) unlockSecret('avatar_changed_5x');
        }
        checkProfileSecrets(profileData);
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      updateToError(toastId, errorMessage);
      throw error;
    }
  };

  const handleEditTestimony = async () => {
    if (!userProfile || !userProfile.supabaseId) {
      showError('No user profile found. Please try logging in again.');
      return;
    }
    try {
      const testimony = await getTestimonyByUserId(userProfile.supabaseId);
      if (testimony) { setTestimonyData(testimony); setShowTestimonyEdit(true); }
      else { showError('No testimony found. Please create one first.'); }
    } catch (error) {
      console.error('Error loading testimony:', error);
      showError(error instanceof Error ? error.message : 'Failed to load testimony. Please try again.');
    }
  };

  const handleTestimonySave = async (data: { formData: any; finalContent: string }): Promise<void> => {
    if (!testimonyData || !testimonyData.id) { showError('No testimony found. Please try again.'); return; }
    const toastId = showLoading('Saving your testimony...');
    const { formData, finalContent } = data;
    try {
      if (!userProfile?.supabaseId) { showError('Authentication required'); return; }
      const updated = await updateTestimony(testimonyData.id, userProfile.supabaseId, {
        content: finalContent,
        lesson: formData.lesson,
        question1_answer: formData.question1,
        question2_answer: formData.question2,
        question3_answer: formData.question3,
        question4_answer: formData.question4,
        word_count: finalContent.trim().split(/\s+/).filter(Boolean).length
      });
      if (updated) {
        updateToSuccess(toastId, 'Testimony updated successfully!');
        setShowTestimonyEdit(false);
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      } else { throw new Error('Failed to update testimony'); }
    } catch (error) {
      console.error('Error updating testimony:', error);
      updateToError(toastId, error instanceof Error ? error.message : 'Failed to update testimony. Please try again.');
      throw error;
    }
  };

  const handleTestimonyQuestionnaireComplete = async (testimonyContent: { content: string; answers: TestimonyAnswers; visibility?: 'my_church' | 'all_churches' | 'shareable' }): Promise<void> => {
    setShowTestimonyQuestionnaire(false);
    const toastId = showLoading('Saving your testimony...');
    try {
      const timeSpent = testimonyStartTime ? Date.now() - testimonyStartTime : null;
      checkTestimonySecrets({ content: testimonyContent.content }, timeSpent ?? undefined);
      if (isAuthenticated) {
        let targetUserId = await getExistingSupabaseUserId();
        if (!targetUserId && isSyncing) {
          updateToSuccess(toastId, 'Setting up your profile...');
          const maxWaitTime = 10000;
          const checkInterval = 500;
          const startTime = Date.now();
          while (!targetUserId && Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            targetUserId = await getExistingSupabaseUserId();
          }
        }
        if (!targetUserId && clerkUser) {
          try {
            await ensureSupabaseSession();
            // @ts-ignore
            const syncedUser = await syncUserToSupabase(clerkUser);
            if (syncedUser?.id) { targetUserId = syncedUser.id; window.dispatchEvent(new CustomEvent('profileUpdated')); }
          } catch (syncErr) { console.error('On-demand sync failed:', syncErr); }
        }
        if (!targetUserId) {
          updateToError(toastId, 'Failed to identify user profile. Please refresh and try again.');
          return;
        }
        const profanityResult = checkBeforeSend(testimonyContent.content);
        if (profanityResult.severity === 'high') {
          updateToError(toastId, 'Your testimony contains content that violates community guidelines. Please revise and try again.');
          return;
        }
        const saved = await createTestimony(targetUserId, {
          content: testimonyContent.content,
          question1: testimonyContent.answers.question1,
          question2: testimonyContent.answers.question2,
          question3: testimonyContent.answers.question3,
          question4: testimonyContent.answers.question4,
          lesson: 'My journey taught me that transformation is possible through faith.',
          isPublic: true,
          visibility: testimonyContent.visibility || 'my_church'
        });
        if (saved) {
          updateToSuccess(toastId, 'Testimony saved to your profile!');
          unlockSecret('first_testimony');
          window.dispatchEvent(new CustomEvent('profileUpdated'));
        } else {
          updateToError(toastId, 'Failed to save testimony. Please try again.');
        }
      } else {
        saveGuestTestimony({
          content: testimonyContent.content,
          answers: { question1: testimonyContent.answers.question1, question2: testimonyContent.answers.question2, question3: testimonyContent.answers.question3, question4: testimonyContent.answers.question4 },
          lesson: 'My journey taught me that transformation is possible through faith.',
          visibility: testimonyContent.visibility || 'shareable'
        });
        updateToSuccess(toastId, 'Testimony created!');
        setTimeout(() => { setShowSaveTestimonyModal(true); }, 1500);
      }
    } catch (error) {
      console.error('Error saving testimony:', error);
      updateToError(toastId, error instanceof Error ? error.message : 'Failed to save testimony. Please try again.');
    }
  };

  // ============================================
  // DERIVED STATE
  // ============================================

  const profile = localProfile || userProfile || DEMO_PROFILE;

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AppContextType = {
    nightMode, handleNightModeToggle, themes: THEMES, selectedTheme,
    isLoading, isAuthenticated, isSyncing, userProfile, clerkUser, profile, localProfile, setLocalProfile, userIsAdmin,
    currentTab, setCurrentTab, startChatWith, setStartChatWith, activeServerName, setActiveServerName, activeServerEmoji, setActiveServerEmoji,
    notificationCounts, handleConversationsCountChange,
    privacySettings, notificationSettings, searchRadius, setSearchRadius, handlePrivacyToggle, handleNotificationToggle, handleSaveSearchRadius,
    pushPermission, handleEnablePush, handleDisablePush,
    sortBy, setSortBy, activeDiscoverTab, setActiveDiscoverTab,
    showProfileWizard, setShowProfileWizard, showProfileEdit, setShowProfileEdit, showChangePicture, setShowChangePicture,
    showTestimonyEdit, setShowTestimonyEdit, testimonyData,
    showTestimonyQuestionnaire, setShowTestimonyQuestionnaire, testimonyStartTime, setTestimonyStartTime,
    handleTestimonyQuestionnaireComplete, handleEditTestimony, handleTestimonySave,
    handleProfileComplete, handleSkipProfileWizard, handleProfileEdit,
    showMenu, setShowMenu,
    showLogoutConfirm, setShowLogoutConfirm, showSaveTestimonyModal, setShowSaveTestimonyModal,
    showSecretsMuseum, setShowSecretsMuseum, showBugReport, setShowBugReport,
    showTerms, setShowTerms, showPrivacy, setShowPrivacy, showHelp, setShowHelp,
    showContactSupport, setShowContactSupport, showBlockedUsers, setShowBlockedUsers,
    showReportContent, setShowReportContent, reportData, setReportData,
    showLinkSpotify, setShowLinkSpotify, showAdminDashboard, setShowAdminDashboard,
    signOut,
    handleContinueAsGuest, handleSaveTestimonyModalClose,
    handleLogoClick,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============================================
// HOOK
// ============================================

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
