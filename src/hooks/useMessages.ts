import { useState, useEffect, useRef, useCallback } from 'react';
import {
  sendMessage, getConversation, getUserConversations,
  subscribeToMessages, subscribeToMessageReactions, unsubscribe,
  canSendMessage, isUserBlocked, isBlockedBy,
  addReaction, removeReaction, getMessageReactions,
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

async function filterBlockedConversations(
  userId: string,
  conversations: any[]
): Promise<any[]> {
  const result: any[] = [];
  for (const convo of conversations) {
    try {
      const blocked = await isUserBlocked(userId, convo.userId);
      const blockedBy = await isBlockedBy(userId, convo.userId);
      if (!blocked && !blockedBy) {
        result.push(convo);
      }
    } catch {
      result.push(convo);
    }
  }
  return result;
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

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    const subscription = subscribeToMessages(userId, async (payload: any) => {
      if (!isMounted) return;

      // Reload conversations for unread counts
      const updated = await getUserConversations(userId);
      const unblocked = await filterBlockedConversations(userId, updated);
      if (isMounted) {
        setConversations(unblocked);
        const totalUnread = unblocked.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
        onConversationsCountChange?.(totalUnread);
      }

      // If message is for active chat, reload messages
      // @ts-ignore
      if (activeChat && payload.new.sender_id === activeChat) {
        await markConversationAsRead(userId, payload.new.sender_id);
        try {
          // @ts-ignore
          const data = await getConversation(userId, activeChat);
          if (isMounted && data && data.length >= 0) {
            setMessages(data);
            // Reload reactions
            const reactionsMap: Record<string | number, any[]> = {};
            for (const msg of data || []) {
              const reactions = await getMessageReactions(String(msg.id));
              reactionsMap[msg.id] = reactions.map((r: any) => ({ emoji: r.emoji, userId: r.user_id }));
            }
            setMessageReactions(reactionsMap);

            // Refresh conversations again after marking read
            const refreshed = await getUserConversations(userId);
            const refreshedUnblocked = await filterBlockedConversations(userId, refreshed);
            if (isMounted) {
              setConversations(refreshedUnblocked);
              const totalUnread = refreshedUnblocked.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
              onConversationsCountChange?.(totalUnread);
            }
          }
        } catch (error) {
          console.error('Failed to load messages from real-time subscription:', error);
        }
      }
    });

    return () => {
      isMounted = false;
      if (subscription) unsubscribe(subscription);
    };
  }, [userId, activeChat, onConversationsCountChange]);

  // ── Subscribe to reaction updates (real-time) ───────────

  useEffect(() => {
    if (!activeChat) return;
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
  }, [activeChat]);

  // ── Load messages when opening a chat ───────────────────

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeChat || !userId) return;
      setLoading(true);
      const conversation = conversations.find(c => c.id === activeChat);
      // Use conversation.userId if found, otherwise treat activeChat as a userId
      // (supports virtual conversations created for friends without prior messages)
      const chatUserId = conversation?.userId || String(activeChat);

      await markConversationAsRead(userId, chatUserId);
      const conversationMessages = await getConversation(userId, chatUserId);
      setMessages(conversationMessages || []);

      // Load reactions
      const reactionsMap: Record<string | number, any[]> = {};
      for (const msg of conversationMessages || []) {
        const reactions = await getMessageReactions(String(msg.id));
        reactionsMap[msg.id] = reactions.map((r: any) => ({ emoji: r.emoji, userId: r.user_id }));
      }
      setMessageReactions(reactionsMap);

      // Refresh conversations for unread counts
      const updated = await getUserConversations(userId);
      const unblocked = await filterBlockedConversations(userId, updated);
      setConversations(unblocked);

      setLoading(false);
    };
    loadMessages();
  }, [activeChat, userId]);

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

    // Block checks
    const blocked = await isUserBlocked(profile.supabaseId, chatUserId);
    const blockedBy = await isBlockedBy(profile.supabaseId, chatUserId);
    if (blocked || blockedBy) { showError('Unable to send message to this user'); return; }

    const { allowed, reason } = await canSendMessage(chatUserId, profile.supabaseId);
    if (!allowed) { showError(reason || 'Unable to send message'); return; }

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

      // Check secrets & achievements
      const allConvos = await getUserConversations(profile.supabaseId);
      let totalMessages = 0;
      if (allConvos) {
        for (const convo of allConvos) {
          try {
            const convoMessages = await getConversation(profile.supabaseId, convo.userId) as Message[];
            totalMessages += convoMessages?.filter(m => m.sender_id === profile.supabaseId).length || 0;
          } catch { /* continue */ }
        }
      }
      if (totalMessages === 1) checkMilestoneSecret('messages', 1);
      else if (totalMessages === 100) checkMilestoneSecret('messages', 100);
      checkMessageSecrets(messageContent);
      trackMessageByHour();
      if (getEarlyBirdMessages() >= 10) unlockSecret('early_bird_messenger');
      if (getNightOwlMessages() >= 10) unlockSecret('night_owl_messenger');
      if (trackMessageStreak() >= 7) unlockSecret('messages_streak_7');

      // Replace optimistic message with real one
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempMessage.id);
        return [...filtered, savedMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      // Background reload
      getConversation(profile.supabaseId, chatUserId)
        .then(async (updatedMessages) => {
          if (updatedMessages && updatedMessages.length > 0 && activeChat) {
            setMessages(updatedMessages);
            const reactionsMap: Record<string | number, any[]> = {};
            for (const msg of updatedMessages || []) {
              try {
                const reactions = await getMessageReactions(String(msg.id));
                reactionsMap[msg.id] = reactions.map((r: any) => ({ emoji: r.emoji, userId: r.user_id }));
              } catch { /* keep existing */ }
            }
            setMessageReactions(prev => {
              const merged = { ...prev };
              Object.keys(reactionsMap).forEach(msgId => { merged[msgId] = reactionsMap[msgId]; });
              return merged;
            });
          }
        })
        .catch(error => console.error('Error reloading messages (non-critical):', error));

      // Reactions for new message
      if (savedMessage?.id) {
        const reactions = await getMessageReactions(String(savedMessage.id));
        setMessageReactions(prev => ({
          ...prev,
          [savedMessage.id]: reactions.map((r: any) => ({ emoji: r.emoji, userId: r.user_id })),
        }));
      }
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
