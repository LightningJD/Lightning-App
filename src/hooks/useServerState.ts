import { useState, useEffect, useCallback } from 'react';
import { showSuccess, showError } from '../lib/toast';
import {
  createServer,
  getUserServers,
  updateServer,
  deleteServer,
  generateInviteCode,
  createChannel,
  getChannelsByServer,
  updateChannel,
  deleteChannel as deleteChannelDb,
  getServerMembers,
  getServerRoles,
  getMemberPermissions,
  removeMember,
  assignRole,
  createRole,
  updateRole,
  deleteRole as deleteRoleDb,
  updateRolePermissions,
  createCategory,
  updateCategory,
  deleteCategory as deleteCategoryDb,
  reorderCategories,
  reorderChannels,
  banMember,
  unbanMember,
  getServerBans,
  getUnreadCounts,
  markChannelRead,
  getPendingInviteRequests,
  approveInviteRequest,
  rejectInviteRequest,
  joinByInviteCode,
} from '../lib/database';

// ── Types ──────────────────────────────────────────────────────

interface UseServerStateOptions {
  supabaseId?: string;
  initialServerId?: string;
  onActiveServerChange?: (serverName: string | null, serverEmoji?: string) => void;
}

const DEFAULT_PERMISSIONS = {
  manage_server: false,
  manage_channels: false,
  manage_roles: false,
  manage_members: false,
  send_messages: true,
  pin_messages: false,
  delete_messages: false,
  create_invite: false,
  kick_members: false,
  ban_members: false,
};

// ── Hook ───────────────────────────────────────────────────────

