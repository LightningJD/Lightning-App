import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import UserCard from "./UserCard";
import { UserCardSkeleton } from "./SkeletonLoader";
import OtherUserProfileDialog from "./OtherUserProfileDialog";
import { useUserProfile } from "./useUserProfile";
import {
  getFriends,
  sendFriendRequest,
  checkFriendshipStatus,
  isUserBlocked,
  isBlockedBy,
  searchUsers,
  getFeedTestimonies,
  getTrendingTestimony,
} from "../lib/database";

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

// Generate a deterministic gradient from a string (name or id)
const getAvatarGradient = (str: string): string => {
  const gradients = [
    "linear-gradient(135deg, #5cc88a, #2a9d5c)",
    "linear-gradient(135deg, #e8b84a, #e05c6c)",
    "linear-gradient(135deg, #7b76e0, #9b96f5)",
    "linear-gradient(135deg, #4facfe, #9b96f5)",
    "linear-gradient(135deg, #f093fb, #f5576c)",
    "linear-gradient(135deg, #4facfe, #00f2fe)",
    "linear-gradient(135deg, #43e97b, #38f9d7)",
    "linear-gradient(135deg, #fa709a, #fee140)",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const NearbyTab: React.FC<NearbyTabProps> = ({
  nightMode,
  onNavigateToMessages,
}) => {
  const { profile } = useUserProfile();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [testimonies, setTestimonies] = useState<any[]>([]);
  const [isLoadingTestimonies, setIsLoadingTestimonies] =
    useState<boolean>(false);
  const [expandedTestimonies, setExpandedTestimonies] = useState<Set<string>>(
    new Set(),
  );
  const [trendingTestimony, setTrendingTestimony] = useState<any>(null);

  // Load friends (needed for testimony feed query)
  useEffect(() => {
    const loadFriends = async () => {
      if (!profile?.supabaseId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const friendsList = await getFriends(profile.supabaseId);
        // @ts-ignore - friends type compatibility
        setFriends(friendsList || []);
      } catch (error) {
        console.error("Error loading friends:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFriends();
  }, [profile?.supabaseId]);

  // Load testimonies (always — no sub-tab gating)
  useEffect(() => {
    const loadTestimonies = async () => {
      setIsLoadingTestimonies(true);
      try {
        if (!profile?.supabaseId) {
          setTestimonies([]);
          setTrendingTestimony(null);
          setIsLoadingTestimonies(false);
          return;
        }
        const friendIds = friends.map((f) => f.id);
        const churchId = (profile as any)?.churchId || null;

        const [feed, trending] = await Promise.all([
          getFeedTestimonies(profile.supabaseId, churchId, friendIds, 20, 0),
          getTrendingTestimony(churchId),
        ]);

        setTestimonies(feed || []);
        setTrendingTestimony(trending);
      } catch (error) {
        console.error("Error loading testimonies:", error);
        setTestimonies([]);
      } finally {
        setIsLoadingTestimonies(false);
      }
    };
    loadTestimonies();
  }, [profile?.supabaseId, friends]);

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
        const results = await searchUsers(
          searchQuery,
          profile?.supabaseId || null,
        );

        const enrichedResults = await Promise.all(
          results.map(async (user) => {
            let friendshipStatus = null;
            let blocked = false;
            let blockedBy = false;

            if (profile?.supabaseId) {
              friendshipStatus = await checkFriendshipStatus(
                profile.supabaseId,
                user.id,
              );
              blocked = await isUserBlocked(profile.supabaseId, user.id);
              blockedBy = await isBlockedBy(profile.supabaseId, user.id);
            }

            if (blocked || blockedBy) return null;

            return {
              id: user.id,
              display_name: user.display_name || "",
              displayName: user.display_name || "",
              username: user.username || "",
              avatar_emoji: user.avatar_emoji || "👤",
              avatar: user.avatar_emoji || "👤",
              avatarImage: user.avatar_url,
              is_online: user.is_online || false,
              online: user.is_online || false,
              location_city: user.location_city,
              location: user.location_city,
              friendshipStatus: friendshipStatus,
              mutualFriends: 0,
            };
          }),
        );

        const filteredResults = enrichedResults.filter(
          (u): u is NonNullable<typeof u> => u !== null,
        );
        setSearchResults(filteredResults as User[]);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, profile?.supabaseId]);

  const handleClearSearch = (): void => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleViewProfile = (user: User): void => {
    setViewingUser(user);
  };

  const handleMessage = (user: User): void => {
    if (onNavigateToMessages) {
      onNavigateToMessages(user);
    }
  };

  const handleAddFriend = async (userId: string): Promise<void> => {
    if (!profile?.supabaseId) return;
    try {
      await sendFriendRequest(profile.supabaseId, userId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, friendshipStatus: "pending" } : u,
        ),
      );
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const displayName =
    (profile as any)?.displayName ||
    (profile as any)?.display_name ||
    (profile as any)?.username ||
    "";
  const firstName = displayName.split(" ")[0];
  const churchName = (profile as any)?.church?.name || null;

  // Render a testimony card with design tokens
  const renderTestimonyCard = (testimony: any, isTrending = false) => {
    const user = testimony.users || {};
    const initial = (user.display_name || user.username || "?").charAt(0).toUpperCase();
    const gradient = getAvatarGradient(user.id || user.username || "");
    const isExpanded = expandedTestimonies.has(testimony.id);

    return (
      <div
        key={testimony.id}
        className="p-3"
        style={{
          borderRadius: '8px',
          marginBottom: '5px',
          background: nightMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.45)",
          border: `1px solid ${nightMode ? "rgba(255,255,255,0.04)" : "rgba(150,165,225,0.12)"}`,
          ...(nightMode ? {} : { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }),
        }}
      >
        {/* Trending badge */}
        {isTrending && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-3"
            style={{
              background: nightMode ? "rgba(232,184,74,0.12)" : "rgba(232,184,74,0.15)",
              color: nightMode ? "#e8b84a" : "#b47a10",
            }}
          >
            🔥 Trending in your church
          </div>
        )}

        {/* User row */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <button
            onClick={() =>
              user.id &&
              handleViewProfile({
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
              } as any)
            }
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
            style={{ background: gradient, fontFamily: "'Playfair Display', serif" }}
          >
            {initial}
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() =>
                user.id &&
                handleViewProfile({
                  id: user.id,
                  username: user.username,
                  display_name: user.display_name,
                  displayName: user.display_name,
                  avatar_emoji: user.avatar_emoji,
                  avatar: user.avatar_emoji,
                  is_online: user.is_online ?? false,
                  online: user.is_online,
                } as any)
              }
              className="text-sm font-semibold cursor-pointer text-left truncate block"
              style={{ color: nightMode ? "#e8e5f2" : "#1e2b4a" }}
            >
              {user.display_name || user.username || "Anonymous"}
            </button>
            <p className="text-[11px] truncate" style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}>
              {testimony.created_at
                ? new Date(testimony.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "Recently"}
            </p>
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-medium mb-1.5 leading-snug"
          style={{ fontFamily: "'Playfair Display', serif", color: nightMode ? "#e8e5f2" : "#1e2b4a" }}
        >
          {testimony.title || "My Testimony"}
        </h3>

        {/* Pull quote — always a short excerpt */}
        {testimony.content && (
          <div
            className="px-2 py-1.5 my-1.5"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "13px",
              fontStyle: "italic",
              lineHeight: "1.4",
              borderRadius: '5px',
              color: nightMode ? "#9b96f5" : "#4a5e88",
              background: nightMode ? "rgba(123,118,224,0.05)" : "rgba(79,172,254,0.05)",
              borderLeft: `2px solid ${nightMode ? "#7b76e0" : "#4facfe"}`,
            }}
          >
            "{testimony.content.length > 120
              ? testimony.content.substring(0, 120) + "..."
              : testimony.content}"
          </div>
        )}

        {/* Body preview — always visible, 2-line clamp */}
        {testimony.content && (
          <p
            className="text-xs leading-relaxed mb-1.5"
            style={{
              color: nightMode ? "#8e89a8" : "#4a5e88",
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
              lineHeight: '1.4',
            }}
          >
            {testimony.content}
          </p>
        )}

        {/* Category tag */}
        {testimony.category && (
          <div
            className="inline-block text-[10px] font-semibold mb-1"
            style={{
              padding: '1px 5px',
              borderRadius: '3px',
              background: nightMode ? "rgba(123,118,224,0.1)" : "rgba(79,172,254,0.1)",
              color: nightMode ? "#9b96f5" : "#2b6cb0",
            }}
          >
            {testimony.category}
          </div>
        )}

        {/* Actions row */}
        <div
          className="flex items-center text-[11px]"
          style={{ gap: '6px', color: nightMode ? "#5d5877" : "#8e9ec0" }}
        >
          <span>♡ {testimony.like_count || 0}</span>
          <span>·</span>
          <span>💬 {testimony.comment_count || 0}</span>
          <span>·</span>
          <button
            onClick={() =>
              user.id &&
              handleViewProfile({
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                displayName: user.display_name,
                avatar_emoji: user.avatar_emoji,
                avatar: user.avatar_emoji,
                is_online: user.is_online ?? false,
                online: user.is_online,
              } as any)
            }
            className="transition-colors"
            style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}
          >
            ↗ Share
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20">
      {/* Greeting */}
      <div className="px-4 pt-3 pb-1">
        <h1
          className="text-lg font-medium italic"
          style={{ fontFamily: "'Playfair Display', serif", color: nightMode ? "#e8e5f2" : "#1e2b4a" }}
        >
          {getTimeGreeting()}{firstName ? `, ${firstName}` : ""} ✨
        </h1>
        <p
          className="text-xs mt-0.5"
          style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}
        >
          See what God is doing in people's lives
        </p>
      </div>

      {/* Search Bar — glass pill */}
      <div className="px-4 mt-3">
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
          style={{
            background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
            border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
            ...(nightMode
              ? { backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }
              : { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 2px 10px rgba(150,165,225,0.07)" }),
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search testimonies, people..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{
              color: nightMode ? "#e8e5f2" : "#1e2b4a",
              fontFamily: "'General Sans', system-ui, sans-serif",
            }}
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="p-0.5 rounded-md transition-colors"
              style={{ color: nightMode ? "#5d5877" : "#8e9ec0" }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Church context bar */}
      {churchName && !searchQuery && (
        <div className="px-4 mt-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: nightMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)",
              border: nightMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(150,165,225,0.12)",
              color: nightMode ? "#8e89a8" : "#4a5e88",
              ...(nightMode ? {} : { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }),
            }}
          >
            <span>⛪</span>
            <span className="font-medium" style={{ color: nightMode ? "#e8e5f2" : "#1e2b4a" }}>
              {churchName}
            </span>
            <span>·</span>
            <span>{testimonies.length} {testimonies.length === 1 ? "testimony" : "testimonies"}</span>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="px-4 mt-3 space-y-3">
        {searchQuery ? (
          // Search results
          isSearching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <UserCardSkeleton key={i} nightMode={nightMode} />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div
              className="rounded-xl p-10 text-center"
              style={{
                background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
                border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
              }}
            >
              <p className="text-sm" style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}>
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
                  isFriend={user.friendshipStatus === "accepted"}
                  nightMode={nightMode}
                />
              ))}
            </div>
          )
        ) : isLoading || isLoadingTestimonies ? (
          // Loading skeletons for testimony cards
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{
                  background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                }}
              >
                <div className="animate-pulse">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-7 h-7 rounded-full"
                      style={{ background: nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)" }}
                    />
                    <div className="flex-1">
                      <div
                        className="h-3 rounded w-24 mb-1"
                        style={{ background: nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)" }}
                      />
                      <div
                        className="h-2 rounded w-16"
                        style={{ background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(150,165,225,0.1)" }}
                      />
                    </div>
                  </div>
                  <div
                    className="h-4 rounded w-3/4 mb-2"
                    style={{ background: nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)" }}
                  />
                  <div
                    className="h-12 rounded w-full mb-2"
                    style={{ background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(150,165,225,0.1)" }}
                  />
                  <div
                    className="h-3 rounded w-5/6"
                    style={{ background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(150,165,225,0.1)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : testimonies.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{
              background: nightMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
              border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
            }}
          >
            <div className="text-4xl mb-3">📖</div>
            <p
              className="font-semibold text-base mb-1"
              style={{ fontFamily: "'Playfair Display', serif", color: nightMode ? "#e8e5f2" : "#1e2b4a" }}
            >
              No testimonies yet
            </p>
            <p className="text-sm" style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}>
              Be the first to share your testimony and inspire others!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Trending testimony */}
            {trendingTestimony && renderTestimonyCard(trendingTestimony, true)}

            {/* Regular feed — filter out trending to avoid duplication */}
            {testimonies
              .filter(
                (t: any) =>
                  !trendingTestimony || t.id !== trendingTestimony.id,
              )
              .map((testimony: any) => renderTestimonyCard(testimony))}
          </div>
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
