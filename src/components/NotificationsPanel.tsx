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
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
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
