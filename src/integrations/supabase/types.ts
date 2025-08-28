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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      daily_activities: {
        Row: {
          activities_completed: number | null
          activity_date: string
          created_at: string | null
          id: string
          user_id: string
          xp_earned_today: number | null
        }
        Insert: {
          activities_completed?: number | null
          activity_date: string
          created_at?: string | null
          id?: string
          user_id: string
          xp_earned_today?: number | null
        }
        Update: {
          activities_completed?: number | null
          activity_date?: string
          created_at?: string | null
          id?: string
          user_id?: string
          xp_earned_today?: number | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: string
          exercise_type: string
          explanation: string | null
          id: string
          options: Json | null
          order_index: number | null
          podcast_id: string
          question: string
          xp_reward: number | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty: string
          exercise_type: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          podcast_id: string
          question: string
          xp_reward?: number | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string
          exercise_type?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          podcast_id?: string
          question?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          audio_url: string | null
          category: string | null
          created_at: string | null
          description: string | null
          difficulty_level: string
          duration: number | null
          id: string
          language: string
          rating: number | null
          script_text: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level: string
          duration?: number | null
          id?: string
          language: string
          rating?: number | null
          script_text?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string
          duration?: number | null
          id?: string
          language?: string
          rating?: number | null
          script_text?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          current_level: string | null
          current_streak: number | null
          display_name: string | null
          email: string | null
          hearts: number | null
          id: string
          last_login_date: string | null
          longest_streak: number | null
          selected_language: string | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_level?: string | null
          current_streak?: number | null
          display_name?: string | null
          email?: string | null
          hearts?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          selected_language?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_level?: string | null
          current_streak?: number | null
          display_name?: string | null
          email?: string | null
          hearts?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          selected_language?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_exercise_results: {
        Row: {
          attempts: number | null
          completed_at: string | null
          exercise_id: string
          id: string
          is_correct: boolean
          podcast_id: string
          user_answer: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          exercise_id: string
          id?: string
          is_correct: boolean
          podcast_id: string
          user_answer?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          exercise_id?: string
          id?: string
          is_correct?: boolean
          podcast_id?: string
          user_answer?: string | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_results_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_exercise_results_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_exercise_results_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_podcast_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          is_favorite: boolean | null
          last_position: number | null
          podcast_id: string
          progress_percentage: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_favorite?: boolean | null
          last_position?: number | null
          podcast_id: string
          progress_percentage?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_favorite?: boolean | null
          last_position?: number | null
          podcast_id?: string
          progress_percentage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_podcast_progress_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      exercises_public: {
        Row: {
          created_at: string | null
          difficulty: string | null
          exercise_type: string | null
          explanation: string | null
          id: string | null
          options: Json | null
          order_index: number | null
          podcast_id: string | null
          question: string | null
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: string | null
          exercise_type?: string | null
          explanation?: string | null
          id?: string | null
          options?: Json | null
          order_index?: number | null
          podcast_id?: string | null
          question?: string | null
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          difficulty?: string | null
          exercise_type?: string | null
          explanation?: string | null
          id?: string | null
          options?: Json | null
          order_index?: number | null
          podcast_id?: string | null
          question?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_exercise_answer: {
        Args: { exercise_id_param: string; user_answer_param: string }
        Returns: {
          correct_answer: string
          explanation: string
          is_correct: boolean
          xp_reward: number
        }[]
      }
      get_podcast_exercises: {
        Args: { podcast_id_param: string }
        Returns: {
          difficulty: string
          exercise_type: string
          id: string
          options: Json
          order_index: number
          podcast_id: string
          question: string
          xp_reward: number
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
