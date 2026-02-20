import React, { useState, useEffect, useRef } from "react";
import {
  Smile,
  Plus,
  X,
  Reply,
  Trash2,
  MoreVertical,
  UserX,
  Image as ImageIcon,
} from "lucide-react";
import {
  createGroup,
  sendGroupMessage,
  blockUser,
  sendMessage,
  getUserConversations,
  isUserBlocked,
  isBlockedBy,
  canSendMessage,
} from "../lib/database";
import { useUserProfile } from "./useUserProfile";
import { showError, showSuccess } from "../lib/toast";
import { ConversationSkeleton } from "./SkeletonLoader";
import { useGuestModalContext } from "../contexts/GuestModalContext";
import { isSupabaseConfigured } from "../lib/supabase";
import OtherUserProfileDialog from "./OtherUserProfileDialog";
import { useMessages } from "../hooks/useMessages";
import { useNewChat } from "../hooks/useNewChat";
import type { Message, Conversation } from "../hooks/useMessages";
import type { Connection } from "../hooks/useNewChat";

// ── Gradient avatar helpers ──────────────────────────────────────
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

// Helper function to format timestamp
const formatTimestamp = (timestamp: any): string => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return messageDate.toLocaleDateString();
};

// Helper function to decode HTML entities
const decodeHTMLEntities = (text: string): string => {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
};

interface MessagesTabProps {
  nightMode: boolean;
  onConversationsCountChange?: (count: number) => void;
  startChatWith?: {
    id: string;
    name: string;
    avatar?: string;
    avatarImage?: string;
    online?: boolean;
  } | null;
  initialConversation?: { id: string | number; userId: string } | null;
  onBack?: () => void;
}

