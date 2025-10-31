export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string | null
          id: string
          requested_by: string
          status: string
          updated_at: string | null
          user_id: string | null
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          created_at?: string | null
          friend_id?: string | null
          id?: string
          requested_by: string
          status: string
          updated_at?: string | null
          user_id?: string | null
          user_id_1: string
          user_id_2: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string | null
          id?: string
          requested_by?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_1_fkey"
            columns: ["user_id_1"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_2_fkey"
            columns: ["user_id_2"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          is_pinned: boolean | null
          pinned_at: string | null
          pinned_by: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          is_pinned?: boolean | null
          pinned_at?: string | null
          pinned_by?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          is_pinned?: boolean | null
          pinned_at?: string | null
          pinned_by?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_emoji: string | null
          avatar_url: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          is_private: boolean | null
          max_members: number | null
          member_count: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          avatar_emoji?: string | null
          avatar_url?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          max_members?: number | null
          member_count?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          avatar_emoji?: string | null
          avatar_url?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          max_members?: number | null
          member_count?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          message: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          message?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      testimonies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_public: boolean | null
          lesson: string | null
          like_count: number | null
          music_artist: string | null
          music_audio_url: string | null
          music_platform: string | null
          music_spotify_url: string | null
          music_start_time: number | null
          music_track_name: string | null
          question1_answer: string
          question2_answer: string
          question3_answer: string
          question4_answer: string
          title: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
          word_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          lesson?: string | null
          like_count?: number | null
          music_artist?: string | null
          music_audio_url?: string | null
          music_platform?: string | null
          music_spotify_url?: string | null
          music_start_time?: number | null
          music_track_name?: string | null
          question1_answer: string
          question2_answer: string
          question3_answer: string
          question4_answer: string
          title?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          lesson?: string | null
          like_count?: number | null
          music_artist?: string | null
          music_audio_url?: string | null
          music_platform?: string | null
          music_spotify_url?: string | null
          music_start_time?: number | null
          music_track_name?: string | null
          question1_answer?: string
          question2_answer?: string
          question3_answer?: string
          question4_answer?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          testimony_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          testimony_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          testimony_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_comments_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimony_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_likes: {
        Row: {
          created_at: string | null
          id: string
          testimony_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          testimony_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          testimony_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_likes_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimony_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_views: {
        Row: {
          id: string
          testimony_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          testimony_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          testimony_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_views_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimony_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_emoji: string | null
          avatar_url: string | null
          bio: string | null
          clerk_user_id: string
          created_at: string | null
          display_name: string
          email: string
          has_testimony: boolean | null
          id: string
          is_online: boolean | null
          is_private: boolean | null
          is_profile_private: boolean | null
          last_seen: string | null
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_point: unknown
          message_privacy: string | null
          notify_friend_requests: boolean | null
          notify_messages: boolean | null
          notify_nearby: boolean | null
          profile_completed: boolean | null
          search_radius: number | null
          search_radius_miles: number | null
          spotify_url: string | null
          testimony_visibility: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_emoji?: string | null
          avatar_url?: string | null
          bio?: string | null
          clerk_user_id: string
          created_at?: string | null
          display_name: string
          email: string
          has_testimony?: boolean | null
          id?: string
          is_online?: boolean | null
          is_private?: boolean | null
          is_profile_private?: boolean | null
          last_seen?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_point?: unknown
          message_privacy?: string | null
          notify_friend_requests?: boolean | null
          notify_messages?: boolean | null
          notify_nearby?: boolean | null
          profile_completed?: boolean | null
          search_radius?: number | null
          search_radius_miles?: number | null
          spotify_url?: string | null
          testimony_visibility?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_emoji?: string | null
          avatar_url?: string | null
          bio?: string | null
          clerk_user_id?: string
          created_at?: string | null
          display_name?: string
          email?: string
          has_testimony?: boolean | null
          id?: string
          is_online?: boolean | null
          is_private?: boolean | null
          is_profile_private?: boolean | null
          last_seen?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_point?: unknown
          message_privacy?: string | null
          notify_friend_requests?: boolean | null
          notify_messages?: boolean | null
          notify_nearby?: boolean | null
          profile_completed?: boolean | null
          search_radius?: number | null
          search_radius_miles?: number | null
          spotify_url?: string | null
          testimony_visibility?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      find_nearby_users: {
        Args: { radius_miles?: number; user_lat: number; user_lng: number }
        Returns: {
          avatar_emoji: string
          display_name: string
          distance_miles: number
          id: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const