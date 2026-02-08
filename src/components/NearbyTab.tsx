import React, { useState, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp, Trophy, UserPlus, UserX } from 'lucide-react';
import UserCard from './UserCard';
import { UserCardSkeleton } from './SkeletonLoader';
import OtherUserProfileDialog from './OtherUserProfileDialog';
import LeaderboardView from './LeaderboardView';
import MyReferralSection from './MyReferralSection';
import BpResetBanner from './BpResetBanner';
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
  searchUsers,
  getFeedTestimonies,
  getTrendingTestimony,
  getChurchMembers,
  getFriendsOfFriends,
  getPendingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest
} from '../lib/database';

interface User {
  id: string;
  username: string;
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
  activeDiscoverTab: string;
  setActiveDiscoverTab: (tab: string) => void;
  nightMode: boolean;
  onNavigateToMessages?: (user: any) => void;
}

const NearbyTab: React.FC<NearbyTabProps> = ({ sortBy, setSortBy, activeDiscoverTab, setActiveDiscoverTab, nightMode, onNavigateToMessages }) => {
  const { profile } = useUserProfile();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [recommendedUsers, setRecommendedUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [testimonies, setTestimonies] = useState<any[]>([]);
  const [isLoadingTestimonies, setIsLoadingTestimonies] = useState<boolean>(false);
  const [expandedTestimonies, setExpandedTestimonies] = useState<Set<string>>(new Set());
  const [trendingTestimony, setTrendingTestimony] = useState<any>(null);

  // People tab state
  const [churchMembersList, setChurchMembersList] = useState<User[]>([]);
  const [friendsOfFriendsList, setFriendsOfFriendsList] = useState<User[]>([]);
  const [nearbyPeople, setNearbyPeople] = useState<User[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState<boolean>(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showRanks, setShowRanks] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Collapse leaderboard when switching sub-tabs
  useEffect(() => {
    setShowRanks(false);
  }, [activeDiscoverTab]);

  // Load pending friend requests
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!profile?.supabaseId) return;
      try {
        const pending = await getPendingFriendRequests(profile.supabaseId);
        setPendingRequests(pending || []);
      } catch {
        // Silent fail
      }
    };
    loadPendingRequests();
    // Re-check when switching to Friends tab
  }, [profile?.supabaseId, activeDiscoverTab]);

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

        // Load nearby users (if location available) or all users as fallback
        let usersToShow = [];

        if (profile.locationLat && profile.locationLng) {
          const nearby = await findNearbyUsers(
            profile.locationLat,
            profile.locationLng,
            profile.searchRadius || 25,
            profile.supabaseId
          );
          usersToShow = nearby || [];
        }

        // Filter out current user and existing friends
        const friendIds = new Set(friendsList?.map(f => f.id) || []);
        const filteredUsers = usersToShow.filter(u =>
          u.id !== profile.supabaseId && !friendIds.has(u.id)
        );

        // Filter out blocked users and users who blocked current user
        const unblockedUsers = [];
        for (const user of filteredUsers) {
          let blocked = false;
          let blockedBy = false;

          if (profile?.supabaseId) {
            blocked = await isUserBlocked(profile.supabaseId, user.id);
            blockedBy = await isBlockedBy(profile.supabaseId, user.id);
          }

          if (!blocked && !blockedBy) {
            unblockedUsers.push(user);
          }
        }

        // Add mutual friends count and friendship status
        const enrichedUsers = await Promise.all(
          unblockedUsers.map(async (user) => {
            let mutualFriends = [];
            let friendshipStatus = null;

            if (profile?.supabaseId) {
              mutualFriends = await getMutualFriends(profile.supabaseId, user.id);
              friendshipStatus = await checkFriendshipStatus(profile.supabaseId, user.id);
            }

            return {
              ...user,
              username: user.username || '',
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
              distance: (user as any).distance_miles?.toString(),
              mutualFriends: mutualFriends?.length || 0,
              reason: mutualFriends?.length > 0
                ? `${mutualFriends.length} mutual friend${mutualFriends.length > 1 ? 's' : ''}`
                : profile.locationLat && profile.locationLng && (user as any).distance_miles ? 'Nearby' : 'Recommended',
              friendshipStatus // 'pending', 'accepted', null
            };
          })
        );

        setRecommendedUsers(enrichedUsers as User[]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [profile?.supabaseId, profile?.locationLat, profile?.locationLng]);

  // Load testimonies based on active tab (home = church feed, discover = all)
  useEffect(() => {
    const loadTestimonies = async () => {
      if (activeDiscoverTab === 'home') {
        setIsLoadingTestimonies(true);
        try {
          // Home feed: church testimonies + friends' cross-church testimonies
          if (!profile?.supabaseId) {
            setTestimonies([]);
            setTrendingTestimony(null);
            setIsLoadingTestimonies(false);
            return;
          }
          const friendIds = friends.map(f => f.id);
          const churchId = (profile as any)?.churchId || null;

          // Fetch feed + trending in parallel
          const [feed, trending] = await Promise.all([
            getFeedTestimonies(profile.supabaseId, churchId, friendIds, 20, 0),
            getTrendingTestimony(churchId)
          ]);

          setTestimonies(feed || []);
          setTrendingTestimony(trending);
        } catch (error) {
          console.error('Error loading testimonies:', error);
          setTestimonies([]);
        } finally {
          setIsLoadingTestimonies(false);
        }
      }
    };

    loadTestimonies();
  }, [activeDiscoverTab, profile?.supabaseId, friends]);

  // Load People tab data (church members, friends of friends, nearby)
  useEffect(() => {
    const loadPeople = async () => {
      if (activeDiscoverTab !== 'people' || !profile?.supabaseId) return;

      setIsLoadingPeople(true);
      try {
        const friendIds = friends.map(f => f.id);
        const friendIdSet = new Set(friendIds);
        const churchId = (profile as any)?.churchId || null;

        // Fetch all three sections in parallel
        const [churchMembers, fof, nearby] = await Promise.all([
          churchId ? getChurchMembers(churchId) : Promise.resolve([]),
          friendIds.length > 0 ? getFriendsOfFriends(profile.supabaseId, friendIds) : Promise.resolve([]),
          profile.locationLat && profile.locationLng
            ? findNearbyUsers(profile.locationLat, profile.locationLng, profile.searchRadius || 25, profile.supabaseId)
            : Promise.resolve([])
        ]);

        // Filter church members: remove self, existing friends, and blocked users
        const filteredChurchMembers: any[] = [];
        for (const u of (churchMembers || []) as any[]) {
          if (u.id === profile.supabaseId || friendIdSet.has(u.id)) continue;
          let blocked = false;
          let blockedBy = false;
          try {
            blocked = await isUserBlocked(profile.supabaseId, u.id);
            blockedBy = await isBlockedBy(profile.supabaseId, u.id);
          } catch {}
          if (!blocked && !blockedBy) {
            filteredChurchMembers.push({
              ...u,
              displayName: u.display_name,
              avatar: u.avatar_emoji || '👤',
              online: u.is_online || false,
              location: u.location_city || '',
              reason: '⛪ Church member',
            });
          }
        }

        // Filter friends of friends: remove blocked users
        const filteredFof: User[] = [];
        for (const u of (fof || []) as any[]) {
          if (u.id === profile.supabaseId || friendIdSet.has(u.id)) continue;
          let blocked = false;
          let blockedBy = false;
          if (profile?.supabaseId) {
            blocked = await isUserBlocked(profile.supabaseId, u.id);
            blockedBy = await isBlockedBy(profile.supabaseId, u.id);
          }
          if (!blocked && !blockedBy) {
            filteredFof.push({
              ...u,
              displayName: u.display_name,
              avatar: u.avatar_emoji || '👤',
              online: u.is_online || false,
              location: u.location_city || '',
              mutualFriends: u.mutualFriendCount || 0,
              reason: `🤝 ${u.mutualFriendCount || 0} mutual friend${(u.mutualFriendCount || 0) !== 1 ? 's' : ''}`,
            } as User);
          }
        }

        // Filter nearby: remove self, friends, already shown users, and blocked users
        const shownIds = new Set([
          ...filteredChurchMembers.map((u: any) => u.id),
          ...filteredFof.map(u => u.id)
        ]);
        const filteredNearby: any[] = [];
        for (const u of (nearby || []) as any[]) {
          if (u.id === profile.supabaseId || friendIdSet.has(u.id) || shownIds.has(u.id)) continue;
          let blocked = false;
          let blockedBy = false;
          try {
            blocked = await isUserBlocked(profile.supabaseId, u.id);
            blockedBy = await isBlockedBy(profile.supabaseId, u.id);
          } catch {}
          if (!blocked && !blockedBy) {
            filteredNearby.push({
              ...u,
              displayName: u.display_name,
              avatar: u.avatar_emoji || '👤',
              online: u.is_online || u.online || false,
              location: u.location_city || '',
              distance: u.distance_miles?.toString(),
              reason: u.distance_miles ? `📍 ${parseFloat(u.distance_miles).toFixed(1)} mi away` : '📍 Nearby',
            });
          }
        }

        setChurchMembersList(filteredChurchMembers as User[]);
        setFriendsOfFriendsList(filteredFof);
        setNearbyPeople(filteredNearby as User[]);
      } catch (error) {
        console.error('Error loading people:', error);
      } finally {
        setIsLoadingPeople(false);
      }
    };

    loadPeople();
  }, [activeDiscoverTab, profile?.supabaseId, friends]);

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

        // Check friendship status and blocking for each search result
        const enrichedResults = await Promise.all(
          results.map(async (user) => {
            let friendshipStatus = null;
            let blocked = false;
            let blockedBy = false;

            if (profile?.supabaseId) {
              friendshipStatus = await checkFriendshipStatus(profile.supabaseId, user.id);
              blocked = await isUserBlocked(profile.supabaseId, user.id);
              blockedBy = await isBlockedBy(profile.supabaseId, user.id);
            }

            // Skip if blocked
            if (blocked || blockedBy) return null;

            return {
              id: user.id,
              display_name: user.display_name || '',
              displayName: user.display_name || '',
              username: user.username || '',
              avatar_emoji: user.avatar_emoji || '👤',
              avatar: user.avatar_emoji || '👤',
              avatarImage: user.avatar_url,
              is_online: user.is_online || false,
              online: user.is_online || false,
              location_city: user.location_city,
              location: user.location_city,
              friendshipStatus: friendshipStatus,
              mutualFriends: 0
            };
          })
        );

        // Filter out null results (blocked users)
        const filteredResults = enrichedResults.filter(
          (u): u is NonNullable<typeof u> => u !== null
        );
        setSearchResults(filteredResults as User[]);
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

      // Update search results to show pending status
      setSearchResults(prev =>
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
    // Filter users when "Mutual" sort is active - only show users with mutual friends
    let filteredUsers = usersList;
    if (sortBy === 'mutual') {
      filteredUsers = usersList.filter(u => (u.mutualFriends || 0) > 0);
    }

    return [...filteredUsers].sort((a, b) => {
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
              className={`flex-1 bg-transparent border-none outline-none text-sm ${nightMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className={`p-1 rounded-md transition-colors ${nightMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ambassador Card — always visible at top */}
      {profile?.supabaseId && profile?.username && (
        <div>
          <MyReferralSection
            nightMode={nightMode}
            userId={profile.supabaseId}
            username={profile.username}
          />
          {/* Expandable Ranks / Leaderboard */}
          <div className="px-4 mt-2">
            <button
              type="button"
              onClick={() => setShowRanks(!showRanks)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                nightMode
                  ? 'bg-white/[0.04] hover:bg-white/[0.07] text-white/60 border border-white/[0.08]'
                  : 'bg-white/20 hover:bg-white/30 text-black/50 border border-white/30'
              }`}
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <Trophy className="w-4 h-4" />
              {showRanks ? 'Hide Leaderboard' : 'View Leaderboard'}
              {showRanks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRanks && (
              <div className="mt-3 -mx-4">
                <LeaderboardView
                  nightMode={nightMode}
                  currentUserId={profile.supabaseId}
                />
              </div>
            )}
          </div>
        </div>
      )}

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
            onClick={() => setActiveDiscoverTab('home')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeDiscoverTab === 'home' ? nightMode ? 'text-slate-100 border-b-2 border-white' : 'text-black border-b-2 border-black' : nightMode ? 'text-white/50 hover:text-slate-50/70 border-b-2 border-transparent' : 'text-black/50 hover:text-black/70 border-b-2 border-transparent'}`}
            style={{
              background: 'transparent'
            }}
            aria-label="Show home feed"
          >
            Home
          </button>
          <button
            onClick={() => setActiveDiscoverTab('friends')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeDiscoverTab === 'friends' ? nightMode ? 'text-slate-100 border-b-2 border-white' : 'text-black border-b-2 border-black' : nightMode ? 'text-white/50 hover:text-slate-50/70 border-b-2 border-transparent' : 'text-black/50 hover:text-black/70 border-b-2 border-transparent'}`}
            style={{
              background: 'transparent'
            }}
            aria-label="Show friends"
          >
            Friends
          </button>
          <button
            onClick={() => setActiveDiscoverTab('people')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeDiscoverTab === 'people' ? nightMode ? 'text-slate-100 border-b-2 border-white' : 'text-black border-b-2 border-black' : nightMode ? 'text-white/50 hover:text-slate-50/70 border-b-2 border-transparent' : 'text-black/50 hover:text-black/70 border-b-2 border-transparent'}`}
            style={{
              background: 'transparent'
            }}
            aria-label="Discover people"
          >
            People
          </button>
        </div>
      </div>

      {/* BP Reset Winner Announcement — only on home tab */}
      {activeDiscoverTab === 'home' && profile?.supabaseId && (
        <BpResetBanner nightMode={nightMode} userId={profile.supabaseId} />
      )}

      {activeDiscoverTab === 'home' && (
        <div className="px-4 mb-3">
          {(profile as any)?.church ? (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${nightMode ? 'bg-white/[0.04]' : 'bg-blue-50/50'}`}>
              <span>⛪</span>
              <span className={`text-sm font-medium ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {(profile as any).church.name}
              </span>
              <span className={`text-[10px] ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Church Feed
              </span>
            </div>
          ) : (
            <div className={`p-3 rounded-xl text-center text-sm ${nightMode ? 'bg-white/[0.04] text-slate-400' : 'bg-blue-50/50 text-slate-500'}`}>
              Join a church to see testimonies from your community
            </div>
          )}
        </div>
      )}



      <div className="px-4 pb-20" key={activeDiscoverTab}>
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
        ) : activeDiscoverTab === 'friends' ? (
          <div className="space-y-4">
            {/* Pending Friend Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <UserPlus className="w-4 h-4" />
                  Friend Requests ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                  {pendingRequests.map((request: any) => {
                    const sender = request.sender;
                    if (!sender) return null;
                    return (
                      <div
                        key={request.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white/40 border-white/30'}`}
                        style={nightMode ? {} : {
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-lg flex-shrink-0">
                          {sender.avatar_emoji || '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {sender.display_name || sender.username}
                          </p>
                          <p className={`text-xs truncate ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            @{sender.username}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={async () => {
                              setProcessingRequest(request.id);
                              const result = await acceptFriendRequest(request.id);
                              if (result) {
                                setPendingRequests(prev => prev.filter(r => r.id !== request.id));
                                // Refresh friends list
                                if (profile?.supabaseId) {
                                  const updatedFriends = await getFriends(profile.supabaseId);
                                  // @ts-ignore
                                  setFriends(updatedFriends || []);
                                }
                              }
                              setProcessingRequest(null);
                            }}
                            disabled={processingRequest === request.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                              nightMode
                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            Accept
                          </button>
                          <button
                            onClick={async () => {
                              setProcessingRequest(request.id);
                              await declineFriendRequest(request.id);
                              setPendingRequests(prev => prev.filter(r => r.id !== request.id));
                              setProcessingRequest(null);
                            }}
                            disabled={processingRequest === request.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                              nightMode
                                ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Friends List */}
            {sortedFriends.length === 0 && pendingRequests.length === 0 ? (
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
                  Browse the People tab to discover and connect with believers near you!
                </p>
                <div className={`p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                  <p className={`text-xs font-medium ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
                    💡 Tip: Visit the <span className="font-bold">People</span> tab to find believers near you
                  </p>
                </div>
              </div>
            ) : sortedFriends.length > 0 && (
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
            )}
          </div>
        ) : activeDiscoverTab === 'people' ? (
          isLoadingPeople ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <UserCardSkeleton key={i} nightMode={nightMode} />
              ))}
            </div>
          ) : (churchMembersList.length === 0 && friendsOfFriendsList.length === 0 && nearbyPeople.length === 0) ? (
            <div
              className={`rounded-xl border p-10 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <div className="text-6xl mb-4">🌍</div>
              <p className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No people to discover yet</p>
              <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
                Join a church or add friends to discover people in your community!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Church Members Section */}
              {churchMembersList.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-bold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      ⛪ Church Members
                    </h3>
                    {churchMembersList.length > 5 && (
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'church' ? null : 'church')}
                        className={`text-xs font-medium flex items-center gap-1 ${nightMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        {expandedSection === 'church' ? 'Show less' : `See all (${churchMembersList.length})`}
                        {expandedSection === 'church' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(expandedSection === 'church' ? churchMembersList : churchMembersList.slice(0, 5)).map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        showReason={true}
                        isFriend={false}
                        nightMode={nightMode}
                        onViewProfile={handleViewProfile}
                        onMessage={handleMessage}
                        onAddFriend={handleAddFriend}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Friends of Friends Section */}
              {friendsOfFriendsList.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-bold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      🤝 Friends of Friends
                    </h3>
                    {friendsOfFriendsList.length > 5 && (
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'fof' ? null : 'fof')}
                        className={`text-xs font-medium flex items-center gap-1 ${nightMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        {expandedSection === 'fof' ? 'Show less' : `See all (${friendsOfFriendsList.length})`}
                        {expandedSection === 'fof' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(expandedSection === 'fof' ? friendsOfFriendsList : friendsOfFriendsList.slice(0, 5)).map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        showReason={true}
                        isFriend={false}
                        nightMode={nightMode}
                        onViewProfile={handleViewProfile}
                        onMessage={handleMessage}
                        onAddFriend={handleAddFriend}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby Section */}
              {nearbyPeople.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-bold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      📍 Nearby
                    </h3>
                    {nearbyPeople.length > 5 && (
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'nearby' ? null : 'nearby')}
                        className={`text-xs font-medium flex items-center gap-1 ${nightMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        {expandedSection === 'nearby' ? 'Show less' : `See all (${nearbyPeople.length})`}
                        {expandedSection === 'nearby' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(expandedSection === 'nearby' ? nearbyPeople : nearbyPeople.slice(0, 5)).map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        showReason={true}
                        isFriend={false}
                        nightMode={nightMode}
                        onViewProfile={handleViewProfile}
                        onMessage={handleMessage}
                        onAddFriend={handleAddFriend}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : activeDiscoverTab === 'home' ? (
          isLoadingTestimonies ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
                >
                  <div className="animate-pulse">
                    <div className={`h-4 ${nightMode ? 'bg-white/10' : 'bg-slate-200'} rounded w-3/4 mb-2`}></div>
                    <div className={`h-3 ${nightMode ? 'bg-white/10' : 'bg-slate-200'} rounded w-1/2 mb-4`}></div>
                    <div className={`h-3 ${nightMode ? 'bg-white/10' : 'bg-slate-200'} rounded w-full mb-2`}></div>
                    <div className={`h-3 ${nightMode ? 'bg-white/10' : 'bg-slate-200'} rounded w-5/6`}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : testimonies.length === 0 ? (
            <div
              className={`rounded-xl border p-10 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              }}
            >
              <div className="text-6xl mb-4">📖</div>
              <p className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No testimonies yet</p>
              <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
                Be the first to share your testimony and inspire others!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Trending testimony card */}
              {activeDiscoverTab === 'home' && trendingTestimony && (
                <div
                  className={`rounded-xl border p-4 relative overflow-hidden ${nightMode ? 'border-amber-500/30' : 'border-amber-300/60 shadow-[0_4px_20px_rgba(245,158,11,0.15)]'}`}
                  style={{
                    background: nightMode
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(255, 255, 255, 0.05))'
                      : 'linear-gradient(135deg, rgba(255, 237, 213, 0.6), rgba(255, 255, 255, 0.3))',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                  }}
                >
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${nightMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                    🔥 Trending in your church
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      onClick={() => trendingTestimony.users?.id && handleViewProfile({
                        id: trendingTestimony.users.id,
                        username: trendingTestimony.users.username,
                        display_name: trendingTestimony.users.display_name,
                        displayName: trendingTestimony.users.display_name,
                        avatar_emoji: trendingTestimony.users.avatar_emoji,
                        avatar: trendingTestimony.users.avatar_emoji,
                        is_online: false,
                        online: false,
                      } as any)}
                      className="text-2xl hover:scale-110 transition-transform cursor-pointer"
                    >
                      {trendingTestimony.users?.avatar_emoji || '👤'}
                    </button>
                    <div className="flex-1">
                      <button
                        onClick={() => trendingTestimony.users?.id && handleViewProfile({
                          id: trendingTestimony.users.id,
                          username: trendingTestimony.users.username,
                          display_name: trendingTestimony.users.display_name,
                          displayName: trendingTestimony.users.display_name,
                          avatar_emoji: trendingTestimony.users.avatar_emoji,
                          avatar: trendingTestimony.users.avatar_emoji,
                          is_online: false,
                          online: false,
                        } as any)}
                        className={`font-semibold cursor-pointer text-left transition-colors ${nightMode ? 'text-slate-100 hover:text-blue-400' : 'text-black hover:text-blue-600'}`}
                      >
                        {trendingTestimony.users?.display_name || trendingTestimony.users?.username || 'Anonymous'}
                      </button>
                      <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        @{trendingTestimony.users?.username || 'user'}
                      </p>
                    </div>
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                    {trendingTestimony.title || 'My Testimony'}
                  </h3>
                  <p className={`text-sm leading-relaxed mb-3 ${nightMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {expandedTestimonies.has(trendingTestimony.id)
                      ? trendingTestimony.content
                      : trendingTestimony.content?.substring(0, 300)}
                    {!expandedTestimonies.has(trendingTestimony.id) && trendingTestimony.content?.length > 300 && '...'}
                  </p>
                  {trendingTestimony.content?.length > 300 && (
                    <button
                      onClick={() => setExpandedTestimonies(prev => {
                        const next = new Set(prev);
                        if (next.has(trendingTestimony.id)) {
                          next.delete(trendingTestimony.id);
                        } else {
                          next.add(trendingTestimony.id);
                        }
                        return next;
                      })}
                      className={`text-xs font-medium mb-3 ${nightMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                    >
                      {expandedTestimonies.has(trendingTestimony.id) ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                  <div className="flex items-center gap-4 text-xs">
                    <span className={nightMode ? 'text-amber-400' : 'text-amber-600'}>
                      ❤️ {trendingTestimony.like_count || 0}
                    </span>
                    <span className={nightMode ? 'text-slate-400' : 'text-slate-600'}>
                      👁️ {trendingTestimony.view_count || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Regular testimony feed — filter out trending to avoid duplication */}
              {testimonies.filter((t: any) => !trendingTestimony || t.id !== trendingTestimony.id).map((testimony: any) => {
                const user = testimony.users || {};
                return (
                  <div
                    key={testimony.id}
                    className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
                    style={nightMode ? {} : {
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(30px)',
                      WebkitBackdropFilter: 'blur(30px)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <button
                        onClick={() => user.id && handleViewProfile({
                          id: user.id,
                          username: user.username,
                          display_name: user.display_name,
                          displayName: user.display_name,
                          avatar_emoji: user.avatar_emoji,
                          avatar: user.avatar_emoji,
                          is_online: user.is_online ?? false,
                          online: user.is_online,
                          location_city: user.location_city,
                          location: user.location_city,
                        } as any)}
                        className="text-2xl hover:scale-110 transition-transform cursor-pointer"
                      >
                        {user.avatar_emoji || '👤'}
                      </button>
                      <div className="flex-1">
                        <button
                          onClick={() => user.id && handleViewProfile({
                            id: user.id,
                            username: user.username,
                            display_name: user.display_name,
                            displayName: user.display_name,
                            avatar_emoji: user.avatar_emoji,
                            avatar: user.avatar_emoji,
                            is_online: user.is_online ?? false,
                            online: user.is_online,
                            location_city: user.location_city,
                            location: user.location_city,
                          } as any)}
                          className={`font-semibold cursor-pointer text-left transition-colors ${nightMode ? 'text-slate-100 hover:text-blue-400' : 'text-black hover:text-blue-600'}`}
                        >
                          {user.display_name || user.username || 'Anonymous'}
                        </button>
                        <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          @{user.username || 'user'}
                        </p>
                      </div>
                    </div>
                    <h3 className={`font-bold text-lg mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                      {testimony.title || 'My Testimony'}
                    </h3>
                    <p className={`text-sm leading-relaxed mb-3 ${nightMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {expandedTestimonies.has(testimony.id)
                        ? testimony.content
                        : testimony.content?.substring(0, 300)}
                      {!expandedTestimonies.has(testimony.id) && testimony.content?.length > 300 && '...'}
                    </p>
                    {testimony.content?.length > 300 && (
                      <button
                        onClick={() => setExpandedTestimonies(prev => {
                          const next = new Set(prev);
                          if (next.has(testimony.id)) {
                            next.delete(testimony.id);
                          } else {
                            next.add(testimony.id);
                          }
                          return next;
                        })}
                        className={`text-xs font-medium mb-3 ${nightMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                      >
                        {expandedTestimonies.has(testimony.id) ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                    {testimony.lesson && (
                      <div className={`p-3 rounded-lg mb-3 ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                        <p className={`text-xs font-semibold mb-1 ${nightMode ? 'text-slate-300' : 'text-blue-900'}`}>
                          💡 Key Lesson:
                        </p>
                        <p className={`text-xs ${nightMode ? 'text-slate-200' : 'text-blue-800'}`}>
                          {testimony.lesson}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <span className={nightMode ? 'text-slate-400' : 'text-slate-600'}>
                        ❤️ {testimony.like_count || 0}
                      </span>
                      <span className={nightMode ? 'text-slate-400' : 'text-slate-600'}>
                        👁️ {testimony.view_count || 0}
                      </span>
                      <button
                        onClick={() => user.id && handleViewProfile({
                          id: user.id,
                          username: user.username,
                          display_name: user.display_name,
                          displayName: user.display_name,
                          avatar_emoji: user.avatar_emoji,
                          avatar: user.avatar_emoji,
                          is_online: user.is_online ?? false,
                          online: user.is_online,
                          location_city: user.location_city,
                          location: user.location_city,
                        } as any)}
                        className={`font-semibold ${nightMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : null}
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