const MessagesTab: React.FC<MessagesTabProps> = ({
  nightMode,
  onConversationsCountChange,
  startChatWith,
  initialConversation,
  onBack,
}) => {
  const { profile } = useUserProfile();
  const { isGuest, checkAndShowModal } = useGuestModalContext() as {
    isGuest: boolean;
    checkAndShowModal: () => void;
  };

  // ── Extracted hooks ──────────────────────────────────────
  const msg = useMessages({
    userId: profile?.supabaseId,
    profile: profile
      ? {
          supabaseId: profile.supabaseId,
          username: profile.username,
          displayName: profile.displayName,
          avatar: profile.avatar,
        }
      : undefined,
    initialConversationId: initialConversation?.id,
    onConversationsCountChange,
  });

  const {
    activeChat,
    setActiveChat,
    messages,
    conversations,
    setConversations,
    loading,
    isInitialLoad,
    messageReactions,
    showReactionPicker,
    setShowReactionPicker,
    showAllEmojis,
    setShowAllEmojis,
    expandedReactions,
    setExpandedReactions,
    newMessage,
    setNewMessage,
    replyingTo,
    setReplyingTo,
    pendingImage,
    pendingImagePreview,
    uploadingImage,
    imageInputRef,
    messagesEndRef,
    messagesContainerRef,
    messageRefs,
    handleReaction,
    handleSendMessage,
    handleDeleteMessage,
    handleImageSelect,
    clearPendingImage,
    isMessageInBottomHalf,
  } = msg;

  const newChat = useNewChat({
    userId: profile?.supabaseId,
    startChatWith,
  });

  const {
    showNewChatDialog,
    setShowNewChatDialog,
    searchQuery,
    setSearchQuery,
    newChatMessage,
    setNewChatMessage,
    showSuggestions,
    setShowSuggestions,
    selectedConnections,
    setSelectedConnections,
    connections,
    loadingConnections,
    recipientInputRef,
  } = newChat;

  // ── Local UI state (kept in component) ───────────────────
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [viewingChatUser, setViewingChatUser] = useState<any>(null);
  const [mobileActionMenu, setMobileActionMenu] = useState<
    number | string | null
  >(null);
  const messageLongPressRef = useRef<NodeJS.Timeout | null>(null);
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // When startChatWith is provided, open chat directly instead of showing dialog
  useEffect(() => {
    if (!startChatWith?.id || !startChatWith?.name) return;

    // Check if conversation already exists in the list
    const existing = conversations.find((c) => c.userId === startChatWith.id);
    if (existing) {
      // Conversation exists — just open it
      setActiveChat(existing.id);
      setShowNewChatDialog(false);
      return;
    }

    // No existing conversation — create a virtual one so the chat view renders
    const virtualConvo: Conversation = {
      id: startChatWith.id,
      userId: startChatWith.id,
      name: startChatWith.name,
      avatar: startChatWith.avatar || "👤",
      avatarImage: startChatWith.avatarImage,
      lastMessage: "",
      timestamp: new Date().toISOString(),
      online: startChatWith.online,
      unreadCount: 0,
    };

    // Add virtual conversation to the list and open it
    setConversations((prev) => {
      // Avoid duplicates
      if (prev.some((c) => c.userId === startChatWith.id)) return prev;
      return [virtualConvo, ...prev];
    });
    setActiveChat(startChatWith.id);
    setShowNewChatDialog(false);
  }, [startChatWith]);

  // Close conversation menu when switching chats
  useEffect(() => {
    setShowConversationMenu(false);
  }, [activeChat]);

  // Block guests from accessing messages
  useEffect(() => {
    if (isGuest) checkAndShowModal();
  }, [isGuest]);

  // Reaction emojis (same as Groups)
  const reactionEmojis = [
    "🙏",
    "❤️",
    "✝️",
    "🔥",
    "✨",
    "🕊️",
    "📖",
    "🌟",
    "💪",
    "🛡️",
    "🙌",
    "👑",
    "🤲",
    "😇",
    "😊",
    "😢",
    "😮",
    "🎉",
    "🫂",
    "✋",
    "🥰",
    "😌",
    "✅",
    "💯",
  ];

  if (activeChat) {
    const conversation =
      conversations.find((c) => c.id === activeChat) ||
      // Fallback: build a virtual conversation from startChatWith for friends without prior messages
      (startChatWith?.id === String(activeChat)
        ? ({
            id: startChatWith.id,
            userId: startChatWith.id,
            name: startChatWith.name,
            avatar: startChatWith.avatar || "👤",
            avatarImage: startChatWith.avatarImage,
            lastMessage: "",
            timestamp: new Date().toISOString(),
            online: startChatWith.online,
            unreadCount: 0,
          } as Conversation)
        : null);

    if (!conversation) {
      // If conversations haven't loaded yet, show a loading indicator instead of null
      if (isInitialLoad) {
        return (
          <div className="flex items-center justify-center h-64">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: nightMode ? 'rgba(123,118,224,0.4)' : 'rgba(79,172,254,0.4)' }}
            />
          </div>
        );
      }
      return null;
    }

    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div
          className="px-4 py-2.5 flex items-center justify-between relative z-50"
          style={
            nightMode
              ? {
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  background: 'rgba(13,11,24,0.8)',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }
              : {
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  background: 'rgba(205,216,248,0.6)',
                  borderBottom: '1px solid rgba(150,165,225,0.15)',
                }
          }
        >
          <button
            onClick={() => (onBack ? onBack() : setActiveChat(null))}
            className="text-sm font-semibold mr-2"
            style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
          >
            ← Back
          </button>
          <button
            className="flex items-center gap-2 active:opacity-70 transition-opacity flex-1 min-w-0"
            onClick={() =>
              setViewingChatUser({
                id: conversation.userId,
                displayName: conversation.name,
                avatar: conversation.avatar,
                avatarImage: conversation.avatarImage,
                online: conversation.online,
              })
            }
            aria-label={`View ${conversation.name}'s profile`}
          >
            <div className="relative flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white overflow-hidden"
                style={{
                  background: conversation.avatarImage ? undefined : getGradient(conversation.userId || conversation.name),
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {conversation.avatarImage ? (
                  <img
                    src={conversation.avatarImage}
                    alt={conversation.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(conversation.name || 'U')
                )}
              </div>
              {conversation.online && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
                  style={{
                    background: '#5cc88a',
                    border: `2px solid ${nightMode ? '#0d0b18' : '#d6daf5'}`,
                  }}
                />
              )}
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span
                className="font-semibold text-sm"
                style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a', fontFamily: "'DM Sans', sans-serif" }}
              >
                {conversation.name}
              </span>
              <span
                className="text-xs"
                style={{ color: conversation.online ? (nightMode ? '#5cc88a' : '#16834a') : (nightMode ? '#5d5877' : '#8e9ec0') }}
              >
                {conversation.online ? "Online" : "Offline"}
              </span>
            </div>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowConversationMenu(!showConversationMenu)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
              aria-label="Conversation options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showConversationMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  role="button"
                  tabIndex={0}
                  aria-label="Close conversation menu"
                  onClick={() => setShowConversationMenu(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setShowConversationMenu(false);
                    }
                  }}
                />

                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl z-[60]"
                  style={
                    nightMode
                      ? {
                          background: 'rgba(13,11,24,0.95)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.9)',
                          border: '1px solid rgba(150,165,225,0.15)',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                        }
                  }
                >
                  <button
                    onClick={async () => {
                      if (!profile?.supabaseId || !conversation.userId) return;
                      const confirmMessage = `Block ${conversation.name}? They won't be able to message you, see your profile, or find you in searches.`;
                      if (!window.confirm(confirmMessage)) {
                        setShowConversationMenu(false);
                        return;
                      }
                      try {
                        await blockUser(
                          profile.supabaseId,
                          conversation.userId,
                        );
                        showSuccess(`${conversation.name} has been blocked`);
                        setShowConversationMenu(false);
                        setActiveChat(null);
                        // Reload conversations and filter out blocked users
                        try {
                          const updatedConversations =
                            await getUserConversations(profile.supabaseId);
                          const filtered = [];
                          for (const convo of updatedConversations || []) {
                            try {
                              const blk = await isUserBlocked(
                                profile.supabaseId,
                                convo.userId,
                              );
                              const blkBy = await isBlockedBy(
                                profile.supabaseId,
                                convo.userId,
                              );
                              if (!blk && !blkBy) {
                                filtered.push(convo);
                              }
                            } catch {
                              // On error checking block status, keep the conversation visible
                              filtered.push(convo);
                            }
                          }
                          setConversations(filtered);
                        } catch {
                          // If conversation reload fails, just remove the blocked user from current list
                          setConversations((prev) =>
                            prev.filter(
                              (c) => c.userId !== conversation.userId,
                            ),
                          );
                        }
                      } catch (error) {
                        console.error("Error blocking user:", error);
                        showError("Failed to block user");
                      }
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors rounded-t-xl ${
                      nightMode
                        ? "hover:bg-white/10 text-red-400"
                        : "hover:bg-red-50 text-red-600"
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    <span className="text-sm font-medium">Block User</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 p-4 overflow-y-auto"
        >
          {loading ? (
            <div
              className="text-center py-8"
              style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
            >
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div
              className="text-center py-8"
              style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
            >
              <p>No messages yet.</p>
              <p className="text-sm mt-2" style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}>
                Send a message to start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === profile?.supabaseId;
              return (
                <div key={msg.id} className="mt-3">
                  <div className="flex gap-2 items-start">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden"
                      style={{
                        background: isMe
                          ? (profile?.avatarImage ? undefined : getGradient(profile?.supabaseId || 'me'))
                          : (conversation.avatarImage ? undefined : getGradient(conversation.userId || conversation.name)),
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {isMe ? (
                        profile?.avatarImage ? (
                          <img
                            src={profile.avatarImage}
                            alt={profile.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(profile?.displayName || 'Me')
                        )
                      ) : conversation.avatarImage ? (
                        <img
                          src={conversation.avatarImage}
                          alt={conversation.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(conversation.name || 'U')
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name and timestamp */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                        >
                          {isMe ? profile?.displayName : conversation.name}
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
                        >
                          {(() => {
                            // Parse the timestamp - handle both ISO strings and Date objects
                            const msgDate = msg.created_at
                              ? new Date(msg.created_at)
                              : new Date();
                            const now = new Date();
                            const diffMs = now.getTime() - msgDate.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);

                            // Show "Just now" for messages less than 1 minute old
                            if (diffMins < 1) return "Just now";
                            // Show minutes ago for messages less than 1 hour old
                            if (diffMins < 60) return `${diffMins}m ago`;
                            // Show hours ago for messages less than 24 hours old
                            if (diffHours < 24) return `${diffHours}h ago`;
                            // Show days ago for messages less than 7 days old
                            if (diffDays < 7) return `${diffDays}d ago`;
                            // Show time for today's messages (fallback)
                            if (msgDate.toDateString() === now.toDateString()) {
                              return msgDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            }
                            // Show date and time for older messages
                            return msgDate.toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          })()}
                        </span>
                      </div>

                      {/* Message bubble with reactions */}
                      <div className="flex flex-col items-start">
                        <div
                          className="flex items-center gap-2 group"
                          onTouchStart={() => {
                            messageLongPressRef.current = setTimeout(() => {
                              setMobileActionMenu(msg.id);
                            }, 500);
                          }}
                          onTouchEnd={() => {
                            if (messageLongPressRef.current) {
                              clearTimeout(messageLongPressRef.current);
                              messageLongPressRef.current = null;
                            }
                          }}
                          onTouchCancel={() => {
                            if (messageLongPressRef.current) {
                              clearTimeout(messageLongPressRef.current);
                              messageLongPressRef.current = null;
                            }
                          }}
                          onTouchMove={() => {
                            if (messageLongPressRef.current) {
                              clearTimeout(messageLongPressRef.current);
                              messageLongPressRef.current = null;
                            }
                          }}
                        >
                          <div
                            ref={(el: HTMLDivElement | null) => {
                              messageRefs.current[msg.id] = el;
                            }}
                            className="px-3 py-2 max-w-full sm:max-w-md relative transition-colors"
                            style={isMe
                              ? {
                                  background: nightMode ? 'rgba(123,118,224,0.12)' : 'rgba(79,172,254,0.12)',
                                  border: `1px solid ${nightMode ? 'rgba(123,118,224,0.15)' : 'rgba(79,172,254,0.15)'}`,
                                  borderRadius: '14px 14px 4px 14px',
                                  color: nightMode ? '#e8e5f2' : '#1e2b4a',
                                }
                              : {
                                  background: nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(150,165,225,0.1)'}`,
                                  borderRadius: '14px 14px 14px 4px',
                                  color: nightMode ? '#b8b4c8' : '#3a4d6e',
                                  ...(nightMode ? {} : { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }),
                                }
                            }
                          >
                            {/* Reply to message preview - only show if reply_to is valid and has content */}
                            {msg.reply_to &&
                              msg.reply_to.id &&
                              msg.reply_to.content && (
                                <div
                                  className="mb-2 pl-3 rounded-r-md py-1.5 text-xs"
                                  style={{
                                    borderLeft: `2px solid ${nightMode ? 'rgba(123,118,224,0.4)' : 'rgba(79,172,254,0.4)'}`,
                                    background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(150,165,225,0.08)',
                                  }}
                                >
                                  <div
                                    className="font-semibold mb-0.5"
                                    style={{ color: nightMode ? '#9b96f5' : '#4facfe' }}
                                  >
                                    {msg.reply_to.sender?.display_name ||
                                      msg.reply_to.sender?.username ||
                                      "Unknown"}
                                  </div>
                                  <div
                                    className="truncate"
                                    style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                                  >
                                    {decodeHTMLEntities(msg.reply_to.content)}
                                  </div>
                                </div>
                              )}
                            {/* Message image */}
                            {msg.image_url && (
                              <div className="mt-1 mb-1">
                                <img
                                  src={msg.image_url}
                                  alt="Shared image"
                                  className="max-w-[280px] max-h-[300px] rounded-xl object-cover cursor-pointer transition-all hover:opacity-90 hover:scale-[1.02]"
                                  style={{
                                    border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                                    boxShadow: nightMode
                                      ? "0 2px 8px rgba(0,0,0,0.3)"
                                      : "0 2px 8px rgba(0,0,0,0.1)",
                                  }}
                                  onClick={() =>
                                    setExpandedImage(msg.image_url || null)
                                  }
                                  loading="lazy"
                                />
                              </div>
                            )}
                            {/* Message text (hide placeholder text for image-only messages) */}
                            {msg.content && msg.content !== "📷 Image" && (
                              <p
                                className="text-[15px] whitespace-pre-wrap leading-snug"
                                style={{
                                  overflowWrap: "break-word",
                                  wordBreak: "normal",
                                  color: 'inherit',
                                }}
                              >
                                {decodeHTMLEntities(msg.content)}
                              </p>
                            )}

                            {/* Reaction Picker */}
                            {showReactionPicker === msg.id && (
                              <div
                                className={`${isMessageInBottomHalf(msg.id) ? "absolute bottom-full mb-1 left-0" : "absolute top-full mt-1 left-0"} rounded-xl shadow-2xl p-2 z-[100]`}
                                style={
                                  nightMode
                                    ? {
                                        background: 'rgba(13,11,24,0.95)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                                      }
                                    : {
                                        background: 'rgba(255,255,255,0.9)',
                                        border: '1px solid rgba(150,165,225,0.15)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                      }
                                }
                              >
                                <div className="grid grid-cols-6 gap-1 w-[200px]">
                                  {(showAllEmojis[msg.id]
                                    ? reactionEmojis
                                    : reactionEmojis.slice(0, 6)
                                  ).map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        handleReaction(msg.id, emoji);
                                        setShowReactionPicker(null);
                                      }}
                                      className="text-lg hover:scale-110 transition-transform p-1.5 rounded flex items-center justify-center"
                                      style={{ ...(nightMode ? {} : {}), }}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                                {!showAllEmojis[msg.id] &&
                                  reactionEmojis.length > 6 && (
                                    <button
                                      onClick={() =>
                                        setShowAllEmojis((prev) => ({
                                          ...prev,
                                          [msg.id]: true,
                                        }))
                                      }
                                      className="w-full mt-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors"
                                      style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                                    >
                                      +{reactionEmojis.length - 6} more
                                    </button>
                                  )}
                                {showAllEmojis[msg.id] && (
                                  <button
                                    onClick={() =>
                                      setShowAllEmojis((prev) => ({
                                        ...prev,
                                        [msg.id]: false,
                                      }))
                                    }
                                    className="w-full mt-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors"
                                    style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                                  >
                                    Show less
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action buttons (desktop hover only) */}
                          <div
                            className={`flex gap-1 transition-opacity ${isTouchDevice ? "hidden" : "opacity-0 group-hover:opacity-100"}`}
                          >
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="p-1 rounded transition-colors"
                              style={{
                                background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
                                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.1)'}`,
                                color: nightMode ? '#8e89a8' : '#4a5e88',
                              }}
                              title="Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setShowReactionPicker(
                                  showReactionPicker === msg.id ? null : msg.id,
                                )
                              }
                              className="p-1 rounded transition-colors"
                              style={{
                                background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
                                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.1)'}`,
                                color: nightMode ? '#8e89a8' : '#4a5e88',
                              }}
                              title="React"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {isMe && (
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Delete this message?"))
                                    return;
                                  await handleDeleteMessage(msg.id);
                                }}
                                className="p-1 rounded transition-colors"
                                style={{
                                  background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
                                  border: `1px solid ${nightMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                  color: nightMode ? '#ef4444' : '#dc2626',
                                }}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Display reactions */}
                        {messageReactions[msg.id] &&
                          messageReactions[msg.id].length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(() => {
                                const reactions = messageReactions[msg.id];
                                const reactionCounts = reactions.reduce(
                                  (
                                    acc: Record<
                                      string,
                                      {
                                        count: number;
                                        hasReacted: boolean;
                                        users: string[];
                                      }
                                    >,
                                    r,
                                  ) => {
                                    if (!acc[r.emoji]) {
                                      acc[r.emoji] = {
                                        count: 0,
                                        hasReacted: false,
                                        users: [],
                                      };
                                    }
                                    acc[r.emoji].count++;
                                    acc[r.emoji].users.push(r.userId);
                                    if (r.userId === profile?.supabaseId) {
                                      acc[r.emoji].hasReacted = true;
                                    }
                                    return acc;
                                  },
                                  {},
                                );

                                const sortedReactions = Object.entries(
                                  reactionCounts,
                                ).sort((a, b) => b[1].count - a[1].count);
                                const isExpanded = expandedReactions[msg.id];
                                const displayReactions = isExpanded
                                  ? sortedReactions
                                  : sortedReactions.slice(0, 5);
                                const hiddenCount = sortedReactions.length - 5;

                                return (
                                  <>
                                    {displayReactions.map(([emoji, data]) => (
                                      <button
                                        key={emoji}
                                        onClick={() =>
                                          handleReaction(msg.id, emoji)
                                        }
                                        className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all"
                                        style={data.hasReacted
                                          ? {
                                              background: nightMode ? 'rgba(123,118,224,0.15)' : 'rgba(79,172,254,0.15)',
                                              border: `1px solid ${nightMode ? '#7b76e0' : '#4facfe'}`,
                                            }
                                          : {
                                              background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
                                              border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.1)'}`,
                                              ...(nightMode ? {} : { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }),
                                            }
                                        }
                                      >
                                        <span className="text-sm leading-none">
                                          {emoji}
                                        </span>
                                        <span
                                          className="text-[11px] font-medium leading-none"
                                          style={{
                                            color: data.hasReacted
                                              ? (nightMode ? '#9b96f5' : '#4facfe')
                                              : (nightMode ? '#8e89a8' : '#4a5e88'),
                                          }}
                                        >
                                          {data.count}
                                        </span>
                                      </button>
                                    ))}

                                    {/* Show "more" button if there are hidden reactions */}
                                    {!isExpanded && hiddenCount > 0 && (
                                      <button
                                        onClick={() =>
                                          setExpandedReactions((prev) => ({
                                            ...prev,
                                            [msg.id]: true,
                                          }))
                                        }
                                        className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all"
                                        style={{
                                          background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
                                          border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.1)'}`,
                                          color: nightMode ? '#8e89a8' : '#4a5e88',
                                        }}
                                      >
                                        <span className="text-[11px] font-medium">
                                          +{hiddenCount}
                                        </span>
                                      </button>
                                    )}

                                    {/* Show "less" button if expanded */}
                                    {isExpanded &&
                                      sortedReactions.length > 5 && (
                                        <button
                                          onClick={() =>
                                            setExpandedReactions((prev) => ({
                                              ...prev,
                                              [msg.id]: false,
                                            }))
                                          }
                                          className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all"
                                          style={{
                                            background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.4)',
                                            border: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.1)'}`,
                                            color: nightMode ? '#8e89a8' : '#4a5e88',
                                          }}
                                        >
                                          <span className="text-[11px] font-medium">
                                            −
                                          </span>
                                        </button>
                                      )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-8 shrink-0" />
        </div>

        {/* Reply preview */}
        {replyingTo && (
          <div
            className="px-4 py-2"
            style={{
              background: nightMode ? 'rgba(13,11,24,0.6)' : 'rgba(205,216,248,0.4)',
              borderTop: `1px solid ${nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(150,165,225,0.15)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Reply
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: nightMode ? '#7b76e0' : '#4facfe' }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-semibold"
                    style={{ color: nightMode ? '#9b96f5' : '#4facfe' }}
                  >
                    Replying to{" "}
                    {replyingTo.sender_id === profile?.supabaseId
                      ? profile?.displayName
                      : conversation.name}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                  >
                    {replyingTo.content}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 rounded transition-colors"
                style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Image preview */}
        {pendingImagePreview && (
          <div
            className="px-4 py-2"
            style={{
              background: nightMode ? 'rgba(13,11,24,0.6)' : 'rgba(205,216,248,0.4)',
              borderTop: `1px solid ${nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(150,165,225,0.15)'}`,
            }}
          >
            <div className="flex items-start gap-2">
              <div className="relative">
                <img
                  src={pendingImagePreview}
                  alt="Image to send"
                  className="w-20 h-20 rounded-xl object-cover"
                  style={{
                    border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  }}
                />
                <button
                  onClick={clearPendingImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p
                className="text-xs mt-1"
                style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
              >
                {uploadingImage ? "Uploading..." : "Ready to send"}
              </p>
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className="sticky bottom-0 px-4 py-3 flex gap-2 items-center"
          style={
            nightMode
              ? {
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  background: 'rgba(13,11,24,0.8)',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }
              : {
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  background: 'rgba(205,216,248,0.6)',
                  borderTop: '1px solid rgba(150,165,225,0.15)',
                }
          }
        >
          {/* Hidden file input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          {/* Image attach button */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
            title="Attach image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  // @ts-ignore - Event type mismatch between keyboard and form event
                  handleSendMessage(e);
                }
              }}
              placeholder={pendingImage ? "Add a caption..." : "Message..."}
              rows={1}
              className="w-full px-4 py-2.5 rounded-full focus:outline-none resize-none text-[15px]"
              style={
                nightMode
                  ? {
                      height: "auto",
                      minHeight: "40px",
                      maxHeight: "100px",
                      overflowY: "auto",
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#e8e5f2',
                    }
                  : {
                      height: "auto",
                      minHeight: "40px",
                      maxHeight: "100px",
                      overflowY: "auto",
                      background: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(150,165,225,0.15)',
                      color: '#1e2b4a',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                    }
              }
              onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 100) + "px";
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() && !pendingImage}
            className="w-10 h-10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center transition-all duration-200 text-white"
            style={{
              background: nightMode ? '#7b76e0' : '#4facfe',
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </form>

        {/* Mobile action menu (bottom sheet) */}
        {mobileActionMenu !== null &&
          (() => {
            const msg = messages.find((m) => m.id === mobileActionMenu);
            if (!msg) return null;
            const isMe = msg.sender_id === profile?.supabaseId;
            return (
              <>
                <div
                  className="fixed inset-0 z-[150] bg-black/40"
                  role="button"
                  tabIndex={0}
                  aria-label="Close mobile action menu"
                  onClick={() => setMobileActionMenu(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMobileActionMenu(null);
                    }
                  }}
                />

                <div
                  className="fixed bottom-0 left-0 right-0 z-[151] rounded-t-2xl pb-6 pt-2"
                  style={{
                    background: nightMode
                      ? 'rgba(13,11,24,0.98)'
                      : 'rgba(205,216,248,0.95)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
                  }}
                >
                  <div
                    className="w-10 h-1 rounded-full mx-auto mb-3"
                    style={{ background: nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(150,165,225,0.3)' }}
                  />
                  <div
                    className="px-4 pb-2 mb-2 text-xs truncate"
                    style={{
                      color: nightMode ? '#5d5877' : '#8e9ec0',
                      borderBottom: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)'}`,
                    }}
                  >
                    {isMe ? profile?.displayName : conversation?.name}:{" "}
                    {msg.content?.substring(0, 60)}
                    {(msg.content?.length || 0) > 60 ? "..." : ""}
                  </div>
                  <button
                    onClick={() => {
                      setReplyingTo(msg);
                      setMobileActionMenu(null);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                      nightMode
                        ? "text-white/80 active:bg-white/5"
                        : "text-black/80 active:bg-black/5"
                    }`}
                  >
                    <Reply className="w-5 h-5" /> Reply
                  </button>
                  <button
                    onClick={() => {
                      setShowReactionPicker(msg.id);
                      setMobileActionMenu(null);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                      nightMode
                        ? "text-white/80 active:bg-white/5"
                        : "text-black/80 active:bg-black/5"
                    }`}
                  >
                    <Smile className="w-5 h-5" /> Add Reaction
                  </button>
                  {isMe && (
                    <button
                      onClick={async () => {
                        setMobileActionMenu(null);
                        if (!window.confirm("Delete this message?")) return;
                        await handleDeleteMessage(msg.id);
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                        nightMode
                          ? "text-red-400 active:bg-red-500/10"
                          : "text-red-600 active:bg-red-50"
                      }`}
                    >
                      <Trash2 className="w-5 h-5" /> Delete
                    </button>
                  )}
                </div>
              </>
            );
          })()}

        {/* Expanded image lightbox */}
        {expandedImage && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 cursor-pointer"
            style={{
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            role="button"
            tabIndex={0}
            aria-label="Close expanded image"
            onClick={() => setExpandedImage(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpandedImage(null);
              }
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImage(null);
              }}
              className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-95 transition-all"
              style={{ minWidth: "48px", minHeight: "48px" }}
            >
              <X className="w-7 h-7" />
            </button>
            <div className="absolute bottom-6 left-0 right-0 text-center text-white/40 text-xs pointer-events-none">
              Tap anywhere to close
            </div>
            <img
              src={expandedImage}
              alt="Expanded image"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Other User Profile Dialog */}
        {viewingChatUser && (
          <OtherUserProfileDialog
            user={viewingChatUser}
            onClose={() => setViewingChatUser(null)}
            nightMode={nightMode}
            onMessage={() => setViewingChatUser(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="py-4 space-y-3 px-4 pb-24">
      <style>{`
        @keyframes popOut {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }
      `}</style>
      <div>
        <h2
          className="text-lg font-bold"
          style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a', fontFamily: "'Playfair Display', serif" }}
        >
          Messages
        </h2>
        <p
          className="text-sm"
          style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
        >
          Stay connected with your community
        </p>
      </div>

      {isInitialLoad ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <ConversationSkeleton key={i} nightMode={nightMode} />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={
            nightMode
              ? {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }
              : {
                  background: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(150,165,225,0.1)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }
          }
        >
          <div className="text-6xl mb-4">💬</div>
          {!isSupabaseConfigured() ? (
            <>
              <p
                className="font-bold text-lg mb-2"
                style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
              >
                Database Not Configured
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
              >
                Supabase connection is not configured. Please add
                VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local
                file to enable messaging.
              </p>
              <div
                className={`p-4 rounded-lg ${nightMode ? "bg-yellow-500/20 border border-yellow-500/30" : "bg-yellow-50 border border-yellow-200"}`}
              >
                <p
                  className={`text-xs font-medium ${nightMode ? "text-yellow-300" : "text-yellow-800"}`}
                >
                  ⚠️ Check the console for detailed setup instructions
                </p>
              </div>
            </>
          ) : (
            <>
              <p
                className="font-bold text-lg mb-2"
                style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
              >
                No conversations yet
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
              >
                Connect with others in the Charge tab to start messaging!
              </p>
              <div
                className={`p-4 rounded-lg ${nightMode ? "bg-white/5" : "bg-blue-50/50"}`}
              >
                <p
                  className={`text-xs font-medium ${nightMode ? "text-slate-100" : "text-slate-700"}`}
                >
                  💡 Tip: Visit the <span className="font-bold">Find</span> tab
                  to find nearby believers
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        conversations.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setActiveChat(chat.id)}
            className="w-full rounded-xl px-3 py-3 text-left transition-all hover:-translate-y-0.5"
            style={
              nightMode
                ? {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }
                : {
                    background: 'rgba(255,255,255,0.35)',
                    border: '1px solid rgba(150,165,225,0.1)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 1px 4px rgba(150,165,225,0.05)',
                  }
            }
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white overflow-hidden"
                  style={{
                    background: chat.avatarImage ? undefined : getGradient(chat.userId || chat.name),
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {chat.avatarImage ? (
                    <img
                      src={chat.avatarImage}
                      alt={chat.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(chat.name || 'U')
                  )}
                </div>
                {chat.online && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
                    style={{
                      background: '#5cc88a',
                      border: `2px solid ${nightMode ? '#0d0b18' : '#d6daf5'}`,
                    }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                  >
                    {chat.name}
                  </h3>
                  {(chat.unreadCount ?? 0) > 0 && (
                    <span
                      className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ background: '#ef4444' }}
                    >
                      {chat.unreadCount ?? 0}
                    </span>
                  )}
                </div>
                <p
                  className="text-sm truncate"
                  style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                >
                  {decodeHTMLEntities(chat.lastMessage)}
                </p>
              </div>
              <span
                className="text-xs flex-shrink-0 pr-1"
                style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
              >
                {formatTimestamp(chat.timestamp)}
              </span>
            </div>
          </button>
        ))
      )}

      {/* New Chat Dialog */}
      {showNewChatDialog && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-message-title"
          onClick={() => {
            setShowNewChatDialog(false);
            setSearchQuery("");
            setNewChatMessage("");
            setSelectedConnections([]);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={`fixed bottom-24 right-6 rounded-2xl w-96 max-w-[calc(100vw-3rem)] p-6 ${nightMode ? "bg-white/5" : ""}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...(nightMode
                ? {
                    background: "rgba(255, 255, 255, 0.05)",
                    backdropFilter: "blur(30px)",
                    WebkitBackdropFilter: "blur(30px)",
                    boxShadow:
                      "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
                  }
                : {
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(30px)",
                    WebkitBackdropFilter: "blur(30px)",
                    boxShadow:
                      "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                  }),
              animation: "popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              transformOrigin: "bottom right",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-bold"
                style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a', fontFamily: "'Playfair Display', serif" }}
              >
                New Message
              </h2>
              <button
                onClick={() => {
                  setShowNewChatDialog(false);
                  setSearchQuery("");
                  setNewChatMessage("");
                  setSelectedConnections([]);
                }}
                className={
                  nightMode
                    ? "p-2 hover:bg-white/10 rounded-lg transition-colors"
                    : "p-2 hover:bg-white/20 rounded-lg transition-colors"
                }
              >
                <X
                  className="w-5 h-5"
                  style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                />
              </button>
            </div>

            {/* Recipient */}
            <div className="mb-6 relative">
              <label
                className="text-sm font-semibold mb-2 block"
                style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
              >
                To:{" "}
                {selectedConnections.length > 1 && (
                  <span className="text-xs opacity-70">(Group Chat)</span>
                )}
              </label>

              {/* Selected Recipients Chips */}
              {selectedConnections.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedConnections.map((conn) => (
                    <div
                      key={conn.id}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        nightMode
                          ? "bg-blue-500/20 border border-blue-500/30 text-slate-100"
                          : "bg-blue-100 border border-blue-200 text-black"
                      }`}
                    >
                      <span>{conn.avatar}</span>
                      <span className="font-medium">
                        {conn.name.split(" ")[0]}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedConnections(
                            selectedConnections.filter((c) => c.id !== conn.id),
                          );
                        }}
                        className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={recipientInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay hiding to allow clicking on suggestions
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className={
                  nightMode
                    ? "w-full px-4 py-2.5 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    : "w-full px-4 py-2.5 border border-white/25 text-black placeholder-black/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                }
                style={
                  nightMode
                    ? {}
                    : {
                        background: "rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                      }
                }
                placeholder="Search by name or username..."
                autoComplete="off"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && (searchQuery || connections.length > 0) && (
                <div
                  className={`absolute top-full left-0 right-0 mt-3 rounded-lg border max-h-48 overflow-y-auto z-10 ${nightMode ? "bg-white/5 border-white/10" : "bg-white border-white/25"}`}
                  style={
                    nightMode
                      ? {
                          backdropFilter: "blur(30px)",
                          WebkitBackdropFilter: "blur(30px)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                        }
                      : {
                          background: "rgba(255, 255, 255, 0.95)",
                          backdropFilter: "blur(30px)",
                          WebkitBackdropFilter: "blur(30px)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                        }
                  }
                >
                  {connections
                    .filter(
                      (conn) =>
                        (!searchQuery ||
                          conn.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())) &&
                        !selectedConnections.some((sc) => sc.id === conn.id),
                    )
                    .slice(0, 8)
                    .map((conn) => (
                      <button
                        key={conn.id}
                        onClick={() => {
                          setSelectedConnections([
                            ...selectedConnections,
                            conn,
                          ]);
                          setSearchQuery("");
                          setShowSuggestions(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors border-b last:border-b-0 ${
                          nightMode
                            ? "hover:bg-white/10 border-white/5"
                            : "hover:bg-white/50 border-white/20"
                        }`}
                      >
                        <div className="text-2xl">{conn.avatar}</div>
                        <div className="flex-1 text-left">
                          <p
                            className="text-sm font-medium"
                            style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
                          >
                            {conn.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: conn.status === "online" ? (nightMode ? '#5cc88a' : '#16834a') : (nightMode ? '#5d5877' : '#8e9ec0') }}
                          >
                            {conn.status === "online"
                              ? "Online"
                              : "Offline"}
                          </p>
                        </div>
                      </button>
                    ))}

                  {loadingConnections ? (
                    <div
                      className="px-4 py-6 text-center text-sm"
                      style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                    >
                      Loading friends...
                    </div>
                  ) : (
                    connections.filter(
                      (conn) =>
                        (!searchQuery ||
                          conn.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())) &&
                        !selectedConnections.some((sc) => sc.id === conn.id),
                    ).length === 0 && (
                      <div
                        className="px-4 py-6 text-center text-sm"
                        style={{ color: nightMode ? '#8e89a8' : '#4a5e88' }}
                      >
                        {connections.length === 0
                          ? "No friends yet — add friends first!"
                          : selectedConnections.length > 0
                            ? "All matching friends already added"
                            : "No matching friends found"}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Message */}
            <div className="mb-6">
              <label
                htmlFor="new-chat-message"
                className="text-sm font-semibold mb-2 block"
                style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
              >
                Message:
              </label>
              <textarea
                id="new-chat-message"
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className={
                  nightMode
                    ? "w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    : "w-full px-4 py-3 border border-white/25 text-black placeholder-black/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                }
                style={
                  nightMode
                    ? {}
                    : {
                        background: "rgba(255, 255, 255, 0.3)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                      }
                }
                placeholder="Type your message..."
                rows={4}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={async () => {
                if (selectedConnections.length > 0 && newChatMessage.trim()) {
                  if (selectedConnections.length > 1) {
                    // Create group chat
                    const groupName = selectedConnections
                      .map((c) => c.name.split(" ")[0])
                      .join(", ");

                    try {
                      if (profile?.supabaseId) {
                        // @ts-ignore - createGroup type includes memberIds field
                        const groupData = {
                          name: `Chat with ${groupName}`,
                          description: `Group chat created on ${new Date().toLocaleDateString()}`,
                          memberIds: selectedConnections.map((c) =>
                            String(c.id),
                          ),
                          isPrivate: true,
                        };
                        // @ts-ignore - createGroup type includes memberIds field
                        const newGroup = await createGroup(
                          profile.supabaseId,
                          groupData,
                        );

                        // Send the initial message to the group
                        if (newGroup && (newGroup as any).id) {
                          await sendGroupMessage(
                            (newGroup as any).id,
                            profile.supabaseId,
                            newChatMessage.trim(),
                          );
                          showSuccess("Group chat created!");
                        }
                      }
                    } catch (error) {
                      console.error("Error creating group:", error);
                      showError("Failed to create group chat");
                    }
                  } else {
                    // Send direct message
                    try {
                      if (profile?.supabaseId) {
                        // Check if user can send message (message privacy filter)
                        const { allowed, reason } = await canSendMessage(
                          String(selectedConnections[0].id),
                          profile.supabaseId,
                        );
                        if (!allowed) {
                          showError(reason || "Unable to send message");
                          return;
                        }

                        const result = await sendMessage(
                          profile.supabaseId,
                          String(selectedConnections[0].id),
                          newChatMessage.trim(),
                        );
                        if (result.error) {
                          throw new Error(result.error);
                        }
                        showSuccess("Message sent!");
                        // Reload conversations to show new conversation
                        const userConversations = await getUserConversations(
                          profile.supabaseId,
                        );
                        const unblockedConversations = [];
                        for (const convo of userConversations) {
                          const blocked = await isUserBlocked(
                            profile.supabaseId,
                            convo.userId,
                          );
                          const blockedBy = await isBlockedBy(
                            profile.supabaseId,
                            convo.userId,
                          );
                          if (!blocked && !blockedBy) {
                            unblockedConversations.push(convo);
                          }
                        }
                        setConversations(unblockedConversations);
                      }
                    } catch (error: any) {
                      console.error("Error sending message:", error);
                      showError(error?.message || "Failed to send message");
                    }
                  }
                  setShowNewChatDialog(false);
                  setSearchQuery("");
                  setNewChatMessage("");
                  setSelectedConnections([]);
                }
              }}
              disabled={
                selectedConnections.length === 0 || !newChatMessage.trim()
              }
              className="w-full py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{
                background:
                  selectedConnections.length > 0 && newChatMessage.trim()
                    ? (nightMode ? '#7b76e0' : '#4facfe')
                    : (nightMode ? 'rgba(123,118,224,0.4)' : 'rgba(79,172,254,0.4)'),
                boxShadow:
                  selectedConnections.length > 0 && newChatMessage.trim()
                    ? (nightMode
                      ? '0 4px 12px rgba(123,118,224,0.4)'
                      : '0 4px 12px rgba(79,172,254,0.3)')
                    : 'none',
              }}
            >
              {selectedConnections.length > 1
                ? "Create Group Chat"
                : "Send Message"}
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button for New Chat */}
      {!activeChat && !showNewChatDialog && (
        <button
          onClick={() => setShowNewChatDialog(true)}
          className="fixed bottom-20 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-40 text-white"
          style={{
            background: nightMode ? '#7b76e0' : '#4facfe',
            boxShadow: nightMode
              ? '0 6px 20px rgba(123,118,224,0.4)'
              : '0 6px 20px rgba(79,172,254,0.4)',
          }}
          title="New Message"
          aria-label="New Message"
        >
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

export default MessagesTab;
