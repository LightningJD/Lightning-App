/**
 * Roles & Permissions System for Lightning Groups
 *
 * Role hierarchy (highest to lowest):
 *   pastor > admin > moderator > member > visitor
 *
 * Each role has default permissions that can be overridden by custom roles.
 */

import type { GroupRole, RolePermissions, CustomRole } from '../types';

// Default permissions for each built-in role
const DEFAULT_PERMISSIONS: Record<GroupRole, RolePermissions> = {
  pastor: {
    canManageGroup: true,
    canManageMembers: true,
    canManageRoles: true,
    canPinMessages: true,
    canDeleteMessages: true,
    canCreateEvents: true,
    canPostAnnouncements: true,
    canModerateContent: true,
    canMuteMembers: true,
    canSendMessages: true,
    canReact: true,
    canViewMembers: true,
  },
  admin: {
    canManageGroup: true,
    canManageMembers: true,
    canManageRoles: true,
    canPinMessages: true,
    canDeleteMessages: true,
    canCreateEvents: true,
    canPostAnnouncements: true,
    canModerateContent: true,
    canMuteMembers: true,
    canSendMessages: true,
    canReact: true,
    canViewMembers: true,
  },
  moderator: {
    canManageGroup: false,
    canManageMembers: false,
    canManageRoles: false,
    canPinMessages: true,
    canDeleteMessages: true,
    canCreateEvents: true,
    canPostAnnouncements: false,
    canModerateContent: true,
    canMuteMembers: true,
    canSendMessages: true,
    canReact: true,
    canViewMembers: true,
  },
  member: {
    canManageGroup: false,
    canManageMembers: false,
    canManageRoles: false,
    canPinMessages: false,
    canDeleteMessages: false,
    canCreateEvents: false,
    canPostAnnouncements: false,
    canModerateContent: false,
    canMuteMembers: false,
    canSendMessages: true,
    canReact: true,
    canViewMembers: true,
  },
  visitor: {
    canManageGroup: false,
    canManageMembers: false,
    canManageRoles: false,
    canPinMessages: false,
    canDeleteMessages: false,
    canCreateEvents: false,
    canPostAnnouncements: false,
    canModerateContent: false,
    canMuteMembers: false,
    canSendMessages: false,
    canReact: false,
    canViewMembers: true,
  },
};

// Role hierarchy for comparison (lower index = higher rank)
const ROLE_HIERARCHY: GroupRole[] = ['pastor', 'admin', 'moderator', 'member', 'visitor'];

/**
 * Get the default permissions for a built-in role
 */
export const getDefaultPermissions = (role: GroupRole): RolePermissions => {
  return { ...DEFAULT_PERMISSIONS[role] };
};

/**
 * Get effective permissions for a user, considering custom role overrides
 */
