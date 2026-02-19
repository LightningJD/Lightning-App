import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MessageCircle } from 'lucide-react';
import { useUserProfile } from './useUserProfile';
import { getUserConversations, getUserServers, createServer, getFriends, subscribeToMessages, unsubscribe, isUserBlocked, isBlockedBy } from '../lib/database';
import { showError } from '../lib/toast';
import MessagesTab from './MessagesTab';
import ServersTab from './servers/ServersTab';
import CreateServerDialog from './servers/CreateServerDialog';
import OtherUserProfileDialog from './OtherUserProfileDialog';
import { ConversationSkeleton } from './SkeletonLoader';

// ============================================
// TYPES
// ============================================

interface ChatTabProps {
  nightMode: boolean;
  onConversationsCountChange?: (count: number) => void;
  startChatWith?: { id: string; name: string; avatar?: string } | null;
  onStartChatConsumed?: () => void;
  onActiveServerChange?: (serverName: string | null, serverEmoji?: string) => void;
}

interface Conversation {
  id: number | string;
  userId: string;
  name: string;
  avatar: string;
  avatarImage?: string;
  lastMessage: string;
  timestamp: string;
  online?: boolean;
  unreadCount?: number;
}

interface Server {
  id: string;
  name: string;
  description?: string;
  icon_emoji: string;
  icon_url?: string;
  creator_id: string;
}

type ChatView = 'list' | 'dm' | 'server';

// ============================================
// HELPERS
// ============================================

const formatTimestamp = (timestamp: any): string => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yday';
  if (diffDays < 7) return `${diffDays}d`;
  return messageDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ============================================
// GRADIENT PALETTE & HELPERS
// ============================================

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #e05c6c, #e8b84a)',
  'linear-gradient(135deg, #5cc88a, #4ab8c4)',
  'linear-gradient(135deg, #e8b84a, #e05c6c)',
  'linear-gradient(135deg, #7b76e0, #9b96f5)',
  'linear-gradient(135deg, #6b9ed6, #4a7ab8)',
  'linear-gradient(135deg, #f6c744, #e8a020)',
  'linear-gradient(135deg, #5cc88a, #2a9d5c)',
  'linear-gradient(135deg, #4facfe, #e05c6c)',
];

const getGradient = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const getInitials = (name: string): string => {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
};

// Double-bubble SVG for DM rail button
const DoubleBubbleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8h2a2 2 0 0 1 2 2v6l-3-3h-5a2 2 0 0 1-2-2v-1" />
    <path d="M3 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7l-4 4V5z" />
  </svg>
);

// ============================================
// COMPONENT
// ============================================

