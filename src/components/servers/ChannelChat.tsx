import React, { useState, useEffect, useRef } from 'react';
import { Hash, Pin, Send, Smile, X } from 'lucide-react';
import { showError } from '../../lib/toast';
import { validateMessage, sanitizeInput } from '../../lib/inputValidation';
import {
  sendChannelMessage,
  getChannelMessages,
  pinChannelMessage,
  unpinChannelMessage,
  getPinnedChannelMessages,
  addChannelReaction,
  removeChannelReaction,
  getChannelMessageReactions,
  unsubscribe
} from '../../lib/database';

// ── Types ──────────────────────────────────────────────────────

interface ChannelChatProps {
  nightMode: boolean;
  channelId: string;
  channelName: string;
  channelTopic?: string;
  userId: string;
  permissions: {
    send_messages: boolean;
    pin_messages: boolean;
    delete_messages: boolean;
  };
}

interface ChannelMessage {
  id: number | string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: {
    display_name: string;
    avatar_emoji: string;
  };
}

interface MessageReaction {
  id: string;
  message_id: string | number;
  user_id: string;
  emoji: string;
  user: {
    id: string;
    display_name: string;
    avatar_emoji: string;
  };
}

// ── Constants ──────────────────────────────────────────────────

const REACTION_EMOJIS = [
  '\u{1F64F}', '\u{2764}\u{FE0F}', '\u{271D}\u{FE0F}', '\u{1F525}', '\u{2728}', '\u{1F54A}\u{FE0F}',
  '\u{1F4D6}', '\u{1F31F}', '\u{1F4AA}', '\u{1F6E1}\u{FE0F}', '\u{1F64C}', '\u{1F451}',
  '\u{1F932}', '\u{1F607}', '\u{1F60A}', '\u{1F622}', '\u{1F62E}', '\u{1F389}',
  '\u{1FAC2}', '\u{270B}', '\u{1F970}', '\u{1F60C}', '\u{2705}', '\u{1F4AF}'
];

const POLL_INTERVAL_MS = 3000;
const INITIAL_MESSAGE_LIMIT = 50;

// ── Helpers ────────────────────────────────────────────────────

const formatTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ── Component ──────────────────────────────────────────────────

