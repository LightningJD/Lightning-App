// @ts-nocheck - Server tables (servers, server_roles, server_members, server_channels,
// server_categories, server_role_permissions, channel_messages, channel_message_reactions,
// server_join_requests) are not in the auto-generated Supabase types.
// TODO: Run `npx supabase gen types` to generate types for these tables, then remove this directive.
import { supabase } from '../supabase';
import type {
  CreateServerData,
  CreateChannelData,
  CreateRoleData,
  UpdateServerData,
  UpdateChannelData,
  UpdateRoleData,
  UpdatePermissionsData,
} from '../../types/servers';

// ============================================
// SERVER OPERATIONS
// ============================================

/**
 * Create a new server with default roles, permissions, and #general channel
 */
export const createServer = async (creatorId: string, serverData: CreateServerData): Promise<any> => {
  if (!supabase) return null;

  // 1. Create the server
  const { data: server, error: serverError } = await supabase
    .from('servers')
    // @ts-ignore
    .insert({
      name: serverData.name,
      description: serverData.description,
      icon_emoji: serverData.iconEmoji || '⛪',
      creator_id: creatorId,
      is_private: serverData.isPrivate ?? false,
      invite_code: generateInviteCodeString()
    })
    .select()
    .single();

  if (serverError) {
    console.error('Error creating server:', serverError);
    return null;
  }

  const serverId = (server as any).id;

  // 2. Create default roles (Owner, Admin, Moderator, Member)
  const roles = [
    { name: 'Owner', color: '#F1C40F', position: 0, is_default: false },
    { name: 'Admin', color: '#E74C3C', position: 1, is_default: false },
    { name: 'Moderator', color: '#3498DB', position: 2, is_default: false },
    { name: 'Member', color: '#99AAB5', position: 3, is_default: true },
  ];

  const { data: createdRoles, error: rolesError } = await supabase
    .from('server_roles')
    // @ts-ignore
    .insert(roles.map(r => ({ ...r, server_id: serverId })))
    .select();

  if (rolesError) {
    console.error('Error creating default roles:', rolesError);
    return server;
  }

  // 3. Create permissions for each role
  const rolePermissions = (createdRoles as any[]).map((role: any) => {
    const isOwner = role.name === 'Owner';
    const isAdmin = role.name === 'Admin';
    const isMod = role.name === 'Moderator';

    return {
      role_id: role.id,
      manage_server: isOwner,
      manage_channels: isOwner || isAdmin,
      manage_roles: isOwner || isAdmin,
      manage_members: isOwner || isAdmin || isMod,
      send_messages: true,
      pin_messages: isOwner || isAdmin || isMod,
      delete_messages: isOwner || isAdmin || isMod,
      create_invite: isOwner || isAdmin || isMod,
      kick_members: isOwner || isAdmin || isMod,
      ban_members: isOwner || isAdmin,
    };
  });

  // @ts-ignore
  const { error: permError } = await supabase.from('server_role_permissions').insert(rolePermissions);
  if (permError) {
    console.error('Error creating role permissions:', permError);
  }

  // 4. Create default "Text Channels" category
  const { data: category, error: categoryError } = await supabase
    .from('server_categories')
    // @ts-ignore
    .insert({
      server_id: serverId,
      name: 'Text Channels',
      position: 0
    })
    .select()
    .single();

  if (categoryError) {
    console.error('Error creating default category:', categoryError);
  }

  // 5. Create #general channel
  // @ts-ignore
  const { error: channelError } = await supabase.from('server_channels').insert({
    server_id: serverId,
    category_id: category ? (category as any).id : null,
    name: 'general',
    topic: 'General discussion',
    position: 0
  });

  if (channelError) {
    console.error('Error creating #general channel:', channelError);
  }

  // 6. Add creator as member with Owner role
  const ownerRole = (createdRoles as any[]).find((r: any) => r.name === 'Owner');
  // @ts-ignore
  const { error: memberError } = await supabase.from('server_members').insert({
    server_id: serverId,
    user_id: creatorId,
    role_id: ownerRole?.id
  });

  if (memberError) {
    console.error('Error adding creator as server member:', memberError);
  }

  return server;
};

/**
 * Get a single server by ID
 */
