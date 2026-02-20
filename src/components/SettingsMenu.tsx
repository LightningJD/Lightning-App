import React from "react";
import MenuItem from "./MenuItem";
import ProSettings from "./premium/ProSettings";
import { isPushSupported } from "../lib/webPush";
import { useAppContext } from "../contexts/AppContext";
import {
  Edit3,
  Camera,
  Music,
  MessageCircle,
  Ban,
  Flag,
  Bell,
  Users,
  MapPin,
  Globe,
  FileText,
  Shield,
  HelpCircle,
  Phone,
} from "lucide-react";

// ============================================
// Glass card wrapper for settings groups
// ============================================
const GlassCard: React.FC<{ nightMode: boolean; children: React.ReactNode }> = ({
  nightMode,
  children,
}) => (
  <div
    style={{
      borderRadius: "7px",
      overflow: "hidden",
      background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
      border: nightMode
        ? "1px solid rgba(255,255,255,0.06)"
        : "1px solid rgba(150,165,225,0.15)",
      ...(nightMode
        ? {}
        : {
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 1px 6px rgba(150,165,225,0.05)",
          }),
    }}
  >
    {children}
  </div>
);

// ============================================
// Group label
// ============================================
const GroupLabel: React.FC<{ nightMode: boolean; children: React.ReactNode }> = ({
  nightMode,
  children,
}) => (
  <div
    style={{
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "1px",
      fontWeight: 600,
      margin: "0 4px 6px",
      color: nightMode ? "#5d5877" : "#4a5e88",
    }}
  >
    {children}
  </div>
);

