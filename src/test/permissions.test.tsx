/**
 * Permissions System Tests
 * Tests the role hierarchy, permissions, and role management logic
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultPermissions,
  getEffectivePermissions,
  hasPermission,
  outranks,
  getRoleRank,
  canModifyMemberRole,
  canRemoveMember,
  mapLegacyRole,
  getRoleLabel,
  getRoleColor,
  getRoleIcon,
  getAssignableRoles,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
} from '../lib/permissions';
import type { GroupRole, RolePermissions, CustomRole } from '../types';

describe('Permissions System', () => {
  // ===========================================
  // Role Hierarchy Tests
  // ===========================================
  describe('Role Hierarchy', () => {
    it('should rank pastor as highest role', () => {
      expect(getRoleRank('pastor')).toBe(0);
    });

    it('should rank admin below pastor', () => {
      expect(getRoleRank('admin')).toBe(1);
    });

    it('should rank moderator below admin', () => {
      expect(getRoleRank('moderator')).toBe(2);
    });

    it('should rank member below moderator', () => {
      expect(getRoleRank('member')).toBe(3);
    });

    it('should rank visitor as lowest role', () => {
      expect(getRoleRank('visitor')).toBe(4);
    });

    it('pastor should outrank all other roles', () => {
      expect(outranks('pastor', 'admin')).toBe(true);
      expect(outranks('pastor', 'moderator')).toBe(true);
      expect(outranks('pastor', 'member')).toBe(true);
      expect(outranks('pastor', 'visitor')).toBe(true);
    });

    it('pastor should not outrank itself', () => {
      expect(outranks('pastor', 'pastor')).toBe(false);
    });

    it('admin should outrank moderator, member, visitor but not pastor', () => {
      expect(outranks('admin', 'pastor')).toBe(false);
      expect(outranks('admin', 'moderator')).toBe(true);
      expect(outranks('admin', 'member')).toBe(true);
      expect(outranks('admin', 'visitor')).toBe(true);
    });

    it('moderator should outrank member and visitor only', () => {
      expect(outranks('moderator', 'pastor')).toBe(false);
      expect(outranks('moderator', 'admin')).toBe(false);
      expect(outranks('moderator', 'member')).toBe(true);
      expect(outranks('moderator', 'visitor')).toBe(true);
    });

    it('member should outrank visitor only', () => {
      expect(outranks('member', 'pastor')).toBe(false);
      expect(outranks('member', 'admin')).toBe(false);
      expect(outranks('member', 'moderator')).toBe(false);
      expect(outranks('member', 'visitor')).toBe(true);
    });

    it('visitor should not outrank anyone', () => {
      expect(outranks('visitor', 'pastor')).toBe(false);
      expect(outranks('visitor', 'admin')).toBe(false);
      expect(outranks('visitor', 'moderator')).toBe(false);
      expect(outranks('visitor', 'member')).toBe(false);
    });
  });

  // ===========================================
  // Default Permissions Tests
  // ===========================================
  describe('Default Permissions', () => {
    it('pastor should have all permissions', () => {
      const perms = getDefaultPermissions('pastor');
      expect(perms.canManageGroup).toBe(true);
      expect(perms.canManageMembers).toBe(true);
      expect(perms.canManageRoles).toBe(true);
      expect(perms.canPinMessages).toBe(true);
      expect(perms.canDeleteMessages).toBe(true);
      expect(perms.canCreateEvents).toBe(true);
      expect(perms.canPostAnnouncements).toBe(true);
      expect(perms.canModerateContent).toBe(true);
      expect(perms.canMuteMembers).toBe(true);
      expect(perms.canSendMessages).toBe(true);
      expect(perms.canReact).toBe(true);
      expect(perms.canViewMembers).toBe(true);
    });

    it('admin should have all permissions (same as pastor)', () => {
      const perms = getDefaultPermissions('admin');
      expect(perms.canManageGroup).toBe(true);
      expect(perms.canManageMembers).toBe(true);
      expect(perms.canManageRoles).toBe(true);
    });

    it('moderator should have moderation permissions but not management', () => {
      const perms = getDefaultPermissions('moderator');
      expect(perms.canManageGroup).toBe(false);
      expect(perms.canManageMembers).toBe(false);
      expect(perms.canManageRoles).toBe(false);
      expect(perms.canPinMessages).toBe(true);
      expect(perms.canDeleteMessages).toBe(true);
      expect(perms.canCreateEvents).toBe(true);
      expect(perms.canModerateContent).toBe(true);
      expect(perms.canMuteMembers).toBe(true);
      expect(perms.canSendMessages).toBe(true);
    });

    it('member should only have send, react, and view permissions', () => {
      const perms = getDefaultPermissions('member');
      expect(perms.canManageGroup).toBe(false);
      expect(perms.canManageMembers).toBe(false);
      expect(perms.canManageRoles).toBe(false);
      expect(perms.canPinMessages).toBe(false);
      expect(perms.canDeleteMessages).toBe(false);
      expect(perms.canCreateEvents).toBe(false);
      expect(perms.canPostAnnouncements).toBe(false);
      expect(perms.canModerateContent).toBe(false);
      expect(perms.canMuteMembers).toBe(false);
      expect(perms.canSendMessages).toBe(true);
      expect(perms.canReact).toBe(true);
      expect(perms.canViewMembers).toBe(true);
    });

    it('visitor should only have view permissions', () => {
      const perms = getDefaultPermissions('visitor');
      expect(perms.canManageGroup).toBe(false);
      expect(perms.canSendMessages).toBe(false);
      expect(perms.canReact).toBe(false);
      expect(perms.canViewMembers).toBe(true);
    });
  });

  // ===========================================
  // hasPermission Tests
  // ===========================================
  describe('hasPermission', () => {
    it('should return true for pastor canManageGroup', () => {
      expect(hasPermission('pastor', 'canManageGroup')).toBe(true);
    });

    it('should return false for member canManageGroup', () => {
      expect(hasPermission('member', 'canManageGroup')).toBe(false);
    });

    it('should use custom role permissions when provided', () => {
      const customRole: CustomRole = {
        id: 'custom-1',
        group_id: 'group-1',
        name: 'Custom',
        color: '#ff0000',
        position: 5,
        created_at: new Date().toISOString(),
        permissions: {
          canManageGroup: false,
          canManageMembers: false,
          canManageRoles: false,
          canPinMessages: true,
          canDeleteMessages: false,
          canCreateEvents: true,
          canPostAnnouncements: false,
          canModerateContent: false,
          canMuteMembers: false,
          canSendMessages: true,
          canReact: true,
          canViewMembers: true,
        },
      };

      expect(hasPermission('member', 'canPinMessages', customRole)).toBe(true);
      expect(hasPermission('member', 'canCreateEvents', customRole)).toBe(true);
      expect(hasPermission('member', 'canDeleteMessages', customRole)).toBe(false);
    });

    it('should fall back to default permissions when no custom role', () => {
      expect(hasPermission('moderator', 'canPinMessages', null)).toBe(true);
      expect(hasPermission('moderator', 'canManageGroup', null)).toBe(false);
    });
  });

  // ===========================================
  // Effective Permissions Tests
  // ===========================================
  describe('getEffectivePermissions', () => {
    it('should return default permissions when no custom role', () => {
      const perms = getEffectivePermissions('member');
      const defaultPerms = getDefaultPermissions('member');
      expect(perms).toEqual(defaultPerms);
    });

    it('should return custom role permissions when provided', () => {
      const customPerms: RolePermissions = {
        canManageGroup: false,
        canManageMembers: false,
        canManageRoles: false,
        canPinMessages: true,
        canDeleteMessages: true,
        canCreateEvents: false,
        canPostAnnouncements: false,
        canModerateContent: false,
        canMuteMembers: false,
        canSendMessages: true,
        canReact: true,
        canViewMembers: true,
      };
      const customRole: CustomRole = {
        id: 'test',
        group_id: 'group-1',
        name: 'Test',
        color: '#00ff00',
        position: 3,
        created_at: new Date().toISOString(),
        permissions: customPerms,
      };

      const perms = getEffectivePermissions('member', customRole);
      expect(perms).toEqual(customPerms);
    });

    it('should return a copy (not reference) of permissions', () => {
      const perms1 = getDefaultPermissions('member');
      const perms2 = getDefaultPermissions('member');
      expect(perms1).toEqual(perms2);
      perms1.canSendMessages = false;
      expect(perms2.canSendMessages).toBe(true);
    });
  });

  // ===========================================
  // Role Modification Tests
  // ===========================================
  describe('canModifyMemberRole', () => {
    it('pastor can modify admin role', () => {
      expect(canModifyMemberRole('pastor', 'admin')).toBe(true);
    });

    it('pastor can modify member role', () => {
      expect(canModifyMemberRole('pastor', 'member')).toBe(true);
    });

    it('pastor cannot modify another pastor', () => {
      expect(canModifyMemberRole('pastor', 'pastor')).toBe(false);
    });

    it('admin cannot modify pastor', () => {
      expect(canModifyMemberRole('admin', 'pastor')).toBe(false);
    });

    it('admin can modify moderator', () => {
      expect(canModifyMemberRole('admin', 'moderator')).toBe(true);
    });

    it('moderator cannot modify admin', () => {
      expect(canModifyMemberRole('moderator', 'admin')).toBe(false);
    });

    it('member cannot modify same rank', () => {
      expect(canModifyMemberRole('member', 'member')).toBe(false);
    });

    it('member can modify visitor by hierarchy (permission check is separate)', () => {
      // canModifyMemberRole only checks hierarchy, not permissions
      // The UI layer should also check hasPermission('canManageMembers')
      expect(canModifyMemberRole('member', 'visitor')).toBe(true);
    });

    it('cannot assign role equal or higher than own', () => {
      expect(canModifyMemberRole('admin', 'member', 'pastor')).toBe(false);
      expect(canModifyMemberRole('admin', 'member', 'admin')).toBe(false);
      expect(canModifyMemberRole('admin', 'member', 'moderator')).toBe(true);
    });

    it('pastor can assign admin role', () => {
      expect(canModifyMemberRole('pastor', 'member', 'admin')).toBe(true);
    });

    it('pastor cannot assign pastor role', () => {
      expect(canModifyMemberRole('pastor', 'member', 'pastor')).toBe(false);
    });
  });

  // ===========================================
  // canRemoveMember Tests
  // ===========================================
  describe('canRemoveMember', () => {
    it('pastor can remove admin', () => {
      expect(canRemoveMember('pastor', 'admin')).toBe(true);
    });

    it('pastor can remove member', () => {
      expect(canRemoveMember('pastor', 'member')).toBe(true);
    });

    it('pastor cannot remove another pastor', () => {
      expect(canRemoveMember('pastor', 'pastor')).toBe(false);
    });

    it('admin can remove moderator', () => {
      expect(canRemoveMember('admin', 'moderator')).toBe(true);
    });

    it('admin cannot remove pastor', () => {
      expect(canRemoveMember('admin', 'pastor')).toBe(false);
    });

    it('moderator cannot remove anyone (no canManageMembers)', () => {
      expect(canRemoveMember('moderator', 'member')).toBe(false);
    });

    it('member cannot remove anyone', () => {
      expect(canRemoveMember('member', 'visitor')).toBe(false);
    });
  });

  // ===========================================
  // Legacy Role Mapping Tests
  // ===========================================
  describe('mapLegacyRole', () => {
    it('should map "leader" to "pastor"', () => {
      expect(mapLegacyRole('leader')).toBe('pastor');
    });

    it('should keep valid roles unchanged', () => {
      expect(mapLegacyRole('pastor')).toBe('pastor');
      expect(mapLegacyRole('admin')).toBe('admin');
      expect(mapLegacyRole('moderator')).toBe('moderator');
      expect(mapLegacyRole('member')).toBe('member');
      expect(mapLegacyRole('visitor')).toBe('visitor');
    });

    it('should map unknown roles to "member"', () => {
      expect(mapLegacyRole('unknown')).toBe('member');
      expect(mapLegacyRole('')).toBe('member');
      expect(mapLegacyRole('superadmin')).toBe('member');
    });
  });

  // ===========================================
  // Display Helpers Tests
  // ===========================================
  describe('Display Helpers', () => {
    it('should return correct labels for all roles', () => {
      expect(getRoleLabel('pastor')).toBe('Pastor/Admin');
      expect(getRoleLabel('admin')).toBe('Admin');
      expect(getRoleLabel('moderator')).toBe('Moderator');
      expect(getRoleLabel('member')).toBe('Member');
      expect(getRoleLabel('visitor')).toBe('Visitor');
    });

    it('should return colors for all roles', () => {
      expect(getRoleColor('pastor')).toBeTruthy();
      expect(getRoleColor('admin')).toBeTruthy();
      expect(getRoleColor('moderator')).toBeTruthy();
      expect(getRoleColor('member')).toBeTruthy();
      expect(getRoleColor('visitor')).toBeTruthy();
    });

    it('should return different colors for different roles', () => {
      const colors = new Set([
        getRoleColor('pastor'),
        getRoleColor('admin'),
        getRoleColor('moderator'),
        getRoleColor('member'),
        getRoleColor('visitor'),
      ]);
      expect(colors.size).toBe(5);
    });

    it('should return icon names for all roles', () => {
      expect(getRoleIcon('pastor')).toBe('Crown');
      expect(getRoleIcon('admin')).toBe('Shield');
      expect(getRoleIcon('moderator')).toBe('ShieldCheck');
      expect(getRoleIcon('member')).toBe('User');
      expect(getRoleIcon('visitor')).toBe('Eye');
    });
  });

  // ===========================================
  // getAssignableRoles Tests
  // ===========================================
  describe('getAssignableRoles', () => {
    it('pastor can assign admin, moderator, member, visitor', () => {
      expect(getAssignableRoles('pastor')).toEqual(['admin', 'moderator', 'member', 'visitor']);
    });

    it('admin can assign moderator, member, visitor', () => {
      expect(getAssignableRoles('admin')).toEqual(['moderator', 'member', 'visitor']);
    });

    it('moderator can assign member, visitor', () => {
      expect(getAssignableRoles('moderator')).toEqual(['member', 'visitor']);
    });

    it('member can assign visitor only', () => {
      expect(getAssignableRoles('member')).toEqual(['visitor']);
    });

    it('visitor cannot assign any roles', () => {
      expect(getAssignableRoles('visitor')).toEqual([]);
    });
  });

  // ===========================================
  // Permission Labels & Descriptions Tests
  // ===========================================
  describe('Permission Labels & Descriptions', () => {
    it('should have labels for all permissions', () => {
      const permissionKeys: (keyof RolePermissions)[] = [
        'canManageGroup',
        'canManageMembers',
        'canManageRoles',
        'canPinMessages',
        'canDeleteMessages',
        'canCreateEvents',
        'canPostAnnouncements',
        'canModerateContent',
        'canMuteMembers',
        'canSendMessages',
        'canReact',
        'canViewMembers',
      ];

      permissionKeys.forEach((key) => {
        expect(PERMISSION_LABELS[key]).toBeTruthy();
        expect(typeof PERMISSION_LABELS[key]).toBe('string');
      });
    });

    it('should have descriptions for all permissions', () => {
      const permissionKeys: (keyof RolePermissions)[] = [
        'canManageGroup',
        'canManageMembers',
        'canManageRoles',
        'canPinMessages',
        'canDeleteMessages',
        'canCreateEvents',
        'canPostAnnouncements',
        'canModerateContent',
        'canMuteMembers',
        'canSendMessages',
        'canReact',
        'canViewMembers',
      ];

      permissionKeys.forEach((key) => {
        expect(PERMISSION_DESCRIPTIONS[key]).toBeTruthy();
        expect(typeof PERMISSION_DESCRIPTIONS[key]).toBe('string');
      });
    });
  });
});
