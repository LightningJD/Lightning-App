import { useState, useEffect, useRef, useCallback } from 'react';
import { showError } from '../lib/toast';
import { validateMessage, sanitizeInput } from '../lib/inputValidation';
import {
  sendGroupMessage,
  getGroupMessages,
  getPinnedMessages,
  getMessageReactions,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  unsubscribe
} from '../lib/database';
import { analyzeContent, checkBeforeSend } from '../lib/contentFilter';
import type { ContentFlag } from '../lib/contentFilter';
import { checkMessageSecrets, unlockSecret } from '../lib/secrets';
import { trackMessageByHour, getEarlyBirdMessages, getNightOwlMessages, trackMessageStreak } from '../lib/activityTracker';

interface GroupMessage {
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

interface UseGroupChatOptions {
  activeGroup: string | null;
  activeView: string;
  userId: string | undefined;
  displayName: string | undefined;
  avatar: string | undefined;
}

export function useGroupChat({ activeGroup, activeView, userId, displayName, avatar }: UseGroupChatOptions) {
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);
  const [messageReactions, setMessageReactions] = useState<Record<string | number, MessageReaction[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | number | null>(null);
  const [expandedReactions, setExpandedReactions] = useState<Record<string | number, boolean>>({});
  const [showAllEmojis, setShowAllEmojis] = useState<Record<string | number, boolean>>({});
  const [flaggedMessages, setFlaggedMessages] = useState<Record<string | number, ContentFlag>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pinnedSectionRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const subscriptionRef = useRef<any>(null);
  const userIsScrollingRef = useRef(false);

  // Load messages with polling
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    const loadGroupMessages = async () => {
      if (activeGroup && activeView === 'chat') {
        setLoading(true);

        const [messages, pinned] = await Promise.all([
          getGroupMessages(activeGroup),
          getPinnedMessages(activeGroup)
        ]);

        setGroupMessages(messages || []);
        setPinnedMessages(pinned || []);

        // Load reactions in parallel
        const allMessages: GroupMessage[] = [...(pinned || []), ...(messages || [])];
        // @ts-ignore
        const reactionsPromises = allMessages.map(msg => getMessageReactions(msg.id));
        const reactionsResults = await Promise.all(reactionsPromises);

        const reactionsMap: Record<string | number, MessageReaction[]> = {};
        reactionsResults.forEach((reactions, index) => {
          if (allMessages[index] && reactions !== undefined) {
            // @ts-ignore
            reactionsMap[allMessages[index].id] = reactions;
          }
        });
        setMessageReactions(reactionsMap);
        setLoading(false);

        // Poll every 3 seconds
        pollInterval = setInterval(async () => {
          const [updatedMessages, updatedPinned] = await Promise.all([
            getGroupMessages(activeGroup),
            getPinnedMessages(activeGroup)
          ]);

          setGroupMessages(updatedMessages || []);
          setPinnedMessages(updatedPinned || []);

          const allMsgs: GroupMessage[] = [...(updatedPinned || []), ...(updatedMessages || [])];
          // @ts-ignore
          const rPromises = allMsgs.map(msg => getMessageReactions(msg.id));
          const rResults = await Promise.all(rPromises);

          const newMap: Record<string | number, MessageReaction[]> = {};
          allMsgs.forEach((msg, index) => {
            // @ts-ignore
            newMap[msg.id] = rResults[index];
          });
          setMessageReactions(newMap);
        }, 3000);
      }
    };

    loadGroupMessages();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (subscriptionRef.current) unsubscribe(subscriptionRef.current);
    };
  }, [activeGroup, activeView]);

  // Scroll tracking
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
  }, [activeGroup]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!userIsScrollingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groupMessages]);

  const handleSendGroupMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !activeGroup) return;

    const validation = validateMessage(newMessage, 'message');
    if (!validation.valid) {
      showError(validation.errors[0] || 'Invalid message');
      return;
    }

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

    const messageContent = sanitizeInput(newMessage);

    // Optimistic update
    const tempMessage = {
      id: Date.now(),
      sender_id: userId,
      content: newMessage,
      created_at: new Date().toISOString(),
      sender: { display_name: displayName || 'User', avatar_emoji: avatar || '\u{1F464}' }
    };
    setGroupMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    const savedMessage = await sendGroupMessage(activeGroup, userId, messageContent);
    if (savedMessage) {
      const flag = analyzeContent(messageContent);
      if (flag.flagged) {
        setFlaggedMessages(prev => ({ ...prev, [savedMessage.id || tempMessage.id]: flag }));
      }
      checkMessageSecrets(messageContent);
      trackMessageByHour();
      if (getEarlyBirdMessages() >= 10) unlockSecret('early_bird_messenger');
      if (getNightOwlMessages() >= 10) unlockSecret('night_owl_messenger');
      const streak = trackMessageStreak();
      if (streak >= 7) unlockSecret('messages_streak_7');
    }
  }, [newMessage, userId, activeGroup, displayName, avatar]);

  const handleReaction = useCallback(async (messageId: string | number, emoji: string) => {
    if (!userId) return;

    const reactions = messageReactions[messageId] || [];
    const existingReaction = reactions.find(r => r.user_id === userId && r.emoji === emoji);

    if (existingReaction) {
      // Optimistic remove
      setMessageReactions(prev => ({ ...prev, [messageId]: reactions.filter(r => r.id !== existingReaction.id) }));
      // @ts-ignore
      removeReaction(messageId, userId, emoji).catch(() => {
        setMessageReactions(prev => ({ ...prev, [messageId]: reactions }));
      });
    } else {
      // Optimistic add
      const tempReaction = {
        id: `temp-${Date.now()}`,
        message_id: messageId,
        user_id: userId,
        emoji,
        user: { id: userId, display_name: displayName || 'User', avatar_emoji: avatar || '\u{1F464}' }
      };
      setMessageReactions(prev => ({ ...prev, [messageId]: [...(prev[messageId] || []), tempReaction] }));

      // @ts-ignore
      addReaction(messageId, userId, emoji).then(newReaction => {
        if (newReaction) {
          setMessageReactions(prev => ({
            ...prev,
            [messageId]: [
              ...(prev[messageId] || []).filter(r => r.id !== tempReaction.id),
              { ...(newReaction as any), user: { id: userId, display_name: displayName || 'User', avatar_emoji: avatar || '\u{1F464}' } }
            ]
          }));
        }
      }).catch((error: any) => {
        console.error('Failed to add reaction:', error);
        setMessageReactions(prev => ({ ...prev, [messageId]: (prev[messageId] || []).filter(r => r.id !== tempReaction.id) }));
        showError('Failed to add reaction. Please try again.');
      });
    }
    setShowReactionPicker(null);
  }, [userId, displayName, avatar, messageReactions]);

  const handlePinMessage = useCallback(async (messageId: string | number) => {
    if (!userId || !activeGroup) return;
    // @ts-ignore
    const result = await pinMessage(messageId, userId);
    if (result) {
      const pinned = await getPinnedMessages(activeGroup);
      setPinnedMessages(pinned || []);
    }
  }, [userId, activeGroup]);

  const handleUnpinMessage = useCallback(async (messageId: string | number) => {
    if (!activeGroup) return;
    // @ts-ignore
    const result = await unpinMessage(messageId);
    if (result) {
      const pinned = await getPinnedMessages(activeGroup);
      setPinnedMessages(pinned || []);
    }
  }, [activeGroup]);

  // Helper: is message in bottom half of viewport
  const isMessageInBottomHalf = useCallback((messageId: string | number): boolean => {
    const messageEl = messageRefs.current[messageId];
    if (!messageEl) return false;
    const rect = messageEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const messageMiddle = rect.top + (rect.height / 2);
    return messageMiddle > (viewportHeight / 2);
  }, []);

  return {
    // Messages
    groupMessages, pinnedMessages, newMessage, setNewMessage, loading,
    flaggedMessages,

    // Reactions
    messageReactions, showReactionPicker, setShowReactionPicker,
    expandedReactions, setExpandedReactions,
    showAllEmojis, setShowAllEmojis,

    // Refs
    messagesEndRef, messagesContainerRef, pinnedSectionRef, messageRefs,

    // Handlers
    handleSendGroupMessage,
    handleReaction,
    handlePinMessage,
    handleUnpinMessage,

    // Utils
    isMessageInBottomHalf,
  };
}
