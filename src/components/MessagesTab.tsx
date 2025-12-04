import React, { useState, useEffect, useRef } from 'react';
import { Smile, Plus, X, Reply, Trash2, MoreVertical, UserX } from 'lucide-react';
import { sendMessage, getConversation, getUserConversations, subscribeToMessages, subscribeToMessageReactions, unsubscribe, canSendMessage, isUserBlocked, isBlockedBy, createGroup, sendGroupMessage, addReaction, removeReaction, getMessageReactions, deleteMessage, blockUser, markConversationAsRead } from '../lib/database';
import { useUserProfile } from './useUserProfile';
import { showError, showSuccess } from '../lib/toast';
import { ConversationSkeleton } from './SkeletonLoader';
import { useGuestModalContext } from '../contexts/GuestModalContext';
import { checkMilestoneSecret, checkMessageSecrets, unlockSecret } from '../lib/secrets';
import { trackMessageByHour, getEarlyBirdMessages, getNightOwlMessages, trackMessageStreak } from '../lib/activityTracker';
import { checkAndNotify, recordAttempt } from '../lib/rateLimiter';
import { validateMessage, sanitizeInput } from '../lib/inputValidation';
import { isSupabaseConfigured } from '../lib/supabase';

// Helper function to format timestamp
const formatTimestamp = (timestamp: any): string => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffMs = now.getTime() - messageDate.getTime();
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

// Helper function to decode HTML entities
const decodeHTMLEntities = (text: string): string => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

