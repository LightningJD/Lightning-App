/**
 * Lightning App - Server Types (Discord-Style)
 * Type definitions for servers, channels, roles, and permissions
 */

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface Server {
  id: string;
  name: string;
  description?: string;
  icon_emoji: string;
  icon_url?: string;
  banner_url?: string;
  creator_id: string;
  invite_code?: string;
  is_private: boolean;
  member_count: number;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface ServerCategory {
  id: string;
  server_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ServerChannel {
  id: string;
  server_id: string;
  category_id?: string;
  name: string;
  topic?: string;
  position: number;
  is_private: boolean;
  emoji_icon?: string;
  created_at: string;
  updated_at: string;
}

export interface ServerRole {
  id: string;
  server_id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServerRolePermissions {
  id: string;
  role_id: string;
  manage_server: boolean;
  manage_channels: boolean;
  manage_roles: boolean;
  manage_members: boolean;
  send_messages: boolean;
  pin_messages: boolean;
  delete_messages: boolean;
  create_invite: boolean;
  kick_members: boolean;
  ban_members: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServerMember {
  id: string;
  server_id: string;
  user_id: string;
  role_id: string;
  joined_at: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  is_pinned: boolean;
  pinned_by?: string;
  pinned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ServerJoinRequest {
  id: string;
  server_id: string;
  user_id: string;
  message?: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UI/COMPONENT TYPES
// ============================================================================

export interface ServerWithRole extends Server {
  userRole?: ServerRole;
  userPermissions?: ServerRolePermissions;
}

export interface ServerChannelWithCategory extends ServerChannel {
  category?: ServerCategory;
}

export interface ServerMemberWithUser extends ServerMember {
  user?: {
    id: string;
    display_name: string;
    username: string;
    avatar_emoji?: string;
    avatar_url?: string;
    is_online?: boolean;
    last_seen?: string;
  };
  role?: ServerRole;
}

export interface ChannelMessageWithSender extends ChannelMessage {
  sender?: {
    id: string;
    display_name: string;
    username: string;
    avatar_emoji?: string;
    avatar_url?: string;
    is_online?: boolean;
  };
}

export interface ServerRoleWithPermissions extends ServerRole {
  permissions?: ServerRolePermissions;
}

export interface ChannelsByCategory {
  category: ServerCategory | null;
  channels: ServerChannel[];
}

// ============================================================================
// FUNCTION PARAMETER TYPES
// ============================================================================

export interface CreateServerData {
  name: string;
  description?: string;
  iconEmoji?: string;
  isPrivate?: boolean;
}

export interface CreateChannelData {
  name: string;
  topic?: string;
  categoryId?: string;
  isPrivate?: boolean;
  emojiIcon?: string;
  allowedRoleIds?: string[];
}

export interface CreateRoleData {
  name: string;
  color?: string;
  position?: number;
}

export interface UpdateServerData {
  name?: string;
  description?: string;
  icon_emoji?: string;
  icon_url?: string;
  banner_url?: string;
  is_private?: boolean;
}

export interface UpdateChannelData {
  name?: string;
  topic?: string;
  category_id?: string;
  position?: number;
  is_private?: boolean;
  emoji_icon?: string;
  allowed_role_ids?: string[];
}

export interface UpdateRoleData {
  name?: string;
  color?: string;
  position?: number;
}

export interface UpdatePermissionsData {
  manage_server?: boolean;
  manage_channels?: boolean;
  manage_roles?: boolean;
  manage_members?: boolean;
  send_messages?: boolean;
  pin_messages?: boolean;
  delete_messages?: boolean;
  create_invite?: boolean;
  kick_members?: boolean;
  ban_members?: boolean;
}
