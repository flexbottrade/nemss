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
      alert_recipients: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      donation_payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          donation_id: string | null
          id: string
          is_manually_updated: boolean | null
          payment_proof_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          donation_id?: string | null
          id?: string
          is_manually_updated?: boolean | null
          payment_proof_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          donation_id?: string | null
          id?: string
          is_manually_updated?: boolean | null
          payment_proof_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_payments_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          minimum_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dues_payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          id: string
          is_manually_updated: boolean | null
          months_paid: number
          payment_proof_url: string | null
          start_month: number
          start_year: number
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          id?: string
          is_manually_updated?: boolean | null
          months_paid: number
          payment_proof_url?: string | null
          start_month: number
          start_year: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          is_manually_updated?: boolean | null
          months_paid?: number
          payment_proof_url?: string | null
          start_month?: number
          start_year?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dues_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      election_nominees: {
        Row: {
          election_id: string | null
          id: string
          nominee_id: string | null
          votes_count: number | null
        }
        Insert: {
          election_id?: string | null
          id?: string
          nominee_id?: string | null
          votes_count?: number | null
        }
        Update: {
          election_id?: string | null
          id?: string
          nominee_id?: string | null
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "election_nominees_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_nominees_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      election_settings: {
        Row: {
          id: string
          is_active: boolean
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      elections: {
        Row: {
          created_at: string | null
          deadline: string
          id: string
          position: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          deadline: string
          id?: string
          position: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string
          id?: string
          position?: string
          status?: string | null
        }
        Relationships: []
      }
      event_payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          event_id: string | null
          id: string
          is_manually_updated: boolean | null
          payment_proof_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_manually_updated?: boolean | null
          payment_proof_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_manually_updated?: boolean | null
          payment_proof_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          reason: string
        }
        Insert: {
          adjustment_type: string
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_poll_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          poll_id: string
          votes_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          poll_id: string
          votes_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          poll_id?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "forum_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "forum_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "forum_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_polls: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          created_at: string
          id: string
          message: string
          reply_to: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          reply_to?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          reply_to?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_read_status: {
        Row: {
          created_at: string
          id: string
          last_read_at: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_read_at?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_read_at?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_read_status_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_payment_records: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_type: string
          reference_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_type: string
          reference_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_type?: string
          reference_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          amount: number
          created_at: string
          error_message: string | null
          id: string
          payment_id: string
          payment_type: string
          phone_number: string
          status: string
          updated_at: string
          user_name: string
          whatsapp_message_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          error_message?: string | null
          id?: string
          payment_id: string
          payment_type: string
          phone_number: string
          status?: string
          updated_at?: string
          user_name: string
          whatsapp_message_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string | null
          id?: string
          payment_id?: string
          payment_type?: string
          phone_number?: string
          status?: string
          updated_at?: string
          user_name?: string
          whatsapp_message_id?: string | null
        }
        Relationships: []
      }
      payment_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email_verified: boolean
          first_name: string
          forum_username: string | null
          id: string
          last_name: string
          member_id: string
          phone_number: string
          position: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email_verified?: boolean
          first_name: string
          forum_username?: string | null
          id: string
          last_name: string
          member_id: string
          phone_number: string
          position?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email_verified?: boolean
          first_name?: string
          forum_username?: string | null
          id?: string
          last_name?: string
          member_id?: string
          phone_number?: string
          position?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          monthly_dues_amount: number
          updated_at: string | null
        }
        Insert: {
          id?: string
          monthly_dues_amount?: number
          updated_at?: string | null
        }
        Update: {
          id?: string
          monthly_dues_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variable_dues_settings: {
        Row: {
          created_at: string
          id: string
          is_waived: boolean
          monthly_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_waived?: boolean
          monthly_amount: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_waived?: boolean
          monthly_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          election_id: string | null
          id: string
          nominee_id: string | null
          voter_id: string | null
        }
        Insert: {
          created_at?: string | null
          election_id?: string | null
          id?: string
          nominee_id?: string | null
          voter_id?: string | null
        }
        Update: {
          created_at?: string | null
          election_id?: string | null
          id?: string
          nominee_id?: string | null
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_member_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_financial_secretary: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "member"
        | "super_admin"
        | "financial_secretary"
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
      app_role: [
        "admin",
        "moderator",
        "member",
        "super_admin",
        "financial_secretary",
      ],
    },
  },
} as const