export const getEffectivePermissions = (
  role: GroupRole,
  customRole?: CustomRole | null
): RolePermissions => {
  if (customRole) {
    return { ...customRole.permissions };
  }
  return getDefaultPermissions(role);
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (
  role: GroupRole,
  permission: keyof RolePermissions,
  customRole?: CustomRole | null
): boolean => {
  const permissions = getEffectivePermissions(role, customRole);
  return permissions[permission];
};

/**
 * Check if role A outranks role B in the hierarchy
 */
export const outranks = (roleA: GroupRole, roleB: GroupRole): boolean => {
  const indexA = ROLE_HIERARCHY.indexOf(roleA);
  const indexB = ROLE_HIERARCHY.indexOf(roleB);
  return indexA < indexB;
};

/**
 * Get the rank index of a role (lower = higher rank)
 */
export const getRoleRank = (role: GroupRole): number => {
  return ROLE_HIERARCHY.indexOf(role);
};

/**
 * Check if a user can modify another user's role
 * Rules:
 * - Must have canManageMembers permission
 * - Cannot modify someone of equal or higher rank
 * - Cannot assign a role equal or higher than their own
 */
export const canModifyMemberRole = (
  actorRole: GroupRole,
  targetRole: GroupRole,
  newRole?: GroupRole
): boolean => {
  // Must outrank the target
  if (!outranks(actorRole, targetRole)) return false;

  // If assigning a new role, can't assign equal or higher than own rank
  if (newRole && !outranks(actorRole, newRole)) return false;

  return true;
};

/**
 * Check if a user can remove another member
 */
export const canRemoveMember = (
  actorRole: GroupRole,
  targetRole: GroupRole
): boolean => {
  const perms = getDefaultPermissions(actorRole);
  return perms.canManageMembers && outranks(actorRole, targetRole);
};

/**
 * Map legacy 'leader' role to the new system
 */
export const mapLegacyRole = (role: string): GroupRole => {
  if (role === 'leader') return 'pastor';
  if (ROLE_HIERARCHY.includes(role as GroupRole)) return role as GroupRole;
  return 'member';
};

/**
 * Get display label for a role
 */
export const getRoleLabel = (role: GroupRole): string => {
  const labels: Record<GroupRole, string> = {
    pastor: 'Pastor/Admin',
    admin: 'Admin',
    moderator: 'Moderator',
    member: 'Member',
    visitor: 'Visitor',
  };
  return labels[role] || 'Member';
};

/**
 * Get display color for a role badge
 */
export const getRoleColor = (role: GroupRole): string => {
  const colors: Record<GroupRole, string> = {
    pastor: '#f59e0b',    // Amber/gold
    admin: '#3b82f6',     // Blue
    moderator: '#10b981', // Green
    member: '#6b7280',    // Gray
    visitor: '#9ca3af',   // Light gray
  };
  return colors[role] || '#6b7280';
};

/**
 * Get the icon name for a role (used with lucide-react)
 */
export const getRoleIcon = (role: GroupRole): string => {
  const icons: Record<GroupRole, string> = {
    pastor: 'Crown',
    admin: 'Shield',
    moderator: 'ShieldCheck',
    member: 'User',
    visitor: 'Eye',
  };
  return icons[role] || 'User';
};

/**
 * Get all assignable roles for an actor role
 * (Roles lower in hierarchy than the actor)
 */
export const getAssignableRoles = (actorRole: GroupRole): GroupRole[] => {
  const actorIndex = ROLE_HIERARCHY.indexOf(actorRole);
  return ROLE_HIERARCHY.slice(actorIndex + 1);
};

/**
 * Permission labels for display in the role editor
 */
export const PERMISSION_LABELS: Record<keyof RolePermissions, string> = {
  canManageGroup: 'Manage Group Settings',
  canManageMembers: 'Manage Members',
  canManageRoles: 'Manage Roles',
  canPinMessages: 'Pin Messages',
  canDeleteMessages: 'Delete Messages',
  canCreateEvents: 'Create Events',
  canPostAnnouncements: 'Post Announcements',
  canModerateContent: 'Moderate Content',
  canMuteMembers: 'Mute Members',
  canSendMessages: 'Send Messages',
  canReact: 'Add Reactions',
  canViewMembers: 'View Members',
};

/**
 * Permission descriptions for tooltips
 */
export const PERMISSION_DESCRIPTIONS: Record<keyof RolePermissions, string> = {
  canManageGroup: 'Edit group name, description, and settings',
  canManageMembers: 'Invite, remove, and manage group members',
  canManageRoles: 'Create, edit, and assign custom roles',
  canPinMessages: 'Pin and unpin messages in group chat',
  canDeleteMessages: 'Delete any message in group chat',
  canCreateEvents: 'Create and manage group events',
  canPostAnnouncements: 'Post announcements to the group',
  canModerateContent: 'Review and act on flagged content',
  canMuteMembers: 'Temporarily mute members in chat',
  canSendMessages: 'Send messages in group chat',
  canReact: 'Add emoji reactions to messages',
  canViewMembers: 'View the list of group members',
};
