// Generated from the migrations in supabase/migrations. Do not edit by hand.
// Regenerate with `npm run db:types` (Supabase CLI; needs the local stack running).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string
          emoji: string | null
          id: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          emoji?: string | null
          id?: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          emoji?: string | null
          id?: string
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      ad_unlocks: {
        Row: {
          created_at: string
          id: string
          target_id: string
          unlock_type: Database["public"]["Enums"]["unlock_type"]
          unlocked_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          unlock_type: Database["public"]["Enums"]["unlock_type"]
          unlocked_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          unlock_type?: Database["public"]["Enums"]["unlock_type"]
          unlocked_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          function_name: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          bmi: number | null
          bmr: number | null
          body_fat_pct: number | null
          checkin_id: string | null
          created_at: string
          fat_mass_kg: number | null
          id: string
          lean_mass_kg: number | null
          measured_at: string
          source: Database["public"]["Enums"]["metric_source"]
          tdee: number | null
          updated_at: string
          user_id: string
          user_overridden: boolean
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          bmr?: number | null
          body_fat_pct?: number | null
          checkin_id?: string | null
          created_at?: string
          fat_mass_kg?: number | null
          id?: string
          lean_mass_kg?: number | null
          measured_at?: string
          source?: Database["public"]["Enums"]["metric_source"]
          tdee?: number | null
          updated_at?: string
          user_id?: string
          user_overridden?: boolean
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          bmr?: number | null
          body_fat_pct?: number | null
          checkin_id?: string | null
          created_at?: string
          fat_mass_kg?: number | null
          id?: string
          lean_mass_kg?: number | null
          measured_at?: string
          source?: Database["public"]["Enums"]["metric_source"]
          tdee?: number | null
          updated_at?: string
          user_id?: string
          user_overridden?: boolean
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_metrics_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: true
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          created_at: string
          date: string
          energy: number
          hunger: Database["public"]["Enums"]["hunger_level"] | null
          id: string
          mood: Database["public"]["Enums"]["mood"]
          sleep_hours: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          energy: number
          hunger?: Database["public"]["Enums"]["hunger_level"] | null
          id?: string
          mood: Database["public"]["Enums"]["mood"]
          sleep_hours?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number
          hunger?: Database["public"]["Enums"]["hunger_level"] | null
          id?: string
          mood?: Database["public"]["Enums"]["mood"]
          sleep_hours?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      coach_conversations: {
        Row: {
          created_at: string
          id: string
          persona: Database["public"]["Enums"]["coach_persona"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          persona: Database["public"]["Enums"]["coach_persona"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          persona?: Database["public"]["Enums"]["coach_persona"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          persona: Database["public"]["Enums"]["coach_persona"]
          role: Database["public"]["Enums"]["message_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          persona: Database["public"]["Enums"]["coach_persona"]
          role: Database["public"]["Enums"]["message_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          persona?: Database["public"]["Enums"]["coach_persona"]
          role?: Database["public"]["Enums"]["message_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_events: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          granted: boolean
          id: string
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted: boolean
          id?: string
          updated_at?: string
          user_id: string
          version: string
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          granted: boolean
          id: string
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted: boolean
          id?: string
          updated_at?: string
          user_id?: string
          version: string
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      device_connections: {
        Row: {
          connected_at: string
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["health_platform"]
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["health_platform"]
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          connected_at?: string
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["health_platform"]
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          food_ref: string | null
          id: string
          logged_at: string
          meal_slot: Database["public"]["Enums"]["meal_slot"]
          name: string
          protein_g: number
          quantity: number | null
          source: Database["public"]["Enums"]["food_source"]
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_ref?: string | null
          id?: string
          logged_at?: string
          meal_slot: Database["public"]["Enums"]["meal_slot"]
          name: string
          protein_g?: number
          quantity?: number | null
          source: Database["public"]["Enums"]["food_source"]
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_ref?: string | null
          id?: string
          logged_at?: string
          meal_slot?: Database["public"]["Enums"]["meal_slot"]
          name?: string
          protein_g?: number
          quantity?: number | null
          source?: Database["public"]["Enums"]["food_source"]
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          active: boolean
          created_at: string
          goal_date: string | null
          goal_types: Database["public"]["Enums"]["goal_type"][]
          goal_weight_kg: number | null
          id: string
          motivation_other: string | null
          motivations: string[]
          pace: Database["public"]["Enums"]["pace"] | null
          start_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          goal_date?: string | null
          goal_types?: Database["public"]["Enums"]["goal_type"][]
          goal_weight_kg?: number | null
          id?: string
          motivation_other?: string | null
          motivations?: string[]
          pace?: Database["public"]["Enums"]["pace"] | null
          start_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          goal_date?: string | null
          goal_types?: Database["public"]["Enums"]["goal_type"][]
          goal_weight_kg?: number | null
          id?: string
          motivation_other?: string | null
          motivations?: string[]
          pace?: Database["public"]["Enums"]["pace"] | null
          start_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          date: string
          id: string
          meals: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          meals: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          meals?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          achievements: boolean
          checkin_reminder: boolean
          created_at: string
          id: string
          meal_reminders: boolean
          promotions: boolean
          streaks: boolean
          updated_at: string
          user_id: string
          weekly_report: boolean
        }
        Insert: {
          achievements?: boolean
          checkin_reminder?: boolean
          created_at?: string
          id?: string
          meal_reminders?: boolean
          promotions?: boolean
          streaks?: boolean
          updated_at?: string
          user_id?: string
          weekly_report?: boolean
        }
        Update: {
          achievements?: boolean
          checkin_reminder?: boolean
          created_at?: string
          id?: string
          meal_reminders?: boolean
          promotions?: boolean
          streaks?: boolean
          updated_at?: string
          user_id?: string
          weekly_report?: boolean
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          pushed_at: string | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          pushed_at?: string | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          pushed_at?: string | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          carbs_g: number
          created_at: string
          daily_calories: number
          exercise_recommendation: Json | null
          fat_g: number
          fiber_g: number
          forecast: Json | null
          generated_by: string
          id: string
          protein_g: number
          updated_at: string
          user_id: string
          version: number
          water_ml: number
        }
        Insert: {
          carbs_g: number
          created_at?: string
          daily_calories: number
          exercise_recommendation?: Json | null
          fat_g: number
          fiber_g: number
          forecast?: Json | null
          generated_by?: string
          id?: string
          protein_g: number
          updated_at?: string
          user_id?: string
          version: number
          water_ml: number
        }
        Update: {
          carbs_g?: number
          created_at?: string
          daily_calories?: number
          exercise_recommendation?: Json | null
          fat_g?: number
          fiber_g?: number
          forecast?: Json | null
          generated_by?: string
          id?: string
          protein_g?: number
          updated_at?: string
          user_id?: string
          version?: number
          water_ml?: number
        }
        Relationships: []
      }
      preferences: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          allergies: string[]
          allergy_other: string | null
          avoid_foods: string[]
          created_at: string
          diet_styles: string[]
          id: string
          restriction_other: string | null
          restrictions: string[]
          training_frequency: Database["public"]["Enums"]["training_frequency"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          allergies?: string[]
          allergy_other?: string | null
          avoid_foods?: string[]
          created_at?: string
          diet_styles?: string[]
          id?: string
          restriction_other?: string | null
          restrictions?: string[]
          training_frequency?: Database["public"]["Enums"]["training_frequency"] | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          allergies?: string[]
          allergy_other?: string | null
          avoid_foods?: string[]
          created_at?: string
          diet_styles?: string[]
          id?: string
          restriction_other?: string | null
          restrictions?: string[]
          training_frequency?: Database["public"]["Enums"]["training_frequency"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          gender: Database["public"]["Enums"]["gender"] | null
          height_cm: number | null
          id: string
          is_premium: boolean
          name: string | null
          onboarding_completed_at: string | null
          onboarding_step: string | null
          premium_event_at: string | null
          streak_days: number
          units: Database["public"]["Enums"]["unit_system"]
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          height_cm?: number | null
          id?: string
          is_premium?: boolean
          name?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          premium_event_at?: string | null
          streak_days?: number
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          height_cm?: number | null
          id?: string
          is_premium?: boolean
          name?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          premium_event_at?: string | null
          streak_days?: number
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          storage_path: string
          taken_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          storage_path: string
          taken_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          storage_path?: string
          taken_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          unlocked_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          unlocked_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          unlocked_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      water_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          ml: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          ml: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          ml?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          ref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          ref: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          ref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      achievement_progress: {
        Args: { target_user: string }
        Returns: { code: string; current: number; target: number }[]
      }
      apply_premium_event: {
        Args: { target_user: string; premium: boolean; event_at: string }
        Returns: boolean
      }
      award_xp: {
        Args: { target_user: string; amount: number }
        Returns: undefined
      }
      bmi: {
        Args: { weight_kg: number; height_cm: number }
        Returns: number
      }
      create_weekly_reports: {
        Args: never
        Returns: number
      }
      evaluate_achievements: {
        Args: { target_user: string }
        Returns: undefined
      }
      grant_xp_once: {
        Args: { target_user: string; p_reason: string; p_ref: string; p_amount: number }
        Returns: boolean
      }
      has_activity_on: {
        Args: { target_user: string; day: string }
        Returns: boolean
      }
      my_achievement_progress: {
        Args: never
        Returns: { code: string; current: number; target: number }[]
      }
      register_push_token: {
        Args: { p_token: string; p_platform: string }
        Returns: undefined
      }
      refresh_streak: {
        Args: { target_user: string }
        Returns: undefined
      }
      set_consent: {
        Args: { p_type: Database["public"]["Enums"]["consent_type"]; p_granted: boolean; p_version: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_level: "sedentary" | "lightly_active" | "active" | "very_active"
      coach_persona: "aria" | "max" | "luna"
      consent_type: "health_data" | "ads_personalization" | "analytics" | "marketing"
      food_source: "search" | "manual" | "photo" | "plan"
      gender: "male" | "female" | "unspecified"
      goal_type: "lose_fat" | "build_muscle" | "body_recomposition" | "improve_performance" | "healthy_lifestyle"
      health_platform: "healthkit" | "health_connect"
      hunger_level: "very_low" | "low" | "normal" | "high" | "very_high"
      meal_slot: "breakfast" | "lunch" | "snack" | "dinner"
      message_role: "user" | "assistant"
      metric_source: "manual" | "scan" | "healthkit" | "health_connect"
      mood: "great" | "good" | "okay" | "low" | "tough"
      pace: "sustainable" | "balanced" | "fast"
      training_frequency: "0_1" | "2_3" | "4_5" | "6_plus"
      unit_system: "metric" | "imperial"
      unlock_type: "meal_plan" | "ai_plan"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      activity_level: ["sedentary", "lightly_active", "active", "very_active"],
      coach_persona: ["aria", "max", "luna"],
      consent_type: ["health_data", "ads_personalization", "analytics", "marketing"],
      food_source: ["search", "manual", "photo", "plan"],
      gender: ["male", "female", "unspecified"],
      goal_type: ["lose_fat", "build_muscle", "body_recomposition", "improve_performance", "healthy_lifestyle"],
      health_platform: ["healthkit", "health_connect"],
      hunger_level: ["very_low", "low", "normal", "high", "very_high"],
      meal_slot: ["breakfast", "lunch", "snack", "dinner"],
      message_role: ["user", "assistant"],
      metric_source: ["manual", "scan", "healthkit", "health_connect"],
      mood: ["great", "good", "okay", "low", "tough"],
      pace: ["sustainable", "balanced", "fast"],
      training_frequency: ["0_1", "2_3", "4_5", "6_plus"],
      unit_system: ["metric", "imperial"],
      unlock_type: ["meal_plan", "ai_plan"],
    },
  },
} as const

