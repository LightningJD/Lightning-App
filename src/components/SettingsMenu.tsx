import React from 'react';
import { X, Edit3, Camera, Music, MessageCircle, Ban, Flag, Bell, Users, MapPin, Globe, FileText, Shield, HelpCircle, Phone, Info, LogOut, Zap } from 'lucide-react';
import MenuItem from './MenuItem';
import ProSettings from './premium/ProSettings';
import { isPushSupported } from '../lib/webPush';
import { useAppContext } from '../contexts/AppContext';

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
    signOut,
  } = useAppContext();

  return (
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
            {/* Account Section */}
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
                onClick={() => { setShowMenu(false); setShowChangePicture(true); }}
              />
              <MenuItem
                icon={Music}
                label="Profile Song"
                nightMode={nightMode}
                subtext={userProfile?.spotifyUrl ? 'Linked' : 'Add a YouTube song'}
                onClick={() => { setShowMenu(false); setShowLinkSpotify(true); }}
              />
            </div>

            {/* Lightning Pro */}
            <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
              <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider flex items-center gap-1.5`}>
                  <Zap className="w-3 h-3" />
                  Lightning Pro
                </h3>
              </div>
              <div className="p-4">
                <ProSettings
                  nightMode={nightMode}
                  userEmail={userProfile?.email || ''}
                  userId={userProfile?.supabaseId || ''}
                />
              </div>
            </div>

            {/* Privacy & Safety */}
            <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
              <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>Privacy & Safety</h3>
              </div>
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
                onClick={() => { setShowMenu(false); setShowBlockedUsers(true); }}
              />
              <MenuItem
                icon={Flag}
                label="Report Content"
                nightMode={nightMode}
                subtext="Report users, messages, or inappropriate content"
                onClick={() => {
                  alert('To report content:\n\n\u2022 Tap the 3-dot menu on any profile, testimony, message, or group\n\u2022 Select "Report"\n\u2022 Choose a reason and submit\n\nOur team reviews all reports within 24-48 hours.');
                }}
              />
            </div>

            {/* Notifications */}
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
              {isPushSupported() && (
                <MenuItem
                  icon={Bell}
                  label="Push Notifications"
                  toggle
                  nightMode={nightMode}
                  isOn={pushPermission === 'granted'}
                  onToggle={() => {
                    if (pushPermission === 'granted') handleDisablePush();
                    else handleEnablePush();
                  }}
                />
              )}
            </div>

            {/* Preferences */}
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
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${nightMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${nightMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Search Radius */}
              <div className={`px-4 py-4 border-b transition-colors ${nightMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className={`w-5 h-5 ${nightMode ? 'text-slate-100' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>Search Radius</p>
                    <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>5-100 miles</p>
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
                      if (val === '') setSearchRadius(0);
                      else setSearchRadius(parseInt(val));
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSearchRadius(); }}
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

            {/* About & Support */}
            <div className={`${nightMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${nightMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
              <div className={`px-4 py-2 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border-b`}>
                <h3 className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-600'} uppercase tracking-wider`}>About & Support</h3>
              </div>
              <MenuItem icon={FileText} label="Terms of Service" nightMode={nightMode} onClick={() => { setShowMenu(false); setShowTerms(true); }} />
              <MenuItem icon={Shield} label="Privacy Policy" nightMode={nightMode} onClick={() => { setShowMenu(false); setShowPrivacy(true); }} />
              <MenuItem icon={HelpCircle} label="Help Center" nightMode={nightMode} onClick={() => { setShowMenu(false); setShowHelp(true); }} />
              <MenuItem icon={Phone} label="Contact Support" nightMode={nightMode} onClick={() => { setShowMenu(false); setShowContactSupport(true); }} />
              <MenuItem icon={Flag} label="Report a Bug" nightMode={nightMode} onClick={() => { setShowMenu(false); setShowBugReport(true); }} />
              <MenuItem icon={Info} label="App Version" subtext="1.0.0" nightMode={nightMode} />
              {userIsAdmin && (
                <MenuItem icon={Shield} label="Admin Dashboard" nightMode={nightMode} onClick={() => { setShowMenu(false); setShowAdminDashboard(true); }} />
              )}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors border-t ${nightMode ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-50 border-slate-100'}`}
                aria-label="Sign out of your account"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-red-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-600">Sign Out</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsMenu;
