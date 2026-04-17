import { useState, useEffect, useRef, useCallback } from 'react';
import { showError } from '../lib/toast';
import { sanitizeInput } from '../lib/inputValidation';
import {
  sendGroupMessage,
  getGroupMessages,
  getPinnedMessages,
  getReactionsForMessages,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  subscribeToGroupMessages,
  subscribeToMessageReactions,
  unsubscribe
} from '../lib/database';
import { analyzeContent } from '../lib/contentFilter';
import type { ContentFlag } from '../lib/contentFilter';
import { checkMessageSecrets, unlockSecret } from '../lib/secrets';
import { trackMessageByHour, getEarlyBirdMessages, getNightOwlMessages, trackMessageStreak } from '../lib/activityTracker';
import { validateAndCheckMessage } from '../lib/messageValidation';
import type { GroupMessageView as GroupMessage, GroupMessageReactionView as MessageReaction } from '../types/chat';

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
  const userIsScrollingRef = useRef(false);

  // Ref tracking the IDs of messages currently in view, so the
  // reactions-channel callback can skip rows for other groups.
  const visibleMessageIdsRef = useRef<Set<string>>(new Set());

  // ── Initial load + refresh helper ───────────────────────
  // Fetches messages + pinned + reactions. Reactions are batched into a
  // single `message_reactions.in(id,...)` query instead of N+1 one-per-
  // message queries (the old polling path issued ~33 QPS for a 100-msg
  // chat). Used on mount, when switching groups, and on tab regain.
  const refreshAll = useCallback(async (groupId: string) => {
    const [messages, pinned] = await Promise.all([
      getGroupMessages(groupId),
      getPinnedMessages(groupId),
    ]);
    const msgs = messages || [];
    const pins = pinned || [];
    setGroupMessages(msgs);
    setPinnedMessages(pins);

    const allIds = [...pins, ...msgs].map(m => String(m.id));
    visibleMessageIdsRef.current = new Set(allIds);

    if (allIds.length === 0) {
      setMessageReactions({});
      return;
    }

    const batched = await getReactionsForMessages(allIds);
    const map: Record<string | number, MessageReaction[]> = {};
    for (const id of allIds) {
      map[id] = (batched[id] || []) as MessageReaction[];
    }
    setMessageReactions(map);
  }, []);

  // ── Initial load on mount / group change ────────────────
  useEffect(() => {
    if (!activeGroup || activeView !== 'chat') return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshAll(activeGroup);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeGroup, activeView, refreshAll]);

  // ── Realtime: new group_messages INSERT ─────────────────
  // Replaces the old 3-second poll. When another user posts, Supabase
  // pushes the INSERT to us; we append it and fetch its reactions.
  useEffect(() => {
    if (!activeGroup || activeView !== 'chat') return;

    const sub = subscribeToGroupMessages(activeGroup, async (payload: any) => {
      const newMsg = payload?.new;
      if (!newMsg?.id) return;
      const idStr = String(newMsg.id);

      setGroupMessages(prev => {
        if (prev.some(m => String(m.id) === idStr)) return prev;
        return [...prev, newMsg as GroupMessage];
      });

      visibleMessageIdsRef.current.add(idStr);

      // Fetch reactions for this one message (usually 0 right away).
      const batched = await getReactionsForMessages([idStr]);
      if (batched[idStr]?.length) {
        setMessageReactions(prev => ({
          ...prev,
          [idStr]: batched[idStr] as MessageReaction[],
        }));
      }
    });

    return () => {
      if (sub) unsubscribe(sub);
    };
  }, [activeGroup, activeView]);

  // ── Realtime: reactions INSERT/UPDATE/DELETE ────────────
  // Subscribes to ALL message_reactions changes (the table has no group
  // scope) and filters by the message IDs we're currently displaying,
  // so we only refetch reactions for messages we care about.
  useEffect(() => {
    if (!activeGroup || activeView !== 'chat') return;

    const sub = subscribeToMessageReactions(async (payload: any) => {
      const messageId = payload?.new?.message_id ?? payload?.old?.message_id;
      if (messageId === null || messageId === undefined) return;
      const idStr = String(messageId);
      if (!visibleMessageIdsRef.current.has(idStr)) return;

      const batched = await getReactionsForMessages([idStr]);
      setMessageReactions(prev => ({
        ...prev,
        [idStr]: (batched[idStr] || []) as MessageReaction[],
      }));
    });

    return () => {
      if (sub) unsubscribe(sub);
    };
  }, [activeGroup, activeView]);

  // ── Catch-up refresh when tab regains focus ─────────────
  // Realtime WebSockets can silently drop while backgrounded.
  useEffect(() => {
    if (!activeGroup || activeView !== 'chat') return;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAll(activeGroup).catch(() => { /* non-critical */ });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [activeGroup, activeView, refreshAll]);

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

    if (!validateAndCheckMessage(newMessage)) return;

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
