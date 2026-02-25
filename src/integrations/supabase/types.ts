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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      anonymous_speech_attempts: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          badge_reward: string | null
          bonus_xp: number
          challenge_type: string
          created_at: string
          description: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          target_type: string
          target_value: number
          title: string
        }
        Insert: {
          badge_reward?: string | null
          bonus_xp?: number
          challenge_type: string
          created_at?: string
          description: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          target_type: string
          target_value: number
          title: string
        }
        Update: {
          badge_reward?: string | null
          bonus_xp?: number
          challenge_type?: string
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          target_type?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
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
          audio_url: string | null
          context_sentence: string | null
          correct_answer: string
          created_at: string | null
          difficulty: string
          episode_id: string | null
          exercise_type: string
          explanation: string | null
          id: string
          image_url: string | null
          intensity: string | null
          mode: string | null
          options: Json | null
          order_index: number | null
          question: string
          vocabulary_words: Json | null
          xp_reward: number | null
        }
        Insert: {
          audio_url?: string | null
          context_sentence?: string | null
          correct_answer: string
          created_at?: string | null
          difficulty: string
          episode_id?: string | null
          exercise_type: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          intensity?: string | null
          mode?: string | null
          options?: Json | null
          order_index?: number | null
          question: string
          vocabulary_words?: Json | null
          xp_reward?: number | null
        }
        Update: {
          audio_url?: string | null
          context_sentence?: string | null
          correct_answer?: string
          created_at?: string | null
          difficulty?: string
          episode_id?: string | null
          exercise_type?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          intensity?: string | null
          mode?: string | null
          options?: Json | null
          order_index?: number | null
          question?: string
          vocabulary_words?: Json | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      learning_weeks: {
        Row: {
          cefr_level: string
          created_at: string
          description: string
          id: string
          is_locked_by_default: boolean
          language: string
          level: string
          order_index: number
          title: string
          total_videos: number
          week_number: number
        }
        Insert: {
          cefr_level?: string
          created_at?: string
          description?: string
          id?: string
          is_locked_by_default?: boolean
          language?: string
          level: string
          order_index?: number
          title: string
          total_videos?: number
          week_number: number
        }
        Update: {
          cefr_level?: string
          created_at?: string
          description?: string
          id?: string
          is_locked_by_default?: boolean
          language?: string
          level?: string
          order_index?: number
          title?: string
          total_videos?: number
          week_number?: number
        }
        Relationships: []
      }
      lesson_exercises: {
        Row: {
          content: Json
          created_at: string
          exercise_type: string
          id: string
          lesson_id: string
          order_index: number
        }
        Insert: {
          content?: Json
          created_at?: string
          exercise_type: string
          id?: string
          lesson_id: string
          order_index?: number
        }
        Update: {
          content?: Json
          created_at?: string
          exercise_type?: string
          id?: string
          lesson_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "teacher_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_responses: {
        Row: {
          exercise_id: string
          id: string
          lesson_id: string
          response: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          lesson_id: string
          response?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          lesson_id?: string
          response?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_responses_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesson_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_responses_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "teacher_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          data: Json | null
          id: string
          sent_at: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          data?: Json | null
          id?: string
          sent_at?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          data?: Json | null
          id?: string
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_level: string | null
          current_streak: number | null
          display_name: string | null
          full_name: string | null
          id: string
          last_login_date: string | null
          longest_streak: number | null
          native_language: string | null
          selected_language: string | null
          subscription_tier: string | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
          username: string | null
          youtube_credits_reset_at: string | null
          youtube_credits_used: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_level?: string | null
          current_streak?: number | null
          display_name?: string | null
          full_name?: string | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          native_language?: string | null
          selected_language?: string | null
          subscription_tier?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          youtube_credits_reset_at?: string | null
          youtube_credits_used?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_level?: string | null
          current_streak?: number | null
          display_name?: string | null
          full_name?: string | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          native_language?: string | null
          selected_language?: string | null
          subscription_tier?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          youtube_credits_reset_at?: string | null
          youtube_credits_used?: number | null
        }
        Relationships: []
      }
      prohibited_words: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          language: string
          severity: string | null
          word: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          language: string
          severity?: string | null
          word: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          language?: string
          severity?: string | null
          word?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          current_uses: number | null
          duration_months: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
          type: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          duration_months?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          type: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          duration_months?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          type?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      spaced_repetition_reviews: {
        Row: {
          created_at: string
          difficulty_rating: number
          ease_factor: number
          id: string
          interval_days: number
          is_correct: boolean
          response_time: number | null
          review_date: string
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          difficulty_rating: number
          ease_factor?: number
          id?: string
          interval_days?: number
          is_correct: boolean
          response_time?: number | null
          review_date?: string
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          difficulty_rating?: number
          ease_factor?: number
          id?: string
          interval_days?: number
          is_correct?: boolean
          response_time?: number | null
          review_date?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaced_repetition_reviews_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          promo_code: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          promo_code?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          promo_code?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teacher_lessons: {
        Row: {
          cefr_level: string
          created_at: string
          current_exercise_index: number
          description: string | null
          exercise_types: string[]
          id: string
          status: string
          student_email: string | null
          teacher_id: string
          title: string
          topic: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          cefr_level?: string
          created_at?: string
          current_exercise_index?: number
          description?: string | null
          exercise_types?: string[]
          id?: string
          status?: string
          student_email?: string | null
          teacher_id: string
          title: string
          topic?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          cefr_level?: string
          created_at?: string
          current_exercise_index?: number
          description?: string | null
          exercise_types?: string[]
          id?: string
          status?: string
          student_email?: string | null
          teacher_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      transcript_word_suggestions: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          part_of_speech: string | null
          phrase: string
          segment_index: number | null
          translation: string
          video_id: string
          why: string | null
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          part_of_speech?: string | null
          phrase: string
          segment_index?: number | null
          translation: string
          video_id: string
          why?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          part_of_speech?: string | null
          phrase?: string
          segment_index?: number | null
          translation?: string
          video_id?: string
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_word_suggestions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_history: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_category: string | null
          badge_description: string
          badge_icon: string
          badge_id: string
          badge_title: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_category?: string | null
          badge_description: string
          badge_icon: string
          badge_id: string
          badge_title: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_category?: string | null
          badge_description?: string
          badge_icon?: string
          badge_id?: string
          badge_title?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          is_completed: boolean
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          is_completed?: boolean
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          is_completed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_created_flashcards: {
        Row: {
          created_at: string
          example_sentence: string | null
          id: string
          is_mastered: boolean
          notes: string | null
          part_of_speech: string | null
          phrase: string
          source_timestamp: string | null
          times_reviewed: number
          translation: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          example_sentence?: string | null
          id?: string
          is_mastered?: boolean
          notes?: string | null
          part_of_speech?: string | null
          phrase: string
          source_timestamp?: string | null
          times_reviewed?: number
          translation?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          example_sentence?: string | null
          id?: string
          is_mastered?: boolean
          notes?: string | null
          part_of_speech?: string | null
          phrase?: string
          source_timestamp?: string | null
          times_reviewed?: number
          translation?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_created_flashcards_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_episode_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          episode_id: string | null
          id: string
          is_completed: boolean | null
          is_favorite: boolean | null
          last_position: number | null
          progress_percentage: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          episode_id?: string | null
          id?: string
          is_completed?: boolean | null
          is_favorite?: boolean | null
          last_position?: number | null
          progress_percentage?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          episode_id?: string | null
          id?: string
          is_completed?: boolean | null
          is_favorite?: boolean | null
          last_position?: number | null
          progress_percentage?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_exercise_results: {
        Row: {
          attempts: number | null
          completed_at: string | null
          episode_id: string | null
          exercise_id: string
          id: string
          is_correct: boolean
          user_answer: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          episode_id?: string | null
          exercise_id: string
          id?: string
          is_correct: boolean
          user_answer?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          episode_id?: string | null
          exercise_id?: string
          id?: string
          is_correct?: boolean
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
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_daily_reminders: boolean
          email_leaderboard_alerts: boolean
          email_weekly_recaps: boolean
          id: string
          in_app_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_daily_reminders?: boolean
          email_leaderboard_alerts?: boolean
          email_weekly_recaps?: boolean
          id?: string
          in_app_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_daily_reminders?: boolean
          email_leaderboard_alerts?: boolean
          email_weekly_recaps?: boolean
          id?: string
          in_app_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streak_data: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          last_freeze_used_date: string | null
          longest_streak: number
          streak_freezes_available: number
          streak_freezes_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          last_freeze_used_date?: string | null
          longest_streak?: number
          streak_freezes_available?: number
          streak_freezes_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          last_freeze_used_date?: string | null
          longest_streak?: number
          streak_freezes_available?: number
          streak_freezes_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_video_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          status: string
          user_id: string
          week_video_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          user_id: string
          week_video_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          user_id?: string
          week_video_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_video_progress_week_video_id_fkey"
            columns: ["week_video_id"]
            isOneToOne: false
            referencedRelation: "week_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_video_uploads: {
        Row: {
          duration_seconds: number
          id: string
          uploaded_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          duration_seconds?: number
          id?: string
          uploaded_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          duration_seconds?: number
          id?: string
          uploaded_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_video_uploads_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_viewed_flashcards: {
        Row: {
          created_at: string
          first_viewed_at: string
          flashcard_id: string
          id: string
          is_mastered: boolean
          last_reviewed_at: string
          times_reviewed: number
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          first_viewed_at?: string
          flashcard_id: string
          id?: string
          is_mastered?: boolean
          last_reviewed_at?: string
          times_reviewed?: number
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          first_viewed_at?: string
          flashcard_id?: string
          id?: string
          is_mastered?: boolean
          last_reviewed_at?: string
          times_reviewed?: number
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_viewed_flashcards_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "youtube_flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_viewed_flashcards_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vocabulary_progress: {
        Row: {
          created_at: string
          episode_id: string | null
          id: string
          is_learned: boolean
          last_review_date: string | null
          mastery_level: number
          next_review_date: string | null
          times_correct: number
          times_seen: number
          updated_at: string
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          episode_id?: string | null
          id?: string
          is_learned?: boolean
          last_review_date?: string | null
          mastery_level?: number
          next_review_date?: string | null
          times_correct?: number
          times_seen?: number
          updated_at?: string
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string | null
          id?: string
          is_learned?: boolean
          last_review_date?: string | null
          mastery_level?: number
          next_review_date?: string | null
          times_correct?: number
          times_seen?: number
          updated_at?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vocabulary_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      user_week_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          is_unlocked: boolean
          unlocked_at: string | null
          user_id: string
          videos_completed: number
          week_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          is_unlocked?: boolean
          unlocked_at?: string | null
          user_id: string
          videos_completed?: number
          week_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          is_unlocked?: boolean
          unlocked_at?: string | null
          user_id?: string
          videos_completed?: number
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_week_progress_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "learning_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      video_topics: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          topic: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          topic: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          topic?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_topics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_words: {
        Row: {
          created_at: string
          definition: string
          difficulty_level: string
          frequency_rank: number | null
          id: string
          language: string
          translation: string | null
          updated_at: string
          word: string
        }
        Insert: {
          created_at?: string
          definition: string
          difficulty_level?: string
          frequency_rank?: number | null
          id?: string
          language: string
          translation?: string | null
          updated_at?: string
          word: string
        }
        Update: {
          created_at?: string
          definition?: string
          difficulty_level?: string
          frequency_rank?: number | null
          id?: string
          language?: string
          translation?: string | null
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      vocal_exercise_completions: {
        Row: {
          completed_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocal_exercise_completions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      week_videos: {
        Row: {
          created_at: string
          duration_seconds: number
          grammar_focus: string
          id: string
          is_free: boolean
          linked_video_id: string | null
          order_in_week: number
          source: string
          thumbnail_url: string | null
          title: string
          transcript: string | null
          vocabulary_tags: string[] | null
          week_id: string
          xp_reward: number
          youtube_id: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          grammar_focus?: string
          id?: string
          is_free?: boolean
          linked_video_id?: string | null
          order_in_week?: number
          source?: string
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          vocabulary_tags?: string[] | null
          week_id: string
          xp_reward?: number
          youtube_id: string
          youtube_url?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          grammar_focus?: string
          id?: string
          is_free?: boolean
          linked_video_id?: string | null
          order_in_week?: number
          source?: string
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          vocabulary_tags?: string[] | null
          week_id?: string
          xp_reward?: number
          youtube_id?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_videos_linked_video_id_fkey"
            columns: ["linked_video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "week_videos_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "learning_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_exercise_progress: {
        Row: {
          answers: Json | null
          current_question_index: number | null
          difficulty: string
          id: string
          started_at: string | null
          total_questions: number | null
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          answers?: Json | null
          current_question_index?: number | null
          difficulty: string
          id?: string
          started_at?: string | null
          total_questions?: number | null
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          answers?: Json | null
          current_question_index?: number | null
          difficulty?: string
          id?: string
          started_at?: string | null
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_exercise_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_exercises: {
        Row: {
          context_sentence: string | null
          correct_answer: string
          created_at: string
          difficulty: string
          exercise_type: string
          explanation: string | null
          id: string
          intensity: string
          options: Json | null
          order_index: number | null
          question: string
          question_translation: string | null
          video_id: string
          vocabulary_words: Json | null
          xp_reward: number | null
        }
        Insert: {
          context_sentence?: string | null
          correct_answer: string
          created_at?: string
          difficulty: string
          exercise_type: string
          explanation?: string | null
          id?: string
          intensity?: string
          options?: Json | null
          order_index?: number | null
          question: string
          question_translation?: string | null
          video_id: string
          vocabulary_words?: Json | null
          xp_reward?: number | null
        }
        Update: {
          context_sentence?: string | null
          correct_answer?: string
          created_at?: string
          difficulty?: string
          exercise_type?: string
          explanation?: string | null
          id?: string
          intensity?: string
          options?: Json | null
          order_index?: number | null
          question?: string
          question_translation?: string | null
          video_id?: string
          vocabulary_words?: Json | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_exercises_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_flashcards: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          order_index: number
          phrase: string
          translation: string
          video_id: string
          why: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          order_index?: number
          phrase: string
          translation: string
          video_id: string
          why: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          order_index?: number
          phrase?: string
          translation?: string
          video_id?: string
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_flashcards_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_transcripts: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          language: string
          transcript: string
          updated_at: string
          video_id: string
          word_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          language: string
          transcript: string
          updated_at?: string
          video_id: string
          word_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          language?: string
          transcript?: string
          updated_at?: string
          video_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_transcripts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_video_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_video_analytics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_videos: {
        Row: {
          added_by_user_id: string | null
          category: string | null
          created_at: string
          description: string | null
          difficulty_level: string
          duration: number | null
          id: string
          is_curated: boolean | null
          language: string
          processed_at: string | null
          processing_started_at: string | null
          rating: number | null
          status: string
          thumbnail_url: string | null
          title: string
          total_ratings: number | null
          updated_at: string
          video_id: string
          view_count: number | null
        }
        Insert: {
          added_by_user_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string
          duration?: number | null
          id?: string
          is_curated?: boolean | null
          language?: string
          processed_at?: string | null
          processing_started_at?: string | null
          rating?: number | null
          status?: string
          thumbnail_url?: string | null
          title: string
          total_ratings?: number | null
          updated_at?: string
          video_id: string
          view_count?: number | null
        }
        Update: {
          added_by_user_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string
          duration?: number | null
          id?: string
          is_curated?: boolean | null
          language?: string
          processed_at?: string | null
          processing_started_at?: string | null
          rating?: number | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          total_ratings?: number | null
          updated_at?: string
          video_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      check_youtube_exercise_answer: {
        Args: { exercise_id_param: string; user_answer_param: string }
        Returns: {
          correct_answer: string
          explanation: string
          is_correct: boolean
          xp_reward: number
        }[]
      }
      generate_random_username: { Args: never; Returns: string }
      get_auth_user_email: { Args: never; Returns: string }
      get_episode_exercises:
        | {
            Args: { episode_id_param: string }
            Returns: {
              difficulty: string
              episode_id: string
              exercise_type: string
              id: string
              options: Json
              order_index: number
              question: string
              xp_reward: number
            }[]
          }
        | {
            Args: {
              difficulty_param?: string
              episode_id_param: string
              intensity_param?: string
            }
            Returns: {
              difficulty: string
              episode_id: string
              exercise_type: string
              id: string
              intensity: string
              options: Json
              order_index: number
              question: string
              xp_reward: number
            }[]
          }
      get_exercise_questions: {
        Args: { exercise_ids: string[] }
        Returns: {
          context_sentence: string
          difficulty: string
          episode_id: string
          exercise_type: string
          id: string
          intensity: string
          options: Json
          order_index: number
          question: string
          vocabulary_words: Json
          xp_reward: number
        }[]
      }
      get_leaderboard_position_alerts: {
        Args: never
        Returns: {
          current_rank: number
          current_xp: number
          email: string
          target_rank: number
          target_user_email: string
          target_xp: number
          user_id: string
          xp_gap: number
        }[]
      }
      get_next_episode: {
        Args: { current_episode_id: string; language_param: string }
        Returns: {
          alternative_episode_id: string
          alternative_episode_title: string
          next_episode_id: string
          next_episode_title: string
        }[]
      }
      get_users_needing_daily_reminders: {
        Args: never
        Returns: {
          current_streak: number
          email: string
          email_enabled: boolean
          last_activity_date: string
          user_id: string
        }[]
      }
      get_vocabulary_due_for_review: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          definition: string
          language: string
          mastery_level: number
          next_review_date: string
          times_seen: number
          translation: string
          word: string
          word_id: string
        }[]
      }
      get_weekly_recap_data: {
        Args: { user_id_param: string }
        Returns: {
          episodes_completed: number
          exercises_completed: number
          new_badges: number
          streak_days: number
          total_xp: number
        }[]
      }
      get_youtube_exercise_questions: {
        Args: { video_id_param: string }
        Returns: {
          context_sentence: string
          difficulty: string
          exercise_type: string
          id: string
          intensity: string
          options: Json
          order_index: number
          question: string
          video_id: string
          vocabulary_words: Json
          xp_reward: number
        }[]
      }
      get_youtube_exercises_with_answers: {
        Args: { difficulty_param?: string; video_id_param: string }
        Returns: {
          context_sentence: string
          correct_answer: string
          difficulty: string
          exercise_type: string
          explanation: string
          id: string
          intensity: string
          options: Json
          order_index: number
          question: string
          question_translation: string
          video_id: string
          vocabulary_words: Json
          xp_reward: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_vocabulary_progress: {
        Args: {
          p_difficulty_rating?: number
          p_is_correct: boolean
          p_user_id: string
          p_word_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "teacher" | "student"
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
    Enums: {
      app_role: ["teacher", "student"],
    },
  },
} as const
