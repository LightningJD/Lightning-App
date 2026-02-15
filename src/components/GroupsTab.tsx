import React, { useState, useEffect } from "react";
import {
  Plus,
  X,
  Settings,
  Crown,
  Users,
  Trash2,
  LogOut,
  Smile,
  Pin,
  Info,
  ChevronRight,
  Shield,
  ShieldCheck,
  Eye,
  ChevronDown,
  Calendar,
  Megaphone,
  Bell,
} from "lucide-react";
import { useUserProfile } from "./useUserProfile";
import { GroupCardSkeleton } from "./SkeletonLoader";
import { useGuestModalContext } from "../contexts/GuestModalContext";
import type { GroupRole } from "../types";
import {
  mapLegacyRole,
  hasPermission,
  getRoleLabel,
  getRoleColor,
  getAssignableRoles,
} from "../lib/permissions";
import EventsView from "./EventsView";
import AnnouncementsView from "./AnnouncementsView";
import NotificationSettings from "./NotificationSettings";
import ScriptureCard from "./ScriptureCard";
import { detectScriptureReferences } from "../lib/scripture";
import {
  getSeverityColor,
  getSeverityLabel,
  getFlagReasonLabel,
} from "../lib/contentFilter";
import { useGroupManagement } from "../hooks/useGroupManagement";
import { useGroupChat } from "../hooks/useGroupChat";
import { useGroupMembers } from "../hooks/useGroupMembers";