export const getServer = async (serverId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('servers')
    .select('*')
    .eq('id', serverId)
    .single();

  if (error) {
    console.error('Error fetching server:', error);
    return null;
  }

  return data;
};

/**
 * Get all servers a user belongs to (with their role)
 */
export const getUserServers = async (userId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('server_members')
    // @ts-ignore
    .select('*, server:servers(*), role:server_roles(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user servers:', error);
    return [];
  }

  return (data as any[]).map((membership: any) => ({
    ...membership.server,
    userRole: membership.role
  }));
};

/**
 * Update server details
 */
export const updateServer = async (serverId: string, updates: UpdateServerData): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('servers')
    // @ts-ignore
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', serverId)
    .select()
    .single();

  if (error) {
    console.error('Error updating server:', error);
    return null;
  }

  return data;
};

/**
 * Delete a server (cascades to all related data)
 */
export const deleteServer = async (serverId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('servers')
    .delete()
    .eq('id', serverId);

  if (error) {
    console.error('Error deleting server:', error);
    return null;
  }

  return true;
};

/**
 * Leave a server
 */
export const leaveServer = async (serverId: string, userId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('server_members')
    .delete()
    .eq('server_id', serverId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving server:', error);
    return null;
  }

  return true;
};

/**
 * Search public servers
 */
export const searchPublicServers = async (searchQuery: string = ''): Promise<any[]> => {
  if (!supabase) return [];

  let query = supabase
    .from('servers')
    .select('*')
    .eq('is_private', false);

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query
    .order('member_count', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error searching servers:', error);
    return [];
  }

  return data;
};

// ============================================
// INVITE CODE OPERATIONS
// ============================================

function generateInviteCodeString(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a new invite code for a server
 */
export const generateInviteCode = async (serverId: string): Promise<string | null> => {
  if (!supabase) return null;

  const newCode = generateInviteCodeString();

  const { error } = await supabase
    .from('servers')
    // @ts-ignore
    .update({ invite_code: newCode })
    .eq('id', serverId);

  if (error) {
    console.error('Error generating invite code:', error);
    return null;
  }

  return newCode;
};

/**
 * Join a server by invite code
 */
export const joinByInviteCode = async (code: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  // Find server by invite code
  const { data: server, error: findError } = await supabase
    .from('servers')
    .select('*')
    .eq('invite_code', code)
    .single();

  if (findError || !server) {
    console.error('Error finding server by invite code:', findError);
    return null;
  }

  // Get default role
  const { data: defaultRole } = await supabase
    .from('server_roles')
    .select('*')
    .eq('server_id', (server as any).id)
    .eq('is_default', true)
    .single();

  if (!defaultRole) {
    console.error('No default role found for server');
    return null;
  }

  // Add user as member
  const { data, error } = await supabase
    .from('server_members')
    // @ts-ignore
    .insert({
      server_id: (server as any).id,
      user_id: userId,
      role_id: (defaultRole as any).id
    })
    .select()
    .single();

  if (error) {
    console.error('Error joining server:', error);
    return null;
  }

  return { server, membership: data };
};

// ============================================
// CHANNEL OPERATIONS
// ============================================

/**
 * Create a channel in a server
 */
export const createChannel = async (serverId: string, channelData: CreateChannelData): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('server_channels')
    // @ts-ignore
    .insert({
      server_id: serverId,
      category_id: channelData.categoryId || null,
      name: channelData.name.toLowerCase().replace(/\s+/g, '-'),
      topic: channelData.topic,
      is_private: channelData.isPrivate ?? false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating channel:', error);
    return null;
  }

  return data;
};

/**
 * Get all channels for a server, grouped by category
 */
export const getChannelsByServer = async (serverId: string): Promise<{ categories: any[], channels: any[] }> => {
  if (!supabase) return { categories: [], channels: [] };

  const [categoriesResult, channelsResult] = await Promise.all([
    supabase
      .from('server_categories')
      .select('*')
      .eq('server_id', serverId)
      .order('position', { ascending: true }),
    supabase
      .from('server_channels')
      .select('*')
      .eq('server_id', serverId)
      .order('position', { ascending: true })
  ]);

  if (categoriesResult.error) {
    console.error('Error fetching categories:', categoriesResult.error);
  }
  if (channelsResult.error) {
    console.error('Error fetching channels:', channelsResult.error);
  }

  return {
    categories: categoriesResult.data || [],
    channels: channelsResult.data || []
  };
};

/**
 * Update a channel
 */
export const updateChannel = async (channelId: string, updates: UpdateChannelData): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('server_channels')
    // @ts-ignore
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', channelId)
    .select()
    .single();

  if (error) {
    console.error('Error updating channel:', error);
    return null;
  }

  return data;
};

