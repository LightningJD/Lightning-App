import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import UserCard from './UserCard';
import { UserCardSkeleton } from './SkeletonLoader';
import OtherUserProfileDialog from './OtherUserProfileDialog';
import { useUserProfile } from './useUserProfile';
import {
  getFriends,
  findNearbyUsers,
  sendFriendRequest,
  unfriend,
  checkFriendshipStatus,
  getMutualFriends,
  isUserBlocked,
  isBlockedBy,
  searchUsers
} from '../lib/database';

interface User {
  id: string;
  display_name: string;
  displayName?: string;
  avatar_url?: string;
  avatarImage?: string;
  avatar_emoji: string;
  avatar?: string;
  is_online: boolean;
  online?: boolean;
  location_city?: string;
  location?: string;
  mutualFriends?: number;
  reason?: string;
  friendshipStatus?: string | null;
  distance?: string;
}

interface NearbyTabProps {
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  activeConnectTab: string;
  setActiveConnectTab: (tab: string) => void;
  nightMode: boolean;
  onNavigateToMessages?: (user: any) => void;
}

const NearbyTab: React.FC<NearbyTabProps> = ({ sortBy, setSortBy, activeConnectTab, setActiveConnectTab, nightMode, onNavigateToMessages }) => {
  const { profile } = useUserProfile();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [recommendedUsers, setRecommendedUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

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
        // @ts-ignore - friends type compatibility
        setFriends(friendsList || []);

        // Load nearby users (if location available)
        // @ts-ignore - location type from profile
        if (profile.location?.lat && profile.location?.lng) {
          // @ts-ignore - location type from profile
          const nearby = await findNearbyUsers(
            profile.location.lat,
            profile.location.lng,
            profile.searchRadius || 25,
            profile.supabaseId
          );

          // Filter out current user and existing friends
          const friendIds = new Set(friendsList?.map(f => f.id) || []);
          const filteredUsers = nearby?.filter(u =>
            u.id !== profile.supabaseId && !friendIds.has(u.id)
          ) || [];

          // Filter out blocked users and users who blocked current user
          const unblockedUsers = [];
          for (const user of filteredUsers) {
            const blocked = await isUserBlocked(profile.supabaseId, user.id);
            const blockedBy = await isBlockedBy(profile.supabaseId, user.id);
            if (!blocked && !blockedBy) {
              unblockedUsers.push(user);
            }
          }

          // Add mutual friends count and friendship status
          const enrichedUsers = await Promise.all(
            unblockedUsers.map(async (user) => {
              const mutualFriends = await getMutualFriends(profile.supabaseId, user.id);
              const friendshipStatus = await checkFriendshipStatus(profile.supabaseId, user.id);

              return {
                ...user,
                displayName: user.display_name,
                avatarImage: user.avatar_url,
                // @ts-ignore - user type compatibility
                avatar: user.avatar_emoji || '👤',
                // @ts-ignore - user type compatibility
                avatar_emoji: user.avatar_emoji || '👤',
                // @ts-ignore - user type compatibility
                online: user.online || false,
                // @ts-ignore - user type compatibility
                is_online: user.online || false,
                location: user.location_city || 'Unknown',
                mutualFriends: mutualFriends?.length || 0,
                reason: mutualFriends?.length > 0
                  ? `${mutualFriends.length} mutual friend${mutualFriends.length > 1 ? 's' : ''}`
                  : 'Nearby',
                friendshipStatus // 'pending', 'accepted', null
              };
            })
          );

          setRecommendedUsers(enrichedUsers as User[]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [profile?.supabaseId, profile?.location?.lat, profile?.location?.lng]);

  // Search handler with debouncing
  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const results = await searchUsers(searchQuery, profile?.supabaseId || null);

        // Filter out blocked users
        const unblockedResults = [];
        for (const user of results) {
          const blocked = await isUserBlocked(profile?.supabaseId || '', user.id);
          const blockedBy = await isBlockedBy(profile?.supabaseId || '', user.id);
          if (!blocked && !blockedBy) {
            unblockedResults.push(user);
          }
        }

        // Add friendship status
        const enrichedResults = await Promise.all(
          unblockedResults.map(async (user) => {
            const friendshipStatus = await checkFriendshipStatus(profile?.supabaseId || '', user.id);
            const mutualFriendsList = await getMutualFriends(profile?.supabaseId || '', user.id);

            return {
              id: user.id,
              display_name: user.display_name || '',
              displayName: user.display_name || '',
              avatar_emoji: user.avatar_emoji || '👤',
              avatar: user.avatar_emoji || '👤',
              is_online: user.is_online || false,
              online: user.is_online || false,
              location_city: user.location_city,
              location: user.location_city,
              friendshipStatus,
              mutualFriends: mutualFriendsList?.length || 0
            } as User;
          })
        );

        setSearchResults(enrichedResults);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchQuery, profile?.supabaseId]);

  const handleClearSearch = (): void => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleViewProfile = (user: User): void => {
    setViewingUser(user);
  };

  const handleMessage = (user: User): void => {
    // Navigate to messages tab
    if (onNavigateToMessages) {
      onNavigateToMessages(user);
    }
  };

  const handleAddFriend = async (userId: string): Promise<void> => {
    if (!profile?.supabaseId) return;

    try {
      await sendFriendRequest(profile.supabaseId, userId);

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

  const handleUnfriend = async (friendId: string): Promise<void> => {
    if (!profile?.supabaseId) return;

    try {
      await unfriend(profile.supabaseId, friendId);
      // Reload data
      const friendsList = await getFriends(profile.supabaseId);
      // @ts-ignore - friends type compatibility
      setFriends(friendsList || []);
    } catch (error) {
      console.error('Error unfriending user:', error);
    }
  };

  const getSortedUsers = (usersList: User[]): User[] => {
    return [...usersList].sort((a, b) => {
      if (sortBy === 'online') {
        return (b.online ? 1 : 0) - (a.online ? 1 : 0);
      } else if (sortBy === 'mutual') {
        return (b.mutualFriends || 0) - (a.mutualFriends || 0);
      } else if (sortBy === 'nearby') {
        return parseFloat(a.distance || '0') - parseFloat(b.distance || '0');
      }
      return 0;
    });
  };

  const sortWithOnlineFirst = (usersList: User[]): User[] => {
    const sorted = getSortedUsers(usersList);
    const online = sorted.filter(u => u.online);
    const offline = sorted.filter(u => !u.online);
    return [...online, ...offline];
  };

  const sortedRecommended = sortWithOnlineFirst(recommendedUsers);
  const sortedFriends = sortWithOnlineFirst(friends);

  return (
    <div className="py-4 space-y-6">
      {/* Search Bar */}
      <div className="px-4">
        <div
          className={`relative rounded-lg border ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          } : {
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <div className="flex items-center gap-2 px-4 py-3">
            <Search className={`w-5 h-5 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or username..."
              className={`flex-1 bg-transparent border-none outline-none text-sm ${
                nightMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className={`p-1 rounded-md transition-colors ${
                  nightMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

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
        {searchQuery ? (
          // Show search results
          isSearching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <UserCardSkeleton key={i} nightMode={nightMode} />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div
              className={`rounded-xl border p-10 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <p className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                No users found for "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onViewProfile={handleViewProfile}
                  onMessage={handleMessage}
                  onAddFriend={handleAddFriend}
                  showReason={false}
                  isFriend={user.friendshipStatus === 'accepted'}
                  nightMode={nightMode}
                />
              ))}
            </div>
          )
        ) : isLoading ? (
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
                  showReason={true}
                  isFriend={false}
                  nightMode={nightMode}
                  onViewProfile={handleViewProfile}
                  onMessage={handleMessage}
                  onAddFriend={handleAddFriend}
                  onUnfriend={handleUnfriend}
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
                  showReason={false}
                  isFriend={true}
                  nightMode={nightMode}
                  onViewProfile={handleViewProfile}
                  onMessage={handleMessage}
                  onAddFriend={handleAddFriend}
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
          user={viewingUser as any}
          onClose={() => setViewingUser(null)}
          nightMode={nightMode}
          onMessage={handleMessage as any}
        />
      )}
    </div>
  );
};

export default NearbyTab;
