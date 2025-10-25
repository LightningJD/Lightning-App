/**
 * Supabase Database Type Definitions
 *
 * This file provides strongly-typed interfaces for Supabase database operations.
 * It defines the complete database schema including all tables, views, functions, and enums.
 *
 * Usage:
 * import type { Database } from './types/supabase';
 * const supabase = createClient<Database>(url, key);
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          clerk_user_id: string | null
          email: string
          username: string
          display_name: string
          avatar_url: string | null
          avatar_emoji: string | null
          bio: string | null
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_point: unknown | null // PostGIS geography
          is_private: boolean
          testimony_visibility: 'everyone' | 'friends' | 'private' | null
          message_privacy: 'everyone' | 'friends' | 'none' | null
          notify_messages: boolean
          notify_friend_requests: boolean
          notify_nearby: boolean
          search_radius: number
          spotify_url: string | null
          last_seen: string | null
          is_online: boolean
          profile_completed: boolean
          has_testimony: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          clerk_user_id?: string | null
          email: string
          username: string
          display_name: string
          avatar_url?: string | null
          avatar_emoji?: string | null
          bio?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_point?: unknown | null
          is_private?: boolean
          testimony_visibility?: 'everyone' | 'friends' | 'private' | null
          message_privacy?: 'everyone' | 'friends' | 'none' | null
          notify_messages?: boolean
          notify_friend_requests?: boolean
          notify_nearby?: boolean
          search_radius?: number
          spotify_url?: string | null
          last_seen?: string | null
          is_online?: boolean
          profile_completed?: boolean
          has_testimony?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          clerk_user_id?: string | null
          email?: string
          username?: string
          display_name?: string
          avatar_url?: string | null
          avatar_emoji?: string | null
          bio?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_point?: unknown | null
          is_private?: boolean
          testimony_visibility?: 'everyone' | 'friends' | 'private' | null
          message_privacy?: 'everyone' | 'friends' | 'none' | null
          notify_messages?: boolean
          notify_friend_requests?: boolean
          notify_nearby?: boolean
          search_radius?: number
          spotify_url?: string | null
          last_seen?: string | null
          is_online?: boolean
          profile_completed?: boolean
          has_testimony?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonies: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          lesson: string | null
          question1_answer: string | null
          question2_answer: string | null
          question3_answer: string | null
          question4_answer: string | null
          word_count: number
          is_public: boolean
          music_platform: 'spotify' | 'youtube' | null
          music_spotify_url: string | null
          music_track_name: string | null
          music_artist: string | null
          music_audio_url: string | null
          music_start_time: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          content: string
          lesson?: string | null
          question1_answer?: string | null
          question2_answer?: string | null
          question3_answer?: string | null
          question4_answer?: string | null
          word_count?: number
          is_public?: boolean
          music_platform?: 'spotify' | 'youtube' | null
          music_spotify_url?: string | null
          music_track_name?: string | null
          music_artist?: string | null
          music_audio_url?: string | null
          music_start_time?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          lesson?: string | null
          question1_answer?: string | null
          question2_answer?: string | null
          question3_answer?: string | null
          question4_answer?: string | null
          word_count?: number
          is_public?: boolean
          music_platform?: 'spotify' | 'youtube' | null
          music_spotify_url?: string | null
          music_track_name?: string | null
          music_artist?: string | null
          music_audio_url?: string | null
          music_start_time?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonies_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      testimony_likes: {
        Row: {
          id: string
          testimony_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          testimony_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          testimony_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_likes_testimony_id_fkey"
            columns: ["testimony_id"]
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimony_likes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      testimony_views: {
        Row: {
          id: string
          testimony_id: string
          viewer_id: string
          created_at: string
        }
        Insert: {
          id?: string
          testimony_id: string
          viewer_id: string
          created_at?: string
        }
        Update: {
          id?: string
          testimony_id?: string
          viewer_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_views_testimony_id_fkey"
            columns: ["testimony_id"]
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimony_views_viewer_id_fkey"
            columns: ["viewer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      testimony_comments: {
        Row: {
          id: string
          testimony_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          testimony_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          testimony_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_comments_testimony_id_fkey"
            columns: ["testimony_id"]
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimony_comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          avatar_emoji: string
          creator_id: string
          is_private: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          avatar_emoji?: string
          creator_id: string
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          avatar_emoji?: string
          creator_id?: string
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'leader' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: 'leader' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: 'leader' | 'member'
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          sender_id: string
          content: string
          is_pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          sender_id: string
          content: string
          is_pinned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          sender_id?: string
          content?: string
          is_pinned?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      join_requests: {
        Row: {
          id: string
          group_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      blocked_users: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string | null
          testimony_id: string | null
          report_type: 'user' | 'testimony' | 'message' | 'group'
          reason: string
          details: string | null
          status: 'pending' | 'reviewed' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id?: string | null
          testimony_id?: string | null
          report_type: 'user' | 'testimony' | 'message' | 'group'
          reason: string
          details?: string | null
          status?: 'pending' | 'reviewed' | 'resolved'
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string | null
          testimony_id?: string | null
          report_type?: 'user' | 'testimony' | 'message' | 'group'
          reason?: string
          details?: string | null
          status?: 'pending' | 'reviewed' | 'resolved'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_testimony_id_fkey"
            columns: ["testimony_id"]
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      conversations: {
        Row: {
          user_id: string
          other_user_id: string
          last_message: string
          last_message_at: string
          unread_count: number
        }
        Relationships: []
      }
    }
    Functions: {
      find_nearby_users: {
        Args: {
          user_lat: number
          user_lng: number
          radius_km: number
        }
        Returns: {
          id: string
          username: string
          display_name: string
          avatar_emoji: string | null
          avatar_url: string | null
          distance_km: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
