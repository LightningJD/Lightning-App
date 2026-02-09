import React from 'react';
import { Home, Search, User, Zap } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const {
    nightMode,
    themes,
    selectedTheme,
    currentTab,
    setCurrentTab,
    setShowMenu,
    activeServerName,
    activeServerEmoji,
    notificationCounts,
    handleLogoClick,
  } = useAppContext();

  return (
    <>
      {/* Full-Screen Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: nightMode ? themes[selectedTheme].darkGradient : themes[selectedTheme].lightGradient
        }}
      />

      {/* Header */}
      {!nightMode && (
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20">
          <div className="px-5 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {currentTab === 'you' && (
                <div
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={handleLogoClick}
                  title="Click me 10 times quickly..."
                >
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" style={{ filter: 'brightness(0)' }} />
                  <span className="font-semibold text-black">Lightning</span>
                </div>
              )}
              {currentTab === 'home' && (
                <div className="font-semibold text-black text-xl flex items-center gap-2 min-w-0 flex-1">
                  {activeServerName ? (
                    <>
                      {activeServerEmoji && <span className="text-lg flex-shrink-0">{activeServerEmoji}</span>}
                      <span className="truncate">{activeServerName}</span>
                    </>
                  ) : 'Home'}
                </div>
              )}
              {currentTab === 'find' && (
                <div className="font-semibold text-black text-xl">Find</div>
              )}
              <button
                onClick={() => setShowMenu(true)}
                className="w-8 h-8 flex items-center justify-center bg-white/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/40 transition-colors shadow-sm"
                aria-label="Open settings menu"
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
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/10 border-b border-white/10">
          <div className="px-5 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {currentTab === 'you' && (
                <div
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={handleLogoClick}
                  title="Click me 10 times quickly..."
                >
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-white">Lightning</span>
                </div>
              )}
              {currentTab === 'home' && (
                <div className="font-semibold text-slate-100 text-xl flex items-center gap-2 min-w-0 flex-1">
                  {activeServerName ? (
                    <>
                      {activeServerEmoji && <span className="text-lg flex-shrink-0">{activeServerEmoji}</span>}
                      <span className="truncate">{activeServerName}</span>
                    </>
                  ) : 'Home'}
                </div>
              )}
              {currentTab === 'find' && (
                <div className="font-semibold text-slate-100 text-xl">Find</div>
              )}
              <button
                onClick={() => setShowMenu(true)}
                className="w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full border border-white/10 hover:bg-white/20 transition-colors shadow-sm"
                aria-label="Open settings menu"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content — no z-index to avoid trapping fixed-position children (dialogs) in a stacking context */}
      <div className="relative">
        {children}
      </div>

      {/* Bottom Navigation */}
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
        <div className="px-2 sm:px-6 lg:px-8 flex justify-around items-center h-14">
          <NavButton
            tab="home"
            icon={Home}
            label="Home"
            currentTab={currentTab}
            nightMode={nightMode}
            badge={notificationCounts.messages}
            onClick={() => setCurrentTab('home')}
          />
          <NavButton
            tab="find"
            icon={Search}
            label="Find"
            currentTab={currentTab}
            nightMode={nightMode}
            badge={notificationCounts.find}
            onClick={() => setCurrentTab('find')}
          />
          <NavButton
            tab="you"
            icon={User}
            label="You"
            currentTab={currentTab}
            nightMode={nightMode}
            onClick={() => setCurrentTab('you')}
          />
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes popOut {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { transform: scale(1.15); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
        }
        .badge-pulse { animation: badgePulse 2s ease-in-out infinite; }
      `}</style>
    </>
  );
};

// ============================================
// NAV BUTTON SUB-COMPONENT
// ============================================

interface NavButtonProps {
  tab: string;
  icon: React.FC<any>;
  label: string;
  currentTab: string;
  nightMode: boolean;
  badge?: number;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ tab, icon: Icon, label, currentTab, nightMode, badge, onClick }) => {
  const isActive = currentTab === tab;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all border ${
        isActive
          ? nightMode ? 'text-slate-100 border-white/20' : 'text-slate-100 border-white/30'
          : nightMode ? 'text-white/40 border-transparent hover:bg-white/5' : 'text-black/40 border-transparent hover:bg-white/10'
      }`}
      style={isActive ? {
        background: 'rgba(79, 150, 255, 0.85)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)'
      } : {}}
      aria-label={`${label}${badge && badge > 0 ? ` (${badge} ${tab === 'home' ? 'unread' : 'new'})` : ''}`}
    >
      <div className="relative">
        <Icon className="w-5 h-5" />
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white/20 badge-pulse">
            <span className="text-[9px] font-bold text-white">{badge}</span>
          </div>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
};

export default AppLayout;
