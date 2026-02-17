import { useState, useEffect, useRef, useCallback } from 'react';
import { showError } from '../lib/toast';
import { validateMessage, sanitizeInput } from '../lib/inputValidation';
import { checkBeforeSend } from '../lib/contentFilter';
import { uploadMessageImage } from '../lib/cloudinary';
import {
  sendChannelMessage,
  getChannelMessages,
  pinChannelMessage,
  unpinChannelMessage,
  getPinnedChannelMessages,
  addChannelReaction,
  removeChannelReaction,
  getChannelMessageReactions,
  editChannelMessage,
  deleteChannelMessage,
  sendChannelReply,
  updateTypingIndicator,
  clearTypingIndicator,
  getTypingIndicators,
  searchChannelMessages,
  markChannelRead,
  unsubscribe
} from '../lib/database';

// ── Types ──────────────────────────────────────────────────────

export interface ChannelMessage {
  id: number | string;
  sender_id: string;
  content: string;
  created_at: string;
  image_url?: string;
  is_edited?: boolean;
  reply_to_id?: string | number;
  sender: {
    id?: string;
    display_name: string;
    avatar_emoji: string;
    username?: string;
  };
}

export interface MessageReaction {
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

const POLL_INTERVAL_MS = 3000;
const INITIAL_MESSAGE_LIMIT = 50;
const TYPING_DEBOUNCE_MS = 2000;

// ── Hook Options ───────────────────────────────────────────────

interface UseChannelMessagesOptions {
  channelId: string;
  userId: string;
  userDisplayName?: string;
  serverId?: string;
  members?: Array<{ user_id: string; user?: { id: string; display_name: string; username: string; avatar_emoji?: string } }>;
  permissions: {
    send_messages: boolean;
    pin_messages: boolean;
    delete_messages: boolean;
  };
}

// ── Hook ───────────────────────────────────────────────────────

export function useChannelMessages({
  channelId,
  userId,
  userDisplayName,
  serverId,
  members,
  permissions,
}: UseChannelMessagesOptions) {
  // Core state
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChannelMessage[]>([]);
  const [messageReactions, setMessageReactions] = useState<Record<string | number, MessageReaction[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | number | null>(null);
  const [expandedReactions, setExpandedReactions] = useState<Record<string | number, boolean>>({});
  const [showAllEmojis, setShowAllEmojis] = useState<Record<string | number, boolean>>({});
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<string | number | null>(null);
  const [editContent, setEditContent] = useState('');

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChannelMessage | null>(null);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: string; display_name: string }>>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // @mention state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  // Message action menu (mobile + overflow)
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | number | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const subscriptionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userIsScrollingRef = useRef(false);

  // ── Data Loading ───────────────────────────────────────────

  useEffect(() => {
    // Don't start loading/polling until we have a valid userId
    if (!channelId || !userId) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let typingPollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const loadMessages = async () => {
      setLoading(true);

      const [msgs, pinned] = await Promise.all([
        getChannelMessages(channelId, INITIAL_MESSAGE_LIMIT),
        getPinnedChannelMessages(channelId)
      ]);

      if (!isMounted) return;

      setMessages(msgs || []);
      setPinnedMessages(pinned || []);

      // Load reactions for all messages in parallel
      const allMessages: ChannelMessage[] = [...(pinned || []), ...(msgs || [])];
      const reactionsResults = await Promise.all(
        // @ts-ignore - message id type compatibility
        allMessages.map(msg => getChannelMessageReactions(msg.id))
      );

      if (!isMounted) return;

      const reactionsMap: Record<string | number, MessageReaction[]> = {};
      allMessages.forEach((msg, index) => {
        if (reactionsResults[index] !== undefined) {
          reactionsMap[msg.id] = reactionsResults[index];
        }
      });
      setMessageReactions(reactionsMap);

      setLoading(false);

      // Mark channel as read
      markChannelRead(channelId, userId).catch(() => {});

      // Poll for new messages every 3 seconds
      pollInterval = setInterval(async () => {
        if (!isMounted) return;

        const [updatedMessages, updatedPinned] = await Promise.all([
          getChannelMessages(channelId, INITIAL_MESSAGE_LIMIT),
          getPinnedChannelMessages(channelId)
        ]);

        if (!isMounted) return;

        setMessages(updatedMessages || []);
        setPinnedMessages(updatedPinned || []);

        const allUpdated: ChannelMessage[] = [...(updatedPinned || []), ...(updatedMessages || [])];
        const updatedReactionsResults = await Promise.all(
          // @ts-ignore - message id type compatibility
          allUpdated.map(msg => getChannelMessageReactions(msg.id))
        );

        if (!isMounted) return;

        const newReactionsMap: Record<string | number, MessageReaction[]> = {};
        allUpdated.forEach((msg, index) => {
          newReactionsMap[msg.id] = updatedReactionsResults[index];
        });
        setMessageReactions(newReactionsMap);

        // Mark as read on poll
        markChannelRead(channelId, userId).catch(() => {});
      }, POLL_INTERVAL_MS);

      // Poll typing indicators every 2 seconds
      typingPollInterval = setInterval(async () => {
        if (!isMounted) return;
        const indicators = await getTypingIndicators(channelId, userId);
        if (isMounted) {
          setTypingUsers(indicators || []);
        }
      }, 2000);
    };

    loadMessages();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (typingPollInterval) clearInterval(typingPollInterval);
      if (subscriptionRef.current) unsubscribe(subscriptionRef.current);
      // Clear typing indicator on leave
      clearTypingIndicator(channelId, userId).catch(() => {});
    };
  }, [channelId, userId]);

