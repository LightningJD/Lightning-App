import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Hash, Link } from 'lucide-react';
import { useUserProfile } from '../useUserProfile';
import { useGuestModalContext } from '../../contexts/GuestModalContext';
import { usePremium } from '../../contexts/PremiumContext';
import { useServerState } from '../../hooks/useServerState';
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
  onActiveServerChange?: (serverName: string | null, serverEmoji?: string) => void;
  initialServerId?: string;
  onBack?: () => void;
  hideServerRail?: boolean;
}

const ServersTab: React.FC<ServersTabProps> = ({ nightMode, onActiveServerChange, initialServerId, onBack, hideServerRail }) => {
  const { profile } = useUserProfile();
  const { isGuest, checkAndShowModal } = useGuestModalContext() as { isGuest: boolean; checkAndShowModal: () => void };
  const { isServerPremium } = usePremium();

  // All server state + handlers from the hook
  const sv = useServerState({
    supabaseId: profile?.supabaseId,
    initialServerId,
    onActiveServerChange,
  });

  // Mobile responsive
  type MobileView = 'servers' | 'channels' | 'chat';
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [mobileView, setMobileView] = useState<MobileView>('channels');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Block guests
  useEffect(() => {
    if (isGuest) {
      checkAndShowModal();
    }
  }, [isGuest, checkAndShowModal]);

  // Server selection handler (wraps hook + mobile view logic)
  const handleSelectServer = useCallback((serverId: string) => {
    if (isMobile && serverId === sv.activeServerId) {
      if (mobileView === 'channels' && sv.activeChannelId) {
        setMobileView('chat');
      } else {
        setMobileView('channels');
      }
      return;
    }
    sv.setActiveServerId(serverId);
    sv.setViewMode('chat');
    if (isMobile) setMobileView('channels');
  }, [isMobile, sv.activeServerId, mobileView, sv.activeChannelId]);

  // Channel selection handler (wraps hook + mobile view logic)
  const handleSelectChannel = useCallback((channelId: string) => {
    sv.handleSelectChannel(channelId, isMobile ? (v: string) => setMobileView(v as MobileView) : undefined);
  }, [sv.handleSelectChannel, isMobile]);

  const handleBackFromContent = useCallback(() => {
    sv.setViewMode('chat');
    if (isMobile) setMobileView('channels');
  }, [isMobile]);

  // If guest, show nothing (modal will appear)
  if (isGuest) return null;

  // Empty state - no servers
  if (!sv.loading && sv.servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6">
        <div className="text-6xl mb-5">{'\u{26EA}'}</div>
        <h2 className={`text-xl font-bold mb-2 ${nightMode ? 'text-white' : 'text-black'}`}>
          No Servers Yet
        </h2>
        <p className={`text-center mb-6 max-w-xs ${nightMode ? 'text-white/50' : 'text-black/50'}`}>
          Create a server for your church or community, or join one with an invite link.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => sv.setShowCreateServer(true)}
            className="px-6 py-3.5 rounded-xl text-white font-bold transition-all active:scale-95 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
            }}
          >
            Create Server
          </button>
          <button
            onClick={() => sv.setShowJoinDialog(true)}
            className={`px-6 py-3.5 rounded-xl font-bold transition-all active:scale-95 hover:scale-[1.02] flex items-center gap-2 ${
              nightMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/5 text-black hover:bg-black/10'
            }`}
          >
            <Link className="w-4 h-4" /> Join
          </button>
        </div>

        {/* Join by Invite Code Dialog */}
        {sv.showJoinDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) { sv.setShowJoinDialog(false); sv.setJoinCode(''); } }}
          >
            <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
              style={{
                background: nightMode ? 'rgba(15,15,25,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <div className="p-6" style={{ background: 'linear-gradient(135deg, rgba(79,150,255,0.15) 0%, rgba(59,130,246,0.05) 100%)' }}>
                <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-black'}`}>Join a Server</h2>
                <p className={`text-sm mt-1 ${nightMode ? 'text-white/50' : 'text-black/50'}`}>
                  Enter an invite code to request to join
                </p>
              </div>
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  value={sv.joinCode}
                  onChange={e => sv.setJoinCode(e.target.value)}
                  placeholder="Enter invite code"
                  className={`w-full px-4 py-3 rounded-xl text-sm font-mono ${nightMode ? 'text-white placeholder-white/30' : 'text-black placeholder-black/40'}`}
                  style={{
                    background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { sv.setShowJoinDialog(false); sv.setJoinCode(''); }}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95 ${nightMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sv.handleJoinByCode}
                    disabled={sv.joining || !sv.joinCode.trim()}
                    className="flex-1 py-3 rounded-xl text-white font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
                      boxShadow: sv.joinCode.trim() ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                    }}
                  >
                    {sv.joining ? 'Joining...' : 'Join Server'}
                  </button>
                </div>
                <p className={`text-xs text-center ${nightMode ? 'text-white/30' : 'text-black/30'}`}>
                  An admin will need to approve your request to join
                </p>
              </div>
            </div>
          </div>
        )}

        <CreateServerDialog
          nightMode={nightMode}
          isOpen={sv.showCreateServer}
          onClose={() => sv.setShowCreateServer(false)}
          onCreate={sv.handleCreateServer}
        />
      </div>
    );
  }

  // Render content area based on view mode
  const renderContent = () => {
    if (sv.viewMode === 'settings' && sv.activeServer) {
      return (
        <ServerSettings
          nightMode={nightMode}
          server={sv.activeServer}
          permissions={sv.permissions}
          onUpdate={sv.handleUpdateServer}
          onDelete={sv.handleDeleteServer}
          onBack={handleBackFromContent}
          onGenerateInvite={sv.handleGenerateInvite}
          pendingRequests={sv.pendingRequests}
          onApproveRequest={sv.handleApproveRequest}
          onRejectRequest={sv.handleRejectRequest}
        />
      );
    }

    if (sv.viewMode === 'roles') {
      return (
        <RoleManager
          nightMode={nightMode}
          serverId={sv.activeServerId || ''}
          roles={sv.roles}
          onCreateRole={sv.handleCreateRole}
          onUpdateRole={sv.handleUpdateRole}
          onDeleteRole={sv.handleDeleteRole}
          onUpdatePermissions={sv.handleUpdatePermissions}
          onBack={handleBackFromContent}
        />
      );
    }

    if (sv.viewMode === 'members') {
      return (
        <MemberList
          nightMode={nightMode}
          members={sv.members}
          roles={sv.roles}
          currentUserId={profile?.supabaseId || ''}
          permissions={sv.permissions}
          onAssignRole={sv.handleAssignRole}
          onRemoveMember={sv.handleRemoveMember}
          onBack={handleBackFromContent}
          bans={sv.bans}
          onBanMember={sv.handleBanMember}
          onUnbanMember={sv.handleUnbanMember}
        />
      );
    }

    // Default: chat view
    if (sv.activeChannelId) {
      const activeChannel = sv.channels.find(c => c.id === sv.activeChannelId);
      return (
        <ChannelChat
          nightMode={nightMode}
          channelId={sv.activeChannelId}
          channelName={activeChannel?.name || 'general'}
          channelTopic={activeChannel?.topic}
          userId={profile?.supabaseId || ''}
          userDisplayName={profile?.displayName || profile?.username || 'You'}
          serverId={sv.activeServerId || undefined}
          members={sv.members}
          permissions={sv.permissions}
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

  // Active channel name for mobile header
  const activeChannel = sv.channels.find(c => c.id === sv.activeChannelId);

  // Shared ChannelSidebar props
  const channelSidebarProps = {
    nightMode,
    serverName: sv.activeServer?.name || '',
    serverEmoji: sv.activeServer?.icon_emoji || '\u{26EA}',
    serverId: sv.activeServer?.id || '',
    categories: sv.categories,
    channels: sv.channels,
    activeChannelId: sv.activeChannelId,
    onSelectChannel: handleSelectChannel,
    onCreateChannel: sv.handleOpenCreateChannel,
    onShareInvite: sv.handleShareInvite,
    canManageChannels: sv.permissions.manage_channels,
    onCreateCategory: sv.handleCreateCategory,
    onRenameCategory: sv.handleRenameCategory,
    onDeleteCategory: sv.handleDeleteCategory,
    onReorderCategories: sv.handleReorderCategories,
    onUpdateChannel: sv.handleUpdateChannel,
    onDeleteChannel: sv.handleDeleteChannel,
    onReorderChannels: sv.handleReorderChannels,
    onMoveChannelToCategory: sv.handleMoveChannelToCategory,
    unreadCounts: sv.unreadCounts,
    roles: sv.roles,
    channelAccess: sv.channelAccess,
  };

  // ── MOBILE LAYOUT ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className={`flex flex-col ${hideServerRail ? 'flex-1' : ''} h-full`} style={hideServerRail ? {} : { height: 'calc(100vh - 120px)' }}>
        {/* Mobile: Servers sidebar + Channels list */}
        {(mobileView === 'servers' || mobileView === 'channels') && (
          <div className="flex flex-row h-full">
            {/* Server icons sidebar — hidden when parent provides its own rail */}
            {!hideServerRail && <div
              className="flex flex-col items-center gap-2 py-2 px-1.5 overflow-y-auto flex-shrink-0"
              style={{
                width: '56px',
                background: nightMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)',
                borderRight: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              {sv.servers.map((server) => (
                <div key={server.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => handleSelectServer(server.id)}
                    className={`w-11 h-11 flex items-center justify-center text-lg flex-shrink-0 transition-all active:scale-95 ${
                      sv.activeServerId === server.id
                        ? 'rounded-2xl'
                        : 'rounded-full hover:rounded-2xl'
                    }`}
                    style={{
                      background: sv.activeServerId === server.id
                        ? nightMode ? 'rgba(79,150,255,0.3)' : 'rgba(79,150,255,0.2)'
                        : nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      boxShadow: sv.activeServerId === server.id ? '0 2px 8px rgba(59,130,246,0.2)' : 'none',
                    }}
                    title={server.name}
                  >
                    {server.icon_url ? (
                      <img src={server.icon_url} alt={server.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      server.icon_emoji || '\u{26EA}'
                    )}
                  </button>
                  {isServerPremium(server.id) && (
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #F59E0B 0%, #EAB308 100%)',
                        boxShadow: '0 1px 3px rgba(245, 158, 11, 0.4)',
                        border: `2px solid ${nightMode ? '#0a0a0a' : '#E8F3FE'}`,
                      }}
                    >
                      <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
              <div className={`w-8 h-px my-1 ${nightMode ? 'bg-white/10' : 'bg-black/10'}`} />
              <button
                onClick={() => sv.setShowCreateServer(true)}
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 text-xl ${
                  nightMode ? 'bg-white/10 text-green-400 hover:bg-green-500/20 hover:rounded-2xl' : 'bg-black/5 text-green-600 hover:bg-green-500/10 hover:rounded-2xl'
                }`}
              >
                +
              </button>
            </div>}

            {/* Channel list (fills remaining width) */}
            {sv.activeServer && (
              <div className="flex-1 overflow-y-auto">
                <ChannelSidebar
                  {...channelSidebarProps}
                  onOpenSettings={() => { sv.setViewMode('settings'); setMobileView('chat'); }}
                  onOpenRoles={() => { sv.setViewMode('roles'); setMobileView('chat'); }}
                  onOpenMembers={() => { sv.setViewMode('members'); setMobileView('chat'); }}
                  fullWidth
                />
              </div>
            )}
          </div>
        )}

        {/* Mobile: Chat / Settings / Roles / Members view (full screen with back button) */}
        {mobileView === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Mobile header with back button */}
            {sv.viewMode === 'chat' && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
                style={{
                  background: nightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)',
                  borderBottom: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <button
                  onClick={() => setMobileView('channels')}
                  className={`p-1.5 rounded-lg transition-all active:scale-95 ${nightMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                >
                  <ArrowLeft className={`w-5 h-5 ${nightMode ? 'text-white' : 'text-black'}`} />
                </button>
                <Hash className={`w-4 h-4 ${nightMode ? 'text-white/50' : 'text-black/40'}`} />
                <span className={`font-semibold text-sm ${nightMode ? 'text-white' : 'text-black'}`}>
                  {activeChannel?.name || 'general'}
                </span>
                {activeChannel?.topic && (
                  <span className={`text-xs truncate ml-1 ${nightMode ? 'text-white/30' : 'text-black/30'}`}>
                    {activeChannel.topic}
                  </span>
                )}
              </div>
            )}

            {/* Content area (full width) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderContent()}
            </div>
          </div>
        )}

        {/* Dialogs */}
        <CreateServerDialog
          nightMode={nightMode}
          isOpen={sv.showCreateServer}
          onClose={() => sv.setShowCreateServer(false)}
          onCreate={sv.handleCreateServer}
        />
        <CreateChannelDialog
          nightMode={nightMode}
          isOpen={sv.showCreateChannel}
          onClose={() => sv.setShowCreateChannel(false)}
          onCreate={sv.handleCreateChannel}
          categories={sv.categories}
          defaultCategoryId={sv.createChannelCategoryId}
          roles={sv.roles}
        />
      </div>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────
  return (
    <div className={`flex ${hideServerRail ? 'flex-1' : ''} h-full`} style={hideServerRail ? {} : { height: 'calc(100vh - 120px)' }}>
      {/* Server sidebar (icons) — hidden when parent provides its own rail */}
      {!hideServerRail && <ServerSidebar
        nightMode={nightMode}
        servers={sv.servers}
        activeServerId={sv.activeServerId}
        onSelectServer={handleSelectServer}
        onCreateServer={() => sv.setShowCreateServer(true)}
      />}

      {/* Channel sidebar */}
      {sv.activeServer && (
        <ChannelSidebar
          {...channelSidebarProps}
          onOpenSettings={() => sv.setViewMode('settings')}
          onOpenRoles={() => sv.setViewMode('roles')}
          onOpenMembers={() => sv.setViewMode('members')}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>

      {/* Dialogs */}
      <CreateServerDialog
        nightMode={nightMode}
        isOpen={sv.showCreateServer}
        onClose={() => sv.setShowCreateServer(false)}
        onCreate={sv.handleCreateServer}
      />

      <CreateChannelDialog
        nightMode={nightMode}
        isOpen={sv.showCreateChannel}
        onClose={() => sv.setShowCreateChannel(false)}
        onCreate={sv.handleCreateChannel}
        categories={sv.categories}
        defaultCategoryId={sv.createChannelCategoryId}
        roles={sv.roles}
      />
    </div>
  );
};

export default ServersTab;
