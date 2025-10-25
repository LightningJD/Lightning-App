import { supabase } from '../supabase';

interface GroupData {
  name: string;
  description?: string;
  avatarEmoji?: string;
  isPrivate?: boolean;
}

// ============================================
// GROUP OPERATIONS
// ============================================

/**
 * Create a new group
 */
export const createGroup = async (creatorId: string, groupData: GroupData): Promise<any> => {
  if (!supabase) return null;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    // @ts-ignore - Supabase generated types are incomplete
    .insert({
      name: groupData.name,
      description: groupData.description,
      avatar_emoji: groupData.avatarEmoji || '✝️',
      creator_id: creatorId,
      is_private: groupData.isPrivate ?? false
    })
    .select()
    .single();

  if (groupError) {
    console.error('Error creating group:', groupError);
    return null;
  }

  // Add creator as leader
  // @ts-ignore - Supabase generated types are incomplete
  await supabase
    .from('group_members')
    // @ts-ignore - Supabase generated types are incomplete
    .insert({
      group_id: (group as any).id,
      user_id: creatorId,
      role: 'leader'
    });

  return group;
};

/**
 * Get user's groups
 */
export const getUserGroups = async (userId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_members')
    // @ts-ignore - Supabase generated types don't handle nested relations
    .select('*, group:groups(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user groups:', error);
    return [];
  }

  return (data as any[]).map((membership: any) => ({
    ...membership.group,
    userRole: membership.role
  }));
};

/**
 * Send group message
 */
export const sendGroupMessage = async (groupId: string, senderId: string, content: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_messages')
    // @ts-ignore - Supabase generated types are incomplete
    .insert({
      group_id: groupId,
      sender_id: senderId,
      content
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending group message:', error);
    return null;
  }

  return data;
};

/**
 * Get group messages
 */
export const getGroupMessages = async (groupId: string, limit: number = 100): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_messages')
    // @ts-ignore - Supabase generated types don't handle nested relations
    .select('*, sender:users!sender_id(username, display_name, avatar_emoji)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching group messages:', error);
    return [];
  }

  return data;
};

/**
 * Update group details
 */
export const updateGroup = async (groupId: string, updates: Record<string, any>): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('groups')
    // @ts-ignore - Supabase generated types don't allow dynamic updates
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', groupId)
    .select()
    .single();

  if (error) {
    console.error('Error updating group:', error);
    return null;
  }

  return data;
};

/**
 * Delete group (leaders only)
 */
export const deleteGroup = async (groupId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  // Delete group members first (cascade should handle this, but being explicit)
  await supabase.from('group_members').delete().eq('group_id', groupId);

  // Delete group messages
  await supabase.from('group_messages').delete().eq('group_id', groupId);

  // Delete the group
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Error deleting group:', error);
    return null;
  }

  return true;
};

/**
 * Leave group (remove self from members)
 */
export const leaveGroup = async (groupId: string, userId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving group:', error);
    return null;
  }

  return true;
};

/**
 * Get group members
 */
export const getGroupMembers = async (groupId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_members')
    // @ts-ignore - Supabase generated types don't handle nested relations
    .select('*, user:users!user_id(id, username, display_name, avatar_emoji, is_online)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching group members:', error);
    return [];
  }

  return data;
};

/**
 * Invite user to group
 */
export const inviteToGroup = async (groupId: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_members')
    // @ts-ignore - Supabase generated types are incomplete
    .insert({
      group_id: groupId,
      user_id: userId,
      role: 'member'
    })
    .select()
    .single();

  if (error) {
    console.error('Error inviting to group:', error);
    return null;
  }

  return data;
};

/**
 * Remove member from group
 */
export const removeMemberFromGroup = async (groupId: string, userId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing member:', error);
    return null;
  }

  return true;
};

/**
 * Promote member to leader
 */
export const promoteMemberToLeader = async (groupId: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_members')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({ role: 'leader' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error promoting member:', error);
    return null;
  }

  return data;
};

/**
 * Search public groups
 */
export const searchPublicGroups = async (searchQuery: string = ''): Promise<any[]> => {
  if (!supabase) return [];

  let query = supabase
    .from('groups')
    // @ts-ignore - Supabase generated types don't handle aggregate counts
    .select('*, member_count:group_members(count)')
    .eq('is_private', false);

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error searching groups:', error);
    return [];
  }

  return data;
};

/**
 * Request to join a group
 */
export const requestToJoinGroup = async (groupId: string, userId: string, message: string = ''): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('join_requests')
    // @ts-ignore - Supabase generated types are incomplete
    .insert({
      group_id: groupId,
      user_id: userId,
      message,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error requesting to join group:', error);
    return null;
  }

  return data;
};

/**
 * Get pending join requests for a group (leaders only)
 */
export const getGroupJoinRequests = async (groupId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('join_requests')
    // @ts-ignore - Supabase generated types don't handle nested relations
    .select('*, user:users!user_id(id, username, display_name, avatar_emoji)')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching join requests:', error);
    return [];
  }

  return data;
};

/**
 * Approve join request
 */
export const approveJoinRequest = async (requestId: string, groupId: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  // Update request status
  await supabase
    .from('join_requests')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({ status: 'approved' })
    .eq('id', requestId);

  // Add user to group
  const { data, error } = await supabase
    .from('group_members')
    // @ts-ignore - Supabase generated types are incomplete
    .insert({
      group_id: groupId,
      user_id: userId,
      role: 'member'
    })
    .select()
    .single();

  if (error) {
    console.error('Error approving join request:', error);
    return null;
  }

  return data;
};

/**
 * Deny join request
 */
export const denyJoinRequest = async (requestId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('join_requests')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({ status: 'denied' })
    .eq('id', requestId);

  if (error) {
    console.error('Error denying join request:', error);
    return null;
  }

  return true;
};

// ============================================
// PINNED MESSAGES
// ============================================

/**
 * Pin a group message (leaders only)
 */
export const pinMessage = async (messageId: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_messages')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({
      is_pinned: true,
      pinned_by: userId,
      pinned_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('Error pinning message:', error);
    return null;
  }

  return data;
};

/**
 * Unpin a group message
 */
export const unpinMessage = async (messageId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_messages')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({
      is_pinned: false,
      pinned_by: null,
      pinned_at: null
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('Error unpinning message:', error);
    return null;
  }

  return data;
};

/**
 * Get pinned messages for a group
 */
export const getPinnedMessages = async (groupId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_messages')
    // @ts-ignore - Supabase generated types don't handle nested relations
    .select('*, sender:users!sender_id(username, display_name, avatar_emoji)')
    .eq('group_id', groupId)
    .eq('is_pinned', true)
    .order('pinned_at', { ascending: false });

  if (error) {
    console.error('Error fetching pinned messages:', error);
    return [];
  }

  return data;
};
