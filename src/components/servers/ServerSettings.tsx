import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  Trash2,
  Shield,
  Check,
  X,
  UserPlus,
  Clock,
  Crown,
  Image as ImageIcon,
  MessageSquare,
  Bell,
  ArrowRightLeft,
} from "lucide-react";
import SubscriptionSettings from "../premium/SubscriptionSettings";
import CosmeticsEditor from "../premium/CosmeticsEditor";
import { useUserProfile } from "../useUserProfile";
import { uploadServerIcon } from "../../lib/cloudinary";
import { showError, showSuccess } from "../../lib/toast";
import { transferServerOwnership } from "../../lib/database";

interface ServerSettingsProps {
  nightMode: boolean;
  server: {
    id: string;
    name: string;
    description?: string;
    icon_emoji: string;
    icon_url?: string;
    banner_url?: string;
    invite_code?: string;
    is_private: boolean;
    member_count: number;
    welcome_enabled?: boolean;
    welcome_message?: string;
    default_notification_level?: string;
  };
  permissions: {
    manage_server: boolean;
    manage_channels: boolean;
    manage_members: boolean;
    create_invite: boolean;
  };
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onBack: () => void;
  onGenerateInvite: () => Promise<string | null>;
  pendingRequests?: any[];
  onApproveRequest?: (requestId: string) => Promise<void>;
  onRejectRequest?: (requestId: string) => Promise<void>;
}

const SERVER_EMOJIS = [
  "\u{26EA}",
  "\u{271D}\u{FE0F}",
  "\u{1F54A}\u{FE0F}",
  "\u{1F64F}",
  "\u{2B50}",
  "\u{1F525}",
  "\u{1F492}",
  "\u{1F4D6}",
  "\u{1F31F}",
  "\u{1F49C}",
  "\u{1F3E0}",
  "\u{1F3B5}",
];

