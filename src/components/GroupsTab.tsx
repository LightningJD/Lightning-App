import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Settings, Crown, Users, Trash2, LogOut, Smile, Pin, Info, ChevronRight } from 'lucide-react';
import { showError, showSuccess } from '../lib/toast';
import { validateGroup, validateMessage, sanitizeInput } from '../lib/inputValidation';
import {
  createGroup,
  getUserGroups,
  sendGroupMessage,
  getGroupMessages,
  updateGroup,
  deleteGroup,
  leaveGroup,
  getGroupMembers,
  removeMemberFromGroup,
  promoteMemberToLeader,
  unsubscribe,
  addReaction,
  removeReaction,
  getMessageReactions,
  pinMessage,
  unpinMessage,
  getPinnedMessages
} from '../lib/database';
import { useUserProfile } from './useUserProfile';
import { GroupCardSkeleton } from './SkeletonLoader';
import { useGuestModalContext } from '../contexts/GuestModalContext';
import { checkMessageSecrets, unlockSecret } from '../lib/secrets';
import { trackMessageByHour, getEarlyBirdMessages, getNightOwlMessages, trackMessageStreak } from '../lib/activityTracker';

interface GroupsTabProps {
  nightMode: boolean;
}

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

interface GroupData {
  id: string;
  name: string;
  description?: string;
  avatar_emoji: string;
  member_count: number;
  userRole: string;
}

interface GroupMember {
  id: string;
  role: string;
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_emoji: string;
    is_online: boolean;
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

const GroupsTab: React.FC<GroupsTabProps> = ({ nightMode }) => {
  const { profile } = useUserProfile();
  const { isGuest, checkAndShowModal } = useGuestModalContext() as { isGuest: boolean; checkAndShowModal: () => void };
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'chat' | 'settings' | 'members'>('list');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [myGroups, setMyGroups] = useState<GroupData[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [messageReactions, setMessageReactions] = useState<Record<string | number, MessageReaction[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | number | null>(null);
  const [expandedReactions, setExpandedReactions] = useState<Record<string | number, boolean>>({});
  const [showAllEmojis, setShowAllEmojis] = useState<Record<string | number, boolean>>({});
  const [showGroupBio, setShowGroupBio] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pinnedSectionRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>({});

  // @ts-ignore - Complex type issues with database functions
  const activeGroupData = myGroups.find(g => g.id === activeGroup);

  // Helper function to check if message is in bottom half of viewport
  const isMessageInBottomHalf = (messageId: string | number): boolean => {
    const messageEl = messageRefs.current[messageId];
    if (!messageEl) return false;

    const rect = messageEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const messageMiddle = rect.top + (rect.height / 2);

    return messageMiddle > (viewportHeight / 2);
  };

  // Reaction emojis for faith-based groups (22 emojis)
  const reactionEmojis = [
    '🙏', '❤️', '✝️', '🔥', '✨', '🕊️',  // Row 1: Faith Core
    '📖', '🌟', '💪', '🛡️', '🙌', '👑',  // Row 2: Faith Symbols
    '🤲', '😇', '😊', '😢', '😮', '🎉',  // Row 3: Support & Prayer
    '🫂', '✋', '🥰', '😌', '✅', '💯'   // Row 4: Connection & Agreement
  ];

  // Block guests from accessing groups (Freemium Browse & Block)
  useEffect(() => {
    if (isGuest) {
      console.log('🚫 Guest attempted to access Groups - blocking');
      checkAndShowModal();
    }
  }, [isGuest, checkAndShowModal]);

  // Load user's groups
  useEffect(() => {
    const loadGroups = async () => {
      if (profile?.supabaseId) {
        const groups = await getUserGroups(profile.supabaseId);
        setMyGroups(groups || []);
      }
    };

    loadGroups();
  }, [profile?.supabaseId]);

  // Simulate initial loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsGroupsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Load group messages when opening a group
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    const loadGroupMessages = async () => {
      if (activeGroup && activeView === 'chat') {
        setLoading(true);

        // Load all data in parallel for faster loading
        const [messages, pinned] = await Promise.all([
          getGroupMessages(activeGroup),
          getPinnedMessages(activeGroup)
        ]);

        setGroupMessages(messages || []);
        setPinnedMessages(pinned || []);

        // Load reactions for all messages (including pinned) in parallel
        const allMessages: GroupMessage[] = [...(pinned || []), ...(messages || [])];
        // @ts-ignore - message id type compatibility
        const reactionsPromises = allMessages.map(msg => getMessageReactions(msg.id));
        const reactionsResults = await Promise.all(reactionsPromises);

        const reactionsMap: Record<string | number, MessageReaction[]> = {};
        reactionsResults.forEach((reactions, index) => {
          if (allMessages[index] && reactions !== undefined) {
            // @ts-ignore - message id type compatibility
            reactionsMap[allMessages[index].id] = reactions;
          }
        });
        setMessageReactions(reactionsMap);

        setLoading(false);

        // POLLING VERSION (FREE) - Checks for new messages every 3 seconds
        pollInterval = setInterval(async () => {
          // Load messages and pinned in parallel
          const [updatedMessages, updatedPinned] = await Promise.all([
            getGroupMessages(activeGroup),
            getPinnedMessages(activeGroup)
          ]);

          setGroupMessages(updatedMessages || []);
          setPinnedMessages(updatedPinned || []);

          // Reload reactions for all messages in parallel
          const allMessages: GroupMessage[] = [...(updatedPinned || []), ...(updatedMessages || [])];
          // @ts-ignore - message id type compatibility
          const reactionsPromises = allMessages.map(msg => getMessageReactions(msg.id));
          const reactionsResults = await Promise.all(reactionsPromises);

          const newReactionsMap: Record<string | number, MessageReaction[]> = {};
          allMessages.forEach((msg, index) => {
            // @ts-ignore - message id type compatibility
            newReactionsMap[msg.id] = reactionsResults[index];
          });
          setMessageReactions(newReactionsMap);
        }, 3000); // Poll every 3 seconds

        /* REAL-TIME VERSION ($25/month) - Uncomment to enable instant messaging
        subscriptionRef.current = subscribeToGroupMessages(activeGroup, (payload) => {
          console.log('New group message:', payload.new);
          setGroupMessages(prev => [...prev, payload.new]);
        });
        */
      }
    };

    loadGroupMessages();

    // Cleanup polling on unmount or group change
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (subscriptionRef.current) {
        unsubscribe(subscriptionRef.current);
      }
    };
  }, [activeGroup, activeView]);

