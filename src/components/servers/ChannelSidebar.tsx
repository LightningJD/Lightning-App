import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Settings, Shield, Users, MoreHorizontal, Edit3, Trash2, ArrowUp, ArrowDown, FolderPlus, X, Hash, BellOff, Lock, FolderInput, UserPlus, Check } from 'lucide-react';
import { useServerPremium } from '../../contexts/PremiumContext';
import ServerBannerDisplay from '../premium/ServerBannerDisplay';
import VerifiedBadge from '../premium/VerifiedBadge';
import TrialBanner from '../premium/TrialBanner';
import GracePeriodBanner from '../premium/GracePeriodBanner';

interface ChannelSidebarProps {
  nightMode: boolean;
  serverName: string;
  serverEmoji: string;
  serverId: string;
  categories: Array<{ id: string; name: string; position: number }>;
  channels: Array<{ id: string; name: string; topic?: string; category_id?: string; position: number; is_private?: boolean; emoji_icon?: string }>;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: (categoryId?: string) => void;
  onOpenSettings: () => void;
  onOpenRoles?: () => void;
  onOpenMembers?: () => void;
  onShareInvite?: () => void;
  canManageChannels: boolean;
  fullWidth?: boolean;
  onCreateCategory?: (name: string) => void;
  onRenameCategory?: (categoryId: string, newName: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onReorderCategories?: (orderedIds: string[]) => void;
  onUpdateChannel?: (channelId: string, updates: any) => void;
  onDeleteChannel?: (channelId: string) => void;
  onReorderChannels?: (orderedIds: string[], categoryId: string | null) => void;
  onMoveChannelToCategory?: (channelId: string, targetCategoryId: string | null) => void;
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
  onShareInvite, canManageChannels, fullWidth, onCreateCategory, onRenameCategory, onDeleteCategory,
  onReorderCategories, onUpdateChannel, onDeleteChannel, onReorderChannels, onMoveChannelToCategory, unreadCounts
}) => {
  const { premium, isPremium } = useServerPremium(serverId);

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
  const [editChannelPrivate, setEditChannelPrivate] = useState(false);
  const [editChannelEmoji, setEditChannelEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Move to Category submenu
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

  // Per-channel mute (localStorage)
  const muteStorageKey = `lightning_muted_${serverId}`;
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`lightning_muted_${serverId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Drag and drop state
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const [dragType, setDragType] = useState<'category' | 'channel' | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | 'inside' | null>(null);
  const [dragSourceCategoryId, setDragSourceCategoryId] = useState<string | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const channelEditNameRef = useRef<HTMLInputElement>(null);

  // Reload collapsed state when server changes and save on update
  const prevStorageKeyRef = useRef(storageKey);
  useEffect(() => {
    if (prevStorageKeyRef.current !== storageKey) {
      // Server changed: load the new server's collapsed state
      prevStorageKeyRef.current = storageKey;
      try {
        const saved = localStorage.getItem(storageKey);
        setCollapsedCategories(saved ? new Set(JSON.parse(saved)) : new Set());
      } catch {
        setCollapsedCategories(new Set());
      }
    } else {
      // Same server: persist the current state
      try {
        localStorage.setItem(storageKey, JSON.stringify([...collapsedCategories]));
      } catch { /* ignore */ }
    }
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

  // Close context menu on outside click (with delay to prevent immediate dismissal)
  const contextMenuOpenTimeRef = useRef<number>(0);
  useEffect(() => {
    if (!contextMenu) return;
    contextMenuOpenTimeRef.current = Date.now();
    const handleClick = (e: MouseEvent | TouchEvent) => {
      // Ignore clicks within 100ms of menu opening (prevents same-click dismissal)
      if (Date.now() - contextMenuOpenTimeRef.current < 100) return;
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        setShowMoveSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick as any);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick as any);
    };
  }, [contextMenu]);

  // Reload muted channels when server changes and save on update
  const prevMuteKeyRef = useRef(muteStorageKey);
  useEffect(() => {
    if (prevMuteKeyRef.current !== muteStorageKey) {
      prevMuteKeyRef.current = muteStorageKey;
      try {
        const saved = localStorage.getItem(muteStorageKey);
        setMutedChannels(saved ? new Set(JSON.parse(saved)) : new Set());
      } catch {
        setMutedChannels(new Set());
      }
    } else {
      try {
        localStorage.setItem(muteStorageKey, JSON.stringify([...mutedChannels]));
      } catch { /* ignore */ }
    }
  }, [mutedChannels, muteStorageKey]);

  const toggleMuteChannel = useCallback((channelId: string) => {
    setMutedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  }, []);

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
    e.preventDefault();
    e.stopPropagation();
    setShowMoveSubmenu(false);
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
    const touch = e.touches[0];
    const timer = setTimeout(() => {
      setShowMoveSubmenu(false);
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
      setEditChannelPrivate(ch.is_private || false);
      setEditChannelEmoji(ch.emoji_icon || '');
      setShowEmojiPicker(false);
    }
    setContextMenu(null);
  };

  const handleSaveChannelEdit = () => {
    if (editingChannelId && editChannelName.trim() && onUpdateChannel) {
      onUpdateChannel(editingChannelId, {
        name: editChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        topic: editChannelTopic.trim() || null,
        is_private: editChannelPrivate,
        emoji_icon: editChannelEmoji || null,
      });
    }
    setEditingChannelId(null);
    setEditChannelName('');
    setEditChannelTopic('');
    setEditChannelPrivate(false);
    setEditChannelEmoji('');
    setShowEmojiPicker(false);
  };

  const handleDeleteChannelClick = (channelId: string) => {
    setContextMenu(null);
    if (onDeleteChannel && window.confirm('Delete this channel? All messages will be permanently lost.')) {
      onDeleteChannel(channelId);
    }
  };

  // Channel reorder handlers
  const handleMoveChannel = (channelId: string, direction: 'up' | 'down') => {
    setContextMenu(null);
    if (!onReorderChannels) return;
    const ch = channels.find(c => c.id === channelId);
    if (!ch) return;
    const categoryId = ch.category_id || null;
    const siblings = channels
      .filter(c => (c.category_id || null) === categoryId)
      .sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex(c => c.id === channelId);
    if (direction === 'up' && idx > 0) {
      const newOrder = [...siblings];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      onReorderChannels(newOrder.map(c => c.id), categoryId);
    } else if (direction === 'down' && idx < siblings.length - 1) {
      const newOrder = [...siblings];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      onReorderChannels(newOrder.map(c => c.id), categoryId);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'category' | 'channel', id: string, sourceCategoryId?: string | null) => {
    if (!canManageChannels) return;
    setDragType(type);
    setDragId(id);
    setDragSourceCategoryId(sourceCategoryId ?? null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDragType(null);
    setDragId(null);
    setDragOverId(null);
    setDragOverPosition(null);
    setDragSourceCategoryId(null);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, targetType: 'category' | 'channel') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (dragType === 'channel' && targetType === 'category') {
      // Dropping channel on category header = move inside
      setDragOverId(targetId);
      setDragOverPosition('inside');
    } else {
      setDragOverId(targetId);
      setDragOverPosition(e.clientY < midY ? 'above' : 'below');
    }
  };

  const handleCategoryDrop = (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    if (!dragId) return;

    if (dragType === 'category' && onReorderCategories) {
      // Reorder categories
      const sorted = [...categories].sort((a, b) => a.position - b.position);
      const dragIdx = sorted.findIndex(c => c.id === dragId);
      const targetIdx = sorted.findIndex(c => c.id === targetCategoryId);
      if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) {
        setDragType(null); setDragId(null); setDragOverId(null); setDragOverPosition(null); setDragSourceCategoryId(null);
        return;
      }

      const newOrder = sorted.filter(c => c.id !== dragId);
      const insertIdx = dragOverPosition === 'above' ? targetIdx : targetIdx + 1;
      const adjustedIdx = dragIdx < targetIdx ? insertIdx - 1 : insertIdx;
      newOrder.splice(adjustedIdx, 0, sorted[dragIdx]);
      onReorderCategories(newOrder.map(c => c.id));
    } else if (dragType === 'channel' && onMoveChannelToCategory) {
      // Move channel to this category
      onMoveChannelToCategory(dragId, targetCategoryId);
    }

    setDragType(null);
    setDragId(null);
    setDragOverId(null);
    setDragOverPosition(null);
    setDragSourceCategoryId(null);
  };

  const handleChannelDrop = (e: React.DragEvent, targetChannelId: string, targetCategoryId: string | null) => {
    e.preventDefault();
    if (!dragId || dragType !== 'channel' || !onReorderChannels || dragId === targetChannelId) {
      setDragType(null); setDragId(null); setDragOverId(null); setDragOverPosition(null); setDragSourceCategoryId(null);
      return;
    }

    const siblings = channels
      .filter(c => (c.category_id || null) === targetCategoryId)
      .sort((a, b) => a.position - b.position);

    // If moving from a different category, add it to target
    const isFromDifferentCategory = dragSourceCategoryId !== targetCategoryId;
    let ordered: string[];

    if (isFromDifferentCategory) {
      // Remove from source list (handled by reorder), insert into target
      const filteredSiblings = siblings.filter(c => c.id !== dragId);
      const targetIdx = filteredSiblings.findIndex(c => c.id === targetChannelId);
      const insertIdx = dragOverPosition === 'above' ? targetIdx : targetIdx + 1;
      filteredSiblings.splice(insertIdx, 0, { id: dragId } as any);
      ordered = filteredSiblings.map(c => c.id);
    } else {
      // Same category reorder
      const filtered = siblings.filter(c => c.id !== dragId);
      const targetIdx = filtered.findIndex(c => c.id === targetChannelId);
      const insertIdx = dragOverPosition === 'above' ? targetIdx : targetIdx + 1;
      filtered.splice(insertIdx, 0, { id: dragId } as any);
      ordered = filtered.map(c => c.id);
    }

    onReorderChannels(ordered, targetCategoryId);
    setDragType(null);
    setDragId(null);
    setDragOverId(null);
    setDragOverPosition(null);
    setDragSourceCategoryId(null);
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
      {/* Premium banner */}
      {isPremium && premium.cosmetics?.banner_url && (
        <ServerBannerDisplay
          bannerUrl={premium.cosmetics.banner_url}
          serverName={serverName}
          nightMode={nightMode}
          className="h-24"
        />
      )}

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
            background: isPremium && premium.cosmetics?.accent_primary
              ? `linear-gradient(135deg, ${premium.cosmetics.accent_primary} 0%, ${premium.cosmetics.accent_secondary || premium.cosmetics.accent_primary} 100%)`
              : 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
          }}
        >
          {serverEmoji}
        </div>
        <h3 className={`font-bold text-sm truncate flex-1 ${nightMode ? 'text-white' : 'text-black'}`}>
          {serverName}
        </h3>
        {isPremium && premium.cosmetics?.is_verified && (
          <VerifiedBadge size="sm" />
        )}
      </div>

      {/* Trial / Grace Period banners */}
      {premium.status === 'trialing' && premium.daysUntilTrialEnd !== undefined && premium.daysUntilTrialEnd <= 7 && (
        <TrialBanner nightMode={nightMode} daysLeft={premium.daysUntilTrialEnd} />
      )}
      {premium.isPastDue && premium.subscription?.grace_period_end && (
        <GracePeriodBanner
          nightMode={nightMode}
          daysLeft={Math.max(0, Math.ceil((new Date(premium.subscription.grace_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
          onUpdatePayment={() => {
            // This would open the billing portal — we need the stripe_customer_id
            // For now, navigate to settings
            if (typeof onOpenSettings === 'function') onOpenSettings();
          }}
        />
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-2">
        {/* Uncategorized channels */}
        {uncategorizedChannels.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
            }}
          >
            {uncategorizedChannels.sort((a, b) => a.position - b.position).map(channel => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeChannelId}
                nightMode={nightMode}
                onClick={() => onSelectChannel(channel.id)}
                onContextMenu={(e) => handleChannelContextMenu(e, channel.id)}
                onOptionsClick={(e) => handleChannelContextMenu(e, channel.id)}
                onLongPress={(e) => handleChannelLongPress(channel.id, e)}
                onTouchEnd={handleTouchEnd}
                unreadCount={unreadCounts?.[channel.id] || 0}
                isMuted={mutedChannels.has(channel.id)}
                fullWidth={fullWidth}
                draggable={canManageChannels && !isTouchDevice}
                onDragStart={(e) => handleDragStart(e, 'channel', channel.id, null)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, channel.id, 'channel')}
                onDrop={(e) => handleChannelDrop(e, channel.id, null)}
                isDragOver={dragOverId === channel.id && dragType === 'channel'}
                dragOverPosition={dragOverId === channel.id ? dragOverPosition as 'above' | 'below' | null : null}
              />
            ))}
          </div>
        )}

        {/* Categorized channels */}
        {categorizedGroups.map((group) => (
          <div key={group.id}>
            {/* Category header */}
            <div
              className={`flex items-center gap-1 px-2 mb-1.5 group relative ${
                dragOverId === group.id && dragType === 'category' && dragOverPosition === 'above' ? 'border-t-2 border-blue-500' :
                dragOverId === group.id && dragType === 'category' && dragOverPosition === 'below' ? 'border-b-2 border-blue-500' :
                dragOverId === group.id && dragType === 'channel' && dragOverPosition === 'inside' ? 'bg-blue-500/10 rounded-lg' : ''
              }`}
              draggable={canManageChannels && !isTouchDevice}
              onDragStart={(e) => handleDragStart(e, 'category', group.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, group.id, 'category')}
              onDrop={(e) => handleCategoryDrop(e, group.id)}
            >
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
                    onDoubleClick={() => canManageChannels && handleStartRename(group.id)}
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({ type: 'category', id: group.id, x: rect.left, y: rect.bottom + 4 });
                        }}
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
                    onOptionsClick={(e) => handleChannelContextMenu(e, channel.id)}
                    onLongPress={(e) => handleChannelLongPress(channel.id, e)}
                    onTouchEnd={handleTouchEnd}
                    unreadCount={unreadCounts?.[channel.id] || 0}
                    isMuted={mutedChannels.has(channel.id)}
                    fullWidth={fullWidth}
                    draggable={canManageChannels && !isTouchDevice}
                    onDragStart={(e) => handleDragStart(e, 'channel', channel.id, group.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, channel.id, 'channel')}
                    onDrop={(e) => handleChannelDrop(e, channel.id, group.id)}
                    isDragOver={dragOverId === channel.id && dragType === 'channel'}
                    dragOverPosition={dragOverId === channel.id ? dragOverPosition as 'above' | 'below' | null : null}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Create new category inline form */}
        {showCreateCategory && (
          <div className="px-2 py-1.5">
            <div className={`flex items-center gap-1 rounded-lg px-1.5 py-1.5 ${
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
                className={`flex-1 min-w-0 text-xs font-semibold bg-transparent outline-none placeholder:opacity-40 ${
                  nightMode ? 'text-white' : 'text-black'
                }`}
                maxLength={30}
              />
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                className={`p-1 rounded transition-all flex-shrink-0 ${
                  newCategoryName.trim()
                    ? 'text-blue-500 hover:bg-blue-500/10'
                    : nightMode ? 'text-white/20' : 'text-black/20'
                }`}
                title="Add category"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setShowCreateCategory(false); setNewCategoryName(''); }}
                className={`p-1 rounded transition-all flex-shrink-0 ${
                  nightMode ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60'
                }`}
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
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
        <div className="flex items-center gap-1">
          {onOpenMembers && (
            <button
              onClick={onOpenMembers}
              className={`flex-1 flex items-center gap-2.5 text-xs px-3 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-95 ${
                nightMode ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-black/50 hover:text-black/80 hover:bg-black/5'
              }`}
            >
              <Users className="w-4 h-4" />
              Members
            </button>
          )}
          {onShareInvite && (
            <button
              onClick={onShareInvite}
              className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-black/40 hover:text-black/70 hover:bg-black/5'
              }`}
              title="Invite People"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>

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
          <div className="fixed inset-0 z-[100]" onClick={() => { setContextMenu(null); setShowMoveSubmenu(false); }} />
          <div
            ref={contextMenuRef}
            className={`fixed z-[101] rounded-xl shadow-xl border overflow-visible ${
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
                {canManageChannels && onUpdateChannel && (
                  <button
                    onClick={() => handleStartEditChannel(contextMenu.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                      nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" /> Edit Channel
                  </button>
                )}

                {/* Move Up/Down */}
                {canManageChannels && onReorderChannels && (() => {
                  const ch = channels.find(c => c.id === contextMenu.id);
                  if (!ch) return null;
                  const categoryId = ch.category_id || null;
                  const siblings = channels
                    .filter(c => (c.category_id || null) === categoryId)
                    .sort((a, b) => a.position - b.position);
                  const idx = siblings.findIndex(c => c.id === contextMenu.id);
                  return (
                    <>
                      {idx > 0 && (
                        <button
                          onClick={() => handleMoveChannel(contextMenu.id, 'up')}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                            nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                          }`}
                        >
                          <ArrowUp className="w-4 h-4" /> Move Up
                        </button>
                      )}
                      {idx < siblings.length - 1 && (
                        <button
                          onClick={() => handleMoveChannel(contextMenu.id, 'down')}
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

                {/* Move to Category */}
                {canManageChannels && onMoveChannelToCategory && categories.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                        nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                      }`}
                    >
                      <FolderInput className="w-4 h-4" /> Move to Category
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </button>
                    {showMoveSubmenu && (
                      <div
                        className={`absolute top-0 rounded-xl shadow-xl border overflow-hidden min-w-[140px] ${
                          nightMode ? 'border-white/10' : 'border-black/10'
                        }`}
                        style={{
                          ...(contextMenu.x + 320 > window.innerWidth
                            ? { right: '100%', marginRight: '4px' }
                            : { left: '100%', marginLeft: '4px' }),
                          background: nightMode ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                        }}
                      >
                        <button
                          onClick={() => { onMoveChannelToCategory(contextMenu.id, null); setContextMenu(null); setShowMoveSubmenu(false); }}
                          className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                            nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                          }`}
                        >
                          No Category
                        </button>
                        {[...categories].sort((a, b) => a.position - b.position).map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { onMoveChannelToCategory(contextMenu.id, cat.id); setContextMenu(null); setShowMoveSubmenu(false); }}
                            className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                              nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className={`mx-2 ${nightMode ? 'border-t border-white/10' : 'border-t border-black/10'}`} />

                {/* Mute/Unmute - available to ALL users */}
                <button
                  onClick={() => { toggleMuteChannel(contextMenu.id); setContextMenu(null); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                    nightMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
                  }`}
                >
                  <BellOff className="w-4 h-4" /> {mutedChannels.has(contextMenu.id) ? 'Unmute Channel' : 'Mute Channel'}
                </button>

                {canManageChannels && onDeleteChannel && (
                  <button
                    onClick={() => handleDeleteChannelClick(contextMenu.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                      nightMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" /> Delete Channel
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Channel edit modal */}
      {editingChannelId && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/30" onClick={() => { setEditingChannelId(null); setEditChannelName(''); setEditChannelTopic(''); setEditChannelPrivate(false); setEditChannelEmoji(''); setShowEmojiPicker(false); }} />
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all hover:scale-105 active:scale-95 ${
                      nightMode ? 'bg-white/10 border border-white/15 hover:bg-white/15' : 'bg-white/60 border border-black/08 hover:bg-white/80'
                    }`}
                    title="Choose emoji"
                  >
                    {editChannelEmoji || getChannelEmoji(editChannelName)}
                  </button>
                  <input
                    ref={channelEditNameRef}
                    type="text"
                    value={editChannelName}
                    onChange={(e) => setEditChannelName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveChannelEdit(); }}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm ${nightMode ? 'text-white bg-white/10 border border-white/15' : 'text-black bg-white/60 border border-black/08'}`}
                    maxLength={30}
                  />
                </div>
                {showEmojiPicker && (
                  <div className={`mt-2 p-2 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-black/05'}`}>
                    <div className="grid grid-cols-8 gap-1">
                      {['\u{1F4AC}', '\u{1F64F}', '\u{1F4D6}', '\u{1F3B5}', '\u{1F4E2}', '\u{1F44B}', '\u{1F4C5}', '\u{1F91D}',
                        '\u{2728}', '\u{1F389}', '\u{1F4F7}', '\u{1F517}', '\u{1F3A4}', '\u{1F31F}', '\u{1F54A}\u{FE0F}', '\u{26EA}',
                        '\u{2764}\u{FE0F}', '\u{1F525}', '\u{271D}\u{FE0F}', '\u{1F451}', '\u{1F6E1}\u{FE0F}', '\u{1F3AE}', '\u{1F4BB}', '\u{1F4DA}',
                        '\u{1F3A8}', '\u{1F30D}', '\u{1F680}', '\u{1F4A1}', '\u{1F3C6}', '\u{1F381}', '\u{1F4DD}', '\u{1F512}'
                      ].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => { setEditChannelEmoji(emoji); setShowEmojiPicker(false); }}
                          className={`text-lg p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${
                            editChannelEmoji === emoji
                              ? 'bg-blue-500/20 ring-1 ring-blue-500'
                              : nightMode ? 'hover:bg-white/10' : 'hover:bg-black/5'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {editChannelEmoji && (
                      <button
                        onClick={() => { setEditChannelEmoji(''); setShowEmojiPicker(false); }}
                        className={`mt-2 w-full text-xs py-1.5 rounded-lg transition-all ${
                          nightMode ? 'text-white/40 hover:bg-white/5' : 'text-black/40 hover:bg-black/5'
                        }`}
                      >
                        Reset to auto
                      </button>
                    )}
                  </div>
                )}
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

              {/* Privacy toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className={`w-4 h-4 ${nightMode ? 'text-white/50' : 'text-black/50'}`} />
                  <div>
                    <p className={`text-xs font-semibold ${nightMode ? 'text-white/70' : 'text-black/70'}`}>Private Channel</p>
                    <p className={`text-[10px] ${nightMode ? 'text-white/30' : 'text-black/30'}`}>Only visible to members with access</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditChannelPrivate(!editChannelPrivate)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${editChannelPrivate ? 'bg-blue-500' : (nightMode ? 'bg-white/20' : 'bg-black/20')}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${editChannelPrivate ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
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
                onClick={() => { setEditingChannelId(null); setEditChannelName(''); setEditChannelTopic(''); setEditChannelPrivate(false); setEditChannelEmoji(''); setShowEmojiPicker(false); }}
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

// Individual channel item with unread badge, DnD, mute indicator
const ChannelItem: React.FC<{
  channel: { id: string; name: string; topic?: string; is_private?: boolean; emoji_icon?: string };
  isActive: boolean;
  nightMode: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onOptionsClick?: (e: React.MouseEvent) => void;
  onLongPress?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
  unreadCount?: number;
  isMuted?: boolean;
  fullWidth?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  dragOverPosition?: 'above' | 'below' | null;
}> = ({ channel, isActive, nightMode, onClick, onContextMenu, onOptionsClick, onLongPress, onTouchEnd, unreadCount, isMuted, fullWidth, draggable, onDragStart, onDragEnd, onDragOver, onDrop, isDragOver, dragOverPosition }) => {
  const hasUnread = !isMuted && (unreadCount || 0) > 0;

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      onTouchStart={onLongPress}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      className={`group/channel w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all cursor-pointer ${
        isDragOver && dragOverPosition === 'above' ? 'border-t-2 border-blue-500' :
        isDragOver && dragOverPosition === 'below' ? 'border-b-2 border-blue-500' : ''
      } ${
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
      <span className="text-base flex-shrink-0">{channel.emoji_icon || getChannelEmoji(channel.name)}</span>
      <span className="truncate flex-1 text-left">{channel.name}</span>

      {/* Private indicator */}
      {channel.is_private && (
        <Lock className={`w-3 h-3 flex-shrink-0 ${nightMode ? 'text-white/30' : 'text-black/30'}`} />
      )}

      {/* Muted indicator */}
      {isMuted && (
        <BellOff className={`w-3 h-3 flex-shrink-0 ${nightMode ? 'text-white/30' : 'text-black/30'}`} />
      )}

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

      {/* 3-dots options button */}
      {onOptionsClick && (
        <button
          onClick={(e) => { e.stopPropagation(); onOptionsClick(e); }}
          className={`p-0.5 rounded flex-shrink-0 transition-all ${
            fullWidth ? 'opacity-70' : 'opacity-0 group-hover/channel:opacity-70'
          } ${
            nightMode ? 'text-white/40 hover:text-white/70 hover:bg-white/10' : 'text-black/40 hover:text-black/70 hover:bg-black/10'
          }`}
          title="Channel options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default ChannelSidebar;
