/**
 * TypeScript Type Definitions
 * Proper types for database entities to replace 'any' usage
 */

// ============================================
// TESTIMONY TYPES
// ============================================

export interface Testimony {
  id: string;
  user_id: string;
  title: string;
  content: string;
  lesson: string | null;
  question1_answer: string | null;
  question2_answer: string | null;
  question3_answer: string | null;
  question4_answer: string | null;
  word_count: number;
  is_public: boolean;
  view_count: number;
  like_count: number;
  music_platform: 'youtube' | 'spotify' | null;
  music_track_name: string | null;
  music_artist: string | null;
  music_spotify_url: string | null;
  music_audio_url: string | null;
  music_start_time: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// DATABASE USER TYPES
// ============================================

export interface DatabaseUser {
  id: string;
  clerk_user_id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_emoji: string;
  avatar_url: string | null;
  bio: string;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  latitude: number | null;
  longitude: number | null;
  has_testimony: boolean;
  profile_completed: boolean;
  // Privacy settings
  is_private: boolean;
  testimony_visibility: 'everyone' | 'friends' | 'private';
  message_privacy: 'everyone' | 'friends' | 'none';
  // Notification settings
  notify_messages: boolean;
  notify_friend_requests: boolean;
  notify_nearby: boolean;
  // Search settings
  search_radius: number;
  // Social
  spotify_url: string | null;
  // Timestamps
  last_seen: string | null;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// PROFILE UPDATE TYPES
// ============================================

export interface ProfileUpdateData {
  displayName?: string;
  username?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  avatarUrl?: string | null;
  profileCompleted?: boolean;
  search_radius?: number;
  // Privacy settings
  isPrivate?: boolean;
  testimonyVisibility?: 'everyone' | 'friends' | 'private';
  messagePrivacy?: 'everyone' | 'friends' | 'none';
  // Notification settings
  notifyMessages?: boolean;
  notifyFriendRequests?: boolean;
  notifyNearby?: boolean;
  // Social
  spotifyUrl?: string | null;
}

// ============================================
// CLERK USER TYPES
// ============================================

export interface ClerkUser {
  id: string;
  username?: string;
  emailAddresses: Array<{ emailAddress: string }>;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  primaryEmailAddress?: { emailAddress: string };
  imageUrl?: string;
  publicMetadata?: {
    customAvatar?: string;
    bio?: string;
    location?: string;
  };
}

// ============================================
// TESTIMONY COMMENT TYPES
// ============================================

export interface TestimonyComment {
  id: string;
  testimony_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: {
    username: string;
    display_name: string;
    avatar_emoji: string;
    avatar_url: string | null;
  };
}

// ============================================
// TESTIMONY ANALYTICS TYPES
// ============================================

export interface TestimonyView {
  id: string;
  testimony_id: string;
  viewer_id: string;
  viewed_at: string;
}

export interface TestimonyLike {
  id: string;
  testimony_id: string;
  user_id: string;
  created_at: string;
}

// ============================================
// FUNCTION RETURN TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ViewTrackingResult {
  success: boolean;
  error?: string;
  alreadyViewed?: boolean;
}

export interface LikeToggleResult {
  success: boolean;
  error?: string;
  liked?: boolean;
}

export interface CommentResult {
  success: boolean;
  error?: string;
  comment?: TestimonyComment;
}

export interface CommentsResult {
  comments: TestimonyComment[];
}

export interface CountResult {
  count: number;
}

export interface LikedResult {
  liked: boolean;
}
