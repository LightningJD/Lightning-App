import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Shield, UserX, ChevronDown, Ban, UserCheck, Clock } from 'lucide-react';

interface MemberUser {
  id: string; display_name: string; username: string;
  avatar_emoji?: string; avatar_url?: string; is_online?: boolean;
}

interface MemberRole {
  id: string; name: string; color: string; position: number;
}

interface Member {
  id: string; user_id: string; role_id: string;
  user?: MemberUser; role?: MemberRole;
}

interface BannedUser {
  id: string;
  user_id: string;
  reason?: string;
  banned_by: string;
  created_at: string;
  user?: { id: string; display_name: string; username: string; avatar_emoji?: string };
}

interface MemberListProps {
  nightMode: boolean;
  members: Member[];
  roles: MemberRole[];
  currentUserId: string;
  permissions: { manage_members: boolean; kick_members: boolean; manage_roles: boolean; ban_members?: boolean };
  onAssignRole: (userId: string, roleId: string) => void;
  onRemoveMember: (userId: string) => void;
  onBack: () => void;
  bans?: BannedUser[];
  onBanMember?: (userId: string, reason?: string) => void;
  onUnbanMember?: (userId: string) => void;
  onTimeoutMember?: (userId: string, durationMinutes: number, reason?: string) => void;
  onRemoveTimeout?: (userId: string) => void;
}

