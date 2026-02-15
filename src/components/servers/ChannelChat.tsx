import React, { useState, useEffect, useRef } from "react";
import {
  Pin,
  Send,
  Smile,
  X,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Reply,
  CornerUpRight,
  Search,
  Check,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { useChannelMessages } from "../../hooks/useChannelMessages";
import type {
  ChannelMessage,
  MessageReaction,
} from "../../hooks/useChannelMessages";

// ── Types ──────────────────────────────────────────────────────

interface ChannelChatProps {
  nightMode: boolean;
  channelId: string;
  channelName: string;
  channelTopic?: string;
  userId: string;
  userDisplayName?: string;
  serverId?: string;
  members?: Array<{
    user_id: string;
    user?: {
      id: string;
      display_name: string;
      username: string;
      avatar_emoji?: string;
    };
  }>;
  permissions: {
    send_messages: boolean;
    pin_messages: boolean;
    delete_messages: boolean;
  };
  slowmodeSeconds?: number;
  isTimedOut?: boolean;
}

// ── Constants ──────────────────────────────────────────────────

const REACTION_EMOJIS = [
  "\u{1F64F}",
  "\u{2764}\u{FE0F}",
  "\u{271D}\u{FE0F}",
  "\u{1F525}",
  "\u{2728}",
  "\u{1F54A}\u{FE0F}",
  "\u{1F4D6}",
  "\u{1F31F}",
  "\u{1F4AA}",
  "\u{1F6E1}\u{FE0F}",
  "\u{1F64C}",
  "\u{1F451}",
  "\u{1F932}",
  "\u{1F607}",
  "\u{1F60A}",
  "\u{1F622}",
  "\u{1F62E}",
  "\u{1F389}",
  "\u{1FAC2}",
  "\u{270B}",
  "\u{1F970}",
  "\u{1F60C}",
  "\u{2705}",
  "\u{1F4AF}",
];

// Map common channel names to emoji
const getChannelEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("general")) return "\u{1F4AC}";
  if (lower.includes("prayer")) return "\u{1F64F}";
  if (lower.includes("bible") || lower.includes("study")) return "\u{1F4D6}";
  if (lower.includes("worship") || lower.includes("music")) return "\u{1F3B5}";
  if (lower.includes("announcements")) return "\u{1F4E2}";
  if (lower.includes("welcome")) return "\u{1F44B}";
  return "\u{1F4AC}";
};

// ── Helpers ────────────────────────────────────────────────────

const formatTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Component ──────────────────────────────────────────────────

