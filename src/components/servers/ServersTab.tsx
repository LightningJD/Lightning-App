import React, { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '../useUserProfile';
import { useGuestModalContext } from '../../contexts/GuestModalContext';
import {
  createServer,
  getUserServers,
  updateServer,
  deleteServer,
  generateInviteCode,
  createChannel,
  getChannelsByServer,
  getServerMembers,
  getServerRoles,
  getMemberPermissions,
  removeMember,
  assignRole,
  createRole,
  updateRole,
  deleteRole as deleteRoleDb,
  updateRolePermissions,
} from '../../lib/database';
import ServerSidebar from './ServerSidebar';
import ChannelSidebar from './ChannelSidebar';
import ChannelChat from './ChannelChat';
import CreateServerDialog from './CreateServerDialog';
import CreateChannelDialog from './CreateChannelDialog';
import ServerSettings from './ServerSettings';
import RoleManager from './RoleManager';
import MemberList from './MemberList';

interface ServersTabProps {
  nightMode: boolean;
}

type ViewMode = 'chat' | 'settings' | 'roles' | 'members';

const ServersTab: React.FC<ServersTabProps> = ({ nightMode }) => {
  const { profile } = useUserProfile();
  const { isGuest, checkAndShowModal } = useGuestModalContext() as { isGuest: boolean; checkAndShowModal: () => void };

  // Core state
  const [servers, setServers] = useState<any[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');

  // Server data
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>({
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
  });

  // Dialogs
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const activeServer = servers.find(s => s.id === activeServerId);

  // Block guests
  useEffect(() => {
    if (isGuest) {
      checkAndShowModal();
    }
  }, [isGuest, checkAndShowModal]);

  // Load user's servers
  useEffect(() => {
    const loadServers = async () => {
      if (!profile?.supabaseId) return;
      setLoading(true);
      const result = await getUserServers(profile.supabaseId);
      setServers(result || []);
      setLoading(false);

      // Auto-select first server
      if (result && result.length > 0 && !activeServerId) {
        setActiveServerId(result[0].id);
      }
    };
    loadServers();
  }, [profile?.supabaseId]);

  // Load channels when active server changes
  useEffect(() => {
    const loadChannels = async () => {
      if (!activeServerId) return;
      const result = await getChannelsByServer(activeServerId);
      setCategories(result.categories || []);
      setChannels(result.channels || []);

      // Auto-select first channel (general)
      if (result.channels && result.channels.length > 0) {
        setActiveChannelId(result.channels[0].id);
      } else {
        setActiveChannelId(null);
      }
    };
    loadChannels();
    setViewMode('chat');
  }, [activeServerId]);

  // Load members, roles, permissions when active server changes
  useEffect(() => {
    const loadServerData = async () => {
      if (!activeServerId || !profile?.supabaseId) return;

      const [membersResult, rolesResult, permsResult] = await Promise.all([
        getServerMembers(activeServerId),
        getServerRoles(activeServerId),
        getMemberPermissions(activeServerId, profile.supabaseId),
      ]);

      setMembers(membersResult || []);
      setRoles(rolesResult || []);
      if (permsResult?.permissions) {
        setPermissions(permsResult.permissions);
      }
    };
    loadServerData();
  }, [activeServerId, profile?.supabaseId]);

  // Handlers
  const handleCreateServer = useCallback(async (name: string, description: string, iconEmoji: string) => {
    if (!profile?.supabaseId) return;
    const result = await createServer(profile.supabaseId, { name, description, iconEmoji });
    if (result) {
      const refreshed = await getUserServers(profile.supabaseId);
      setServers(refreshed || []);
      setActiveServerId(result.id);
    }
  }, [profile?.supabaseId]);

  const handleSelectServer = useCallback((serverId: string) => {
    setActiveServerId(serverId);
    setViewMode('chat');
  }, []);

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId);
    setViewMode('chat');
  }, []);

  const handleCreateChannel = useCallback(async (name: string, topic: string, categoryId?: string) => {
    if (!activeServerId) return;
    const result = await createChannel(activeServerId, { name, topic, categoryId });
    if (result) {
      const refreshed = await getChannelsByServer(activeServerId);
      setCategories(refreshed.categories || []);
      setChannels(refreshed.channels || []);
      setActiveChannelId(result.id);
    }
  }, [activeServerId]);

  const handleOpenCreateChannel = useCallback((categoryId?: string) => {
    setCreateChannelCategoryId(categoryId);
    setShowCreateChannel(true);
  }, []);

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

  // If guest, show nothing (modal will appear)
  if (isGuest) return null;

  // Empty state - no servers
  if (!loading && servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6">
        <div className="text-6xl mb-5">{'\u{26EA}'}</div>
        <h2 className={`text-xl font-bold mb-2 ${nightMode ? 'text-white' : 'text-black'}`}>
          No Servers Yet
        </h2>
        <p className={`text-center mb-6 max-w-xs ${nightMode ? 'text-white/50' : 'text-black/50'}`}>
          Create a server for your church or community, or join one with an invite link.
        </p>
        <button
          onClick={() => setShowCreateServer(true)}
          className="px-8 py-3.5 rounded-xl text-white font-bold transition-all active:scale-95 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
          }}
        >
          Create a Server
        </button>

        <CreateServerDialog
          nightMode={nightMode}
          isOpen={showCreateServer}
          onClose={() => setShowCreateServer(false)}
          onCreate={handleCreateServer}
        />
      </div>
    );
  }

  // Render content area based on view mode
  const renderContent = () => {
    if (viewMode === 'settings' && activeServer) {
      return (
        <ServerSettings
          nightMode={nightMode}
          server={activeServer}
          permissions={permissions}
          onUpdate={handleUpdateServer}
          onDelete={handleDeleteServer}
          onBack={() => setViewMode('chat')}
          onGenerateInvite={handleGenerateInvite}
        />
      );
    }

    if (viewMode === 'roles') {
      return (
        <RoleManager
          nightMode={nightMode}
          serverId={activeServerId || ''}
          roles={roles}
          onCreateRole={handleCreateRole}
          onUpdateRole={handleUpdateRole}
          onDeleteRole={handleDeleteRole}
          onUpdatePermissions={handleUpdatePermissions}
          onBack={() => setViewMode('chat')}
        />
      );
    }

    if (viewMode === 'members') {
      return (
        <MemberList
          nightMode={nightMode}
          members={members}
          roles={roles}
          currentUserId={profile?.supabaseId || ''}
          permissions={permissions}
          onAssignRole={handleAssignRole}
          onRemoveMember={handleRemoveMember}
          onBack={() => setViewMode('chat')}
        />
      );
    }

    // Default: chat view
    if (activeChannelId) {
      const activeChannel = channels.find(c => c.id === activeChannelId);
      return (
        <ChannelChat
          nightMode={nightMode}
          channelId={activeChannelId}
          channelName={activeChannel?.name || 'general'}
          channelTopic={activeChannel?.topic}
          userId={profile?.supabaseId || ''}
          permissions={permissions}
        />
      );
    }

    // No channel selected
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">{'\u{1F4AC}'}</div>
          <p className={`text-sm ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
            Select a channel to start chatting
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Server sidebar (icons) */}
      <ServerSidebar
        nightMode={nightMode}
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={handleSelectServer}
        onCreateServer={() => setShowCreateServer(true)}
      />

      {/* Channel sidebar */}
      {activeServer && (
        <ChannelSidebar
          nightMode={nightMode}
          serverName={activeServer.name}
          serverEmoji={activeServer.icon_emoji || '\u{26EA}'}
          categories={categories}
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={handleOpenCreateChannel}
          onOpenSettings={() => setViewMode('settings')}
          onOpenRoles={() => setViewMode('roles')}
          onOpenMembers={() => setViewMode('members')}
          canManageChannels={permissions.manage_channels}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>

      {/* Dialogs */}
      <CreateServerDialog
        nightMode={nightMode}
        isOpen={showCreateServer}
        onClose={() => setShowCreateServer(false)}
        onCreate={handleCreateServer}
      />

      <CreateChannelDialog
        nightMode={nightMode}
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreate={handleCreateChannel}
        categories={categories}
        defaultCategoryId={createChannelCategoryId}
      />
    </div>
  );
};

export default ServersTab;
