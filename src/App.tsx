import React, { useState } from 'react';
import { useClerk, useSession } from '@clerk/clerk-react';
import { User, MessageCircle, Users, MapPin, Zap, Plus, X, Edit3, Camera, Lock, Eye, Ban, Flag, Bell, Globe, FileText, Shield, HelpCircle, Phone, Info, LogOut, Music } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from './lib/toast';
import ErrorBoundary, { ComponentErrorBoundary } from './components/ErrorBoundary';
import ProfileTab from './components/ProfileTab';
import MessagesTab from './components/MessagesTab';
import ServersTab from './components/servers/ServersTab';
import NearbyTab from './components/NearbyTab';
import MenuItem from './components/MenuItem';
import ProfileCreationWizard from './components/ProfileCreationWizard';
import ProfileEditDialog from './components/ProfileEditDialog';
import ChangePictureModal from './components/ChangePictureModal';
import EditTestimonyDialog from './components/EditTestimonyDialog';
import ConfirmDialog from './components/ConfirmDialog';
import SaveTestimonyModal from './components/SaveTestimonyModal';
import SecretsMuseum from './components/SecretsMuseum';
import BugReportDialog from './components/BugReportDialog';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import HelpCenter from './components/HelpCenter';
import ContactSupport from './components/ContactSupport';
import BlockedUsers from './components/BlockedUsers';
import ReportContent from './components/ReportContent';
import LinkSpotify from './components/LinkSpotify';
import TestimonyQuestionnaire from './components/TestimonyQuestionnaire';
import { useUserProfile } from './components/useUserProfile';
import { createTestimony, updateUserProfile, updateTestimony, getTestimonyByUserId, syncUserToSupabase, getUserByClerkId } from './lib/database';
import { supabase } from './lib/supabase';
import { GuestModalProvider } from './contexts/GuestModalContext';
import { saveGuestTestimony, getGuestTestimony, clearGuestTestimony } from './lib/guestTestimony';
import { unlockSecret, startTimeBasedSecrets, stopTimeBasedSecrets, checkTestimonySecrets, checkHolidaySecrets, checkProfileSecrets, checkMilestoneSecret, checkActivitySecrets } from './lib/secrets';
import { trackDailyLogin, trackThemeChange, trackNightModeUsage, trackAvatarChange } from './lib/activityTracker';
import { initSentry, setUser as setSentryUser } from './lib/sentry';
import type { UserUpdate } from './types';
import type { TestimonyAnswers } from './lib/api/claude';

