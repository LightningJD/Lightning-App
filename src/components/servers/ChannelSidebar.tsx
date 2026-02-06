import React, { useState } from 'react';
import { Hash, ChevronDown, ChevronRight, Plus, Settings, Shield, Users } from 'lucide-react';

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
}

const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  nightMode, serverName, serverEmoji, categories, channels,
  activeChannelId, onSelectChannel, onCreateChannel, onOpenSettings, onOpenRoles, onOpenMembers, canManageChannels
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
        width: '200px',
        minWidth: '200px',
        background: nightMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.03)',
        borderRight: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
      }}
    >
      {/* Server name header */}
      <div
        className="px-4 py-3 flex items-center gap-2 border-b cursor-pointer hover:opacity-80 transition-opacity"
        style={{ borderColor: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        <span className="text-lg">{serverEmoji}</span>
        <h3 className={`font-bold text-sm truncate flex-1 ${nightMode ? 'text-white' : 'text-black'}`}>
          {serverName}
        </h3>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {/* Uncategorized channels */}
        {uncategorizedChannels.map(channel => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isActive={channel.id === activeChannelId}
            nightMode={nightMode}
            onClick={() => onSelectChannel(channel.id)}
          />
        ))}

        {/* Categorized channels */}
        {categorizedGroups.map(group => (
          <div key={group.id} className="mt-2">
            {/* Category header */}
            <div className="flex items-center gap-1 px-1 mb-0.5">
              <button
                onClick={() => toggleCategory(group.id)}
                className={`flex items-center gap-1 flex-1 text-[11px] font-semibold uppercase tracking-wider ${
                  nightMode ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
                } transition-colors`}
              >
                {collapsedCategories.has(group.id) ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {group.name}
              </button>
              {canManageChannels && (
                <button
                  onClick={() => onCreateChannel(group.id)}
                  className={`p-0.5 rounded opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity ${
                    nightMode ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Channels in category */}
            {!collapsedCategories.has(group.id) && group.channels.map(channel => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeChannelId}
                nightMode={nightMode}
                onClick={() => onSelectChannel(channel.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Bottom settings bar */}
      <div
        className="px-3 py-2 border-t space-y-1"
        style={{ borderColor: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        {/* Members button — always visible */}
        {onOpenMembers && (
          <button
            onClick={onOpenMembers}
            className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors ${
              nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Members
          </button>
        )}

        {/* Admin controls */}
        {canManageChannels && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => onCreateChannel()}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Channel
            </button>
            <div className="flex items-center gap-0.5">
              {onOpenRoles && (
                <button
                  onClick={onOpenRoles}
                  className={`p-1.5 rounded-lg transition-colors ${
                    nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
                  }`}
                  title="Manage Roles"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className={`p-1.5 rounded-lg transition-colors ${
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

// Individual channel item
const ChannelItem: React.FC<{
  channel: { id: string; name: string; topic?: string };
  isActive: boolean;
  nightMode: boolean;
  onClick: () => void;
}> = ({ channel, isActive, nightMode, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-all ${
      isActive
        ? nightMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
        : nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
    }`}
  >
    <Hash className="w-4 h-4 flex-shrink-0 opacity-60" />
    <span className="truncate font-medium">{channel.name}</span>
  </button>
);

export default ChannelSidebar;
