import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Shield } from 'lucide-react';

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
  'manage_server',
  'manage_channels',
  'manage_roles',
  'manage_members',
  'send_messages',
  'pin_messages',
  'delete_messages',
  'create_invite',
  'kick_members',
  'ban_members',
] as const;

const PERMISSION_LABELS: Record<string, string> = {
  manage_server: 'Manage Server',
  manage_channels: 'Manage Channels',
  manage_roles: 'Manage Roles',
  manage_members: 'Manage Members',
  send_messages: 'Send Messages',
  pin_messages: 'Pin Messages',
  delete_messages: 'Delete Messages',
  create_invite: 'Create Invite',
  kick_members: 'Kick Members',
  ban_members: 'Ban Members',
};

const ROLE_COLORS = [
  '#F1C40F',
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#9B59B6',
  '#E67E22',
  '#1ABC9C',
  '#99AAB5',
];

const RoleManager: React.FC<RoleManagerProps> = ({
  nightMode,
  serverId: _serverId,
  roles,
  onCreateRole,
  onUpdateRole: _onUpdateRole,
  onDeleteRole,
  onUpdatePermissions,
  onBack,
}) => {
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const glassBackground = nightMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.7)';
  const glassBorder = nightMode
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(0, 0, 0, 0.08)';
  const textPrimary = nightMode ? 'text-white' : 'text-slate-900';
  const textSecondary = nightMode ? 'text-slate-400' : 'text-slate-500';

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    onCreateRole(newRoleName.trim(), newRoleColor);
    setNewRoleName('');
    setNewRoleColor(ROLE_COLORS[0]);
    setShowCreateForm(false);
  };

  const handleTogglePermission = (roleId: string, permKey: string, currentPerms: any) => {
    const updated = { ...currentPerms, [permKey]: !currentPerms[permKey] };
    onUpdatePermissions(roleId, updated);
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

  const toggleExpanded = (roleId: string) => {
    setExpandedRoleId(expandedRoleId === roleId ? null : roleId);
    setDeleteConfirmId(null);
  };

  const sortedRoles = [...roles].sort((a, b) => b.position - a.position);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
        style={{
          background: nightMode
            ? 'rgba(10, 10, 10, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: glassBorder,
        }}
      >
        <button
          onClick={onBack}
          className={`p-1.5 rounded-lg transition-colors ${
            nightMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
          }`}
        >
          <ArrowLeft className={`w-5 h-5 ${textPrimary}`} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Shield className="w-5 h-5" style={{ color: 'rgba(79, 150, 255, 0.85)' }} />
          <h2 className={`text-lg font-bold ${textPrimary}`}>Manage Roles</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-1.5 rounded-lg transition-all active:scale-95"
          style={{
            background: 'rgba(79, 150, 255, 0.15)',
            color: 'rgba(79, 150, 255, 0.85)',
          }}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {/* Create Role Form */}
        {showCreateForm && (
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: nightMode
                ? 'rgba(79, 150, 255, 0.08)'
                : 'rgba(79, 150, 255, 0.05)',
              border: '1px solid rgba(79, 150, 255, 0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <label className={`block text-sm font-medium ${textPrimary}`}>
              New Role
            </label>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Role name"
              maxLength={30}
              className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                nightMode
                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
                  : 'bg-white border-slate-200 text-black placeholder-slate-400'
              }`}
            />
            <div>
              <label className={`block text-xs mb-1.5 ${textSecondary}`}>
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {ROLE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewRoleColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      newRoleColor === color ? 'ring-2 ring-offset-2 scale-110' : ''
                    }`}
                    style={{
                      background: color,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreateRole}
                disabled={!newRoleName.trim()}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(79, 150, 255, 0.85)',
                  boxShadow: '0 2px 8px rgba(79, 150, 255, 0.3)',
                }}
              >
                Create Role
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewRoleName('');
                  setNewRoleColor(ROLE_COLORS[0]);
                }}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  nightMode
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Roles List */}
        {sortedRoles.map((role) => {
          const isExpanded = expandedRoleId === role.id;
          const perms = role.permissions || {};

          return (
            <div
              key={role.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: glassBackground,
                border: glassBorder,
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Role Header */}
              <button
                onClick={() => toggleExpanded(role.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  nightMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: role.color }}
                />
                <span className={`flex-1 text-left font-medium text-sm ${textPrimary}`}>
                  {role.name}
                </span>
                {role.is_default && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      nightMode
                        ? 'bg-white/10 text-white/50'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    default
                  </span>
                )}
                {isExpanded ? (
                  <ChevronDown className={`w-4 h-4 ${textSecondary}`} />
                ) : (
                  <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
                )}
              </button>

              {/* Expanded Permissions */}
              {isExpanded && (
                <div
                  className="px-4 pb-4 space-y-2"
                  style={{
                    borderTop: nightMode
                      ? '1px solid rgba(255,255,255,0.05)'
                      : '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="pt-3">
                    <label className={`block text-xs font-medium mb-2 ${textSecondary}`}>
                      Permissions
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PERMISSION_KEYS.map((permKey) => (
                        <label
                          key={permKey}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            nightMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!perms[permKey]}
                            onChange={() =>
                              handleTogglePermission(role.id, permKey, perms)
                            }
                            className="w-4 h-4 rounded border-2 transition-colors"
                            style={{
                              accentColor: 'rgba(79, 150, 255, 0.85)',
                            }}
                          />
                          <span className={`text-sm ${textPrimary}`}>
                            {PERMISSION_LABELS[permKey]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Delete Role */}
                  {!role.is_default && (
                    <div className="pt-2">
                      {deleteConfirmId === role.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="flex-1 py-2 rounded-xl text-white text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            style={{
                              background: 'rgba(239, 68, 68, 0.85)',
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              nightMode
                                ? 'bg-white/10 text-white hover:bg-white/15'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="w-full py-2 rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Role
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
            <Shield
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
            />
            <p className={`text-sm ${textSecondary}`}>
              No roles created yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManager;