const ChannelChat: React.FC<ChannelChatProps> = ({
  nightMode,
  channelId,
  channelName,
  channelTopic,
  userId,
  userDisplayName,
  serverId,
  members,
  permissions,
  slowmodeSeconds = 0,
  isTimedOut = false,
}) => {
  // All state + logic from the hook
  const ch = useChannelMessages({
    channelId,
    userId,
    userDisplayName,
    serverId,
    members,
    permissions,
  });

  // Slowmode tracking (UI-only, wraps around the hook)
  const [slowmodeCooldown, setSlowmodeCooldown] = useState(0);
  const slowmodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start slowmode cooldown after sending a message
  useEffect(() => {
    if (slowmodeSeconds > 0 && slowmodeCooldown > 0) {
      slowmodeTimerRef.current = setInterval(() => {
        setSlowmodeCooldown((prev) => {
          if (prev <= 1) {
            if (slowmodeTimerRef.current)
              clearInterval(slowmodeTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (slowmodeTimerRef.current) clearInterval(slowmodeTimerRef.current);
      };
    }
  }, [slowmodeCooldown, slowmodeSeconds]);

  // UI-only state
  const [expandedImage, setExpandedImage] = React.useState<string | null>(null);
  const [mobileActionMenu, setMobileActionMenu] = React.useState<
    string | number | null
  >(null);
  const messageLongPressRef = useRef<NodeJS.Timeout | null>(null);
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // (Refs, data loading, and handlers are all managed by useChannelMessages hook above)
  // ── Render @mention text ───────────────────────────────────

  const renderMessageContent = (content: string) => {
    if (!content || content === "\u{1F4F7} Image") return null;

    // Parse @mentions in message text
    const parts = content.split(/(@[^\s@]+(?:\s[^\s@]+)*)(?=\s|$)/g);
    return (
      <p
        className={`text-[15px] break-words whitespace-pre-wrap mt-0.5 leading-relaxed ${
          nightMode ? "text-white/80" : "text-black/80"
        }`}
      >
        {parts.map((part, i) => {
          if (part.startsWith("@") && part.length > 1) {
            return (
              <span
                key={i}
                className={`font-semibold rounded px-0.5 ${
                  nightMode
                    ? "text-blue-300 bg-blue-500/15"
                    : "text-blue-600 bg-blue-500/10"
                }`}
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  // ── Reaction rendering helper ──────────────────────────────

  const renderReactions = (
    messageId: string | number,
    reactions: MessageReaction[],
  ) => {
    const reactionCounts = reactions.reduce(
      (acc, r) => {
        acc[r.emoji] = acc[r.emoji] || {
          count: 0,
          users: [],
          hasReacted: false,
        };
        acc[r.emoji].count++;
        acc[r.emoji].users.push(r.user.display_name);
        if (r.user_id === userId) acc[r.emoji].hasReacted = true;
        return acc;
      },
      {} as Record<
        string,
        { count: number; users: string[]; hasReacted: boolean }
      >,
    );

    if (Object.keys(reactionCounts).length === 0) return null;

    const sortedReactions = Object.entries(reactionCounts).sort(
      (a, b) => b[1].count - a[1].count,
    );
    const isExpanded = ch.expandedReactions[messageId];
    const displayReactions = isExpanded
      ? sortedReactions
      : sortedReactions.slice(0, 5);
    const hiddenCount = sortedReactions.length - 5;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {displayReactions.map(([emoji, data]) => (
          <button
            key={emoji}
            onClick={() => ch.handleReaction(messageId, emoji)}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all hover:scale-105 active:scale-95 ${
              data.hasReacted
                ? nightMode
                  ? "border border-blue-500/40"
                  : "border border-blue-400/50"
                : nightMode
                  ? "border border-white/10 hover:border-white/20"
                  : "border border-black/10 hover:border-black/20"
            }`}
            style={
              data.hasReacted
                ? {
                    background: nightMode
                      ? "rgba(79, 150, 255, 0.15)"
                      : "rgba(79, 150, 255, 0.1)",
                  }
                : {
                    background: nightMode
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                  }
            }
            title={data.users.join(", ")}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span
              className={`text-[11px] font-semibold leading-none ${
                data.hasReacted
                  ? nightMode
                    ? "text-blue-300"
                    : "text-blue-600"
                  : nightMode
                    ? "text-white/50"
                    : "text-black/50"
              }`}
            >
              {data.count}
            </span>
          </button>
        ))}

        {!isExpanded && hiddenCount > 0 && (
          <button
            onClick={() =>
              ch.setExpandedReactions((prev) => ({
                ...prev,
                [messageId]: true,
              }))
            }
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs transition-all hover:scale-105 ${
              nightMode
                ? "border border-white/10 hover:border-white/20 text-white/40"
                : "border border-black/10 hover:border-black/20 text-black/40"
            }`}
            style={{
              background: nightMode
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.03)",
            }}
          >
            <span className="text-[11px] font-semibold">+{hiddenCount}</span>
          </button>
        )}

        {isExpanded && sortedReactions.length > 5 && (
          <button
            onClick={() =>
              ch.setExpandedReactions((prev) => ({
                ...prev,
                [messageId]: false,
              }))
            }
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs transition-all hover:scale-105 ${
              nightMode
                ? "border border-white/10 hover:border-white/20 text-white/40"
                : "border border-black/10 hover:border-black/20 text-black/40"
            }`}
            style={{
              background: nightMode
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.03)",
            }}
          >
            <span className="text-[11px] font-semibold">{"\u2212"}</span>
          </button>
        )}
      </div>
    );
  };

  // ── Emoji picker rendering helper ──────────────────────────

  const renderEmojiPicker = (messageId: string | number) => {
    if (ch.showReactionPicker !== messageId) return null;

    const positionClass = ch.isMessageInBottomHalf(messageId)
      ? "absolute bottom-full mb-2 left-0"
      : "absolute top-full mt-2 left-0";

    return (
      <div
        className={`${positionClass} rounded-2xl shadow-2xl p-3 z-[100] ${
          nightMode ? "border border-white/10" : "border border-black/10"
        }`}
        style={{
          background: nightMode
            ? "rgba(20, 20, 30, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          boxShadow: nightMode
            ? "0 8px 32px rgba(0, 0, 0, 0.4)"
            : "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
        }}
      >
        <div className="grid grid-cols-6 gap-1.5 w-[216px]">
          {(ch.showAllEmojis[messageId]
            ? REACTION_EMOJIS
            : REACTION_EMOJIS.slice(0, 6)
          ).map((emoji) => (
            <button
              key={emoji}
              onClick={() => ch.handleReaction(messageId, emoji)}
              className={`text-xl hover:scale-125 transition-all p-2 rounded-xl flex items-center justify-center active:scale-95 ${
                nightMode ? "hover:bg-white/10" : "hover:bg-black/5"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        {!ch.showAllEmojis[messageId] && REACTION_EMOJIS.length > 6 && (
          <button
            onClick={() =>
              ch.setShowAllEmojis((prev) => ({ ...prev, [messageId]: true }))
            }
            className={`w-full mt-2 px-2 py-1.5 text-xs font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-95 ${
              nightMode
                ? "text-white/50 hover:bg-white/5"
                : "text-black/50 hover:bg-black/5"
            }`}
          >
            +{REACTION_EMOJIS.length - 6} more
          </button>
        )}
        {ch.showAllEmojis[messageId] && (
          <button
            onClick={() =>
              ch.setShowAllEmojis((prev) => ({ ...prev, [messageId]: false }))
            }
            className={`w-full mt-2 px-2 py-1.5 text-xs font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-95 ${
              nightMode
                ? "text-white/50 hover:bg-white/5"
                : "text-black/50 hover:bg-black/5"
            }`}
          >
            Show less
          </button>
        )}
      </div>
    );
  };

  // ── Render a single message row ────────────────────────────

  const renderMessage = (msg: ChannelMessage, isPinned: boolean = false) => {
    const reactions = ch.messageReactions[msg.id] || [];
    const isOwnMessage = msg.sender_id === userId;
    const isEditing = ch.editingMessageId === msg.id;
    const replyToMsg = ch.getReplyToMessage(msg.reply_to_id);
    const canDelete = isOwnMessage || permissions.delete_messages;
    const canEdit = isOwnMessage;

    return (
      <div
        key={msg.id}
        ref={(el) => {
          ch.messageRefs.current[msg.id] = el;
        }}
        className="group px-4 py-1"
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
        {/* Reply reference */}
        {replyToMsg && (
          <div
            className={`flex items-center gap-2 ml-14 mb-1 text-xs ${
              nightMode ? "text-white/40" : "text-black/40"
            }`}
          >
            <CornerUpRight className="w-3 h-3 flex-shrink-0" />
            <span className="font-semibold truncate">
              {replyToMsg.sender?.display_name}
            </span>
            <span className="truncate max-w-[200px]">{replyToMsg.content}</span>
          </div>
        )}

        <div
          className={`flex items-start gap-3 px-4 py-3 rounded-2xl transition-all ${
            nightMode ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]"
          }`}
          style={{
            background: isOwnMessage
              ? nightMode
                ? "rgba(79, 150, 255, 0.06)"
                : "rgba(79, 150, 255, 0.04)"
              : nightMode
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(255, 255, 255, 0.5)",
            border: `1px solid ${
              isOwnMessage
                ? nightMode
                  ? "rgba(79, 150, 255, 0.1)"
                  : "rgba(79, 150, 255, 0.08)"
                : nightMode
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(0, 0, 0, 0.04)"
            }`,
          }}
        >
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{
              background: isOwnMessage
                ? "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)"
                : nightMode
                  ? "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))"
                  : "linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03))",
              boxShadow: isOwnMessage
                ? "0 2px 8px rgba(59, 130, 246, 0.2)"
                : "none",
            }}
          >
            {msg.sender?.avatar_emoji || "\u{1F464}"}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span
                className={`font-semibold text-sm ${nightMode ? "text-white" : "text-black"}`}
              >
                {msg.sender?.display_name}
              </span>
              <span
                className={`text-xs ${nightMode ? "text-white/30" : "text-black/30"}`}
              >
                {formatTime(msg.created_at)}
              </span>
              {msg.is_edited && (
                <span
                  className={`text-[10px] ${nightMode ? "text-white/20" : "text-black/20"}`}
                >
                  (edited)
                </span>
              )}
              {isPinned && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Pin className="w-3 h-3" />
                </span>
              )}
            </div>

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
                  onClick={() => setExpandedImage(msg.image_url || null)}
                  loading="lazy"
                />
              </div>
            )}

            {/* Edit mode or normal content */}
            {isEditing ? (
              <div className="mt-1">
                <textarea
                  ref={ch.editInputRef}
                  value={ch.editContent}
                  onChange={(e) => ch.setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ch.handleSaveEdit();
                    }
                    if (e.key === "Escape") ch.handleCancelEdit();
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none ${
                    nightMode
                      ? "text-white bg-white/10 border border-white/20 focus:border-blue-400"
                      : "text-black bg-white/60 border border-black/10 focus:border-blue-500"
                  }`}
                  rows={2}
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={ch.handleSaveEdit}
                    className="text-xs font-semibold px-3 py-1 rounded-lg text-white transition-all active:scale-95"
                    style={{
                      background:
                        "linear-gradient(135deg, #4F96FF 0%, #2563eb 100%)",
                    }}
                  >
                    <Check className="w-3 h-3 inline mr-1" />
                    Save
                  </button>
                  <button
                    onClick={ch.handleCancelEdit}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all active:scale-95 ${
                      nightMode
                        ? "text-white/50 hover:bg-white/5"
                        : "text-black/50 hover:bg-black/5"
                    }`}
                  >
                    Cancel
                  </button>
                  <span
                    className={`text-[10px] ${nightMode ? "text-white/20" : "text-black/20"}`}
                  >
                    Esc to cancel, Enter to save
                  </span>
                </div>
              </div>
            ) : (
              renderMessageContent(msg.content)
            )}

            {/* Reactions display */}
            {renderReactions(msg.id, reactions)}

            {/* Emoji picker */}
            <div className="relative">{renderEmojiPicker(msg.id)}</div>
          </div>

          {/* Hover action buttons (desktop only) */}
          <div
            className={`flex gap-0.5 transition-all mt-0.5 flex-shrink-0 ${isTouchDevice ? "hidden" : "opacity-0 group-hover:opacity-100"}`}
          >
            {/* Reply button */}
            <button
              onClick={() => ch.handleStartReply(msg)}
              className={`p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                nightMode
                  ? "text-white/30 hover:text-white/60 hover:bg-white/5"
                  : "text-black/30 hover:text-black/60 hover:bg-black/5"
              }`}
              title="Reply"
            >
              <Reply className="w-4 h-4" />
            </button>

            {/* Reaction button */}
            <button
              onClick={() =>
                ch.setShowReactionPicker(
                  ch.showReactionPicker === msg.id ? null : msg.id,
                )
              }
              className={`p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                nightMode
                  ? "text-white/30 hover:text-white/60 hover:bg-white/5"
                  : "text-black/30 hover:text-black/60 hover:bg-black/5"
              }`}
              title="Add reaction"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Pin / Unpin button */}
            {permissions.pin_messages &&
              (isPinned ? (
                <button
                  onClick={() => ch.handleUnpinMessage(msg.id)}
                  className="p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  title="Unpin message"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => ch.handlePinMessage(msg.id)}
                  className={`p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                    nightMode
                      ? "text-white/30 hover:text-amber-400 hover:bg-amber-500/10"
                      : "text-black/30 hover:text-amber-500 hover:bg-amber-500/10"
                  }`}
                  title="Pin message"
                >
                  <Pin className="w-4 h-4" />
                </button>
              ))}

            {/* Edit / Delete (overflow menu) */}
            {(canEdit || canDelete) && (
              <div className="relative">
                <button
                  onClick={() =>
                    ch.setActiveMessageMenu(
                      ch.activeMessageMenu === msg.id ? null : msg.id,
                    )
                  }
                  className={`p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                    nightMode
                      ? "text-white/30 hover:text-white/60 hover:bg-white/5"
                      : "text-black/30 hover:text-black/60 hover:bg-black/5"
                  }`}
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {ch.activeMessageMenu === msg.id && (
                  <>
                    <div
                      className="fixed inset-0 z-[99]"
                      role="presentation"
                      onClick={() => ch.setActiveMessageMenu(null)}
                    />
                    <div
                      className={`absolute right-0 ${ch.isMessageInBottomHalf(msg.id) ? "bottom-full mb-1" : "top-full mt-1"} z-[100] rounded-xl shadow-xl overflow-hidden min-w-[140px] ${
                        nightMode
                          ? "border border-white/10"
                          : "border border-black/10"
                      }`}
                      style={{
                        background: nightMode
                          ? "rgba(20, 20, 30, 0.95)"
                          : "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                      }}
                    >
                      {canEdit && (
                        <button
                          onClick={() => ch.handleStartEdit(msg)}
                          className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm transition-colors ${
                            nightMode
                              ? "text-white/80 hover:bg-white/5"
                              : "text-black/80 hover:bg-black/5"
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => ch.handleDeleteMessage(msg.id)}
                          className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm transition-colors ${
                            nightMode
                              ? "text-red-400 hover:bg-red-500/10"
                              : "text-red-600 hover:bg-red-50"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Channel Header ─────────────────────────────────── */}
      <div
        className="px-5 py-3 flex items-center justify-between flex-shrink-0"
        style={{
          borderBottom: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          background: nightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.3)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-lg flex-shrink-0">
            {getChannelEmoji(channelName)}
          </span>
          <h3
            className={`font-bold text-base truncate ${nightMode ? "text-white" : "text-black"}`}
          >
            {channelName}
          </h3>
          {channelTopic && (
            <>
              <div
                className={`w-px h-4 ${nightMode ? "bg-white/10" : "bg-black/10"}`}
              />
              <p
                className={`text-xs truncate ${nightMode ? "text-white/40" : "text-black/40"}`}
              >
                {channelTopic}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Search button */}
          {serverId && (
            <button
              onClick={() => ch.setShowSearch(!ch.showSearch)}
              className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                ch.showSearch
                  ? "text-blue-400"
                  : nightMode
                    ? "text-white/40 hover:text-white/70"
                    : "text-black/40 hover:text-black/70"
              }`}
              style={
                ch.showSearch
                  ? {
                      background: nightMode
                        ? "rgba(79,150,255,0.15)"
                        : "rgba(79,150,255,0.1)",
                    }
                  : {}
              }
              title="Search messages"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Pinned messages toggle */}
          {ch.pinnedMessages.length > 0 && (
            <button
              onClick={() => ch.setShowPinned(!ch.showPinned)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                ch.showPinned
                  ? "text-amber-300"
                  : nightMode
                    ? "text-white/40 hover:text-white/70"
                    : "text-black/40 hover:text-black/70"
              }`}
              style={{
                background: ch.showPinned
                  ? nightMode
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(245, 158, 11, 0.1)"
                  : nightMode
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                border: `1px solid ${ch.showPinned ? "rgba(245, 158, 11, 0.3)" : nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              }}
              title="Pinned messages"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>{ch.pinnedMessages.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Search Panel ───────────────────────────────────── */}
      {ch.showSearch && (
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{
            borderBottom: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: nightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl"
              style={{
                background: nightMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.5)",
                border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              <Search
                className={`w-4 h-4 flex-shrink-0 ${nightMode ? "text-white/30" : "text-black/30"}`}
              />
              <input
                ref={ch.searchInputRef}
                type="text"
                value={ch.searchQuery}
                onChange={(e) => ch.setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ch.handleSearch();
                }}
                placeholder="Search messages..."
                className={`flex-1 bg-transparent outline-none text-sm ${
                  nightMode
                    ? "text-white placeholder-white/30"
                    : "text-black placeholder-black/30"
                }`}
              />
            </div>
            <button
              onClick={ch.handleSearch}
              disabled={!ch.searchQuery.trim() || ch.searching}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #4F96FF 0%, #2563eb 100%)",
              }}
            >
              {ch.searching ? "..." : "Search"}
            </button>
            <button
              onClick={ch.closeSearch}
              className={`p-2 rounded-xl transition-all ${nightMode ? "text-white/40 hover:text-white/70" : "text-black/40 hover:text-black/70"}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search results */}
          {ch.searchResults.length > 0 && (
            <div className="mt-3 max-h-[200px] overflow-y-auto space-y-1.5">
              <p
                className={`text-xs font-semibold mb-2 ${nightMode ? "text-white/40" : "text-black/40"}`}
              >
                {ch.searchResults.length} result
                {ch.searchResults.length !== 1 ? "s" : ""} found
              </p>
              {ch.searchResults.map((result: any) => (
                <div
                  key={result.id}
                  className={`px-3 py-2 rounded-xl text-sm cursor-pointer transition-all ${
                    nightMode ? "hover:bg-white/5" : "hover:bg-black/5"
                  }`}
                  style={{
                    background: nightMode
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(255,255,255,0.4)",
                    border: `1px solid ${nightMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-semibold text-xs ${nightMode ? "text-white" : "text-black"}`}
                    >
                      {result.sender?.display_name || "Unknown"}
                    </span>
                    <span
                      className={`text-[10px] ${nightMode ? "text-white/20" : "text-black/20"}`}
                    >
                      in #{result.channel?.name || "unknown"}
                    </span>
                    <span
                      className={`text-[10px] ${nightMode ? "text-white/20" : "text-black/20"}`}
                    >
                      {formatTime(result.created_at)}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 truncate ${nightMode ? "text-white/60" : "text-black/60"}`}
                  >
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pinned Messages Panel ──────────────────────────── */}
      {ch.showPinned && ch.pinnedMessages.length > 0 && (
        <div
          className="flex-shrink-0"
          style={{
            borderBottom: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: nightMode
              ? "rgba(245, 158, 11, 0.05)"
              : "rgba(245, 158, 11, 0.03)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Pin className="w-4 h-4 text-amber-400" />
              <span
                className={`text-xs font-bold ${nightMode ? "text-amber-300" : "text-amber-600"}`}
              >
                Pinned Messages ({ch.pinnedMessages.length})
              </span>
              <button
                onClick={() => ch.setShowPinned(false)}
                className={`ml-auto p-1 rounded-lg transition-all hover:scale-110 ${
                  nightMode
                    ? "hover:bg-white/10 text-white/40"
                    : "hover:bg-black/5 text-black/40"
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {ch.pinnedMessages.map((msg) => renderMessage(msg, true))}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages Area ──────────────────────────────────── */}
      <div
        ref={ch.messagesContainerRef}
        className="flex-1 overflow-y-auto py-3"
        style={{
          background: nightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
        }}
        role="presentation"
        onClick={() => {
          if (ch.showReactionPicker !== null) ch.setShowReactionPicker(null);
          if (ch.activeMessageMenu !== null) ch.setActiveMessageMenu(null);
        }}
      >
        {ch.loading ? (
          <div
            className={`text-center py-12 ${nightMode ? "text-white/40" : "text-black/40"}`}
          >
            <div className="text-3xl mb-3">{getChannelEmoji(channelName)}</div>
            Loading messages...
          </div>
        ) : ch.messages.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center h-full px-4 ${
              nightMode ? "text-white" : "text-black"
            }`}
          >
            <div className="text-5xl mb-4">{getChannelEmoji(channelName)}</div>
            <h3 className="font-bold text-lg mb-1 opacity-70">
              Welcome to {channelName}!
            </h3>
            {channelTopic && (
              <p className="text-sm opacity-40 text-center max-w-sm mb-4">
                {channelTopic}
              </p>
            )}
            <p className="text-sm opacity-30">
              This is the beginning of the channel. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {ch.messages.map((msg) => renderMessage(msg, false))}
            <div ref={ch.messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Typing indicator ────────────────────────────────── */}
      {ch.typingUsers.length > 0 && (
        <div
          className="px-5 py-1.5 flex-shrink-0"
          style={{
            background: nightMode
              ? "rgba(0,0,0,0.08)"
              : "rgba(255,255,255,0.2)",
          }}
        >
          <p
            className={`text-xs ${nightMode ? "text-white/40" : "text-black/40"}`}
          >
            <span className="font-semibold">
              {ch.typingUsers.map((t) => t.display_name).join(", ")}
            </span>{" "}
            {ch.typingUsers.length === 1 ? "is" : "are"} typing
            <span className="inline-flex ml-1">
              <span
                className="animate-bounce"
                style={{ animationDelay: "0ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "150ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "300ms" }}
              >
                .
              </span>
            </span>
          </p>
        </div>
      )}

      {/* ── Reply preview ───────────────────────────────────── */}
      {ch.replyingTo && (
        <div
          className="px-4 py-2.5 flex items-center gap-3 flex-shrink-0"
          style={{
            borderTop: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: nightMode
              ? "rgba(79,150,255,0.06)"
              : "rgba(79,150,255,0.04)",
          }}
        >
          <Reply
            className={`w-4 h-4 flex-shrink-0 ${nightMode ? "text-blue-400" : "text-blue-500"}`}
          />
          <div className="flex-1 min-w-0">
            <span
              className={`text-xs font-semibold ${nightMode ? "text-blue-300" : "text-blue-600"}`}
            >
              Replying to {ch.replyingTo.sender?.display_name}
            </span>
            <p
              className={`text-xs truncate ${nightMode ? "text-white/40" : "text-black/40"}`}
            >
              {ch.replyingTo.content}
            </p>
          </div>
          <button
            onClick={() => ch.setReplyingTo(null)}
            className={`p-1 rounded-lg transition-all hover:scale-110 ${
              nightMode
                ? "text-white/40 hover:text-white/70"
                : "text-black/40 hover:text-black/70"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Image preview ──────────────────────────────────── */}
      {ch.pendingImagePreview && permissions.send_messages && (
        <div
          className="px-4 py-2 flex-shrink-0"
          style={{
            borderTop: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: nightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)",
          }}
        >
          <div className="flex items-start gap-2">
            <div className="relative">
              <img
                src={ch.pendingImagePreview}
                alt="Image to send"
                className="w-20 h-20 rounded-xl object-cover"
                style={{
                  border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                }}
              />
              <button
                onClick={ch.clearPendingImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p
              className={`text-xs mt-1 ${nightMode ? "text-white/40" : "text-black/40"}`}
            >
              {ch.uploadingImage ? "Uploading..." : "Ready to send"}
            </p>
          </div>
        </div>
      )}

      {/* ── @Mention picker ────────────────────────────────── */}
      {ch.showMentionPicker && ch.filteredMentionMembers.length > 0 && (
        <div
          className="mx-4 mb-1 rounded-xl shadow-xl overflow-hidden flex-shrink-0"
          style={{
            background: nightMode
              ? "rgba(20, 20, 30, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <div
            className={`px-3 py-1.5 text-[10px] font-bold ${nightMode ? "text-white/30" : "text-black/30"}`}
          >
            Members
          </div>
          {ch.filteredMentionMembers.map((member) => (
            <button
              key={member.user_id}
              onClick={() => ch.handleMentionSelect(member)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                nightMode
                  ? "hover:bg-white/5 text-white"
                  : "hover:bg-black/5 text-black"
              }`}
            >
              <span className="text-base">
                {member.user?.avatar_emoji || "\u{1F464}"}
              </span>
              <span className="font-semibold text-sm">
                {member.user?.display_name}
              </span>
              <span
                className={`text-xs ${nightMode ? "text-white/30" : "text-black/30"}`}
              >
                @{member.user?.username}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Slowmode / Timeout indicator ─────────────────── */}
      {(slowmodeCooldown > 0 || isTimedOut) && permissions.send_messages && (
        <div
          className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
          style={{
            borderTop: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: isTimedOut
              ? nightMode
                ? "rgba(239,68,68,0.06)"
                : "rgba(239,68,68,0.04)"
              : nightMode
                ? "rgba(245,158,11,0.06)"
                : "rgba(245,158,11,0.04)",
          }}
        >
          <Clock
            className={`w-3.5 h-3.5 ${isTimedOut ? "text-red-400" : "text-amber-400"}`}
          />
          <span
            className={`text-xs font-medium ${isTimedOut ? (nightMode ? "text-red-300" : "text-red-600") : nightMode ? "text-amber-300" : "text-amber-600"}`}
          >
            {isTimedOut
              ? "You are timed out in this server"
              : `Slowmode active — wait ${slowmodeCooldown}s`}
          </span>
        </div>
      )}

      {/* ── Message Input — pill-shaped glass bar ──────────── */}
      {permissions.send_messages && !isTimedOut ? (
        <form
          onSubmit={ch.handleSendMessage}
          className="px-4 py-3 flex gap-3 items-end flex-shrink-0"
          style={{
            borderTop: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: nightMode
              ? "rgba(0,0,0,0.15)"
              : "rgba(255,255,255,0.3)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
          }}
        >
          {/* Hidden file input */}
          <input
            ref={ch.imageInputRef}
            type="file"
            accept="image/*"
            onChange={ch.handleImageSelect}
            className="hidden"
          />
          {/* Image attach button */}
          <button
            type="button"
            onClick={() => ch.imageInputRef.current?.click()}
            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${
              nightMode
                ? "text-white/40 hover:text-white/70 hover:bg-white/10"
                : "text-black/40 hover:text-black/70 hover:bg-black/5"
            }`}
            title="Attach image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <textarea
            ref={ch.textareaRef}
            value={ch.newMessage}
            onChange={ch.handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ch.handleSendMessage(e);
              }
            }}
            placeholder={
              ch.replyingTo
                ? `Reply to ${ch.replyingTo.sender?.display_name}...`
                : ch.pendingImage
                  ? "Add a caption..."
                  : `Message ${channelName}...`
            }
            rows={1}
            className={`flex-1 px-4 py-2.5 rounded-full focus:outline-none resize-none min-h-[42px] max-h-[100px] overflow-y-auto text-[15px] transition-all ${
              nightMode
                ? "text-white placeholder-white/30"
                : "text-black placeholder-black/40"
            }`}
            style={{
              height: "auto",
              minHeight: "42px",
              background: nightMode
                ? "rgba(255, 255, 255, 0.06)"
                : "rgba(255, 255, 255, 0.5)",
              border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(79, 150, 255, 0.4)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(79, 150, 255, 0.1), inset 0 1px 2px rgba(0, 0, 0, 0.05)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = nightMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)";
              e.currentTarget.style.boxShadow =
                "inset 0 1px 2px rgba(0, 0, 0, 0.05)";
            }}
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 100) + "px";
            }}
          />
          <button
            type="submit"
            disabled={
              (!ch.newMessage.trim() && !ch.pendingImage) ||
              slowmodeCooldown > 0 ||
              isTimedOut
            }
            className="w-10 h-10 rounded-full disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center transition-all duration-300 text-white hover:scale-110 hover:-translate-y-0.5 active:scale-95"
            style={{
              background:
                ch.newMessage.trim() || ch.pendingImage
                  ? "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)"
                  : nightMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
              boxShadow:
                ch.newMessage.trim() || ch.pendingImage
                  ? "0 4px 12px rgba(59, 130, 246, 0.3)"
                  : "none",
            }}
          >
            <Send
              className={`w-4.5 h-4.5 ${!ch.newMessage.trim() && !ch.pendingImage ? (nightMode ? "text-white/30" : "text-black/30") : ""}`}
            />
          </button>
        </form>
      ) : (
        <div
          className="px-4 py-3 text-center text-sm flex-shrink-0"
          style={{
            borderTop: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: nightMode
              ? "rgba(0,0,0,0.15)"
              : "rgba(255,255,255,0.3)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            color: nightMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          }}
        >
          {isTimedOut
            ? "You are timed out and cannot send messages."
            : "You do not have permission to send messages in this channel."}
        </div>
      )}

      {/* Mobile action menu (bottom sheet) */}
      {mobileActionMenu !== null &&
        (() => {
          const msg = ch.messages.find((m) => m.id === mobileActionMenu);
          if (!msg) return null;
          const isOwnMessage = msg.sender_id === userId;
          const canDelete = isOwnMessage || permissions.delete_messages;
          const canEdit = isOwnMessage;
          const isPinned = ch.pinnedMessages.some((p) => p.id === msg.id);
          return (
            <>
              <div
                className="fixed inset-0 z-[150] bg-black/40"
                role="presentation"
                onClick={() => setMobileActionMenu(null)}
              />
              <div
                className="fixed bottom-0 left-0 right-0 z-[151] rounded-t-2xl pb-6 pt-2"
                style={{
                  background: nightMode
                    ? "rgba(20, 20, 30, 0.98)"
                    : "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(30px)",
                  WebkitBackdropFilter: "blur(30px)",
                  boxShadow: "0 -4px 24px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  className={`w-10 h-1 rounded-full mx-auto mb-3 ${nightMode ? "bg-white/20" : "bg-black/15"}`}
                />
                <div
                  className={`px-4 pb-2 mb-2 text-xs truncate ${nightMode ? "text-white/40 border-b border-white/10" : "text-black/40 border-b border-black/10"}`}
                >
                  {msg.sender?.display_name}: {msg.content?.substring(0, 60)}
                  {msg.content?.length > 60 ? "..." : ""}
                </div>
                <button
                  onClick={() => {
                    ch.handleStartReply(msg);
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
                    ch.setShowReactionPicker(msg.id);
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
                {permissions.pin_messages && (
                  <button
                    onClick={() => {
                      isPinned
                        ? ch.handleUnpinMessage(msg.id)
                        : ch.handlePinMessage(msg.id);
                      setMobileActionMenu(null);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                      isPinned
                        ? "text-amber-400 active:bg-amber-500/10"
                        : nightMode
                          ? "text-white/80 active:bg-white/5"
                          : "text-black/80 active:bg-black/5"
                    }`}
                  >
                    <Pin className="w-5 h-5" /> {isPinned ? "Unpin" : "Pin"}
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      ch.handleStartEdit(msg);
                      setMobileActionMenu(null);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                      nightMode
                        ? "text-white/80 active:bg-white/5"
                        : "text-black/80 active:bg-black/5"
                    }`}
                  >
                    <Edit3 className="w-5 h-5" /> Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      ch.handleDeleteMessage(msg.id);
                      setMobileActionMenu(null);
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
          role="presentation"
          onClick={() => setExpandedImage(null)}
        >
          {/* Close button - large and visible */}
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
          {/* Tap hint for mobile */}
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
    </div>
  );
};

export default ChannelChat;