const ChannelChat: React.FC<ChannelChatProps> = ({
  nightMode,
  channelId,
  channelName,
  channelTopic,
  userId,
  permissions
}) => {
  // State
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChannelMessage[]>([]);
  const [messageReactions, setMessageReactions] = useState<Record<string | number, MessageReaction[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | number | null>(null);
  const [expandedReactions, setExpandedReactions] = useState<Record<string | number, boolean>>({});
  const [showAllEmojis, setShowAllEmojis] = useState<Record<string | number, boolean>>({});

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const subscriptionRef = useRef<any>(null);

  // ── Data Loading ───────────────────────────────────────────

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    const loadMessages = async () => {
      setLoading(true);

      const [msgs, pinned] = await Promise.all([
        getChannelMessages(channelId, INITIAL_MESSAGE_LIMIT),
        getPinnedChannelMessages(channelId)
      ]);

      setMessages(msgs || []);
      setPinnedMessages(pinned || []);

      // Load reactions for all messages in parallel
      const allMessages: ChannelMessage[] = [...(pinned || []), ...(msgs || [])];
      const reactionsResults = await Promise.all(
        // @ts-ignore - message id type compatibility
        allMessages.map(msg => getChannelMessageReactions(msg.id))
      );

      const reactionsMap: Record<string | number, MessageReaction[]> = {};
      allMessages.forEach((msg, index) => {
        if (reactionsResults[index] !== undefined) {
          reactionsMap[msg.id] = reactionsResults[index];
        }
      });
      setMessageReactions(reactionsMap);

      setLoading(false);

      // Poll for new messages every 3 seconds
      pollInterval = setInterval(async () => {
        const [updatedMessages, updatedPinned] = await Promise.all([
          getChannelMessages(channelId, INITIAL_MESSAGE_LIMIT),
          getPinnedChannelMessages(channelId)
        ]);

        setMessages(updatedMessages || []);
        setPinnedMessages(updatedPinned || []);

        const allUpdated: ChannelMessage[] = [...(updatedPinned || []), ...(updatedMessages || [])];
        const updatedReactionsResults = await Promise.all(
          // @ts-ignore - message id type compatibility
          allUpdated.map(msg => getChannelMessageReactions(msg.id))
        );

        const newReactionsMap: Record<string | number, MessageReaction[]> = {};
        allUpdated.forEach((msg, index) => {
          newReactionsMap[msg.id] = updatedReactionsResults[index];
        });
        setMessageReactions(newReactionsMap);
      }, POLL_INTERVAL_MS);
    };

    loadMessages();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (subscriptionRef.current) unsubscribe(subscriptionRef.current);
    };
  }, [channelId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Message position helper ────────────────────────────────

  const isMessageInBottomHalf = (messageId: string | number): boolean => {
    const el = messageRefs.current[messageId];
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    return mid > window.innerHeight / 2;
  };

  // ── Send Message ───────────────────────────────────────────

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !channelId) return;

    const validation = validateMessage(newMessage, 'message');
    if (!validation.valid) {
      showError(validation.errors[0] || 'Invalid message');
      return;
    }

    const messageContent = sanitizeInput(newMessage);

    // Optimistic update
    const tempMessage: ChannelMessage = {
      id: Date.now(),
      sender_id: userId,
      content: newMessage,
      created_at: new Date().toISOString(),
      sender: {
        display_name: 'You',
        avatar_emoji: '\u{1F464}'
      }
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    const saved = await sendChannelMessage(channelId, userId, messageContent);
    if (!saved) {
      showError('Failed to send message');
    }
  };

  // ── Reactions ──────────────────────────────────────────────

  const handleReaction = async (messageId: string | number, emoji: string) => {
    if (!userId) return;

    const reactions = messageReactions[messageId] || [];
    const existing = reactions.find(
      r => r.user_id === userId && r.emoji === emoji
    );

    if (existing) {
      // Optimistically remove
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: reactions.filter(r => r.id !== existing.id)
      }));

      // @ts-ignore - message id type compatibility
      removeChannelReaction(messageId, userId, emoji).catch(() => {
        // Rollback on error
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: reactions
        }));
      });
    } else {
      // Optimistically add
      const tempReaction: MessageReaction = {
        id: `temp-${Date.now()}`,
        message_id: messageId,
        user_id: userId,
        emoji,
        user: { id: userId, display_name: 'You', avatar_emoji: '\u{1F464}' }
      };

      setMessageReactions(prev => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), tempReaction]
      }));

      // @ts-ignore - message id type compatibility
      addChannelReaction(messageId, userId, emoji)
        .then((newReaction: any) => {
          if (newReaction) {
            setMessageReactions(prev => ({
              ...prev,
              [messageId]: [
                ...(prev[messageId] || []).filter(r => r.id !== tempReaction.id),
                {
                  ...(newReaction as Omit<MessageReaction, 'user'>),
                  user: { id: userId, display_name: 'You', avatar_emoji: '\u{1F464}' }
                }
              ]
            }));
          }
        })
        .catch(() => {
          setMessageReactions(prev => ({
            ...prev,
            [messageId]: (prev[messageId] || []).filter(r => r.id !== tempReaction.id)
          }));
          showError('Failed to add reaction. Please try again.');
        });
    }

    setShowReactionPicker(null);
  };

  // ── Pin / Unpin ────────────────────────────────────────────

  const handlePinMessage = async (messageId: string | number) => {
    // @ts-ignore - message id type compatibility
    const result = await pinChannelMessage(messageId, userId);
    if (result) {
      const pinned = await getPinnedChannelMessages(channelId);
      setPinnedMessages(pinned || []);
    }
  };

  const handleUnpinMessage = async (messageId: string | number) => {
    // @ts-ignore - message id type compatibility
    const result = await unpinChannelMessage(messageId);
    if (result) {
      const pinned = await getPinnedChannelMessages(channelId);
      setPinnedMessages(pinned || []);
    }
  };

  // ── Reaction rendering helper ──────────────────────────────

  const renderReactions = (messageId: string | number, reactions: MessageReaction[]) => {
    const reactionCounts = reactions.reduce((acc, r) => {
      acc[r.emoji] = acc[r.emoji] || { count: 0, users: [], hasReacted: false };
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.user.display_name);
      if (r.user_id === userId) acc[r.emoji].hasReacted = true;
      return acc;
    }, {} as Record<string, { count: number; users: string[]; hasReacted: boolean }>);

    if (Object.keys(reactionCounts).length === 0) return null;

    const sortedReactions = Object.entries(reactionCounts).sort((a, b) => b[1].count - a[1].count);
    const isExpanded = expandedReactions[messageId];
    const displayReactions = isExpanded ? sortedReactions : sortedReactions.slice(0, 5);
    const hiddenCount = sortedReactions.length - 5;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {displayReactions.map(([emoji, data]) => (
          <button
            key={emoji}
            onClick={() => handleReaction(messageId, emoji)}
            className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
              data.hasReacted
                ? nightMode
                  ? 'bg-[rgba(88,101,242,0.15)] border border-[#5865f2]'
                  : 'bg-blue-100 border border-blue-400'
                : nightMode
                  ? 'bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)]'
                  : 'bg-transparent border border-white/25 hover:bg-white/20 hover:border-slate-300'
            }`}
            title={data.users.join(', ')}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className={`text-[11px] font-medium leading-none ${
              data.hasReacted
                ? nightMode ? 'text-[#dee0fc]' : 'text-blue-700'
                : nightMode ? 'text-[#b5bac1]' : 'text-black'
            }`}>{data.count}</span>
          </button>
        ))}

        {!isExpanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpandedReactions(prev => ({ ...prev, [messageId]: true }))}
            className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
              nightMode
                ? 'bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] text-[#b5bac1]'
                : 'bg-transparent border border-white/25 hover:bg-white/20 text-black'
            }`}
          >
            <span className="text-[13px] font-medium">+{hiddenCount}</span>
          </button>
        )}

        {isExpanded && sortedReactions.length > 5 && (
          <button
            onClick={() => setExpandedReactions(prev => ({ ...prev, [messageId]: false }))}
            className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
              nightMode
                ? 'bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] text-[#b5bac1]'
                : 'bg-transparent border border-white/25 hover:bg-white/20 text-black'
            }`}
          >
            <span className="text-[13px] font-medium">{'\u2212'}</span>
          </button>
        )}
      </div>
    );
  };

  // ── Emoji picker rendering helper ──────────────────────────

  const renderEmojiPicker = (messageId: string | number) => {
    if (showReactionPicker !== messageId) return null;

    const positionClass = isMessageInBottomHalf(messageId)
      ? 'absolute bottom-full mb-1 left-0'
      : 'absolute top-full mt-1 left-0';

    return (
      <div
        className={`${positionClass} border rounded-xl shadow-2xl p-2 z-[100] ${
          nightMode ? 'border-white/10' : 'border-white/25'
        }`}
        style={nightMode ? {
          background: '#1a1a1a',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        } : {
          background: '#ffffff',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
        }}
      >
        <div className="grid grid-cols-6 gap-1 w-[200px]">
          {(showAllEmojis[messageId] ? REACTION_EMOJIS : REACTION_EMOJIS.slice(0, 6)).map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(messageId, emoji)}
              className={`text-lg hover:scale-110 transition-transform p-1.5 rounded flex items-center justify-center ${
                nightMode ? 'hover:bg-white/10' : 'hover:bg-white/20'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        {!showAllEmojis[messageId] && REACTION_EMOJIS.length > 6 && (
          <button
            onClick={() => setShowAllEmojis(prev => ({ ...prev, [messageId]: true }))}
            className={`w-full mt-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
              nightMode ? 'text-slate-100 hover:bg-white/10' : 'text-black hover:bg-white/20'
            }`}
          >
            +{REACTION_EMOJIS.length - 6} more
          </button>
        )}
        {showAllEmojis[messageId] && (
          <button
            onClick={() => setShowAllEmojis(prev => ({ ...prev, [messageId]: false }))}
            className={`w-full mt-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
              nightMode ? 'text-slate-100 hover:bg-white/10' : 'text-black hover:bg-white/20'
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
    const reactions = messageReactions[msg.id] || [];

    return (
      <div
        key={msg.id}
        ref={(el) => { messageRefs.current[msg.id] = el; }}
        className={`flex items-start gap-3 px-4 py-1 group transition-colors ${
          nightMode ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'
        }`}
      >
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{
            background: nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
          }}
        >
          {msg.sender?.avatar_emoji || '\u{1F464}'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`font-semibold text-sm ${nightMode ? 'text-white' : 'text-black'}`}>
              {msg.sender?.display_name}
            </span>
            <span className={`text-xs ${nightMode ? 'opacity-40 text-white' : 'opacity-40 text-black'}`}>
              {formatTime(msg.created_at)}
            </span>

            {/* Pinned indicator */}
            {isPinned && (
              <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />
            )}
          </div>

          <p className={`text-sm break-words whitespace-pre-wrap ${
            nightMode ? 'text-slate-100 opacity-80' : 'text-black opacity-80'
          }`}>
            {msg.content}
          </p>

          {/* Reactions display */}
          {renderReactions(msg.id, reactions)}

          {/* Emoji picker */}
          <div className="relative">
            {renderEmojiPicker(msg.id)}
          </div>
        </div>

        {/* Hover action buttons */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          {/* Reaction button */}
          <button
            onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
            className={`p-1 rounded transition-colors ${
              nightMode
                ? 'bg-white/5 border border-white/10 text-slate-100 hover:bg-white/10'
                : 'bg-white border border-white/25 text-slate-400 hover:text-black shadow-sm'
            }`}
            title="Add reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {/* Pin / Unpin button */}
          {permissions.pin_messages && (
            isPinned ? (
              <button
                onClick={() => handleUnpinMessage(msg.id)}
                className={`p-1 rounded transition-colors ${
                  nightMode
                    ? 'bg-white/5 border border-white/10 text-blue-400 hover:text-blue-300'
                    : 'bg-white border border-white/25 text-blue-500 hover:text-blue-700 shadow-sm'
                }`}
                title="Unpin message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => handlePinMessage(msg.id)}
                className={`p-1 rounded transition-colors ${
                  nightMode
                    ? 'bg-white/5 border border-white/10 text-slate-100 hover:bg-white/10'
                    : 'bg-white border border-white/25 text-slate-400 hover:text-black shadow-sm'
                }`}
                title="Pin message"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  // ── Main Render ────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Channel Header ─────────────────────────────────── */}
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between flex-shrink-0 ${
          nightMode ? 'border-white/10' : 'border-white/25'
        }`}
        style={{
          background: nightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)'
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Hash className={`w-5 h-5 flex-shrink-0 ${nightMode ? 'text-white/50' : 'text-black/50'}`} />
          <h3 className={`font-bold text-sm truncate ${nightMode ? 'text-white' : 'text-black'}`}>
            {channelName}
          </h3>
          {channelTopic && (
            <>
              <div className={`w-px h-4 ${nightMode ? 'bg-white/15' : 'bg-black/15'}`} />
              <p className={`text-xs truncate ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
                {channelTopic}
              </p>
            </>
          )}
        </div>

        {/* Pinned messages toggle */}
        {pinnedMessages.length > 0 && (
          <button
            onClick={() => setShowPinned(!showPinned)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
              showPinned
                ? 'bg-blue-500/20 text-blue-400'
                : nightMode
                  ? 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  : 'text-black/40 hover:text-black/70 hover:bg-black/5'
            }`}
            title="Pinned messages"
          >
            <Pin className="w-3.5 h-3.5" />
            <span className="font-medium">{pinnedMessages.length}</span>
          </button>
        )}
      </div>

      {/* ── Pinned Messages Panel ──────────────────────────── */}
      {showPinned && pinnedMessages.length > 0 && (
        <div
          className={`border-b flex-shrink-0 ${nightMode ? 'border-white/10' : 'border-white/25'}`}
          style={{
            background: nightMode ? 'rgba(0,0,0,0.2)' : 'rgba(239, 246, 255, 0.7)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          <div className="px-4 py-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Pin className="w-3.5 h-3.5 text-blue-500" />
              <span className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-blue-900'}`}>
                Pinned Messages ({pinnedMessages.length})
              </span>
              <button
                onClick={() => setShowPinned(false)}
                className={`ml-auto p-0.5 rounded transition-colors ${
                  nightMode ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-black/40'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {pinnedMessages.map(msg => renderMessage(msg, true))}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages Area ──────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto py-4"
        style={{
          background: nightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)'
        }}
        onClick={() => {
          if (showReactionPicker !== null) setShowReactionPicker(null);
        }}
      >
        {loading ? (
          <div className={`text-center py-8 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full px-4 ${
            nightMode ? 'text-white' : 'text-black'
          }`}>
            <div className="text-4xl mb-3">
              <Hash className="w-12 h-12 opacity-20" />
            </div>
            <h3 className="font-bold text-lg mb-1 opacity-60">
              Welcome to #{channelName}!
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
          <div className="space-y-0.5">
            {messages.map(msg => renderMessage(msg, false))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Message Input ──────────────────────────────────── */}
      {permissions.send_messages ? (
        <form
          onSubmit={handleSendMessage}
          className={`px-4 py-3 border-t flex gap-2 items-end flex-shrink-0 ${
            nightMode ? 'border-white/10' : 'border-white/25'
          }`}
          style={{
            background: nightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)'
          }}
        >
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={`Message #${channelName}`}
            rows={1}
            className={`flex-1 px-3 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[100px] overflow-y-auto text-[15px] ${
              nightMode
                ? 'bg-white/5 border border-white/10 text-slate-100 placeholder-gray-400'
                : 'border border-white/25 text-black placeholder-black/50'
            }`}
            style={nightMode ? {
              height: 'auto',
              minHeight: '40px'
            } : {
              height: 'auto',
              minHeight: '40px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 100) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`w-10 h-10 border rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center transition-all duration-200 text-slate-100 ${
              nightMode ? 'border-white/20' : 'shadow-md border-white/30'
            }`}
            style={{
              background: 'rgba(79, 150, 255, 0.85)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
            onMouseEnter={(e) => {
              if (newMessage.trim()) {
                e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
            }}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      ) : (
        <div
          className={`px-4 py-3 border-t text-center text-sm flex-shrink-0 ${
            nightMode ? 'border-white/10 text-white/30' : 'border-white/25 text-black/30'
          }`}
          style={{
            background: nightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)'
          }}
        >
          You do not have permission to send messages in this channel.
        </div>
      )}
    </div>
  );
};

export default ChannelChat;
