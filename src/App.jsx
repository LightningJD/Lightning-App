import React, { useState, useRef } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { User, MessageCircle, Users, MapPin, Zap, Plus, X, ArrowRight, ArrowLeft, Sparkles, Edit3, Camera, Mail, Lock, Eye, Ban, Flag, Bell, Globe, Palette, FileText, Shield, HelpCircle, Phone, Info, LogOut } from 'lucide-react';
import ProfileTab from './components/ProfileTab';
import MessagesTab from './components/MessagesTab';
import GroupsTab from './components/GroupsTab';
import NearbyTab from './components/NearbyTab';
import MenuItem from './components/MenuItem';
import { useUserProfile } from './components/useUserProfile';
import { createTestimony } from './lib/database';

function App() {
  const { signOut } = useClerk();
  const { isLoading, isAuthenticated, profile: userProfile } = useUserProfile();

  const [currentTab, setCurrentTab] = useState('profile');
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [showTestimonyPrompt, setShowTestimonyPrompt] = useState(false);
  const [testimonyStep, setTestimonyStep] = useState(0);
  const [testimonyAnswers, setTestimonyAnswers] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTestimony, setGeneratedTestimony] = useState(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [activeConnectTab, setActiveConnectTab] = useState('recommended');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(localStorage.getItem('lightningTheme') || 'periwinkle');
  const [nightMode, setNightMode] = useState(localStorage.getItem('lightningNightMode') === 'true');

  // Periwinkle Theme - Blue-Purple Glossmorphic Gradient
  const themes = {
    periwinkle: {
      name: 'Periwinkle',
      lightGradient: `linear-gradient(135deg, rgba(219, 234, 254, 0.9) 0%, transparent 100%),
                      radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.25) 0%, transparent 60%),
                      linear-gradient(45deg, #DBEAFE 0%, #DDD6FE 50%, #C4B5FD 100%)`,
      darkGradient: `linear-gradient(135deg, rgba(17, 24, 39, 0.6) 0%, transparent 100%),
                     radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 60%),
                     linear-gradient(45deg, #0a0a0a 0%, #1a1028 50%, #1c2336 100%)`,
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
          <Zap className="w-16 h-16 text-white animate-pulse mx-auto mb-4" />
          <p className="text-white text-xl font-semibold">Loading Lightning...</p>
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

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const fadeStart = 0;
      const fadeEnd = 200;

      if (scrollY <= fadeStart) {
        setScrollOpacity(1);
      } else if (scrollY >= fadeEnd) {
        setScrollOpacity(0);
      } else {
        const opacity = 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
        setScrollOpacity(opacity);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

        // Save testimony to database
        console.log('Attempting to save testimony... Profile:', profile);
        if (profile.supabaseId) {
          console.log('Supabase ID found:', profile.supabaseId);
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
          } else {
            console.error('❌ Failed to save testimony');
          }
        } else {
          console.error('❌ No Supabase ID found. Profile:', profile);
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

  const renderContent = () => {
    switch(currentTab) {
      case 'messages':
        return <MessagesTab nightMode={nightMode} />;
      case 'groups':
        return <GroupsTab groupSearchQuery={groupSearchQuery} setGroupSearchQuery={setGroupSearchQuery} nightMode={nightMode} />;
      case 'connect':
        return <NearbyTab sortBy={sortBy} setSortBy={setSortBy} activeConnectTab={activeConnectTab} setActiveConnectTab={setActiveConnectTab} nightMode={nightMode} />;
      case 'profile':
        return <ProfileTab profile={profile} nightMode={nightMode} onAddTestimony={() => setShowTestimonyPrompt(true)} />;
      default:
        return <ProfileTab profile={profile} nightMode={nightMode} onAddTestimony={() => setShowTestimonyPrompt(true)} />;
    }
  };

  return (
    <div className="min-h-screen pb-12 relative">
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

              <button
                onClick={() => setShowMenu(true)}
                className="w-8 h-8 flex items-center justify-center bg-white/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/40 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
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
                <div className="font-semibold text-white text-xl">Messages</div>
              )}
              {currentTab === 'groups' && (
                <div className="font-semibold text-white text-xl">Groups</div>
              )}
              {currentTab === 'connect' && (
                <div className="font-semibold text-white text-xl">Connect</div>
              )}

              <button
                onClick={() => setShowMenu(true)}
                className="w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full border border-white/10 hover:bg-white/20 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
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
              <div className="p-6 bg-gradient-to-br from-purple-600 to-indigo-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <p className="text-sm text-white/80">@{profile.username}</p>
                  </div>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-9 h-9 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full border border-white/30 hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <h3 className={`text-xs font-semibold ${nightMode ? 'text-gray-400' : 'text-slate-600'} uppercase tracking-wider`}>Account</h3>
                  </div>
                  <MenuItem icon={Edit3} label="Edit Profile" nightMode={nightMode} />
                  <MenuItem icon={Camera} label="Change Profile Picture" nightMode={nightMode} />
                  <MenuItem icon={Bell} label="Link Spotify" nightMode={nightMode} />
                  <MenuItem icon={Mail} label="Email & Password" nightMode={nightMode} />
                </div>

                <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <h3 className={`text-xs font-semibold ${nightMode ? 'text-gray-400' : 'text-slate-600'} uppercase tracking-wider`}>Privacy & Safety</h3>
                  </div>
                  <MenuItem icon={Lock} label="Make Profile Private" toggle nightMode={nightMode} />
                  <MenuItem icon={Eye} label="Who Can See Testimony" nightMode={nightMode} />
                  <MenuItem icon={MessageCircle} label="Who Can Message You" nightMode={nightMode} />
                  <MenuItem icon={Ban} label="Blocked Users" nightMode={nightMode} />
                  <MenuItem icon={Flag} label="Report Content" nightMode={nightMode} />
                </div>

                <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <h3 className={`text-xs font-semibold ${nightMode ? 'text-gray-400' : 'text-slate-600'} uppercase tracking-wider`}>Notifications</h3>
                  </div>
                  <MenuItem icon={Bell} label="Message Notifications" toggle defaultOn nightMode={nightMode} />
                  <MenuItem icon={Users} label="Connection Requests" toggle defaultOn nightMode={nightMode} />
                  <MenuItem icon={MapPin} label="Nearby Users" toggle nightMode={nightMode} />
                  <MenuItem icon={Sparkles} label="Daily Devotional" toggle defaultOn nightMode={nightMode} />
                </div>

                <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <h3 className={`text-xs font-semibold ${nightMode ? 'text-gray-400' : 'text-slate-600'} uppercase tracking-wider`}>Preferences</h3>
                  </div>

                  {/* Night Mode Toggle */}
                  <div className={`px-4 py-3 border-b ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className={`w-4 h-4 ${nightMode ? 'text-white' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        <div>
                          <span className={`text-sm font-medium ${nightMode ? 'text-white' : 'text-slate-900'}`}>Night Mode</span>
                          <p className={`text-xs ${nightMode ? 'text-gray-400' : 'text-slate-500'}`}>Dark theme for comfortable viewing</p>
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

                  <MenuItem icon={MapPin} label="Search Radius" subtext="25 miles" nightMode={nightMode} />
                  <MenuItem icon={Globe} label="Language" subtext="English" nightMode={nightMode} />
                </div>

                <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <h3 className={`text-xs font-semibold ${nightMode ? 'text-gray-400' : 'text-slate-600'} uppercase tracking-wider`}>About & Support</h3>
                  </div>
                  <MenuItem icon={FileText} label="Terms of Service" nightMode={nightMode} />
                  <MenuItem icon={Shield} label="Privacy Policy" nightMode={nightMode} />
                  <MenuItem icon={HelpCircle} label="Help Center" nightMode={nightMode} />
                  <MenuItem icon={Phone} label="Contact Support" nightMode={nightMode} />
                  <MenuItem icon={Info} label="App Version" subtext="1.0.0" nightMode={nightMode} />
                </div>
              </div>

              <div className={`p-4 border-t ${nightMode ? 'border-white/10 bg-[#0a0a0a]' : 'border-slate-200 bg-white'}`}>
                <button
                  onClick={() => signOut()}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${nightMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Navigation - Glossmorphic */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 ${nightMode ? 'bg-[#0a0a0a]/95 border-t border-white/10' : ''}`}
        style={nightMode ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        } : {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <div className="max-w-3xl mx-auto px-2 flex justify-around items-center h-14">
          <button onClick={() => setCurrentTab('profile')} className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all ${currentTab === 'profile' ? nightMode ? 'bg-white/10 text-white' : 'text-black' : nightMode ? 'text-gray-500' : 'text-black opacity-50'}`}>
            <User className="w-5 h-5" style={!nightMode ? { filter: 'brightness(0)' } : {}} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
          <button onClick={() => setCurrentTab('messages')} className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all ${currentTab === 'messages' ? nightMode ? 'bg-white/10 text-white' : 'text-black' : nightMode ? 'text-gray-500' : 'text-black opacity-50'}`}>
            <MessageCircle className="w-5 h-5" style={!nightMode ? { filter: 'brightness(0)' } : {}} />
            <span className="text-[10px] font-medium">Messages</span>
          </button>
          <button onClick={() => setCurrentTab('groups')} className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all ${currentTab === 'groups' ? nightMode ? 'bg-white/10 text-white' : 'text-black' : nightMode ? 'text-gray-500' : 'text-black opacity-50'}`}>
            <Users className="w-5 h-5" style={!nightMode ? { filter: 'brightness(0)' } : {}} />
            <span className="text-[10px] font-medium">Groups</span>
          </button>
          <button onClick={() => setCurrentTab('connect')} className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all ${currentTab === 'connect' ? nightMode ? 'bg-white/10 text-white' : 'text-black' : nightMode ? 'text-gray-500' : 'text-black opacity-50'}`}>
            <MapPin className="w-5 h-5" style={!nightMode ? { filter: 'brightness(0)' } : {}} />
            <span className="text-[10px] font-medium">Connect</span>
          </button>
        </div>
      </div>

      {/* Testimony Prompt Button */}
      {!profile.hasTestimony && !showTestimonyPrompt && (
        <button
          onClick={() => setShowTestimonyPrompt(true)}
          className="fixed bottom-20 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 z-40 text-white border border-white/20"
          style={nightMode ? {
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          } : {
            background: 'linear-gradient(to-br, #3b82f6, #9333ea)',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
          }}
          onMouseEnter={(e) => {
            if (nightMode) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
            } else {
              e.currentTarget.style.background = 'linear-gradient(to-br, #2563eb, #7c3aed)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (nightMode) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            } else {
              e.currentTarget.style.background = 'linear-gradient(to-br, #3b82f6, #9333ea)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
            }
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
          <div className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto rounded-2xl shadow-2xl z-50 animate-in zoom-in duration-300 max-h-[80vh] overflow-hidden flex flex-col ${nightMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
            <div className={`p-6 ${nightMode ? 'bg-gradient-to-br from-purple-600 to-indigo-700' : ''}`} style={{ background: nightMode ? '' : themes[selectedTheme].lightGradient }}>
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
                    <h3 className={`text-lg font-semibold mb-2 ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                      Question {testimonyStep + 1} of {testimonyQuestions.length}
                    </h3>
                    <p className={`font-medium mb-1 ${nightMode ? 'text-white' : 'text-slate-700'}`}>
                      {testimonyQuestions[testimonyStep].question}
                    </p>
                    <p className={`text-xs italic ${nightMode ? 'text-gray-400' : 'text-slate-500'}`}>
                      💡 {testimonyQuestions[testimonyStep].hint}
                    </p>
                  </div>

                  <textarea
                    value={testimonyAnswers[testimonyStep] || ''}
                    onChange={(e) => handleTestimonyAnswer(e.target.value)}
                    placeholder={testimonyQuestions[testimonyStep].placeholder}
                    className={`w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
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
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${nightMode ? 'text-white' : 'text-slate-700'}`}>{generatedTestimony}</p>
                  </div>
                  <p className={`text-xs italic ${nightMode ? 'text-gray-400' : 'text-slate-500'}`}>You can edit this testimony in your profile settings.</p>
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
                        ? 'bg-white/5 hover:bg-white/10 text-white'
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
                        ? 'text-white border-white/20'
                        : 'text-white hover:opacity-90 border-white/30'
                      : nightMode
                        ? 'bg-white/5 text-gray-400 cursor-not-allowed border-white/10'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300'
                  }`}
                  style={testimonyAnswers[testimonyStep]?.trim() && !isGenerating ? nightMode ? {
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  } : { background: themes[selectedTheme].lightGradient } : {}}
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
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors text-white border ${nightMode ? 'border-white/20' : 'border-white/30'}`}
                  style={nightMode ? {
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  } : { background: themes[selectedTheme].lightGradient }}
                  onMouseEnter={(e) => {
                    if (nightMode) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (nightMode) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
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
    </div>
  );
}

export default App;
