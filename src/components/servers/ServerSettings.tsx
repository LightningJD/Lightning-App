import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, RefreshCw, Trash2, Shield } from 'lucide-react';

interface ServerSettingsProps {
  nightMode: boolean;
  server: {
    id: string;
    name: string;
    description?: string;
    icon_emoji: string;
    icon_url?: string;
    banner_url?: string;
    invite_code?: string;
    is_private: boolean;
    member_count: number;
  };
  permissions: {
    manage_server: boolean;
    manage_channels: boolean;
    create_invite: boolean;
  };
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onBack: () => void;
  onGenerateInvite: () => Promise<string | null>;
}

const SERVER_EMOJIS = ['⛪', '✝️', '🕊️', '🙏', '⭐', '🔥', '💒', '📖', '🌟', '💜', '🏠', '🎵'];

const ServerSettings: React.FC<ServerSettingsProps> = ({
  nightMode,
  server,
  permissions,
  onUpdate,
  onDelete,
  onBack,
  onGenerateInvite,
}) => {
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || '');
  const [iconEmoji, setIconEmoji] = useState(server.icon_emoji);
  const [inviteCode, setInviteCode] = useState(server.invite_code || '');
  const [copied, setCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      name !== server.name ||
      description !== (server.description || '') ||
      iconEmoji !== server.icon_emoji;
    setHasChanges(changed);
  }, [name, description, iconEmoji, server]);

  const handleSave = () => {
    if (!name.trim()) return;
    onUpdate({
      name: name.trim(),
      description: description.trim(),
      icon_emoji: iconEmoji,
    });
    setHasChanges(false);
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    const code = await onGenerateInvite();
    if (code) {
      setInviteCode(code);
    }
    setGeneratingInvite(false);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const glassBackground = nightMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.7)';
  const glassBorder = nightMode
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(0, 0, 0, 0.08)';
  const textPrimary = nightMode ? 'text-white' : 'text-slate-900';
  const textSecondary = nightMode ? 'text-slate-400' : 'text-slate-500';
  const inputClasses = `w-full px-4 py-2.5 rounded-xl border transition-colors ${
    nightMode
      ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
      : 'bg-white border-slate-200 text-black placeholder-slate-400'
  }`;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
        style={{
          background: nightMode
            ? 'rgba(10, 10, 10, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: glassBorder,
        }}
      >
        <button
          onClick={onBack}
          className={`p-1.5 rounded-lg transition-colors ${
            nightMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
          }`}
        >
          <ArrowLeft className={`w-5 h-5 ${textPrimary}`} />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: 'rgba(79, 150, 255, 0.85)' }} />
          <h2 className={`text-lg font-bold ${textPrimary}`}>Server Settings</h2>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* Server Icon */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: glassBackground,
            border: glassBorder,
            backdropFilter: 'blur(12px)',
          }}
        >
          <label className={`block text-sm font-medium mb-3 ${textPrimary}`}>
            Server Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {SERVER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIconEmoji(emoji)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                  iconEmoji === emoji
                    ? 'ring-2 ring-blue-500 scale-110'
                    : nightMode
                      ? 'hover:bg-white/10'
                      : 'hover:bg-slate-100'
                }`}
                style={{
                  background:
                    iconEmoji === emoji
                      ? nightMode
                        ? 'rgba(79, 150, 255, 0.2)'
                        : 'rgba(79, 150, 255, 0.1)'
                      : 'transparent',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Server Name */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: glassBackground,
            border: glassBorder,
            backdropFilter: 'blur(12px)',
          }}
        >
          <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>
            Server Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Server name"
            maxLength={50}
            className={inputClasses}
            disabled={!permissions.manage_server}
          />
        </div>

        {/* Description */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: glassBackground,
            border: glassBorder,
            backdropFilter: 'blur(12px)',
          }}
        >
          <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>
            Description{' '}
            <span className={`font-normal ${textSecondary}`}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's your server about?"
            rows={3}
            maxLength={200}
            className={`${inputClasses} resize-none`}
            disabled={!permissions.manage_server}
          />
        </div>

        {/* Invite Code */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: glassBackground,
            border: glassBorder,
            backdropFilter: 'blur(12px)',
          }}
        >
          <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
            Invite Code
          </label>
          {inviteCode ? (
            <div className="flex items-center gap-2">
              <div
                className={`flex-1 px-4 py-2.5 rounded-xl font-mono text-sm truncate ${
                  nightMode
                    ? 'bg-white/5 text-white/70'
                    : 'bg-slate-50 text-slate-600'
                }`}
              >
                {inviteCode}
              </div>
              <button
                onClick={handleCopyInvite}
                className="p-2.5 rounded-xl transition-all active:scale-95"
                style={{
                  background: copied
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(79, 150, 255, 0.15)',
                }}
              >
                <Copy
                  className="w-4 h-4"
                  style={{
                    color: copied ? '#22c55e' : 'rgba(79, 150, 255, 0.85)',
                  }}
                />
              </button>
              {permissions.create_invite && (
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="p-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'rgba(79, 150, 255, 0.15)' }}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${generatingInvite ? 'animate-spin' : ''}`}
                    style={{ color: 'rgba(79, 150, 255, 0.85)' }}
                  />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className={`flex-1 text-sm ${textSecondary}`}>
                No invite code generated yet
              </p>
              {permissions.create_invite && (
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'rgba(79, 150, 255, 0.85)',
                    boxShadow: '0 2px 8px rgba(79, 150, 255, 0.3)',
                  }}
                >
                  {generatingInvite ? 'Generating...' : 'Generate New'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Server Info */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: glassBackground,
            border: glassBorder,
            backdropFilter: 'blur(12px)',
          }}
        >
          <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
            Server Info
          </label>
          <div className={`text-sm space-y-1 ${textSecondary}`}>
            <p>Members: {server.member_count}</p>
            <p>Visibility: {server.is_private ? 'Private' : 'Public'}</p>
          </div>
        </div>

        {/* Save Button */}
        {permissions.manage_server && (
          <button
            onClick={handleSave}
            disabled={!hasChanges || !name.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            style={{
              background:
                hasChanges && name.trim()
                  ? 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)'
                  : nightMode
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.1)',
              boxShadow:
                hasChanges && name.trim()
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                  : 'none',
            }}
          >
            Save Changes
          </button>
        )}

        {/* Danger Zone */}
        {permissions.manage_server && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: nightMode
                ? 'rgba(239, 68, 68, 0.08)'
                : 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <label className="block text-sm font-medium mb-2 text-red-400">
              Danger Zone
            </label>
            <p
              className={`text-sm mb-3 ${
                nightMode ? 'text-red-300/70' : 'text-red-500/70'
              }`}
            >
              Deleting this server is permanent and cannot be undone. All
              channels, messages, and data will be lost.
            </p>
            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold transition-all active:scale-95"
                  style={{
                    background: 'rgba(239, 68, 68, 0.85)',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete
                  </span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    nightMode
                      ? 'bg-white/10 text-white hover:bg-white/15'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="w-full py-2.5 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete Server
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerSettings;
