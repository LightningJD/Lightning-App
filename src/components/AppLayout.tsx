import React from "react";
import { Zap, Bell } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

// ============================================
// CUSTOM SVG NAV ICONS — colorless outlines
// ============================================

const HomeIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({
  className,
  strokeWidth = 1.8,
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Small house */}
    <path d="M2 13l5-4 5 4v7H2V13z" />
    <path d="M5 20v-3h4v3" />
    {/* Tall building */}
    <rect x="13" y="4" width="9" height="16" rx="1" />
    {/* Window dots */}
    <line x1="16" y1="7.5" x2="16" y2="7.5" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="19" y1="7.5" x2="19" y2="7.5" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="11" x2="16" y2="11" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="19" y1="11" x2="19" y2="11" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="14.5" x2="16" y2="14.5" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="19" y1="14.5" x2="19" y2="14.5" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M16 20v-2.5h3v2.5" />
  </svg>
);

const BoltIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({
  className,
  strokeWidth = 1.8,
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const PersonIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({
  className,
  strokeWidth = 1.8,
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

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
    setShowNotifications,
    activeServerName,
    activeServerEmoji,
    notificationCounts,
    handleLogoClick,
  } = useAppContext();

  return (
    <>
      {/* Full-Screen Background — pointer-events-none so it doesn't block
          clicks, no z-index needed because it paints first in DOM order */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: nightMode
            ? themes[selectedTheme].darkGradient
            : themes[selectedTheme].lightGradient,
        }}
      />

      {/* Header */}
      {!nightMode && (
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20">
          <div className="px-5 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {currentTab === "you" && (
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={handleLogoClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleLogoClick();
                  }}
                  title="Click me 10 times quickly..."
                >
                  <Zap
                    className="w-5 h-5 text-yellow-400 fill-yellow-400"
                    style={{ filter: "brightness(0)" }}
                  />
                  <span className="font-semibold text-black">Lightning</span>
                </div>
              )}
              {currentTab === "home" && (
                <div className="font-semibold text-black text-xl flex items-center gap-2 min-w-0 flex-1">
                  {activeServerName ? (
                    <>
                      {activeServerEmoji && (
                        activeServerEmoji.startsWith("linear-gradient") ? (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: activeServerEmoji, fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {activeServerName.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <span className="text-lg flex-shrink-0">
                            {activeServerEmoji}
                          </span>
                        )
                      )}
                      <span className="truncate">{activeServerName}</span>
                    </>
                  ) : (
                    "Home"
                  )}
                </div>
              )}
              {currentTab === "charge" && (
                <div className="font-semibold text-black text-xl">Charge</div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative w-8 h-8 flex items-center justify-center bg-white/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/40 transition-colors shadow-sm"
                  aria-label="Open notifications"
                >
                  <Bell className="w-4 h-4 text-black" />
                  {(notificationCounts.charge ?? 0) > 0 && (
                    <div
                      className="absolute flex items-center justify-center badge-pulse"
                      style={{
                        top: "-2px",
                        right: "-2px",
                        minWidth: "14px",
                        height: "14px",
                        borderRadius: "7px",
                        fontSize: "8px",
                        fontWeight: 700,
                        padding: "0 3px",
                        background: "#ef4444",
                        color: "white",
                        border: "2px solid #d6daf5",
                      }}
                    >
                      {notificationCounts.charge}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setShowMenu(true)}
                  className="w-8 h-8 flex items-center justify-center bg-white/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/40 transition-colors shadow-sm"
                  aria-label="Open settings menu"
                >
                  <svg
                    className="w-4 h-4 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Night Mode Header */}
      {nightMode && (
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/10 border-b border-white/10">
          <div className="px-5 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {currentTab === "you" && (
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={handleLogoClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleLogoClick();
                    }
                  }}
                  title="Click me 10 times quickly..."
                >
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-white">Lightning</span>
                </div>
              )}
              {currentTab === "home" && (
                <div className="font-semibold text-slate-100 text-xl flex items-center gap-2 min-w-0 flex-1">
                  {activeServerName ? (
                    <>
                      {activeServerEmoji && (
                        activeServerEmoji.startsWith("linear-gradient") ? (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: activeServerEmoji, fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {activeServerName.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <span className="text-lg flex-shrink-0">
                            {activeServerEmoji}
                          </span>
                        )
                      )}
                      <span className="truncate">{activeServerName}</span>
                    </>
                  ) : (
                    "Home"
                  )}
                </div>
              )}
              {currentTab === "charge" && (
                <div className="font-semibold text-slate-100 text-xl">Charge</div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full border border-white/10 hover:bg-white/20 transition-colors shadow-sm"
                  aria-label="Open notifications"
                >
                  <Bell className="w-4 h-4 text-white" />
                  {(notificationCounts.charge ?? 0) > 0 && (
                    <div
                      className="absolute flex items-center justify-center badge-pulse"
                      style={{
                        top: "-2px",
                        right: "-2px",
                        minWidth: "14px",
                        height: "14px",
                        borderRadius: "7px",
                        fontSize: "8px",
                        fontWeight: 700,
                        padding: "0 3px",
                        background: "#ef4444",
                        color: "white",
                        border: "2px solid #0d0b18",
                      }}
                    >
                      {notificationCounts.charge}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setShowMenu(true)}
                  className="w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full border border-white/10 hover:bg-white/20 transition-colors shadow-sm"
                  aria-label="Open settings menu"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content — no z-index to avoid trapping fixed-position
          dialogs in a stacking context */}
      <div className="relative">{children}</div>

      {/* Bottom Navigation — Frosted glass */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={
          nightMode
            ? {
                background: "rgba(13, 11, 24, 0.9)",
                borderTop: "1px solid rgba(255, 255, 255, 0.04)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }
            : {
                background: "rgba(205, 216, 248, 0.6)",
                borderTop: "1px solid rgba(150, 165, 225, 0.1)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }
        }
      >
        <div className="flex justify-around items-center" style={{ padding: "6px 16px calc(env(safe-area-inset-bottom, 8px) + 8px)" }}>
          <NavButton
            tab="home"
            label="Home"
            currentTab={currentTab}
            nightMode={nightMode}
            badge={notificationCounts.messages}
            onClick={() => setCurrentTab("home")}
            icon={<HomeIcon className="w-5 h-5" strokeWidth={currentTab === "home" ? 2.2 : 1.8} />}
          />
          <NavButton
            tab="charge"
            label="Charge"
            currentTab={currentTab}
            nightMode={nightMode}
            badge={notificationCounts.charge}
            onClick={() => setCurrentTab("charge")}
            icon={<BoltIcon className="w-5 h-5" strokeWidth={currentTab === "charge" ? 2.2 : 1.8} />}
          />
          <NavButton
            tab="you"
            label="You"
            currentTab={currentTab}
            nightMode={nightMode}
            onClick={() => setCurrentTab("you")}
            icon={<PersonIcon className="w-5 h-5" strokeWidth={currentTab === "you" ? 2.2 : 1.8} />}
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
  icon: React.ReactNode;
  label: string;
  currentTab: string;
  nightMode: boolean;
  badge?: number;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({
  tab,
  icon,
  label,
  currentTab,
  nightMode,
  badge,
  onClick,
}) => {
  const isActive = currentTab === tab;

  // Night mode colors
  const nightActive = {
    color: "#e8e5f2",
    background: "rgba(123, 118, 224, 0.12)",
    border: "1px solid rgba(123, 118, 224, 0.18)",
  };
  const nightInactive = {
    color: "#5d5877",
    background: "transparent",
    border: "1px solid transparent",
  };

  // Day mode colors
  const dayActive = {
    color: "#1e2b4a",
    background: "rgba(79, 172, 254, 0.1)",
    border: "1px solid rgba(79, 172, 254, 0.15)",
  };
  const dayInactive = {
    color: "#8e9ec0",
    background: "transparent",
    border: "1px solid transparent",
  };

  const style = nightMode
    ? isActive ? nightActive : nightInactive
    : isActive ? dayActive : dayInactive;

  // Badge border color matches nav background
  const badgeBorderColor = nightMode ? "#0d0b18" : "#d6daf5";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 rounded-xl cursor-pointer transition-all"
      style={{
        padding: "6px 16px",
        color: style.color,
        background: style.background,
        border: style.border,
      }}
      aria-label={`${label}${badge && badge > 0 ? ` (${badge} ${tab === "home" ? "unread" : "new"})` : ""}`}
    >
      <div className="relative" style={{ color: style.color }}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <div
            className="absolute flex items-center justify-center badge-pulse"
            style={{
              top: "-4px",
              right: "-6px",
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              fontSize: "9px",
              fontWeight: 700,
              padding: "0 3px",
              background: "#ef4444",
              color: "white",
              border: `2px solid ${badgeBorderColor}`,
            }}
          >
            {badge}
          </div>
        )}
      </div>
      <span
        className="text-[10px] font-medium"
        style={{
          letterSpacing: "0.3px",
          color: style.color,
        }}
      >
        {label}
      </span>
    </button>
  );
};

export default AppLayout;