/**
 * Delete a channel
 */
export const deleteChannel = async (channelId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('server_channels')
    .delete()
    .eq('id', channelId);

  if (error) {
    console.error('Error deleting channel:', error);
    return null;
  }

  return true;
};

// ============================================
// CATEGORY OPERATIONS
// ============================================

/**
 * Create a category in a server
 */
export const createCategory = async (serverId: string, name: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('server_categories')
    // @ts-ignore
    .insert({ server_id: serverId, name })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return data;
};

/**
 * Update a category
 */
export const updateCategory = async (categoryId: string, updates: { name?: string; position?: number }): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('server_categories')
    // @ts-ignore
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    return null;
  }

  return data;
};

/**
 * Delete a category (channels become uncategorized)
 */
export const deleteCategory = async (categoryId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('server_categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('Error deleting category:', error);
    return null;
  }

  return true;
};

/**
 * Reorder categories
 */
export const reorderCategories = async (serverId: string, orderedIds: string[]): Promise<boolean | null> => {
  if (!supabase) return null;

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('server_categories')
      // @ts-ignore
      .update({ position: index })
      .eq('id', id)
      .eq('server_id', serverId)
  );

  await Promise.all(updates);
  return true;
};

// ============================================
// ROLE & PERMISSION OPERATIONS
// ============================================

/**
 * Create a custom role
 */
export const createRole = async (serverId: string, roleData: CreateRoleData): Promise<any> => {
  if (!supabase) return null;

  const { data: role, error: roleError } = await supabase
    .from('server_roles')
    // @ts-ignore
    .insert({
      server_id: serverId,
      name: roleData.name,
      color: roleData.color || '#99AAB5',
      position: roleData.position ?? 2
    })
    .select()
    .single();

  if (roleError) {
    console.error('Error creating role:', roleError);
    return null;
  }

  // Create default permissions for the new role
  // @ts-ignore
  await supabase.from('server_role_permissions').insert({
    role_id: (role as any).id,
    send_messages: true,
    // All other permissions default to false
  });

  return role;
};

/**
 * Get all roles for a server (with permissions)
 */
export const getServerRoles = async (serverId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('server_roles')
    // @ts-ignore
    .select('*, permissions:server_role_permissions(*)')
    .eq('server_id', serverId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching server roles:', error);
    return [];
  }

  return (data as any[]).map((role: any) => ({
    ...role,
    permissions: Array.isArray(role.permissions) ? role.permissions[0] : role.permissions
  }));
};

/**
 * Update a role
 */
export const updateRole = async (roleId: string, updates: UpdateRoleData): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('server_roles')
    // @ts-ignore
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', roleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating role:', error);
    return null;
  }

  return data;
};

/**
 * Delete a role (reassign members to default role)
 */
export const deleteRole = async (roleId: string, serverId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  // Find default role
  const { data: defaultRole } = await supabase
    .from('server_roles')
    .select('id')
    .eq('server_id', serverId)
    .eq('is_default', true)
    .single();

  if (defaultRole) {
    // Reassign members with this role to default
    // @ts-ignore
    await supabase
      .from('server_members')
      // @ts-ignore
      .update({ role_id: (defaultRole as any).id })
      .eq('role_id', roleId);
  }

  const { error } = await supabase
    .from('server_roles')
    .delete()
    .eq('id', roleId);

  if (error) {
    console.error('Error deleting role:', error);
    return null;
  }

  return true;
};

/**
 * Update permissions for a role
 */
export const updateRolePermissions = async (roleId: string, permissions: UpdatePermissionsData): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('server_role_permissions')
    // @ts-ignore
    .update({ ...permissions, updated_at: new Date().toISOString() })
    .eq('role_id', roleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating role permissions:', error);
    return null;
  }

  return data;
};

