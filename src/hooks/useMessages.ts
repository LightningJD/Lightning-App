import { useState, useEffect, useRef, useCallback } from 'react';
import {
  sendMessage, getConversation, getUserConversations,
  subscribeToMessages, subscribeToMessageReactions, unsubscribe,
  canSendMessage, isUserBlocked, isBlockedBy, getBlockedUserIds,
  addReaction, removeReaction, getMessageReactions, getReactionsForMessages,
  deleteMessage, markConversationAsRead,
} from '../lib/database';
import { showError } from '../lib/toast';
import { checkBeforeSend } from '../lib/contentFilter';
import { checkMilestoneSecret, checkMessageSecrets, unlockSecret } from '../lib/secrets';
import { trackMessageByHour, getEarlyBirdMessages, getNightOwlMessages, trackMessageStreak } from '../lib/activityTracker';
import { checkAndNotify, recordAttempt } from '../lib/rateLimiter';
import { validateMessage, sanitizeInput } from '../lib/inputValidation';
import { uploadMessageImage } from '../lib/cloudinary';

// ── Types ────────────────────────────────────────────────

interface Message {
  id: number | string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  image_url?: string;
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

interface Reaction {
  emoji: string;
  userId: string;
}

interface UseMessagesOptions {
  userId?: string;
  profile?: {
    supabaseId: string;
    username?: string;
    displayName?: string;
    avatar?: string;
  };
  initialConversationId?: number | string | null;
  onConversationsCountChange?: (count: number) => void;
}

// ── Helper: filter blocked users from conversations ─────
// Uses a single batch query (2 DB calls total) instead of 2 per conversation.

async function filterBlockedConversations(
  userId: string,
  conversations: any[]
): Promise<any[]> {
  if (conversations.length === 0) return [];
  try {
    const blockedIds = await getBlockedUserIds(userId);
    if (blockedIds.size === 0) return conversations;
    return conversations.filter(convo => !blockedIds.has(convo.userId));
  } catch {
    return conversations;
  }
}

// ── Hook ─────────────────────────────────────────────────

export function useMessages({ userId, profile, initialConversationId, onConversationsCountChange }: UseMessagesOptions) {
  // Core state
  const [activeChat, setActiveChat] = useState<number | string | null>(initialConversationId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Reactions
  const [messageReactions, setMessageReactions] = useState<Record<string | number, Reaction[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<number | string | null>(null);
  const [showAllEmojis, setShowAllEmojis] = useState<Record<string | number, boolean>>({});
  const [expandedReactions, setExpandedReactions] = useState<Record<string | number, boolean>>({});

  // Message composition
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const reactionSubscriptionRef = useRef<any>(null);
  const userIsScrollingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Load conversations ──────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setIsInitialLoad(false);
      return;
    }
    try {
      const userConversations = await getUserConversations(userId);
      const unblocked = await filterBlockedConversations(userId, userConversations);
      setConversations(unblocked);
      const totalUnread = unblocked.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
      onConversationsCountChange?.(totalUnread);
      setIsInitialLoad(false);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      setConversations([]);
      setIsInitialLoad(false);
      onConversationsCountChange?.(0);
      if (error?.message && !error.message.includes('Failed to fetch')) {
        showError('Failed to load conversations. Please check your connection.');
      }
    }
  }, [userId, onConversationsCountChange]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Subscribe to new messages (real-time) ───────────────

  // Use a ref to track activeChat so the subscription callback always
  // sees the latest value without needing activeChat in the deps array.
  // This prevents re-creating the subscription every time the user
  // switches chats, which was causing channel churn.
  const activeChatRef = useRef(activeChat);
  activeChatRef.current = activeChat;

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    const subscription = subscribeToMessages(userId, async (payload: any) => {
      if (!isMounted) return;

      const eventType = payload.eventType;

      // ── Handle DELETE events ──────────────────────────
      if (eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setMessages(prev => prev.filter(m => String(m.id) !== String(deletedId)));
        }
        // Refresh conversation list in background (last message may have changed)
        getUserConversations(userId)
          .then(updated => filterBlockedConversations(userId, updated))
          .then(unblocked => {
            if (!isMounted) return;
            setConversations(unblocked);
            const totalUnread = unblocked.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
            onConversationsCountChange?.(totalUnread);
          })
          .catch(() => {});
        return;
      }

      // ── Handle INSERT events ──────────────────────────
      const newMsg = payload.new;
      const currentChat = activeChatRef.current;

      // If this message is for the active chat, append it immediately
      if (currentChat && newMsg?.sender_id === String(currentChat)) {
        // Immediately append the new message so the user sees it right away
        setMessages(prev => {
          // Avoid duplicates (message may already be there from optimistic send)
          if (prev.some(m => String(m.id) === String(newMsg.id))) return prev;
          return [...prev, newMsg].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });

        // Mark as read in background (non-blocking)
        markConversationAsRead(userId, newMsg.sender_id).catch(() => {});
      }

      // Refresh conversation list in background for unread badge counts
      getUserConversations(userId)
        .then(updated => filterBlockedConversations(userId, updated))
        .then(unblocked => {
          if (!isMounted) return;
          setConversations(unblocked);
          const totalUnread = unblocked.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
          onConversationsCountChange?.(totalUnread);
        })
        .catch(() => {});
    });

