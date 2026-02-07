/**
 * Lightning App - TypeScript Type Definitions
 * Complete type safety for all database models and components
 */

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface User {
  id: string;
  clerk_id: string;
  clerk_user_id?: string; // Alternative field name
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  avatar_emoji?: string;
  bio?: string;
  location_city?: string;
  location_lat?: number;
  location_lng?: number;
  location_point?: unknown; // PostGIS geography type
  is_private?: boolean;
  testimony_visibility?: 'everyone' | 'friends' | 'private';
  message_privacy?: 'everyone' | 'friends' | 'none';
  notify_messages?: boolean;
  notify_friend_requests?: boolean;
  notify_nearby?: boolean;
  search_radius?: number;
  spotify_url?: string;
  last_seen?: string;
  is_online?: boolean;
  profile_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimony {
  id: string;
  user_id: string;
  title: string;
  content: string;
  lesson?: string;
  tags?: string[];
  is_public: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface TestimonyLike {
  id: string;
  testimony_id: string;
  user_id: string;
  created_at: string;
}

export interface TestimonyComment {
  id: string;
  testimony_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TestimonyView {
  id: string;
  testimony_id: string;
  user_id: string;
  viewed_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  is_private: boolean;
  member_count: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMessageReaction {
  id: string;
  group_message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  user_id: string | null;
  friend_id: string | null;
  user_id_1: string;
  user_id_2: string;
  requested_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'rejected'; // 'declined' is used in database
  created_at: string | null;
  updated_at: string | null;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  blocked_at?: string | null;
  reason?: string | null;
  created_at: string | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id?: string;
  testimony_id?: string;
  message_id?: string;
  group_id?: string;
  content_type: 'user' | 'testimony' | 'message' | 'group';
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UI/COMPONENT TYPES
// ============================================================================

export interface UserProfile {
  supabaseId: string;
  clerkId: string;
  displayName: string;
  username: string;
  avatar: string;
  avatarImage?: string;
  bio?: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  searchRadius?: number;
  spotifyUrl?: string;
  story?: {
    id: string;
    title: string;
    content: string;
    lesson?: string;
  };
  online?: boolean;
  lastSeen?: string;
  // Privacy settings
  isPrivate?: boolean;
  testimonyVisibility?: 'everyone' | 'friends' | 'private';
  messagePrivacy?: 'everyone' | 'friends' | 'none';
  // Notification settings
  notifyMessages?: boolean;
  notifyFriendRequests?: boolean;
  notifyNearby?: boolean;
}

export interface NearbyUser {
  id: string;
  clerk_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  location_city?: string;
  distance_miles: number;
  online?: boolean;
}

export interface Conversation {
  userId: string;
  displayName: string;
  username: string;
  avatar: string;
  avatarImage?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online?: boolean;
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  reactions?: MessageReaction[];
}

export interface GroupWithDetails extends Group {
  members?: GroupMember[];
  recentMessages?: GroupMessage[];
  unreadCount?: number;
}

export interface TestimonyWithUser extends Testimony {
  user?: User;
  likes?: TestimonyLike[];
  comments?: TestimonyComment[];
  isLiked?: boolean;
}

export interface CommentWithProfile extends TestimonyComment {
  user_profile?: User;
}

// ============================================================================
// FUNCTION RETURN TYPES
// ============================================================================

export interface MessageSendPermission {
  allowed: boolean;
  reason?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  timeRemaining?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  sanitized?: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface BaseComponentProps {
  nightMode: boolean;
}

export interface DialogProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subtext?: string;
  comingSoon?: boolean;
  onClick?: () => void;
  isOn?: boolean;
  onToggle?: (value: boolean) => void;
  dropdown?: boolean;
  dropdownOptions?: Array<{ value: string; label: string }>;
  selectedValue?: string;
  onDropdownChange?: (value: string) => void;
}

export interface TabProps extends BaseComponentProps {
  profile: UserProfile;
}

export interface ReportContentProps extends DialogProps {
  userProfile: UserProfile;
  reportType?: 'user' | 'testimony' | 'message' | 'group';
  reportedContent?: {
    id: string;
    ownerId?: string;
    name: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SortOrder = 'asc' | 'desc';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type Theme = 'light' | 'dark';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  field: string;
  order: SortOrder;
}

export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

// ============================================================================
// SUPABASE TYPES
// ============================================================================

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      testimonies: {
        Row: Testimony;
        Insert: Omit<Testimony, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Testimony, 'id' | 'created_at' | 'updated_at'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>;
      };
      groups: {
        Row: Group;
        Insert: Omit<Group, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Group, 'id' | 'created_at' | 'updated_at'>>;
      };
      group_messages: {
        Row: GroupMessage;
        Insert: Omit<GroupMessage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GroupMessage, 'id' | 'created_at' | 'updated_at'>>;
      };
      friendships: {
        Row: Friend;
        Insert: Omit<Friend, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Friend, 'id' | 'created_at' | 'updated_at'>>;
      };
      friends: {
        Row: Friend;
        Insert: Omit<Friend, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Friend, 'id' | 'created_at' | 'updated_at'>>;
      };
      blocked_users: {
        Row: BlockedUser;
        Insert: Omit<BlockedUser, 'id' | 'created_at'>;
        Update: Partial<Omit<BlockedUser, 'id' | 'created_at'>>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Report, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
};

// Helper type aliases for common operations
export type UserUpdate = Database['public']['Tables']['users']['Update'];

// Re-export server types
export type {
  Server,
  ServerCategory,
  ServerChannel,
  ServerRole,
  ServerRolePermissions,
  ServerMember,
  ChannelMessage,
  ChannelMessageReaction,
  ServerJoinRequest,
  ServerWithRole,
  ServerChannelWithCategory,
  ServerMemberWithUser,
  ChannelMessageWithSender,
  ServerRoleWithPermissions,
  ChannelsByCategory,
  CreateServerData,
  CreateChannelData,
  CreateRoleData,
  UpdateServerData,
  UpdateChannelData,
  UpdateRoleData,
  UpdatePermissionsData,
} from './servers';