/**
 * Assign a role to a member
 */
export const assignRole = async (serverId: string, userId: string, roleId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('server_members')
    // @ts-ignore
    .update({ role_id: roleId })
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error assigning role:', error);
    return null;
  }

  return data;
};

// ============================================
// MEMBER OPERATIONS
// ============================================

/**
 * Get all members of a server (with user info and role)
 */
export const getServerMembers = async (serverId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('server_members')
    // @ts-ignore
    .select('*, user:users!user_id(id, username, display_name, avatar_emoji, avatar_url, is_online, last_seen), role:server_roles!role_id(id, name, color, position)')
    .eq('server_id', serverId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching server members:', error);
    return [];
  }

  return data;
};

/**
 * Remove a member from a server
 */
export const removeMember = async (serverId: string, userId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('server_members')
    .delete()
    .eq('server_id', serverId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing member:', error);
    return null;
  }

  return true;
};

/**
 * Get a member's resolved permissions for a server
 */
export const getMemberPermissions = async (serverId: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  const { data: membership, error } = await supabase
    .from('server_members')
    // @ts-ignore
    .select('*, role:server_roles!role_id(*, permissions:server_role_permissions(*))')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .single();

  if (error || !membership) {
    console.error('Error fetching member permissions:', error);
    return null;
  }

  const role = (membership as any).role;
  const permissions = Array.isArray(role?.permissions) ? role.permissions[0] : role?.permissions;

  return {
    role,
    permissions: permissions || {
      manage_server: false,
      manage_channels: false,
      manage_roles: false,
      manage_members: false,
      send_messages: true,
      pin_messages: false,
      delete_messages: false,
      create_invite: false,
      kick_members: false,
      ban_members: false,
    }
  };
};

// ============================================
// CHANNEL MESSAGE OPERATIONS
// ============================================

/**
 * Send a message to a channel
 */
export const sendChannelMessage = async (channelId: string, senderId: string, content: string, imageUrl?: string): Promise<any> => {
  if (!supabase) return null;

  const insertPayload: any = {
    channel_id: channelId,
    sender_id: senderId,
    content
  };

  // Include image_url if provided (for image sharing)
  if (imageUrl) {
    insertPayload.image_url = imageUrl;
  }

  const { data, error } = await supabase
    .from('channel_messages')
    // @ts-ignore
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error sending channel message:', error);
    return null;
  }

  return data;
};

/**
 * Get messages for a channel
 */
export const getChannelMessages = async (channelId: string, limit: number = 100): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('channel_messages')
    // @ts-ignore
    .select('*, sender:users!sender_id(id, username, display_name, avatar_emoji, avatar_url, is_online)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching channel messages:', error);
    return [];
  }

  return data;
};

/**
 * Pin a channel message
 */
