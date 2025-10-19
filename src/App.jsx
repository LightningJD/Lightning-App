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
      <div className="min-h-screen bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center">
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
        return <MessagesTab />;
      case 'groups':
        return <GroupsTab groupSearchQuery={groupSearchQuery} setGroupSearchQuery={setGroupSearchQuery} />;
      case 'connect':
        return <NearbyTab sortBy={sortBy} setSortBy={setSortBy} activeConnectTab={activeConnectTab} setActiveConnectTab={setActiveConnectTab} />;
      case 'profile':
        return <ProfileTab profile={profile} />;
      default:
        return <ProfileTab profile={profile} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div
        className="h-28 md:h-36 relative transition-opacity duration-300"
        style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          opacity: scrollOpacity
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50"></div>

        <div className="absolute top-4 left-0 right-0 px-6">
          <div className="flex items-center justify-between">
            {currentTab === 'profile' && (
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                <span className="font-bold text-white drop-shadow-md">Lightning</span>
              </div>
            )}

            {currentTab === 'messages' && (
              <div className="font-bold text-white drop-shadow-md text-lg">Messages</div>
            )}
            {currentTab === 'groups' && (
              <div className="font-bold text-white drop-shadow-md text-lg">Groups</div>
            )}
            {currentTab === 'connect' && (
              <div className="font-bold text-white drop-shadow-md text-lg">Connect</div>
            )}

            {currentTab === 'connect' && (
              <button
                onClick={() => setShowMenu(true)}
                className="w-9 h-9 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full border border-white/30 hover:bg-white/30 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {renderContent()}
      </div>

      {/* Settings Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-slate-50 z-50 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex flex-col h-full">
              <div className="p-6" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
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
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Account</h3>
                  </div>
                  <MenuItem icon={Edit3} label="Edit Profile" />
                  <MenuItem icon={Camera} label="Change Profile Picture" />
                  <MenuItem icon={Bell} label="Link Spotify" />
                  <MenuItem icon={Mail} label="Email & Password" />
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Privacy & Safety</h3>
                  </div>
                  <MenuItem icon={Lock} label="Make Profile Private" toggle />
                  <MenuItem icon={Eye} label="Who Can See Testimony" />
                  <MenuItem icon={MessageCircle} label="Who Can Message You" />
                  <MenuItem icon={Ban} label="Blocked Users" />
                  <MenuItem icon={Flag} label="Report Content" />
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Notifications</h3>
                  </div>
                  <MenuItem icon={Bell} label="Message Notifications" toggle defaultOn />
                  <MenuItem icon={Users} label="Connection Requests" toggle defaultOn />
                  <MenuItem icon={MapPin} label="Nearby Users" toggle />
                  <MenuItem icon={Sparkles} label="Daily Devotional" toggle defaultOn />
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Preferences</h3>
                  </div>
                  <MenuItem icon={MapPin} label="Search Radius" subtext="25 miles" />
                  <MenuItem icon={Palette} label="Dark Mode" toggle />
                  <MenuItem icon={Globe} label="Language" subtext="English" />
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">About & Support</h3>
                  </div>
                  <MenuItem icon={FileText} label="Terms of Service" />
                  <MenuItem icon={Shield} label="Privacy Policy" />
                  <MenuItem icon={HelpCircle} label="Help Center" />
                  <MenuItem icon={Phone} label="Contact Support" />
                  <MenuItem icon={Info} label="App Version" subtext="1.0.0" />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-white">
                <button
                  onClick={() => signOut()}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-2xl">
        <div className="max-w-3xl mx-auto px-2 flex justify-around items-center h-20">
          <button onClick={() => setCurrentTab('profile')} className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors ${currentTab === 'profile' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profile</span>
          </button>
          <button onClick={() => setCurrentTab('messages')} className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors ${currentTab === 'messages' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-medium">Messages</span>
          </button>
          <button onClick={() => setCurrentTab('groups')} className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors ${currentTab === 'groups' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>
            <Users className="w-6 h-6" />
            <span className="text-xs font-medium">Groups</span>
          </button>
          <button onClick={() => setCurrentTab('connect')} className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors ${currentTab === 'connect' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>
            <MapPin className="w-6 h-6" />
            <span className="text-xs font-medium">Connect</span>
          </button>
        </div>
      </div>

      {/* Testimony Prompt Button */}
      {!profile.hasTestimony && !showTestimonyPrompt && (
        <button
          onClick={() => setShowTestimonyPrompt(true)}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all hover:scale-110 z-40"
          style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
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
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl z-50 animate-in zoom-in duration-300 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
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
              <p className="text-white/90 text-sm mt-2">Sharing the power of testimonies</p>

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
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Question {testimonyStep + 1} of {testimonyQuestions.length}
                    </h3>
                    <p className="text-slate-700 font-medium mb-1">
                      {testimonyQuestions[testimonyStep].question}
                    </p>
                    <p className="text-xs text-slate-500 italic">
                      💡 {testimonyQuestions[testimonyStep].hint}
                    </p>
                  </div>

                  <textarea
                    value={testimonyAnswers[testimonyStep] || ''}
                    onChange={(e) => handleTestimonyAnswer(e.target.value)}
                    placeholder={testimonyQuestions[testimonyStep].placeholder}
                    className="w-full h-40 p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Your Testimony is Ready!</h3>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{generatedTestimony}</p>
                  </div>
                  <p className="text-xs text-slate-500 italic">You can edit this testimony in your profile settings.</p>
                </div>
              )}
            </div>

            {!generatedTestimony ? (
              <div className="p-6 border-t border-slate-200 flex gap-3">
                {testimonyStep > 0 && (
                  <button
                    onClick={previousTestimonyStep}
                    disabled={isGenerating}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                <button
                  onClick={nextTestimonyStep}
                  disabled={!testimonyAnswers[testimonyStep]?.trim() || isGenerating}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    testimonyAnswers[testimonyStep]?.trim() && !isGenerating
                      ? 'text-white hover:opacity-90'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  style={testimonyAnswers[testimonyStep]?.trim() && !isGenerating ? { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' } : {}}
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
              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowTestimonyPrompt(false);
                    setTestimonyStep(0);
                    setTestimonyAnswers({});
                    setGeneratedTestimony(null);
                  }}
                  className="flex-1 px-4 py-3 text-white rounded-lg font-semibold transition-colors hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
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