export function useServerState({
  supabaseId,
  initialServerId,
  onActiveServerChange,
}: UseServerStateOptions) {
  // Core state
  const [servers, setServers] = useState<any[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(initialServerId || null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'settings' | 'roles' | 'members'>('chat');
  const [loading, setLoading] = useState(true);

  // Server data
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>({ ...DEFAULT_PERMISSIONS });

  // Ban state
  const [bans, setBans] = useState<any[]>([]);

  // Unread counts
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Invite requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Join by invite code
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Dialogs
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState<string | undefined>();

  // Derived
  const activeServer = servers.find(s => s.id === activeServerId);

  // ── Sync from parent ─────────────────────────────────────────

  useEffect(() => {
    if (initialServerId && initialServerId !== activeServerId) {
      setActiveServerId(initialServerId);
      setActiveChannelId(null);
      setViewMode('chat');
    }
  }, [initialServerId]);

  // ── Notify parent of active server name changes ──────────────

  useEffect(() => {
    if (onActiveServerChange) {
      if (activeServer) {
        onActiveServerChange(activeServer.name, activeServer.icon_emoji);
      } else {
        onActiveServerChange(null);
      }
    }
  }, [activeServer?.id, activeServer?.name, onActiveServerChange]);

  // ── Load user's servers ──────────────────────────────────────

  useEffect(() => {
    const loadServers = async () => {
      if (!supabaseId) return;
      setLoading(true);
      const result = await getUserServers(supabaseId);
      setServers(result || []);
      setLoading(false);

      // Auto-select first server
      if (result && result.length > 0 && !activeServerId) {
        setActiveServerId(result[0].id);
      }
    };
    loadServers();
  }, [supabaseId]);

  // ── Load channels when active server changes ─────────────────

  useEffect(() => {
    const loadChannels = async () => {
      if (!activeServerId) return;
      const result = await getChannelsByServer(activeServerId);
      setCategories(result.categories || []);
      setChannels(result.channels || []);

      // Auto-select first channel
      if (result.channels && result.channels.length > 0) {
        setActiveChannelId(result.channels[0].id);
      } else {
        setActiveChannelId(null);
      }
    };
    loadChannels();
    setViewMode('chat');
  }, [activeServerId]);

  // ── Load members, roles, permissions, pending requests ───────

  useEffect(() => {
    const loadServerData = async () => {
      if (!activeServerId || !supabaseId) return;

      const [membersResult, rolesResult, permsResult, pendingResult] = await Promise.all([
        getServerMembers(activeServerId),
        getServerRoles(activeServerId),
        getMemberPermissions(activeServerId, supabaseId),
        getPendingInviteRequests(activeServerId),
      ]);

      setMembers(membersResult || []);
      setRoles(rolesResult || []);
      setPendingRequests(pendingResult || []);
      if (permsResult?.permissions) {
        setPermissions(permsResult.permissions);
      }
    };
    loadServerData();
  }, [activeServerId, supabaseId]);

  // ── Load unread counts (polls every 10s) ─────────────────────

  useEffect(() => {
    const loadUnreadCounts = async () => {
      if (!activeServerId || !supabaseId) return;
      const counts = await getUnreadCounts(activeServerId, supabaseId);
      setUnreadCounts(counts || {});
    };
    loadUnreadCounts();
    const interval = setInterval(loadUnreadCounts, 10000);
    return () => clearInterval(interval);
  }, [activeServerId, supabaseId]);

  // ── Load bans ────────────────────────────────────────────────

  useEffect(() => {
    const loadBans = async () => {
      if (!activeServerId || !permissions.ban_members) return;
      const result = await getServerBans(activeServerId);
      setBans(result || []);
    };
    loadBans();
  }, [activeServerId, permissions.ban_members]);

  // ── Server Handlers ──────────────────────────────────────────

  const handleCreateServer = useCallback(async (name: string, description: string, iconEmoji: string) => {
    if (!supabaseId) return;
    const result = await createServer(supabaseId, { name, description, iconEmoji });
    if (result) {
      const refreshed = await getUserServers(supabaseId);
      setServers(refreshed || []);
      setActiveServerId(result.id);
    }
  }, [supabaseId]);

  const handleUpdateServer = useCallback(async (updates: any) => {
    if (!activeServerId) return;
    const result = await updateServer(activeServerId, updates);
    if (result) {
      setServers(prev => prev.map(s => s.id === activeServerId ? { ...s, ...result } : s));
    }
  }, [activeServerId]);

  const handleDeleteServer = useCallback(async () => {
    if (!activeServerId) return;
    const result = await deleteServer(activeServerId);
    if (result) {
      setServers(prev => {
        const remaining = prev.filter(s => s.id !== activeServerId);
        setActiveServerId(remaining.length > 0 ? remaining[0]?.id || null : null);
        return remaining;
      });
      setViewMode('chat');
    }
  }, [activeServerId]);

  const handleGenerateInvite = useCallback(async (): Promise<string | null> => {
    if (!activeServerId) return null;
    const code = await generateInviteCode(activeServerId);
    if (code) {
      setServers(prev => prev.map(s => s.id === activeServerId ? { ...s, invite_code: code } : s));
    }
    return code;
  }, [activeServerId]);

  const handleShareInvite = useCallback(async () => {
    const server = servers.find(s => s.id === activeServerId);
    if (!server?.invite_code) {
      const code = await handleGenerateInvite();
      if (code) {
        try {
          await navigator.clipboard.writeText(code);
          showSuccess('Invite code copied!');
        } catch { /* clipboard unavailable */ }
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(server.invite_code);
      showSuccess('Invite code copied!');
    } catch { /* clipboard unavailable */ }
  }, [activeServerId, servers, handleGenerateInvite]);

  // ── Invite Request Handlers ──────────────────────────────────

  const handleApproveRequest = useCallback(async (requestId: string) => {
    if (!supabaseId || !activeServerId) return;
    const success = await approveInviteRequest(requestId, supabaseId);
    if (success) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      const refreshed = await getServerMembers(activeServerId);
      setMembers(refreshed || []);
    }
  }, [supabaseId, activeServerId]);

  const handleRejectRequest = useCallback(async (requestId: string) => {
    if (!supabaseId) return;
    const success = await rejectInviteRequest(requestId, supabaseId);
    if (success) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    }
  }, [supabaseId]);

  const handleJoinByCode = useCallback(async () => {
    if (!supabaseId || !joinCode.trim()) return;
    setJoining(true);
    try {
      const result = await joinByInviteCode(joinCode.trim(), supabaseId);
      if (!result) {
        showError('Invalid invite code. Please check and try again.');
      } else if (result.status === 'already_member') {
        showSuccess('You\'re already a member of this server!');
        setShowJoinDialog(false);
        setJoinCode('');
      } else if (result.status === 'already_pending') {
        showError('You already have a pending request for this server.');
      } else if (result.status === 'pending') {
        showSuccess('Join request sent! An admin will review it.');
        setShowJoinDialog(false);
        setJoinCode('');
      }
    } catch {
      showError('Something went wrong. Please try again.');
    }
    setJoining(false);
  }, [supabaseId, joinCode]);

  // ── Channel Selection ────────────────────────────────────────

  const handleSelectChannel = useCallback((channelId: string, setMobileViewFn?: (view: string) => void) => {
    setActiveChannelId(channelId);
    setViewMode('chat');
    if (setMobileViewFn) setMobileViewFn('chat');
    // Mark as read and clear unread count
    if (supabaseId) {
      markChannelRead(channelId, supabaseId).catch(() => {});
    }
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, [supabaseId]);

  const handleOpenCreateChannel = useCallback((categoryId?: string) => {
    setCreateChannelCategoryId(categoryId);
    setShowCreateChannel(true);
  }, []);

  const handleCreateChannel = useCallback(async (name: string, topic: string, categoryId?: string, emojiIcon?: string) => {
    if (!activeServerId) return;
    const result = await createChannel(activeServerId, { name, topic, categoryId, emojiIcon });
    if (result) {
      const refreshed = await getChannelsByServer(activeServerId);
      setCategories(refreshed.categories || []);
      setChannels(refreshed.channels || []);
      setActiveChannelId(result.id);
    }
  }, [activeServerId]);

  // ── Channel edit/delete/reorder ──────────────────────────────

  const refreshChannels = useCallback(async () => {
    if (!activeServerId) return;
    const result = await getChannelsByServer(activeServerId);
    setCategories(result.categories || []);
    setChannels(result.channels || []);
  }, [activeServerId]);

  const handleUpdateChannel = useCallback(async (channelId: string, updates: any) => {
    await updateChannel(channelId, updates);
    await refreshChannels();
  }, [refreshChannels]);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    await deleteChannelDb(channelId);
    const result = await getChannelsByServer(activeServerId || '');
    const refreshedChannels = result.channels || [];
    setCategories(result.categories || []);
    setChannels(refreshedChannels);
    if (activeChannelId === channelId) {
      setActiveChannelId(refreshedChannels.length > 0 ? refreshedChannels[0].id : null);
    }
  }, [activeServerId, activeChannelId]);

  const handleReorderChannels = useCallback(async (orderedIds: string[], categoryId: string | null) => {
    if (!activeServerId) return;
    await reorderChannels(activeServerId, orderedIds, categoryId);
    await refreshChannels();
  }, [activeServerId, refreshChannels]);

  const handleMoveChannelToCategory = useCallback(async (channelId: string, targetCategoryId: string | null) => {
    const targetChannels = channels.filter(c =>
      (c.category_id || null) === targetCategoryId && c.id !== channelId
    );
    const orderedIds = [...targetChannels.sort((a: any, b: any) => a.position - b.position).map((c: any) => c.id), channelId];
    await handleReorderChannels(orderedIds, targetCategoryId);
  }, [channels, handleReorderChannels]);

  // ── Category Handlers ────────────────────────────────────────

  const handleCreateCategory = useCallback(async (name: string) => {
    if (!activeServerId) return;
    await createCategory(activeServerId, name);
    await refreshChannels();
  }, [activeServerId, refreshChannels]);

  const handleRenameCategory = useCallback(async (categoryId: string, newName: string) => {
    await updateCategory(categoryId, { name: newName });
    await refreshChannels();
  }, [refreshChannels]);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    await deleteCategoryDb(categoryId);
    await refreshChannels();
  }, [refreshChannels]);

  const handleReorderCategories = useCallback(async (orderedIds: string[]) => {
    if (!activeServerId) return;
    await reorderCategories(activeServerId, orderedIds);
    await refreshChannels();
  }, [activeServerId, refreshChannels]);

  // ── Role Handlers ────────────────────────────────────────────

  const handleAssignRole = useCallback(async (userId: string, roleId: string) => {
    if (!activeServerId) return;
    await assignRole(activeServerId, userId, roleId);
    const refreshed = await getServerMembers(activeServerId);
    setMembers(refreshed || []);
  }, [activeServerId]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!activeServerId) return;
    await removeMember(activeServerId, userId);
    const refreshed = await getServerMembers(activeServerId);
    setMembers(refreshed || []);
  }, [activeServerId]);

  const handleCreateRole = useCallback(async (name: string, color: string) => {
    if (!activeServerId) return;
    await createRole(activeServerId, { name, color });
    const refreshed = await getServerRoles(activeServerId);
    setRoles(refreshed || []);
  }, [activeServerId]);

  const handleUpdateRole = useCallback(async (roleId: string, updates: any) => {
    if (!activeServerId) return;
    await updateRole(roleId, updates);
    const refreshed = await getServerRoles(activeServerId);
    setRoles(refreshed || []);
  }, [activeServerId]);

  const handleDeleteRole = useCallback(async (roleId: string) => {
    if (!activeServerId) return;
    await deleteRoleDb(roleId, activeServerId);
    const refreshed = await getServerRoles(activeServerId);
    setRoles(refreshed || []);
  }, [activeServerId]);

  const handleUpdatePermissions = useCallback(async (roleId: string, perms: any) => {
    await updateRolePermissions(roleId, perms);
    if (activeServerId) {
      const refreshed = await getServerRoles(activeServerId);
      setRoles(refreshed || []);
    }
  }, [activeServerId]);

  // ── Ban Handlers ─────────────────────────────────────────────

  const handleBanMember = useCallback(async (memberId: string, reason?: string) => {
    if (!activeServerId || !supabaseId) return;
    await banMember(activeServerId, memberId, supabaseId, reason);
    const [refreshedMembers, refreshedBans] = await Promise.all([
      getServerMembers(activeServerId),
      getServerBans(activeServerId),
    ]);
    setMembers(refreshedMembers || []);
    setBans(refreshedBans || []);
  }, [activeServerId, supabaseId]);

  const handleUnbanMember = useCallback(async (userId: string) => {
    if (!activeServerId) return;
    await unbanMember(activeServerId, userId);
    const refreshedBans = await getServerBans(activeServerId);
    setBans(refreshedBans || []);
  }, [activeServerId]);

  return {
    // Core state
    servers, activeServerId, setActiveServerId,
    activeChannelId, setActiveChannelId,
    viewMode, setViewMode,
    loading,
    activeServer,

    // Server data
    categories, channels, members, roles, permissions,
    bans,
    unreadCounts, setUnreadCounts,
    pendingRequests,

    // Join dialog
    showJoinDialog, setShowJoinDialog,
    joinCode, setJoinCode,
    joining,

    // Create dialogs
    showCreateServer, setShowCreateServer,
    showCreateChannel, setShowCreateChannel,
    createChannelCategoryId,

    // Server handlers
    handleCreateServer, handleUpdateServer, handleDeleteServer,
    handleGenerateInvite, handleShareInvite,

    // Invite request handlers
    handleApproveRequest, handleRejectRequest, handleJoinByCode,

    // Channel handlers
    handleSelectChannel, handleOpenCreateChannel, handleCreateChannel,
    handleUpdateChannel, handleDeleteChannel,
    handleReorderChannels, handleMoveChannelToCategory,

    // Category handlers
    handleCreateCategory, handleRenameCategory,
    handleDeleteCategory, handleReorderCategories,

    // Role handlers
    handleAssignRole, handleRemoveMember,
    handleCreateRole, handleUpdateRole, handleDeleteRole,
    handleUpdatePermissions,

    // Ban handlers
    handleBanMember, handleUnbanMember,
  };
}
