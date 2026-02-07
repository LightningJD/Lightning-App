import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Shield, Edit3, Check, X, Palette } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  permissions?: any;
}

interface RoleManagerProps {
  nightMode: boolean;
  serverId?: string;
  roles: Role[];
  onCreateRole: (name: string, color: string) => void;
  onUpdateRole?: (roleId: string, updates: any) => void;
  onDeleteRole: (roleId: string) => void;
  onUpdatePermissions: (roleId: string, permissions: any) => void;
  onBack: () => void;
}

const PERMISSION_KEYS = [
  'manage_server', 'manage_channels', 'manage_roles', 'manage_members',
  'send_messages', 'pin_messages', 'delete_messages', 'create_invite',
  'kick_members', 'ban_members',
] as const;

const PERMISSION_LABELS: Record<string, string> = {
  manage_server: 'Manage Server', manage_channels: 'Manage Channels',
  manage_roles: 'Manage Roles', manage_members: 'Manage Members',
  send_messages: 'Send Messages', pin_messages: 'Pin Messages',
  delete_messages: 'Delete Messages', create_invite: 'Create Invite',
  kick_members: 'Kick Members', ban_members: 'Ban Members',
};

const ROLE_COLORS = ['#F1C40F', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22', '#1ABC9C', '#99AAB5'];

const RoleManager: React.FC<RoleManagerProps> = ({
  nightMode, serverId: _serverId, roles, onCreateRole, onUpdateRole,
  onDeleteRole, onUpdatePermissions, onBack,
}) => {
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Role renaming state
  const [renamingRoleId, setRenamingRoleId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingColorRoleId, setEditingColorRoleId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input when editing
  useEffect(() => {
    if (renamingRoleId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingRoleId]);

  const nm = nightMode;

  const cardStyle = {
    background: nm ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
    border: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
    backdropFilter: 'blur(20px)' as const,
    WebkitBackdropFilter: 'blur(20px)',
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    onCreateRole(newRoleName.trim(), newRoleColor);
    setNewRoleName('');
    setNewRoleColor(ROLE_COLORS[0]);
    setShowCreateForm(false);
  };

  const handleTogglePermission = (roleId: string, permKey: string, currentPerms: any) => {
    onUpdatePermissions(roleId, { ...currentPerms, [permKey]: !currentPerms[permKey] });
  };

  const handleDeleteRole = (roleId: string) => {
    if (deleteConfirmId === roleId) {
      onDeleteRole(roleId);
      setDeleteConfirmId(null);
      if (expandedRoleId === roleId) setExpandedRoleId(null);
    } else {
      setDeleteConfirmId(roleId);
    }
  };

  const handleStartRename = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setRenamingRoleId(roleId);
      setRenameValue(role.name);
    }
  };

  const handleConfirmRename = () => {
    if (renamingRoleId && renameValue.trim() && onUpdateRole) {
      onUpdateRole(renamingRoleId, { name: renameValue.trim() });
    }
    setRenamingRoleId(null);
    setRenameValue('');
  };

  const handleChangeColor = (roleId: string, color: string) => {
    if (onUpdateRole) {
      onUpdateRole(roleId, { color });
    }
    setEditingColorRoleId(null);
  };

  const toggleExpanded = (roleId: string) => {
    setExpandedRoleId(expandedRoleId === roleId ? null : roleId);
    setDeleteConfirmId(null);
  };

  const sortedRoles = [...roles].sort((a, b) => b.position - a.position);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        background: nm ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 sticky top-0 z-10"
        style={{
          background: nm ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderBottom: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <button onClick={onBack} className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${nm ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
          <ArrowLeft className={`w-5 h-5 ${nm ? 'text-white' : 'text-black'}`} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>
          <Shield className="w-4 h-4 text-white" />
        </div>
        <h2 className={`text-lg font-bold flex-1 ${nm ? 'text-white' : 'text-black'}`}>Manage Roles</h2>
        <button onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-2 rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{ background: 'rgba(79,150,255,0.12)', color: '#4F96FF' }}>
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {/* Create Role Form */}
        {showCreateForm && (
          <div className="rounded-2xl p-5 space-y-4" style={{
            background: nm ? 'rgba(79,150,255,0.06)' : 'rgba(79,150,255,0.04)',
            border: '1px solid rgba(79,150,255,0.15)',
          }}>
            <label className={`block text-sm font-semibold ${nm ? 'text-white/70' : 'text-black/70'}`}>New Role</label>
            <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name" maxLength={30}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${nm ? 'text-white placeholder-white/30' : 'text-black placeholder-black/40'}`}
              style={{ background: nm ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)', border: `1px solid ${nm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}
            />
            <div>
              <label className={`block text-xs mb-2 ${nm ? 'text-white/40' : 'text-black/40'}`}>Color</label>
              <div className="flex gap-2.5 flex-wrap">
                {ROLE_COLORS.map(color => (
                  <button key={color} onClick={() => setNewRoleColor(color)}
                    className={`w-9 h-9 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${newRoleColor === color ? 'scale-110' : ''}`}
                    style={{
                      background: color,
                      boxShadow: newRoleColor === color ? `0 0 16px ${color}60` : 'none',
                      border: newRoleColor === color ? `2px solid white` : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreateRole} disabled={!newRoleName.trim()}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
                Create Role
              </button>
              <button onClick={() => { setShowCreateForm(false); setNewRoleName(''); setNewRoleColor(ROLE_COLORS[0]); }}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${nm ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/5 text-black hover:bg-black/10'}`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Roles List */}
        {sortedRoles.map(role => {
          const isExpanded = expandedRoleId === role.id;
          const perms = role.permissions || {};

          return (
            <div key={role.id} className="rounded-2xl overflow-hidden transition-all" style={cardStyle}>
              {/* Role Header */}
              {renamingRoleId === role.id ? (
                <div className="flex items-center gap-2 px-5 py-3.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: role.color, boxShadow: `0 0 8px ${role.color}40` }} />
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename();
                      if (e.key === 'Escape') { setRenamingRoleId(null); setRenameValue(''); }
                    }}
                    onBlur={handleConfirmRename}
                    className={`flex-1 text-sm font-semibold px-2 py-1 rounded-lg outline-none ${
                      nm
                        ? 'bg-white/10 text-white border border-white/20 focus:border-blue-400'
                        : 'bg-white/60 text-black border border-black/10 focus:border-blue-500'
                    }`}
                    maxLength={30}
                  />
                  <button
                    onClick={handleConfirmRename}
                    className="p-1 rounded-lg text-green-500 hover:bg-green-500/10 transition-all"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setRenamingRoleId(null); setRenameValue(''); }}
                    className={`p-1 rounded-lg transition-all ${nm ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-0">
                  <button onClick={() => toggleExpanded(role.id)}
                    className={`flex-1 flex items-center gap-3 px-5 py-3.5 transition-all ${nm ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'}`}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: role.color, boxShadow: `0 0 8px ${role.color}40` }} />
                    <span className={`flex-1 text-left font-semibold text-sm ${nm ? 'text-white' : 'text-black'}`}>{role.name}</span>
                    {role.is_default && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${nm ? 'bg-white/10 text-white/40' : 'bg-black/5 text-black/40'}`}>
                        default
                      </span>
                    )}
                    {isExpanded ? <ChevronDown className={`w-4 h-4 ${nm ? 'text-white/40' : 'text-black/40'}`} /> : <ChevronRight className={`w-4 h-4 ${nm ? 'text-white/40' : 'text-black/40'}`} />}
                  </button>

                  {/* Rename & Color buttons */}
                  {!role.is_default && onUpdateRole && (
                    <div className="flex items-center gap-0.5 pr-3">
                      <button
                        onClick={() => handleStartRename(role.id)}
                        className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                          nm ? 'text-white/25 hover:text-white/60 hover:bg-white/5' : 'text-black/20 hover:text-black/50 hover:bg-black/5'
                        }`}
                        title="Rename role"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingColorRoleId(editingColorRoleId === role.id ? null : role.id)}
                        className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                          nm ? 'text-white/25 hover:text-white/60 hover:bg-white/5' : 'text-black/20 hover:text-black/50 hover:bg-black/5'
                        }`}
                        title="Change color"
                      >
                        <Palette className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Color picker for role */}
              {editingColorRoleId === role.id && (
                <div className="px-5 pb-3 pt-1">
                  <div className="flex gap-2 flex-wrap">
                    {ROLE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => handleChangeColor(role.id, color)}
                        className={`w-7 h-7 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                          role.color === color ? 'ring-2 ring-offset-1 ring-blue-400' : ''
                        }`}
                        style={{ background: color, boxShadow: role.color === color ? `0 0 12px ${color}60` : 'none' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Expanded Permissions */}
              {isExpanded && (
                <div className="px-5 pb-4 space-y-3" style={{ borderTop: `1px solid ${nm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                  <div className="pt-3">
                    <label className={`block text-xs font-semibold mb-2.5 ${nm ? 'text-white/40' : 'text-black/40'}`}>Permissions</label>
                    <div className="grid grid-cols-1 gap-1">
                      {PERMISSION_KEYS.map(permKey => (
                        <label key={permKey}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${nm ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'}`}>
                          <input type="checkbox" checked={!!perms[permKey]}
                            onChange={() => handleTogglePermission(role.id, permKey, perms)}
                            className="w-4 h-4 rounded transition-colors" style={{ accentColor: '#4F96FF' }}
                          />
                          <span className={`text-sm ${nm ? 'text-white/70' : 'text-black/70'}`}>{PERMISSION_LABELS[permKey]}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Delete Role */}
                  {!role.is_default && (
                    <div className="pt-2">
                      {deleteConfirmId === role.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleDeleteRole(role.id)}
                            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            style={{ background: 'rgba(239,68,68,0.85)', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}>
                            <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                          </button>
                          <button onClick={() => setDeleteConfirmId(null)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${nm ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/5 text-black hover:bg-black/10'}`}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleDeleteRole(role.id)}
                          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                          <Trash2 className="w-3.5 h-3.5" /> Delete Role
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {sortedRoles.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: nm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
              <Shield className="w-8 h-8" style={{ color: nm ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
            </div>
            <p className={`text-sm ${nm ? 'text-white/40' : 'text-black/40'}`}>No roles created yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManager;
