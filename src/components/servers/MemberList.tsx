import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Shield, UserX, ChevronDown } from 'lucide-react';

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

interface MemberListProps {
  nightMode: boolean;
  members: Member[];
  roles: MemberRole[];
  currentUserId: string;
  permissions: { manage_members: boolean; kick_members: boolean; manage_roles: boolean };
  onAssignRole: (userId: string, roleId: string) => void;
  onRemoveMember: (userId: string) => void;
  onBack: () => void;
}

const MemberList: React.FC<MemberListProps> = ({
  nightMode, members, roles, currentUserId, permissions,
  onAssignRole, onRemoveMember, onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

      {/* Search */}
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

      {/* Member list */}
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
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Individual member row ─── */

const MemberRow: React.FC<{
  member: Member; nightMode: boolean; canManage: boolean;
  roles: MemberRole[];
  permissions: { manage_members: boolean; kick_members: boolean; manage_roles: boolean };
  isDropdownOpen: boolean; onToggleDropdown: () => void;
  onAssignRole: (userId: string, roleId: string) => void;
  onRemoveMember: (userId: string) => void;
}> = ({ member, nightMode: nm, canManage, roles, permissions, isDropdownOpen, onToggleDropdown, onAssignRole, onRemoveMember }) => {
  const user = member.user;

  return (
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
        <p className={`text-sm font-semibold truncate ${nm ? 'text-white' : 'text-black'}`}>
          {user?.display_name || 'Unknown'}
        </p>
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
        </div>
      )}
    </div>
  );
};

export default MemberList;
