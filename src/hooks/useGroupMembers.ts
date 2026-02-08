import { useState, useEffect, useCallback } from 'react';
import { showError, showSuccess } from '../lib/toast';
import { getGroupMembers, removeMemberFromGroup, setMemberRole } from '../lib/database';
import type { GroupRole } from '../types';
import { mapLegacyRole, outranks, getRoleLabel } from '../lib/permissions';

interface GroupMember {
  id: string;
  role: string;
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_emoji: string;
    is_online: boolean;
  };
}

interface UseGroupMembersOptions {
  activeGroup: string | null;
  activeView: string;
  userRole: GroupRole;
}

export function useGroupMembers({ activeGroup, activeView, userRole }: UseGroupMembersOptions) {
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null);

  // Load members when entering members view
  useEffect(() => {
    const loadMembers = async () => {
      if (activeGroup && activeView === 'members') {
        const members = await getGroupMembers(activeGroup);
        setGroupMembers(members || []);
      }
    };
    loadMembers();
  }, [activeGroup, activeView]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!activeGroup) return;
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    const removed = await removeMemberFromGroup(activeGroup, userId);
    if (removed) {
      const members = await getGroupMembers(activeGroup);
      setGroupMembers(members || []);
    }
  }, [activeGroup]);

  const handleSetRole = useCallback(async (userId: string, newRole: GroupRole) => {
    if (!activeGroup) return;

    const member = groupMembers.find(m => m.user.id === userId);
    if (!member) return;

    const memberRole = mapLegacyRole(member.role);

    // Verify hierarchy
    if (!outranks(userRole, memberRole)) {
      showError('You cannot modify the role of someone with equal or higher rank.');
      return;
    }
    if (!outranks(userRole, newRole)) {
      showError('You cannot assign a role equal to or above your own.');
      return;
    }

    const result = await setMemberRole(activeGroup, userId, newRole);
    if (result) {
      showSuccess(`Role updated to ${getRoleLabel(newRole)}`);
      const members = await getGroupMembers(activeGroup);
      setGroupMembers(members || []);
    } else {
      showError('Failed to update role.');
    }
    setShowRoleMenu(null);
  }, [activeGroup, groupMembers, userRole]);

  return {
    groupMembers,
    showRoleMenu, setShowRoleMenu,
    handleRemoveMember,
    handleSetRole,
  };
}