  // Load group members
  useEffect(() => {
    const loadMembers = async () => {
      if (activeGroup && activeView === 'members') {
        const members = await getGroupMembers(activeGroup);
        setGroupMembers(members || []);
      }
    };

    loadMembers();
  }, [activeGroup, activeView]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !profile?.supabaseId) return;

    // Validate group data
    const validation = validateGroup({
      name: newGroupName,
      description: newGroupDescription
    });

    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0] as string;
      showError(firstError);
      return;
    }

    setLoading(true);

    try {
      const newGroup = await createGroup(profile.supabaseId, {
        name: sanitizeInput(newGroupName),
        description: sanitizeInput(newGroupDescription),
        avatarEmoji: '✨',
        isPrivate: false
      });

      if (newGroup) {
        console.log('✅ Group created!', newGroup);

        // Unlock group creator secret
        unlockSecret('group_creator');

        // Reload groups
        const groups = await getUserGroups(profile.supabaseId);
        setMyGroups(groups || []);
        setShowCreateGroup(false);
        setNewGroupName('');
        setNewGroupDescription('');

        showSuccess('Group created successfully!');
      } else {
        console.error('❌ Failed to create group');
        showError('Failed to create group. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error creating group:', error);
      showError('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.supabaseId || !activeGroup) return;

    // Validate message content
    const validation = validateMessage(newMessage, 'message');
    if (!validation.valid) {
      showError(validation.errors[0] || 'Invalid message');
      return;
    }

    // Save and sanitize message content for secret checking
    const messageContent = sanitizeInput(newMessage);

    // Optimistically add message
    const tempMessage = {
      id: Date.now(),
      sender_id: profile.supabaseId,
      content: newMessage,
      created_at: new Date().toISOString(),
      sender: {
        display_name: profile.displayName,
        avatar_emoji: profile.avatar
      }
    };

    setGroupMessages([...groupMessages, tempMessage]);
    setNewMessage('');

    try {
      // Send to database
      const savedMessage = await sendGroupMessage(
        activeGroup,
        profile.supabaseId,
        messageContent
      );

      if (savedMessage) {
        console.log('✅ Group message sent!', savedMessage);

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
      } else {
        // Rollback optimistic update
        setGroupMessages(groupMessages);
        showError('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending group message:', error);
      // Rollback optimistic update
      setGroupMessages(groupMessages);
      showError('Failed to send message. Please try again.');
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupName.trim() || !activeGroup) return;

    setLoading(true);

    try {
      const updated = await updateGroup(activeGroup as string, {
        name: editGroupName,
        description: editGroupDescription
      });

      if (updated) {
        console.log('✅ Group updated!', updated);
        // Reload groups
        const groups = await getUserGroups(profile!.supabaseId);
        setMyGroups(groups || []);
        setActiveView('chat');
        showSuccess('Group updated successfully');
      } else {
        showError('Failed to update group. Please try again.');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      showError('Failed to update group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This cannot be undone.')) return;

    setLoading(true);

    try {
      const deleted = await deleteGroup(activeGroup as string);

      if (deleted) {
        console.log('✅ Group deleted!');
        // Reload groups
        const groups = await getUserGroups(profile!.supabaseId);
        setMyGroups(groups || []);
        setActiveGroup(null);
        setActiveView('list');
        showSuccess('Group deleted successfully');
      } else {
        showError('Failed to delete group. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      showError('Failed to delete group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    setLoading(true);

    try {
      const left = await leaveGroup(activeGroup as string, profile!.supabaseId);

      if (left) {
        console.log('✅ Left group!');
        // Reload groups
        const groups = await getUserGroups(profile!.supabaseId);
        setMyGroups(groups || []);
        setActiveGroup(null);
        setActiveView('list');
        showSuccess('You have left the group');
      } else {
        showError('Failed to leave group. Please try again.');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      showError('Failed to leave group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      const removed = await removeMemberFromGroup(activeGroup as string, userId);

      if (removed) {
        console.log('✅ Member removed!');
        // Reload members
        const members = await getGroupMembers(activeGroup as string);
        setGroupMembers(members || []);
        showSuccess('Member removed from group');
      } else {
        showError('Failed to remove member. Please try again.');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      showError('Failed to remove member. Please try again.');
    }
  };

  const handlePromoteMember = async (userId: string) => {
    if (!window.confirm('Promote this member to leader?')) return;

    try {
      const promoted = await promoteMemberToLeader(activeGroup as string, userId);

      if (promoted) {
        console.log('✅ Member promoted!');
        // Reload members
        const members = await getGroupMembers(activeGroup as string);
        setGroupMembers(members || []);
        showSuccess('Member promoted to leader');
      } else {
        showError('Failed to promote member. Please try again.');
      }
    } catch (error) {
      console.error('Error promoting member:', error);
      showError('Failed to promote member. Please try again.');
    }
  };

  const handleReaction = async (messageId: string | number, emoji: string) => {
    if (!profile?.supabaseId) return;

    const reactions = messageReactions[messageId] || [];
    const existingReaction = reactions.find(
      r => r.user_id === profile!.supabaseId && r.emoji === emoji
    );

    if (existingReaction) {
      // Optimistically remove reaction from UI immediately
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: reactions.filter(r => r.id !== existingReaction.id)
      }));

      // Then remove from database in background
      // @ts-ignore - message id type compatibility
      removeReaction(messageId, profile!.supabaseId, emoji).catch(() => {
        // Rollback on error
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: reactions
        }));
      });
    } else {
      // Optimistically add reaction to UI immediately
      const tempReaction = {
        id: `temp-${Date.now()}`,
        message_id: messageId,
        user_id: profile!.supabaseId,
        emoji: emoji,
        user: {
          id: profile!.supabaseId,
          display_name: profile!.displayName,
          avatar_emoji: profile!.avatar
        }
      };

      setMessageReactions(prev => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), tempReaction]
      }));

      // Then add to database in background
      // @ts-ignore - message id type compatibility
      addReaction(messageId, profile!.supabaseId, emoji).then(newReaction => {
        if (newReaction) {
          // Replace temp with real reaction
          setMessageReactions(prev => ({
            ...prev,
            [messageId]: [
              ...(prev[messageId] || []).filter(r => r.id !== tempReaction.id),
              {
                ...(newReaction as Omit<MessageReaction, 'user'>),
                user: {
                  id: profile!.supabaseId,
                  display_name: profile!.displayName,
                  avatar_emoji: profile!.avatar
                }
              }
            ]
          }));
        }
      }).catch((error) => {
        console.error('Failed to add reaction:', error);
        // Rollback on error
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter(r => r.id !== tempReaction.id)
        }));
        // Show error toast to user
        showError('Failed to add reaction. Please try again.');
      });
    }

    setShowReactionPicker(null);
  };

  const handlePinMessage = async (messageId: string | number) => {
    if (!profile?.supabaseId) return;

    try {
      // @ts-ignore - message id type compatibility
      const result = await pinMessage(messageId, profile!.supabaseId);
      if (result) {
        console.log('✅ Message pinned!');
        // Reload pinned messages
        const pinned = await getPinnedMessages(activeGroup as string);
        setPinnedMessages(pinned || []);
        showSuccess('Message pinned');
      } else {
        showError('Failed to pin message. Please try again.');
      }
    } catch (error) {
      console.error('Error pinning message:', error);
      showError('Failed to pin message. Please try again.');
    }
  };

  const handleUnpinMessage = async (messageId: string | number) => {
    try {
      // @ts-ignore - message id type compatibility
      const result = await unpinMessage(messageId);
      if (result) {
        console.log('✅ Message unpinned!');
        // Reload pinned messages
        const pinned = await getPinnedMessages(activeGroup as string);
        setPinnedMessages(pinned || []);
        showSuccess('Message unpinned');
      } else {
        showError('Failed to unpin message. Please try again.');
      }
    } catch (error) {
      console.error('Error unpinning message:', error);
      showError('Failed to unpin message. Please try again.');
    }
  };

  // Create Group Modal
  if (showCreateGroup) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div
          className={`rounded-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300 ${
            nightMode ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50'
          }`}
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
        >
          <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={nightMode ? 'text-xl font-bold text-slate-100' : 'text-xl font-bold text-black'}>Create Group</h2>
            <button onClick={() => setShowCreateGroup(false)} className={nightMode ? 'p-2 hover:bg-white/10 rounded-lg' : 'p-2 hover:bg-white/20 rounded-lg'}>
              <X className={`w-5 h-5 ${nightMode ? 'text-slate-100' : 'text-black'}`} />
            </button>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className={nightMode ? 'block text-sm font-semibold text-slate-100 mb-2' : 'block text-sm font-semibold text-black mb-2'}>
                Group Name *
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Prayer Warriors"
                className={nightMode ? 'w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all' : 'w-full px-4 py-3 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md transition-all'}
                required
              />
            </div>

            <div>
              <label className={nightMode ? 'block text-sm font-semibold text-slate-100 mb-2' : 'block text-sm font-semibold text-black mb-2'}>
                Description (optional)
              </label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="What's this group about?"
                rows={3}
                className={nightMode ? 'w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all' : 'w-full px-4 py-3 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md transition-all'}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${
                  nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-100 border-white/10' : 'bg-white/80 hover:bg-white text-black border-white/30 shadow-md'
                }`}
                aria-label="Cancel creating group"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !newGroupName.trim()}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                  nightMode ? 'border-white/20' : 'border-white/30 shadow-md'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: nightMode
                    ? '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 4px 12px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && newGroupName.trim()) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)';
                }}
                aria-label={`${loading ? 'Creating group' : 'Create group'}`}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    );
  }

  // Group Settings View
  if (activeGroup && activeView === 'settings') {
    const group = myGroups.find(g => g.id === activeGroup);
    if (!group) return null;

    const isLeader = group.userRole === 'leader';

    return (
      <div className="py-4 px-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setActiveView('chat')}
            className="text-blue-600 text-sm font-semibold"
          >
            ← Back to Chat
          </button>
          <h2 className={nightMode ? 'text-lg font-bold text-slate-100' : 'text-lg font-bold text-black'}>Group Settings</h2>
          <div className="w-20"></div>
        </div>

        {isLeader ? (
          <form onSubmit={handleUpdateGroup} className="space-y-4">
            <div
              className={`rounded-xl border p-4 space-y-4 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <div>
                <label className={nightMode ? 'block text-sm font-semibold text-slate-100 mb-2' : 'block text-sm font-semibold text-black mb-2'}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder={group.name}
                  className={nightMode ? 'w-full px-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md'}
                />
              </div>

              <div>
                <label className={nightMode ? 'block text-sm font-semibold text-slate-100 mb-2' : 'block text-sm font-semibold text-black mb-2'}>
                  Description
                </label>
                <textarea
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  placeholder={group.description || 'Add a description'}
                  rows={3}
                  className={nightMode ? 'w-full px-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md'}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !editGroupName.trim()}
                className={`w-full px-4 py-3 border rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
                style={{
                  background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: nightMode
                    ? '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 4px 12px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && editGroupName.trim()) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)';
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div
              className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-red-300' : 'border-red-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <h3 className={`font-semibold mb-2 ${nightMode ? 'text-red-400' : 'text-red-900'}`}>Danger Zone</h3>
              <p className={nightMode ? 'text-sm text-slate-100 mb-4' : 'text-sm text-black mb-4'}>
                Once you delete a group, all messages and members will be removed. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={loading}
                className="w-full px-4 py-3 bg-red-500 text-slate-100 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            </div>
          </form>
        ) : (
          <div
            className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
            }}
          >
            <h3 className={nightMode ? 'font-semibold text-slate-100 mb-2' : 'font-semibold text-black mb-2'}>Leave Group</h3>
            <p className={nightMode ? 'text-sm text-slate-100 mb-4' : 'text-sm text-black mb-4'}>
              You can rejoin this group later by requesting access again.
            </p>
            <button
              onClick={handleLeaveGroup}
              disabled={loading}
              className={`w-full px-4 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all ${nightMode ? 'bg-slate-500 hover:bg-slate-600 text-slate-100' : 'bg-slate-500 hover:bg-slate-600 text-white'}`}
            >
              <LogOut className="w-4 h-4" />
              Leave Group
            </button>
          </div>
        )}
      </div>
    );
  }

  // Group Members View
  if (activeGroup && activeView === 'members') {
    const group = myGroups.find(g => g.id === activeGroup);
    if (!group) return null;

    const isLeader = group.userRole === 'leader';

    return (
      <div className="py-4 px-4 space-y-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setActiveView('chat')}
            className="text-blue-600 text-sm font-semibold"
          >
            ← Back to Chat
          </button>
          <h2 className={nightMode ? 'text-lg font-bold text-slate-100' : 'text-lg font-bold text-black'}>Members ({groupMembers.length})</h2>
          <div className="w-20"></div>
        </div>

        <div className="space-y-2">
          {groupMembers.map((member) => (
            <div
              key={member.id}
              className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="text-2xl">{member.user.avatar_emoji}</div>
                    {member.user.is_online && (
                      <div className={nightMode ? 'absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1A1A1B]' : 'absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white'}></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={nightMode ? 'font-semibold text-slate-100' : 'font-semibold text-black'}>{member.user.display_name}</h3>
                      {member.role === 'leader' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <p className={nightMode ? 'text-xs text-slate-100' : 'text-xs text-black'}>@{member.user.username}</p>
                  </div>
                </div>

                {isLeader && member.user.id !== profile!.supabaseId && (
                  <div className="flex gap-2">
                    {member.role !== 'leader' && (
                      <button
                        onClick={() => handlePromoteMember(member.user.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${nightMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-sm'}`}
                      >
                        Promote
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.user.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${nightMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200 shadow-sm'}`}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Group Chat View
  if (activeGroup && activeView === 'chat') {
    const group = myGroups.find(g => g.id === activeGroup);
    if (!group) return null;

    const isLeader = group.userRole === 'leader';

    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div
          className={`px-4 py-2.5 border-b ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)'
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setActiveGroup(null);
                setActiveView('list');
              }}
              className="text-blue-600 text-sm font-semibold"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <div className="text-xl">{group.avatar_emoji}</div>
              <div>
                <h3 className={nightMode ? 'font-semibold text-slate-100 text-sm' : 'font-semibold text-black text-sm'}>{group.name}</h3>
                <p className={nightMode ? 'text-[10px] text-slate-100' : 'text-[10px] text-black'}>{group.member_count} members</p>
              </div>
              {group.description && (
                <button
                  onClick={() => setShowGroupBio(!showGroupBio)}
                  className={nightMode ? 'p-1 hover:bg-white/10 rounded-lg' : 'p-1 hover:bg-white/20 rounded-lg'}
                  title={showGroupBio ? "Hide Group Bio" : "Show Group Bio"}
                >
                  <Info className={nightMode ? 'w-3.5 h-3.5 text-slate-100' : 'w-3.5 h-3.5 text-black'} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveView('members')}
                className={nightMode ? 'p-2 hover:bg-white/10 rounded-lg relative' : 'p-2 hover:bg-white/20 rounded-lg relative'}
                title="Members"
              >
                <Users className={nightMode ? 'w-4 h-4 text-slate-100' : 'w-4 h-4 text-black'} />
              </button>
              {isLeader && (
                <button
                  onClick={() => setActiveView('settings')}
                  className={nightMode ? 'p-2 hover:bg-white/10 rounded-lg' : 'p-2 hover:bg-white/20 rounded-lg'}
                  title="Settings"
                >
                  <Settings className={nightMode ? 'w-4 h-4 text-slate-100' : 'w-4 h-4 text-black'} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Group Bio Banner */}
        {group.description && showGroupBio && (
          <div
            className={`px-4 py-2.5 border-b ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className={nightMode ? 'text-[11px] font-semibold text-slate-100 mb-1' : 'text-[11px] font-semibold text-black mb-1'}>
                  Group Bio
                </p>
                <p className={nightMode ? 'text-[12px] text-slate-100 leading-relaxed' : 'text-[12px] text-black leading-relaxed'}>
                  {group.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pinned Message Preview Banner */}
        {pinnedMessages.length > 0 && (
          <div
            className={`px-4 py-2 border-b ${nightMode ? 'bg-white/5 border-white/10' : 'border-blue-100'}`}
            style={nightMode ? {} : {
              background: 'rgba(239, 246, 255, 0.7)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
          >
            <button
              onClick={() => pinnedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={nightMode ? 'w-full hover:bg-white/10 transition-colors text-left rounded-lg px-2 py-1' : 'w-full hover:bg-blue-100 transition-colors text-left rounded-lg px-2 py-1'}
            >
              <div className="flex items-start gap-2">
                <Pin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className={nightMode ? 'text-[11px] font-semibold text-slate-100 mb-0.5' : 'text-[11px] font-semibold text-blue-900 mb-0.5'}>
                    Pinned Message
                  </p>
                  <p className={nightMode ? 'text-[11px] text-slate-100 truncate' : 'text-[11px] text-blue-700 truncate'}>
                    {pinnedMessages[0].content}
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Messages */}
        <div
          className={`flex-1 p-4 overflow-y-auto ${nightMode ? 'bg-white/5' : ''}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)'
          }}
        >
          {loading ? (
            <div className={nightMode ? 'text-center text-slate-100 py-8' : 'text-center text-black py-8'}>
              Loading messages...
            </div>
          ) : (
            <>
              {/* Pinned Messages Section */}
              {pinnedMessages.length > 0 && (
                <div ref={pinnedSectionRef} className={nightMode ? 'mb-4 pb-3 border-b border-white/10' : 'mb-4 pb-3 border-b border-white/25'}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Pin className="w-3.5 h-3.5 text-blue-600" />
                    <span className={nightMode ? 'text-xs font-semibold text-slate-100' : 'text-xs font-semibold text-black'}>Pinned Message</span>
                  </div>
                  {pinnedMessages.map((msg) => {
                    const reactions = messageReactions[msg.id] || [];
                    const reactionCounts = reactions.reduce((acc, r) => {
                      acc[r.emoji] = acc[r.emoji] || { count: 0, users: [], hasReacted: false };
                      acc[r.emoji].count++;
                      acc[r.emoji].users.push(r.user.display_name);
                      if (r.user_id === profile!.supabaseId) acc[r.emoji].hasReacted = true;
                      return acc;
                    }, {} as Record<string, { count: number; users: string[]; hasReacted: boolean }>);

                    return (
                      <div key={msg.id} className="mt-2">
                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                          <span className="text-sm">{msg.sender.avatar_emoji}</span>
                          <span className={nightMode ? 'text-xs font-semibold text-slate-100' : 'text-xs font-semibold text-black'}>
                            {msg.sender.display_name}
                          </span>
                        </div>
                        <div className="flex flex-col items-start ml-1">
                          <div
                            ref={(el) => { messageRefs.current[msg.id] = el; }}
                            className={nightMode ? 'bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md inline-block relative group border border-blue-400 transition-colors' : 'bg-slate-100 text-black px-2 py-1 rounded-lg max-w-[80%] sm:max-w-md inline-block relative group border border-blue-200'}>
                            <div className="flex items-start gap-1.5">
                              <Pin className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-[15px] break-words whitespace-pre-wrap leading-snug">{msg.content}</p>
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                  <p className={nightMode ? 'text-[10px] text-slate-100' : 'text-[10px] text-black'}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <div className="flex gap-1">
                                    {/* Reaction button */}
                                    <button
                                      onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-black"
                                    >
                                      <Smile className="w-3 h-3" />
                                    </button>
                                    {/* Unpin button (leaders only) */}
                                    {isLeader && (
                                      <button
                                        onClick={() => handleUnpinMessage(msg.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700"
                                        title="Unpin message"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

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

                          {/* Display reactions */}
                          {Object.keys(reactionCounts).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(() => {
                                const sortedReactions = Object.entries(reactionCounts).sort((a, b) => b[1].count - a[1].count);
                                const isExpanded = expandedReactions[msg.id];
                                const displayReactions = isExpanded ? sortedReactions : sortedReactions.slice(0, 5);
                                const hiddenCount = sortedReactions.length - 5;

                                return (
                                  <>
                                    {displayReactions.map(([emoji, data]) => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                        handleReaction(msg.id, emoji);
                                        setShowReactionPicker(null);
                                      }}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                          data.hasReacted
                                            ? 'bg-blue-100 border-2 border-blue-400'
                                            : 'bg-slate-100 border border-white/25 hover:border-slate-300'
                                        }`}
                                        title={data.users.join(', ')}
                                      >
                                        <span>{emoji}</span>
                                        <span className="text-[10px] font-semibold">{data.count}</span>
                                      </button>
                                    ))}

                                    {!isExpanded && hiddenCount > 0 && (
                                      <button
                                        onClick={() => setExpandedReactions(prev => ({ ...prev, [msg.id]: true }))}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 border border-white/25 hover:border-slate-300 text-black"
                                      >
                                        <span className="text-[10px] font-semibold">+{hiddenCount} more</span>
                                      </button>
                                    )}

                                    {isExpanded && sortedReactions.length > 5 && (
                                      <button
                                        onClick={() => setExpandedReactions(prev => ({ ...prev, [msg.id]: false }))}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 border border-white/25 hover:border-slate-300 text-black"
                                      >
                                        <span className="text-[10px] font-semibold">Show less</span>
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Regular Messages */}
              {groupMessages.length === 0 ? (
                <div className={nightMode ? 'text-center text-slate-100 py-8' : 'text-center text-black py-8'}>
                  <p>No messages yet.</p>
                  <p className="text-sm mt-2">Start the conversation!</p>
                </div>
              ) : (
                groupMessages.map((msg) => {
              const isMe = msg.sender_id === profile!.supabaseId;
              const reactions = messageReactions[msg.id] || [];

              // Group reactions by emoji
              const reactionCounts = reactions.reduce((acc, r) => {
                acc[r.emoji] = acc[r.emoji] || { count: 0, users: [], hasReacted: false };
                acc[r.emoji].count++;
                acc[r.emoji].users.push(r.user.display_name);
                if (r.user_id === profile!.supabaseId) acc[r.emoji].hasReacted = true;
                return acc;
              }, {} as Record<string, { count: number; users: string[]; hasReacted: boolean }>);

              return (
                <div key={msg.id} className="mt-3">
                  {isMe ? (
                    // User's own messages (Discord-style left-aligned)
                    <div className="flex gap-2 items-start">
                      {/* Avatar (always show) */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${nightMode ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                        {profile!.avatar}
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0">
                        {/* Name and timestamp (always show) */}
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={nightMode ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-black'}>
                            {profile!.displayName}
                          </span>
                          <span className={nightMode ? 'text-[10px] text-slate-100' : 'text-[10px] text-black'}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Message bubble with reactions */}
                        <div className="flex items-center gap-2 group">
                      <div
                        ref={(el) => { messageRefs.current[msg.id] = el; }}
                        className={nightMode ? 'bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors' : 'bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors'}>
                            <p className="text-[15px] break-words whitespace-pre-wrap leading-snug">{msg.content}</p>

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
                                onClick={() => handleReaction(msg.id, emoji)}
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

                          {/* Hover buttons (Discord-style, on the right) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Reaction button */}
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                              className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm'}
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {/* Pin button (leaders only) */}
                            {isLeader && (
                              <button
                                onClick={() => handlePinMessage(msg.id)}
                                className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm'}
                                title="Pin message"
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Display reactions - Discord style (moved outside message bubble) */}
                        <div className="flex flex-col items-start w-full">
                          {/* Display reactions - Discord style */}
                          {Object.keys(reactionCounts).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(() => {
                                // Sort reactions by count (most popular first)
                                const sortedReactions = Object.entries(reactionCounts).sort((a, b) => b[1].count - a[1].count);
                                const isExpanded = expandedReactions[msg.id];
                                const displayReactions = isExpanded ? sortedReactions : sortedReactions.slice(0, 5);
                                const hiddenCount = sortedReactions.length - 5;

                                return (
                                  <>
                                    {displayReactions.map(([emoji, data]) => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                        handleReaction(msg.id, emoji);
                                        setShowReactionPicker(null);
                                      }}
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

                                    {/* Show "more" button if more than 5 reactions */}
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
                  ) : (
                    // Other users' messages (Discord-style with avatar on left)
                    <div className="flex gap-2 items-start">
                      {/* Avatar (always show) */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${nightMode ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                        {msg.sender.avatar_emoji}
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0">
                        {/* Name and timestamp (always show) */}
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={nightMode ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-black'}>
                            {msg.sender.display_name}
                          </span>
                          <span className={nightMode ? 'text-[10px] text-slate-100' : 'text-[10px] text-black'}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Message bubble with reactions */}
                        <div className="flex flex-col items-start">
                          <div
                            ref={(el) => { messageRefs.current[msg.id] = el; }}
                            className={nightMode ? 'bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative group transition-colors' : 'bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative group transition-colors'}>
                            <p className="text-[15px] break-words whitespace-pre-wrap leading-snug">{msg.content}</p>
                            <div className="flex gap-1 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Reaction button (shows on hover) */}
                              <button
                                onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm'}
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>
                              {/* Pin button (leaders only, shows on hover) */}
                              {isLeader && (
                                <button
                                  onClick={() => handlePinMessage(msg.id)}
                                  className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm'}
                                  title="Pin message"
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

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

                          {/* Hover buttons (Discord-style, on the right) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Reaction button */}
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                              className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm'}
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {/* Pin button (leaders only) */}
                            {isLeader && (
                              <button
                                onClick={() => handlePinMessage(msg.id)}
                                className={nightMode ? 'p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100' : 'p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm'}
                                title="Pin message"
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Display reactions - Discord style (moved outside message bubble) */}
                        <div className="flex flex-col items-start w-full">
                          {/* Display reactions - Discord style */}
                          {Object.keys(reactionCounts).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(() => {
                                // Sort reactions by count (most popular first)
                                const sortedReactions = Object.entries(reactionCounts).sort((a, b) => b[1].count - a[1].count);
                                const isExpanded = expandedReactions[msg.id];
                                const displayReactions = isExpanded ? sortedReactions : sortedReactions.slice(0, 5);
                                const hiddenCount = sortedReactions.length - 5;

                                return (
                                  <>
                                    {displayReactions.map(([emoji, data]) => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                        handleReaction(msg.id, emoji);
                                        setShowReactionPicker(null);
                                      }}
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

                                    {/* Show "more" button if more than 5 reactions */}
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
                  )}
                </div>
              );
                })
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSendGroupMessage}
          className={`px-4 py-3 border-t flex gap-2 items-end ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
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
                handleSendGroupMessage(e);
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
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 100) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`w-10 h-10 border rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
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

  // Groups List View
  return (
    <div className="py-4 space-y-4 px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={nightMode ? 'text-lg font-bold text-slate-100' : 'text-lg font-bold text-black'}>Groups</h2>
          <p className={nightMode ? 'text-sm text-slate-100' : 'text-sm text-black'}>Connect with your community</p>
        </div>
        <div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className={`p-2 border rounded-lg transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
            style={{
              background: 'rgba(79, 150, 255, 0.85)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
            }}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* My Groups */}
      <div>
        <h3 className={nightMode ? 'text-sm font-semibold text-slate-100 mb-2' : 'text-sm font-semibold text-black mb-2'}>My Groups ({myGroups.length})</h3>
        {isGroupsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <GroupCardSkeleton key={i} nightMode={nightMode} />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <div
            className={`rounded-xl border p-8 text-center ${nightMode ? 'bg-white/5 border-white/10 ' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
          >
            <div className="text-6xl mb-4">👥</div>
            <p className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No groups yet</p>
            <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
              Create a group to connect with your faith community! Groups are invite-only and can be shared with friends.
            </p>
            <div className={`p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
              <p className={`text-xs font-medium ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                💡 Tip: Click the <span className="font-bold">+</span> button above to create your first group
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {myGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setActiveGroup(group.id);
                  setActiveView('chat');
                }}
                className={`w-full rounded-xl border p-4 text-left transition-all hover:-translate-y-1 ${nightMode ? 'bg-white/5 border-white/10  ' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]'}`}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{group.avatar_emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={nightMode ? 'font-semibold text-slate-100' : 'font-semibold text-black'}>{group.name}</h3>
                      {group.userRole === 'leader' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <p className={nightMode ? 'text-sm text-slate-100' : 'text-sm text-black'}>{group.member_count} members</p>
                  </div>
                  <ChevronRight className={nightMode ? 'w-5 h-5 text-slate-100' : 'w-5 h-5 text-slate-400'} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsTab;