export const pinChannelMessage = async (messageId: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('channel_messages')
    // @ts-ignore
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
 * Unpin a channel message
 */
export const unpinChannelMessage = async (messageId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('channel_messages')
    // @ts-ignore
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
 * Get pinned messages for a channel
 */
export const getPinnedChannelMessages = async (channelId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('channel_messages')
    // @ts-ignore
    .select('*, sender:users!sender_id(id, username, display_name, avatar_emoji, avatar_url)')
    .eq('channel_id', channelId)
    .eq('is_pinned', true)
    .order('pinned_at', { ascending: false });

  if (error) {
    console.error('Error fetching pinned messages:', error);
    return [];
  }

  return data;
};

// ============================================
// CHANNEL MESSAGE REACTIONS
// ============================================

/**
 * Add a reaction to a channel message
 */
export const addChannelReaction = async (messageId: string, userId: string, emoji: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('channel_message_reactions')
    // @ts-ignore
    .insert({
      message_id: messageId,
      user_id: userId,
      emoji
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding reaction:', error);
    return null;
  }

  return data;
};

/**
 * Remove a reaction from a channel message
 */
export const removeChannelReaction = async (messageId: string, userId: string, emoji: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('channel_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) {
    console.error('Error removing reaction:', error);
    return null;
  }

  return true;
};

/**
 * Get all reactions for a channel message
 */
export const getChannelMessageReactions = async (messageId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('channel_message_reactions')
    // @ts-ignore
    .select('*, user:users!user_id(id, username, display_name)')
    .eq('message_id', messageId);

  if (error) {
    console.error('Error fetching reactions:', error);
    return [];
  }

  return data;
};

// ============================================
// SERVER JOIN REQUESTS
// ============================================

/**
 * Request to join a private server
 */
export const requestToJoinServer = async (serverId: string, userId: string, message: string = ''): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('server_join_requests')
    // @ts-ignore
    .insert({
      server_id: serverId,
      user_id: userId,
      message,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error requesting to join server:', error);
    return null;
  }

  return data;
};

/**
 * Get pending join requests for a server
 */
export const getServerJoinRequests = async (serverId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('server_join_requests')
    // @ts-ignore
    .select('*, user:users!user_id(id, username, display_name, avatar_emoji, avatar_url)')
    .eq('server_id', serverId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching join requests:', error);
    return [];
  }

  return data;
};

/**
 * Approve a join request
 */
export const approveServerJoinRequest = async (requestId: string, serverId: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  // Update request status
  // @ts-ignore
  await supabase.from('server_join_requests').update({ status: 'approved' }).eq('id', requestId);

  // Get default role
  const { data: defaultRole } = await supabase
    .from('server_roles')
    .select('id')
    .eq('server_id', serverId)
    .eq('is_default', true)
    .single();

  if (!defaultRole) return null;

  // Add user as member
  const { data, error } = await supabase
    .from('server_members')
    // @ts-ignore
    .insert({
      server_id: serverId,
      user_id: userId,
      role_id: (defaultRole as any).id
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
 * Deny a join request
 */
export const denyServerJoinRequest = async (requestId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('server_join_requests')
    // @ts-ignore
    .update({ status: 'denied' })
    .eq('id', requestId);

  if (error) {
    console.error('Error denying join request:', error);
    return null;
  }

  return true;
};

// ============================================
// MESSAGE EDIT & DELETE
// ============================================

/**
 * Edit a channel message (only the sender can edit)
 */
export const editChannelMessage = async (messageId: string, senderId: string, newContent: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('channel_messages')
    // @ts-ignore
    .update({
      content: newContent,
      is_edited: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('sender_id', senderId)
    .select()
    .single();

  if (error) {
    console.error('Error editing channel message:', error);
    return null;
  }

  return data;
};

/**
 * Delete a channel message
 */
export const deleteChannelMessage = async (messageId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('channel_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting channel message:', error);
    return null;
  }

  return true;
};

// ============================================
// REPLY / THREADING
// ============================================

/**
 * Send a reply to a channel message
 */
export const sendChannelReply = async (
  channelId: string,
  senderId: string,
  content: string,
  replyToMessageId: string,
  imageUrl?: string
): Promise<any> => {
  if (!supabase) return null;

  const insertPayload: any = {
    channel_id: channelId,
    sender_id: senderId,
    content,
    reply_to_id: replyToMessageId,
  };

  if (imageUrl) {
    insertPayload.image_url = imageUrl;
  }

  const { data, error } = await supabase
    .from('channel_messages')
    // @ts-ignore
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error sending channel reply:', error);
    return null;
  }

  return data;
};

// ============================================
// BAN / TIMEOUT SYSTEM
// ============================================

/**
 * Ban a member from a server
 */
export const banMember = async (
  serverId: string,
  userId: string,
  bannedBy: string,
  reason?: string
): Promise<any> => {
  if (!supabase) return null;

  // Remove from members first
  await supabase
    .from('server_members')
    .delete()
    .eq('server_id', serverId)
    .eq('user_id', userId);

  // Add to bans table
  const { data, error } = await supabase
    .from('server_bans')
    // @ts-ignore
    .insert({
      server_id: serverId,
      user_id: userId,
      banned_by: bannedBy,
      reason: reason || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error banning member:', error);
    return null;
  }

  return data;
};

/**
 * Unban a member from a server
 */
export const unbanMember = async (serverId: string, userId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('server_bans')
    .delete()
    .eq('server_id', serverId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error unbanning member:', error);
    return null;
  }

  return true;
};

/**
 * Get all bans for a server
 */
export const getServerBans = async (serverId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('server_bans')
    // @ts-ignore
    .select('*, user:users!user_id(id, username, display_name, avatar_emoji, avatar_url), banned_by_user:users!banned_by(id, display_name)')
    .eq('server_id', serverId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching server bans:', error);
    return [];
  }

  return data || [];
};

// ============================================
// TYPING INDICATORS
// ============================================

/**
 * Update typing indicator for a user in a channel
 */
export const updateTypingIndicator = async (channelId: string, userId: string, displayName: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('channel_typing_indicators')
    // @ts-ignore
    .upsert({
      channel_id: channelId,
      user_id: userId,
      display_name: displayName,
      updated_at: new Date().toISOString()
    }, { onConflict: 'channel_id,user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error updating typing indicator:', error);
    return null;
  }

  return data;
};

/**
 * Clear typing indicator for a user in a channel
 */
export const clearTypingIndicator = async (channelId: string, userId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('channel_typing_indicators')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing typing indicator:', error);
    return null;
  }

  return true;
};

/**
 * Get typing indicators for a channel (active in the last 5 seconds)
 */
export const getTypingIndicators = async (channelId: string, currentUserId: string): Promise<any[]> => {
  if (!supabase) return [];

  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();

  const { data, error } = await supabase
    .from('channel_typing_indicators')
    .select('*')
    .eq('channel_id', channelId)
    .neq('user_id', currentUserId)
    .gte('updated_at', fiveSecondsAgo);

  if (error) {
    console.error('Error fetching typing indicators:', error);
    return [];
  }

  return data || [];
};

// ============================================
// MESSAGE SEARCH
// ============================================

/**
 * Search messages across all channels in a server
 */
export const searchChannelMessages = async (serverId: string, query: string, limit: number = 50): Promise<any[]> => {
  if (!supabase || !query.trim()) return [];

  // First get all channel IDs for this server
  const { data: channels } = await supabase
    .from('server_channels')
    .select('id')
    .eq('server_id', serverId);

  if (!channels || channels.length === 0) return [];

  const channelIds = channels.map((c: any) => c.id);

  const { data, error } = await supabase
    .from('channel_messages')
    // @ts-ignore
    .select('*, sender:users!sender_id(id, username, display_name, avatar_emoji), channel:server_channels!channel_id(id, name)')
    .in('channel_id', channelIds)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching messages:', error);
    return [];
  }

  return data || [];
};

// ============================================
// UNREAD TRACKING
// ============================================

/**
 * Mark a channel as read for a user
 */
export const markChannelRead = async (channelId: string, userId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('channel_read_receipts')
    // @ts-ignore
    .upsert({
      channel_id: channelId,
      user_id: userId,
      last_read_at: new Date().toISOString()
    }, { onConflict: 'channel_id,user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error marking channel as read:', error);
    return null;
  }

  return data;
};

/**
 * Get unread message counts per channel for a user in a server
 */
export const getUnreadCounts = async (serverId: string, userId: string): Promise<Record<string, number>> => {
  if (!supabase) return {};

  // Get all channels for the server
  const { data: channels } = await supabase
    .from('server_channels')
    .select('id')
    .eq('server_id', serverId);

  if (!channels || channels.length === 0) return {};

  const channelIds = channels.map((c: any) => c.id);

  // Get read receipts for this user
  const { data: receipts } = await supabase
    .from('channel_read_receipts')
    .select('channel_id, last_read_at')
    .eq('user_id', userId)
    .in('channel_id', channelIds);

  const receiptMap: Record<string, string> = {};
  (receipts || []).forEach((r: any) => {
    receiptMap[r.channel_id] = r.last_read_at;
  });

  // For each channel, count messages after last_read_at
  const counts: Record<string, number> = {};

  await Promise.all(
    channelIds.map(async (channelId: string) => {
      const lastRead = receiptMap[channelId];
      let query = supabase
        .from('channel_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .neq('sender_id', userId);

      if (lastRead) {
        query = query.gt('created_at', lastRead);
      }

      const { count } = await query;
      if (count && count > 0) {
        counts[channelId] = count;
      }
    })
  );

  return counts;
};