function App() {
  const { signOut } = useClerk();
  const { session } = useSession();
  const { isLoading, isAuthenticated, isSyncing, profile: userProfile, user: clerkUser } = useUserProfile();
  const [localProfile, setLocalProfile] = useState<any | null>(null);

  const [currentTab, setCurrentTab] = useState('profile');
  const [showMenu, setShowMenu] = useState(false);
  const [showTestimonyPrompt, setShowTestimonyPrompt] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [activeConnectTab, setActiveConnectTab] = useState('recommended');
  const selectedTheme = localStorage.getItem('lightningTheme') || 'periwinkle';
  const [nightMode, setNightMode] = useState(localStorage.getItem('lightningNightMode') === 'true');
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showTestimonyEdit, setShowTestimonyEdit] = useState(false);
  const [testimonyData, setTestimonyData] = useState<any>(null);
  const [showTestimonyQuestionnaire, setShowTestimonyQuestionnaire] = useState(false);
  const [notificationCounts, setNotificationCounts] = React.useState({
    messages: 0,
    groups: 0,
    connect: 0
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSaveTestimonyModal, setShowSaveTestimonyModal] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [startChatWith, setStartChatWith] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [logoClickTimer, setLogoClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSecretsMuseum, setShowSecretsMuseum] = useState(false);
  const [testimonyStartTime, setTestimonyStartTime] = useState<number | null>(null);
  const [showBugReport, setShowBugReport] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showReportContent, setShowReportContent] = useState(false);
  const [reportData, setReportData] = useState<{ type: 'user' | 'testimony' | 'message' | 'group' | null; content: { id: string; ownerId?: string; name?: string; } | null }>({ type: null, content: null });
  const [showLinkSpotify, setShowLinkSpotify] = useState(false);
  const [showChangePicture, setShowChangePicture] = useState(false);

  // Privacy & Notification Settings
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

  // Sync local profile mirror when hook profile changes (enables optimistic UI updates)
  React.useEffect(() => {
    if (userProfile) {
      setLocalProfile((prev: any) => {
        // If switching users or first load, overwrite; otherwise merge to preserve optimistic fields
        if (!prev || prev.supabaseId !== userProfile.supabaseId) {
          return userProfile;
        }

        // Always update testimony-related fields when they change
        if (prev.hasTestimony !== userProfile.hasTestimony || prev.story?.id !== userProfile.story?.id) {
          return { ...prev, ...userProfile };
        }

        // Only merge if there are actual differences to prevent infinite loops
        const hasChanges = Object.keys(userProfile).some((key: string) =>
          (userProfile as any)[key] !== (prev as any)[key] && !prev.hasOwnProperty(key)
        );
        return hasChanges ? { ...userProfile, ...prev } : prev;
      });
    } else {
      setLocalProfile(null);
    }
  }, [userProfile?.supabaseId, userProfile?.displayName, userProfile?.username, userProfile?.bio, userProfile?.location, userProfile?.avatar, userProfile?.avatarImage, userProfile?.hasTestimony, userProfile?.story?.id]);

  // Force re-render when username changes
  React.useEffect(() => {
    if (userProfile?.username && localProfile?.username !== userProfile.username) {
      setLocalProfile((prev: any) => prev ? { ...prev, username: userProfile.username } : null);
    }
  }, [userProfile?.username, localProfile?.username]);

  // Update settings when user profile loads (ONLY on initial load or user ID change)
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
  }, [userProfile?.supabaseId]); // Only run when user ID changes, not on every profile update

  // Handlers for privacy settings
  const handlePrivacyToggle = async (setting: string, value: boolean | string): Promise<void> => {
    if (!userProfile) return;

    const newSettings = { ...privacySettings, [setting]: value };
    setPrivacySettings(newSettings);

    // Save to database
    try {
      await updateUserProfile(userProfile.supabaseId, { [setting]: value });
      showSuccess('Privacy setting updated');
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      showError('Failed to update setting');
      // Revert on error
      setPrivacySettings(privacySettings);
    }
  };

  // Handlers for notification settings
  const handleNotificationToggle = async (setting: string, value: boolean): Promise<void> => {
    if (!userProfile) return;

    const newSettings = { ...notificationSettings, [setting]: value };
    setNotificationSettings(newSettings);

    // Save to database
    try {
      await updateUserProfile(userProfile.supabaseId, { [setting]: value });
      showSuccess('Notification setting updated');
    } catch (error) {
      console.error('Error updating notification setting:', error);
      showError('Failed to update setting');
      // Revert on error
      setNotificationSettings(notificationSettings);
    }
  };

  // Handler for opening report dialog
  // Handler for saving search radius
  const handleSaveSearchRadius = async (): Promise<void> => {
    if (!userProfile) return;

    // Validate range
    if (searchRadius < 5 || searchRadius > 100) {
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

  // Initialize Sentry error monitoring on app mount
  React.useEffect(() => {
    initSentry();
  }, []);

  // Set Sentry user context when authenticated
  React.useEffect(() => {
    if (isAuthenticated && userProfile) {
      setSentryUser({
        id: userProfile.supabaseId,
        email: userProfile.email,
        username: userProfile.username,
        displayName: userProfile.displayName,
      });
    } else {
      setSentryUser(null);
    }
  }, [isAuthenticated, userProfile]);

  // Start time-based secrets (John 3:16 at 3:16) and check holiday secrets
  React.useEffect(() => {
    startTimeBasedSecrets();
    checkHolidaySecrets(); // Check if today is a special holiday

    // Track daily login and check login streaks
    const streak = trackDailyLogin();
    if (streak === 30) {
      checkMilestoneSecret('daily_login', 30);
    } else if (streak === 100) {
      checkMilestoneSecret('daily_login', 100);
    }

    // Track night mode usage if currently in night mode
    trackNightModeUsage(nightMode);

    // Check activity-based secrets (7-day night mode, etc.)
    checkActivitySecrets();

    return () => stopTimeBasedSecrets();
  }, []);

  // Auto-save guest testimony when user signs up
  React.useEffect(() => {
    let isMounted = true; // Track if component is still mounted

    const autoSaveGuestTestimony = async () => {
      if (!isMounted) return; // Exit early if unmounted

      if (isAuthenticated && userProfile?.supabaseId) {
        const guestTestimony = getGuestTestimony();

        if (guestTestimony) {
          console.log('🎉 User signed up! Auto-saving guest testimony to database...');
          const toastId = showLoading('Saving your testimony...');

          try {
            const saved = await createTestimony(userProfile.supabaseId, {
              content: guestTestimony.content,
              question1: guestTestimony.answers.question1,
              question2: guestTestimony.answers.question2,
              question3: guestTestimony.answers.question3,
              question4: guestTestimony.answers.question4,
              lesson: guestTestimony.lesson || 'My journey taught me that transformation is possible through faith.',
              isPublic: true
            });

            if (!isMounted) return; // Check again before setState

            if (saved) {
              clearGuestTestimony();
              updateToSuccess(toastId, 'Your testimony has been published!');
              console.log('✅ Guest testimony auto-saved and cleared from localStorage');

              // First Testimony Secret
              unlockSecret('first_testimony');

              // Close the save testimony modal if it's open
              if (isMounted) {
                setShowSaveTestimonyModal(false);
              }

              // Dispatch custom event to trigger profile refresh (instead of full page reload)
              if (isMounted) {
                window.dispatchEvent(new CustomEvent('profileUpdated'));
              }
            } else {
              throw new Error('Failed to save testimony');
            }
          } catch (error) {
            console.error('❌ Failed to auto-save guest testimony:', error);
            if (isMounted) {
              updateToError(toastId, 'Testimony saved locally. You can publish it from your profile.');
            }
          }
        }
      }
    };

    autoSaveGuestTestimony();

    return () => {
      isMounted = false; // Cleanup
    };
  }, [isAuthenticated, userProfile?.supabaseId]);

  // Check if profile needs to be completed (first-time users)
  React.useEffect(() => {
    if (isAuthenticated && userProfile && userProfile.supabaseId) {
      // Check if profile is incomplete - prioritize database profile_completed field
      const isProfileIncomplete = !userProfile.profileCompleted &&
        (!userProfile.location ||
          userProfile.bio === 'Welcome to Lightning! Share your testimony to inspire others.');

      // Only show wizard if profile is incomplete and user hasn't completed it in this session
      if (isProfileIncomplete && !profileCompleted) {
        // Small delay to let the app load first
        const timer = setTimeout(() => {
          setShowProfileWizard(true);
        }, 500);
        return () => clearTimeout(timer);
      } else if (userProfile.profileCompleted) {
        // If profile is completed in database, hide wizard and update local state
        setShowProfileWizard(false);
        setProfileCompleted(true);
      }
    }
  }, [isAuthenticated, userProfile, profileCompleted]);

  // Logo click secret handler
  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);

    // Clear existing timer
    if (logoClickTimer) {
      clearTimeout(logoClickTimer);
    }

    // Check if reached 10 clicks
    if (newCount === 10) {
      unlockSecret('logo_10_clicks');
      setLogoClicks(0);
    } else {
      // Reset counter after 2 seconds of no clicks
      const timer = setTimeout(() => {
        setLogoClicks(0);
      }, 2000);
      setLogoClickTimer(timer);
    }
  };

  // Periwinkle Theme - Blue-Purple Glossmorphic Gradient (Reduced 30% for daily use)
  const themes: Record<string, { name: string; lightGradient: string; darkGradient: string; description: string }> = {
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

  // Toggle night mode
  const handleNightModeToggle = () => {
    const newNightMode = !nightMode;
    setNightMode(newNightMode);
    localStorage.setItem('lightningNightMode', newNightMode.toString());

    // Track theme changes
    const changes = trackThemeChange(newNightMode ? 'night' : 'day');
    if (changes === 10) {
      unlockSecret('theme_switcher');
    }

    // Track night mode usage for 7-day streak
    trackNightModeUsage(newNightMode);
  };

  // Use local mirror first, then hook profile, else demo profile for development
  const profile = localProfile || userProfile || {
    username: "king_david",
    displayName: "David",
    avatar: "👑",
    bio: "Shepherd. Warrior. King. A man after God's own heart, saved by His grace.",
    hasTestimony: false,
    music: {
      trackName: "Amazing Grace",
      artist: "Various Artists",
      spotifyUrl: "https://open.spotify.com/track/1AWQoqb9bSvzTjaLralEka",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    story: {
      title: "My Testimony",
      content: "Today, I lead God's people as king over all Israel, called to shepherd a nation and point them toward the heart of the LORD. But my journey here began in darkness I never imagined I'd create.\n\nI was the youngest of eight sons in Bethlehem, overlooked and forgotten—just a shepherd boy tending flocks while my brothers prepared for greatness. When the prophet Samuel came to anoint Israel's next king, no one thought to call me in from the fields. But God saw something in me no one else did. He anointed me that day, and suddenly I was thrust into a world of giant-slaying victories and rising fame. Warrior. Commander. King. Success came fast, and I thought I had it all figured out. But pride was already taking root, and I was becoming careless with the gift God had given me.\n\nThen came the night that shattered everything. I should have been at war with my men, but instead I stood restless on my palace roof. That's when I saw Bathsheba. I knew she was another man's wife. I knew it was wrong. But I was king—who could stop me? One sinful choice led to another, and before I knew it, I'd committed adultery and murdered Uriah, one of my most faithful soldiers, to cover my tracks. For months, I buried the guilt. Then God sent the prophet Nathan, who told me a story about a rich man stealing a poor man's only lamb. Rage burned in my chest until Nathan looked me in the eye and said four words: 'You are that man.' In that moment, the weight of what I'd done crushed me. I fell to my knees with no excuses, crying out, 'I have sinned against the LORD. Create in me a clean heart, O God.' I expected judgment. I deserved destruction. But God showed mercy. He didn't erase the consequences—my family suffered, my son died—but He didn't abandon me. He began the painful, beautiful work of restoration.\n\nNow I lead not as a perfect king, but as a broken man who knows the depths of God's grace. My sin cost me dearly, but God has used my story to show that no one is beyond His reach. I write psalms from the ashes of my worst failures, and my greatest legacy isn't my victories—it's knowing that being 'a man after God's own heart' doesn't mean never falling. It means always returning.",
      lesson: "My life taught me that being 'a man after God's own heart' doesn't mean never falling—it means always returning. When Nathan confronted me, I had a choice: defend myself or confess. Psalm 51:17 became my anthem: 'The sacrifices of God are a broken spirit; a broken and contrite heart, O God, you will not despise.' God doesn't want our perfection; He wants our honesty. I learned that the same God who lifted a shepherd boy to defeat giants is the same God who restores a king who's become the villain. My sin with Bathsheba cost me dearly—my son, my family's peace, my reputation. But God's mercy met me in my mess. He didn't erase the consequences, but He didn't abandon me either. The greatest lesson? Your worst moment doesn't have to be your final chapter. God's grace is sufficient, His mercy is new every morning, and no matter how far you've fallen, genuine repentance opens the door to restoration."
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: nightMode ? themes[selectedTheme].darkGradient : themes[selectedTheme].lightGradient }}>
        <div className="text-center">
          <Zap className="w-16 h-16 text-slate-100 animate-pulse mx-auto mb-4" />
          <p className="text-slate-100 text-xl font-semibold">Loading Lightning...</p>
        </div>
      </div>
    );
  }

  // Old testimony questions array - now using TestimonyQuestionnaire component with Claude AI



  // Old testimony wizard code - replaced by TestimonyQuestionnaire component
  // The handleTestimonyAnswer, nextTestimonyStep, previousTestimonyStep functions
  // are no longer used but kept here for reference
  /*
  const handleTestimonyAnswer = (answer: string): void => {
    setTestimonyAnswers({
      ...testimonyAnswers,
      [testimonyStep]: answer
    });
  };

  const nextTestimonyStep = async () => {
    if (testimonyStep < testimonyQuestions.length - 1) {
      setTestimonyStep(testimonyStep + 1);
    } else {
      setIsGenerating(true);

      try {
        const response = await fetch('/api/generate-testimony', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: profile.displayName,
            question1: testimonyAnswers[0],
            question2: testimonyAnswers[1],
            question3: testimonyAnswers[2],
            question4: testimonyAnswers[3],
            userId: profile.username,
            timestamp: Date.now()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to generate testimony');
        }

        const data = await response.json();
        setGeneratedTestimony(data.testimony);

        // Calculate time spent writing
        const timeSpent = testimonyStartTime ? Date.now() - testimonyStartTime : null;

        // Check testimony secrets (character count, word count, time of day, speed)
        checkTestimonySecrets({
          content: data.testimony
        }, timeSpent ?? undefined);

      } catch (error) {
        console.error('Error:', error);
        showError('Could not connect to AI service. Creating testimony from your answers...');

        const impactOpenings = [
          `Today, I ${testimonyAnswers[3]?.substring(0, 80)}... But this wasn't always my story.`,
          `I'm currently ${testimonyAnswers[3]?.substring(0, 80)}... A few years ago, my life looked completely different.`,
          `God has me ${testimonyAnswers[3]?.substring(0, 80)}... But my journey here began in darkness.`
        ];

        const randomOpening = impactOpenings[Math.floor(Math.random() * impactOpenings.length)];

        const demoTestimony = `${randomOpening}

${testimonyAnswers[0]?.substring(0, 200)}... The weight was crushing me, and I couldn't see a way out.

Then everything changed. ${testimonyAnswers[1]?.substring(0, 150)}... ${testimonyAnswers[2]?.substring(0, 200)}... In that moment, God broke through the darkness and I experienced freedom I never thought possible.

Now I get to ${testimonyAnswers[3]?.substring(0, 150)}... God uses my story to bring hope to others walking through what I once faced. My past pain fuels my present purpose.`;

        setGeneratedTestimony(demoTestimony);

        // Calculate time spent writing
        const timeSpent = testimonyStartTime ? Date.now() - testimonyStartTime : null;

        // Check testimony secrets (character count, word count, time of day, speed)
        checkTestimonySecrets({
          content: demoTestimony
        }, timeSpent ?? undefined);

        // For authenticated users: Save to database immediately
        // For guests: Show save modal (Testimony-First Conversion)
        if (isAuthenticated && userProfile?.supabaseId) {
          console.log('Authenticated user - saving testimony to database');
          const saved = await createTestimony(userProfile.supabaseId, {
            content: demoTestimony,
            question1: testimonyAnswers[0],
            question2: testimonyAnswers[1],
            question3: testimonyAnswers[2],
            question4: testimonyAnswers[3],
            lesson: 'My journey taught me that transformation is possible through faith.',
            isPublic: true
          });

          if (saved) {
            console.log('✅ Testimony saved to database!', saved);
            showSuccess('Testimony saved to your profile!');

            // First Testimony Secret
            unlockSecret('first_testimony');

            // Dispatch custom event to trigger profile refresh
            window.dispatchEvent(new CustomEvent('profileUpdated'));
          } else {
            console.error('❌ Failed to save testimony');
            showError('Failed to save testimony. Please try again.');
          }
        } else {
          // Guest user - save to localStorage and show conversion modal
          console.log('💡 Guest user - saving testimony to localStorage');
          const testimonyData = {
            content: demoTestimony,
            answers: {
              question1: testimonyAnswers[0],
              question2: testimonyAnswers[1],
              question3: testimonyAnswers[2],
              question4: testimonyAnswers[3]
            },
            lesson: 'My journey taught me that transformation is possible through faith.'
          };

          saveGuestTestimony(testimonyData);

          // Show save testimony modal after a brief delay (let them see the testimony first)
          setTimeout(() => {
            setShowSaveTestimonyModal(true);
          }, 1500);
        }
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const previousTestimonyStep = () => {
    if (testimonyStep > 0) {
      setTestimonyStep(testimonyStep - 1);
    }
  };
  */

  const handleProfileComplete = async (profileData: UserUpdate): Promise<void> => {
    if (!userProfile || !userProfile.supabaseId) {
      showError('No user profile found. Please try logging in again.');
      console.error('No user profile or Supabase ID found');
      return;
    }

    const toastId = showLoading('Setting up your profile...');

    try {
      // Update profile in Supabase
      const updated = await updateUserProfile(userProfile.supabaseId, {
        ...profileData,
        profileCompleted: true
      });

      if (updated) {
        console.log('✅ Profile updated successfully!', updated);
        updateToSuccess(toastId, 'Profile setup complete! Welcome to Lightning!');
        setProfileCompleted(true);
        setShowProfileWizard(false);

        // Check profile secrets (completion, bio length)
        checkProfileSecrets({
          ...profileData,
          profileCompleted: true
        });

        // Reload the page to reflect changes
        setTimeout(() => window.location.reload(), 1000);
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
    setProfileCompleted(true); // Don't show again this session
  };

  const handleContinueAsGuest = () => {
    // Close modal and let guest continue browsing with testimony saved
    setShowSaveTestimonyModal(false);
    showSuccess('Testimony saved! Sign up anytime to publish it.');
    console.log('💾 Guest chose to continue without signup - testimony remains in localStorage');
  };

  const handleSaveTestimonyModalClose = () => {
    // Don't allow closing without making a choice (force decision)
    // User must either sign up or click "Continue as Guest"
    console.log('⚠️ User tried to close save testimony modal');
  };

  const handleProfileEdit = async (profileData: any): Promise<void> => {
    if (!userProfile || !userProfile.supabaseId) {
      showError('No user profile found. Please try logging in again.');
      console.error('No user profile or Supabase ID found');
      return;
    }

    const toastId = showLoading('Updating profile...');

    try {
      // Update profile in Supabase
      const updated = await updateUserProfile(userProfile.supabaseId, profileData);

      if (updated) {
        console.log('✅ Profile updated successfully!', updated);

        // Optimistically update local profile so changes reflect immediately
        setLocalProfile((prev: any) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (profileData.displayName !== undefined) next.displayName = profileData.displayName;
          if (profileData.username !== undefined) next.username = profileData.username;
          if (profileData.bio !== undefined) next.bio = profileData.bio;
          if (profileData.location !== undefined) next.location = profileData.location;
          if (profileData.avatar !== undefined) next.avatar = profileData.avatar;
          if (profileData.avatarUrl !== undefined) next.avatarImage = profileData.avatarUrl;
          return next;
        });

        // If testimony was edited, update it separately
        if (profileData.testimonyContent && userProfile.story?.id && userProfile.supabaseId) {
          await updateTestimony(userProfile.story.id, userProfile.supabaseId, {
            content: profileData.testimonyContent,
            lesson: profileData.testimonyLesson
          });
        }

        updateToSuccess(toastId, 'Profile updated successfully!');
        setShowProfileEdit(false);

        // Check if avatar changed
        if (profileData.avatarEmoji && profileData.avatarEmoji !== userProfile.avatar) {
          const changes = trackAvatarChange();
          if (changes === 5) {
            unlockSecret('avatar_changed_5x');
          }
        }

        // Check profile secrets (completion, bio length)
        checkProfileSecrets(profileData);

        // Dispatch custom event to trigger profile refresh
        window.dispatchEvent(new CustomEvent('profileUpdated'));

        // No need to reload page - optimistic updates handle the UI
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
      console.error('No user profile or Supabase ID found');
      return;
    }

    const toastId = showLoading('Loading your testimony...');

    try {
      // Load testimony data from database
      const testimony = await getTestimonyByUserId(userProfile.supabaseId);
      if (testimony) {
        updateToSuccess(toastId, 'Testimony loaded!');
        setTestimonyData(testimony);
        setShowTestimonyEdit(true);
      } else {
        updateToError(toastId, 'No testimony found. Please create one first.');
        console.error('No testimony found for user');
      }
    } catch (error) {
      console.error('Error loading testimony:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load testimony. Please try again.';
      updateToError(toastId, errorMessage);
    }
  };

  const handleTestimonySave = async (formData: any): Promise<void> => {
    if (!testimonyData || !testimonyData.id) {
      showError('No testimony found. Please try again.');
      console.error('No testimony ID found');
      return;
    }

    const toastId = showLoading('Updating your testimony...');

    try {
      // Regenerate testimony content from updated answers
      const impactOpenings = [
        `Today, I ${formData.question4?.substring(0, 80)}... But this wasn't always my story.`,
        `I'm currently ${formData.question4?.substring(0, 80)}... A few years ago, my life looked completely different.`,
        `God has me ${formData.question4?.substring(0, 80)}... But my journey here began in darkness.`
      ];

      const randomOpening = impactOpenings[Math.floor(Math.random() * impactOpenings.length)];

      const updatedContent = `${randomOpening}

${formData.question1?.substring(0, 200)}... The weight was crushing me, and I couldn't see a way out.

Then everything changed. ${formData.question2?.substring(0, 150)}... ${formData.question3?.substring(0, 200)}... In that moment, God broke through the darkness and I experienced freedom I never thought possible.

Now I get to ${formData.question4?.substring(0, 150)}... God uses my story to bring hope to others walking through what I once faced. My past pain fuels my present purpose.`;

      // Update testimony in database
      if (!userProfile?.supabaseId) {
        showError('Authentication required');
        return;
      }

      const updated = await updateTestimony(testimonyData.id, userProfile.supabaseId, {
        content: updatedContent,
        lesson: formData.lesson,
        question1_answer: formData.question1,
        question2_answer: formData.question2,
        question3_answer: formData.question3,
        question4_answer: formData.question4,
        word_count: updatedContent.split(' ').length
      });

      if (updated) {
        console.log('✅ Testimony updated successfully!', updated);
        updateToSuccess(toastId, 'Testimony updated successfully!');
        setShowTestimonyEdit(false);

        // Reload the page to reflect changes
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('Failed to update testimony');
      }
    } catch (error) {
      console.error('Error updating testimony:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update testimony. Please try again.';
      updateToError(toastId, errorMessage);
      throw error;
    }
  };

  const ensureSupabaseSession = async (): Promise<boolean> => {
    if (!session || !supabase) return false;

    try {
      const token = await session.getToken({ template: 'supabase' });
      if (!token) {
        console.warn('Supabase token missing: ensure Clerk template "supabase" is configured');
        return false;
      }

      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: token
      });

      if (error) {
        console.error('Error setting Supabase session:', error);
        return false;
      }

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

  // Handler for AI-powered testimony questionnaire completion
  const handleTestimonyQuestionnaireComplete = async (testimonyData: { content: string; answers: TestimonyAnswers }): Promise<void> => {
    setShowTestimonyQuestionnaire(false);

    const toastId = showLoading('Saving your testimony...');

    try {
      // Calculate time spent
      const timeSpent = testimonyStartTime ? Date.now() - testimonyStartTime : null;

      // Check testimony secrets
      checkTestimonySecrets({
        content: testimonyData.content
      }, timeSpent ?? undefined);

      // For authenticated users: Save to database immediately
      // For guests: Show save modal (Testimony-First Conversion)
      if (isAuthenticated) {
        let targetUserId = await getExistingSupabaseUserId();

        if (!targetUserId && isSyncing) {
          console.log('User sync in progress, waiting...');
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
          console.log('Missing Supabase ID, attempting on-demand sync...');
          try {
            await ensureSupabaseSession();
            // @ts-ignore - Clerk user type mismatch
            const syncedUser = await syncUserToSupabase(clerkUser);
            if (syncedUser?.id) {
              targetUserId = syncedUser.id;
              console.log('On-demand sync successful, ID:', targetUserId);
              // Trigger profile refresh to update UI in background
              window.dispatchEvent(new CustomEvent('profileUpdated'));
            }
          } catch (syncErr) {
            console.error('On-demand sync failed:', syncErr);
          }
        }

        if (!targetUserId) {
          console.error('Cannot save testimony: Missing Supabase ID for user');
          updateToError(toastId, 'Failed to identify user profile. Please refresh and try again.');
          return;
        }
        console.log('Authenticated user - saving AI-generated testimony to database');
        const saved = await createTestimony(targetUserId, {
          content: testimonyData.content,
          question1: testimonyData.answers.question1,
          question2: testimonyData.answers.question2,
          question3: testimonyData.answers.question3,
          question4: testimonyData.answers.question4,
          lesson: 'My journey taught me that transformation is possible through faith.',
          isPublic: true
        });

        if (saved) {
          console.log('✅ AI-generated testimony saved to database!', saved);
          updateToSuccess(toastId, 'Testimony saved to your profile!');

          // First Testimony Secret
          unlockSecret('first_testimony');

          // Dispatch custom event to trigger profile refresh
          window.dispatchEvent(new CustomEvent('profileUpdated'));

          // Force reload to show new testimony
          setTimeout(() => window.location.reload(), 1000);
        } else {
          console.error('❌ Database returned null when saving testimony');
          updateToError(toastId, 'Failed to save testimony. Please try again.');
        }
      } else {
        // Guest user - save to localStorage and show conversion modal
        console.log('💡 Guest user - saving AI-generated testimony to localStorage');
        const guestTestimonyData = {
          content: testimonyData.content,
          answers: {
            question1: testimonyData.answers.question1,
            question2: testimonyData.answers.question2,
            question3: testimonyData.answers.question3,
            question4: testimonyData.answers.question4
          },
          lesson: 'My journey taught me that transformation is possible through faith.'
        };

        saveGuestTestimony(guestTestimonyData);
        updateToSuccess(toastId, 'Testimony created!');

        // Show save testimony modal after a brief delay
        setTimeout(() => {
          setShowSaveTestimonyModal(true);
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving testimony:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save testimony. Please try again.';
      updateToError(toastId, errorMessage);
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'messages':
        return (
          <ComponentErrorBoundary name="Messages" nightMode={nightMode}>
            <MessagesTab
              nightMode={nightMode}
              onConversationsCountChange={(count) =>
                setNotificationCounts((prev) => ({ ...prev, messages: count }))
              }
              startChatWith={startChatWith}
            />
          </ComponentErrorBoundary>
        );
      case 'groups':
        return (
          <ComponentErrorBoundary name="Servers" nightMode={nightMode}>
            <ServersTab nightMode={nightMode} />
          </ComponentErrorBoundary>
        );
      case 'connect':
        return (
          <ComponentErrorBoundary name="Connect" nightMode={nightMode}>
            <NearbyTab
              sortBy={sortBy}
              setSortBy={setSortBy}
              activeConnectTab={activeConnectTab}
              setActiveConnectTab={setActiveConnectTab}
              nightMode={nightMode}
              onNavigateToMessages={(user: any) => {
                setStartChatWith({ id: String(user.id), name: user.displayName || user.username || 'User', avatar: user.avatar || user.avatar_emoji || '👤' });
                setCurrentTab('messages');
              }}
            />
          </ComponentErrorBoundary>
        );
      case 'profile':
        return (
          <ComponentErrorBoundary name="Profile" nightMode={nightMode}>
            <ProfileTab profile={profile} nightMode={nightMode} currentUserProfile={profile} onAddTestimony={() => {
              setShowTestimonyQuestionnaire(true);
              setTestimonyStartTime(Date.now());
            }} onEditTestimony={handleEditTestimony} />
          </ComponentErrorBoundary>
        );
      default:
        return (
          <ComponentErrorBoundary name="Profile" nightMode={nightMode}>
            <ProfileTab profile={profile} nightMode={nightMode} currentUserProfile={profile} onAddTestimony={() => {
              setShowTestimonyQuestionnaire(true);
              setTestimonyStartTime(Date.now());
            }} onEditTestimony={handleEditTestimony} />
          </ComponentErrorBoundary>
        );
    }
  };

  return (
    <ErrorBoundary
      nightMode={nightMode}
      showDetails={process.env.NODE_ENV === 'development'}
      message="Something went wrong in the Lightning app. Please refresh to try again."
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
      }}
    >
      <GuestModalProvider nightMode={nightMode}>
        <div className="min-h-screen pb-12 relative">
          {/* Toast Notifications */}
          <Toaster />

          {/* Full-Screen Periwinkle Glossmorphic Gradient Background */}
          <div
            className="fixed inset-0"
            style={{
              background: nightMode ? themes[selectedTheme].darkGradient : themes[selectedTheme].lightGradient
            }}
          />

          {/* Floating Logo/Menu Header */}
          {!nightMode && (
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20">
              <div className="px-5 py-3">
                <div className="flex items-center justify-between">
                  {currentTab === 'profile' && (
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={handleLogoClick}
                      title="Click me 10 times quickly..."
                    >
                      <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" style={{ filter: 'brightness(0)' }} />
                      <span className="font-semibold text-black">Lightning</span>
                    </div>
                  )}

                  {currentTab === 'messages' && (
                    <div className="font-semibold text-black text-xl">Messages</div>
                  )}
                  {currentTab === 'groups' && (
                    <div className="font-semibold text-black text-xl">Servers</div>
                  )}
                  {currentTab === 'connect' && (
                    <div className="font-semibold text-black text-xl">Connect</div>
                  )}

                  {currentTab === 'connect' && (
                    <button
                      onClick={() => setShowMenu(true)}
                      className="w-8 h-8 flex items-center justify-center bg-white/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/40 transition-colors shadow-sm"
                      aria-label="Open settings menu"
                    >
                      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Night Mode Header */}
          {nightMode && (
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/10 border-b border-white/10">
              <div className="px-5 py-3">
                <div className="flex items-center justify-between">
                  {currentTab === 'profile' && (
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={handleLogoClick}
                      title="Click me 10 times quickly..."
                    >
                      <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold text-white">Lightning</span>
                    </div>
                  )}

                  {currentTab === 'messages' && (
                    <div className="font-semibold text-slate-100 text-xl">Messages</div>
                  )}
                  {currentTab === 'groups' && (
                    <div className="font-semibold text-slate-100 text-xl">Servers</div>
                  )}
                  {currentTab === 'connect' && (
                    <div className="font-semibold text-slate-100 text-xl">Connect</div>
                  )}

                  {currentTab === 'connect' && (
                    <button
                      onClick={() => setShowMenu(true)}
                      className="w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full border border-white/10 hover:bg-white/20 transition-colors shadow-sm"
                      aria-label="Open settings menu"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto px-4 relative z-10">
            {renderContent()}
          </div>

          {/* Settings Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
                onClick={() => setShowMenu(false)}
              />
              <div className={`fixed inset-y-0 left-0 w-80 ${nightMode ? 'bg-[#0a0a0a]' : 'bg-slate-50'} z-50 shadow-2xl animate-in slide-in-from-left duration-300`}>
                <div className="flex flex-col h-full">
                  <div className="sticky top-0 z-10 px-4 pt-6 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className={`text-xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'}`}>Settings</h2>
                        <p className={`text-sm ${nightMode ? 'text-white/80' : 'text-black/80'}`}>@{profile.username}</p>
                      </div>
                      <button
                        onClick={() => setShowMenu(false)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-100' : 'bg-black/5 hover:bg-black/10 text-black'}`}
                        aria-label="Close settings menu"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                      <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                        <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>Account</h3>
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileEdit(true);
                          setShowMenu(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center justify-between transition-colors border-b ${nightMode ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-50 border-slate-100'}`}
                        aria-label="Edit your profile"
                      >
                        <div className="flex items-center gap-3">
                          <Edit3 className={`w-5 h-5 ${nightMode ? 'text-slate-100' : 'text-slate-600'}`} />
                          <div className="text-left">
                            <p className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>Edit Profile</p>
                          </div>
                        </div>
                      </button>
                      <MenuItem
                        icon={Camera}
                        label="Change Profile Picture"
                        nightMode={nightMode}
                        onClick={() => {
                          setShowMenu(false);
                          setShowChangePicture(true);
                        }}
                      />
                      <MenuItem
                        icon={Music}
                        label="Profile Song"
                        nightMode={nightMode}
                        subtext={userProfile?.spotifyUrl ? 'Linked' : 'Add a YouTube song'}
                        onClick={() => setShowLinkSpotify(true)}
                      />
                      {/* Email & Password removed - using Google OAuth only per roadmap */}
                    </div>

                    <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                      <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                        <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>Privacy & Safety</h3>
                      </div>
                      <MenuItem
                        icon={Lock}
                        label="Make Profile Private"
                        toggle
                        nightMode={nightMode}
                        isOn={privacySettings.isPrivate}
                        onToggle={(value) => handlePrivacyToggle('isPrivate', value)}
                      />
                      <MenuItem
                        icon={Eye}
                        label="Who Can See Testimony"
                        nightMode={nightMode}
                        dropdown
                        dropdownOptions={[
                          { value: 'everyone', label: 'Everyone' },
                          { value: 'friends', label: 'Friends Only' },
                          { value: 'private', label: 'Just Me' }
                        ]}
                        selectedValue={privacySettings.testimonyVisibility}
                        onDropdownChange={(value) => handlePrivacyToggle('testimonyVisibility', value)}
                      />
                      <MenuItem
                        icon={MessageCircle}
                        label="Who Can Message You"
                        nightMode={nightMode}
                        dropdown
                        dropdownOptions={[
                          { value: 'everyone', label: 'Everyone' },
                          { value: 'friends', label: 'Friends Only' },
                          { value: 'none', label: 'No One' }
                        ]}
                        selectedValue={privacySettings.messagePrivacy}
                        onDropdownChange={(value) => handlePrivacyToggle('messagePrivacy', value)}
                      />
                      <MenuItem
                        icon={Ban}
                        label="Blocked Users"
                        nightMode={nightMode}
                        onClick={() => setShowBlockedUsers(true)}
                      />
                      <MenuItem
                        icon={Flag}
                        label="Report Content"
                        nightMode={nightMode}
                        subtext="Report users, messages, or inappropriate content"
                        onClick={() => {
                          // Open a simple info dialog explaining how to report
                          alert('To report content:\n\n• Tap the 3-dot menu on any profile, testimony, message, or group\n• Select "Report"\n• Choose a reason and submit\n\nOur team reviews all reports within 24-48 hours.');
                        }}
                      />
                    </div>

                    <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                      <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                        <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>Notifications</h3>
                      </div>
                      <MenuItem
                        icon={Bell}
                        label="Message Notifications"
                        toggle
                        nightMode={nightMode}
                        isOn={notificationSettings.notifyMessages}
                        onToggle={(value) => handleNotificationToggle('notifyMessages', value)}
                      />
                      <MenuItem
                        icon={Users}
                        label="Connection Requests"
                        toggle
                        nightMode={nightMode}
                        isOn={notificationSettings.notifyFriendRequests}
                        onToggle={(value) => handleNotificationToggle('notifyFriendRequests', value)}
                      />
                      <MenuItem
                        icon={MapPin}
                        label="Nearby Users"
                        toggle
                        nightMode={nightMode}
                        isOn={notificationSettings.notifyNearby}
                        onToggle={(value) => handleNotificationToggle('notifyNearby', value)}
                      />
                    </div>

                    <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                      <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                        <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>Preferences</h3>
                      </div>

                      {/* Night Mode Toggle */}
                      <div className={`px-4 py-3 border-b ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className={`w-4 h-4 ${nightMode ? 'text-slate-100' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                            <div>
                              <span className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>Night Mode</span>
                              <p className={`text-xs ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>Dark theme for comfortable viewing</p>
                            </div>
                          </div>
                          <button
                            onClick={handleNightModeToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${nightMode ? 'bg-blue-600' : 'bg-slate-300'
                              }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${nightMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Search Radius Input */}
                      <div className={`px-4 py-4 border-b transition-colors ${nightMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <MapPin className={`w-5 h-5 ${nightMode ? 'text-slate-100' : 'text-slate-400'}`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                              Search Radius
                            </p>
                            <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              5-100 miles
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={searchRadius}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setSearchRadius(0); // Allow clearing
                              } else {
                                setSearchRadius(parseInt(val));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveSearchRadius();
                              }
                            }}
                            className={`flex-1 px-4 py-2 rounded-lg border text-center ${nightMode
                              ? 'bg-white/5 border-white/10 text-slate-100 placeholder-slate-500'
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="25"
                          />
                          <button
                            onClick={handleSaveSearchRadius}
                            className={`flex-shrink-0 p-2 rounded-lg border transition-all ${nightMode
                              ? 'border-blue-500/30 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10'
                              : 'border-blue-500/40 text-blue-600 hover:border-blue-500/60 hover:bg-blue-500/10'
                              }`}
                            style={nightMode ? {
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                              boxShadow: '0 1px 4px rgba(59, 130, 246, 0.2), inset 0 0.5px 0 rgba(59, 130, 246, 0.2)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)'
                            } : {
                              background: 'rgba(59, 130, 246, 0.1)',
                              backdropFilter: 'blur(30px)',
                              WebkitBackdropFilter: 'blur(30px)',
                              boxShadow: '0 1px 4px rgba(59, 130, 246, 0.15), inset 0 0.5px 1px rgba(59, 130, 246, 0.3)'
                            }}
                            title="Save search radius"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <MenuItem icon={Globe} label="Language" subtext="English" nightMode={nightMode} comingSoon />
                    </div>

                    <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                      <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                        <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>About & Support</h3>
                      </div>
                      <MenuItem
                        icon={FileText}
                        label="Terms of Service"
                        nightMode={nightMode}
                        onClick={() => {
                          setShowMenu(false);
                          setShowTerms(true);
                        }}
                      />
                      <MenuItem
                        icon={Shield}
                        label="Privacy Policy"
                        nightMode={nightMode}
                        onClick={() => {
                          setShowMenu(false);
                          setShowPrivacy(true);
                        }}
                      />
                      <MenuItem
                        icon={HelpCircle}
                        label="Help Center"
                        nightMode={nightMode}
                        onClick={() => {
                          setShowMenu(false);
                          setShowHelp(true);
                        }}
                      />
                      <MenuItem
                        icon={Phone}
                        label="Contact Support"
                        nightMode={nightMode}
                        onClick={() => {
                          setShowMenu(false);
                          setShowContactSupport(true);
                        }}
                      />
                      <MenuItem icon={Flag} label="Report a Bug" nightMode={nightMode} onClick={() => setShowBugReport(true)} />
                      <MenuItem icon={Info} label="App Version" subtext="1.0.0" nightMode={nightMode} />
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className={`w-full px-4 py-3 flex items-center justify-between transition-colors border-t ${nightMode ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-50 border-slate-100'}`}
                        aria-label="Sign out of your account"
                      >
                        <div className="flex items-center gap-3">
                          <LogOut className={`w-5 h-5 text-red-500`} />
                          <div className="text-left">
                            <p className={`text-sm font-medium text-red-600`}>Sign Out</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

          {/* Bottom Navigation - Glossmorphic */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-40 border-t ${nightMode ? 'border-white/10' : 'border-white/15'}`}
            style={nightMode ? {
              background: 'rgba(10, 10, 10, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)'
            } : {
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
            }}
          >
            <div className="max-w-3xl mx-auto px-2 flex justify-around items-center h-14">
              <button
                onClick={() => setCurrentTab('profile')}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all border ${currentTab === 'profile' ? nightMode ? 'text-slate-100 border-white/20' : 'text-slate-100 border-white/30' : nightMode ? 'text-white/40 border-transparent hover:bg-white/5' : 'text-black/40 border-transparent hover:bg-white/10'}`}
                style={currentTab === 'profile' ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
                aria-label="Profile"
              >
                <User className="w-5 h-5" />
                <span className="text-[10px] font-medium">Profile</span>
              </button>
              <button
                onClick={() => setCurrentTab('messages')}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all border ${currentTab === 'messages' ? nightMode ? 'text-slate-100 border-white/20' : 'text-slate-100 border-white/30' : nightMode ? 'text-white/40 border-transparent hover:bg-white/5' : 'text-black/40 border-transparent hover:bg-white/10'}`}
                style={currentTab === 'messages' ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
                aria-label={`Messages${notificationCounts.messages > 0 ? ` (${notificationCounts.messages} unread)` : ''}`}
              >
                <div className="relative">
                  <MessageCircle className="w-5 h-5" />
                  {notificationCounts.messages > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white/20">
                      <span className="text-[9px] font-bold text-white">{notificationCounts.messages}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium">Messages</span>
              </button>
              <button
                onClick={() => setCurrentTab('groups')}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all border ${currentTab === 'groups' ? nightMode ? 'text-slate-100 border-white/20' : 'text-slate-100 border-white/30' : nightMode ? 'text-white/40 border-transparent hover:bg-white/5' : 'text-black/40 border-transparent hover:bg-white/10'}`}
                style={currentTab === 'groups' ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
                aria-label={`Groups${notificationCounts.groups > 0 ? ` (${notificationCounts.groups} unread)` : ''}`}
              >
                <div className="relative">
                  <Users className="w-5 h-5" />
                  {notificationCounts.groups > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white/20">
                      <span className="text-[9px] font-bold text-white">{notificationCounts.groups}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium">Servers</span>
              </button>
              <button
                onClick={() => setCurrentTab('connect')}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all border ${currentTab === 'connect' ? nightMode ? 'text-slate-100 border-white/20' : 'text-slate-100 border-white/30' : nightMode ? 'text-white/40 border-transparent hover:bg-white/5' : 'text-black/40 border-transparent hover:bg-white/10'}`}
                style={currentTab === 'connect' ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
                aria-label={`Connect${notificationCounts.connect > 0 ? ` (${notificationCounts.connect} new)` : ''}`}
              >
                <div className="relative">
                  <MapPin className="w-5 h-5" />
                  {notificationCounts.connect > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white/20">
                      <span className="text-[9px] font-bold text-white">{notificationCounts.connect}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium">Connect</span>
              </button>
            </div>
          </div>

          {/* Testimony Animation Styles */}
          <style>{`
        @keyframes popOut {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

          {/* Testimony Prompt Button */}
          {!profile.hasTestimony && !showTestimonyPrompt && (
            <button
              onClick={() => {
                setShowTestimonyPrompt(true);
                setTestimonyStartTime(Date.now());
              }}
              className="fixed bottom-20 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 z-40 text-slate-100 border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                boxShadow: nightMode
                  ? '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : '0 8px 24px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)';
                e.currentTarget.style.boxShadow = nightMode
                  ? '0 12px 32px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                  : '0 12px 32px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)';
                e.currentTarget.style.boxShadow = nightMode
                  ? '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : '0 8px 24px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
              }}
            >
              <Plus className="w-7 h-7 text-white" />
            </button>
          )}

          {/* OLD Testimony Creation Modal - REPLACED BY TestimonyQuestionnaire Component 
          {showTestimonyPrompt && (
            <>
              <div
                className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
                onClick={() => {
                  setShowTestimonyPrompt(false);
                  setTestimonyStep(0);
                  setTestimonyAnswers({});
                }}
              />
              <div
                className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col ${nightMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}
                style={{
                  animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transformOrigin: 'bottom right'
                }}
              >
                <div className={`p-6 ${nightMode ? '' : ''}`} style={{ background: nightMode ? 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)' : themes[selectedTheme].lightGradient }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-white" />
                      <h2 className="text-xl font-bold text-white">Share Your Story</h2>
                    </div>
                    <button
                      onClick={() => {
                        setShowTestimonyPrompt(false);
                        setTestimonyStep(0);
                        setTestimonyAnswers({});
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <p className="text-sm mt-2 text-white/90">Sharing the power of testimonies</p>

                  <div className="flex gap-1 mt-4">
                    {testimonyQuestions.map((_, index) => (
                      <div
                        key={index}
                        className={`flex-1 h-1 rounded-full transition-all ${index <= testimonyStep ? 'bg-white' : 'bg-white/30'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {!generatedTestimony ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className={`text-lg font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          Question {testimonyStep + 1} of {testimonyQuestions.length}
                        </h3>
                        <p className={`font-medium mb-1 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                          {testimonyQuestions[testimonyStep].question}
                        </p>
                        <p className={`text-xs italic ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
                          💡 {testimonyQuestions[testimonyStep].hint}
                        </p>
                      </div>

                      <textarea
                        key={testimonyStep}
                        value={testimonyAnswers[testimonyStep] || ''}
                        onChange={(e) => handleTestimonyAnswer(e.target.value)}
                        placeholder={testimonyQuestions[testimonyStep].placeholder}
                        className={`w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm ${nightMode
                          ? 'bg-white/5 border-white/10 text-slate-100 placeholder-gray-400'
                          : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600 mb-4">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">Your Testimony is Ready!</h3>
                      </div>
                      <div className={`rounded-lg p-6 border-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'}`}>
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>{generatedTestimony}</p>
                      </div>
                      <p className={`text-xs italic ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>You can edit this testimony in your profile settings.</p>
                    </div>
                  )}
                </div>

                {!generatedTestimony ? (
                  <div className={`p-6 border-t flex gap-3 ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
                    {testimonyStep > 0 && (
                      <button
                        onClick={previousTestimonyStep}
                        disabled={isGenerating}
                        className={`px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 ${nightMode
                          ? 'bg-white/5 hover:bg-white/10 text-slate-100'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}
                    <button
                      onClick={nextTestimonyStep}
                      disabled={!testimonyAnswers[testimonyStep]?.trim() || isGenerating}
                      className={`flex-1 px-5 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${testimonyAnswers[testimonyStep]?.trim() && !isGenerating
                        ? nightMode
                          ? 'text-slate-100 border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400'
                          : 'text-white border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400'
                        : nightMode
                          ? 'bg-white/5 text-slate-100/60 cursor-not-allowed border-white/10'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed border-slate-300'
                        }`}
                      style={testimonyAnswers[testimonyStep]?.trim() && !isGenerating ? {
                        background: nightMode ? 'rgba(59, 130, 246, 0.95)' : 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
                        boxShadow: nightMode
                          ? '0 6px 18px rgba(59, 130, 246, 0.35)'
                          : '0 6px 18px rgba(59, 130, 246, 0.35)',
                        transform: 'translateY(0)'
                      } : {}}
                      onMouseEnter={(e) => {
                        if (testimonyAnswers[testimonyStep]?.trim() && !isGenerating) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (testimonyAnswers[testimonyStep]?.trim() && !isGenerating) {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                      aria-label="Next"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : testimonyStep === testimonyQuestions.length - 1 ? (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Story
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className={`p-6 border-t flex gap-3 ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <button
                      onClick={() => {
                        setShowTestimonyPrompt(false);
                        setTestimonyStep(0);
                        setTestimonyAnswers({});
                        setGeneratedTestimony(null);
                      }}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors text-slate-100 border ${nightMode ? 'border-white/20' : 'border-white/30'}`}
                      style={{
                        background: nightMode ? 'rgba(79, 150, 255, 0.85)' : themes[selectedTheme].lightGradient,
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)'
                      }}
                      onMouseEnter={(e) => {
                        if (nightMode) {
                          e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (nightMode) {
                          e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                        }
                      }}
                    >
                      Save to Profile
                    </button>
                  </div>
                )}
              </div>
            </>
          )} */}


          {/* Profile Creation Wizard */}
          {showProfileWizard && (
            <ProfileCreationWizard
              nightMode={nightMode}
              onComplete={handleProfileComplete}
              onSkip={handleSkipProfileWizard}
            />
          )}

          {/* Profile Edit Dialog */}
          {showProfileEdit && (
            <ProfileEditDialog
              profile={profile}
              nightMode={nightMode}
              onSave={handleProfileEdit}
              onClose={() => setShowProfileEdit(false)}
            />
          )}

          {/* Change Picture Modal */}
          {showChangePicture && (
            <ChangePictureModal
              isOpen={showChangePicture}
              onClose={() => setShowChangePicture(false)}
              nightMode={nightMode}
              currentAvatar={profile.avatar || '👤'}
              currentAvatarUrl={profile.avatarImage || null}
              onSave={async (avatarUrl, avatar) => {
                if (!userProfile || !userProfile.supabaseId) {
                  throw new Error('No user profile found');
                }

                const toastId = showLoading('Updating profile picture...');

                try {
                  const updated = await updateUserProfile(userProfile.supabaseId, {
                    avatar: avatar,
                    avatarUrl: avatarUrl
                  });

                  if (updated) {
                    // Update local profile
                    setLocalProfile((prev: any) => {
                      if (!prev) return prev;
                      const next = { ...prev };
                      next.avatar = avatar;
                      next.avatarImage = avatarUrl;
                      return next;
                    });

                    // Track avatar change for secrets
                    if (avatar !== userProfile.avatar) {
                      const changes = trackAvatarChange();
                      if (changes === 5) {
                        unlockSecret('avatar_changed_5x');
                      }
                    }

                    updateToSuccess(toastId, 'Profile picture updated!');
                    window.dispatchEvent(new CustomEvent('profileUpdated'));
                  } else {
                    throw new Error('Failed to update profile picture');
                  }
                } catch (error) {
                  console.error('Error updating profile picture:', error);
                  updateToError(toastId, error instanceof Error ? error.message : 'Failed to update profile picture');
                  throw error;
                }
              }}
            />
          )}

          {/* Edit Testimony Dialog */}
          {showTestimonyEdit && testimonyData && (
            <EditTestimonyDialog
              testimony={testimonyData}
              nightMode={nightMode}
              onSave={handleTestimonySave}
              onClose={() => setShowTestimonyEdit(false)}
            />
          )}

          {/* Logout Confirmation Dialog */}
          <ConfirmDialog
            isOpen={showLogoutConfirm}
            onClose={() => setShowLogoutConfirm(false)}
            onConfirm={signOut}
            title="Sign Out"
            message="Are you sure you want to sign out? You'll need to sign in again to access your account."
            confirmText="Sign Out"
            cancelText="Cancel"
            variant="danger"
            nightMode={nightMode}
          />

          {/* Save Testimony Modal (Testimony-First Conversion) */}
          <SaveTestimonyModal
            isOpen={showSaveTestimonyModal}
            onClose={handleSaveTestimonyModalClose}
            onContinueAsGuest={handleContinueAsGuest}
            nightMode={nightMode}
            testimonyPreview={''}
          />

          {/* Secret Museum */}
          <SecretsMuseum
            isOpen={showSecretsMuseum}
            onClose={() => setShowSecretsMuseum(false)}
            nightMode={nightMode}
          />

          {/* Bug Report Dialog */}
          {showBugReport && (
            <BugReportDialog
              onClose={() => setShowBugReport(false)}
              nightMode={nightMode}
              currentTab={currentTab}
              userProfile={userProfile}
            />
          )}

          {/* Terms of Service Dialog */}
          <TermsOfService
            isOpen={showTerms}
            onClose={() => setShowTerms(false)}
            nightMode={nightMode}
          />

          {/* Privacy Policy Dialog */}
          <PrivacyPolicy
            isOpen={showPrivacy}
            onClose={() => setShowPrivacy(false)}
            nightMode={nightMode}
          />

          {/* Help Center Dialog */}
          <HelpCenter
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
            nightMode={nightMode}
            onContactSupport={() => setShowContactSupport(true)}
          />

          {/* Contact Support Dialog */}
          <ContactSupport
            isOpen={showContactSupport}
            onClose={() => setShowContactSupport(false)}
            nightMode={nightMode}
            userProfile={userProfile}
          />

          {/* Blocked Users Dialog */}
          <BlockedUsers
            isOpen={showBlockedUsers}
            onClose={() => setShowBlockedUsers(false)}
            nightMode={nightMode}
            userProfile={userProfile}
          />

          {/* Report Content Dialog */}
          <ReportContent
            isOpen={showReportContent}
            onClose={() => {
              setShowReportContent(false);
              setReportData({ type: null, content: null });
            }}
            nightMode={nightMode}
            userProfile={userProfile}
            reportType={reportData.type || 'user'}
            reportedContent={reportData.content || { id: '' }}
          />

          {/* Link Spotify Dialog */}
          <LinkSpotify
            isOpen={showLinkSpotify}
            onClose={() => setShowLinkSpotify(false)}
            nightMode={nightMode}
            userProfile={userProfile}
          />

          {/* AI-Powered Testimony Questionnaire */}
          {showTestimonyQuestionnaire && (
            <TestimonyQuestionnaire
              nightMode={nightMode}
              userName={profile.displayName}
              userAge={undefined}
              onComplete={handleTestimonyQuestionnaireComplete}
              onCancel={() => setShowTestimonyQuestionnaire(false)}
            />
          )}
        </div>
      </GuestModalProvider>
    </ErrorBoundary>
  );
}

export default App;