  // Track if user is scrolled up (not near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      userIsScrollingRef.current = distanceFromBottom > 150;
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [channelId]);

  // Auto-scroll to bottom when messages change, only if user is near bottom
  useEffect(() => {
    if (!userIsScrollingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editInputRef.current.value.length, editInputRef.current.value.length);
    }
  }, [editingMessageId]);

  // Focus search input
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // ── Message position helper ────────────────────────────────

  const isMessageInBottomHalf = (messageId: string | number): boolean => {
    const el = messageRefs.current[messageId];
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    return mid > window.innerHeight / 2;
  };

  // ── Typing Indicator ────────────────────────────────────────

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_DEBOUNCE_MS) return;
    lastTypingSentRef.current = now;

    updateTypingIndicator(channelId, userId, userDisplayName || 'Someone').catch(() => {});

    // Clear typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      clearTypingIndicator(channelId, userId).catch(() => {});
    }, 3000);
  }, [channelId, userId, userDisplayName]);

  // ── @Mention handling ──────────────────────────────────────

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    handleTyping();

    // Detect @ mentions
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show mention picker if there's no space before the @mention text
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 30) {
        setMentionFilter(textAfterAt.toLowerCase());
        setMentionCursorPos(lastAtIndex);
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
  }, [handleTyping]);

  const handleMentionSelect = useCallback((member: any) => {
    const displayName = member.user?.display_name || member.user?.username || 'unknown';
    const before = newMessage.substring(0, mentionCursorPos);
    // Skip past the @ symbol + whatever filter text was typed
    const afterIndex = mentionCursorPos + 1 + mentionFilter.length;
    const after = newMessage.substring(afterIndex);
    const newVal = `${before}@${displayName} ${after}`;
    setNewMessage(newVal);
    setShowMentionPicker(false);
    textareaRef.current?.focus();
  }, [newMessage, mentionCursorPos, mentionFilter]);

  const filteredMentionMembers = (members || []).filter(m => {
    if (!m.user) return false;
    if (m.user_id === userId) return false;
    const name = (m.user.display_name || '').toLowerCase();
    const username = (m.user.username || '').toLowerCase();
    return name.includes(mentionFilter) || username.includes(mentionFilter);
  }).slice(0, 6);

  // ── Image Handling ─────────────────────────────────────────

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('Image must be under 10MB');
      return;
    }
    setPendingImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearPendingImage = () => {
    setPendingImage(null);
    setPendingImagePreview(null);
  };

  // ── Send Message ───────────────────────────────────────────

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !pendingImage) return;
    if (!userId) {
      showError('Still loading your profile — please try again in a moment');
      return;
    }
    if (!channelId) return;

    if (newMessage.trim()) {
      const validation = validateMessage(newMessage, 'message');
      if (!validation.valid) {
        showError(validation.errors[0] || 'Invalid message');
        return;
      }

      // Profanity check
      const profanityResult = checkBeforeSend(newMessage);
      if (!profanityResult.allowed && profanityResult.flag) {
        if (profanityResult.severity === 'high') {
          showError('This message contains content that violates community guidelines');
          return;
        }
        if (profanityResult.severity === 'medium') {
          if (!window.confirm('This message may contain inappropriate content. Send anyway?')) {
            return;
          }
        }
      }
    }

    const messageContent = newMessage.trim() ? sanitizeInput(newMessage) : '';
    const imageToUpload = pendingImage;
    const imagePreview = pendingImagePreview;
    const replyTo = replyingTo;

    // Optimistic update
    const tempMessage: ChannelMessage = {
      id: Date.now(),
      sender_id: userId,
      content: messageContent || (imageToUpload ? '\u{1F4F7} Image' : ''),
      created_at: new Date().toISOString(),
      image_url: imagePreview || undefined,
      reply_to_id: replyTo?.id,
      sender: {
        display_name: userDisplayName || 'You',
        avatar_emoji: '\u{1F464}'
      }
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setPendingImage(null);
    setPendingImagePreview(null);
    setReplyingTo(null);

    // Clear typing indicator
    clearTypingIndicator(channelId, userId).catch(() => {});

    // Upload image if attached
    let uploadedImageUrl: string | undefined;
    if (imageToUpload) {
      setUploadingImage(true);
      try {
        uploadedImageUrl = await uploadMessageImage(imageToUpload);
      } catch (imgErr) {
        console.error('Image upload failed:', imgErr);
        showError('Failed to upload image');
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    }

    const finalContent = messageContent || (uploadedImageUrl ? '\u{1F4F7} Image' : '');

    let saved;
    if (replyTo) {
      // @ts-ignore
      saved = await sendChannelReply(channelId, userId, finalContent, replyTo.id, uploadedImageUrl);
    } else {
      saved = await sendChannelMessage(channelId, userId, finalContent, uploadedImageUrl);
    }
    if (!saved) {
      showError('Failed to send message');
    }
  };

  // ── Edit Message ───────────────────────────────────────────

  const handleStartEdit = useCallback((msg: ChannelMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    setActiveMessageMenu(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId || !editContent.trim()) return;

    const validation = validateMessage(editContent, 'message');
    if (!validation.valid) {
      showError(validation.errors[0] || 'Invalid message');
      return;
    }

    const sanitized = sanitizeInput(editContent);
    // @ts-ignore
    const result = await editChannelMessage(editingMessageId, userId, sanitized);
    if (result) {
      setMessages(prev => prev.map(m =>
        m.id === editingMessageId ? { ...m, content: sanitized, is_edited: true } : m
      ));
    } else {
      showError('Failed to edit message');
    }
    setEditingMessageId(null);
    setEditContent('');
  }, [editingMessageId, editContent, userId]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent('');
  }, []);

  // ── Delete Message ─────────────────────────────────────────

  const handleDeleteMessage = useCallback(async (messageId: string | number) => {
    setActiveMessageMenu(null);
    if (!window.confirm('Delete this message? This cannot be undone.')) return;

    // @ts-ignore
    const result = await deleteChannelMessage(messageId);
    if (result) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } else {
      showError('Failed to delete message');
    }
  }, []);

  // ── Reply ──────────────────────────────────────────────────

  const handleStartReply = useCallback((msg: ChannelMessage) => {
    setReplyingTo(msg);
    setActiveMessageMenu(null);
    textareaRef.current?.focus();
  }, []);

  // ── Search ─────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !serverId) return;
    setSearching(true);
    const results = await searchChannelMessages(serverId, searchQuery.trim());
    setSearchResults(results || []);
    setSearching(false);
  }, [searchQuery, serverId]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // ── Reactions ──────────────────────────────────────────────

  const handleReaction = async (messageId: string | number, emoji: string) => {
    if (!userId) return;

    const reactions = messageReactions[messageId] || [];
    const existing = reactions.find(
      r => r.user_id === userId && r.emoji === emoji
    );

    if (existing) {
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: reactions.filter(r => r.id !== existing.id)
      }));

      // @ts-ignore
      removeChannelReaction(messageId, userId, emoji).catch(() => {
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: reactions
        }));
      });
    } else {
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

      // @ts-ignore
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
          showError('Failed to add reaction');
        });
    }

    setShowReactionPicker(null);
  };

  // ── Pin / Unpin ────────────────────────────────────────────

  const handlePinMessage = async (messageId: string | number) => {
    // @ts-ignore
    const result = await pinChannelMessage(messageId, userId);
    if (result) {
      const pinned = await getPinnedChannelMessages(channelId);
      setPinnedMessages(pinned || []);
    }
  };

  const handleUnpinMessage = async (messageId: string | number) => {
    // @ts-ignore
    const result = await unpinChannelMessage(messageId);
    if (result) {
      const pinned = await getPinnedChannelMessages(channelId);
      setPinnedMessages(pinned || []);
    }
  };

  // ── Find reply-to message ──────────────────────────────────

  const getReplyToMessage = (replyToId: string | number | undefined): ChannelMessage | undefined => {
    if (!replyToId) return undefined;
    return messages.find(m => m.id === replyToId || String(m.id) === String(replyToId));
  };

  return {
    // Core state
    messages, loading,
    pinnedMessages, showPinned, setShowPinned,
    messageReactions,
    newMessage, setNewMessage,
    showReactionPicker, setShowReactionPicker,
    expandedReactions, setExpandedReactions,
    showAllEmojis, setShowAllEmojis,
    pendingImage, pendingImagePreview, uploadingImage,

    // Edit state
    editingMessageId, editContent, setEditContent,

    // Reply state
    replyingTo, setReplyingTo,

    // Typing
    typingUsers,

    // Search state
    showSearch, setShowSearch, searchQuery, setSearchQuery,
    searchResults, searching,

    // @mention state
    showMentionPicker, mentionFilter, filteredMentionMembers,

    // Message action menu
    activeMessageMenu, setActiveMessageMenu,

    // Refs
    messagesEndRef, messagesContainerRef, imageInputRef,
    messageRefs, textareaRef, editInputRef, searchInputRef,

    // Handlers
    handleTyping, handleInputChange, handleMentionSelect,
    handleImageSelect, clearPendingImage,
    handleSendMessage,
    handleStartEdit, handleSaveEdit, handleCancelEdit,
    handleDeleteMessage,
    handleStartReply,
    handleSearch, closeSearch,
    handleReaction,
    handlePinMessage, handleUnpinMessage,
    isMessageInBottomHalf,
    getReplyToMessage,
  };
}
