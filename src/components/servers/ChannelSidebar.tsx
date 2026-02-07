import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Settings, Shield, Users } from 'lucide-react';

interface ChannelSidebarProps {
  nightMode: boolean;
  serverName: string;
  serverEmoji: string;
  categories: Array<{ id: string; name: string; position: number }>;
  channels: Array<{ id: string; name: string; topic?: string; category_id?: string; position: number }>;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: (categoryId?: string) => void;
  onOpenSettings: () => void;
  onOpenRoles?: () => void;
  onOpenMembers?: () => void;
  canManageChannels: boolean;
  fullWidth?: boolean;
}

// Map common channel names to emoji icons
const getChannelEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('general')) return '\u{1F4AC}';
  if (lower.includes('prayer')) return '\u{1F64F}';
  if (lower.includes('bible') || lower.includes('study') || lower.includes('scripture')) return '\u{1F4D6}';
  if (lower.includes('worship') || lower.includes('music') || lower.includes('praise')) return '\u{1F3B5}';
  if (lower.includes('announcements') || lower.includes('announce')) return '\u{1F4E2}';
  if (lower.includes('welcome') || lower.includes('intro')) return '\u{1F44B}';
  if (lower.includes('events') || lower.includes('calendar')) return '\u{1F4C5}';
  if (lower.includes('help') || lower.includes('support')) return '\u{1F91D}';
  if (lower.includes('testimony') || lower.includes('testimonies')) return '\u{2728}';
  if (lower.includes('off-topic') || lower.includes('random') || lower.includes('chat')) return '\u{1F389}';
  if (lower.includes('media') || lower.includes('photo') || lower.includes('video')) return '\u{1F4F7}';
  if (lower.includes('resource') || lower.includes('links')) return '\u{1F517}';
  if (lower.includes('voice')) return '\u{1F3A4}';
  if (lower.includes('youth') || lower.includes('teen')) return '\u{1F31F}';
  if (lower.includes('volunteer') || lower.includes('serve') || lower.includes('ministry')) return '\u{1F54A}\u{FE0F}';
  return '\u{1F4AC}';
};

const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  nightMode, serverName, serverEmoji, categories, channels,
  activeChannelId, onSelectChannel, onCreateChannel, onOpenSettings, onOpenRoles, onOpenMembers, canManageChannels, fullWidth
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // Group channels by category
  const uncategorizedChannels = channels.filter(c => !c.category_id);
  const categorizedGroups = categories.map(cat => ({
    ...cat,
    channels: channels.filter(c => c.category_id === cat.id).sort((a, b) => a.position - b.position)
  }));

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        ...(fullWidth ? { width: '100%' } : { width: '220px', minWidth: '220px' }),
        background: nightMode ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRight: fullWidth ? 'none' : `1px solid ${nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {/* Server name header */}
      <div
        className="px-4 py-3.5 flex items-center gap-2.5"
        style={{
          borderBottom: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          background: nightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)',
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
          }}
        >
          {serverEmoji}
        </div>
        <h3 className={`font-bold text-sm truncate flex-1 ${nightMode ? 'text-white' : 'text-black'}`}>
          {serverName}
        </h3>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-2">
        {/* Uncategorized channels */}
        {uncategorizedChannels.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
            }}
          >
            {uncategorizedChannels.map(channel => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeChannelId}
                nightMode={nightMode}
                onClick={() => onSelectChannel(channel.id)}
              />
            ))}
          </div>
        )}

        {/* Categorized channels */}
        {categorizedGroups.map(group => (
          <div key={group.id}>
            {/* Category header */}
            <div className="flex items-center gap-1.5 px-2 mb-1.5">
              <button
                onClick={() => toggleCategory(group.id)}
                className={`flex items-center gap-1.5 flex-1 text-xs font-semibold ${
                  nightMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                } transition-colors`}
              >
                {collapsedCategories.has(group.id) ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                {group.name}
              </button>
              {canManageChannels && (
                <button
                  onClick={() => onCreateChannel(group.id)}
                  className={`p-0.5 rounded-lg opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all ${
                    nightMode ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-black/30 hover:text-black/60 hover:bg-black/5'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Channels in category — frosted glass card */}
            {!collapsedCategories.has(group.id) && group.channels.length > 0 && (
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                {group.channels.map(channel => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={channel.id === activeChannelId}
                    nightMode={nightMode}
                    onClick={() => onSelectChannel(channel.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom settings bar — frosted glass */}
      <div
        className="px-3 py-2.5 space-y-1"
        style={{
          borderTop: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          background: nightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)',
        }}
      >
        {/* Members button */}
        {onOpenMembers && (
          <button
            onClick={onOpenMembers}
            className={`w-full flex items-center gap-2.5 text-xs px-3 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-95 ${
              nightMode ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-black/50 hover:text-black/80 hover:bg-black/5'
            }`}
          >
            <Users className="w-4 h-4" />
            Members
          </button>
        )}

        {/* Admin controls */}
        {canManageChannels && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCreateChannel()}
              className={`flex-1 flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-95 ${
                nightMode ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-black/50 hover:text-black/80 hover:bg-black/5'
              }`}
            >
              <Plus className="w-4 h-4" />
              Channel
            </button>
            <div className="flex items-center gap-0.5">
              {onOpenRoles && (
                <button
                  onClick={onOpenRoles}
                  className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                    nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
                  }`}
                  title="Manage Roles"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                  nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
                }`}
                title="Server Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Individual channel item — emoji-first, generous spacing, gradient active state
const ChannelItem: React.FC<{
  channel: { id: string; name: string; topic?: string };
  isActive: boolean;
  nightMode: boolean;
  onClick: () => void;
}> = ({ channel, isActive, nightMode, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all ${
      isActive
        ? 'font-semibold'
        : nightMode ? 'text-white/50 hover:text-white/80' : 'text-black/50 hover:text-black/80'
    }`}
    style={isActive ? {
      background: nightMode
        ? 'linear-gradient(90deg, rgba(79, 150, 255, 0.15), rgba(59, 130, 246, 0.05))'
        : 'linear-gradient(90deg, rgba(79, 150, 255, 0.12), rgba(59, 130, 246, 0.03))',
      color: nightMode ? '#93bbff' : '#2563eb',
      borderLeft: '3px solid rgba(79, 150, 255, 0.7)',
    } : {
      borderLeft: '3px solid transparent',
    }}
  >
    <span className="text-base flex-shrink-0">{getChannelEmoji(channel.name)}</span>
    <span className="truncate">{channel.name}</span>
  </button>
);

export default ChannelSidebar;