const SettingsMenu: React.FC = () => {
  const {
    nightMode,
    handleNightModeToggle,
    profile,
    userProfile,
    userIsAdmin,
    privacySettings,
    notificationSettings,
    searchRadius,
    setSearchRadius,
    pushPermission,
    handlePrivacyToggle,
    handleNotificationToggle,
    handleSaveSearchRadius,
    handleEnablePush,
    handleDisablePush,
    setShowMenu,
    setShowProfileEdit,
    setShowChangePicture,
    setShowLinkSpotify,
    setShowBlockedUsers,
    setShowTerms,
    setShowPrivacy,
    setShowHelp,
    setShowContactSupport,
    setShowBugReport,
    setShowAdminDashboard,
    setShowLogoutConfirm,
  } = useAppContext();

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMenu(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setShowMenu]);

  // Avatar initial letter
  const initial = (profile.displayName || profile.username || "U").charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        background: nightMode
          ? "#0d0b18"
          : "linear-gradient(135deg, #cdd8f8 0%, #d6daf5 40%, #dee0f6 70%, #e4e0f5 100%)",
      }}
    >
      <div style={{ padding: "24px 16px 20px", maxWidth: "400px", margin: "0 auto" }}>
        {/* Header: back arrow + title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 12px" }}>
          <button
            onClick={() => setShowMenu(false)}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              width: "28px",
              color: nightMode ? "#8e89a8" : "#4a5e88",
              padding: 0,
            }}
            aria-label="Go back"
          >
            &larr;
          </button>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "18px",
              fontWeight: 600,
              color: nightMode ? "#e8e5f2" : "#1e2b4a",
            }}
          >
            Settings
          </span>
          {/* Spacer to balance the back arrow */}
          <div style={{ width: "28px" }} />
        </div>

        {/* Profile summary card */}
        <div
          onClick={() => {
            setShowProfileEdit(true);
            setShowMenu(false);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setShowProfileEdit(true);
              setShowMenu(false);
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "12px",
            cursor: "pointer",
            background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
            border: nightMode
              ? "1px solid rgba(255,255,255,0.06)"
              : "1px solid rgba(150,165,225,0.15)",
            ...(nightMode
              ? {}
              : {
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "0 1px 6px rgba(150,165,225,0.05)",
                }),
          }}
        >
          {/* Avatar */}
          {profile.avatarImage ? (
            <img
              src={profile.avatarImage}
              alt={profile.displayName}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontFamily: "'Playfair Display', serif",
                color: "white",
                flexShrink: 0,
                background: nightMode
                  ? "linear-gradient(135deg, #7b76e0, #9b96f5)"
                  : "linear-gradient(135deg, #4facfe, #9b96f5)",
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: nightMode ? "#e8e5f2" : "#1e2b4a",
              }}
            >
              {profile.displayName || profile.username}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: nightMode ? "#5d5877" : "#8e9ec0",
              }}
            >
              @{profile.username}
            </div>
          </div>
          <span style={{ fontSize: "16px", color: nightMode ? "#5d5877" : "#8e9ec0" }}>
            &rsaquo;
          </span>
        </div>

        {/* Account */}
        <div style={{ marginBottom: "12px" }}>
          <GroupLabel nightMode={nightMode}>Account</GroupLabel>
          <GlassCard nightMode={nightMode}>
            <MenuItem
              icon={Edit3}
              label="Edit Profile"
              nightMode={nightMode}
              onClick={() => {
                setShowProfileEdit(true);
                setShowMenu(false);
              }}
            />
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
              subtext={userProfile?.spotifyUrl ? "Linked" : "Add a YouTube song"}
              onClick={() => {
                setShowMenu(false);
                setShowLinkSpotify(true);
              }}
            />
          </GlassCard>
        </div>

        {/* Lightning Pro */}
        <div style={{ marginBottom: "12px" }}>
          <GroupLabel nightMode={nightMode}>Lightning Pro</GroupLabel>
          <GlassCard nightMode={nightMode}>
            <div style={{ padding: "10px 12px" }}>
              <ProSettings
                nightMode={nightMode}
                userEmail={userProfile?.email || ""}
                userId={userProfile?.supabaseId || ""}
              />
            </div>
          </GlassCard>
        </div>

        {/* Privacy & Safety */}
        <div style={{ marginBottom: "12px" }}>
          <GroupLabel nightMode={nightMode}>Privacy & Safety</GroupLabel>
          <GlassCard nightMode={nightMode}>
            <MenuItem
              icon={MessageCircle}
              label="Who Can Message You"
              nightMode={nightMode}
              dropdown
              dropdownOptions={[
                { value: "everyone", label: "Everyone" },
                { value: "friends", label: "Friends Only" },
                { value: "none", label: "No One" },
              ]}
              selectedValue={privacySettings.messagePrivacy}
              onDropdownChange={(value) =>
                handlePrivacyToggle("messagePrivacy", value)
              }
            />
            <MenuItem
              icon={Ban}
              label="Blocked Users"
              nightMode={nightMode}
              onClick={() => {
                setShowMenu(false);
                setShowBlockedUsers(true);
              }}
            />
            <MenuItem
              icon={Flag}
              label="Report Content"
              nightMode={nightMode}
              subtext="Report users, messages, or inappropriate content"
              onClick={() => {
                alert(
                  'To report content:\n\n\u2022 Tap the 3-dot menu on any profile, testimony, message, or group\n\u2022 Select "Report"\n\u2022 Choose a reason and submit\n\nOur team reviews all reports within 24-48 hours.',
                );
              }}
            />
          </GlassCard>
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: "12px" }}>
          <GroupLabel nightMode={nightMode}>Notifications</GroupLabel>
          <GlassCard nightMode={nightMode}>
            <MenuItem
              icon={Bell}
              label="Messages"
              toggle
              nightMode={nightMode}
              isOn={notificationSettings.notifyMessages}
              onToggle={(value) =>
                handleNotificationToggle("notifyMessages", value)
              }
            />
            <MenuItem
              icon={Users}
              label="Connection Requests"
              toggle
              nightMode={nightMode}
              isOn={notificationSettings.notifyFriendRequests}
              onToggle={(value) =>
                handleNotificationToggle("notifyFriendRequests", value)
              }
            />
            <MenuItem
              icon={MapPin}
              label="Nearby Users"
              toggle
              nightMode={nightMode}
              isOn={notificationSettings.notifyNearby}
              onToggle={(value) =>
                handleNotificationToggle("notifyNearby", value)
              }
            />
            {isPushSupported() && (
              <MenuItem
                icon={Bell}
                label="Push Notifications"
                toggle
                nightMode={nightMode}
                isOn={pushPermission === "granted"}
                onToggle={() => {
                  if (pushPermission === "granted") handleDisablePush();
                  else handleEnablePush();
                }}
              />
            )}
          </GlassCard>
        </div>

        {/* Appearance */}
        <div style={{ marginBottom: "12px" }}>
          <GroupLabel nightMode={nightMode}>Appearance</GroupLabel>
          <GlassCard nightMode={nightMode}>
            {/* Night Mode Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>
                  {nightMode ? "\u{1F319}" : "\u{2600}\u{FE0F}"}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: nightMode ? "#e8e5f2" : "#1e2b4a",
                  }}
                >
                  Night Mode
                </span>
              </div>
              <div
                role="switch"
                aria-checked={nightMode}
                tabIndex={0}
                onClick={handleNightModeToggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNightModeToggle();
                  }
                }}
                style={{
                  width: "36px",
                  height: "20px",
                  borderRadius: "10px",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  background: nightMode
                    ? "rgba(123,118,224,0.3)"
                    : "rgba(150,165,225,0.2)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    top: "2px",
                    left: nightMode ? "18px" : "2px",
                    transition: "all 0.2s",
                    background: nightMode ? "#7b76e0" : "#8e9ec0",
                  }}
                />
              </div>
            </div>

            {/* Search Radius */}
            <div
              style={{
                padding: "10px 12px",
                borderTop: nightMode
                  ? "1px solid rgba(255,255,255,0.04)"
                  : "1px solid rgba(150,165,225,0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <MapPin
                  style={{
                    width: "20px",
                    height: "20px",
                    color: nightMode ? "#8e89a8" : "#4a5e88",
                  }}
                />
                <div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: nightMode ? "#e8e5f2" : "#1e2b4a",
                    }}
                  >
                    Search Radius
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: nightMode ? "#5d5877" : "#8e9ec0",
                      marginLeft: "6px",
                    }}
                  >
                    5-100 miles
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={searchRadius}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") setSearchRadius(0);
                    else setSearchRadius(Number.parseInt(val));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveSearchRadius();
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontSize: "13px",
                    background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
                    border: nightMode
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid rgba(150,165,225,0.15)",
                    color: nightMode ? "#e8e5f2" : "#1e2b4a",
                    outline: "none",
                  }}
                  placeholder="25"
                />
                <button
                  onClick={handleSaveSearchRadius}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    background: nightMode ? "rgba(123,118,224,0.15)" : "rgba(79,172,254,0.1)",
                    color: nightMode ? "#9b96f5" : "#2b6cb0",
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            <MenuItem
              icon={Globe}
              label="Language"
              subtext="English"
              nightMode={nightMode}
              comingSoon
            />
          </GlassCard>
        </div>

        {/* About & Support */}
        <div style={{ marginBottom: "12px" }}>
          <GroupLabel nightMode={nightMode}>About & Support</GroupLabel>
          <GlassCard nightMode={nightMode}>
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
            <MenuItem
              icon={Flag}
              label="Report a Bug"
              nightMode={nightMode}
              onClick={() => {
                setShowMenu(false);
                setShowBugReport(true);
              }}
            />
            {userIsAdmin && (
              <MenuItem
                icon={Shield}
                label="Admin Dashboard"
                nightMode={nightMode}
                onClick={() => {
                  setShowMenu(false);
                  setShowAdminDashboard(true);
                }}
              />
            )}
          </GlassCard>
        </div>

        {/* Sign Out */}
        <div
          onClick={() => setShowLogoutConfirm(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setShowLogoutConfirm(true);
          }}
          style={{
            textAlign: "center",
            padding: "12px",
            borderRadius: "7px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            marginTop: "4px",
            background: nightMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)",
            border: nightMode
              ? "1px solid rgba(255,255,255,0.04)"
              : "1px solid rgba(150,165,225,0.1)",
            color: "#e05c6c",
            ...(nightMode
              ? {}
              : {
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }),
          }}
        >
          Sign Out
        </div>

        {/* Version footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: "11px",
            marginTop: "12px",
            color: nightMode ? "#5d5877" : "#8e9ec0",
            opacity: 0.5,
          }}
        >
          Lightning v1.0.0 &middot; Built with &hearts; and faith
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
