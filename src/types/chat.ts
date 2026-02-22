/**
 * Shared "view" types for chat-related hooks and components.
 * These represent the shapes returned by Supabase joined queries,
 * not the raw database row models (which live in types/index.ts).
 */

export interface GroupMessageView {
  id: number | string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: {
    display_name: string;
    avatar_emoji: string;
  };
}

export interface GroupMessageReactionView {
  id: string;
  message_id: string | number;
  user_id: string;
  emoji: string;
  user: {
    id: string;
    display_name: string;
    avatar_emoji: string;
  };
}

export interface GroupMemberView {
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

export interface GroupDataView {
  id: string;
  name: string;
  description?: string;
  avatar_emoji: string;
  member_count: number;
  userRole: string;
}

export interface ConversationView {
  id: number | string;
  userId: string;
  name: string;
  avatar: string;
  avatarImage?: string;
  lastMessage: string;
  timestamp: string;
  online?: boolean;
  unreadCount?: number;
}
