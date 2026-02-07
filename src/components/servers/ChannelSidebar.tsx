import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Settings, Shield, Users, MoreHorizontal, Edit3, Trash2, ArrowUp, ArrowDown, FolderPlus, X, Hash } from 'lucide-react';

interface ChannelSidebarProps {
  nightMode: boolean;
  serverName: string;
  serverEmoji: string;
  serverId: string;
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
  onCreateCategory?: (name: string) => void;
  onRenameCategory?: (categoryId: string, newName: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onReorderCategories?: (orderedIds: string[]) => void;
  onUpdateChannel?: (channelId: string, updates: any) => void;
  onDeleteChannel?: (channelId: string) => void;
  unreadCounts?: Record<string, number>;
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
  nightMode, serverName, serverEmoji, serverId, categories, channels,
  activeChannelId, onSelectChannel, onCreateChannel, onOpenSettings, onOpenRoles, onOpenMembers,
  canManageChannels, fullWidth, onCreateCategory, onRenameCategory, onDeleteCategory, onReorderCategories,
  onUpdateChannel, onDeleteChannel, unreadCounts
}) => {
  // Persist collapse state in localStorage per server
  const storageKey = `lightning_collapsed_${serverId}`;
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Category management state
  const [contextMenu, setContextMenu] = useState<{ type: 'category' | 'channel'; id: string; x: number; y: number } | null>(null);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Channel editing state
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelTopic, setEditChannelTopic] = useState('');

  const renameInputRef = useRef<HTMLInputElement>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const channelEditNameRef = useRef<HTMLInputElement>(null);

  // Save collapse state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...collapsedCategories]));
    } catch { /* ignore */ }
  }, [collapsedCategories, storageKey]);

  // Focus rename input when editing
  useEffect(() => {
    if (renamingCategoryId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingCategoryId]);

  // Focus new category input
  useEffect(() => {
    if (showCreateCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [showCreateCategory]);

  // Focus channel edit input
  useEffect(() => {
    if (editingChannelId && channelEditNameRef.current) {
      channelEditNameRef.current.focus();
      channelEditNameRef.current.select();
    }
  }, [editingChannelId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick as any);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick as any);
    };
  }, [contextMenu]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // Context menu handlers
  const handleCategoryContextMenu = (e: React.MouseEvent, categoryId: string) => {
    if (!canManageChannels) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'category', id: categoryId, x: e.clientX, y: e.clientY });
  };

  const handleChannelContextMenu = (e: React.MouseEvent, channelId: string) => {
    if (!canManageChannels) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'channel', id: channelId, x: e.clientX, y: e.clientY });
  };

  const handleCategoryLongPress = (categoryId: string, e: React.TouchEvent) => {
    if (!canManageChannels) return;
    const touch = e.touches[0];
    const timer = setTimeout(() => {
      setContextMenu({ type: 'category', id: categoryId, x: touch.clientX, y: touch.clientY });
    }, 500);
    setLongPressTimer(timer);
  };

  const handleChannelLongPress = (channelId: string, e: React.TouchEvent) => {
    if (!canManageChannels) return;
    const touch = e.touches[0];
    const timer = setTimeout(() => {
      setContextMenu({ type: 'channel', id: channelId, x: touch.clientX, y: touch.clientY });
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleStartRename = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
      setRenamingCategoryId(categoryId);
      setRenameValue(cat.name);
    }
    setContextMenu(null);
  };

  const handleConfirmRename = () => {
    if (renamingCategoryId && renameValue.trim() && onRenameCategory) {
      onRenameCategory(renamingCategoryId, renameValue.trim());
    }
    setRenamingCategoryId(null);
    setRenameValue('');
  };

  const handleDeleteCategory = (categoryId: string) => {
    setContextMenu(null);
    if (onDeleteCategory && window.confirm('Delete this category? Channels inside will become uncategorized.')) {
      onDeleteCategory(categoryId);
    }
  };

  const handleMoveCategory = (categoryId: string, direction: 'up' | 'down') => {
    setContextMenu(null);
    if (!onReorderCategories) return;
    const sorted = [...categories].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(c => c.id === categoryId);
    if (direction === 'up' && idx > 0) {
      const newOrder = [...sorted];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      onReorderCategories(newOrder.map(c => c.id));
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const newOrder = [...sorted];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      onReorderCategories(newOrder.map(c => c.id));
    }
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim() && onCreateCategory) {
      onCreateCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowCreateCategory(false);
    }
  };

  // Channel editing handlers
  const handleStartEditChannel = (channelId: string) => {
    const ch = channels.find(c => c.id === channelId);
    if (ch) {
      setEditingChannelId(channelId);
      setEditChannelName(ch.name);
      setEditChannelTopic(ch.topic || '');
    }
    setContextMenu(null);
  };

  const handleSaveChannelEdit = () => {
    if (editingChannelId && editChannelName.trim() && onUpdateChannel) {
      onUpdateChannel(editingChannelId, {
        name: editChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        topic: editChannelTopic.trim() || null,
      });
    }
    setEditingChannelId(null);
    setEditChannelName('');
    setEditChannelTopic('');
  };

  const handleDeleteChannelClick = (channelId: string) => {
    setContextMenu(null);
    if (onDeleteChannel && window.confirm('Delete this channel? All messages will be permanently lost.')) {
      onDeleteChannel(channelId);
    }
  };

  // Group channels by category
  const uncategorizedChannels = channels.filter(c => !c.category_id);
  const categorizedGroups = [...categories]
    .sort((a, b) => a.position - b.position)
    .map(cat => ({
      ...cat,
      channels: channels.filter(c => c.category_id === cat.id).sort((a, b) => a.position - b.position)
    }));

  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);

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
                onContextMenu={(e) => handleChannelContextMenu(e, channel.id)}
                onLongPress={(e) => handleChannelLongPress(channel.id, e)}
                onTouchEnd={handleTouchEnd}
                unreadCount={unreadCounts?.[channel.id] || 0}
              />
            ))}
          </div>
        )}

        {/* Categorized channels */}
        {categorizedGroups.map((group) => (
          <div key={group.id}>
            {/* Category header */}
            <div className="flex items-center gap-1 px-2 mb-1.5 group">
              {renamingCategoryId === group.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename();
                      if (e.key === 'Escape') { setRenamingCategoryId(null); setRenameValue(''); }
                    }}
                    onBlur={handleConfirmRename}
                    className={`flex-1 text-xs font-semibold px-1.5 py-0.5 rounded-md outline-none ${
                      nightMode
                        ? 'bg-white/10 text-white border border-white/20 focus:border-blue-400'
                        : 'bg-white/60 text-black border border-black/10 focus:border-blue-500'
                    }`}
                    maxLength={30}
                  />
                </div>
              ) : (
                <>
                  <button
                    onClick={() => toggleCategory(group.id)}
                    onContextMenu={(e) => handleCategoryContextMenu(e, group.id)}
                    onTouchStart={(e) => handleCategoryLongPress(group.id, e)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className={`flex items-center gap-1.5 flex-1 text-xs font-semibold uppercase tracking-wide ${
                      nightMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                    } transition-colors`}
                  >
                    {collapsedCategories.has(group.id) ? (
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="truncate">{group.name}</span>
                  </button>

                  {canManageChannels && (
                    <div className={`flex items-center gap-0.5 ${fullWidth ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <button
                        onClick={() => onCreateChannel(group.id)}
                        className={`p-0.5 rounded transition-all ${
                          nightMode ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-black/30 hover:text-black/60 hover:bg-black/5'
                        }`}
                        title="Add channel"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleCategoryContextMenu(e, group.id)}
                        className={`p-0.5 rounded transition-all ${
                          nightMode ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-black/30 hover:text-black/60 hover:bg-black/5'
                        }`}
                        title="Category options"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Channels in category */}
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
                    onContextMenu={(e) => handleChannelContextMenu(e, channel.id)}
                    onLongPress={(e) => handleChannelLongPress(channel.id, e)}
                    onTouchEnd={handleTouchEnd}
                    unreadCount={unreadCounts?.[channel.id] || 0}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Create new category inline form */}
        {showCreateCategory && (
          <div className="px-2 py-1.5">
            <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
              nightMode ? 'bg-white/5 border border-white/10' : 'bg-white/50 border border-black/5'
            }`}>
              <input
                ref={newCategoryInputRef}
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCategory();
                  if (e.key === 'Escape') { setShowCreateCategory(false); setNewCategoryName(''); }
                }}
                placeholder="Category name..."
                className={`flex-1 text-xs font-semibold bg-transparent outline-none placeholder:opacity-40 ${
                  nightMode ? 'text-white' : 'text-black'
                }`}
                maxLength={30}
              />
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                className={`text-xs font-semibold px-2 py-0.5 rounded transition-all ${
                  newCategoryName.trim()
                    ? 'text-blue-500 hover:bg-blue-500/10'
                    : nightMode ? 'text-white/20' : 'text-black/20'
                }`}
              >
                Add
              </button>
              <button
                onClick={() => { setShowCreateCategory(false); setNewCategoryName(''); }}
                className={`p-0.5 rounded transition-all ${
                  nightMode ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom settings bar */}
      <div
        className="px-3 py-2.5 space-y-1"
        style={{
          borderTop: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          background: nightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)',
        }}
      >
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
            {onCreateCategory && (
              <button
                onClick={() => setShowCreateCategory(true)}
                className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                  nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
                }`}
                title="Create Category"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}
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

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)} />
          <div
            ref={contextMenuRef}
            className={`fixed z-[101] rounded-xl shadow-xl border overflow-hidden ${
              nightMode ? 'border-white/10' : 'border-black/10'
            }`}
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 180),
              top: Math.min(contextMenu.y, window.innerHeight - 200),
              minWidth: '160px',
              background: nightMode ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {contextMenu.type === 'category' ? (
              <>
                <button
                  onClick={() => handleStartRename(contextMenu.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                    nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                  }`}
                >
                  <Edit3 className="w-4 h-4" /> Rename
                </button>

                {(() => {
                  const idx = sortedCategories.findIndex(c => c.id === contextMenu.id);
                  return (
                    <>
                      {idx > 0 && (
                        <button
                          onClick={() => handleMoveCategory(contextMenu.id, 'up')}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                            nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                          }`}
                        >
                          <ArrowUp className="w-4 h-4" /> Move Up
                        </button>
                      )}
                      {idx < sortedCategories.length - 1 && (
                        <button
                          onClick={() => handleMoveCategory(contextMenu.id, 'down')}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                            nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                          }`}
                        >
                          <ArrowDown className="w-4 h-4" /> Move Down
                        </button>
                      )}
                    </>
                  );
                })()}

                <button
                  onClick={() => { setContextMenu(null); onCreateChannel(contextMenu.id); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                    nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Add Channel
                </button>

                <div className={`mx-2 ${nightMode ? 'border-t border-white/10' : 'border-t border-black/10'}`} />

                <button
                  onClick={() => handleDeleteCategory(contextMenu.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                    nightMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Delete Category
                </button>
              </>
            ) : (
              /* Channel context menu */
              <>
                {onUpdateChannel && (
                  <button
                    onClick={() => handleStartEditChannel(contextMenu.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                      nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" /> Edit Channel
                  </button>
                )}

                {onDeleteChannel && (
                  <>
                    <div className={`mx-2 ${nightMode ? 'border-t border-white/10' : 'border-t border-black/10'}`} />
                    <button
                      onClick={() => handleDeleteChannelClick(contextMenu.id)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                        nightMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" /> Delete Channel
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Channel edit modal */}
      {editingChannelId && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/30" onClick={() => { setEditingChannelId(null); setEditChannelName(''); setEditChannelTopic(''); }} />
          <div
            className="fixed z-[101] rounded-2xl shadow-2xl p-5 w-[90%] max-w-sm"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: nightMode ? 'rgba(20, 20, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            }}
          >
            <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${nightMode ? 'text-white' : 'text-black'}`}>
              <Hash className="w-4 h-4" /> Edit Channel
            </h3>

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${nightMode ? 'text-white/50' : 'text-black/50'}`}>Name</label>
                <input
                  ref={channelEditNameRef}
                  type="text"
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveChannelEdit(); }}
                  className={`w-full px-3 py-2 rounded-xl text-sm ${nightMode ? 'text-white bg-white/10 border border-white/15' : 'text-black bg-white/60 border border-black/08'}`}
                  maxLength={30}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${nightMode ? 'text-white/50' : 'text-black/50'}`}>
                  Topic <span className={`font-normal ${nightMode ? 'text-white/25' : 'text-black/25'}`}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={editChannelTopic}
                  onChange={(e) => setEditChannelTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveChannelEdit(); }}
                  placeholder="Channel topic..."
                  className={`w-full px-3 py-2 rounded-xl text-sm ${nightMode ? 'text-white placeholder-white/25 bg-white/10 border border-white/15' : 'text-black placeholder-black/25 bg-white/60 border border-black/08'}`}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveChannelEdit}
                disabled={!editChannelName.trim()}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #4F96FF 0%, #2563eb 100%)' }}
              >
                Save
              </button>
              <button
                onClick={() => { setEditingChannelId(null); setEditChannelName(''); setEditChannelTopic(''); }}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  nightMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/5 text-black hover:bg-black/10'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Individual channel item with unread badge
const ChannelItem: React.FC<{
  channel: { id: string; name: string; topic?: string };
  isActive: boolean;
  nightMode: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onLongPress?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
  unreadCount?: number;
}> = ({ channel, isActive, nightMode, onClick, onContextMenu, onLongPress, onTouchEnd, unreadCount }) => {
  const hasUnread = (unreadCount || 0) > 0;

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      onTouchStart={onLongPress}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all ${
        isActive
          ? 'font-semibold'
          : hasUnread
            ? nightMode ? 'text-white font-semibold' : 'text-black font-semibold'
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
      <span className="truncate flex-1 text-left">{channel.name}</span>

      {/* Unread badge */}
      {hasUnread && !isActive && (
        <span
          className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 px-1"
          style={{
            background: 'linear-gradient(135deg, #4F96FF 0%, #2563eb 100%)',
            boxShadow: '0 1px 4px rgba(59, 130, 246, 0.3)',
          }}
        >
          {(unreadCount || 0) > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default ChannelSidebar;
