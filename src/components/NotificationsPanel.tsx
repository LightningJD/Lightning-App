import React, { useState, useEffect } from "react";
import { X, UserPlus, MessageSquare, Users, Bell } from "lucide-react";
import { useUserProfile } from "./useUserProfile";
import {
  getPendingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
  unsubscribe,
} from "../lib/database";
import type { AppNotification } from "../lib/database";

interface FriendRequest {
  id: string;
  sender_id: string;
  sender?: {
    display_name?: string;
    username?: string;
    avatar_emoji?: string;
    avatar_url?: string;
    location_city?: string;
  };
  mutual_friends?: number;
  created_at?: string;
}

// Generate a deterministic gradient from a string
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

type FilterType = "all" | "testimonies" | "friends" | "church";

interface NotificationsPanelProps {
  nightMode: boolean;
  onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  nightMode,
  onClose,
}) => {
  const { profile } = useUserProfile();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(
    null,
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load pending friend requests AND notification feed in parallel.
  // Previously only friend requests were fetched; the "Recent" section was
  // a placeholder, which caused BUG-F (notifications in DB never rendered).
  useEffect(() => {
    const loadAll = async () => {
      if (!profile?.supabaseId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [requests, notifs] = await Promise.all([
          getPendingFriendRequests(profile.supabaseId),
          getUserNotifications(profile.supabaseId, 50),
        ]);
        setPendingRequests((requests as any[]) || []);
        setNotifications(notifs || []);
      } catch (error) {
        console.error("Error loading notifications panel data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAll();
  }, [profile?.supabaseId]);

  // Realtime: push new notifications into the list as they arrive.
  // Filtered on user_id server-side, so only this user's rows stream in.
  useEffect(() => {
    if (!profile?.supabaseId) return;

    const channel = subscribeToNotifications(
      profile.supabaseId,
      (notif) => {
        setNotifications((prev) => {
          // Dedup in case the realtime row arrives before/after an optimistic
          // insert or a refetch — keep newest first.
          if (prev.some((n) => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });
      },
    );

    return () => {
      if (channel) {
        // Fire-and-forget cleanup — unsubscribe returns a Promise.
        unsubscribe(channel).catch(() => undefined);
      }
    };
  }, [profile?.supabaseId]);

  const handleAccept = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await acceptFriendRequest(requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Error accepting friend request:", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await declineFriendRequest(requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Error declining friend request:", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    // Optimistic: mark read immediately in UI, reconcile with server next.
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
      markNotificationRead(notif.id).catch((err) => {
        console.error("Failed to mark notification as read:", err);
      });
    }
    // Link-following is handled by the surrounding app shell; if we ever
    // want to navigate here, we'd route on notif.link. Leaving that to the
    // caller avoids coupling this panel to a router instance.
  };

  const handleMarkAllRead = async () => {
    if (!profile?.supabaseId) return;
    const hasUnread = notifications.some((n) => !n.is_read);
    if (!hasUnread) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const ok = await markAllNotificationsRead(profile.supabaseId);
    if (!ok) {
      // On failure, refetch to get authoritative state rather than leaving
      // the UI lying to the user.
      const fresh = await getUserNotifications(profile.supabaseId, 50);
      setNotifications(fresh || []);
    }
  };

  // Map notification.type → icon + accent. Unknown types fall back to a
  // neutral bell so new notification types still render safely.
  const iconForType = (type: string) => {
    switch (type) {
      case "friend_request":
      case "friend_accepted":
        return UserPlus;
      case "message":
        return MessageSquare;
      case "group_invite":
        return Users;
      default:
        return Bell;
    }
  };

  // Filter notifications by the active pill. "all" shows everything;
  // "friends" narrows to friend_* types; "testimonies"/"church" reserved
  // for future notification categories.
  const visibleNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "friends")
      return n.type === "friend_accepted" || n.type === "friend_request";
    if (activeFilter === "testimonies")
      return n.type.startsWith("testimony_");
    if (activeFilter === "church")
      return n.type.startsWith("church_") || n.type === "group_invite";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Relative timestamp formatter — keeps rows compact and readable.
  const formatRelativeTime = (iso: string): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diffMs = Date.now() - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "testimonies", label: "Testimonies" },
    { key: "friends", label: "Friends" },
    { key: "church", label: "Church" },
  ];

  // Show friend requests section when filter is "all" or "friends"
  const showFriendRequests =
    (activeFilter === "all" || activeFilter === "friends") &&
    pendingRequests.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
        aria-label="Close notifications"
      />

      {/* Panel — slides in from right */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden"
        style={{
          background: nightMode
            ? "#0d0b18"
            : "linear-gradient(135deg, #cdd8f8 0%, #d6daf5 40%, #dee0f6 70%, #e4e0f5 100%)",
          borderLeft: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
          animation: "slideInRight 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0"
          style={{
            borderBottom: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
          }}
        >
          <h2
            className="text-base font-medium"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: nightMode ? "#e8e5f2" : "#1e2b4a",
            }}
          >
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                style={{
                  background: nightMode
                    ? "rgba(123,118,224,0.12)"
                    : "rgba(79,172,254,0.1)",
                  border: `1px solid ${nightMode ? "rgba(123,118,224,0.2)" : "rgba(79,172,254,0.18)"}`,
                  color: nightMode ? "#9b96f5" : "#2b6cb0",
                }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
              style={{
                background: nightMode
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.5)",
                border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                color: nightMode ? "#8e89a8" : "#4a5e88",
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto flex-shrink-0">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
              style={
                activeFilter === f.key
                  ? {
                      background: nightMode
                        ? "rgba(123,118,224,0.12)"
                        : "rgba(79,172,254,0.1)",
                      border: `1px solid ${nightMode ? "rgba(123,118,224,0.18)" : "rgba(79,172,254,0.15)"}`,
                      color: nightMode ? "#e8e5f2" : "#1e2b4a",
                    }
                  : {
                      background: nightMode
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.5)",
                      border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                      color: nightMode ? "#8e89a8" : "#4a5e88",
                      ...(nightMode
                        ? {}
                        : {
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                          }),
                    }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Friend Requests Section */}
          {showFriendRequests && (
            <div className="mb-3">
              <div
                className="text-[10px] uppercase tracking-widest font-semibold py-2"
                style={{ color: nightMode ? "#5d5877" : "#4a5e88" }}
              >
                Friend Requests
              </div>
              <div className="space-y-2">
                {pendingRequests.map((req) => {
                  const sender = req.sender || ({} as any);
                  const name =
                    sender.display_name || sender.username || "Someone";
                  const initial = name.charAt(0).toUpperCase();
                  const gradient = getAvatarGradient(
                    req.sender_id || name,
                  );
                  const isProcessing = processingRequest === req.id;

                  return (
                    <div
                      key={req.id}
                      className="rounded-lg p-3"
                      style={{
                        background: nightMode
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(255,255,255,0.45)",
                        border: `1px solid ${nightMode ? "rgba(255,255,255,0.04)" : "rgba(150,165,225,0.12)"}`,
                        ...(nightMode
                          ? {}
                          : {
                              backdropFilter: "blur(8px)",
                              WebkitBackdropFilter: "blur(8px)",
                            }),
                      }}
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                          style={{
                            background: gradient,
                            fontFamily: "'Playfair Display', serif",
                          }}
                        >
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-semibold truncate"
                            style={{
                              color: nightMode ? "#e8e5f2" : "#1e2b4a",
                            }}
                          >
                            {name}
                          </div>
                          <div
                            className="text-[11px] truncate"
                            style={{
                              color: nightMode ? "#5d5877" : "#8e9ec0",
                            }}
                          >
                            {sender.location_city || "Lightning user"}
                            {req.mutual_friends
                              ? ` · ${req.mutual_friends} mutual friends`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(req.id)}
                          disabled={isProcessing}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{
                            background: nightMode
                              ? "rgba(123,118,224,0.2)"
                              : "rgba(79,172,254,0.15)",
                            border: `1px solid ${nightMode ? "rgba(123,118,224,0.3)" : "rgba(79,172,254,0.2)"}`,
                            color: nightMode ? "#9b96f5" : "#2b6cb0",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(req.id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                          style={{
                            background: "transparent",
                            border: `1px solid ${nightMode ? "rgba(255,255,255,0.04)" : "rgba(150,165,225,0.12)"}`,
                            color: nightMode ? "#5d5877" : "#8e9ec0",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notification Feed — real rows from public.notifications */}
          <div>
            <div
              className="text-[10px] uppercase tracking-widest font-semibold py-2"
              style={{ color: nightMode ? "#5d5877" : "#4a5e88" }}
            >
              Recent
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg"
                  >
                    <div className="animate-pulse flex items-start gap-2.5 w-full">
                      <div
                        className="w-7 h-7 rounded-full flex-shrink-0"
                        style={{
                          background: nightMode
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(150,165,225,0.15)",
                        }}
                      />
                      <div className="flex-1">
                        <div
                          className="h-3 rounded w-3/4 mb-1.5"
                          style={{
                            background: nightMode
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(150,165,225,0.15)",
                          }}
                        />
                        <div
                          className="h-2 rounded w-1/3"
                          style={{
                            background: nightMode
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(150,165,225,0.1)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleNotifications.length > 0 ? (
              <div className="space-y-1.5">
                {visibleNotifications.map((notif) => {
                  const Icon = iconForType(notif.type);
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg transition-colors"
                      style={{
                        background: notif.is_read
                          ? nightMode
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(255,255,255,0.35)"
                          : nightMode
                            ? "rgba(123,118,224,0.10)"
                            : "rgba(79,172,254,0.10)",
                        border: `1px solid ${
                          notif.is_read
                            ? nightMode
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(150,165,225,0.12)"
                            : nightMode
                              ? "rgba(123,118,224,0.22)"
                              : "rgba(79,172,254,0.22)"
                        }`,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: nightMode
                            ? "rgba(123,118,224,0.18)"
                            : "rgba(79,172,254,0.15)",
                          color: nightMode ? "#9b96f5" : "#2b6cb0",
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xs font-semibold truncate"
                          style={{
                            color: nightMode ? "#e8e5f2" : "#1e2b4a",
                          }}
                        >
                          {notif.title || "Notification"}
                        </div>
                        {notif.content && (
                          <div
                            className="text-[11px] truncate"
                            style={{
                              color: nightMode ? "#8e89a8" : "#4a5e88",
                            }}
                          >
                            {notif.content}
                          </div>
                        )}
                        <div
                          className="text-[10px] mt-0.5"
                          style={{
                            color: nightMode ? "#5d5877" : "#8e9ec0",
                          }}
                        >
                          {formatRelativeTime(notif.created_at)}
                        </div>
                      </div>
                      {!notif.is_read && (
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                          style={{
                            background: nightMode ? "#9b96f5" : "#2b6cb0",
                          }}
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : !showFriendRequests ? (
              // Empty state — only shown if there are no pending friend
              // requests AND no notifications in the current filter.
              <div
                className="rounded-xl p-8 text-center mt-2"
                style={{
                  background: nightMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.5)",
                  border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                }}
              >
                <div className="text-3xl mb-2">
                  {activeFilter === "all" || activeFilter === "friends"
                    ? "🔔"
                    : "📭"}
                </div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: nightMode ? "#e8e5f2" : "#1e2b4a",
                  }}
                >
                  {activeFilter === "all" || activeFilter === "friends"
                    ? "You're all caught up"
                    : `No ${activeFilter} notifications yet`}
                </p>
                <p
                  className="text-xs"
                  style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}
                >
                  {activeFilter === "all" || activeFilter === "friends"
                    ? "When people interact with your testimonies or send friend requests, you'll see them here."
                    : "Activity will appear here as it happens."}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default NotificationsPanel;
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useUserProfile } from "./useUserProfile";
import {
  getPendingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from "../lib/database";

interface FriendRequest {
  id: string;
  sender_id: string;
  sender?: {
    display_name?: string;
    username?: string;
    avatar_emoji?: string;
    avatar_url?: string;
    location_city?: string;
  };
  mutual_friends?: number;
  created_at?: string;
}

// Generate a deterministic gradient from a string
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

type FilterType = "all" | "testimonies" | "friends" | "church";

interface NotificationsPanelProps {
  nightMode: boolean;
  onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  nightMode,
  onClose,
}) => {
  const { profile } = useUserProfile();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load pending friend requests
  useEffect(() => {
    const loadRequests = async () => {
      if (!profile?.supabaseId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const requests = await getPendingFriendRequests(profile.supabaseId);
        setPendingRequests((requests as any[]) || []);
      } catch (error) {
        console.error("Error loading friend requests:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRequests();
  }, [profile?.supabaseId]);

  const handleAccept = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await acceptFriendRequest(requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Error accepting friend request:", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await declineFriendRequest(requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Error declining friend request:", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "testimonies", label: "Testimonies" },
    { key: "friends", label: "Friends" },
    { key: "church", label: "Church" },
  ];

  // Show friend requests section when filter is "all" or "friends"
  const showFriendRequests =
    (activeFilter === "all" || activeFilter === "friends") &&
    pendingRequests.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
        aria-label="Close notifications"
      />

      {/* Panel — slides in from right */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden"
        style={{
          background: nightMode
            ? "#0d0b18"
            : "linear-gradient(135deg, #cdd8f8 0%, #d6daf5 40%, #dee0f6 70%, #e4e0f5 100%)",
          borderLeft: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
          animation: "slideInRight 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0"
          style={{
            borderBottom: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
          }}
        >
          <h2
            className="text-base font-medium"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: nightMode ? "#e8e5f2" : "#1e2b4a",
            }}
          >
            Notifications
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{
              background: nightMode
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.5)",
              border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
              color: nightMode ? "#8e89a8" : "#4a5e88",
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto flex-shrink-0">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
              style={
                activeFilter === f.key
                  ? {
                      background: nightMode
                        ? "rgba(123,118,224,0.12)"
                        : "rgba(79,172,254,0.1)",
                      border: `1px solid ${nightMode ? "rgba(123,118,224,0.18)" : "rgba(79,172,254,0.15)"}`,
                      color: nightMode ? "#e8e5f2" : "#1e2b4a",
                    }
                  : {
                      background: nightMode
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.5)",
                      border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                      color: nightMode ? "#8e89a8" : "#4a5e88",
                      ...(nightMode
                        ? {}
                        : {
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                          }),
                    }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Friend Requests Section */}
          {showFriendRequests && (
            <div className="mb-3">
              <div
                className="text-[10px] uppercase tracking-widest font-semibold py-2"
                style={{ color: nightMode ? "#5d5877" : "#4a5e88" }}
              >
                Friend Requests
              </div>
              <div className="space-y-2">
                {pendingRequests.map((req) => {
                  const sender = req.sender || ({} as any);
                  const name =
                    sender.display_name || sender.username || "Someone";
                  const initial = name.charAt(0).toUpperCase();
                  const gradient = getAvatarGradient(
                    req.sender_id || name,
                  );
                  const isProcessing = processingRequest === req.id;

                  return (
                    <div
                      key={req.id}
                      className="rounded-lg p-3"
                      style={{
                        background: nightMode
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(255,255,255,0.45)",
                        border: `1px solid ${nightMode ? "rgba(255,255,255,0.04)" : "rgba(150,165,225,0.12)"}`,
                        ...(nightMode
                          ? {}
                          : {
                              backdropFilter: "blur(8px)",
                              WebkitBackdropFilter: "blur(8px)",
                            }),
                      }}
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                          style={{
                            background: gradient,
                            fontFamily: "'Playfair Display', serif",
                          }}
                        >
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-semibold truncate"
                            style={{
                              color: nightMode ? "#e8e5f2" : "#1e2b4a",
                            }}
                          >
                            {name}
                          </div>
                          <div
                            className="text-[11px] truncate"
                            style={{
                              color: nightMode ? "#5d5877" : "#8e9ec0",
                            }}
                          >
                            {sender.location_city || "Lightning user"}
                            {req.mutual_friends
                              ? ` · ${req.mutual_friends} mutual friends`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(req.id)}
                          disabled={isProcessing}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{
                            background: nightMode
                              ? "rgba(123,118,224,0.2)"
                              : "rgba(79,172,254,0.15)",
                            border: `1px solid ${nightMode ? "rgba(123,118,224,0.3)" : "rgba(79,172,254,0.2)"}`,
                            color: nightMode ? "#9b96f5" : "#2b6cb0",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(req.id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                          style={{
                            background: "transparent",
                            border: `1px solid ${nightMode ? "rgba(255,255,255,0.04)" : "rgba(150,165,225,0.12)"}`,
                            color: nightMode ? "#5d5877" : "#8e9ec0",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notification Feed — placeholder for future backend */}
          <div>
            <div
              className="text-[10px] uppercase tracking-widest font-semibold py-2"
              style={{ color: nightMode ? "#5d5877" : "#4a5e88" }}
            >
              Recent
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg"
                  >
                    <div className="animate-pulse flex items-start gap-2.5 w-full">
                      <div
                        className="w-7 h-7 rounded-full flex-shrink-0"
                        style={{
                          background: nightMode
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(150,165,225,0.15)",
                        }}
                      />
                      <div className="flex-1">
                        <div
                          className="h-3 rounded w-3/4 mb-1.5"
                          style={{
                            background: nightMode
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(150,165,225,0.15)",
                          }}
                        />
                        <div
                          className="h-2 rounded w-1/3"
                          style={{
                            background: nightMode
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(150,165,225,0.1)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingRequests.length === 0 &&
              (activeFilter === "all" || activeFilter === "friends") ? (
              // Empty state
              <div
                className="rounded-xl p-8 text-center mt-2"
                style={{
                  background: nightMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.5)",
                  border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                }}
              >
                <div className="text-3xl mb-2">🔔</div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: nightMode ? "#e8e5f2" : "#1e2b4a",
                  }}
                >
                  You're all caught up
                </p>
                <p
                  className="text-xs"
                  style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}
                >
                  When people interact with your testimonies or send friend
                  requests, you'll see them here.
                </p>
              </div>
            ) : activeFilter !== "all" && activeFilter !== "friends" ? (
              // Empty state for filtered views
              <div
                className="rounded-xl p-8 text-center mt-2"
                style={{
                  background: nightMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.5)",
                  border: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "rgba(150,165,225,0.15)"}`,
                }}
              >
                <div className="text-3xl mb-2">📭</div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: nightMode ? "#e8e5f2" : "#1e2b4a",
                  }}
                >
                  No {activeFilter} notifications yet
                </p>
                <p
                  className="text-xs"
                  style={{ color: nightMode ? "#8e89a8" : "#4a5e88" }}
                >
                  Activity will appear here as it happens.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default NotificationsPanel;