const ChatTab: React.FC<ChatTabProps> = ({
  nightMode,
  onConversationsCountChange,
  startChatWith,
  onStartChatConsumed,
  onActiveServerChange,
}) => {
  const { profile } = useUserProfile();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // View state
  const [view, setView] = useState<ChatView>('list');
  const [dmConversations, setDmConversations] = useState<Conversation[]>([]);
  const [friendsWithoutConvos, setFriendsWithoutConvos] = useState<Array<{ id: string; name: string; avatar: string; avatarImage?: string; online?: boolean }>>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected items
  const [selectedConversation, setSelectedConversation] = useState<{ id: string | number; userId: string } | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  // For passing through to MessagesTab when a new chat is needed
  const [dmStartChatWith, setDmStartChatWith] = useState<{ id: string; name: string; avatar?: string; avatarImage?: string; online?: boolean } | null>(null);

  // For viewing a user's profile
  const [viewingUser, setViewingUser] = useState<any>(null);

  // Create server dialog
  const [showCreateServer, setShowCreateServer] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!profile?.supabaseId) {
      setIsLoading(false);
      return;
    }

    try {
      const [convos, srvs, friends] = await Promise.all([
        getUserConversations(profile.supabaseId),
        getUserServers(profile.supabaseId),
        getFriends(profile.supabaseId),
      ]);

      // Filter blocked users from conversations
      const filteredConvos: Conversation[] = [];
      for (const c of convos || []) {
        let blocked = false;
        let blockedBy = false;
        try {
          blocked = await isUserBlocked(profile.supabaseId, c.userId || c.id);
          blockedBy = await isBlockedBy(profile.supabaseId, c.userId || c.id);
        } catch {}
        if (!blocked && !blockedBy) {
          filteredConvos.push(c as Conversation);
        }
      }

      setDmConversations(filteredConvos);
      setServers((srvs || []) as Server[]);

      // Find friends who don't have an existing conversation
      const convoUserIds = new Set(filteredConvos.map(c => String(c.userId)));
      const friendsNoConvo = (friends || [])
        .filter((f: any) => !convoUserIds.has(String(f.id)))
        .map((f: any) => ({
          id: f.id,
          name: f.display_name || f.username || 'User',
          avatar: f.avatar_emoji || '👤',
          avatarImage: f.avatar_url,
          online: f.is_online,
        }));
      setFriendsWithoutConvos(friendsNoConvo);

      // Report unread count
      const totalUnread = filteredConvos.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      onConversationsCountChange?.(totalUnread);
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.supabaseId, onConversationsCountChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Real-time subscriptions ─────────────────────────────────

  useEffect(() => {
    if (!profile?.supabaseId) return;

    const channel = subscribeToMessages(profile.supabaseId, () => {
      // Reload conversations when new messages arrive
      loadData();
    });

    return () => {
      if (channel) unsubscribe(channel);
    };
  }, [profile?.supabaseId, loadData]);

  // ── Handle startChatWith from Find tab ───────────────────

  useEffect(() => {
    if (startChatWith?.id && startChatWith?.name) {
      // Check if we already have a conversation with this user
      const existingConvo = dmConversations.find(c => String(c.userId) === String(startChatWith.id));
      if (existingConvo) {
        setSelectedConversation({ id: existingConvo.id, userId: existingConvo.userId });
        setView('dm');
      } else {
        // Open MessagesTab with startChatWith to create new conversation
        setDmStartChatWith(startChatWith);
        setSelectedConversation(null);
        setView('dm');
      }
      // Signal that we've consumed the startChatWith so App.tsx clears it
      onStartChatConsumed?.();
    }
  }, [startChatWith, dmConversations, onStartChatConsumed]);

  // ── Navigation handlers ───────────────────────────────────

  const handleSwitchToDms = useCallback(() => {
    setView('list');
    setSelectedServerId(null);
    setSelectedConversation(null);
    setDmStartChatWith(null);
    onActiveServerChange?.(null);
    loadData();
  }, [loadData, onActiveServerChange]);

  const handleSelectServer = useCallback((server: Server) => {
    setSelectedServerId(server.id);
    onActiveServerChange?.(server.name, server.icon_emoji);
    setView('server');
  }, [onActiveServerChange]);

  const handleBackFromDm = useCallback(() => {
    setView('list');
    setSelectedConversation(null);
    setDmStartChatWith(null);
    onActiveServerChange?.(null);
    loadData();
  }, [loadData, onActiveServerChange]);

  const handleBackFromServer = useCallback(() => {
    setView('list');
    setSelectedServerId(null);
    onActiveServerChange?.(null);
    loadData();
  }, [loadData, onActiveServerChange]);

  // ── Create server handler ────────────────────────────────

  const handleCreateServer = useCallback(async (name: string, description: string, iconEmoji: string): Promise<boolean> => {
    if (!profile?.supabaseId) {
      showError('Profile not loaded yet. Please wait a moment and try again.');
      return false;
    }
    const result = await createServer(profile.supabaseId, { name, description, iconEmoji });
    if (result) {
      // Add server immediately so it's available right away
      const newServer = { ...result, userRole: { name: 'Owner' }, member_count: 1 } as Server;
      setServers(prev => [...prev, newServer]);
      setSelectedServerId(result.id);
      onActiveServerChange?.(name, iconEmoji);
      setView('server');
      setShowCreateServer(false);
      // Refresh in background for complete data
      getUserServers(profile.supabaseId).then(refreshed => {
        if (refreshed && refreshed.length > 0) setServers(refreshed as Server[]);
      });
      return true;
    }
    showError('Failed to create server. Please try again.');
    return false;
  }, [profile?.supabaseId, onActiveServerChange]);

  // ── Determine active rail item ────────────────────────────

  const isDmActive = view === 'list' || view === 'dm';

  // ── Render main panel content ─────────────────────────────

  const renderMainPanel = () => {
    if (view === 'dm') {
      return (
        <MessagesTab
          nightMode={nightMode}
          onConversationsCountChange={onConversationsCountChange}
          startChatWith={dmStartChatWith}
          initialConversation={selectedConversation}
          onBack={handleBackFromDm}
        />
      );
    }

    if (view === 'server' && selectedServerId) {
      return (
        <ServersTab
          nightMode={nightMode}
          initialServerId={selectedServerId}
          onBack={handleBackFromServer}
          onActiveServerChange={onActiveServerChange}
          hideServerRail
        />
      );
    }

    // Default: DM conversation list
    return (
      <div className="overflow-y-auto h-full">
        <div className="px-4 py-3">
          {/* Direct Messages Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest font-medium" style={{
              color: nightMode ? '#5d5877' : '#4a5e88',
            }}>
              Direct Messages
            </div>
            <button
              onClick={() => {
                setDmStartChatWith(null);
                setSelectedConversation(null);
                setView('dm');
              }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: nightMode ? '#7b76e0' : '#4facfe' }}
              title="New message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <ConversationSkeleton key={i} nightMode={nightMode} />
              ))}
            </div>
          ) : dmConversations.length === 0 && friendsWithoutConvos.length === 0 ? (
            <div
              className={`rounded-xl border p-8 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <MessageCircle className={`w-12 h-12 mx-auto mb-3 ${nightMode ? 'text-white/20' : 'text-black/20'}`} />
              <p className={`font-semibold text-base mb-1 ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                No conversations yet
              </p>
              <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Connect with others in the Charge tab to start messaging!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Active conversations */}
              {dmConversations.map((convo) => (
                <div
                  key={convo.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg transition-all cursor-pointer hover:brightness-110"
                  style={nightMode ? {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: '3px',
                  } : {
                    background: 'rgba(255,255,255,0.35)',
                    border: '1px solid rgba(150,165,225,0.1)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 1px 4px rgba(150,165,225,0.05)',
                    marginBottom: '3px',
                  }}
                >
                  {/* Avatar - gradient circle with letter initial */}
                  <button
                    className="relative flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingUser({
                        id: convo.userId,
                        displayName: convo.name,
                        avatar: convo.avatar,
                        avatarImage: convo.avatarImage,
                        online: convo.online,
                      });
                    }}
                    aria-label={`View ${convo.name}'s profile`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                      style={{
                        background: convo.avatarImage ? undefined : getGradient(String(convo.userId || convo.id)),
                        color: 'white',
                        fontSize: '14px',
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 500,
                      }}
                    >
                      {convo.avatarImage ? (
                        <img src={convo.avatarImage} alt={convo.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(convo.name || 'U')
                      )}
                    </div>
                    {convo.online && (
                      <div
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                        style={{
                          background: '#5cc88a',
                          border: `2px solid ${nightMode ? '#0d0b18' : '#d6daf5'}`,
                        }}
                      />
                    )}
                  </button>

                  {/* Content - tappable to open chat */}
                  <button
                    className="flex-1 min-w-0 text-left active:scale-[0.98] transition-all"
                    onClick={() => {
                      setSelectedConversation({ id: convo.id, userId: convo.userId });
                      setDmStartChatWith(null);
                      setView('dm');
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[13px] truncate" style={{
                        color: nightMode ? '#e8e5f2' : '#1e2b4a',
                      }}>
                        {convo.name}
                      </p>
                      <span className="text-[10px] flex-shrink-0" style={{
                        color: nightMode ? '#5d5877' : '#8e9ec0',
                      }}>
                        {convo.timestamp ? formatTimestamp(convo.timestamp) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[11px] truncate" style={{
                        color: nightMode ? '#5d5877' : '#8e9ec0',
                      }}>
                        {convo.lastMessage || 'No messages yet'}
                      </p>
                      {(convo.unreadCount || 0) > 0 && (
                        <div
                          className="flex-shrink-0 min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5"
                          style={{ background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700 }}
                        >
                          {convo.unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              ))}

              {/* Friends without conversations */}
              {friendsWithoutConvos.length > 0 && (
                <>
                  <div className="px-1 pt-3 pb-1">
                    <div className="text-[10px] uppercase tracking-widest font-medium" style={{
                      color: nightMode ? '#5d5877' : '#4a5e88',
                    }}>
                      Friends
                    </div>
                  </div>
                  {friendsWithoutConvos.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg transition-all cursor-pointer hover:brightness-110"
                      style={nightMode ? {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        marginBottom: '3px',
                      } : {
                        background: 'rgba(255,255,255,0.35)',
                        border: '1px solid rgba(150,165,225,0.1)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        boxShadow: '0 1px 4px rgba(150,165,225,0.05)',
                        marginBottom: '3px',
                      }}
                    >
                      {/* Avatar - gradient circle with initial */}
                      <button
                        className="relative flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingUser({
                            id: friend.id,
                            displayName: friend.name,
                            avatar: friend.avatar,
                            avatarImage: friend.avatarImage,
                            online: friend.online,
                          });
                        }}
                        aria-label={`View ${friend.name}'s profile`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                          style={{
                            background: friend.avatarImage ? undefined : getGradient(String(friend.id)),
                            color: 'white',
                            fontSize: '14px',
                            fontFamily: "'Playfair Display', serif",
                            fontWeight: 500,
                          }}
                        >
                          {friend.avatarImage ? (
                            <img src={friend.avatarImage} alt={friend.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitials(friend.name || 'U')
                          )}
                        </div>
                        {friend.online && (
                          <div
                            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                            style={{
                              background: '#5cc88a',
                              border: `2px solid ${nightMode ? '#0d0b18' : '#d6daf5'}`,
                            }}
                          />
                        )}
                      </button>

                      {/* Name - tappable to start chat */}
                      <button
                        className="flex-1 min-w-0 text-left active:scale-[0.98] transition-all"
                        onClick={() => {
                          setDmStartChatWith({ id: friend.id, name: friend.name, avatar: friend.avatar, avatarImage: friend.avatarImage, online: friend.online });
                          setSelectedConversation(null);
                          setView('dm');
                        }}
                      >
                        <p className="font-semibold text-[13px] truncate" style={{
                          color: nightMode ? '#e8e5f2' : '#1e2b4a',
                        }}>
                          {friend.name}
                        </p>
                        <p className="text-[11px]" style={{
                          color: nightMode ? '#5d5877' : '#8e9ec0',
                        }}>
                          Tap to message
                        </p>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Single layout with persistent server rail ─────────────

  // On mobile, hide the server rail when inside a DM or server chat (full-screen chat like Discord)
  const showRail = !isMobile || view === 'list';

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7.5rem)' }}>
      {/* Horizontal Rail (hidden on mobile when in DM/server chat) */}
      {showRail && (
        <div
          className="flex items-center gap-2 px-3 py-2 overflow-x-auto flex-shrink-0 hide-scrollbar"
          style={{
            borderBottom: nightMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(150,165,225,0.1)',
          }}
        >
          {/* DM Button */}
          <button
            onClick={handleSwitchToDms}
            className="flex-shrink-0 flex items-center justify-center transition-all active:scale-95"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: isDmActive ? '12px' : '50%',
              background: isDmActive
                ? nightMode ? 'rgba(123,118,224,0.15)' : 'rgba(79,172,254,0.12)'
                : nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
              border: isDmActive
                ? nightMode ? '1.5px solid rgba(123,118,224,0.3)' : '1.5px solid rgba(79,172,254,0.25)'
                : nightMode ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(150,165,225,0.15)',
              boxShadow: isDmActive
                ? nightMode ? '0 0 10px rgba(123,118,224,0.15)' : '0 0 10px rgba(79,172,254,0.12)'
                : nightMode ? 'none' : '0 2px 6px rgba(150,165,225,0.07)',
              color: isDmActive
                ? nightMode ? '#9b96f5' : '#2b6cb0'
                : nightMode ? '#8e89a8' : '#4a5e88',
            }}
            title="Direct Messages"
          >
            <DoubleBubbleIcon className="w-5 h-5" />
          </button>

          {/* Server Icons — gradient circle with letter initials */}
          {servers.map((server) => {
            const isActive = view === 'server' && selectedServerId === server.id;
            const gradient = getGradient(server.id);
            const initials = getInitials(server.name);
            return (
              <button
                key={server.id}
                onClick={() => handleSelectServer(server)}
                className="flex-shrink-0 flex items-center justify-center transition-all active:scale-95 relative"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: isActive ? '12px' : '50%',
                  background: server.icon_url ? undefined : gradient,
                  border: isActive
                    ? nightMode ? '1.5px solid rgba(123,118,224,0.3)' : '1.5px solid rgba(79,172,254,0.25)'
                    : '1.5px solid transparent',
                  boxShadow: isActive
                    ? nightMode ? '0 0 10px rgba(123,118,224,0.15)' : '0 0 10px rgba(79,172,254,0.12)'
                    : 'none',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  overflow: 'hidden',
                }}
                title={server.name}
              >
                {server.icon_url ? (
                  <img src={server.icon_url} alt={server.name} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </button>
            );
          })}

          {/* Create Server Button */}
          <button
            onClick={() => setShowCreateServer(true)}
            className="flex-shrink-0 flex items-center justify-center transition-all active:scale-95"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: nightMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.3)',
              border: nightMode ? '1.5px dashed rgba(123,118,224,0.3)' : '1.5px dashed rgba(79,172,254,0.3)',
              color: nightMode ? '#7b76e0' : '#4facfe',
              fontSize: '18px',
            }}
            title="Create Server"
          >
            +
          </button>
        </div>
      )}

      {/* Main Panel (changes based on view) */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderMainPanel()}
      </div>

      {/* Other User Profile Dialog */}
      {viewingUser && (
        <OtherUserProfileDialog
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          nightMode={nightMode}
          onMessage={(user: any) => {
            setViewingUser(null);
            const existingConvo = dmConversations.find(c => String(c.userId) === String(user.id));
            if (existingConvo) {
              setSelectedConversation({ id: existingConvo.id, userId: existingConvo.userId });
              setView('dm');
            } else {
              setDmStartChatWith({ id: user.id, name: user.displayName || user.name || 'User', avatar: user.avatar });
              setSelectedConversation(null);
              setView('dm');
            }
          }}
        />
      )}

      {/* Create Server Dialog */}
      <CreateServerDialog
        nightMode={nightMode}
        isOpen={showCreateServer}
        onClose={() => setShowCreateServer(false)}
        onCreate={handleCreateServer}
      />
    </div>
  );
};

export default ChatTab;
