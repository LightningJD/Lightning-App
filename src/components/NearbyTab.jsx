import React, { useState, useEffect } from 'react';
import UserCard from './UserCard';
import { UserCardSkeleton } from './SkeletonLoader';
import OtherUserProfileDialog from './OtherUserProfileDialog';
import { useUserProfile } from './useUserProfile';
import {
  getFriends,
  findNearbyUsers,
  getPendingFriendRequests,
  getSentFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  unfriend,
  checkFriendshipStatus,
  getMutualFriends
} from '../lib/database';
import { checkMilestoneSecret } from '../lib/secrets';

const NearbyTab = ({ sortBy, setSortBy, activeConnectTab, setActiveConnectTab, nightMode, onNavigateToMessages }) => {
  const { profile } = useUserProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [viewingUser, setViewingUser] = useState(null);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  // Load users and friends from database
  useEffect(() => {
    const loadData = async () => {
      if (!profile?.supabaseId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Load friends
        const friendsList = await getFriends(profile.supabaseId);
        setFriends(friendsList || []);

        // Load pending friend requests
        const pending = await getPendingFriendRequests(profile.supabaseId);
        setPendingRequests(pending || []);

        // Load sent requests
        const sent = await getSentFriendRequests(profile.supabaseId);
        setSentRequests(sent || []);

        // Load nearby users (if location available)
        if (profile.locationLat && profile.locationLng) {
          const nearby = await findNearbyUsers(profile.locationLat, profile.locationLng, 25);

          // Filter out current user and existing friends
          const friendIds = new Set(friendsList?.map(f => f.id) || []);
          const filteredUsers = nearby?.filter(u =>
            u.id !== profile.supabaseId && !friendIds.has(u.id)
          ) || [];

          // Add mutual friends count and friendship status
          const enrichedUsers = await Promise.all(
            filteredUsers.map(async (user) => {
              const mutualFriends = await getMutualFriends(profile.supabaseId, user.id);
              const friendshipStatus = await checkFriendshipStatus(profile.supabaseId, user.id);

              return {
                ...user,
                displayName: user.display_name,
                avatarImage: user.avatar_url,
                avatar: user.avatar_emoji,
                online: user.is_online,
                location: user.location_city || 'Unknown',
                mutualFriends: mutualFriends?.length || 0,
                reason: mutualFriends?.length > 0
                  ? `${mutualFriends.length} mutual friend${mutualFriends.length > 1 ? 's' : ''}`
                  : 'Nearby',
                friendshipStatus // 'pending', 'accepted', null
              };
            })
          );

          setRecommendedUsers(enrichedUsers);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [profile?.supabaseId, profile?.locationLat, profile?.locationLng]);

  const handleViewProfile = (user) => {
    setViewingUser(user);
  };

  const handleMessage = (user) => {
    // Navigate to messages tab
    if (onNavigateToMessages) {
      onNavigateToMessages(user);
    }
  };

  const handleAddFriend = async (userId) => {
    if (!profile?.supabaseId) return;

    try {
      await sendFriendRequest(profile.supabaseId, userId);
      // Reload data to update UI
      const sent = await getSentFriendRequests(profile.supabaseId);
      setSentRequests(sent || []);

      // Update recommended users to show pending status
      setRecommendedUsers(prev =>
        prev.map(u =>
          u.id === userId ? { ...u, friendshipStatus: 'pending' } : u
        )
      );
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    if (!profile?.supabaseId) return;

    try {
      await acceptFriendRequest(requestId);
      // Reload data
      const pending = await getPendingFriendRequests(profile.supabaseId);
      setPendingRequests(pending || []);
      const friendsList = await getFriends(profile.supabaseId);
      setFriends(friendsList || []);

      // Check friend milestone secrets (10, 25, 50, 100 friends)
      const friendCount = friendsList?.length || 0;
      if (friendCount === 10) {
        checkMilestoneSecret('friends', 10);
      } else if (friendCount === 25) {
        checkMilestoneSecret('friends', 25);
      } else if (friendCount === 50) {
        checkMilestoneSecret('friends', 50);
      } else if (friendCount === 100) {
        checkMilestoneSecret('friends', 100);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    if (!profile?.supabaseId) return;

    try {
      await declineFriendRequest(requestId);
      // Reload data
      const pending = await getPendingFriendRequests(profile.supabaseId);
      setPendingRequests(pending || []);
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  const handleUnfriend = async (friendId) => {
    if (!profile?.supabaseId) return;

    try {
      await unfriend(profile.supabaseId, friendId);
      // Reload data
      const friendsList = await getFriends(profile.supabaseId);
      setFriends(friendsList || []);
    } catch (error) {
      console.error('Error unfriending user:', error);
    }
  };

  const getSortedUsers = (usersList) => {
    return [...usersList].sort((a, b) => {
      if (sortBy === 'online') {
        return b.online - a.online;
      } else if (sortBy === 'mutual') {
        return b.mutualFriends - a.mutualFriends;
      } else if (sortBy === 'nearby') {
        return parseFloat(a.distance) - parseFloat(b.distance);
      }
      return 0;
    });
  };

  const sortWithOnlineFirst = (usersList) => {
    const sorted = getSortedUsers(usersList);
    const online = sorted.filter(u => u.online);
    const offline = sorted.filter(u => !u.online);
    return [...online, ...offline];
  };

  const sortedRecommended = sortWithOnlineFirst(recommendedUsers);
  const sortedFriends = sortWithOnlineFirst(friends);

  return (
    <div className="py-4 space-y-6">
      <div className="px-4">
        <div
          className={`rounded-xl border p-2 flex gap-2 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <button
            onClick={() => setActiveConnectTab('recommended')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeConnectTab === 'recommended' ? nightMode ? 'text-slate-100 border-b-2 border-white' : 'text-black border-b-2 border-black' : nightMode ? 'text-white/50 hover:text-slate-50/70 border-b-2 border-transparent' : 'text-black/50 hover:text-black/70 border-b-2 border-transparent'}`}
            style={{
              background: 'transparent'
            }}
            aria-label="Show recommended users"
          >
            Recommended
          </button>
          <button
            onClick={() => setActiveConnectTab('friends')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeConnectTab === 'friends' ? nightMode ? 'text-slate-100 border-b-2 border-white' : 'text-black border-b-2 border-black' : nightMode ? 'text-white/50 hover:text-slate-50/70 border-b-2 border-transparent' : 'text-black/50 hover:text-black/70 border-b-2 border-transparent'}`}
            style={{
              background: 'transparent'
            }}
            aria-label="Show friends"
          >
            Friends
          </button>
        </div>
      </div>

      {activeConnectTab === 'recommended' && (
        <div className="px-4">
          <div className="mb-3">
            <h3 className={`text-sm font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>Sort by:</h3>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSortBy('recommended')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${sortBy === 'recommended' ? nightMode ? 'text-slate-100 border-white/20' : 'text-blue-700 shadow-md border-white/30' : nightMode ? 'bg-white/5 text-slate-100 hover:bg-white/10 border-white/10' : 'text-black shadow-sm border-white/30'}`}
                style={sortBy === 'recommended' ? nightMode ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {
                  background: 'rgba(219, 234, 254, 0.7)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : !nightMode ? {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
                aria-label="Sort by recommended"
              >
                Recommended
              </button>
              <button
                onClick={() => setSortBy('nearby')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${sortBy === 'nearby' ? nightMode ? 'text-slate-100 border-white/20' : 'text-blue-700 shadow-md border-white/30' : nightMode ? 'bg-white/5 text-slate-100 hover:bg-white/10 border-white/10' : 'text-black shadow-sm border-white/30'}`}
                style={sortBy === 'nearby' ? nightMode ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {
                  background: 'rgba(219, 234, 254, 0.7)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : !nightMode ? {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
                aria-label="Sort by distance"
              >
                Nearby
              </button>
              <button
                onClick={() => setSortBy('mutual')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${sortBy === 'mutual' ? nightMode ? 'text-slate-100 border-white/20' : 'text-blue-700 shadow-md border-white/30' : nightMode ? 'bg-white/5 text-slate-100 hover:bg-white/10 border-white/10' : 'text-black shadow-sm border-white/30'}`}
                style={sortBy === 'mutual' ? nightMode ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {
                  background: 'rgba(219, 234, 254, 0.7)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : !nightMode ? {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
                aria-label="Sort by mutual friends"
              >
                Mutual
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-20" key={activeConnectTab}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <UserCardSkeleton key={i} nightMode={nightMode} />
            ))}
          </div>
        ) : activeConnectTab === 'recommended' ? (
          sortedRecommended.length === 0 ? (
            <div
              className={`rounded-xl border p-10 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <div className="text-6xl mb-4">🔍</div>
              <p className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No users nearby</p>
              <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
                We couldn't find any believers near you right now.
              </p>
              <div className={`p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                <p className={`text-xs font-medium ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                  💡 Tip: Try adjusting your search radius in Settings or check back later
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRecommended.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  showReason
                  nightMode={nightMode}
                  onViewProfile={handleViewProfile}
                  onMessage={handleMessage}
                  onAddFriend={handleAddFriend}
                />
              ))}
            </div>
          )
        ) : (
          sortedFriends.length === 0 ? (
            <div
              className={`rounded-xl border p-10 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <div className="text-6xl mb-4">👥</div>
              <p className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No friends yet</p>
              <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
                Connect with users from the Recommended tab to add them as friends!
              </p>
              <div className={`p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                <p className={`text-xs font-medium ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                  💡 Tip: Visit the <span className="font-bold">Recommended</span> tab to find believers near you
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedFriends.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  isFriend
                  nightMode={nightMode}
                  onViewProfile={handleViewProfile}
                  onMessage={handleMessage}
                  onUnfriend={handleUnfriend}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Other User Profile Dialog */}
      {viewingUser && (
        <OtherUserProfileDialog
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          nightMode={nightMode}
          onMessage={handleMessage}
        />
      )}
    </div>
  );
};

export default NearbyTab;
