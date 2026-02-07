/**
 * Notification Settings Component
 * Allows users to configure notification preferences:
 * - DND toggle
 * - Quiet hours
 * - Digest mode
 * - Per-group mute
 * Matches Lightning's glassmorphism UI style
 */

import React, { useState } from 'react';
import { ChevronLeft, BellOff, Bell, Moon, Clock, Mail, Volume2, VolumeX } from 'lucide-react';
import { showSuccess } from '../lib/toast';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  toggleDND,
  setDigestMode,
  muteGroup,
  unmuteGroup,
  isGroupMuted,
  getGroupMuteExpiry,
  formatMuteRemaining,
  MUTE_DURATIONS,
} from '../lib/notifications';
import type { NotificationPreferences, DigestFrequency } from '../lib/notifications';

interface NotificationSettingsProps {
  nightMode: boolean;
  groups: { id: string; name: string; avatar_emoji: string }[];
  onBack: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ nightMode, groups, onBack }) => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadNotificationPreferences());
  const [showMuteOptions, setShowMuteOptions] = useState<string | null>(null);

  const saveAndUpdate = (newPrefs: NotificationPreferences) => {
    saveNotificationPreferences(newPrefs);
    setPrefs({ ...newPrefs });
  };

  const handleDNDToggle = () => {
    const newDnd = toggleDND();
    setPrefs(prev => ({ ...prev, dndEnabled: newDnd }));
    showSuccess(newDnd ? 'Do Not Disturb enabled' : 'Do Not Disturb disabled');
  };

  const handleQuietHoursToggle = () => {
    const newPrefs = { ...prefs, quietHours: { ...prefs.quietHours, enabled: !prefs.quietHours.enabled } };
    saveAndUpdate(newPrefs);
  };

  const handleQuietHoursTimeChange = (type: 'start' | 'end', timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const newPrefs = { ...prefs, quietHours: { ...prefs.quietHours } };
    if (type === 'start') {
      newPrefs.quietHours.startHour = h;
      newPrefs.quietHours.startMinute = m;
    } else {
      newPrefs.quietHours.endHour = h;
      newPrefs.quietHours.endMinute = m;
    }
    saveAndUpdate(newPrefs);
  };

  const handleDigestChange = (mode: DigestFrequency) => {
    setDigestMode(mode);
    setPrefs(prev => ({ ...prev, digestMode: mode }));
  };

  const handleMuteGroup = (groupId: string, duration: number) => {
    muteGroup(groupId, duration);
    setPrefs(loadNotificationPreferences());
    setShowMuteOptions(null);
    showSuccess('Group muted');
  };

  const handleUnmuteGroup = (groupId: string) => {
    unmuteGroup(groupId);
    setPrefs(loadNotificationPreferences());
    showSuccess('Group unmuted');
  };

  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
        style={nightMode ? {} : {
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
        }}
      >
        <button
          onClick={onBack}
          className={nightMode ? 'p-1 hover:bg-white/10 rounded-lg' : 'p-1 hover:bg-white/20 rounded-lg'}
        >
          <ChevronLeft className={nightMode ? 'w-5 h-5 text-slate-100' : 'w-5 h-5 text-black'} />
        </button>
        <div className="flex items-center gap-2">
          <Bell className={nightMode ? 'w-4 h-4 text-slate-100' : 'w-4 h-4 text-black'} />
          <h3 className={nightMode ? 'font-semibold text-slate-100 text-sm' : 'font-semibold text-black text-sm'}>
            Notification Settings
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* DND Toggle */}
        <div
          className={`p-4 rounded-2xl ${nightMode ? 'bg-white/5' : ''}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${prefs.dndEnabled ? 'bg-red-500/20' : (nightMode ? 'bg-white/10' : 'bg-white/30')}`}>
                <BellOff className={`w-5 h-5 ${prefs.dndEnabled ? 'text-red-400' : (nightMode ? 'text-slate-400' : 'text-black/60')}`} />
              </div>
              <div>
                <p className={nightMode ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-black'}>
                  Do Not Disturb
                </p>
                <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
                  Silence all notifications
                </p>
              </div>
            </div>
            <button
              onClick={handleDNDToggle}
              className={`w-12 h-7 rounded-full transition-colors relative ${prefs.dndEnabled ? 'bg-red-500' : (nightMode ? 'bg-white/20' : 'bg-black/20')}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${prefs.dndEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Quiet Hours */}
        <div
          className={`p-4 rounded-2xl ${nightMode ? 'bg-white/5' : ''}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${prefs.quietHours.enabled ? 'bg-indigo-500/20' : (nightMode ? 'bg-white/10' : 'bg-white/30')}`}>
                <Moon className={`w-5 h-5 ${prefs.quietHours.enabled ? 'text-indigo-400' : (nightMode ? 'text-slate-400' : 'text-black/60')}`} />
              </div>
              <div>
                <p className={nightMode ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-black'}>
                  Quiet Hours
                </p>
                <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
                  Auto-silence during set hours
                </p>
              </div>
            </div>
            <button
              onClick={handleQuietHoursToggle}
              className={`w-12 h-7 rounded-full transition-colors relative ${prefs.quietHours.enabled ? 'bg-indigo-500' : (nightMode ? 'bg-white/20' : 'bg-black/20')}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${prefs.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {prefs.quietHours.enabled && (
            <div className="flex items-center gap-3 mt-3 ml-12">
              <div className="flex items-center gap-2">
                <Clock className={`w-3.5 h-3.5 ${nightMode ? 'text-slate-400' : 'text-black/50'}`} />
                <input
                  type="time"
                  value={formatTime(prefs.quietHours.startHour, prefs.quietHours.startMinute)}
                  onChange={(e) => handleQuietHoursTimeChange('start', e.target.value)}
                  className={`px-2 py-1 rounded-lg text-xs ${nightMode ? 'bg-white/10 text-slate-100' : 'text-black'}`}
                  style={nightMode ? {} : { background: 'rgba(255,255,255,0.3)' }}
                />
              </div>
              <span className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>to</span>
              <input
                type="time"
                value={formatTime(prefs.quietHours.endHour, prefs.quietHours.endMinute)}
                onChange={(e) => handleQuietHoursTimeChange('end', e.target.value)}
                className={`px-2 py-1 rounded-lg text-xs ${nightMode ? 'bg-white/10 text-slate-100' : 'text-black'}`}
                style={nightMode ? {} : { background: 'rgba(255,255,255,0.3)' }}
              />
            </div>
          )}
        </div>

        {/* Digest Mode */}
        <div
          className={`p-4 rounded-2xl ${nightMode ? 'bg-white/5' : ''}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${prefs.digestMode !== 'off' ? 'bg-emerald-500/20' : (nightMode ? 'bg-white/10' : 'bg-white/30')}`}>
              <Mail className={`w-5 h-5 ${prefs.digestMode !== 'off' ? 'text-emerald-400' : (nightMode ? 'text-slate-400' : 'text-black/60')}`} />
            </div>
            <div>
              <p className={nightMode ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-black'}>
                Digest Mode
              </p>
              <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
                Batch notifications together
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 ml-12">
            {(['off', 'hourly', 'daily', 'weekly'] as DigestFrequency[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleDigestChange(mode)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  prefs.digestMode === mode
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                    : (nightMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white/20 text-black/60 hover:bg-white/30')
                }`}
              >
                {mode === 'off' ? 'Off' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Per-Group Mute */}
        <div
          className={`p-4 rounded-2xl ${nightMode ? 'bg-white/5' : ''}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${nightMode ? 'bg-white/10' : 'bg-white/30'}`}>
              <Volume2 className={nightMode ? 'w-5 h-5 text-slate-400' : 'w-5 h-5 text-black/60'} />
            </div>
            <div>
              <p className={nightMode ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-black'}>
                Group Notifications
              </p>
              <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
                Mute individual groups
              </p>
            </div>
          </div>

          <div className="space-y-2 ml-2">
            {groups.map((group) => {
              const muted = isGroupMuted(group.id);
              const muteExpiry = getGroupMuteExpiry(group.id);

              return (
                <div
                  key={group.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${nightMode ? 'bg-white/5' : 'bg-white/10'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{group.avatar_emoji}</span>
                    <div>
                      <p className={`text-sm font-medium ${nightMode ? 'text-slate-200' : 'text-black/80'}`}>
                        {group.name}
                      </p>
                      {muted && muteExpiry && (
                        <p className="text-[10px] text-amber-400">
                          {formatMuteRemaining(muteExpiry)}
                        </p>
                      )}
                      {muted && !muteExpiry && (
                        <p className="text-[10px] text-red-400">Muted</p>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    {muted ? (
                      <button
                        onClick={() => handleUnmuteGroup(group.id)}
                        className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-colors"
                      >
                        <VolumeX className="w-4 h-4 text-red-400" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowMuteOptions(showMuteOptions === group.id ? null : group.id)}
                        className={`p-2 rounded-xl transition-colors ${nightMode ? 'hover:bg-white/10' : 'hover:bg-white/20'}`}
                      >
                        <Volume2 className={`w-4 h-4 ${nightMode ? 'text-slate-400' : 'text-black/50'}`} />
                      </button>
                    )}

                    {/* Mute Duration Options */}
                    {showMuteOptions === group.id && !muted && (
                      <div
                        className={`absolute right-0 top-full mt-1 z-50 rounded-xl shadow-xl border overflow-hidden ${nightMode ? 'bg-slate-800 border-white/10' : 'border-white/25'}`}
                        style={nightMode ? {} : {
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                        }}
                      >
                        {MUTE_DURATIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleMuteGroup(group.id, opt.value)}
                            className={`block w-full text-left px-4 py-2 text-xs whitespace-nowrap ${nightMode ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-black/5 text-black/80'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {groups.length === 0 && (
              <p className={`text-center text-sm py-4 ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
                No groups to configure
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
