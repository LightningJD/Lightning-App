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
      // Refresh server list and auto-select the new server
      const refreshed = await getUserServers(profile.supabaseId);
      setServers((refreshed || []) as Server[]);
      setSelectedServerId(result.id);
      onActiveServerChange?.(name, iconEmoji);
      setView('server');
      setShowCreateServer(false);
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
            <p className={`text-sm font-semibold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Direct Messages
            </p>
            <button
              onClick={() => {
                setDmStartChatWith(null);
                setSelectedConversation(null);
                setView('dm');
              }}
              className={`p-1.5 rounded-lg transition-colors ${nightMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/5 text-slate-500'}`}
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
                Connect with others in the Find tab to start messaging!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Active conversations */}
              {dmConversations.map((convo) => (
                <div
                  key={convo.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    nightMode
                      ? 'hover:bg-white/5'
                      : 'hover:bg-white/30'
                  }`}
                  style={nightMode ? {} : {
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  {/* Avatar - tappable to view profile */}
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
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl overflow-hidden ${
                      nightMode ? 'bg-white/10' : 'bg-white/50'
                    }`}
                    style={{ boxShadow: nightMode ? 'none' : '0 1px 3px rgba(0,0,0,0.1)' }}
                    >
                      {convo.avatarImage ? (
                        <img src={convo.avatarImage} alt={convo.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        convo.avatar || '👤'
                      )}
                    </div>
                    {convo.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2"
                           style={{ borderColor: nightMode ? '#1a1a2e' : '#f0f4ff' }}
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
                      <p className={`font-semibold text-sm truncate ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {convo.name}
                      </p>
                      <span className={`text-[10px] flex-shrink-0 ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {convo.timestamp ? formatTimestamp(convo.timestamp) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {convo.lastMessage || 'No messages yet'}
                      </p>
                      {(convo.unreadCount || 0) > 0 && (
                        <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white">{convo.unreadCount}</span>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              ))}

              {/* Friends without conversations */}
              {friendsWithoutConvos.length > 0 && (
                <>
                  <div className={`px-1 pt-3 pb-1`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Friends
                    </p>
                  </div>
                  {friendsWithoutConvos.map((friend) => (
                    <div
                      key={friend.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                        nightMode ? 'hover:bg-white/5' : 'hover:bg-white/30'
                      }`}
                      style={nightMode ? {} : {
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                      }}
                    >
                      {/* Avatar */}
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
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl overflow-hidden ${
                          nightMode ? 'bg-white/10' : 'bg-white/50'
                        }`}
                        style={{ boxShadow: nightMode ? 'none' : '0 1px 3px rgba(0,0,0,0.1)' }}
                        >
                          {friend.avatarImage ? (
                            <img src={friend.avatarImage} alt={friend.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            friend.avatar || '👤'
                          )}
                        </div>
                        {friend.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2"
                               style={{ borderColor: nightMode ? '#1a1a2e' : '#f0f4ff' }}
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
                        <p className={`font-semibold text-sm truncate ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {friend.name}
                        </p>
                        <p className={`text-xs ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
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
    <div className="flex" style={{ height: 'calc(100vh - 7.5rem)' }}>
      {/* Server Rail (hidden on mobile when in DM/server chat) */}
      {showRail && <div
        className={`w-[72px] flex-shrink-0 flex flex-col items-center py-3 gap-1.5 overflow-y-auto border-r ${
          nightMode ? 'border-white/10' : 'border-white/20'
        }`}
        style={nightMode ? {
          background: 'rgba(0, 0, 0, 0.3)',
        } : {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* DM Button */}
        <button
          onClick={handleSwitchToDms}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
            isDmActive
              ? nightMode
                ? 'bg-blue-500/30 text-blue-300'
                : 'bg-blue-500/20 text-blue-600'
              : nightMode
                ? 'bg-white/10 hover:bg-white/15 text-slate-400 hover:text-slate-200 hover:rounded-xl'
                : 'bg-white/30 hover:bg-white/50 text-slate-500 hover:text-slate-700 hover:rounded-xl'
          }`}
          style={isDmActive ? {
            boxShadow: nightMode ? '0 0 12px rgba(59, 130, 246, 0.2)' : '0 0 12px rgba(59, 130, 246, 0.15)',
          } : {}}
          title="Direct Messages"
        >
          <MessageCircle className="w-5 h-5" />
        </button>

        {/* Divider */}
        {servers.length > 0 && (
          <div className={`w-8 h-[2px] rounded-full my-1 ${nightMode ? 'bg-white/10' : 'bg-black/10'}`} />
        )}

        {/* Server Icons */}
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => handleSelectServer(server)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all active:scale-95 hover:rounded-xl ${
              view === 'server' && selectedServerId === server.id
                ? nightMode
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-blue-500/20 text-blue-600'
                : nightMode
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-white/30 hover:bg-white/50'
            }`}
            style={view === 'server' && selectedServerId === server.id
              ? { boxShadow: nightMode ? '0 0 12px rgba(59, 130, 246, 0.2)' : '0 0 12px rgba(59, 130, 246, 0.15)' }
              : { boxShadow: nightMode ? 'none' : '0 1px 3px rgba(0,0,0,0.1)' }
            }
            title={server.name}
          >
            {server.icon_url ? (
              <img src={server.icon_url} alt={server.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              server.icon_emoji || '⛪'
            )}
          </button>
        ))}

        {/* Divider before + button */}
        <div className={`w-8 h-[2px] rounded-full my-1 ${nightMode ? 'bg-white/10' : 'bg-black/10'}`} />

        {/* Add a Server button */}
        <button
          onClick={() => setShowCreateServer(true)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 hover:rounded-xl ${
            nightMode ? 'bg-white/10 hover:bg-green-500/30 text-green-400 hover:text-green-300' : 'bg-white/30 hover:bg-green-500/20 text-green-600 hover:text-green-700'
          }`}
          title="Add a Server"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>}

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