const ServerSettings: React.FC<ServerSettingsProps> = ({
  nightMode,
  server,
  permissions,
  onUpdate,
  onDelete,
  onBack,
  onGenerateInvite,
  pendingRequests = [],
  onApproveRequest,
  onRejectRequest,
}) => {
  const { profile } = useUserProfile();
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || "");
  const [iconEmoji, setIconEmoji] = useState(server.icon_emoji);
  const [inviteCode, setInviteCode] = useState(server.invite_code || "");
  const [copied, setCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [iconUrl, setIconUrl] = useState(server.icon_url || "");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [welcomeEnabled, setWelcomeEnabled] = useState(
    server.welcome_enabled ?? false,
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    server.welcome_message || "",
  );
  const [defaultNotification, setDefaultNotification] = useState(
    server.default_notification_level || "all",
  );
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");

  useEffect(() => {
    const changed =
      name !== server.name ||
      description !== (server.description || "") ||
      iconEmoji !== server.icon_emoji;
    setHasChanges(changed);
  }, [name, description, iconEmoji, server]);

  const handleSave = () => {
    if (!name.trim()) return;
    onUpdate({
      name: name.trim(),
      description: description.trim(),
      icon_emoji: iconEmoji,
      icon_url: iconUrl || null,
    });
    setHasChanges(false);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError("Image must be under 10MB");
      return;
    }
    setUploadingIcon(true);
    try {
      const url = await uploadServerIcon(file);
      setIconUrl(url);
      onUpdate({ icon_url: url });
    } catch (err) {
      console.error("Icon upload failed:", err);
      showError("Failed to upload icon. Please try again.");
    }
    setUploadingIcon(false);
    e.target.value = "";
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard API may not be available */
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    const code = await onGenerateInvite();
    if (code) setInviteCode(code);
    setGeneratingInvite(false);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) onDelete();
    else setShowDeleteConfirm(true);
  };

  const nm = nightMode;
  const cardStyle = {
    background: nm ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
    border: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  const inputStyle = {
    background: nm ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)",
    border: `1px solid ${nm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        background: nm ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 sticky top-0 z-10"
        style={{
          background: nm ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.7)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          borderBottom: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <button
          onClick={onBack}
          className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${nm ? "hover:bg-white/10" : "hover:bg-black/5"}`}
        >
          <ArrowLeft
            className={`w-5 h-5 ${nm ? "text-white" : "text-black"}`}
          />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)",
            boxShadow: "0 2px 8px rgba(59,130,246,0.25)",
          }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <h2 className={`text-lg font-bold ${nm ? "text-white" : "text-black"}`}>
          Server Settings
        </h2>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Server Icon */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <span
            className={`block text-sm font-semibold mb-3 ${nm ? "text-white/70" : "text-black/70"}`}
          >
            Server Icon
          </span>
          <div className="flex flex-wrap gap-2.5">
            {SERVER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIconEmoji(emoji)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all duration-300 hover:scale-110 active:scale-95"
                style={{
                  background:
                    iconEmoji === emoji
                      ? "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)"
                      : nm
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  boxShadow:
                    iconEmoji === emoji
                      ? "0 0 16px rgba(79,150,255,0.35)"
                      : "none",
                  border:
                    iconEmoji === emoji
                      ? "2px solid rgba(79,150,255,0.5)"
                      : `2px solid ${nm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          {/* Custom image upload */}
          <div className="mt-3 flex items-center gap-3">
            {iconUrl && (
              <img
                src={iconUrl}
                alt="Server icon"
                className="w-11 h-11 rounded-full object-cover"
                style={{
                  border: `2px solid ${nm ? "rgba(79,150,255,0.5)" : "rgba(79,150,255,0.3)"}`,
                }}
              />
            )}
            <label
              htmlFor="server-icon"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${nm ? "bg-white/10 text-white/70 hover:bg-white/15" : "bg-black/5 text-black/60 hover:bg-black/10"}`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {uploadingIcon
                ? "Uploading..."
                : iconUrl
                  ? "Change Image"
                  : "Upload Image"}
              <input
                id="server-icon"
                type="file"
                accept="image/*"
                onChange={handleIconUpload}
                className="hidden"
                disabled={uploadingIcon}
              />
            </label>
            {iconUrl && (
              <button
                onClick={() => {
                  setIconUrl("");
                  onUpdate({ icon_url: null });
                }}
                className={`text-xs ${nm ? "text-white/30 hover:text-white/50" : "text-black/30 hover:text-black/50"}`}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Server Name */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <label
            htmlFor="server-name"
            className={`block text-sm font-semibold mb-2 ${nm ? "text-white/70" : "text-black/70"}`}
          >
            Server Name
          </label>
          <input
            type="text"
            id="server-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Server name"
            maxLength={50}
            className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${nm ? "text-white placeholder-white/30" : "text-black placeholder-black/40"}`}
            style={inputStyle}
            disabled={!permissions.manage_server}
          />
        </div>

        {/* Description */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <label
            htmlFor="server-description"
            className={`block text-sm font-semibold mb-2 ${nm ? "text-white/70" : "text-black/70"}`}
          >
            Description{" "}
            <span
              className={`font-normal ${nm ? "text-white/30" : "text-black/30"}`}
            >
              (optional)
            </span>
          </label>
          <textarea
            id="server-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's your server about?"
            rows={3}
            maxLength={200}
            className={`w-full px-4 py-3 rounded-xl text-sm resize-none transition-all ${nm ? "text-white placeholder-white/30" : "text-black placeholder-black/40"}`}
            style={inputStyle}
            disabled={!permissions.manage_server}
          />
        </div>

        {/* Invite Code */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <span
            className={`block text-sm font-semibold mb-3 ${nm ? "text-white/70" : "text-black/70"}`}
          >
            Invite Code
          </span>
          {inviteCode ? (
            <div className="flex items-center gap-2">
              <div
                className={`flex-1 px-4 py-2.5 rounded-xl font-mono text-sm truncate ${nm ? "text-white/70" : "text-black/60"}`}
                style={{
                  background: nm
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.03)",
                }}
              >
                {inviteCode}
              </div>
              <button
                onClick={handleCopyInvite}
                className="p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: copied
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(79,150,255,0.12)",
                }}
              >
                <Copy
                  className="w-4 h-4"
                  style={{ color: copied ? "#22c55e" : "#4F96FF" }}
                />
              </button>
              {permissions.create_invite && (
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{ background: "rgba(79,150,255,0.12)" }}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${generatingInvite ? "animate-spin" : ""}`}
                    style={{ color: "#4F96FF" }}
                  />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p
                className={`flex-1 text-sm ${nm ? "text-white/40" : "text-black/40"}`}
              >
                No invite code generated yet
              </p>
              {permissions.create_invite && (
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)",
                    boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
                  }}
                >
                  {generatingInvite ? "Generating..." : "Generate New"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pending Join Requests (admin/owner only) */}
        {permissions.manage_members && pendingRequests.length > 0 && (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <div
              className={`block text-sm font-semibold mb-3 ${nm ? "text-white/70" : "text-black/70"}`}
            >
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Pending Join Requests
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  }}
                >
                  {pendingRequests.length}
                </span>
              </span>
            </div>
            <div className="space-y-2.5">
              {pendingRequests.map((req: any) => {
                const user = req.user;
                const displayName =
                  user?.display_name || user?.username || "Unknown";
                const avatar = user?.avatar_emoji || "👤";
                const avatarUrl = user?.avatar_url;
                const requestDate = new Date(
                  req.created_at,
                ).toLocaleDateString();

                return (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: nm
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)",
                      border: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{
                        background: nm
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                      }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        avatar
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${nm ? "text-white" : "text-black"}`}
                      >
                        {displayName}
                      </p>
                      <p
                        className={`text-xs flex items-center gap-1 ${nm ? "text-white/40" : "text-black/40"}`}
                      >
                        <Clock className="w-3 h-3" /> {requestDate}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onApproveRequest?.(req.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        style={{ background: "rgba(34,197,94,0.15)" }}
                        title="Approve"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </button>
                      <button
                        onClick={() => onRejectRequest?.(req.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        style={{ background: "rgba(239,68,68,0.15)" }}
                        title="Reject"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Server Info */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <span
            className={`block text-sm font-semibold mb-2 ${nm ? "text-white/70" : "text-black/70"}`}
          >
            Server Info
          </span>
          <div
            className={`text-sm space-y-1 ${nm ? "text-white/40" : "text-black/40"}`}
          >
            <p>Members: {server.member_count}</p>
            <p>Visibility: {server.is_private ? "Private" : "Public"}</p>
          </div>
        </div>

        {/* Welcome Message */}
        {permissions.manage_server && (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <span
                className={`flex items-center gap-2 text-sm font-semibold ${nm ? "text-white/70" : "text-black/70"}`}
              >
                <MessageSquare className="w-4 h-4" />
                Welcome Message
              </span>
              <button
                onClick={() => {
                  setWelcomeEnabled(!welcomeEnabled);
                  onUpdate({ welcome_enabled: !welcomeEnabled });
                }}
                className={`w-10 h-6 rounded-full transition-colors relative ${welcomeEnabled ? "bg-blue-500" : nm ? "bg-white/20" : "bg-black/20"}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${welcomeEnabled ? "translate-x-5" : "translate-x-1"}`}
                />
              </button>
            </div>
            {welcomeEnabled && (
              <>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  onBlur={() => onUpdate({ welcome_message: welcomeMessage })}
                  placeholder="Welcome to {server}! We're glad you're here, {user}!"
                  rows={3}
                  maxLength={500}
                  className={`w-full px-4 py-3 rounded-xl text-sm resize-none transition-all ${nm ? "text-white placeholder-white/30" : "text-black placeholder-black/40"}`}
                  style={inputStyle}
                />
                <p
                  className={`text-xs mt-2 ${nm ? "text-white/30" : "text-black/30"}`}
                >
                  Use {"{user}"} for the member's name, {"{server}"} for server
                  name
                </p>
              </>
            )}
          </div>
        )}

        {/* Default Notification Level */}
        {permissions.manage_server && (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <label
              htmlFor="default-notification-level"
              className={`flex items-center gap-2 text-sm font-semibold mb-3 ${nm ? "text-white/70" : "text-black/70"}`}
            >
              <Bell className="w-4 h-4" />
              Default Notifications
            </label>
            <select
              id="default-notification-level"
              value={defaultNotification}
              onChange={(e) => {
                setDefaultNotification(e.target.value);
                onUpdate({ default_notification_level: e.target.value });
              }}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${nm ? "text-white" : "text-black"}`}
              style={inputStyle}
            >
              <option value="all">All Messages</option>
              <option value="mentions">Only @Mentions</option>
              <option value="none">Nothing</option>
            </select>
            <p
              className={`text-xs mt-2 ${nm ? "text-white/30" : "text-black/30"}`}
            >
              New members will use this notification setting by default
            </p>
          </div>
        )}

        {/* Premium & Billing */}
        {permissions.manage_server && (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <SubscriptionSettings
              nightMode={nm}
              serverId={server.id}
              serverName={server.name}
              memberCount={server.member_count}
              userEmail={profile?.email || ""}
              userId={profile?.supabaseId || ""}
            />
          </div>
        )}

        {/* Customization (Cosmetics) */}
        {permissions.manage_server && (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <CosmeticsEditor
              nightMode={nm}
              serverId={server.id}
              serverName={server.name}
            />
          </div>
        )}

        {/* Save Button */}
        {permissions.manage_server && (
          <button
            onClick={handleSave}
            disabled={!hasChanges || !name.trim()}
            className="w-full py-3.5 rounded-xl text-white font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 hover:scale-[1.02]"
            style={{
              background:
                hasChanges && name.trim()
                  ? "linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)"
                  : nm
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
              boxShadow:
                hasChanges && name.trim()
                  ? "0 4px 16px rgba(59,130,246,0.35)"
                  : "none",
            }}
          >
            Save Changes
          </button>
        )}

        {/* Danger Zone — collapsed by default */}
        {permissions.manage_server && (
          <div className="mt-8">
            <button
              onClick={() => setShowDangerZone(!showDangerZone)}
              className={`text-xs transition-all ${nm ? "text-white/20 hover:text-white/40" : "text-black/20 hover:text-black/40"}`}
            >
              {showDangerZone ? "Hide danger zone" : "Danger zone..."}
            </button>

            {showDangerZone && (
              <div
                className="mt-3 rounded-2xl p-5"
                style={{
                  background: nm
                    ? "rgba(239,68,68,0.06)"
                    : "rgba(239,68,68,0.04)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <p
                  className={`text-xs mb-3 ${nm ? "text-red-300/40" : "text-red-500/40"}`}
                >
                  This action is permanent and cannot be undone.
                </p>
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="text-xs font-medium transition-all active:scale-95 px-3 py-1.5 rounded-lg mr-2 mb-2 flex items-center gap-1.5"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    color: nm ? "rgba(245,158,11,0.7)" : "rgba(245,158,11,0.8)",
                  }}
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  Transfer Ownership
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteConfirmName("");
                  }}
                  className="text-xs font-medium transition-all active:scale-95 px-3 py-1.5 rounded-lg"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    color: nm ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.6)",
                  }}
                >
                  Delete Server
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            role="presentation"
            onClick={() => {
              setShowTransferModal(false);
              setTransferUserId("");
            }}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: nm ? "rgba(20,20,30,0.95)" : "rgba(255,255,255,0.95)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: `1px solid ${nm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="px-6 pt-6 pb-3 text-center"
              style={{
                background: nm
                  ? "rgba(245,158,11,0.06)"
                  : "rgba(245,158,11,0.04)",
              }}
            >
              <div
                className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <ArrowRightLeft className="w-6 h-6 text-amber-400" />
              </div>
              <h3
                className={`text-lg font-bold ${nm ? "text-white" : "text-black"}`}
              >
                Transfer Ownership
              </h3>
              <p
                className={`text-sm mt-1 ${nm ? "text-white/50" : "text-black/50"}`}
              >
                This will make another member the owner of {server.name}. You
                will be demoted to Admin.
              </p>
            </div>
            <div className="px-6 py-4">
              <p
                className={`text-xs mb-2 ${nm ? "text-white/50" : "text-black/50"}`}
              >
                Enter the user ID of the new owner:
              </p>
              <input
                type="text"
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                placeholder="User ID"
                className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${nm ? "text-white placeholder-white/20" : "text-black placeholder-black/20"}`}
                style={{
                  background: nm
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  border: `1px solid ${nm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                }}
                autoFocus
              />
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferUserId("");
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  nm
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-black/5 text-black hover:bg-black/10"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!transferUserId.trim() || !profile?.supabaseId) return;
                  const success = await transferServerOwnership(
                    server.id,
                    profile.supabaseId,
                    transferUserId.trim(),
                  );
                  if (success) {
                    showSuccess("Ownership transferred successfully");
                    setShowTransferModal(false);
                    setTransferUserId("");
                    onUpdate({}); // Trigger refresh
                  } else {
                    showError(
                      "Transfer failed. Make sure the user is a server member.",
                    );
                  }
                }}
                disabled={!transferUserId.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                style={{
                  background: transferUserId.trim()
                    ? "rgba(245,158,11,0.85)"
                    : "rgba(245,158,11,0.3)",
                  boxShadow: transferUserId.trim()
                    ? "0 2px 8px rgba(245,158,11,0.3)"
                    : "none",
                }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            role="presentation"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: nm ? "rgba(20,20,30,0.95)" : "rgba(255,255,255,0.95)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: `1px solid ${nm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            {/* Header */}
            <div
              className="px-6 pt-6 pb-3 text-center"
              style={{
                background: nm
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(239,68,68,0.04)",
              }}
            >
              <div
                className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3
                className={`text-lg font-bold ${nm ? "text-white" : "text-black"}`}
              >
                Delete {server.name}?
              </h3>
              <p
                className={`text-sm mt-1 ${nm ? "text-white/50" : "text-black/50"}`}
              >
                All channels, messages, members, and data will be permanently
                lost.
              </p>
            </div>

            {/* Type to confirm */}
            <div className="px-6 py-4">
              <p
                className={`text-xs mb-2 ${nm ? "text-white/50" : "text-black/50"}`}
              >
                Type{" "}
                <span
                  className={`font-bold ${nm ? "text-red-400" : "text-red-500"}`}
                >
                  {server.name}
                </span>{" "}
                to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={server.name}
                className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${nm ? "text-white placeholder-white/20" : "text-black placeholder-black/20"}`}
                style={{
                  background: nm
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  border: `1px solid ${
                    deleteConfirmName === server.name
                      ? "rgba(239,68,68,0.5)"
                      : nm
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.08)"
                  }`,
                }}
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmName("");
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  nm
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-black/5 text-black hover:bg-black/10"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                disabled={deleteConfirmName !== server.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                style={{
                  background:
                    deleteConfirmName === server.name
                      ? "rgba(239,68,68,0.85)"
                      : "rgba(239,68,68,0.3)",
                  boxShadow:
                    deleteConfirmName === server.name
                      ? "0 2px 8px rgba(239,68,68,0.3)"
                      : "none",
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerSettings;
