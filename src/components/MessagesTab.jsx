import React, { useState, useEffect, useRef } from 'react';
import { Smile } from 'lucide-react';
import { sendMessage, getConversation } from '../lib/database';
import { useUserProfile } from './useUserProfile';

const MessagesTab = ({ nightMode }) => {
  const { profile } = useUserProfile();
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [showAllEmojis, setShowAllEmojis] = useState({});
  const [expandedReactions, setExpandedReactions] = useState({});
  const messagesEndRef = useRef(null);

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

  // Hardcoded conversations for now (will load from database later)
  const conversations = [
    {
      id: 1,
      userId: '993b3e03-fa0a-42fd-b2d5-1b1b49d17b5c', // Your user ID
      name: "Sarah Mitchell",
      avatar: "👤",
      online: true,
      lastMessage: "That's amazing!",
      timestamp: "2m ago"
    },
    {
      id: 2,
      userId: '993b3e03-fa0a-42fd-b2d5-1b1b49d17b5c', // Your user ID (for testing)
      name: "John Rivers",
      avatar: "🧑",
      online: false,
      lastMessage: "See you Sunday!",
      timestamp: "1h ago"
    },
  ];

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

    // Optimistically add message to UI
    const tempMessage = {
      id: Date.now(),
      sender_id: profile.supabaseId,
      recipient_id: conversation.userId,
      content: newMessage,
      created_at: new Date().toISOString(),
      sender: {
        username: profile.username,
        display_name: profile.displayName,
        avatar_emoji: profile.avatar
      }
    };

    setMessages([...messages, tempMessage]);
    setNewMessage('');

    // Send to database
    console.log('Sending message...', {
      from: profile.supabaseId,
      to: conversation.userId,
      content: newMessage
    });

    const savedMessage = await sendMessage(
      profile.supabaseId,
      conversation.userId,
      newMessage
    );

    if (savedMessage) {
      console.log('✅ Message sent to database!', savedMessage);
      // Reload messages to get the real data
      const updatedMessages = await getConversation(
        profile.supabaseId,
        conversation.userId
      );
      console.log('Loaded messages from database:', updatedMessages);
      setMessages(updatedMessages || []);
    } else {
      console.error('❌ Failed to send message');
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
              <div className="text-2xl">{conversation.avatar}</div>
              {conversation.online && (
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 ${nightMode ? 'border-[#0a0a0a]' : 'border-white'}`}></div>
              )}
            </div>
            <span className={`font-semibold ${nightMode ? 'text-white' : 'text-black'}`}>{conversation.name}</span>
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
            <div className={`text-center ${nightMode ? 'text-gray-400' : 'text-black'} py-8`}>
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className={`text-center ${nightMode ? 'text-gray-400' : 'text-black'} py-8`}>
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-lg flex-shrink-0">
                      {isMe ? profile.avatar : conversation.avatar}
                    </div>

                    <div className="flex-1">
                      {/* Name and timestamp */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-sm font-semibold ${nightMode ? 'text-white' : 'text-black'}`}>
                          {isMe ? profile.displayName : conversation.name}
                        </span>
                        <span className={`text-[10px] ${nightMode ? 'text-gray-400' : 'text-black'} opacity-70`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Message bubble with reactions */}
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2 group">
                          <div className={nightMode ? 'bg-transparent hover:bg-white/5 text-white px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors' : 'bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors'}>
                            <p className="text-[15px] break-words whitespace-pre-wrap leading-snug">{msg.content}</p>

                            {/* Reaction Picker */}
                            {showReactionPicker === msg.id && (
                              <div className={nightMode ? 'absolute bottom-full mb-1 left-0 bg-white/5 border border-white/10 rounded-xl shadow-2xl p-2 z-50' : 'absolute bottom-full mb-1 left-0 border border-white/25 rounded-xl shadow-2xl p-2 z-50'} style={nightMode ? {} : {
                                background: 'rgba(255, 255, 255, 0.2)',
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
                                      className={nightMode ? 'text-xl hover:scale-110 transition-transform p-1.5 hover:bg-white/10 rounded flex items-center justify-center' : 'text-xl hover:scale-110 transition-transform p-1.5 hover:bg-white/20 rounded flex items-center justify-center'}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                                {!showAllEmojis[msg.id] && reactionEmojis.length > 6 && (
                                  <button
                                    onClick={() => setShowAllEmojis(prev => ({ ...prev, [msg.id]: true }))}
                                    className={nightMode ? 'w-full mt-1 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/10 rounded transition-colors' : 'w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors'}
                                  >
                                    +{reactionEmojis.length - 6} more
                                  </button>
                                )}
                                {showAllEmojis[msg.id] && (
                                  <button
                                    onClick={() => setShowAllEmojis(prev => ({ ...prev, [msg.id]: false }))}
                                    className={nightMode ? 'w-full mt-1 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/10 rounded transition-colors' : 'w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors'}
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
                              className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-white hover:text-white' : 'p-1 border border-white/25 rounded text-black hover:text-black shadow-sm'}
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
                                      <span className="text-base leading-none">{emoji}</span>
                                      <span className={`text-[13px] font-medium leading-none ${
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
                                      <span className="text-[13px] font-medium">+{hiddenCount}</span>
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
                                      <span className="text-[13px] font-medium">−</span>
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
            className={nightMode ? 'flex-1 px-3 py-2.5 bg-white/5 border border-white/10 text-white placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[100px] overflow-y-auto text-[15px]' : 'flex-1 px-3 py-2.5 border border-white/25 text-black placeholder-black/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[100px] overflow-y-auto text-[15px]'}
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
            className={`w-10 h-10 border rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center transition-all duration-200 text-white ${nightMode ? 'border-white/20' : 'border-white/30'}`}
            style={nightMode ? (newMessage.trim() ? {
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            } : {
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }) : {
              background: 'rgba(59, 130, 246, 0.7)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
            onMouseEnter={(e) => {
              if (nightMode && newMessage.trim()) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
              } else if (!nightMode && newMessage.trim()) {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.85)';
              }
            }}
            onMouseLeave={(e) => {
              if (nightMode) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              } else {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.7)';
              }
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
    <div className="py-4 space-y-3 px-4 pb-24">
      <div className="mb-4">
        <h2 className={`text-lg font-bold ${nightMode ? 'text-white' : 'text-black'}`}>Messages</h2>
        <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-black'} opacity-70`}>Stay connected with your community</p>
      </div>

      {conversations.length === 0 ? (
        <div
          className={`rounded-xl border p-8 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <div className="text-5xl mb-4">💬</div>
          <p className={`font-semibold mb-2 ${nightMode ? 'text-white' : 'text-black'}`}>No conversations yet</p>
          <p className={nightMode ? 'text-sm text-gray-400' : 'text-sm text-black opacity-70'}>Connect with others to start messaging!</p>
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
                <div className="text-2xl">{chat.avatar}</div>
                {chat.online && (
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 ${nightMode ? 'border-[#0a0a0a]' : 'border-white'}`}></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${nightMode ? 'text-white' : 'text-black'}`}>{chat.name}</h3>
                <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-black'} opacity-70`}>{chat.lastMessage}</p>
              </div>
              <span className={`text-xs ${nightMode ? 'text-gray-400' : 'text-black'} opacity-70`}>{chat.timestamp}</span>
            </div>
          </button>
        ))
      )}
    </div>
  );
};

export default MessagesTab;
