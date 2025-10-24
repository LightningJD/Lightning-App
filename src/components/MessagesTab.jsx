import React, { useState, useEffect, useRef } from 'react';
import { Smile, Plus, X, Search } from 'lucide-react';
import { sendMessage, getConversation, getUserConversations, subscribeToMessages, unsubscribe } from '../lib/database';
import { useUserProfile } from './useUserProfile';
import { showError } from '../lib/toast';
import { ConversationSkeleton, MessageSkeleton } from './SkeletonLoader';
import { useGuestModalContext } from '../contexts/GuestModalContext';
import { checkMilestoneSecret } from '../lib/secrets';

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffMs = now - messageDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return messageDate.toLocaleDateString();
};

const MessagesTab = ({ nightMode }) => {
  const { profile } = useUserProfile();
  const { isGuest, checkAndShowModal } = useGuestModalContext();
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [showAllEmojis, setShowAllEmojis] = useState({});
  const [expandedReactions, setExpandedReactions] = useState({});
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const messagesEndRef = useRef(null);
  const recipientInputRef = useRef(null);

  // Example connections/friends - these would come from database
  const connections = [
    { id: 1, name: 'Sarah Mitchell', avatar: '👤', status: 'online' },
    { id: 2, name: 'John Rivers', avatar: '🧑', status: 'offline' },
    { id: 3, name: 'Emma Grace', avatar: '👩', status: 'online' },
    { id: 4, name: 'Michael Davis', avatar: '👨', status: 'online' },
    { id: 5, name: 'Rachel Thompson', avatar: '👩', status: 'offline' },
    { id: 6, name: 'David Wilson', avatar: '🧑', status: 'online' },
    { id: 7, name: 'Lisa Anderson', avatar: '👤', status: 'offline' },
    { id: 8, name: 'James Parker', avatar: '👨', status: 'online' },
    { id: 9, name: 'Maria Garcia', avatar: '👩', status: 'online' },
    { id: 10, name: 'Robert Chen', avatar: '🧑', status: 'offline' },
  ];

  // Auto-focus on recipient input when dialog opens
  useEffect(() => {
    if (showNewChatDialog && recipientInputRef.current) {
      recipientInputRef.current.focus();
    }
  }, [showNewChatDialog]);

  // Reaction emojis (same as Groups)
  const reactionEmojis = [
    '🙏', '❤️', '✝️', '🔥', '✨', '🕊️',
    '📖', '🌟', '💪', '🛡️', '🙌', '👑',
    '🤲', '😇', '😊', '😢', '😮', '🎉',
    '🫂', '✋', '🥰', '😌', '✅', '💯'
  ];

  // Handle reaction toggle
  const handleReaction = (messageId, emoji) => {
    setMessageReactions(prev => {
      const current = prev[messageId] || [];
      const hasReacted = current.some(r => r.emoji === emoji && r.userId === profile.supabaseId);

      if (hasReacted) {
        // Remove reaction
        return {
          ...prev,
          [messageId]: current.filter(r => !(r.emoji === emoji && r.userId === profile.supabaseId))
        };
      } else {
        // Add reaction
        return {
          ...prev,
          [messageId]: [...current, { emoji, userId: profile.supabaseId }]
        };
      }
    });
  };

  // Block guests from accessing messages (Freemium Browse & Block)
  useEffect(() => {
    if (isGuest) {
      console.log('🚫 Guest attempted to access Messages - blocking');
      checkAndShowModal();
    }
  }, [isGuest]);

  // Load conversations from database
  useEffect(() => {
    const loadConversations = async () => {
      if (profile?.supabaseId) {
        const userConversations = await getUserConversations(profile.supabaseId);
        setConversations(userConversations);
        setIsInitialLoad(false);
      }
    };

    loadConversations();
  }, [profile?.supabaseId]);

  // Subscribe to new messages for real-time updates
  useEffect(() => {
    if (!profile?.supabaseId) return;

    console.log('📡 Setting up real-time message subscription...');

    const subscription = subscribeToMessages(profile.supabaseId, (payload) => {
      console.log('📨 New message received!', payload);

      // Reload conversations to update the list
      getUserConversations(profile.supabaseId).then(setConversations);

      // If the message is for the active chat, reload messages
      if (activeChat && payload.new.sender_id === activeChat) {
        getConversation(profile.supabaseId, activeChat).then(setMessages);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up message subscription...');
      if (subscription) {
        unsubscribe(subscription);
      }
    };
  }, [profile?.supabaseId, activeChat]);

  // Load messages when opening a chat
  useEffect(() => {
    const loadMessages = async () => {
      if (activeChat && profile?.supabaseId) {
        setLoading(true);
        const conversation = conversations.find(c => c.id === activeChat);
        if (conversation) {
          // Load conversation from database
          const conversationMessages = await getConversation(
            profile.supabaseId,
            conversation.userId
          );
          setMessages(conversationMessages || []);
        }
        setLoading(false);
      }
    };

    loadMessages();
  }, [activeChat, profile?.supabaseId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.supabaseId) return;

    const conversation = conversations.find(c => c.id === activeChat);
    if (!conversation) return;

    // Save the original message content and previous messages
    const messageContent = newMessage;
    const previousMessages = [...messages];

    // Optimistically add message to UI
    const tempMessage = {
      id: Date.now(),
      sender_id: profile.supabaseId,
      recipient_id: conversation.userId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender: {
        username: profile.username,
        display_name: profile.displayName,
        avatar_emoji: profile.avatar
      }
    };

    setMessages([...messages, tempMessage]);
    setNewMessage('');

    try {
      // Send to database
      console.log('Sending message...', {
        from: profile.supabaseId,
        to: conversation.userId,
        content: messageContent
      });

      const savedMessage = await sendMessage(
        profile.supabaseId,
        conversation.userId,
        messageContent
      );

      if (savedMessage) {
        console.log('✅ Message sent to database!', savedMessage);

        // Check message milestone secrets
        // Count total messages sent by this user (rough estimate from all conversations)
        const allConvos = await getUserConversations(profile.supabaseId);
        let totalMessages = 0;
        if (allConvos) {
          for (const convo of allConvos) {
            const convoMessages = await getConversation(profile.supabaseId, convo.userId);
            totalMessages += convoMessages?.filter(m => m.senderId === profile.supabaseId).length || 0;
          }
        }

        // Check milestones: 1st message, 100 messages
        if (totalMessages === 1) {
          checkMilestoneSecret('messages', 1);
        } else if (totalMessages === 100) {
          checkMilestoneSecret('messages', 100);
        }

        // Reload messages to get the real data
        const updatedMessages = await getConversation(
          profile.supabaseId,
          conversation.userId
        );
        console.log('Loaded messages from database:', updatedMessages);
        setMessages(updatedMessages || []);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      showError(error.message || 'Failed to send message. Please try again.');
      // Revert to previous messages (remove optimistic message)
      setMessages(previousMessages);
      // Restore the message text so user can try again
      setNewMessage(messageContent);
    }
  };

  if (activeChat) {
    const conversation = conversations.find(c => c.id === activeChat);

    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div
          className={`px-4 py-2.5 border-b flex items-center justify-between ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <button
            onClick={() => setActiveChat(null)}
            className={nightMode ? 'text-blue-500 text-sm font-semibold' : 'text-blue-600 text-sm font-semibold'}
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl overflow-hidden ${nightMode ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                {conversation.avatarImage ? (
                  <img src={conversation.avatarImage} alt={conversation.name} className="w-full h-full object-cover" />
                ) : (
                  conversation.avatar
                )}
              </div>
              {conversation.online && (
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 ${nightMode ? 'border-[#0a0a0a]' : 'border-white'}`}></div>
              )}
            </div>
            <span className={`font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>{conversation.name}</span>
          </div>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>

        {/* Messages */}
        <div
          className="flex-1 p-4 overflow-y-auto"
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)'
          }}
        >
          {loading ? (
            <div className={`text-center ${nightMode ? 'text-slate-100' : 'text-black'} py-8`}>
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className={`text-center ${nightMode ? 'text-slate-100' : 'text-black'} py-8`}>
              <p>No messages yet.</p>
              <p className="text-sm mt-2">Send a message to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === profile.supabaseId;
              return (
                <div key={msg.id} className="mt-3">
                  <div className="flex gap-2 items-start">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 overflow-hidden ${nightMode ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                      {isMe ? (
                        profile.avatarImage ? (
                          <img src={profile.avatarImage} alt={profile.displayName} className="w-full h-full object-cover" />
                        ) : (
                          profile.avatar
                        )
                      ) : (
                        conversation.avatarImage ? (
                          <img src={conversation.avatarImage} alt={conversation.name} className="w-full h-full object-cover" />
                        ) : (
                          conversation.avatar
                        )
                      )}
                    </div>

                    <div className="flex-1">
                      {/* Name and timestamp */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-sm font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                          {isMe ? profile.displayName : conversation.name}
                        </span>
                        <span className={`text-[10px] ${nightMode ? 'text-slate-100' : 'text-black'} opacity-70`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Message bubble with reactions */}
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2 group">
                          <div className={nightMode ? 'bg-transparent hover:bg-white/5 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors' : 'bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors'}>
                            <p className="text-[15px] break-words whitespace-pre-wrap leading-snug">{msg.content}</p>

                            {/* Reaction Picker */}
                            {showReactionPicker === msg.id && (
                              <div className={nightMode ? 'absolute bottom-full mb-1 left-0 border border-white/10 rounded-xl shadow-2xl p-2 z-50' : 'absolute bottom-full mb-1 left-0 border border-white/25 rounded-xl shadow-2xl p-2 z-50'} style={nightMode ? {
                                background: '#1a1a1a',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                              } : {
                                background: '#ffffff',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
                              }}>
                                <div className="grid grid-cols-6 gap-1 w-[200px]">
                                  {(showAllEmojis[msg.id] ? reactionEmojis : reactionEmojis.slice(0, 6)).map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        handleReaction(msg.id, emoji);
                                        setShowReactionPicker(null);
                                      }}
                                      className={nightMode ? 'text-lg hover:scale-110 transition-transform p-1.5 hover:bg-white/10 rounded flex items-center justify-center' : 'text-lg hover:scale-110 transition-transform p-1.5 hover:bg-white/20 rounded flex items-center justify-center'}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                                {!showAllEmojis[msg.id] && reactionEmojis.length > 6 && (
                                  <button
                                    onClick={() => setShowAllEmojis(prev => ({ ...prev, [msg.id]: true }))}
                                    className={nightMode ? 'w-full mt-1 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-white/10 rounded transition-colors' : 'w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors'}
                                  >
                                    +{reactionEmojis.length - 6} more
                                  </button>
                                )}
                                {showAllEmojis[msg.id] && (
                                  <button
                                    onClick={() => setShowAllEmojis(prev => ({ ...prev, [msg.id]: false }))}
                                    className={nightMode ? 'w-full mt-1 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-white/10 rounded transition-colors' : 'w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors'}
                                  >
                                    Show less
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reaction button (shows on hover, on the right) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                              className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 border border-white/25 rounded text-black hover:text-black shadow-sm'}
                              style={nightMode ? {} : {
                                background: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)'
                              }}
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Display reactions */}
                        {messageReactions[msg.id] && messageReactions[msg.id].length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(() => {
                              const reactions = messageReactions[msg.id];
                              const reactionCounts = reactions.reduce((acc, r) => {
                                if (!acc[r.emoji]) {
                                  acc[r.emoji] = { count: 0, hasReacted: false, users: [] };
                                }
                                acc[r.emoji].count++;
                                acc[r.emoji].users.push(r.userId);
                                if (r.userId === profile.supabaseId) {
                                  acc[r.emoji].hasReacted = true;
                                }
                                return acc;
                              }, {});

                              const sortedReactions = Object.entries(reactionCounts).sort((a, b) => b[1].count - a[1].count);
                              const isExpanded = expandedReactions[msg.id];
                              const displayReactions = isExpanded ? sortedReactions : sortedReactions.slice(0, 5);
                              const hiddenCount = sortedReactions.length - 5;

                              return (
                                <>
                                  {displayReactions.map(([emoji, data]) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg.id, emoji)}
                                      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                        data.hasReacted
                                          ? nightMode
                                            ? 'bg-[rgba(88,101,242,0.15)] border border-[#5865f2]'
                                            : 'bg-blue-100 border border-blue-400'
                                          : nightMode
                                            ? 'bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)]'
                                            : 'bg-transparent border border-white/25 hover:bg-white/20'
                                      }`}
                                    >
                                      <span className="text-sm leading-none">{emoji}</span>
                                      <span className={`text-[11px] font-medium leading-none ${
                                        data.hasReacted ? nightMode ? 'text-[#dee0fc]' : 'text-blue-700'
                                                        : nightMode ? 'text-[#b5bac1]' : 'text-black'
                                      }`}>{data.count}</span>
                                    </button>
                                  ))}

                                  {/* Show "more" button if there are hidden reactions */}
                                  {!isExpanded && hiddenCount > 0 && (
                                    <button
                                      onClick={() => setExpandedReactions(prev => ({ ...prev, [msg.id]: true }))}
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                        nightMode
                                          ? 'bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] text-[#b5bac1]'
                                          : 'bg-transparent border border-white/25 hover:bg-white/20 text-black'
                                      }`}
                                    >
                                      <span className="text-[11px] font-medium">+{hiddenCount}</span>
                                    </button>
                                  )}

                                  {/* Show "less" button if expanded */}
                                  {isExpanded && sortedReactions.length > 5 && (
                                    <button
                                      onClick={() => setExpandedReactions(prev => ({ ...prev, [msg.id]: false }))}
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                        nightMode
                                          ? 'bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] text-[#b5bac1]'
                                          : 'bg-transparent border border-white/25 hover:bg-white/20 text-black'
                                      }`}
                                    >
                                      <span className="text-[11px] font-medium">−</span>
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
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className={`px-4 py-3 border-t flex gap-2 items-end ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
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
            placeholder="Message..."
            rows={1}
            className={nightMode ? 'flex-1 px-3 py-2.5 bg-white/5 border border-white/10 text-slate-100 placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[100px] overflow-y-auto text-[15px]' : 'flex-1 px-3 py-2.5 border border-white/25 text-black placeholder-black/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[100px] overflow-y-auto text-[15px]'}
            style={nightMode ? {
              height: 'auto',
              minHeight: '40px'
            } : {
              height: 'auto',
              minHeight: '40px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`w-10 h-10 border rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'border-white/30'}`}
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4 px-4 pb-24">
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
        <h2 className={`text-lg font-bold ${nightMode ? 'text-slate-100' : 'text-black'}`}>Messages</h2>
        <p className={nightMode ? 'text-sm text-slate-100' : 'text-sm text-black'}>Stay connected with your community</p>
      </div>

      {isInitialLoad ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <ConversationSkeleton key={i} nightMode={nightMode} />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div
          className={`rounded-xl border p-10 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <div className="text-6xl mb-4">💬</div>
          <p className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No conversations yet</p>
          <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
            Connect with others in the Connect tab to start messaging!
          </p>
          <div className={`p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
            <p className={`text-xs font-medium ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
              💡 Tip: Visit the <span className="font-bold">Connect</span> tab to find nearby believers
            </p>
          </div>
        </div>
      ) : (
        conversations.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setActiveChat(chat.id)}
            className={`w-full rounded-xl border p-4 text-left transition-all hover:-translate-y-1 ${
              nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
            }`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden ${nightMode ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                  {chat.avatarImage ? (
                    <img src={chat.avatarImage} alt={chat.name} className="w-full h-full object-cover" />
                  ) : (
                    chat.avatar
                  )}
                </div>
                {chat.online && (
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 ${nightMode ? 'border-[#0a0a0a]' : 'border-white'}`}></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>{chat.name}</h3>
                <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black opacity-70'}`}>{chat.lastMessage}</p>
              </div>
              <span className={`text-xs ${nightMode ? 'text-slate-100' : 'text-black opacity-70'}`}>{formatTimestamp(chat.timestamp)}</span>
            </div>
          </button>
        ))
      )}

      {/* New Chat Dialog */}
      {showNewChatDialog && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => {
            setShowNewChatDialog(false);
            setSearchQuery('');
            setNewChatMessage('');
            setSelectedConnections([]);
          }}
        >
          <div
            className={`fixed bottom-24 right-6 rounded-2xl w-96 max-w-[calc(100vw-3rem)] p-6 ${nightMode ? 'bg-white/5' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...nightMode ? {
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
              } : {
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              },
              animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transformOrigin: 'bottom right'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'}`}>New Message</h2>
              <button
                onClick={() => {
                  setShowNewChatDialog(false);
                  setSearchQuery('');
                  setNewChatMessage('');
                  setSelectedConnections([]);
                }}
                className={nightMode ? 'p-2 hover:bg-white/10 rounded-lg transition-colors' : 'p-2 hover:bg-white/20 rounded-lg transition-colors'}
              >
                <X className={nightMode ? 'w-5 h-5 text-slate-100' : 'w-5 h-5 text-black'} />
              </button>
            </div>

            {/* Recipient */}
            <div className="mb-4 relative">
              <label className={`text-sm font-semibold mb-2 block ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                To: {selectedConnections.length > 1 && <span className="text-xs opacity-70">(Group Chat)</span>}
              </label>

              {/* Selected Recipients Chips */}
              {selectedConnections.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedConnections.map((conn) => (
                    <div
                      key={conn.id}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        nightMode
                          ? 'bg-blue-500/20 border border-blue-500/30 text-slate-100'
                          : 'bg-blue-100 border border-blue-200 text-black'
                      }`}
                    >
                      <span>{conn.avatar}</span>
                      <span className="font-medium">{conn.name.split(' ')[0]}</span>
                      <button
                        onClick={() => {
                          setSelectedConnections(selectedConnections.filter(c => c.id !== conn.id));
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
                className={nightMode ? 'w-full px-4 py-2.5 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2.5 border border-white/25 text-black placeholder-black/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
                placeholder={selectedConnections.length > 0 ? "Add another person..." : "Type a name..."}
                autoComplete="off"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && searchQuery && (
                <div
                  className={`absolute top-full left-0 right-0 mt-2 rounded-lg border max-h-48 overflow-y-auto z-10 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white border-white/25'}`}
                  style={nightMode ? {
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                  } : {
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {connections
                    .filter(conn =>
                      conn.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                      !selectedConnections.some(sc => sc.id === conn.id)
                    )
                    .slice(0, 5)
                    .map((conn) => (
                      <button
                        key={conn.id}
                        onClick={() => {
                          setSelectedConnections([...selectedConnections, conn]);
                          setSearchQuery('');
                          setShowSuggestions(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors border-b last:border-b-0 ${
                          nightMode
                            ? 'hover:bg-white/10 border-white/5'
                            : 'hover:bg-white/50 border-white/20'
                        }`}
                      >
                        <div className="text-2xl">{conn.avatar}</div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                            {conn.name}
                          </p>
                          <p className={`text-xs ${nightMode ? 'text-slate-100' : 'text-black'} opacity-70`}>
                            {conn.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                          </p>
                        </div>
                      </button>
                    ))}

                  {connections.filter(conn =>
                    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                    !selectedConnections.some(sc => sc.id === conn.id)
                  ).length === 0 && (
                    <div className={`px-4 py-6 text-center text-sm ${nightMode ? 'text-slate-100' : 'text-black'} opacity-70`}>
                      {selectedConnections.length > 0 ? 'All matching friends already added' : 'No connections found'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className={`text-sm font-semibold mb-2 block ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Message:
              </label>
              <textarea
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className={nightMode ? 'w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none' : 'w-full px-4 py-3 border border-white/25 text-black placeholder-black/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
                placeholder="Type your message..."
                rows={4}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={() => {
                if (selectedConnections.length > 0 && newChatMessage.trim()) {
                  if (selectedConnections.length > 1) {
                    // Create group chat
                    const groupName = selectedConnections.map(c => c.name.split(' ')[0]).join(', ');
                    alert(`Creating group chat with ${selectedConnections.length} people:\n${groupName}\n\nMessage: ${newChatMessage}\n\nThis will redirect you to the Groups tab.`);
                    // TODO: Implement actual group creation and navigation to Groups tab
                  } else {
                    // Send direct message
                    alert(`Sending message to ${selectedConnections[0].name}: ${newChatMessage}`);
                  }
                  setShowNewChatDialog(false);
                  setSearchQuery('');
                  setNewChatMessage('');
                  setSelectedConnections([]);
                }
              }}
              disabled={selectedConnections.length === 0 || !newChatMessage.trim()}
              className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 ${nightMode ? 'border-white/20' : 'border-white/30'}`}
              style={{
                background: (selectedConnections.length > 0 && newChatMessage.trim())
                  ? 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)'
                  : 'rgba(79, 150, 255, 0.5)',
                boxShadow: (selectedConnections.length > 0 && newChatMessage.trim())
                  ? nightMode
                    ? '0 4px 12px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                  : 'none'
              }}
              onMouseEnter={(e) => {
                if (selectedConnections.length > 0 && newChatMessage.trim()) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #5BA3FF 0%, #4F96FF 50%, #3b82f6 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = nightMode
                    ? '0 6px 16px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                    : '0 6px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedConnections.length > 0 && newChatMessage.trim()) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = nightMode
                    ? '0 4px 12px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                }
              }}
            >
              {selectedConnections.length > 1 ? 'Create Group Chat' : 'Send Message'}
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
            background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: nightMode
              ? '0 6px 20px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 6px 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = nightMode
              ? '0 8px 24px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
              : '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = nightMode
              ? '0 6px 20px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 6px 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
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