const MemberList: React.FC<MemberListProps> = ({
  nightMode, members, roles, currentUserId, permissions,
  onAssignRole, onRemoveMember, onBack, bans, onBanMember, onUnbanMember,
  onTimeoutMember, onRemoveTimeout
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showBanned, setShowBanned] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banConfirmUserId, setBanConfirmUserId] = useState<string | null>(null);
  const [timeoutConfirmUserId, setTimeoutConfirmUserId] = useState<string | null>(null);
  const [timeoutDuration, setTimeoutDuration] = useState(10);
  const [timeoutReason, setTimeoutReason] = useState('');

  const sortedRoles = useMemo(() => [...roles].sort((a, b) => b.position - a.position), [roles]);
  const currentMember = useMemo(() => members.find(m => m.user_id === currentUserId), [members, currentUserId]);
  const currentRolePosition = currentMember?.role?.position ?? -1;

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(m =>
      (m.user?.display_name?.toLowerCase() || '').includes(q) ||
      (m.user?.username?.toLowerCase() || '').includes(q)
    );
  }, [members, searchQuery]);

  const groupedByRole = useMemo(() => {
    const groups: { role: MemberRole; members: Member[] }[] = [];
    for (const role of sortedRoles) {
      const rm = filteredMembers.filter(m => m.role_id === role.id);
      if (rm.length > 0) groups.push({ role, members: rm });
    }
    const unmatched = filteredMembers.filter(m => !sortedRoles.some(r => r.id === m.role_id));
    if (unmatched.length > 0) {
      groups.push({ role: { id: '__none__', name: 'No Role', color: '#888888', position: -1 }, members: unmatched });
    }
    return groups;
  }, [sortedRoles, filteredMembers]);

  const canManage = (member: Member): boolean => {
    if (member.user_id === currentUserId) return false;
    if (!permissions.manage_members && !permissions.kick_members) return false;
    return currentRolePosition > (member.role?.position ?? -1);
  };

  const nm = nightMode;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: nm ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{
          borderBottom: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          background: nm ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)',
        }}
      >
        <button
          onClick={onBack}
          className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${nm ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
          }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <h2 className={`text-lg font-bold flex-1 ${nm ? 'text-white' : 'text-black'}`}>Members</h2>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            nm ? 'bg-white/10 text-white/50' : 'bg-black/5 text-black/50'
          }`}
        >
          {members.length}
        </span>
      </div>

      {/* Tabs: Members / Banned */}
      {permissions.ban_members && bans && (
        <div
          className="flex gap-1 px-4 py-2"
          style={{ borderBottom: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
        >
          <button
            onClick={() => setShowBanned(false)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              !showBanned
                ? nm ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
                : nm ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setShowBanned(true)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              showBanned
                ? 'bg-red-500/10 text-red-400'
                : nm ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
            }`}
          >
            Banned ({bans.length})
          </button>
        </div>
      )}

      {/* Search — only shown on Members tab */}
      {!showBanned && (
        <div className="px-4 py-3">
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full transition-all"
            style={{
              background: nm ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${nm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <Search className={`w-4 h-4 flex-shrink-0 ${nm ? 'text-white/30' : 'text-black/30'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className={`flex-1 bg-transparent outline-none text-sm ${
                nm ? 'text-white placeholder-white/30' : 'text-black placeholder-black/30'
              }`}
            />
          </div>
        </div>
      )}

      {/* Member list */}
      {!showBanned ? (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {groupedByRole.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className={`text-sm ${nm ? 'text-white/40' : 'text-black/40'}`}>No members found</p>
            </div>
          ) : groupedByRole.map(group => (
            <div key={group.role.id}>
              {/* Role group header */}
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: group.role.color, boxShadow: `0 0 8px ${group.role.color}40` }} />
                <span className="text-xs font-bold" style={{ color: group.role.color }}>
                  {group.role.name}
                </span>
                <span className={`text-xs ${nm ? 'text-white/30' : 'text-black/30'}`}>
                  {group.members.length}
                </span>
              </div>
              {/* Members in glass card */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: nm ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${nm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                {group.members.map(member => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    nightMode={nm}
                    canManage={canManage(member)}
                    roles={sortedRoles}
                    permissions={permissions}
                    isDropdownOpen={openDropdown === member.id}
                    onToggleDropdown={() => setOpenDropdown(prev => prev === member.id ? null : member.id)}
                    onAssignRole={onAssignRole}
                    onRemoveMember={onRemoveMember}
                    canBan={!!permissions.ban_members && !!onBanMember && member.user_id !== currentUserId}
                    onBanMember={onBanMember}
                    banConfirmUserId={banConfirmUserId}
                    onSetBanConfirm={setBanConfirmUserId}
                    banReasonInput={banReasonInput}
                    onSetBanReason={setBanReasonInput}
                    onTimeoutMember={onTimeoutMember}
                    timeoutConfirmUserId={timeoutConfirmUserId}
                    onSetTimeoutConfirm={setTimeoutConfirmUserId}
                    timeoutDuration={timeoutDuration}
                    onSetTimeoutDuration={setTimeoutDuration}
                    timeoutReason={timeoutReason}
                    onSetTimeoutReason={setTimeoutReason}
                    onRemoveTimeout={onRemoveTimeout}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Banned Users list */
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {(!bans || bans.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Ban className={`w-10 h-10 mb-3 ${nm ? 'text-white/15' : 'text-black/10'}`} />
              <p className={`text-sm ${nm ? 'text-white/40' : 'text-black/40'}`}>No banned users</p>
            </div>
          ) : bans.map(ban => (
            <div
              key={ban.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all`}
              style={{
                background: nm ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${nm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
              }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{
                  background: nm
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
                }}
              >
                {ban.user?.avatar_emoji || '\u{1F6AB}'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${nm ? 'text-white' : 'text-black'}`}>
                  {ban.user?.display_name || 'Unknown'}
                </p>
                <p className={`text-xs truncate ${nm ? 'text-white/40' : 'text-black/40'}`}>
                  @{ban.user?.username || 'unknown'}
                </p>
                {ban.reason && (
                  <p className={`text-xs mt-0.5 truncate ${nm ? 'text-red-300/50' : 'text-red-600/50'}`}>
                    Reason: {ban.reason}
                  </p>
                )}
              </div>

              {/* Unban button */}
              {onUnbanMember && (
                <button
                  onClick={() => onUnbanMember(ban.user_id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 hover:scale-[1.02] ${
                    nm ? 'bg-green-500/10 text-green-400 hover:bg-green-500/15' : 'bg-green-500/10 text-green-600 hover:bg-green-500/15'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" /> Unban
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Individual member row ─── */

const MemberRow: React.FC<{
  member: Member; nightMode: boolean; canManage: boolean;
  roles: MemberRole[];
  permissions: { manage_members: boolean; kick_members: boolean; manage_roles: boolean; ban_members?: boolean };
  isDropdownOpen: boolean; onToggleDropdown: () => void;
  onAssignRole: (userId: string, roleId: string) => void;
  onRemoveMember: (userId: string) => void;
  canBan?: boolean;
  onBanMember?: (userId: string, reason?: string) => void;
  banConfirmUserId?: string | null;
  onSetBanConfirm?: (userId: string | null) => void;
  banReasonInput?: string;
  onSetBanReason?: (reason: string) => void;
  onTimeoutMember?: (userId: string, durationMinutes: number, reason?: string) => void;
  timeoutConfirmUserId?: string | null;
  onSetTimeoutConfirm?: (userId: string | null) => void;
  timeoutDuration?: number;
  onSetTimeoutDuration?: (d: number) => void;
  timeoutReason?: string;
  onSetTimeoutReason?: (r: string) => void;
  onRemoveTimeout?: (userId: string) => void;
}> = ({ member, nightMode: nm, canManage, roles, permissions, isDropdownOpen, onToggleDropdown, onAssignRole, onRemoveMember, canBan, onBanMember, banConfirmUserId, onSetBanConfirm, banReasonInput, onSetBanReason, onTimeoutMember, timeoutConfirmUserId, onSetTimeoutConfirm, timeoutDuration, onSetTimeoutDuration, timeoutReason, onSetTimeoutReason, onRemoveTimeout }) => {
  const user = member.user;
  const showBanConfirm = banConfirmUserId === member.user_id && canBan && onBanMember && onSetBanConfirm && onSetBanReason;
  const timedOutUntil = (member as any).timed_out_until;
  const isTimedOut = timedOutUntil && new Date(timedOutUntil) > new Date();
  const showTimeoutConfirm = timeoutConfirmUserId === member.user_id && onTimeoutMember && onSetTimeoutConfirm && onSetTimeoutDuration && onSetTimeoutReason;

  return (
    <div>
      <div className={`flex items-center gap-3 px-4 py-3 transition-all ${
        nm ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'
      }`}>
        {/* Avatar — Lightning gradient style */}
        <div className="relative flex-shrink-0">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.display_name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{
                background: nm
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))'
                  : 'linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03))',
              }}
            >
              {user?.avatar_emoji || user?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          {user?.is_online && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
              style={{
                background: '#22c55e',
                borderColor: nm ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
              }}
            />
          )}
        </div>

        {/* Name & username */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-sm font-semibold truncate ${nm ? 'text-white' : 'text-black'}`}>
              {user?.display_name || 'Unknown'}
            </p>
            {isTimedOut && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  color: nm ? '#f59e0b' : '#d97706',
                  background: nm ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${nm ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                Timed out
              </span>
            )}
          </div>
          <p className={`text-xs truncate ${nm ? 'text-white/40' : 'text-black/40'}`}>
            @{user?.username || 'unknown'}
          </p>
        </div>

        {/* Role badge — pill style */}
        {member.role && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              color: member.role.color,
              background: `${member.role.color}15`,
              border: `1px solid ${member.role.color}30`,
            }}
          >
            {member.role.name}
          </span>
        )}

        {/* Management controls */}
        {canManage && (
          <div className="relative flex items-center gap-1 flex-shrink-0">
            {permissions.manage_roles && (
              <div className="relative">
                <button
                  onClick={onToggleDropdown}
                  className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                    nm ? 'hover:bg-white/10 text-white/50 hover:text-white/80' : 'hover:bg-black/5 text-black/40 hover:text-black/70'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 z-30 w-48 rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                      background: nm ? 'rgba(20, 20, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(30px)',
                      WebkitBackdropFilter: 'blur(30px)',
                      border: `1px solid ${nm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      boxShadow: nm ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div className={`px-4 py-2.5 text-xs font-bold ${nm ? 'text-white/40' : 'text-black/40'}`}>
                      Assign Role
                    </div>
                    {roles.map(role => (
                      <button
                        key={role.id}
                        onClick={() => { onAssignRole(member.user_id, role.id); onToggleDropdown(); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-all ${
                          role.id === member.role_id
                            ? nm ? 'bg-white/10' : 'bg-black/5'
                            : nm ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: role.color, boxShadow: `0 0 6px ${role.color}40` }} />
                        <span className={nm ? 'text-white' : 'text-black'}>{role.name}</span>
                        {role.id === member.role_id && (
                          <span className={`ml-auto text-xs font-semibold ${nm ? 'text-white/30' : 'text-black/30'}`}>current</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {permissions.kick_members && (
              <button
                onClick={() => onRemoveMember(member.user_id)}
                className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                  nm ? 'hover:bg-red-500/15 text-white/30 hover:text-red-400' : 'hover:bg-red-50 text-black/25 hover:text-red-500'
                }`}
                title="Remove member"
              >
                <UserX className="w-4 h-4" />
              </button>
            )}
            {canBan && onBanMember && onSetBanConfirm && (
              <button
                onClick={() => onSetBanConfirm(banConfirmUserId === member.user_id ? null : member.user_id)}
                className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                  nm ? 'hover:bg-red-500/15 text-white/30 hover:text-red-400' : 'hover:bg-red-50 text-black/25 hover:text-red-500'
                }`}
                title="Ban member"
              >
                <Ban className="w-4 h-4" />
              </button>
            )}
            {canManage && onSetTimeoutConfirm && (isTimedOut ? (
              onRemoveTimeout && (
                <button
                  onClick={() => onRemoveTimeout(member.user_id)}
                  className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                    nm ? 'hover:bg-amber-500/15 text-amber-400/60 hover:text-amber-400' : 'hover:bg-amber-50 text-amber-500/50 hover:text-amber-600'
                  }`}
                  title="Remove timeout"
                >
                  <Clock className="w-4 h-4" />
                </button>
              )
            ) : (
              onTimeoutMember && (
                <button
                  onClick={() => onSetTimeoutConfirm(timeoutConfirmUserId === member.user_id ? null : member.user_id)}
                  className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                    nm ? 'hover:bg-amber-500/15 text-white/30 hover:text-amber-400' : 'hover:bg-amber-50 text-black/25 hover:text-amber-500'
                  }`}
                  title="Timeout member"
                >
                  <Clock className="w-4 h-4" />
                </button>
              )
            ))}
          </div>
        )}
      </div>

      {/* Ban confirmation — rendered below the member row */}
      {showBanConfirm && (
        <div
          className="px-4 pb-3 pt-2 mx-4 mb-2 rounded-xl"
          style={{
            background: nm ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
            border: `1px solid ${nm ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.1)'}`,
          }}
        >
          <p className={`text-xs font-semibold mb-1.5 ${nm ? 'text-red-300' : 'text-red-600'}`}>
            Ban {member.user?.display_name || 'this user'}?
          </p>
          <input
            type="text"
            value={banReasonInput || ''}
            onChange={(e) => onSetBanReason(e.target.value)}
            placeholder="Reason (optional)..."
            className={`w-full px-3 py-1.5 rounded-lg text-xs mb-2 ${
              nm ? 'text-white placeholder-white/30 bg-white/5 border border-white/10'
              : 'text-black placeholder-black/30 bg-white/50 border border-black/10'
            }`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onBanMember(member.user_id, banReasonInput || undefined);
                onSetBanConfirm(null);
                onSetBanReason('');
              }}
              className="flex-1 py-1.5 rounded-lg text-white text-xs font-bold transition-all active:scale-95"
              style={{ background: 'rgba(239,68,68,0.85)' }}
            >
              Confirm Ban
            </button>
            <button
              onClick={() => { onSetBanConfirm(null); onSetBanReason(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                nm ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeout confirmation — rendered below the member row */}
      {showTimeoutConfirm && (
        <div
          className="px-4 pb-3 pt-2 mx-4 mb-2 rounded-xl"
          style={{
            background: nm ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
            border: `1px solid ${nm ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.1)'}`,
          }}
        >
          <p className={`text-xs font-semibold mb-1.5 ${nm ? 'text-amber-300' : 'text-amber-600'}`}>
            Timeout {member.user?.display_name || 'this user'}?
          </p>
          <select
            value={timeoutDuration ?? 10}
            onChange={(e) => onSetTimeoutDuration(Number(e.target.value))}
            className={`w-full px-3 py-1.5 rounded-lg text-xs mb-2 ${
              nm ? 'text-white bg-white/5 border border-white/10'
              : 'text-black bg-white/50 border border-black/10'
            }`}
          >
            <option value={1}>1 minute</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={360}>6 hours</option>
            <option value={1440}>1 day</option>
            <option value={10080}>1 week</option>
          </select>
          <input
            type="text"
            value={timeoutReason || ''}
            onChange={(e) => onSetTimeoutReason(e.target.value)}
            placeholder="Reason (optional)..."
            className={`w-full px-3 py-1.5 rounded-lg text-xs mb-2 ${
              nm ? 'text-white placeholder-white/30 bg-white/5 border border-white/10'
              : 'text-black placeholder-black/30 bg-white/50 border border-black/10'
            }`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onTimeoutMember(member.user_id, timeoutDuration ?? 10, timeoutReason || undefined);
                onSetTimeoutConfirm(null);
                onSetTimeoutDuration(10);
                onSetTimeoutReason('');
              }}
              className="flex-1 py-1.5 rounded-lg text-white text-xs font-bold transition-all active:scale-95"
              style={{ background: 'rgba(245,158,11,0.85)' }}
            >
              Confirm Timeout
            </button>
            <button
              onClick={() => { onSetTimeoutConfirm(null); onSetTimeoutDuration(10); onSetTimeoutReason(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                nm ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberList;
