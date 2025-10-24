import React, { useState } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { User, MessageCircle, Users, MapPin, Zap, Plus, X, ArrowRight, ArrowLeft, Sparkles, Edit3, Camera, Mail, Lock, Eye, Ban, Flag, Bell, Globe, Palette, FileText, Shield, HelpCircle, Phone, Info, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from './lib/toast';
import ProfileTab from './components/ProfileTab';
import MessagesTab from './components/MessagesTab';
import GroupsTab from './components/GroupsTab';
import NearbyTab from './components/NearbyTab';
import MenuItem from './components/MenuItem';
import ProfileCreationWizard from './components/ProfileCreationWizard';
import ProfileEditDialog from './components/ProfileEditDialog';
import EditTestimonyDialog from './components/EditTestimonyDialog';
import ConfirmDialog from './components/ConfirmDialog';
import SaveTestimonyModal from './components/SaveTestimonyModal';
import { useUserProfile } from './components/useUserProfile';
import { createTestimony, updateUserProfile, updateTestimony, getTestimonyByUserId } from './lib/database';
import { GuestModalProvider } from './contexts/GuestModalContext';
import { saveGuestTestimony, getGuestTestimony, clearGuestTestimony } from './lib/guestTestimony';

function App() {
  const { signOut } = useClerk();
  const { isLoading, isAuthenticated, profile: userProfile } = useUserProfile();

  const [currentTab, setCurrentTab] = useState('profile');
  const [showMenu, setShowMenu] = useState(false);
  const [showTestimonyPrompt, setShowTestimonyPrompt] = useState(false);
  const [testimonyStep, setTestimonyStep] = useState(0);
  const [testimonyAnswers, setTestimonyAnswers] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTestimony, setGeneratedTestimony] = useState(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [activeConnectTab, setActiveConnectTab] = useState('recommended');
  const [selectedTheme, setSelectedTheme] = useState(localStorage.getItem('lightningTheme') || 'periwinkle');
  const [nightMode, setNightMode] = useState(localStorage.getItem('lightningNightMode') === 'true');
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showTestimonyEdit, setShowTestimonyEdit] = useState(false);
  const [testimonyData, setTestimonyData] = useState(null);
  const [notificationCounts, setNotificationCounts] = useState({
    messages: 3,
    groups: 2,
    connect: 1
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSaveTestimonyModal, setShowSaveTestimonyModal] = useState(false);

  // Network status detection
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showSuccess('Back online!');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showError('No internet connection. Some features may not work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periwinkle Theme - Blue-Purple Glossmorphic Gradient (Reduced 30% for daily use)
  const themes = {
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

  // Save theme preference
  const handleThemeChange = (themeKey) => {
    setSelectedTheme(themeKey);
    localStorage.setItem('lightningTheme', themeKey);
  };

  // Toggle night mode
  const handleNightModeToggle = () => {
    const newNightMode = !nightMode;
    setNightMode(newNightMode);
    localStorage.setItem('lightningNightMode', newNightMode.toString());
  };

  // Use authenticated user profile, or fallback to demo profile for development
  const profile = userProfile || {
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

  const testimonyQuestions = [
    {
      id: 1,
      question: "How was your life like before you were saved?",
      placeholder: "Describe your background growing up or if you were always saved...",
      hint: "As in what was your background growing up or were you always saved?"
    },
    {
      id: 2,
      question: "What led you to salvation or your own personal relationship with God?",
      placeholder: "Share what drew you to a relationship with God...",
      hint: "This could be a person, event, realization, or series of circumstances"
    },
    {
      id: 3,
      question: "Was there a specific moment where you encountered God or a special situation that was the turning point to your relationship with God?",
      placeholder: "Describe this experience in detail...",
      hint: "If so, please describe this specific experience in detail"
    },
    {
      id: 4,
      question: "What do you do now and what do you believe is your current mission or calling from God in your current place now?",
      placeholder: "Share your current calling, ministry, or mission...",
      hint: "Tell us about what you do now such as your current job position, ministry, or role"
    }
  ];

  // Auto-save guest testimony when user signs up
  React.useEffect(() => {
    const autoSaveGuestTestimony = async () => {
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

            if (saved) {
              clearGuestTestimony();
              updateToSuccess(toastId, 'Your testimony has been published!');
              console.log('✅ Guest testimony auto-saved and cleared from localStorage');

              // Close the save testimony modal if it's open
              setShowSaveTestimonyModal(false);

              // Reload to show the testimony on profile
              setTimeout(() => window.location.reload(), 1500);
            } else {
              throw new Error('Failed to save testimony');
            }
          } catch (error) {
            console.error('❌ Failed to auto-save guest testimony:', error);
            updateToError(toastId, 'Testimony saved locally. You can publish it from your profile.');
          }
        }
      }
    };

    autoSaveGuestTestimony();
  }, [isAuthenticated, userProfile?.supabaseId]);

  // Check if profile needs to be completed (first-time users)
  React.useEffect(() => {
    if (isAuthenticated && userProfile && userProfile.supabaseId) {
      // Check if profile is incomplete (no custom bio or location)
      const isProfileIncomplete = !userProfile.location ||
                                   userProfile.bio === 'Welcome to Lightning! Share your testimony to inspire others.';

      // Only show wizard if profile is incomplete and user hasn't completed it in this session
      if (isProfileIncomplete && !profileCompleted) {
        // Small delay to let the app load first
        const timer = setTimeout(() => {
          setShowProfileWizard(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, userProfile, profileCompleted]);


  const handleTestimonyAnswer = (answer) => {
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

        // For authenticated users: Save to database immediately
        // For guests: Show save modal (Testimony-First Conversion)
        if (isAuthenticated && profile?.supabaseId) {
          console.log('Authenticated user - saving testimony to database');
          const saved = await createTestimony(profile.supabaseId, {
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

  const handleProfileComplete = async (profileData) => {
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

        // Reload the page to reflect changes
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      updateToError(toastId, error.message || 'Failed to setup profile. Please try again.');
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

  const handleProfileEdit = async (profileData) => {
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
        updateToSuccess(toastId, 'Profile updated successfully!');
        setShowProfileEdit(false);

        // Reload the page to reflect changes
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      updateToError(toastId, error.message || 'Failed to update profile. Please try again.');
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
      updateToError(toastId, error.message || 'Failed to load testimony. Please try again.');
    }
  };

  const handleTestimonySave = async (formData) => {
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
      const updated = await updateTestimony(testimonyData.id, {
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
      updateToError(toastId, error.message || 'Failed to update testimony. Please try again.');
      throw error;
    }
  };

  const renderContent = () => {
    switch(currentTab) {
      case 'messages':
        return <MessagesTab nightMode={nightMode} />;
      case 'groups':
        return <GroupsTab nightMode={nightMode} />;
      case 'connect':
        return <NearbyTab sortBy={sortBy} setSortBy={setSortBy} activeConnectTab={activeConnectTab} setActiveConnectTab={setActiveConnectTab} nightMode={nightMode} />;
      case 'profile':
        return <ProfileTab profile={profile} nightMode={nightMode} onAddTestimony={() => setShowTestimonyPrompt(true)} onEditTestimony={handleEditTestimony} />;
      default:
        return <ProfileTab profile={profile} nightMode={nightMode} onAddTestimony={() => setShowTestimonyPrompt(true)} onEditTestimony={handleEditTestimony} />;
    }
  };

  return (
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
        <div className="sticky top-0 z-50">
          <div className="px-5 py-3">
            <div className="flex items-center justify-between">
              {currentTab === 'profile' && (
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" style={{ filter: 'brightness(0)' }} />
                  <span className="font-semibold text-black">Lightning</span>
                </div>
              )}

              {currentTab === 'messages' && (
                <div className="font-semibold text-black text-xl">Messages</div>
              )}
              {currentTab === 'groups' && (
                <div className="font-semibold text-black text-xl">Groups</div>
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
        <div className="sticky top-0 z-50">
          <div className="px-5 py-3">
            <div className="flex items-center justify-between">
              {currentTab === 'profile' && (
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-white">Lightning</span>
                </div>
              )}

              {currentTab === 'messages' && (
                <div className="font-semibold text-slate-100 text-xl">Messages</div>
              )}
              {currentTab === 'groups' && (
                <div className="font-semibold text-slate-100 text-xl">Groups</div>
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
                  <MenuItem icon={Camera} label="Change Profile Picture" nightMode={nightMode} comingSoon />
                  <MenuItem icon={Bell} label="Link Spotify" nightMode={nightMode} comingSoon />
                  <MenuItem icon={Mail} label="Email & Password" nightMode={nightMode} comingSoon />
                </div>

                <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>Privacy & Safety</h3>
                  </div>
                  <MenuItem icon={Lock} label="Make Profile Private" toggle nightMode={nightMode} comingSoon />
                  <MenuItem icon={Eye} label="Who Can See Testimony" nightMode={nightMode} comingSoon />
                  <MenuItem icon={MessageCircle} label="Who Can Message You" nightMode={nightMode} comingSoon />
                  <MenuItem icon={Ban} label="Blocked Users" nightMode={nightMode} comingSoon />
                  <MenuItem icon={Flag} label="Report Content" nightMode={nightMode} comingSoon />
                </div>

                <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>Notifications</h3>
                  </div>
                  <MenuItem icon={Bell} label="Message Notifications" toggle defaultOn nightMode={nightMode} comingSoon />
                  <MenuItem icon={Users} label="Connection Requests" toggle defaultOn nightMode={nightMode} comingSoon />
                  <MenuItem icon={MapPin} label="Nearby Users" toggle nightMode={nightMode} comingSoon />
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          nightMode ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            nightMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <MenuItem icon={MapPin} label="Search Radius" subtext="25 miles" nightMode={nightMode} comingSoon />
                  <MenuItem icon={Globe} label="Language" subtext="English" nightMode={nightMode} comingSoon />
                </div>

                <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>About & Support</h3>
                  </div>
                  <MenuItem icon={FileText} label="Terms of Service" nightMode={nightMode} comingSoon />
                  <MenuItem icon={Shield} label="Privacy Policy" nightMode={nightMode} comingSoon />
                  <MenuItem icon={HelpCircle} label="Help Center" nightMode={nightMode} comingSoon />
                  <MenuItem icon={Phone} label="Contact Support" nightMode={nightMode} comingSoon />
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
            <span className="text-[10px] font-medium">Groups</span>
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
          onClick={() => setShowTestimonyPrompt(true)}
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

      {/* Testimony Creation Modal */}
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
                    className={`w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm ${
                      nightMode
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
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 ${
                      nightMode
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
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border ${
                    testimonyAnswers[testimonyStep]?.trim() && !isGenerating
                      ? nightMode
                        ? 'text-slate-100 border-white/20'
                        : 'text-slate-100 hover:opacity-90 border-white/30'
                      : nightMode
                        ? 'bg-white/5 text-slate-100 cursor-not-allowed border-white/10'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300'
                  }`}
                  style={testimonyAnswers[testimonyStep]?.trim() && !isGenerating ? {
                    background: nightMode ? 'rgba(79, 150, 255, 0.85)' : themes[selectedTheme].lightGradient,
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)'
                  } : {}}
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
      )}

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
        testimonyPreview={generatedTestimony}
      />
      </div>
    </GuestModalProvider>
  );
}

export default App;
