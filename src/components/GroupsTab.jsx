import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Settings, Crown, Users, Trash2, LogOut, UserPlus, Check, XCircle, ChevronRight, Smile, Pin, Info } from 'lucide-react';
import {
  createGroup,
  getUserGroups,
  sendGroupMessage,
  getGroupMessages,
  updateGroup,
  deleteGroup,
  leaveGroup,
  getGroupMembers,
  inviteToGroup,
  removeMemberFromGroup,
  promoteMemberToLeader,
  searchPublicGroups,
  requestToJoinGroup,
  getGroupJoinRequests,
  approveJoinRequest,
  denyJoinRequest,
  subscribeToGroupMessages,
  unsubscribe,
  addReaction,
  removeReaction,
  getMessageReactions,
  pinMessage,
  unpinMessage,
  getPinnedMessages
} from '../lib/database';
import { useUserProfile } from './useUserProfile';

const GroupsTab = ({ groupSearchQuery, setGroupSearchQuery, nightMode }) => {
  const { profile } = useUserProfile();
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'chat', 'settings', 'members', 'discover', 'requests'
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [myGroups, setMyGroups] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [messageReactions, setMessageReactions] = useState({});
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [expandedReactions, setExpandedReactions] = useState({});
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [showAllEmojis, setShowAllEmojis] = useState({});
  const [showGroupBio, setShowGroupBio] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const pinnedSectionRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Reaction emojis for faith-based groups (22 emojis)
  const reactionEmojis = [
    '🙏', '❤️', '✝️', '🔥', '✨', '🕊️',  // Row 1: Faith Core
    '📖', '🌟', '💪', '🛡️', '🙌', '👑',  // Row 2: Faith Symbols
    '🤲', '😇', '😊', '😢', '😮', '🎉',  // Row 3: Support & Prayer
    '🫂', '✋', '🥰', '😌', '✅', '💯'   // Row 4: Connection & Agreement
  ];

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

  // Load group messages when opening a group
  useEffect(() => {
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
        const allMessages = [...(pinned || []), ...(messages || [])];
        const reactionsPromises = allMessages.map(msg => getMessageReactions(msg.id));
        const reactionsResults = await Promise.all(reactionsPromises);

        const reactionsMap = {};
        allMessages.forEach((msg, index) => {
          reactionsMap[msg.id] = reactionsResults[index];
        });
        setMessageReactions(reactionsMap);

        setLoading(false);

        // POLLING VERSION (FREE) - Checks for new messages every 3 seconds
        const pollInterval = setInterval(async () => {
          // Load messages and pinned in parallel
          const [updatedMessages, updatedPinned] = await Promise.all([
            getGroupMessages(activeGroup),
            getPinnedMessages(activeGroup)
          ]);

          setGroupMessages(updatedMessages || []);
          setPinnedMessages(updatedPinned || []);

          // Reload reactions for all messages in parallel
          const allMessages = [...(updatedPinned || []), ...(updatedMessages || [])];
          const reactionsPromises = allMessages.map(msg => getMessageReactions(msg.id));
          const reactionsResults = await Promise.all(reactionsPromises);

          const newReactionsMap = {};
          allMessages.forEach((msg, index) => {
            newReactionsMap[msg.id] = reactionsResults[index];
          });
          setMessageReactions(newReactionsMap);
        }, 3000); // Poll every 3 seconds

        // Cleanup polling on unmount or group change
        return () => {
          clearInterval(pollInterval);
        };

        /* REAL-TIME VERSION ($25/month) - Uncomment to enable instant messaging
        subscriptionRef.current = subscribeToGroupMessages(activeGroup, (payload) => {
          console.log('New group message:', payload.new);
          setGroupMessages(prev => [...prev, payload.new]);
        });

        return () => {
          if (subscriptionRef.current) {
            unsubscribe(subscriptionRef.current);
          }
        };
        */
      }
    };

    loadGroupMessages();
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

  // Load join requests
  useEffect(() => {
    const loadRequests = async () => {
      if (activeGroup && activeView === 'requests') {
        const requests = await getGroupJoinRequests(activeGroup);
        setJoinRequests(requests || []);
      }
    };

    loadRequests();
  }, [activeGroup, activeView]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !profile?.supabaseId) return;

    setLoading(true);

    const newGroup = await createGroup(profile.supabaseId, {
      name: newGroupName,
      description: newGroupDescription,
      avatarEmoji: '✨',
      isPrivate: false
    });

    if (newGroup) {
      console.log('✅ Group created!', newGroup);
      // Reload groups
      const groups = await getUserGroups(profile.supabaseId);
      setMyGroups(groups || []);
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
    } else {
      console.error('❌ Failed to create group');
    }

    setLoading(false);
  };

  const handleSendGroupMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.supabaseId || !activeGroup) return;

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

    // Send to database
    const savedMessage = await sendGroupMessage(
      activeGroup,
      profile.supabaseId,
      newMessage
    );

    if (savedMessage) {
      console.log('✅ Group message sent!', savedMessage);
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!editGroupName.trim() || !activeGroup) return;

    setLoading(true);

    const updated = await updateGroup(activeGroup, {
      name: editGroupName,
      description: editGroupDescription
    });

    if (updated) {
      console.log('✅ Group updated!', updated);
      // Reload groups
      const groups = await getUserGroups(profile.supabaseId);
      setMyGroups(groups || []);
      setActiveView('chat');
    }

    setLoading(false);
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This cannot be undone.')) return;

    setLoading(true);

    const deleted = await deleteGroup(activeGroup);

    if (deleted) {
      console.log('✅ Group deleted!');
      // Reload groups
      const groups = await getUserGroups(profile.supabaseId);
      setMyGroups(groups || []);
      setActiveGroup(null);
      setActiveView('list');
    }

    setLoading(false);
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    setLoading(true);

    const left = await leaveGroup(activeGroup, profile.supabaseId);

    if (left) {
      console.log('✅ Left group!');
      // Reload groups
      const groups = await getUserGroups(profile.supabaseId);
      setMyGroups(groups || []);
      setActiveGroup(null);
      setActiveView('list');
    }

    setLoading(false);
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    const removed = await removeMemberFromGroup(activeGroup, userId);

    if (removed) {
      console.log('✅ Member removed!');
      // Reload members
      const members = await getGroupMembers(activeGroup);
      setGroupMembers(members || []);
    }
  };

  const handlePromoteMember = async (userId) => {
    if (!window.confirm('Promote this member to leader?')) return;

    const promoted = await promoteMemberToLeader(activeGroup, userId);

    if (promoted) {
      console.log('✅ Member promoted!');
      // Reload members
      const members = await getGroupMembers(activeGroup);
      setGroupMembers(members || []);
    }
  };

  const handleJoinGroup = async (groupId) => {
    setLoading(true);

    const requested = await requestToJoinGroup(groupId, profile.supabaseId, 'I would like to join this group!');

    if (requested) {
      console.log('✅ Join request sent!');
      alert('Join request sent! The group leader will review your request.');
    }

    setLoading(false);
  };

  const handleApproveRequest = async (requestId, userId) => {
    const approved = await approveJoinRequest(requestId, activeGroup, userId);

    if (approved) {
      console.log('✅ Request approved!');
      // Reload requests
      const requests = await getGroupJoinRequests(activeGroup);
      setJoinRequests(requests || []);
      // Reload groups to update member count
      const groups = await getUserGroups(profile.supabaseId);
      setMyGroups(groups || []);
    }
  };

  const handleDenyRequest = async (requestId) => {
    const denied = await denyJoinRequest(requestId);

    if (denied) {
      console.log('✅ Request denied!');
      // Reload requests
      const requests = await getGroupJoinRequests(activeGroup);
      setJoinRequests(requests || []);
    }
  };

  const handleDiscoverGroups = async () => {
    setLoading(true);
    const groups = await searchPublicGroups(groupSearchQuery);
    setPublicGroups(groups || []);
    setLoading(false);
  };

  const handleReaction = async (messageId, emoji) => {
    if (!profile?.supabaseId) return;

    const reactions = messageReactions[messageId] || [];
    const existingReaction = reactions.find(
      r => r.user_id === profile.supabaseId && r.emoji === emoji
    );

    if (existingReaction) {
      // Optimistically remove reaction from UI immediately
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: reactions.filter(r => r.id !== existingReaction.id)
      }));

      // Then remove from database in background
      removeReaction(messageId, profile.supabaseId, emoji).catch(() => {
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
        user_id: profile.supabaseId,
        emoji: emoji,
        user: {
          id: profile.supabaseId,
          display_name: profile.displayName,
          avatar_emoji: profile.avatar
        }
      };

      setMessageReactions(prev => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), tempReaction]
      }));

      // Then add to database in background
      addReaction(messageId, profile.supabaseId, emoji).then(newReaction => {
        if (newReaction) {
          // Replace temp with real reaction
          setMessageReactions(prev => ({
            ...prev,
            [messageId]: [
              ...(prev[messageId] || []).filter(r => r.id !== tempReaction.id),
              {
                ...newReaction,
                user: {
                  id: profile.supabaseId,
                  display_name: profile.displayName,
                  avatar_emoji: profile.avatar
                }
              }
            ]
          }));
        }
      }).catch(() => {
        // Rollback on error
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter(r => r.id !== tempReaction.id)
        }));
      });
    }

    setShowReactionPicker(null);
  };

  const handlePinMessage = async (messageId) => {
    if (!profile?.supabaseId) return;

    const result = await pinMessage(messageId, profile.supabaseId);
    if (result) {
      console.log('✅ Message pinned!');
      // Reload pinned messages
      const pinned = await getPinnedMessages(activeGroup);
      setPinnedMessages(pinned || []);
    }
    setShowMessageMenu(null);
  };

  const handleUnpinMessage = async (messageId) => {
    const result = await unpinMessage(messageId);
    if (result) {
      console.log('✅ Message unpinned!');
      // Reload pinned messages
      const pinned = await getPinnedMessages(activeGroup);
      setPinnedMessages(pinned || []);
    }
    setShowMessageMenu(null);
  };

  // Create Group Modal
  if (showCreateGroup) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div
          className={nightMode ? 'bg-white/5 rounded-xl max-w-md w-full p-6' : 'rounded-xl max-w-md w-full p-6 border border-white/25'}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className={nightMode ? 'text-xl font-bold text-slate-100' : 'text-xl font-bold text-black'}>Create Group</h2>
            <button onClick={() => setShowCreateGroup(false)} className={nightMode ? 'p-2 hover:bg-white/10 rounded-lg' : 'p-2 hover:bg-white/20 rounded-lg'}>
              <X className="w-5 h-5" />
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
                className={nightMode ? 'w-full px-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-white/25 text-black placeholder-black/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
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
                rows="3"
                className={nightMode ? 'w-full px-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-white/25 text-black placeholder-black/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className={`flex-1 px-4 py-2 border rounded-lg transition-all duration-200 ${nightMode ? 'border-white/10 text-slate-100 hover:bg-white/10' : 'border-white/30 text-black shadow-md'}`}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
                onMouseEnter={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                onMouseLeave={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !newGroupName.trim()}
                className={`flex-1 px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
                style={{
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && newGroupName.trim()) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                }}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
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
            <div className={nightMode ? 'bg-white/5 rounded-xl border border-white/10 p-4 space-y-4 ' : 'bg-white rounded-xl border border-white/25 p-4 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}>
              <div>
                <label className={nightMode ? 'block text-sm font-semibold text-slate-100 mb-2' : 'block text-sm font-semibold text-black mb-2'}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder={group.name}
                  className={nightMode ? 'w-full px-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-white/25 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
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
                  rows="3"
                  className={nightMode ? 'w-full px-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-white/25 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !editGroupName.trim()}
                className={`w-full px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
                style={{
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && editGroupName.trim()) {
                    e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className={nightMode ? 'bg-white/5 rounded-xl border border-red-300 p-4 ' : 'bg-white rounded-xl border border-red-200 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}>
              <h3 className="font-semibold text-red-900 mb-2">Danger Zone</h3>
              <p className={nightMode ? 'text-sm text-slate-100 mb-4' : 'text-sm text-black mb-4'}>
                Once you delete a group, all messages and members will be removed. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-500 text-slate-100 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            </div>
          </form>
        ) : (
          <div className={nightMode ? 'bg-white/5 rounded-xl border border-white/10 p-4 ' : 'bg-white rounded-xl border border-white/25 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}>
            <h3 className={nightMode ? 'font-semibold text-slate-100 mb-2' : 'font-semibold text-black mb-2'}>Leave Group</h3>
            <p className={nightMode ? 'text-sm text-slate-100 mb-4' : 'text-sm text-black mb-4'}>
              You can rejoin this group later by requesting access again.
            </p>
            <button
              onClick={handleLeaveGroup}
              disabled={loading}
              className="w-full px-4 py-2 bg-white/100 text-slate-100 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <div key={member.id} className={nightMode ? 'bg-white/5 rounded-xl border border-white/10 p-4 ' : 'bg-white rounded-xl border border-white/25 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}>
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

                {isLeader && member.user.id !== profile.supabaseId && (
                  <div className="flex gap-2">
                    {member.role !== 'leader' && (
                      <button
                        onClick={() => handlePromoteMember(member.user.id)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        Promote
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.user.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
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

  // Join Requests View (Leaders only)
  if (activeGroup && activeView === 'requests') {
    const group = myGroups.find(g => g.id === activeGroup);
    if (!group) return null;

    return (
      <div className="py-4 px-4 space-y-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setActiveView('chat')}
            className="text-blue-600 text-sm font-semibold"
          >
            ← Back to Chat
          </button>
          <h2 className={nightMode ? 'text-lg font-bold text-slate-100' : 'text-lg font-bold text-black'}>Join Requests ({joinRequests.length})</h2>
          <div className="w-20"></div>
        </div>

        {joinRequests.length === 0 ? (
          <div
            className={`rounded-xl border p-8 text-center ${nightMode ? 'bg-white/5 border-white/10 ' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
          >
            <div className="text-5xl mb-4">✅</div>
            <p className={`font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>All caught up!</p>
            <p className={nightMode ? 'text-sm text-slate-100' : 'text-sm text-black'}>No pending join requests</p>
          </div>
        ) : (
          <div className="space-y-2">
            {joinRequests.map((request) => (
              <div
                key={request.id}
                className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10 ' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{request.user.avatar_emoji}</div>
                    <div>
                      <h3 className={nightMode ? 'font-semibold text-slate-100' : 'font-semibold text-black'}>{request.user.display_name}</h3>
                      <p className={nightMode ? 'text-xs text-slate-100' : 'text-xs text-black'}>@{request.user.username}</p>
                      {request.message && (
                        <p className={nightMode ? 'text-sm text-slate-100 mt-1' : 'text-sm text-black mt-1'}>{request.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveRequest(request.id, request.user.id)}
                      className={`px-3 py-1 border rounded-lg flex items-center gap-1 transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
                      style={nightMode ? {
                        background: 'rgba(79, 150, 255, 0.85)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)'
                      } : {
                        background: 'rgba(34, 197, 94, 0.7)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)'
                      }}
                      onMouseEnter={(e) => {
                        if (nightMode) {
                          e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                        } else {
                          e.currentTarget.style.background = 'rgba(34, 197, 94, 0.85)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (nightMode) {
                          e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                        } else {
                          e.currentTarget.style.background = 'rgba(34, 197, 94, 0.7)';
                        }
                      }}
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDenyRequest(request.id)}
                      className={`px-3 py-1 border rounded-lg flex items-center gap-1 transition-all duration-200 ${nightMode ? 'bg-white/10 hover:bg-[#343536] text-slate-100 border-white/10' : 'text-slate-100 shadow-md border-white/30'}`}
                      style={nightMode ? {} : {
                        background: 'rgba(239, 68, 68, 0.7)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)'
                      }}
                      onMouseEnter={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)')}
                      onMouseLeave={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.7)')}
                    >
                      <XCircle className="w-4 h-4" />
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Discover Groups View
  if (activeView === 'discover') {
    return (
      <div className="py-4 px-4 space-y-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setActiveView('list')}
            className="text-blue-600 text-sm font-semibold"
          >
            ← Back to My Groups
          </button>
          <h2 className={nightMode ? 'text-lg font-bold text-slate-100' : 'text-lg font-bold text-black'}>Discover Groups</h2>
          <div className="w-20"></div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={groupSearchQuery}
            onChange={(e) => setGroupSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleDiscoverGroups()}
            placeholder="Search public groups..."
            className={nightMode ? 'w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-[#818384] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full pl-10 pr-4 py-2 border border-white/25 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
          />
        </div>

        <button
          onClick={handleDiscoverGroups}
          className={`w-full px-4 py-2 border rounded-lg transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
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
          {loading ? 'Searching...' : 'Search Groups'}
        </button>

        {publicGroups.length === 0 ? (
          <div
            className={`rounded-xl border p-8 text-center ${nightMode ? 'bg-white/5 border-white/10 ' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
          >
            <div className="text-5xl mb-4">🔍</div>
            <p className={`font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No groups found</p>
            <p className={nightMode ? 'text-sm text-slate-100' : 'text-sm text-black'}>Try searching for a group name or topic!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {publicGroups.map((group) => {
              const isMember = myGroups.some(g => g.id === group.id);
              return (
                <div
                  key={group.id}
                  className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10 ' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
                  style={nightMode ? {} : {
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{group.avatar_emoji}</div>
                    <div className="flex-1">
                      <h3 className={nightMode ? 'font-semibold text-slate-100' : 'font-semibold text-black'}>{group.name}</h3>
                      {group.description && (
                        <p className={nightMode ? 'text-sm text-slate-100' : 'text-sm text-black'}>{group.description}</p>
                      )}
                      <p className={nightMode ? 'text-xs text-slate-100 mt-1' : 'text-xs text-black mt-1'}>
                        {group.member_count?.[0]?.count || 0} members
                      </p>
                    </div>
                    {isMember ? (
                      <button
                        onClick={() => {
                          setActiveGroup(group.id);
                          setActiveView('chat');
                        }}
                        className={`px-4 py-2 ${nightMode ? 'bg-blue-600 hover:bg-blue-700 text-slate-100' : 'bg-blue-500 hover:bg-blue-600 text-slate-100'} rounded-lg flex items-center gap-2`}
                      >
                        Open
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={loading}
                        className={`px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 text-slate-100 ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
                        style={nightMode ? {
                          background: 'rgba(79, 150, 255, 0.85)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)'
                        } : {
                          background: 'rgba(34, 197, 94, 0.7)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)'
                        }}
                        onMouseEnter={(e) => {
                          if (nightMode && !loading) {
                            e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                          } else if (!nightMode && !loading) {
                            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.85)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (nightMode) {
                            e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                          } else {
                            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.7)';
                          }
                        }}
                      >
                        <UserPlus className="w-4 h-4" />
                        Join
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Group Chat View
  if (activeGroup && activeView === 'chat') {
    const group = myGroups.find(g => g.id === activeGroup);
    if (!group) return null;

    const isLeader = group.userRole === 'leader';
    const pendingRequests = joinRequests.length || 0;

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
                  onClick={() => setActiveView('requests')}
                  className={nightMode ? 'p-2 hover:bg-white/10 rounded-lg relative' : 'p-2 hover:bg-white/20 rounded-lg relative'}
                  title="Join Requests"
                >
                  <UserPlus className={nightMode ? 'w-4 h-4 text-slate-100' : 'w-4 h-4 text-black'} />
                  {pendingRequests > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 ${nightMode ? 'bg-blue-700 text-slate-100' : 'bg-red-500 text-slate-100'} text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold`}>
                      {pendingRequests}
                    </span>
                  )}
                </button>
              )}
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
                    const isMe = msg.sender_id === profile.supabaseId;
                    const reactions = messageReactions[msg.id] || [];
                    const reactionCounts = reactions.reduce((acc, r) => {
                      acc[r.emoji] = acc[r.emoji] || { count: 0, users: [], hasReacted: false };
                      acc[r.emoji].count++;
                      acc[r.emoji].users.push(r.user.display_name);
                      if (r.user_id === profile.supabaseId) acc[r.emoji].hasReacted = true;
                      return acc;
                    }, {});

                    return (
                      <div key={msg.id} className="mt-2">
                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                          <span className="text-sm">{msg.sender.avatar_emoji}</span>
                          <span className={nightMode ? 'text-xs font-semibold text-slate-100' : 'text-xs font-semibold text-black'}>
                            {msg.sender.display_name}
                          </span>
                        </div>
                        <div className="flex flex-col items-start ml-1">
                          <div className={nightMode ? 'bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md inline-block relative group border border-blue-400 transition-colors' : 'bg-slate-100 text-black px-2 py-1 rounded-lg max-w-[80%] sm:max-w-md inline-block relative group border border-blue-200'}>
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
                                        onClick={() => handleReaction(msg.id, emoji)}
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
                groupMessages.map((msg, index) => {
              const isMe = msg.sender_id === profile.supabaseId;
              const reactions = messageReactions[msg.id] || [];

              // Group reactions by emoji
              const reactionCounts = reactions.reduce((acc, r) => {
                acc[r.emoji] = acc[r.emoji] || { count: 0, users: [], hasReacted: false };
                acc[r.emoji].count++;
                acc[r.emoji].users.push(r.user.display_name);
                if (r.user_id === profile.supabaseId) acc[r.emoji].hasReacted = true;
                return acc;
              }, {});

              return (
                <div key={msg.id} className="mt-3">
                  {isMe ? (
                    // User's own messages (Discord-style left-aligned)
                    <div className="flex gap-2 items-start">
                      {/* Avatar (always show) */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${nightMode ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                        {profile.avatar}
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0">
                        {/* Name and timestamp (always show) */}
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={nightMode ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-black'}>
                            {profile.displayName}
                          </span>
                          <span className={nightMode ? 'text-[10px] text-slate-100' : 'text-[10px] text-black'}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Message bubble with reactions */}
                        <div className="flex items-center gap-2 group">
                      <div className={nightMode ? 'bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors' : 'bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors'}>
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
                                        onClick={() => handleReaction(msg.id, emoji)}
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
                          <div className={nightMode ? 'bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative group transition-colors' : 'bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative group transition-colors'}>
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
                                        onClick={() => handleReaction(msg.id, emoji)}
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
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
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
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('discover')}
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
            <Search className="w-5 h-5" />
          </button>
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
        {myGroups.length === 0 ? (
          <div
            className={`rounded-xl border p-8 text-center ${nightMode ? 'bg-white/5 border-white/10 ' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
          >
            <div className="text-5xl mb-4">👥</div>
            <p className={`font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No groups yet</p>
            <p className={nightMode ? 'text-sm text-slate-100' : 'text-sm text-black'}>Create a group or discover existing ones to connect with your faith community!</p>
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
