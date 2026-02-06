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

  const nm = nightMode; // shorthand

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: nm ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: nm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
      >
        <button
          onClick={onBack}
          className={`p-1.5 rounded-lg transition-colors ${nm ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Shield className={`w-5 h-5 ${nm ? 'text-blue-400' : 'text-blue-600'}`} />
        <h2 className={`text-lg font-bold flex-1 ${nm ? 'text-white' : 'text-black'}`}>Members</h2>
        <span className={`text-sm ${nm ? 'text-white/40' : 'text-black/40'}`}>{members.length}</span>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
          nm ? 'bg-white/5 border-white/10' : 'bg-black/[0.03] border-black/10'
        }`}>
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
            <div className="flex items-center gap-2 px-1 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: group.role.color }}>
                {group.role.name}
              </span>
              <span className={`text-[11px] ${nm ? 'text-white/30' : 'text-black/30'}`}>
                — {group.members.length}
              </span>
            </div>
            <div className="space-y-1">
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
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
      nm ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'
    }`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.display_name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${
            nm ? 'bg-white/10 text-white' : 'bg-black/[0.06] text-black'
          }`}>
            {user?.avatar_emoji || user?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        {user?.is_online && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{ background: '#22c55e', borderColor: nm ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.75)' }}
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

      {/* Role badge */}
      {member.role && (
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color: member.role.color, background: `${member.role.color}18` }}
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
                className={`p-1.5 rounded-lg transition-colors ${
                  nm ? 'hover:bg-white/10 text-white/50 hover:text-white/80' : 'hover:bg-black/5 text-black/40 hover:text-black/70'
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              {isDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl shadow-xl border overflow-hidden"
                  style={{ background: nm ? '#1a1a2e' : '#ffffff', borderColor: nm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                >
                  <div className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ${
                    nm ? 'text-white/30' : 'text-black/30'
                  }`}>
                    Assign Role
                  </div>
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => { onAssignRole(member.user_id, role.id); onToggleDropdown(); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        role.id === member.role_id
                          ? nm ? 'bg-white/10' : 'bg-black/5'
                          : nm ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: role.color }} />
                      <span className={nm ? 'text-white' : 'text-black'}>{role.name}</span>
                      {role.id === member.role_id && (
                        <span className={`ml-auto text-xs ${nm ? 'text-white/30' : 'text-black/30'}`}>current</span>
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
              className={`p-1.5 rounded-lg transition-colors ${
                nm ? 'hover:bg-red-500/20 text-white/30 hover:text-red-400' : 'hover:bg-red-50 text-black/25 hover:text-red-500'
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
