import { useState, useEffect, useCallback } from 'react';
import { showError, showSuccess } from '../lib/toast';
import { validateGroup, sanitizeInput } from '../lib/inputValidation';
import {
  createGroup,
  getUserGroups,
  updateGroup,
  deleteGroup,
  leaveGroup,
  getFriends,
  getUserJoinRequests,
  approveJoinRequest,
  denyJoinRequest
} from '../lib/database';
import { unlockSecret } from '../lib/secrets';

interface GroupData {
  id: string;
  name: string;
  description?: string;
  avatar_emoji: string;
  member_count: number;
  userRole: string;
}

interface UseGroupManagementOptions {
  userId: string | undefined;
  onGroupsCountChange?: (count: number) => void;
}

export function useGroupManagement({ userId, onGroupsCountChange }: UseGroupManagementOptions) {
  const [myGroups, setMyGroups] = useState<GroupData[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isGroupsLoading, setIsGroupsLoading] = useState(true);

  // Create group form state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [inviteCandidates, setInviteCandidates] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Edit group state
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Load groups and invitations
  useEffect(() => {
    const loadGroups = async () => {
      if (!userId) return;
      try {
        const [groups, invitations] = await Promise.all([
          getUserGroups(userId),
          getUserJoinRequests(userId)
        ]);
        setMyGroups(groups || []);
        setPendingInvitations(invitations || []);
        if (onGroupsCountChange) {
          onGroupsCountChange(groups?.length || 0);
        }
      } catch (error) {
        console.error('Failed to load groups:', error);
        setMyGroups([]);
        setPendingInvitations([]);
      }
    };
    loadGroups();
  }, [userId]);

  // Sync parent badge
  useEffect(() => {
    if (onGroupsCountChange) {
      onGroupsCountChange(myGroups.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myGroups]);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => { setIsGroupsLoading(false); }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Load friends for invite modal
  useEffect(() => {
    const loadFriends = async () => {
      if (!showCreateGroup || !userId) return;
      try {
        const friends = await getFriends(userId);
        // @ts-ignore
        setInviteCandidates(friends || []);
      } catch (error) {
        console.error('Failed to load friends for invite list:', error);
        setInviteCandidates([]);
      }
    };
    loadFriends();
  }, [showCreateGroup, userId]);

  const handleCreateGroup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !userId) return;

    const validation = validateGroup({ name: newGroupName, description: newGroupDescription });
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0] as string;
      showError(firstError);
      return;
    }

    const newGroup = await createGroup(userId, {
      name: sanitizeInput(newGroupName),
      description: sanitizeInput(newGroupDescription),
      avatarEmoji: '\u2728',
      isPrivate: false,
      memberIds: selectedMemberIds
    });

    if (newGroup) {
      unlockSecret('group_creator');
      const groups = await getUserGroups(userId);
      setMyGroups(groups || []);
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedMemberIds([]);
    } else {
      console.error('Failed to create group');
    }
  }, [newGroupName, newGroupDescription, selectedMemberIds, userId]);

  const handleUpdateGroup = useCallback(async (e: React.FormEvent, activeGroup: string) => {
    e.preventDefault();
    if (!editGroupName.trim() || !activeGroup) return;

    setIsSaving(true);
    const updated = await updateGroup(activeGroup, {
      name: editGroupName,
      description: editGroupDescription
    });
    if (updated && userId) {
      const groups = await getUserGroups(userId);
      setMyGroups(groups || []);
    }
    setIsSaving(false);
    return !!updated;
  }, [editGroupName, editGroupDescription, userId]);

  const handleDeleteGroup = useCallback(async (activeGroup: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!window.confirm('Are you sure you want to delete this group? This cannot be undone.')) return false;

    setIsDeleting(true);
    const deleted = await deleteGroup(activeGroup);
    if (deleted && userId) {
      const groups = await getUserGroups(userId);
      setMyGroups(groups || []);
    }
    setIsDeleting(false);
    return !!deleted;
  }, [userId]);

  const handleLeaveGroup = useCallback(async (activeGroup: string) => {
    if (!window.confirm('Are you sure you want to leave this group?')) return false;
    if (!userId) return false;

    setIsLeaving(true);
    const left = await leaveGroup(activeGroup, userId);
    if (left) {
      const groups = await getUserGroups(userId);
      setMyGroups(groups || []);
    }
    setIsLeaving(false);
    return !!left;
  }, [userId]);

  const handleAcceptInvitation = useCallback(async (requestId: string, groupId: string) => {
    if (!userId) return;
    const result = await approveJoinRequest(requestId, groupId, userId);
    if (result) {
      const [groups, invitations] = await Promise.all([
        getUserGroups(userId),
        getUserJoinRequests(userId)
      ]);
      setMyGroups(groups || []);
      setPendingInvitations(invitations || []);
    }
  }, [userId]);

  const handleDeclineInvitation = useCallback(async (requestId: string) => {
    if (!userId) return;
    const result = await denyJoinRequest(requestId);
    if (result) {
      const invitations = await getUserJoinRequests(userId);
      setPendingInvitations(invitations || []);
    }
  }, [userId]);

  return {
    // Groups state
    myGroups,
    pendingInvitations,
    isGroupsLoading,

    // Create group
    showCreateGroup, setShowCreateGroup,
    newGroupName, setNewGroupName,
    newGroupDescription, setNewGroupDescription,
    inviteCandidates,
    selectedMemberIds, setSelectedMemberIds,
    handleCreateGroup,

    // Edit group
    editGroupName, setEditGroupName,
    editGroupDescription, setEditGroupDescription,
    isSaving, isDeleting, isLeaving,
    handleUpdateGroup,
    handleDeleteGroup,
    handleLeaveGroup,

    // Invitations
    handleAcceptInvitation,
    handleDeclineInvitation,
  };
}