interface GroupsTabProps {
  nightMode: boolean;
  onGroupsCountChange?: (count: number) => void;
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

// Get user's effective role for a group (maps legacy 'leader' to 'pastor')
const getUserRole = (group: GroupData | undefined): GroupRole => {
  if (!group) return "member";
  return mapLegacyRole(group.userRole);
};

const GroupsTab: React.FC<GroupsTabProps> = ({
  nightMode,
  onGroupsCountChange,
}) => {
  const { profile } = useUserProfile();
  const { isGuest, checkAndShowModal } = useGuestModalContext() as {
    isGuest: boolean;
    checkAndShowModal: () => void;
  };
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<
    | "list"
    | "chat"
    | "settings"
    | "members"
    | "events"
    | "announcements"
    | "notifications"
  >("list");
  const [showGroupBio, setShowGroupBio] = useState(false);

  // Extracted hooks
  const groupMgmt = useGroupManagement({
    userId: profile?.supabaseId,
    onGroupsCountChange,
  });
  const {
    myGroups,
    pendingInvitations,
    isGroupsLoading,
    showCreateGroup,
    setShowCreateGroup,
    newGroupName,
    setNewGroupName,
    newGroupDescription,
    setNewGroupDescription,
    inviteCandidates,
    selectedMemberIds,
    setSelectedMemberIds,
    handleCreateGroup,
    editGroupName,
    setEditGroupName,
    editGroupDescription,
    setEditGroupDescription,
    isSaving,
    isDeleting,
    isLeaving,
    handleAcceptInvitation,
    handleDeclineInvitation,
  } = groupMgmt;

  const activeGroupData = myGroups.find((g) => g.id === activeGroup);
  const userRole = getUserRole(activeGroupData);

  const chat = useGroupChat({
    activeGroup,
    activeView,
    userId: profile?.supabaseId,
    displayName: profile?.displayName,
    avatar: profile?.avatar,
  });
  const {
    groupMessages,
    pinnedMessages,
    newMessage,
    setNewMessage,
    loading,
    flaggedMessages,
    messageReactions,
    showReactionPicker,
    setShowReactionPicker,
    expandedReactions,
    setExpandedReactions,
    showAllEmojis,
    setShowAllEmojis,
    messagesEndRef,
    messagesContainerRef,
    pinnedSectionRef,
    messageRefs,
    handleSendGroupMessage,
    handleReaction,
    handlePinMessage,
    handleUnpinMessage,
    isMessageInBottomHalf,
  } = chat;

  const members = useGroupMembers({ activeGroup, activeView, userRole });
  const {
    groupMembers,
    showRoleMenu,
    setShowRoleMenu,
    handleRemoveMember,
    handleSetRole,
  } = members;

  // Kept inline: RoleBadge, MessageContent, reactionEmojis (render helpers)

  // Role badge component
  const RoleBadge = ({
    role,
    size = "sm",
  }: {
    role: string;
    size?: "sm" | "xs";
  }) => {
    const mappedRole = mapLegacyRole(role);
    const color = getRoleColor(mappedRole);
    const label = getRoleLabel(mappedRole);

    const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-3 h-3";

    const getIcon = () => {
      switch (mappedRole) {
        case "pastor":
          return <Crown className={`${iconSize}`} style={{ color }} />;
        case "admin":
          return <Shield className={`${iconSize}`} style={{ color }} />;
        case "moderator":
          return <ShieldCheck className={`${iconSize}`} style={{ color }} />;
        case "visitor":
          return <Eye className={`${iconSize}`} style={{ color }} />;
        default:
          return null;
      }
    };

    const icon = getIcon();
    if (!icon) return null;

    return (
      <span
        className={`inline-flex items-center gap-1 ${size === "sm" ? "text-[10px]" : "text-[9px]"} font-semibold rounded-full px-1.5 py-0.5`}
        style={{
          color,
          backgroundColor: `${color}15`,
          border: `1px solid ${color}30`,
        }}
        title={label}
      >
        {icon}
        <span>{label}</span>
      </span>
    );
  };

  // Render message content with scripture auto-expand and content flag indicator
  const MessageContent = ({
    content,
    onShareVerse,
    messageId,
    isLeaderView,
  }: {
    content: string;
    onShareVerse?: (text: string) => void;
    messageId?: string | number;
    isLeaderView?: boolean;
  }) => {
    const refs = detectScriptureReferences(content);
    const flag = messageId ? flaggedMessages[messageId] : undefined;

    return (
      <div>
        <p className="text-[15px] break-words whitespace-pre-wrap leading-snug">
          {content}
        </p>
        {refs.map((ref, i) => (
          <ScriptureCard
            key={`${ref.fullReference}-${i}`}
            reference={ref}
            nightMode={nightMode}
            onShareToChat={
              onShareVerse
                ? (text) => {
                    onShareVerse(text);
                  }
                : undefined
            }
          />
        ))}
        {flag && isLeaderView && (
          <div
            className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium"
            style={{
              background: `${getSeverityColor(flag.severity)}15`,
              border: `1px solid ${getSeverityColor(flag.severity)}30`,
              color: getSeverityColor(flag.severity),
            }}
          >
            <span>⚠️</span>
            <span>{getSeverityLabel(flag.severity)}</span>
            <span className="opacity-60">·</span>
            <span className="opacity-80">
              {flag.reasons.map(getFlagReasonLabel).join(", ")}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Helper function to check if message is in bottom half of viewport
  const isMessageInBottomHalf = (messageId: string | number): boolean => {
    const messageEl = messageRefs.current[messageId];
    if (!messageEl) return false;

    const rect = messageEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const messageMiddle = rect.top + rect.height / 2;

    return messageMiddle > viewportHeight / 2;
  };

  // Reaction emojis for faith-based groups (22 emojis)
  const reactionEmojis = [
    "🙏",
    "❤️",
    "✝️",
    "🔥",
    "✨",
    "🕊️", // Row 1: Faith Core
    "📖",
    "🌟",
    "💪",
    "🛡️",
    "🙌",
    "👑", // Row 2: Faith Symbols
    "🤲",
    "😇",
    "😊",
    "😢",
    "😮",
    "🎉", // Row 3: Support & Prayer
    "🫂",
    "✋",
    "🥰",
    "😌",
    "✅",
    "💯", // Row 4: Connection & Agreement
  ];

  // Block guests from accessing groups
  useEffect(() => {
    if (isGuest) {
      checkAndShowModal();
    }
  }, [isGuest, checkAndShowModal]);

  // All message loading, polling, scroll tracking, and auto-scroll handled by useGroupChat hook
  // All member loading handled by useGroupMembers hook

  // handleCreateGroup, invite loading — handled by useGroupManagement hook

  // All handlers (send, reaction, pin/unpin, create, update, delete, leave, invite, member mgmt)
  // are now in extracted hooks: useGroupChat, useGroupManagement, useGroupMembers

  // Wrapper handlers that need navigation side-effects
  const handleUpdateGroupAndNav = async (e: React.FormEvent) => {
    const success = await groupMgmt.handleUpdateGroup(e, activeGroup!);
    if (success) setActiveView("chat");
  };

  const handleDeleteGroupAndNav = async (e?: React.MouseEvent) => {
    const success = await groupMgmt.handleDeleteGroup(activeGroup!, e);
    if (success) {
      setActiveGroup(null);
      setActiveView("list");
    }
  };

  const handleLeaveGroupAndNav = async () => {
    const success = await groupMgmt.handleLeaveGroup(activeGroup!);
    if (success) {
      setActiveGroup(null);
      setActiveView("list");
    }
  };

  // Create Group Modal
  if (showCreateGroup) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div
          className={`rounded-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300 ${
            nightMode
              ? "bg-[#0a0a0a]"
              : "bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50"
          }`}
          style={{
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                className={
                  nightMode
                    ? "text-xl font-bold text-slate-100"
                    : "text-xl font-bold text-black"
                }
              >
                Create Group
              </h2>
              <button
                onClick={() => setShowCreateGroup(false)}
                className={
                  nightMode
                    ? "p-2 hover:bg-white/10 rounded-lg"
                    : "p-2 hover:bg-white/20 rounded-lg"
                }
              >
                <X
                  className={`w-5 h-5 ${nightMode ? "text-slate-100" : "text-black"}`}
                />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label
                  htmlFor="groupName"
                  className={
                    nightMode
                      ? "block text-sm font-semibold text-slate-100 mb-2"
                      : "block text-sm font-semibold text-black mb-2"
                  }
                >
                  Group Name *
                </label>
                <input
                  id="groupName"
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Prayer Warriors"
                  className={
                    nightMode
                      ? "w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      : "w-full px-4 py-3 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md transition-all"
                  }
                  required
                />
              </div>

              <div>
                <label
                  id="description"
                  htmlFor="description"
                  className={
                    nightMode
                      ? "block text-sm font-semibold text-slate-100 mb-2"
                      : "block text-sm font-semibold text-black mb-2"
                  }
                >
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  rows={3}
                  className={
                    nightMode
                      ? "w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      : "w-full px-4 py-3 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md transition-all"
                  }
                />
              </div>

              {/* Member selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={
                      nightMode
                        ? "block text-sm font-semibold text-slate-100"
                        : "block text-sm font-semibold text-black"
                    }
                  >
                    Add Members (optional)
                  </span>
                  {selectedMemberIds.length > 0 && (
                    <span
                      className={`text-xs ${nightMode ? "text-slate-400" : "text-slate-600"}`}
                    >
                      {selectedMemberIds.length} selected
                    </span>
                  )}
                </div>

                {inviteCandidates.length === 0 ? (
                  <div
                    className={`rounded-xl border p-4 text-center ${nightMode ? "border-white/10 bg-white/5" : "border-white/30 bg-white/60"}`}
                  >
                    <p
                      className={
                        nightMode
                          ? "text-sm text-slate-400"
                          : "text-sm text-slate-700"
                      }
                    >
                      No friends to invite yet. Add friends from the Find tab
                      first.
                    </p>
                  </div>
                ) : (
                  <div
                    className={`max-h-48 overflow-auto rounded-xl border ${nightMode ? "border-white/10 bg-white/5" : "border-white/30 bg-white/60"} p-3 space-y-2`}
                  >
                    {inviteCandidates.map((u) => {
                      const checked = selectedMemberIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          htmlFor={`member-${u.id}`}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            checked
                              ? nightMode
                                ? "bg-blue-500/20 border border-blue-500/30"
                                : "bg-blue-50 border border-blue-200"
                              : nightMode
                                ? "hover:bg-white/5"
                                : "hover:bg-white/40"
                          }`}
                        >
                          <input
                            id={`member-${u.id}`}
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMemberIds((prev) => [
                                  ...prev,
                                  String(u.id),
                                ]);
                              } else {
                                setSelectedMemberIds((prev) =>
                                  prev.filter((id) => id !== String(u.id)),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <span
                              className={`text-base ${nightMode ? "text-slate-100" : "text-black"}`}
                            >
                              {u.avatar_emoji || "👤"}
                            </span>
                            <div className="flex-1">
                              <span
                                className={`text-sm font-medium ${nightMode ? "text-slate-100" : "text-black"}`}
                              >
                                {u.display_name || u.username}
                              </span>
                              {u.location_city && (
                                <p
                                  className={`text-xs ${nightMode ? "text-slate-400" : "text-slate-600"}`}
                                >
                                  {u.location_city}
                                </p>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {selectedMemberIds.length > 0 && (
                  <div className="mt-2">
                    <p
                      className={`text-xs ${nightMode ? "text-slate-400" : "text-slate-600"} mb-1`}
                    >
                      Selected members will receive a notification to join the
                      group.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${
                    nightMode
                      ? "bg-white/5 hover:bg-white/10 text-slate-100 border-white/10"
                      : "bg-white/80 hover:bg-white text-black border-white/30 shadow-md"
                  }`}
                  aria-label="Cancel creating group"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newGroupName.trim()}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                    nightMode ? "border-white/20" : "border-white/30 shadow-md"
                  }`}
                  style={{
                    background:
                      "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)",
                    boxShadow: nightMode
                      ? "0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                      : "0 4px 12px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && newGroupName.trim()) {
                      e.currentTarget.style.background =
                        "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)";
                  }}
                  aria-label={`${loading ? "Creating group" : "Create group"}`}
                >
                  {loading ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Events View
  if (activeGroup && activeView === "events") {
    const group = myGroups.find((g) => g.id === activeGroup);
    if (!group) return null;
    const myRole = getUserRole(group);

    return (
      <EventsView
        nightMode={nightMode}
        groupId={activeGroup}
        userId={profile!.supabaseId}
        userRole={myRole}
        onBack={() => setActiveView("chat")}
      />
    );
  }

  // Announcements View
  if (activeGroup && activeView === "announcements") {
    const group = myGroups.find((g) => g.id === activeGroup);
    if (!group) return null;
    const myRole = getUserRole(group);

    return (
      <AnnouncementsView
        nightMode={nightMode}
        groupId={activeGroup}
        userId={profile!.supabaseId}
        userRole={myRole}
        onBack={() => setActiveView("chat")}
      />
    );
  }

  // Group Settings View
  if (activeGroup && activeView === "settings") {
    const group = myGroups.find((g) => g.id === activeGroup);
    if (!group) return null;

    const myRole = getUserRole(group);
    const isLeader = hasPermission(myRole, "canManageGroup");

    return (
      <div className="py-4 px-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setActiveView("chat")}
            className="text-blue-600 text-sm font-semibold"
          >
            ← Back to Chat
          </button>
          <h2
            className={
              nightMode
                ? "text-lg font-bold text-slate-100"
                : "text-lg font-bold text-black"
            }
          >
            Group Settings
          </h2>
          <div className="w-20"></div>
        </div>

        {isLeader ? (
          <form onSubmit={handleUpdateGroupAndNav} className="space-y-4">
            <div
              className={`rounded-xl border p-4 space-y-4 ${nightMode ? "bg-white/5 border-white/10" : "border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"}`}
              style={
                nightMode
                  ? {}
                  : {
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(30px)",
                      WebkitBackdropFilter: "blur(30px)",
                      boxShadow:
                        "0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                    }
              }
            >
              <div>
                <label
                  htmlFor="editGroupName"
                  className={
                    nightMode
                      ? "block text-sm font-semibold text-slate-100 mb-2"
                      : "block text-sm font-semibold text-black mb-2"
                  }
                >
                  Group Name
                </label>
                <input
                  id="editGroupName"
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder={group.name}
                  className={
                    nightMode
                      ? "w-full px-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      : "w-full px-4 py-2 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md"
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="editGroupDescription"
                  className={
                    nightMode
                      ? "block text-sm font-semibold text-slate-100 mb-2"
                      : "block text-sm font-semibold text-black mb-2"
                  }
                >
                  Description
                </label>
                <textarea
                  id="editGroupDescription"
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  placeholder={group.description || "Add a description"}
                  rows={3}
                  className={
                    nightMode
                      ? "w-full px-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      : "w-full px-4 py-2 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md"
                  }
                />
              </div>

              <button
                type="submit"
                disabled={isSaving || !editGroupName.trim()}
                className={`w-full px-4 py-3 border rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-slate-100 ${nightMode ? "border-white/20" : "shadow-md border-white/30"}`}
                style={{
                  background:
                    "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)",
                  boxShadow: nightMode
                    ? "0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                    : "0 4px 12px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
                }}
                onMouseEnter={(e) => {
                  if (!isSaving && editGroupName.trim()) {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)";
                }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div
              className={`rounded-xl border p-4 ${nightMode ? "bg-white/5 border-red-300" : "border-red-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"}`}
              style={
                nightMode
                  ? {}
                  : {
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(30px)",
                      WebkitBackdropFilter: "blur(30px)",
                      boxShadow:
                        "0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                    }
              }
            >
              <h3
                className={`font-semibold mb-2 ${nightMode ? "text-red-400" : "text-red-900"}`}
              >
                Danger Zone
              </h3>
              <p
                className={
                  nightMode
                    ? "text-sm text-slate-100 mb-4"
                    : "text-sm text-black mb-4"
                }
              >
                Once you delete a group, all messages and members will be
                removed. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={(e) => handleDeleteGroupAndNav(e)}
                disabled={isDeleting}
                className="w-full px-4 py-3 bg-red-500 text-slate-100 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </form>
        ) : (
          <div
            className={`rounded-xl border p-4 ${nightMode ? "bg-white/5 border-white/10" : "border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"}`}
            style={
              nightMode
                ? {}
                : {
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(30px)",
                    WebkitBackdropFilter: "blur(30px)",
                    boxShadow:
                      "0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                  }
            }
          >
            <h3
              className={
                nightMode
                  ? "font-semibold text-slate-100 mb-2"
                  : "font-semibold text-black mb-2"
              }
            >
              Leave Group
            </h3>
            <p
              className={
                nightMode
                  ? "text-sm text-slate-100 mb-4"
                  : "text-sm text-black mb-4"
              }
            >
              You can rejoin this group later by requesting access again.
            </p>
            <button
              onClick={handleLeaveGroupAndNav}
              disabled={isLeaving}
              className={`w-full px-4 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all ${nightMode ? "bg-slate-500 hover:bg-slate-600 text-slate-100" : "bg-slate-500 hover:bg-slate-600 text-white"}`}
            >
              <LogOut className="w-4 h-4" />
              {isLeaving ? "Leaving..." : "Leave Group"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Group Members View
  if (activeGroup && activeView === "members") {
    const group = myGroups.find((g) => g.id === activeGroup);
    if (!group) return null;

    const myRole = getUserRole(group);
    const canManage = hasPermission(myRole, "canManageMembers");
    const canManageRoles = hasPermission(myRole, "canManageRoles");

    return (
      <div className="py-4 px-4 space-y-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setActiveView("chat")}
            className="text-blue-600 text-sm font-semibold"
          >
            ← Back to Chat
          </button>
          <h2
            className={
              nightMode
                ? "text-lg font-bold text-slate-100"
                : "text-lg font-bold text-black"
            }
          >
            Members ({groupMembers.length})
          </h2>
          <div className="w-20"></div>
        </div>

        <div className="space-y-2">
          {groupMembers.map((member) => {
            const memberRole = mapLegacyRole(member.role);
            const canModifyThisMember =
              canManage &&
              member.user.id !== profile!.supabaseId &&
              outranks(myRole, memberRole);
            const assignableRoles = canManageRoles
              ? getAssignableRoles(myRole)
              : [];

            return (
              <div
                key={member.id}
                className={`rounded-xl border p-4 ${nightMode ? "bg-white/5 border-white/10" : "border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"}`}
                style={
                  nightMode
                    ? {}
                    : {
                        background: "rgba(255, 255, 255, 0.2)",
                        backdropFilter: "blur(30px)",
                        WebkitBackdropFilter: "blur(30px)",
                        boxShadow:
                          "0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                      }
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="text-2xl">{member.user.avatar_emoji}</div>
                      {member.user.is_online && (
                        <div
                          className={
                            nightMode
                              ? "absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1A1A1B]"
                              : "absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                          }
                        ></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={
                            nightMode
                              ? "font-semibold text-slate-100"
                              : "font-semibold text-black"
                          }
                        >
                          {member.user.display_name}
                        </h3>
                        <RoleBadge role={member.role} size="xs" />
                      </div>
                      <p
                        className={
                          nightMode
                            ? "text-xs text-slate-100"
                            : "text-xs text-black"
                        }
                      >
                        @{member.user.username}
                      </p>
                    </div>
                  </div>

                  {canModifyThisMember && (
                    <div className="flex gap-2 items-center">
                      {/* Role dropdown */}
                      {canManageRoles && assignableRoles.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setShowRoleMenu(
                                showRoleMenu === member.user.id
                                  ? null
                                  : member.user.id,
                              )
                            }
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                              nightMode
                                ? "bg-white/5 text-slate-100 hover:bg-white/10 border border-white/10"
                                : "bg-white/80 text-black hover:bg-white border border-white/30 shadow-sm"
                            }`}
                          >
                            {getRoleLabel(memberRole)}
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {showRoleMenu === member.user.id && (
                            <div
                              className={`absolute right-0 top-full mt-1 rounded-xl border overflow-hidden z-50 min-w-[140px] ${
                                nightMode
                                  ? "bg-[#1a1a1a] border-white/10"
                                  : "bg-white border-white/25"
                              }`}
                              style={{
                                boxShadow: nightMode
                                  ? "0 8px 24px rgba(0, 0, 0, 0.4)"
                                  : "0 8px 24px rgba(0, 0, 0, 0.12)",
                              }}
                            >
                              {assignableRoles.map((role) => (
                                <button
                                  key={role}
                                  onClick={() =>
                                    handleSetRole(member.user.id, role)
                                  }
                                  className={`w-full px-3 py-2 text-xs font-medium text-left flex items-center gap-2 transition-colors ${
                                    memberRole === role
                                      ? nightMode
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "bg-blue-50 text-blue-700"
                                      : nightMode
                                        ? "text-slate-100 hover:bg-white/5"
                                        : "text-black hover:bg-slate-50"
                                  }`}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: getRoleColor(role),
                                    }}
                                  />
                                  {getRoleLabel(role)}
                                  {memberRole === role && (
                                    <span className="ml-auto text-[10px]">
                                      current
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveMember(member.user.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${nightMode ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-100 text-red-700 hover:bg-red-200 shadow-sm"}`}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Group Chat View
  if (activeGroup && activeView === "chat") {
    const group = myGroups.find((g) => g.id === activeGroup);
    if (!group) return null;

    const myRole = getUserRole(group);
    const isLeader = hasPermission(myRole, "canManageGroup");
    const canPin = hasPermission(myRole, "canPinMessages");

    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div
          className={`px-4 py-2.5 border-b ${nightMode ? "bg-white/5 border-white/10" : "border-white/25"}`}
          style={
            nightMode
              ? {}
              : {
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(30px)",
                  WebkitBackdropFilter: "blur(30px)",
                }
          }
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setActiveGroup(null);
                setActiveView("list");
              }}
              className="text-blue-600 text-sm font-semibold"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <div className="text-xl">{group.avatar_emoji}</div>
              <div>
                <h3
                  className={
                    nightMode
                      ? "font-semibold text-slate-100 text-sm"
                      : "font-semibold text-black text-sm"
                  }
                >
                  {group.name}
                </h3>
                <p
                  className={
                    nightMode
                      ? "text-[10px] text-slate-100"
                      : "text-[10px] text-black"
                  }
                >
                  {group.member_count} members
                </p>
              </div>
              {group.description && (
                <button
                  onClick={() => setShowGroupBio(!showGroupBio)}
                  className={
                    nightMode
                      ? "p-1 hover:bg-white/10 rounded-lg"
                      : "p-1 hover:bg-white/20 rounded-lg"
                  }
                  title={showGroupBio ? "Hide Group Bio" : "Show Group Bio"}
                >
                  <Info
                    className={
                      nightMode
                        ? "w-3.5 h-3.5 text-slate-100"
                        : "w-3.5 h-3.5 text-black"
                    }
                  />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveView("announcements")}
                className={
                  nightMode
                    ? "p-2 hover:bg-white/10 rounded-lg"
                    : "p-2 hover:bg-white/20 rounded-lg"
                }
                title="Announcements"
              >
                <Megaphone
                  className={
                    nightMode ? "w-4 h-4 text-slate-100" : "w-4 h-4 text-black"
                  }
                />
              </button>
              <button
                onClick={() => setActiveView("events")}
                className={
                  nightMode
                    ? "p-2 hover:bg-white/10 rounded-lg"
                    : "p-2 hover:bg-white/20 rounded-lg"
                }
                title="Events"
              >
                <Calendar
                  className={
                    nightMode ? "w-4 h-4 text-slate-100" : "w-4 h-4 text-black"
                  }
                />
              </button>
              <button
                onClick={() => setActiveView("members")}
                className={
                  nightMode
                    ? "p-2 hover:bg-white/10 rounded-lg relative"
                    : "p-2 hover:bg-white/20 rounded-lg relative"
                }
                title="Members"
              >
                <Users
                  className={
                    nightMode ? "w-4 h-4 text-slate-100" : "w-4 h-4 text-black"
                  }
                />
              </button>
              {isLeader && (
                <button
                  onClick={() => setActiveView("settings")}
                  className={
                    nightMode
                      ? "p-2 hover:bg-white/10 rounded-lg"
                      : "p-2 hover:bg-white/20 rounded-lg"
                  }
                  title="Settings"
                >
                  <Settings
                    className={
                      nightMode
                        ? "w-4 h-4 text-slate-100"
                        : "w-4 h-4 text-black"
                    }
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Group Bio Banner */}
        {group.description && showGroupBio && (
          <div
            className={`px-4 py-2.5 border-b ${nightMode ? "bg-white/5 border-white/10" : "border-white/25"}`}
            style={
              nightMode
                ? {}
                : {
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(30px)",
                    WebkitBackdropFilter: "blur(30px)",
                  }
            }
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p
                  className={
                    nightMode
                      ? "text-[11px] font-semibold text-slate-100 mb-1"
                      : "text-[11px] font-semibold text-black mb-1"
                  }
                >
                  Group Bio
                </p>
                <p
                  className={
                    nightMode
                      ? "text-[12px] text-slate-100 leading-relaxed"
                      : "text-[12px] text-black leading-relaxed"
                  }
                >
                  {group.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pinned Message Preview Banner */}
        {pinnedMessages.length > 0 && (
          <div
            className={`px-4 py-2 border-b ${nightMode ? "bg-white/5 border-white/10" : "border-blue-100"}`}
            style={
              nightMode
                ? {}
                : {
                    background: "rgba(239, 246, 255, 0.7)",
                    backdropFilter: "blur(30px)",
                    WebkitBackdropFilter: "blur(30px)",
                  }
            }
          >
            <button
              onClick={() =>
                pinnedSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className={
                nightMode
                  ? "w-full hover:bg-white/10 transition-colors text-left rounded-lg px-2 py-1"
                  : "w-full hover:bg-blue-100 transition-colors text-left rounded-lg px-2 py-1"
              }
            >
              <div className="flex items-start gap-2">
                <Pin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p
                    className={
                      nightMode
                        ? "text-[11px] font-semibold text-slate-100 mb-0.5"
                        : "text-[11px] font-semibold text-blue-900 mb-0.5"
                    }
                  >
                    Pinned Message
                  </p>
                  <p
                    className={
                      nightMode
                        ? "text-[11px] text-slate-100 truncate"
                        : "text-[11px] text-blue-700 truncate"
                    }
                  >
                    {pinnedMessages[0].content}
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className={`flex-1 p-4 overflow-y-auto ${nightMode ? "bg-white/5" : ""}`}
          style={
            nightMode
              ? {}
              : {
                  background: "rgba(255, 255, 255, 0.3)",
                  backdropFilter: "blur(30px)",
                  WebkitBackdropFilter: "blur(30px)",
                }
          }
        >
          {loading ? (
            <div
              className={
                nightMode
                  ? "text-center text-slate-100 py-8"
                  : "text-center text-black py-8"
              }
            >
              Loading messages...
            </div>
          ) : (
            <>
              {/* Pinned Messages Section */}
              {pinnedMessages.length > 0 && (
                <div
                  ref={pinnedSectionRef}
                  className={
                    nightMode
                      ? "mb-4 pb-3 border-b border-white/10"
                      : "mb-4 pb-3 border-b border-white/25"
                  }
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Pin className="w-3.5 h-3.5 text-blue-600" />
                    <span
                      className={
                        nightMode
                          ? "text-xs font-semibold text-slate-100"
                          : "text-xs font-semibold text-black"
                      }
                    >
                      Pinned Message
                    </span>
                  </div>
                  {pinnedMessages.map((msg) => {
                    const reactions = messageReactions[msg.id] || [];
                    const reactionCounts = reactions.reduce(
                      (acc, r) => {
                        acc[r.emoji] = acc[r.emoji] || {
                          count: 0,
                          users: [],
                          hasReacted: false,
                        };
                        acc[r.emoji].count++;
                        acc[r.emoji].users.push(r.user.display_name);
                        if (r.user_id === profile!.supabaseId)
                          acc[r.emoji].hasReacted = true;
                        return acc;
                      },
                      {} as Record<
                        string,
                        { count: number; users: string[]; hasReacted: boolean }
                      >,
                    );

                    return (
                      <div key={msg.id} className="mt-2">
                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                          <span className="text-sm">
                            {msg.sender.avatar_emoji}
                          </span>
                          <span
                            className={
                              nightMode
                                ? "text-xs font-semibold text-slate-100"
                                : "text-xs font-semibold text-black"
                            }
                          >
                            {msg.sender.display_name}
                          </span>
                        </div>
                        <div className="flex flex-col items-start ml-1">
                          <div
                            ref={(el) => {
                              messageRefs.current[msg.id] = el;
                            }}
                            className={
                              nightMode
                                ? "bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md inline-block relative group border border-blue-400 transition-colors"
                                : "bg-slate-100 text-black px-2 py-1 rounded-lg max-w-[80%] sm:max-w-md inline-block relative group border border-blue-200"
                            }
                          >
                            <div className="flex items-start gap-1.5">
                              <Pin className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <MessageContent
                                  content={msg.content}
                                  onShareVerse={(text) => setNewMessage(text)}
                                  messageId={msg.id}
                                  isLeaderView={isLeader}
                                />
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                  <p
                                    className={
                                      nightMode
                                        ? "text-[10px] text-slate-100"
                                        : "text-[10px] text-black"
                                    }
                                  >
                                    {new Date(
                                      msg.created_at,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  <div className="flex gap-1">
                                    {/* Reaction button */}
                                    <button
                                      onClick={() =>
                                        setShowReactionPicker(
                                          showReactionPicker === msg.id
                                            ? null
                                            : msg.id,
                                        )
                                      }
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-black"
                                    >
                                      <Smile className="w-3 h-3" />
                                    </button>
                                    {/* Unpin button (pin permission required) */}
                                    {canPin && (
                                      <button
                                        onClick={() =>
                                          handleUnpinMessage(msg.id)
                                        }
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
                              <div
                                className={`${isMessageInBottomHalf(msg.id) ? "absolute bottom-full mb-1 left-0" : "absolute top-full mt-1 left-0"} border rounded-xl shadow-2xl p-2 z-[100] ${nightMode ? "border-white/10" : "border-white/25"}`}
                                style={
                                  nightMode
                                    ? {
                                        background: "#1a1a1a",
                                        backdropFilter: "blur(30px)",
                                        WebkitBackdropFilter: "blur(30px)",
                                        boxShadow:
                                          "0 4px 20px rgba(0, 0, 0, 0.3)",
                                      }
                                    : {
                                        background: "#ffffff",
                                        backdropFilter: "blur(30px)",
                                        WebkitBackdropFilter: "blur(30px)",
                                        boxShadow:
                                          "0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                                      }
                                }
                              >
                                <div className="grid grid-cols-6 gap-1 w-[200px]">
                                  {(showAllEmojis[msg.id]
                                    ? reactionEmojis
                                    : reactionEmojis.slice(0, 6)
                                  ).map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        handleReaction(msg.id, emoji);
                                        setShowReactionPicker(null);
                                      }}
                                      className={
                                        nightMode
                                          ? "text-lg hover:scale-110 transition-transform p-1.5 hover:bg-white/10 rounded flex items-center justify-center"
                                          : "text-lg hover:scale-110 transition-transform p-1.5 hover:bg-white/20 rounded flex items-center justify-center"
                                      }
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                                {!showAllEmojis[msg.id] &&
                                  reactionEmojis.length > 6 && (
                                    <button
                                      onClick={() =>
                                        setShowAllEmojis((prev) => ({
                                          ...prev,
                                          [msg.id]: true,
                                        }))
                                      }
                                      className={
                                        nightMode
                                          ? "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-white/10 rounded transition-colors"
                                          : "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors"
                                      }
                                    >
                                      +{reactionEmojis.length - 6} more
                                    </button>
                                  )}
                                {showAllEmojis[msg.id] && (
                                  <button
                                    onClick={() =>
                                      setShowAllEmojis((prev) => ({
                                        ...prev,
                                        [msg.id]: false,
                                      }))
                                    }
                                    className={
                                      nightMode
                                        ? "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-white/10 rounded transition-colors"
                                        : "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors"
                                    }
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
                                const sortedReactions = Object.entries(
                                  reactionCounts,
                                ).sort((a, b) => b[1].count - a[1].count);
                                const isExpanded = expandedReactions[msg.id];
                                const displayReactions = isExpanded
                                  ? sortedReactions
                                  : sortedReactions.slice(0, 5);
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
                                            ? "bg-blue-100 border-2 border-blue-400"
                                            : "bg-slate-100 border border-white/25 hover:border-slate-300"
                                        }`}
                                        title={data.users.join(", ")}
                                      >
                                        <span>{emoji}</span>
                                        <span className="text-[10px] font-semibold">
                                          {data.count}
                                        </span>
                                      </button>
                                    ))}

                                    {!isExpanded && hiddenCount > 0 && (
                                      <button
                                        onClick={() =>
                                          setExpandedReactions((prev) => ({
                                            ...prev,
                                            [msg.id]: true,
                                          }))
                                        }
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 border border-white/25 hover:border-slate-300 text-black"
                                      >
                                        <span className="text-[10px] font-semibold">
                                          +{hiddenCount} more
                                        </span>
                                      </button>
                                    )}

                                    {isExpanded &&
                                      sortedReactions.length > 5 && (
                                        <button
                                          onClick={() =>
                                            setExpandedReactions((prev) => ({
                                              ...prev,
                                              [msg.id]: false,
                                            }))
                                          }
                                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 border border-white/25 hover:border-slate-300 text-black"
                                        >
                                          <span className="text-[10px] font-semibold">
                                            Show less
                                          </span>
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
                <div
                  className={
                    nightMode
                      ? "text-center text-slate-100 py-8"
                      : "text-center text-black py-8"
                  }
                >
                  <p>No messages yet.</p>
                  <p className="text-sm mt-2">Start the conversation!</p>
                </div>
              ) : (
                groupMessages.map((msg) => {
                  const isMe = msg.sender_id === profile!.supabaseId;
                  const reactions = messageReactions[msg.id] || [];

                  // Group reactions by emoji
                  const reactionCounts = reactions.reduce(
                    (acc, r) => {
                      acc[r.emoji] = acc[r.emoji] || {
                        count: 0,
                        users: [],
                        hasReacted: false,
                      };
                      acc[r.emoji].count++;
                      acc[r.emoji].users.push(r.user.display_name);
                      if (r.user_id === profile!.supabaseId)
                        acc[r.emoji].hasReacted = true;
                      return acc;
                    },
                    {} as Record<
                      string,
                      { count: number; users: string[]; hasReacted: boolean }
                    >,
                  );

                  return (
                    <div key={msg.id} className="mt-3">
                      {isMe ? (
                        // User's own messages (Discord-style left-aligned)
                        <div className="flex gap-2 items-start">
                          {/* Avatar (always show) */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${nightMode ? "bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500" : "bg-gradient-to-br from-purple-400 to-pink-400"}`}
                          >
                            {profile!.avatar}
                          </div>

                          {/* Content column */}
                          <div className="flex-1 min-w-0">
                            {/* Name and timestamp (always show) */}
                            <div className="flex items-baseline gap-2 mb-1">
                              <span
                                className={
                                  nightMode
                                    ? "text-sm font-semibold text-slate-100"
                                    : "text-sm font-semibold text-black"
                                }
                              >
                                {profile!.displayName}
                              </span>
                              <span
                                className={
                                  nightMode
                                    ? "text-[10px] text-slate-100"
                                    : "text-[10px] text-black"
                                }
                              >
                                {new Date(msg.created_at).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>

                            {/* Message bubble with reactions */}
                            <div className="flex items-center gap-2 group">
                              <div
                                ref={(el) => {
                                  messageRefs.current[msg.id] = el;
                                }}
                                className={
                                  nightMode
                                    ? "bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors"
                                    : "bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative transition-colors"
                                }
                              >
                                <MessageContent
                                  content={msg.content}
                                  onShareVerse={(text) => setNewMessage(text)}
                                  messageId={msg.id}
                                  isLeaderView={isLeader}
                                />

                                {/* Reaction Picker */}
                                {showReactionPicker === msg.id && (
                                  <div
                                    className={`${isMessageInBottomHalf(msg.id) ? "absolute bottom-full mb-1 left-0" : "absolute top-full mt-1 left-0"} border rounded-xl shadow-2xl p-2 z-[100] ${nightMode ? "border-white/10" : "border-white/25"}`}
                                    style={
                                      nightMode
                                        ? {
                                            background: "#1a1a1a",
                                            backdropFilter: "blur(30px)",
                                            WebkitBackdropFilter: "blur(30px)",
                                            boxShadow:
                                              "0 4px 20px rgba(0, 0, 0, 0.3)",
                                          }
                                        : {
                                            background: "#ffffff",
                                            backdropFilter: "blur(30px)",
                                            WebkitBackdropFilter: "blur(30px)",
                                            boxShadow:
                                              "0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                                          }
                                    }
                                  >
                                    <div className="grid grid-cols-6 gap-1 w-[200px]">
                                      {(showAllEmojis[msg.id]
                                        ? reactionEmojis
                                        : reactionEmojis.slice(0, 6)
                                      ).map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() =>
                                            handleReaction(msg.id, emoji)
                                          }
                                          className={
                                            nightMode
                                              ? "text-lg hover:scale-110 transition-transform p-1.5 hover:bg-white/10 rounded flex items-center justify-center"
                                              : "text-lg hover:scale-110 transition-transform p-1.5 hover:bg-white/20 rounded flex items-center justify-center"
                                          }
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                    {!showAllEmojis[msg.id] &&
                                      reactionEmojis.length > 6 && (
                                        <button
                                          onClick={() =>
                                            setShowAllEmojis((prev) => ({
                                              ...prev,
                                              [msg.id]: true,
                                            }))
                                          }
                                          className={
                                            nightMode
                                              ? "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-white/10 rounded transition-colors"
                                              : "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors"
                                          }
                                        >
                                          +{reactionEmojis.length - 6} more
                                        </button>
                                      )}
                                    {showAllEmojis[msg.id] && (
                                      <button
                                        onClick={() =>
                                          setShowAllEmojis((prev) => ({
                                            ...prev,
                                            [msg.id]: false,
                                          }))
                                        }
                                        className={
                                          nightMode
                                            ? "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-white/10 rounded transition-colors"
                                            : "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors"
                                        }
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
                                  onClick={() =>
                                    setShowReactionPicker(
                                      showReactionPicker === msg.id
                                        ? null
                                        : msg.id,
                                    )
                                  }
                                  className={
                                    nightMode
                                      ? "p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100"
                                      : "p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm"
                                  }
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                                {/* Pin button (pin permission required) */}
                                {canPin && (
                                  <button
                                    onClick={() => handlePinMessage(msg.id)}
                                    className={
                                      nightMode
                                        ? "p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100"
                                        : "p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm"
                                    }
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
                                    const sortedReactions = Object.entries(
                                      reactionCounts,
                                    ).sort((a, b) => b[1].count - a[1].count);
                                    const isExpanded =
                                      expandedReactions[msg.id];
                                    const displayReactions = isExpanded
                                      ? sortedReactions
                                      : sortedReactions.slice(0, 5);
                                    const hiddenCount =
                                      sortedReactions.length - 5;

                                    return (
                                      <>
                                        {displayReactions.map(
                                          ([emoji, data]) => (
                                            <button
                                              key={emoji}
                                              onClick={() => {
                                                handleReaction(msg.id, emoji);
                                                setShowReactionPicker(null);
                                              }}
                                              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                                data.hasReacted
                                                  ? nightMode
                                                    ? "bg-[rgba(88,101,242,0.15)] border border-[#5865f2]"
                                                    : "bg-blue-100 border border-blue-400"
                                                  : nightMode
                                                    ? "bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)]"
                                                    : "bg-transparent border border-white/25 hover:bg-white/20 hover:border-slate-300"
                                              }`}
                                              title={data.users.join(", ")}
                                            >
                                              <span className="text-sm leading-none">
                                                {emoji}
                                              </span>
                                              <span
                                                className={`text-[11px] font-medium leading-none ${
                                                  data.hasReacted
                                                    ? nightMode
                                                      ? "text-[#dee0fc]"
                                                      : "text-blue-700"
                                                    : nightMode
                                                      ? "text-[#b5bac1]"
                                                      : "text-black"
                                                }`}
                                              >
                                                {data.count}
                                              </span>
                                            </button>
                                          ),
                                        )}

                                        {/* Show "more" button if more than 5 reactions */}
                                        {!isExpanded && hiddenCount > 0 && (
                                          <button
                                            onClick={() =>
                                              setExpandedReactions((prev) => ({
                                                ...prev,
                                                [msg.id]: true,
                                              }))
                                            }
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                              nightMode
                                                ? "bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] text-[#b5bac1]"
                                                : "bg-transparent border border-white/25 hover:bg-white/20 text-black"
                                            }`}
                                          >
                                            <span className="text-[13px] font-medium">
                                              +{hiddenCount}
                                            </span>
                                          </button>
                                        )}

                                        {/* Show "less" button if expanded */}
                                        {isExpanded &&
                                          sortedReactions.length > 5 && (
                                            <button
                                              onClick={() =>
                                                setExpandedReactions(
                                                  (prev) => ({
                                                    ...prev,
                                                    [msg.id]: false,
                                                  }),
                                                )
                                              }
                                              className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                                nightMode
                                                  ? "bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] text-[#b5bac1]"
                                                  : "bg-transparent border border-white/25 hover:bg-white/20 text-black"
                                              }`}
                                            >
                                              <span className="text-[13px] font-medium">
                                                −
                                              </span>
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
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${nightMode ? "bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500" : "bg-gradient-to-br from-purple-400 to-pink-400"}`}
                          >
                            {msg.sender.avatar_emoji}
                          </div>

                          {/* Content column */}
                          <div className="flex-1 min-w-0">
                            {/* Name and timestamp (always show) */}
                            <div className="flex items-baseline gap-2 mb-1">
                              <span
                                className={
                                  nightMode
                                    ? "text-sm font-semibold text-slate-100"
                                    : "text-sm font-semibold text-black"
                                }
                              >
                                {msg.sender.display_name}
                              </span>
                              <span
                                className={
                                  nightMode
                                    ? "text-[10px] text-slate-100"
                                    : "text-[10px] text-black"
                                }
                              >
                                {new Date(msg.created_at).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>

                            {/* Message bubble with reactions */}
                            <div className="flex flex-col items-start">
                              <div
                                ref={(el) => {
                                  messageRefs.current[msg.id] = el;
                                }}
                                className={
                                  nightMode
                                    ? "bg-transparent hover:bg-white/10 text-slate-100 px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative group transition-colors"
                                    : "bg-transparent hover:bg-white/20 text-black px-2 py-1 rounded-md max-w-[80%] sm:max-w-md relative group transition-colors"
                                }
                              >
                                <MessageContent
                                  content={msg.content}
                                  onShareVerse={(text) => setNewMessage(text)}
                                  messageId={msg.id}
                                  isLeaderView={isLeader}
                                />
                                <div className="flex gap-1 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {/* Reaction button (shows on hover) */}
                                  <button
                                    onClick={() =>
                                      setShowReactionPicker(
                                        showReactionPicker === msg.id
                                          ? null
                                          : msg.id,
                                      )
                                    }
                                    className={
                                      nightMode
                                        ? "p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100"
                                        : "p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm"
                                    }
                                  >
                                    <Smile className="w-3.5 h-3.5" />
                                  </button>
                                  {/* Pin button (pin permission required) */}
                                  {canPin && (
                                    <button
                                      onClick={() => handlePinMessage(msg.id)}
                                      className={
                                        nightMode
                                          ? "p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100"
                                          : "p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm"
                                      }
                                      title="Pin message"
                                    >
                                      <Pin className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Reaction Picker */}
                                {showReactionPicker === msg.id && (
                                  <div
                                    className={`${isMessageInBottomHalf(msg.id) ? "absolute bottom-full mb-1 left-0" : "absolute top-full mt-1 left-0"} border rounded-xl shadow-2xl p-2 z-[100] ${nightMode ? "border-white/10" : "border-white/25"}`}
                                    style={
                                      nightMode
                                        ? {
                                            background: "#1a1a1a",
                                            backdropFilter: "blur(30px)",
                                            WebkitBackdropFilter: "blur(30px)",
                                            boxShadow:
                                              "0 4px 20px rgba(0, 0, 0, 0.3)",
                                          }
                                        : {
                                            background: "#ffffff",
                                            backdropFilter: "blur(30px)",
                                            WebkitBackdropFilter: "blur(30px)",
                                            boxShadow:
                                              "0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                                          }
                                    }
                                  >
                                    <div className="grid grid-cols-6 gap-1 w-[200px]">
                                      {(showAllEmojis[msg.id]
                                        ? reactionEmojis
                                        : reactionEmojis.slice(0, 6)
                                      ).map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => {
                                            handleReaction(msg.id, emoji);
                                            setShowReactionPicker(null);
                                          }}
                                          className={
                                            nightMode
                                              ? "text-lg hover:scale-110 transition-transform p-1.5 hover:bg-white/10 rounded flex items-center justify-center"
                                              : "text-lg hover:scale-110 transition-transform p-1.5 hover:bg-white/20 rounded flex items-center justify-center"
                                          }
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                    {!showAllEmojis[msg.id] &&
                                      reactionEmojis.length > 6 && (
                                        <button
                                          onClick={() =>
                                            setShowAllEmojis((prev) => ({
                                              ...prev,
                                              [msg.id]: true,
                                            }))
                                          }
                                          className={
                                            nightMode
                                              ? "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-white/10 rounded transition-colors"
                                              : "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors"
                                          }
                                        >
                                          +{reactionEmojis.length - 6} more
                                        </button>
                                      )}
                                    {showAllEmojis[msg.id] && (
                                      <button
                                        onClick={() =>
                                          setShowAllEmojis((prev) => ({
                                            ...prev,
                                            [msg.id]: false,
                                          }))
                                        }
                                        className={
                                          nightMode
                                            ? "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-white/10 rounded transition-colors"
                                            : "w-full mt-1 px-2 py-1 text-[10px] font-semibold text-black hover:bg-white/20 rounded transition-colors"
                                        }
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
                                  onClick={() =>
                                    setShowReactionPicker(
                                      showReactionPicker === msg.id
                                        ? null
                                        : msg.id,
                                    )
                                  }
                                  className={
                                    nightMode
                                      ? "p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100"
                                      : "p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm"
                                  }
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                                {/* Pin button (pin permission required) */}
                                {canPin && (
                                  <button
                                    onClick={() => handlePinMessage(msg.id)}
                                    className={
                                      nightMode
                                        ? "p-1 bg-white/5 border border-white/10 rounded text-slate-100 hover:text-slate-100"
                                        : "p-1 bg-white border border-white/25 rounded text-slate-400 hover:text-black shadow-sm"
                                    }
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
                                    const sortedReactions = Object.entries(
                                      reactionCounts,
                                    ).sort((a, b) => b[1].count - a[1].count);
                                    const isExpanded =
                                      expandedReactions[msg.id];
                                    const displayReactions = isExpanded
                                      ? sortedReactions
                                      : sortedReactions.slice(0, 5);
                                    const hiddenCount =
                                      sortedReactions.length - 5;

                                    return (
                                      <>
                                        {displayReactions.map(
                                          ([emoji, data]) => (
                                            <button
                                              key={emoji}
                                              onClick={() => {
                                                handleReaction(msg.id, emoji);
                                                setShowReactionPicker(null);
                                              }}
                                              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                                data.hasReacted
                                                  ? nightMode
                                                    ? "bg-[rgba(88,101,242,0.15)] border border-[#5865f2]"
                                                    : "bg-blue-100 border border-blue-400"
                                                  : nightMode
                                                    ? "bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)]"
                                                    : "bg-transparent border border-white/25 hover:bg-white/20 hover:border-slate-300"
                                              }`}
                                              title={data.users.join(", ")}
                                            >
                                              <span className="text-sm leading-none">
                                                {emoji}
                                              </span>
                                              <span
                                                className={`text-[11px] font-medium leading-none ${
                                                  data.hasReacted
                                                    ? nightMode
                                                      ? "text-[#dee0fc]"
                                                      : "text-blue-700"
                                                    : nightMode
                                                      ? "text-[#b5bac1]"
                                                      : "text-black"
                                                }`}
                                              >
                                                {data.count}
                                              </span>
                                            </button>
                                          ),
                                        )}

                                        {/* Show "more" button if more than 5 reactions */}
                                        {!isExpanded && hiddenCount > 0 && (
                                          <button
                                            onClick={() =>
                                              setExpandedReactions((prev) => ({
                                                ...prev,
                                                [msg.id]: true,
                                              }))
                                            }
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                              nightMode
                                                ? "bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] text-[#b5bac1]"
                                                : "bg-transparent border border-white/25 hover:bg-white/20 text-black"
                                            }`}
                                          >
                                            <span className="text-[13px] font-medium">
                                              +{hiddenCount}
                                            </span>
                                          </button>
                                        )}

                                        {/* Show "less" button if expanded */}
                                        {isExpanded &&
                                          sortedReactions.length > 5 && (
                                            <button
                                              onClick={() =>
                                                setExpandedReactions(
                                                  (prev) => ({
                                                    ...prev,
                                                    [msg.id]: false,
                                                  }),
                                                )
                                              }
                                              className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs min-h-[28px] transition-all ${
                                                nightMode
                                                  ? "bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] text-[#b5bac1]"
                                                  : "bg-transparent border border-white/25 hover:bg-white/20 text-black"
                                              }`}
                                            >
                                              <span className="text-[13px] font-medium">
                                                −
                                              </span>
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
          className={`px-4 py-3 border-t flex gap-2 items-end ${nightMode ? "bg-white/5 border-white/10" : "border-white/25"}`}
          style={
            nightMode
              ? {}
              : {
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(30px)",
                  WebkitBackdropFilter: "blur(30px)",
                }
          }
        >
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendGroupMessage(e);
              }
            }}
            placeholder="Message..."
            rows={1}
            className={
              nightMode
                ? "flex-1 px-3 py-2.5 bg-white/5 border border-white/10 text-slate-100 placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[100px] overflow-y-auto text-[15px]"
                : "flex-1 px-3 py-2.5 border border-white/25 text-black placeholder-black/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[100px] overflow-y-auto text-[15px]"
            }
            style={
              nightMode
                ? {
                    height: "auto",
                    minHeight: "40px",
                  }
                : {
                    height: "auto",
                    minHeight: "40px",
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(30px)",
                    WebkitBackdropFilter: "blur(30px)",
                  }
            }
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 100) + "px";
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`w-10 h-10 border rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center transition-all duration-200 text-slate-100 ${nightMode ? "border-white/20" : "shadow-md border-white/30"}`}
            style={{
              background: "rgba(79, 150, 255, 0.85)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
            }}
            onMouseEnter={(e) => {
              if (newMessage.trim()) {
                e.currentTarget.style.background = "rgba(79, 150, 255, 1.0)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(79, 150, 255, 0.85)";
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    );
  }

  // Notification Settings View
  if (activeView === "notifications") {
    return (
      <NotificationSettings
        nightMode={nightMode}
        groups={myGroups.map((g) => ({
          id: g.id,
          name: g.name,
          avatar_emoji: g.avatar_emoji,
        }))}
        onBack={() => setActiveView("list")}
      />
    );
  }

  // Groups List View
  return (
    <div className="py-4 space-y-4 px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={
              nightMode
                ? "text-lg font-bold text-slate-100"
                : "text-lg font-bold text-black"
            }
          >
            Groups
          </h2>
          <p
            className={
              nightMode ? "text-sm text-slate-100" : "text-sm text-black"
            }
          >
            Connect with your community
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("notifications")}
            className={`p-2 border rounded-lg transition-all duration-200 ${nightMode ? "border-white/20 text-slate-100 hover:bg-white/10" : "border-white/30 text-black/70 hover:bg-white/30"}`}
            style={
              nightMode
                ? {}
                : {
                    background: "rgba(255, 255, 255, 0.25)",
                    backdropFilter: "blur(30px)",
                    WebkitBackdropFilter: "blur(30px)",
                  }
            }
            title="Notification Settings"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateGroup(true)}
            className={`p-2 border rounded-lg transition-all duration-200 text-slate-100 ${nightMode ? "border-white/20" : "shadow-md border-white/30"}`}
            style={{
              background: "rgba(79, 150, 255, 0.85)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(79, 150, 255, 1.0)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(79, 150, 255, 0.85)";
            }}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3
            className={
              nightMode
                ? "text-sm font-semibold text-slate-100 mb-2"
                : "text-sm font-semibold text-black mb-2"
            }
          >
            Group Invitations ({pendingInvitations.length})
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className={`rounded-xl border p-4 ${nightMode ? "bg-white/5 border-white/10" : "border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"}`}
                style={
                  nightMode
                    ? {}
                    : {
                        background: "rgba(255, 255, 255, 0.2)",
                        backdropFilter: "blur(30px)",
                        WebkitBackdropFilter: "blur(30px)",
                      }
                }
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">
                    {invitation.group?.avatar_emoji || "✝️"}
                  </div>
                  <div className="flex-1">
                    <h4
                      className={
                        nightMode
                          ? "font-semibold text-slate-100"
                          : "font-semibold text-black"
                      }
                    >
                      {invitation.group?.name || "Group"}
                    </h4>
                    <p
                      className={
                        nightMode
                          ? "text-sm text-slate-400"
                          : "text-sm text-slate-600"
                      }
                    >
                      You've been invited to join this group
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleAcceptInvitation(invitation.id, invitation.group_id)
                    }
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all border text-slate-100 ${nightMode ? "border-white/20" : "border-white/30"}`}
                    style={{
                      background: "rgba(79, 150, 255, 0.85)",
                      backdropFilter: "blur(30px)",
                      WebkitBackdropFilter: "blur(30px)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(79, 150, 255, 1.0)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(79, 150, 255, 0.85)";
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${nightMode ? "bg-white/5 hover:bg-white/10 text-slate-100 border-white/10" : "text-black hover:bg-white/30 border-white/30"}`}
                    style={
                      nightMode
                        ? {}
                        : {
                            background: "rgba(255, 255, 255, 0.2)",
                            backdropFilter: "blur(30px)",
                            WebkitBackdropFilter: "blur(30px)",
                          }
                    }
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Groups */}
      <div>
        <h3
          className={
            nightMode
              ? "text-sm font-semibold text-slate-100 mb-2"
              : "text-sm font-semibold text-black mb-2"
          }
        >
          My Groups ({myGroups.length})
        </h3>
        {isGroupsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <GroupCardSkeleton key={i} nightMode={nightMode} />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <div
            className={`rounded-xl border p-8 text-center ${nightMode ? "bg-white/5 border-white/10 " : "border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"}`}
            style={
              nightMode
                ? {}
                : {
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(30px)",
                    WebkitBackdropFilter: "blur(30px)",
                  }
            }
          >
            <div className="text-6xl mb-4">👥</div>
            <p
              className={`font-bold text-lg mb-2 ${nightMode ? "text-slate-100" : "text-black"}`}
            >
              No groups yet
            </p>
            <p
              className={`text-sm mb-6 ${nightMode ? "text-slate-100/80" : "text-black/70"}`}
            >
              Create a group to connect with your faith community! Groups are
              invite-only and can be shared with friends.
            </p>
            <div
              className={`p-4 rounded-lg ${nightMode ? "bg-white/5" : "bg-blue-50/50"}`}
            >
              <p
                className={`text-xs font-medium ${nightMode ? "text-slate-100" : "text-slate-700"}`}
              >
                💡 Tip: Click the <span className="font-bold">+</span> button
                above to create your first group
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
                  setActiveView("chat");
                }}
                className={`w-full rounded-xl border p-4 text-left transition-all hover:-translate-y-1 ${nightMode ? "bg-white/5 border-white/10  " : "border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"}`}
                style={
                  nightMode
                    ? {}
                    : {
                        background: "rgba(255, 255, 255, 0.2)",
                        backdropFilter: "blur(30px)",
                        WebkitBackdropFilter: "blur(30px)",
                      }
                }
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{group.avatar_emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={
                          nightMode
                            ? "font-semibold text-slate-100"
                            : "font-semibold text-black"
                        }
                      >
                        {group.name}
                      </h3>
                      <RoleBadge role={group.userRole} size="xs" />
                    </div>
                    <p
                      className={
                        nightMode
                          ? "text-sm text-slate-100"
                          : "text-sm text-black"
                      }
                    >
                      {group.member_count} members
                    </p>
                  </div>
                  <ChevronRight
                    className={
                      nightMode
                        ? "w-5 h-5 text-slate-100"
                        : "w-5 h-5 text-slate-400"
                    }
                  />
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