    return () => {
      isMounted = false;
      if (subscription) unsubscribe(subscription);
    };
  }, [userId, onConversationsCountChange]);

  // ── Subscribe to reaction updates (real-time) ───────────

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    const reactionSub = subscribeToMessageReactions((payload: any) => {
      if (!isMounted) return;
      const messageId = payload.new?.message_id || payload.old?.message_id;
      if (messageId) {
        getMessageReactions(String(messageId))
          .then(reactions => {
            if (isMounted) {
              setMessageReactions(prev => ({
                ...prev,
                [messageId]: reactions.map((r: any) => ({ emoji: r.emoji, userId: r.user_id })),
              }));
            }
          })
          .catch(error => console.error('Failed to reload reactions:', error));
      }
    });

    reactionSubscriptionRef.current = reactionSub;
    return () => {
      isMounted = false;
      if (reactionSub) unsubscribe(reactionSub);
    };
  }, [userId]);

  // ── Load messages when opening a chat ───────────────────

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeChat || !userId) return;
      setLoading(true);
      const conversation = conversations.find(c => c.id === activeChat);
      const chatUserId = conversation?.userId || String(activeChat);

      // Fetch messages + mark read in parallel (mark-read doesn't block rendering)
      const [conversationMessages] = await Promise.all([
        getConversation(userId, chatUserId),
        markConversationAsRead(userId, chatUserId).catch(() => {}),
      ]);
      setMessages(conversationMessages || []);
      setLoading(false); // Show messages immediately, load reactions in background

      // Load reactions in background (non-blocking)
      const messageIds = (conversationMessages || []).map((m: any) => String(m.id));
      if (messageIds.length > 0) {
        getReactionsForMessages(messageIds)
          .then(batchReactions => {
            const reactionsMap: Record<string | number, any[]> = {};
            for (const msgId of messageIds) {
              reactionsMap[msgId] = (batchReactions[msgId] || []).map((r: any) => ({ emoji: r.emoji, userId: r.user_id }));
            }
            setMessageReactions(reactionsMap);
          })
          .catch(() => {});
      }

      // Refresh unread counts in background (non-blocking)
      getUserConversations(userId)
        .then(updated => filterBlockedConversations(userId, updated))
        .then(unblocked => setConversations(unblocked))
        .catch(() => {});
    };
    loadMessages();
  }, [activeChat, userId]);

  // ── Refresh when tab/app regains focus ──────────────────
  // After the device sleeps or the tab is backgrounded for a while,
  // the Realtime WebSocket may silently disconnect. When the user
  // returns we re-fetch the conversation so they see any messages
  // they missed while away.

  useEffect(() => {
    if (!userId) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      // Refresh conversation list
      try {
        const updated = await getUserConversations(userId);
        const unblocked = await filterBlockedConversations(userId, updated);
        setConversations(unblocked);
        const totalUnread = unblocked.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
        onConversationsCountChange?.(totalUnread);
      } catch { /* non-critical */ }

      // Refresh active chat messages
      const currentChat = activeChatRef.current;
      if (currentChat) {
        const conversation = conversations.find(c => c.id === currentChat);
        const chatUserId = conversation?.userId || String(currentChat);
        try {
          const freshMessages = await getConversation(userId, chatUserId);
          setMessages(freshMessages || []);
          // Batch-load reactions
          const msgIds = (freshMessages || []).map((m: any) => String(m.id));
          const batchR = await getReactionsForMessages(msgIds);
          const reactionsMap: Record<string | number, any[]> = {};
          for (const id of msgIds) {
            reactionsMap[id] = (batchR[id] || []).map((r: any) => ({ emoji: r.emoji, userId: r.user_id }));
          }
          setMessageReactions(reactionsMap);
        } catch { /* non-critical */ }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, onConversationsCountChange]);

  // ── Scroll tracking ─────────────────────────────────────

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      userIsScrollingRef.current = scrollHeight - scrollTop - clientHeight > 150;
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeChat]);

  useEffect(() => {
    if (!userIsScrollingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Handlers ────────────────────────────────────────────

  const handleReaction = async (messageId: string | number, emoji: string): Promise<void> => {
    if (!userId) return;
    const reactions = messageReactions[messageId] || [];
    const existing = reactions.find(r => r.userId === userId && r.emoji === emoji);

    if (existing) {
      // Optimistic remove
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: reactions.filter(r => r.userId !== userId || r.emoji !== emoji),
      }));
      // @ts-ignore
      const result = await removeReaction(String(messageId), userId, emoji);
      if (!result) {
        setMessageReactions(prev => ({ ...prev, [messageId]: reactions }));
      }
    } else {
      // Optimistic add
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: [...reactions, { emoji, userId }],
      }));
      // @ts-ignore
      const result = await addReaction(String(messageId), userId, emoji);
      if (!result) {
        setMessageReactions(prev => ({ ...prev, [messageId]: reactions }));
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showError('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { showError('Image must be under 10MB'); return; }
    setPendingImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearPendingImage = () => {
    setPendingImage(null);
    setPendingImagePreview(null);
  };

  const handleSendMessage = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingImage) || !profile) return;

    // Validate
    if (newMessage.trim()) {
      const validation = validateMessage(newMessage, 'message');
      if (!validation.valid) { showError(validation.errors[0] || 'Invalid message'); return; }

      const profanityResult = checkBeforeSend(newMessage);
      if (!profanityResult.allowed && profanityResult.flag) {
        if (profanityResult.severity === 'high') { showError('This message contains content that violates community guidelines'); return; }
        if (profanityResult.severity === 'medium') {
          if (!window.confirm('This message may contain inappropriate content. Send anyway?')) return;
        }
      }
    }

    // @ts-ignore
    if (!checkAndNotify('send_message', showError)) return;

    const conversation = conversations.find(c => c.id === activeChat);
    // For virtual conversations (friends without prior messages), use activeChat as userId
    const chatUserId = conversation?.userId || String(activeChat);
    if (!conversation && !activeChat) return;

    // Block + privacy checks in parallel (was 3-5 sequential queries)
    const [blocked, blockedBy, privacyCheck] = await Promise.all([
      isUserBlocked(profile.supabaseId, chatUserId),
      isBlockedBy(profile.supabaseId, chatUserId),
      canSendMessage(chatUserId, profile.supabaseId),
    ]);
    if (blocked || blockedBy) { showError('Unable to send message to this user'); return; }
    if (!privacyCheck.allowed) { showError(privacyCheck.reason || 'Unable to send message'); return; }

    // Prepare
    const messageContent = newMessage.trim() ? sanitizeInput(newMessage) : '';
    const previousMessages = [...messages];
    const imageToUpload = pendingImage;
    const imagePreview = pendingImagePreview;

    const replyTarget = replyingTo && messages.some(m => m.id === replyingTo.id && m.content) && replyingTo.content ? replyingTo : null;
    const replyToId = replyTarget?.id ? String(replyTarget.id) : undefined;
    setReplyingTo(null);

    // Optimistic message
    const tempMessage: Message = {
      id: Date.now(),
      sender_id: profile.supabaseId,
      recipient_id: chatUserId,
      content: messageContent || (imageToUpload ? '📷 Image' : ''),
      created_at: new Date().toISOString(),
      image_url: imagePreview || undefined,
      reply_to_message_id: replyToId,
      reply_to: replyTarget ? {
        id: replyTarget.id,
        content: replyTarget.content,
        sender: replyTarget.sender ? {
          username: replyTarget.sender.username || '',
          display_name: replyTarget.sender.display_name || '',
          avatar_emoji: replyTarget.sender.avatar_emoji || '👤',
        } : {
          username: profile.username || '',
          display_name: profile.displayName || '',
          avatar_emoji: profile.avatar || '👤',
        },
      } : undefined,
      sender: {
        username: profile.username || '',
        display_name: profile.displayName || '',
        avatar_emoji: profile.avatar || '👤',
      },
    };

    setMessages([...messages, tempMessage]);
    setNewMessage('');
    setPendingImage(null);
    setPendingImagePreview(null);

    try {
      // Upload image
      let uploadedImageUrl: string | undefined;
      if (imageToUpload) {
        setUploadingImage(true);
        try {
          uploadedImageUrl = await uploadMessageImage(imageToUpload);
        } catch (imgErr) {
          console.error('Image upload failed:', imgErr);
          showError('Failed to upload image');
          setUploadingImage(false);
          setMessages(previousMessages);
          return;
        }
        setUploadingImage(false);
      }

      // Send to database
      const finalContent = messageContent || (uploadedImageUrl ? '📷 Image' : '');
      const result = await sendMessage(profile.supabaseId, chatUserId, finalContent, replyToId, uploadedImageUrl);
      if (result.error) throw new Error(result.error);

      const savedMessage = result.data;
      if (!savedMessage) throw new Error('Failed to send message: No data returned');

      recordAttempt('send_message');

      // Replace optimistic message with real one
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempMessage.id);
        return [...filtered, savedMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      // ── All remaining work is non-blocking background tasks ──
      // Secrets, achievements, and conversation reload happen asynchronously
      // so they never slow down the send or cause the message to fail.

      // Background: check secrets & achievements (fire-and-forget)
      (async () => {
        try {
          checkMessageSecrets(messageContent);
          trackMessageByHour();
          if (getEarlyBirdMessages() >= 10) unlockSecret('early_bird_messenger');
          if (getNightOwlMessages() >= 10) unlockSecret('night_owl_messenger');
          if (trackMessageStreak() >= 7) unlockSecret('messages_streak_7');
        } catch { /* non-critical */ }
      })();
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      showError(error?.message || 'Failed to send message. Please try again.');
      setMessages(previousMessages);
      setNewMessage(messageContent);
    }
  };

  const handleDeleteMessage = async (messageId: string | number) => {
    if (!userId) return;
    try {
      await deleteMessage(String(messageId), userId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
      showError('Failed to delete message');
    }
  };

  // Helper
  const isMessageInBottomHalf = (messageId: string | number): boolean => {
    const el = messageRefs.current[messageId];
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top + rect.height / 2 > window.innerHeight / 2;
  };

  return {
    // Core state
    activeChat, setActiveChat,
    messages, setMessages,
    conversations, setConversations,
    loading, isInitialLoad,

    // Reactions
    messageReactions, setMessageReactions,
    showReactionPicker, setShowReactionPicker,
    showAllEmojis, setShowAllEmojis,
    expandedReactions, setExpandedReactions,

    // Message composition
    newMessage, setNewMessage,
    replyingTo, setReplyingTo,
    pendingImage, pendingImagePreview,
    uploadingImage,
    imageInputRef,

    // Scroll refs
    messagesEndRef, messagesContainerRef, messageRefs,

    // Handlers
    handleReaction,
    handleSendMessage,
    handleDeleteMessage,
    handleImageSelect,
    clearPendingImage,
    loadConversations,
    isMessageInBottomHalf,
  };
}

export type { Message, Conversation, Reaction };