interface Message {
  id: number | string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  reply_to_message_id?: string;
  reply_to?: {
    id: string | number;
    content: string;
    sender: {
      username: string;
      display_name: string;
      avatar_emoji: string;
    };
  };
  sender?: {
    username: string;
    display_name: string;
    avatar_emoji: string;
  };
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

interface Connection {
  id: number | string;
  name: string;
  avatar: string;
  status: string;
}

interface Reaction {
  emoji: string;
  userId: string;
}

interface MessagesTabProps {
  nightMode: boolean;
  onConversationsCountChange?: (count: number) => void;
  startChatWith?: { id: string; name: string; avatar?: string } | null;
}

const MessagesTab: React.FC<MessagesTabProps> = ({ nightMode, onConversationsCountChange, startChatWith }) => {
  const { profile } = useUserProfile();
  const { isGuest, checkAndShowModal } = useGuestModalContext() as { isGuest: boolean; checkAndShowModal: () => void };
  const [activeChat, setActiveChat] = useState<number | string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [showReactionPicker, setShowReactionPicker] = useState<number | string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string | number, Reaction[]>>({});
  const [showAllEmojis, setShowAllEmojis] = useState<Record<string | number, boolean>>({});
  const [expandedReactions, setExpandedReactions] = useState<Record<string | number, boolean>>({});
  const [showNewChatDialog, setShowNewChatDialog] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newChatMessage, setNewChatMessage] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedConnections, setSelectedConnections] = useState<Connection[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showConversationMenu, setShowConversationMenu] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const reactionSubscriptionRef = useRef<any>(null);

  // Helper function to check if message is in bottom half of viewport
  const isMessageInBottomHalf = (messageId: string | number): boolean => {
    const messageEl = messageRefs.current[messageId];
    if (!messageEl) return false;

    const rect = messageEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const messageMiddle = rect.top + (rect.height / 2);

    return messageMiddle > (viewportHeight / 2);
  };

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

  // Close conversation menu when switching chats
  useEffect(() => {
    setShowConversationMenu(false);
  }, [activeChat]);

  // Open New Chat dialog prefilled when launched from Connect/Search
  useEffect(() => {
    if (startChatWith && startChatWith.id && startChatWith.name) {
      setSelectedConnections([{ id: startChatWith.id, name: startChatWith.name, avatar: startChatWith.avatar || '👤', status: 'online' }]);
      setShowNewChatDialog(true);
      setShowSuggestions(false);
    }
  }, [startChatWith]);

  // Reaction emojis (same as Groups)
  const reactionEmojis = [
    '🙏', '❤️', '✝️', '🔥', '✨', '🕊️',
    '📖', '🌟', '💪', '🛡️', '🙌', '👑',
    '🤲', '😇', '😊', '😢', '😮', '🎉',
    '🫂', '✋', '🥰', '😌', '✅', '💯'
  ];

  // Handle reaction toggle
  const handleReaction = async (messageId: string | number, emoji: string): Promise<void> => {
    if (!profile?.supabaseId) return;

    const reactions = messageReactions[messageId] || [];
    const existingReaction = reactions.find(
      r => r.userId === profile.supabaseId && r.emoji === emoji
    );

    if (existingReaction) {
      // Optimistically remove reaction from UI immediately
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: reactions.filter(r => r.userId !== profile?.supabaseId || r.emoji !== emoji)
      }));

      // Then remove from database in background
      // @ts-ignore - message id type compatibility
      const result = await removeReaction(String(messageId), profile.supabaseId, emoji);
      if (!result) {
        // Rollback on error
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: reactions
        }));
      } else {
        // Don't reload immediately - let the subscription handle it
        // This prevents the reaction from disappearing
        console.log('✅ Reaction removed successfully');
      }
    } else {
      // Optimistically add reaction to UI immediately
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: [...reactions, { emoji, userId: profile.supabaseId }]
      }));

      // Then add to database in background
      // @ts-ignore - message id type compatibility
      const result = await addReaction(String(messageId), profile.supabaseId, emoji);
      if (!result) {
        // Rollback on error
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: reactions
        }));
      } else {
        // Don't reload immediately - let the subscription handle it
        // This prevents the reaction from disappearing
        console.log('✅ Reaction added successfully');
      }
    }
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
        try {
          const userConversations = await getUserConversations(profile.supabaseId);

          // Filter out conversations with blocked users
          const unblockedConversations = [];
          for (const convo of userConversations) {
            try {
              const blocked = await isUserBlocked(profile.supabaseId, convo.userId);
              const blockedBy = await isBlockedBy(profile.supabaseId, convo.userId);
              if (!blocked && !blockedBy) {
                unblockedConversations.push(convo);
              }
            } catch (blockError) {
              // Continue even if block check fails
              console.error('Error checking blocked status:', blockError);
              unblockedConversations.push(convo);
            }
          }

          setConversations(unblockedConversations);
          // Inform parent for badge count based on total unread messages (0 when none)
          const totalUnread = unblockedConversations.reduce(
            (sum: number, convo: any) => sum + (convo.unreadCount || 0),
            0
          );
          onConversationsCountChange?.(totalUnread);
          setIsInitialLoad(false);
        } catch (error: any) {
          console.error('Error loading conversations:', error);
          // Set empty conversations on error and stop loading
          setConversations([]);
          setIsInitialLoad(false);
          onConversationsCountChange?.(0);
          // Don't show error toast for connection issues - just log it
          if (error?.message && !error.message.includes('Failed to fetch')) {
            showError('Failed to load conversations. Please check your connection.');
          }
        }
      } else {
        setIsInitialLoad(false);
      }
    };

    loadConversations();
  }, [profile?.supabaseId]);

  // Subscribe to new messages for real-time updates
  useEffect(() => {
    if (!profile?.supabaseId) return;

    let isMounted = true;
    console.log('📡 Setting up real-time message subscription...');

    const subscription = subscribeToMessages(profile.supabaseId, async (payload: any) => {
      if (!isMounted) return; // Prevent state updates after unmount
      console.log('📨 New message received!', payload);

      // Reload conversations to update the list with new unread counts
      const updatedConversations = await getUserConversations(profile.supabaseId);
      // Filter out blocked users
      const unblockedConversations: any[] = [];
      for (const convo of updatedConversations) {
        const blocked = await isUserBlocked(profile.supabaseId, convo.userId);
        const blockedBy = await isBlockedBy(profile.supabaseId, convo.userId);
        if (!blocked && !blockedBy) {
          unblockedConversations.push(convo);
        }
      }
      if (isMounted) {
        setConversations(unblockedConversations);
        const totalUnread = unblockedConversations.reduce(
          (sum: number, convo: any) => sum + (convo.unreadCount || 0),
          0
        );
        onConversationsCountChange?.(totalUnread);
      }

      // If the message is for the active chat, reload messages and mark as read
      // @ts-ignore - activeChat type compatibility
      if (activeChat && payload.new.sender_id === activeChat) {
        // Mark as read since user is viewing the conversation
        await markConversationAsRead(profile.supabaseId, payload.new.sender_id);

        // @ts-ignore - activeChat type compatibility
        getConversation(profile.supabaseId, activeChat)
          .then(async (data) => {
            if (isMounted && data && data.length >= 0) {
              // Only update if we got valid data (even if empty array)
              setMessages(data);
              // Reload reactions for all messages
              const reactionsMap: Record<string | number, any[]> = {};
              for (const msg of data || []) {
                const reactions = await getMessageReactions(String(msg.id));
                reactionsMap[msg.id] = reactions.map((r: any) => ({
                  emoji: r.emoji,
                  userId: r.user_id
                }));
              }
              setMessageReactions(reactionsMap);

              // Reload conversations again to update unread count after marking as read
              const refreshedConversations = await getUserConversations(profile.supabaseId);
              const refreshedUnblocked: any[] = [];
              for (const convo of refreshedConversations) {
                const blocked = await isUserBlocked(profile.supabaseId, convo.userId);
                const blockedBy = await isBlockedBy(profile.supabaseId, convo.userId);
                if (!blocked && !blockedBy) {
                  refreshedUnblocked.push(convo);
                }
              }
              if (isMounted) {
                setConversations(refreshedUnblocked);
                const totalUnread = refreshedUnblocked.reduce(
                  (sum: number, convo: any) => sum + (convo.unreadCount || 0),
                  0
                );
                onConversationsCountChange?.(totalUnread);
              }
            }
          })
          .catch(error => {
            console.error('Failed to load messages from real-time subscription:', error);
            // Don't clear messages on error - keep existing messages
          });
      }
    });

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      console.log('🔌 Cleaning up message subscription...');
      if (subscription) {
        unsubscribe(subscription);
      }
    };
  }, [profile?.supabaseId, activeChat]);

  // Subscribe to message reactions for real-time updates
  useEffect(() => {
    if (!activeChat) return;

    let isMounted = true;
    console.log('📡 Setting up real-time reaction subscription...');

    const reactionSubscription = subscribeToMessageReactions((payload: any) => {
      if (!isMounted) return;
      console.log('🎭 Reaction update received!', payload);

      // Reload reactions for the affected message
      if (payload.new?.message_id || payload.old?.message_id) {
        const messageId = payload.new?.message_id || payload.old?.message_id;
        
        // Always update reactions - the subscription will only fire for relevant messages
        getMessageReactions(String(messageId))
          .then(reactions => {
            if (isMounted) {
              // Use functional update to ensure we have the latest state
              setMessageReactions(prev => ({
                ...prev,
                [messageId]: reactions.map((r: any) => ({
                  emoji: r.emoji,
                  userId: r.user_id
                }))
              }));
              console.log(`✅ Updated reactions for message ${messageId}:`, reactions);
            }
          })
          .catch(error => {
            console.error('Failed to reload reactions:', error);
          });
      }
    });

    reactionSubscriptionRef.current = reactionSubscription;

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      console.log('🔌 Cleaning up reaction subscription...');
      if (reactionSubscription) {
        unsubscribe(reactionSubscription);
      }
    };
  }, [activeChat]);

  // Load messages when opening a chat
  useEffect(() => {
    const loadMessages = async () => {
      if (activeChat && profile?.supabaseId) {
        setLoading(true);
        const conversation = conversations.find(c => c.id === activeChat);
        if (conversation) {
          // Mark conversation as read when opening
          await markConversationAsRead(profile.supabaseId, conversation.userId);

          // Load conversation from database
          const conversationMessages = await getConversation(
            profile.supabaseId,
            conversation.userId
          );
          setMessages(conversationMessages || []);

          // Load reactions for all messages
          const reactionsMap: Record<string | number, any[]> = {};
          for (const msg of conversationMessages || []) {
            const reactions = await getMessageReactions(String(msg.id));
            reactionsMap[msg.id] = reactions.map((r: any) => ({
              emoji: r.emoji,
              userId: r.user_id
            }));
          }
          setMessageReactions(reactionsMap);

          // Reload conversations to update unread counts
          const updatedConversations = await getUserConversations(profile.supabaseId);
          // Filter out blocked users
          const unblockedConversations = [];
          for (const convo of updatedConversations) {
            const blocked = await isUserBlocked(profile.supabaseId, convo.userId);
            const blockedBy = await isBlockedBy(profile.supabaseId, convo.userId);
            if (!blocked && !blockedBy) {
              unblockedConversations.push(convo);
            }
          }
          setConversations(unblockedConversations);
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

  const handleSendMessage = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.supabaseId) return;

    // Validate message content
    const validation = validateMessage(newMessage, 'message');
    if (!validation.valid) {
      showError(validation.errors[0] || 'Invalid message');
      return;
    }

    // Check rate limit
    // @ts-ignore - showError type compatibility
    if (!checkAndNotify('send_message', showError)) {
      return;
    }

    const conversation = conversations.find(c => c.id === activeChat);
    if (!conversation) return;

    // Check message privacy settings
    const { allowed, reason } = await canSendMessage(conversation.userId, profile.supabaseId);
    if (!allowed) {
      showError(reason || 'Unable to send message');
      return;
    }

    // Sanitize and save the original message content and previous messages
    const messageContent = sanitizeInput(newMessage);
    const previousMessages = [...messages];
    
    // Capture reply target and clear reply state BEFORE sending
    // Only reply if the message being replied to still exists in current messages AND has valid content
    const replyTarget = replyingTo && 
                       messages.some(m => m.id === replyingTo.id && m.content) && 
                       replyingTo.content ? replyingTo : null;
    const replyToId = replyTarget?.id ? String(replyTarget.id) : undefined;
    
    // Clear reply state immediately so UI updates
    setReplyingTo(null);
    
    // Log for debugging
    if (replyingTo && !replyTarget) {
      console.log('⚠️ Reply target invalid or deleted, skipping reply');
    }

    // Optimistically add message to UI
    const tempMessage: Message = {
      id: Date.now(),
      sender_id: profile.supabaseId,
      recipient_id: conversation.userId,
      content: messageContent,
      created_at: new Date().toISOString(),
      reply_to_message_id: replyToId,
      reply_to: replyTarget ? {
        id: replyTarget.id,
        content: replyTarget.content,
        sender: replyTarget.sender ? {
          username: replyTarget.sender.username || '',
          display_name: replyTarget.sender.display_name || '',
          avatar_emoji: replyTarget.sender.avatar_emoji || '👤'
        } : {
          username: profile.username || '',
          display_name: profile.displayName || '',
          avatar_emoji: profile.avatar || '👤'
        }
      } : undefined,
      sender: {
        username: profile.username || '',
        display_name: profile.displayName || '',
        avatar_emoji: profile.avatar || '👤'
      }
    };

    setMessages([...messages, tempMessage]);
    setNewMessage('');

    try {
      // Send to database
      console.log('Sending message...', {
        from: profile.supabaseId,
        to: conversation.userId,
        content: messageContent,
        replyTo: replyToId
      });

      const result = await sendMessage(
        profile.supabaseId,
        conversation.userId,
        messageContent,
        replyToId
      );

      if (result.error) {
        // Error occurred, throw with detailed message
        throw new Error(result.error);
      }

      const savedMessage = result.data;
      if (!savedMessage) {
        throw new Error('Failed to send message: No data returned');
      }

      console.log('✅ Message sent to database!', savedMessage);

      // Record rate limit attempt (after successful send)
      recordAttempt('send_message');

      // Check message milestone secrets
      // Count total messages sent by this user (rough estimate from all conversations)
      const allConvos = await getUserConversations(profile.supabaseId);
      let totalMessages = 0;
      if (allConvos) {
        for (const convo of allConvos) {
          try {
            const convoMessages = await getConversation(profile.supabaseId, convo.userId) as Message[];
            totalMessages += convoMessages?.filter(m => m.sender_id === profile.supabaseId).length || 0;
          } catch (error) {
            console.error(`Failed to load messages for conversation ${convo.id}:`, error);
            // Continue to next conversation
          }
        }
      }

      // Check milestones: 1st message, 100 messages
      if (totalMessages === 1) {
        checkMilestoneSecret('messages', 1);
      } else if (totalMessages === 100) {
        checkMilestoneSecret('messages', 100);
      }

      // Check message content for secrets (Amen 3x, scripture sharing)
      checkMessageSecrets(messageContent);

      // Track message timing for early bird / night owl secrets
      trackMessageByHour();
      const earlyBirdCount = getEarlyBirdMessages();
      const nightOwlCount = getNightOwlMessages();

      if (earlyBirdCount >= 10) {
        unlockSecret('early_bird_messenger');
      }
      if (nightOwlCount >= 10) {
        unlockSecret('night_owl_messenger');
      }

      // Track message streak for consistent encourager
      const streak = trackMessageStreak();
      if (streak >= 7) {
        unlockSecret('messages_streak_7');
      }

      // Immediately replace optimistic message with real message from database
      // This ensures correct timestamp and all fields are accurate
      setMessages(prev => {
        const tempId = tempMessage.id;
        const filtered = prev.filter(m => m.id !== tempId);
        // Add the saved message with correct database timestamp
        const updated = [...filtered, savedMessage];
        // Sort by created_at to maintain chronological order
        return updated.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      // Reload messages to get the real data with correct timestamp and reactions
      // Do this in background, but don't clear messages if it fails
      getConversation(profile.supabaseId, conversation.userId)
        .then(async (updatedMessages) => {
          if (updatedMessages && updatedMessages.length > 0 && activeChat === conversation.id) {
            console.log('Loaded messages from database:', updatedMessages);
            setMessages(updatedMessages);
            
            // Reload reactions for all messages, preserving existing optimistic updates
            // Load reactions asynchronously without blocking
            (async () => {
              const reactionsMap: Record<string | number, any[]> = {};
              for (const msg of updatedMessages || []) {
                try {
                  const reactions = await getMessageReactions(String(msg.id));
                  reactionsMap[msg.id] = reactions.map((r: any) => ({
                    emoji: r.emoji,
                    userId: r.user_id
                  }));
                } catch (error) {
                  console.error(`Failed to load reactions for message ${msg.id}:`, error);
                  // Keep existing reactions if load fails
                }
              }
              
              // Update reactions, merging with existing to preserve optimistic updates
              setMessageReactions(prev => {
                const merged: Record<string | number, any[]> = { ...prev };
                // Only update reactions for messages we successfully loaded
                Object.keys(reactionsMap).forEach(msgId => {
                  merged[msgId] = reactionsMap[msgId];
                });
                return merged;
              });
            })();
          }
        })
        .catch(error => {
          console.error('Error reloading messages (non-critical):', error);
          // Don't clear messages on error - we already have the saved message in state
        });

      // Reply state will be cleared after successful send

      // Reload reactions for the new message
      if (savedMessage?.id) {
        const reactions = await getMessageReactions(String(savedMessage.id));
        setMessageReactions(prev => ({
          ...prev,
          [savedMessage.id]: reactions.map((r: any) => ({
            emoji: r.emoji,
            userId: r.user_id
          }))
        }));
      }
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      console.error('Error stack:', error?.stack);
      console.error('Full error object:', error);

      // Show detailed error message
      const errorMessage = error?.message || error?.error || 'Failed to send message. Please try again.';
      showError(errorMessage);

      // Revert to previous messages (remove optimistic message)
      setMessages(previousMessages);
      // Restore the message text so user can try again
      setNewMessage(messageContent);
    }
  };

  if (activeChat) {
    const conversation = conversations.find(c => c.id === activeChat);

    if (!conversation) {
      return null;
    }

    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div
          className={`px-4 py-2.5 border-b flex items-center justify-between relative z-50 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl overflow-hidden ${
                nightMode
                  ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500 text-white'
                  : 'bg-gradient-to-br from-purple-400 to-pink-400 text-white'
              }`}>
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
            <div className="flex flex-col">
              <span className={`font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>{conversation.name}</span>
              <span className={`text-xs ${nightMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {conversation.online ? '🟢 Online' : '⚫ Offline'}
              </span>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowConversationMenu(!showConversationMenu)}
              className={`p-2 rounded-lg transition-colors ${nightMode ? 'hover:bg-white/10 text-slate-100' : 'hover:bg-white/20 text-black'
                }`}
              aria-label="Conversation options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showConversationMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowConversationMenu(false)}
                />
                <div
                  className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl z-[60] border ${
                    nightMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-white/25'
                  }`}
                  style={nightMode ? {
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                  } : {
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                  }}
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
                        await blockUser(profile.supabaseId, conversation.userId);
                        showSuccess(`${conversation.name} has been blocked`);
                        setShowConversationMenu(false);
                        setActiveChat(null);
                        // Reload conversations to remove blocked user
                        const updatedConversations = await getUserConversations(profile.supabaseId);
                        setConversations(updatedConversations || []);
                      } catch (error) {
                        console.error('Error blocking user:', error);
                        showError('Failed to block user');
                      }
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors rounded-t-xl ${nightMode
                        ? 'hover:bg-white/10 text-red-400'
                        : 'hover:bg-red-50 text-red-600'
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
              const isMe = msg.sender_id === profile?.supabaseId;
              return (
                <div key={msg.id} className="mt-3">
                  <div className="flex gap-2 items-start">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 overflow-hidden ${nightMode ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                      {isMe ? (
                        profile?.avatarImage ? (
                          <img src={profile.avatarImage} alt={profile.displayName} className="w-full h-full object-cover" />
                        ) : (
                          profile?.avatar
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
                          {isMe ? profile?.displayName : conversation.name}
                        </span>
                        <span className={`text-[10px] ${nightMode ? 'text-slate-100' : 'text-black'} opacity-70`}>
                          {(() => {
                            // Parse the timestamp - handle both ISO strings and Date objects
                            const msgDate = msg.created_at ? new Date(msg.created_at) : new Date();
                            const now = new Date();
                            const diffMs = now.getTime() - msgDate.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);

                            // Show "Just now" for messages less than 1 minute old
                            if (diffMins < 1) return 'Just now';
                            // Show minutes ago for messages less than 1 hour old
                            if (diffMins < 60) return `${diffMins}m ago`;
                            // Show hours ago for messages less than 24 hours old
                            if (diffHours < 24) return `${diffHours}h ago`;
                            // Show days ago for messages less than 7 days old
                            if (diffDays < 7) return `${diffDays}d ago`;
                            // Show time for today's messages (fallback)
                            if (msgDate.toDateString() === now.toDateString()) {
                              return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                            // Show date and time for older messages
                            return msgDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                          })()}
                        </span>
                      </div>

                      {/* Message bubble with reactions */}
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2 group">
                          <div
                            ref={(el: HTMLDivElement | null) => { messageRefs.current[msg.id] = el; }}
                            className={nightMode ? 'bg-transparent hover:bg-white/5 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors' : 'bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors'}>
                            {/* Reply to message preview - only show if reply_to is valid and has content */}
                            {msg.reply_to && (msg.reply_to as any).id && (msg.reply_to as any).content && (
                              <div className={`mb-2 pl-3 border-l-2 ${nightMode ? 'border-white/20 bg-white/5' : 'border-white/30 bg-white/20'} rounded-r-md py-1.5 text-xs`}>
                                <div className={`font-semibold mb-0.5 ${nightMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                  {(msg.reply_to as any).sender?.display_name || (msg.reply_to as any).sender?.username || 'Unknown'}
                                </div>
                                <div className={`truncate ${nightMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                  {decodeHTMLEntities((msg.reply_to as any).content)}
                                </div>
                              </div>
                            )}
                            <p className="text-[15px] break-words whitespace-pre-wrap leading-snug">{decodeHTMLEntities(msg.content)}</p>

                            {/* Reaction Picker */}
                            {showReactionPicker === msg.id && (
                              <div className={`${isMessageInBottomHalf(msg.id) ? 'absolute bottom-full mb-1 left-0' : 'absolute top-full mt-1 left-0'} border rounded-xl shadow-2xl p-2 z-[100] ${nightMode ? 'border-white/10' : 'border-white/25'}`} style={nightMode ? {
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

                          {/* Action buttons (shows on hover, on the right) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 border border-white/25 rounded text-black hover:text-black shadow-sm'}
                              style={nightMode ? {} : {
                                background: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)'
                              }}
                              title="Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                              className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 border border-white/25 rounded text-black hover:text-black shadow-sm'}
                              style={nightMode ? {} : {
                                background: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)'
                              }}
                              title="React"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {isMe && (
                              <button
                                onClick={async () => {
                                  if (!window.confirm('Delete this message?')) return;
                                  const result = await deleteMessage(String(msg.id), profile!.supabaseId);
                                  if (result.success) {
                                    setMessages(prev => prev.filter(m => m.id !== msg.id));
                                    showSuccess('Message deleted');
                                  } else {
                                    showError(result.error || 'Failed to delete message');
                                  }
                                }}
                                className={nightMode ? 'p-1 bg-white/5 border border-red-500/30 rounded text-red-400 hover:text-red-300' : 'p-1 border border-red-300 rounded text-red-600 hover:text-red-700 shadow-sm'}
                                style={nightMode ? {} : {
                                  background: 'rgba(255, 255, 255, 0.2)',
                                  backdropFilter: 'blur(30px)',
                                  WebkitBackdropFilter: 'blur(30px)'
                                }}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Display reactions */}
                        {messageReactions[msg.id] && messageReactions[msg.id].length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(() => {
                              const reactions = messageReactions[msg.id];
                              const reactionCounts = reactions.reduce((acc: Record<string, { count: number; hasReacted: boolean; users: string[] }>, r) => {
                                if (!acc[r.emoji]) {
                                  acc[r.emoji] = { count: 0, hasReacted: false, users: [] };
                                }
                                acc[r.emoji].count++;
                                acc[r.emoji].users.push(r.userId);
                                if (r.userId === profile?.supabaseId) {
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
                                      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${data.hasReacted
                                          ? nightMode
                                            ? 'bg-[rgba(88,101,242,0.15)] border border-[#5865f2]'
                                            : 'bg-blue-100 border border-blue-400'
                                          : nightMode
                                            ? 'bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)]'
                                            : 'bg-transparent border border-white/25 hover:bg-white/20'
                                        }`}
                                    >
                                      <span className="text-sm leading-none">{emoji}</span>
                                      <span className={`text-[11px] font-medium leading-none ${data.hasReacted ? nightMode ? 'text-[#dee0fc]' : 'text-blue-700'
                                          : nightMode ? 'text-[#b5bac1]' : 'text-black'
                                        }`}>{data.count}</span>
                                    </button>
                                  ))}

                                  {/* Show "more" button if there are hidden reactions */}
                                  {!isExpanded && hiddenCount > 0 && (
                                    <button
                                      onClick={() => setExpandedReactions(prev => ({ ...prev, [msg.id]: true }))}
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${nightMode
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
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${nightMode
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

        {/* Reply preview */}
        {replyingTo && (
          <div className={`px-4 py-2 border-t ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 bg-white/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Reply className={`w-4 h-4 flex-shrink-0 ${nightMode ? 'text-slate-400' : 'text-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${nightMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Replying to {replyingTo.sender_id === profile?.supabaseId ? profile?.displayName : conversation.name}
                  </div>
                  <div className={`text-xs truncate ${nightMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    {replyingTo.content}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className={`p-1 rounded ${nightMode ? 'hover:bg-white/10' : 'hover:bg-white/20'}`}
              >
                <X className={`w-4 h-4 ${nightMode ? 'text-slate-400' : 'text-gray-600'}`} />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className={`sticky bottom-0 px-4 py-3 border-t flex gap-2 items-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {
            background: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          } : {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <div className="flex-1 flex items-center">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // @ts-ignore - Event type mismatch between keyboard and form event
                  handleSendMessage(e);
                }
              }}
              placeholder="Message..."
              rows={1}
              className={nightMode ? 'w-full px-4 py-2.5 bg-white/5 border border-white/10 text-slate-100 placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-[15px]' : 'w-full px-4 py-2.5 border border-white/25 text-black placeholder-black/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-[15px]'}
              style={nightMode ? {
                height: 'auto',
                minHeight: '40px',
                maxHeight: '100px',
                overflowY: 'auto'
              } : {
                height: 'auto',
                minHeight: '40px',
                maxHeight: '100px',
                overflowY: 'auto',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)'
              }}
              onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`w-10 h-10 border rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'border-white/30'}`}
            style={{
              background: 'rgba(79, 150, 255, 0.85)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (newMessage.trim()) {
                e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
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
          {!isSupabaseConfigured() ? (
            <>
              <p className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>Database Not Configured</p>
              <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
                Supabase connection is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file to enable messaging.
              </p>
              <div className={`p-4 rounded-lg ${nightMode ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-xs font-medium ${nightMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  ⚠️ Check the console for detailed setup instructions
                </p>
              </div>
            </>
          ) : (
            <>
              <p className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No conversations yet</p>
              <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
                Connect with others in the Connect tab to start messaging!
              </p>
              <div className={`p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                <p className={`text-xs font-medium ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                  💡 Tip: Visit the <span className="font-bold">Connect</span> tab to find nearby believers
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
            className={`w-full rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-1 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
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
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden ${
                  nightMode
                    ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500 text-white'
                    : 'bg-gradient-to-br from-purple-400 to-pink-400 text-white'
                }`}>
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>{chat.name}</h3>
                  {(chat.unreadCount ?? 0) > 0 && (
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${nightMode
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-500 text-white'
                      }`}>
                      {chat.unreadCount ?? 0}
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${nightMode ? 'text-slate-100' : 'text-black opacity-70'}`}>{decodeHTMLEntities(chat.lastMessage)}</p>
              </div>
              <span className={`text-xs flex-shrink-0 pr-1 ${nightMode ? 'text-slate-100' : 'text-black opacity-70'}`}>{formatTimestamp(chat.timestamp)}</span>
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
            <div className="mb-6 relative">
              <label className={`text-sm font-semibold mb-2 block ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                To: {selectedConnections.length > 1 && <span className="text-xs opacity-70">(Group Chat)</span>}
              </label>

              {/* Selected Recipients Chips */}
              {selectedConnections.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedConnections.map((conn) => (
                    <div
                      key={conn.id}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${nightMode
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
                placeholder={selectedConnections.length > 0 ? "Search by name or username..." : "Search by name or username..."}
                autoComplete="off"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && searchQuery && (
                <div
                  className={`absolute top-full left-0 right-0 mt-3 rounded-lg border max-h-48 overflow-y-auto z-10 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white border-white/25'}`}
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
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors border-b last:border-b-0 ${nightMode
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
            <div className="mb-6">
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
              onClick={async () => {
                if (selectedConnections.length > 0 && newChatMessage.trim()) {
                  if (selectedConnections.length > 1) {
                    // Create group chat
                    const groupName = selectedConnections.map(c => c.name.split(' ')[0]).join(', ');

                    try {
                      if (profile?.supabaseId) {
                        // @ts-ignore - createGroup type includes memberIds field
                        const groupData = {
                          name: `Chat with ${groupName}`,
                          description: `Group chat created on ${new Date().toLocaleDateString()}`,
                          memberIds: selectedConnections.map(c => String(c.id)),
                          isPrivate: true
                        };
                        // @ts-ignore - createGroup type includes memberIds field
                        const newGroup = await createGroup(profile.supabaseId, groupData);

                        // Send the initial message to the group
                        if (newGroup && (newGroup as any).id) {
                          await sendGroupMessage((newGroup as any).id, profile.supabaseId, newChatMessage.trim());
                          showSuccess('Group chat created! Check the Groups tab.');
                        }
                      }
                    } catch (error) {
                      console.error('Error creating group:', error);
                      showError('Failed to create group chat');
                    }
                  } else {
                    // Send direct message
                    try {
                      if (profile?.supabaseId) {
                        // Check if user can send message (message privacy filter)
                        const { allowed, reason } = await canSendMessage(String(selectedConnections[0].id), profile.supabaseId);
                        if (!allowed) {
                          showError(reason || 'Unable to send message');
                          return;
                        }

                        const result = await sendMessage(profile.supabaseId, String(selectedConnections[0].id), newChatMessage.trim());
                        if (result.error) {
                          throw new Error(result.error);
                        }
                        showSuccess('Message sent!');
                        // Reload conversations to show new conversation
                        const userConversations = await getUserConversations(profile.supabaseId);
                        const unblockedConversations = [];
                        for (const convo of userConversations) {
                          const blocked = await isUserBlocked(profile.supabaseId, convo.userId);
                          const blockedBy = await isBlockedBy(profile.supabaseId, convo.userId);
                          if (!blocked && !blockedBy) {
                            unblockedConversations.push(convo);
                          }
                        }
                        setConversations(unblockedConversations);
                      }
                    } catch (error: any) {
                      console.error('Error sending message:', error);
                      showError(error?.message || 'Failed to send message');
                    }
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
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (selectedConnections.length > 0 && newChatMessage.trim()) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #5BA3FF 0%, #4F96FF 50%, #3b82f6 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = nightMode
                    ? '0 6px 16px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                    : '0 6px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
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
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.boxShadow = nightMode
              ? '0 8px 24px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
              : '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
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
