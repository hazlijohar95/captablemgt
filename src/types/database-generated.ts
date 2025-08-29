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
      audit_events: {
        Row: {
          actor_id: string
          after: Json | null
          before: Json | null
          company_id: string
          created_at: string | null
          hash: string
          id: string
          ip_address: unknown | null
          reason: string | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          actor_id: string
          after?: Json | null
          before?: Json | null
          company_id: string
          created_at?: string | null
          hash: string
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_id?: string
          after?: Json | null
          before?: Json | null
          company_id?: string
          created_at?: string | null
          hash?: string
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country: string
          created_at: string | null
          currency: string
          fiscal_year_start: number
          id: string
          incorporation_date: string | null
          jurisdiction: string | null
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          country?: string
          created_at?: string | null
          currency?: string
          fiscal_year_start?: number
          id?: string
          incorporation_date?: string | null
          jurisdiction?: string | null
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          currency?: string
          fiscal_year_start?: number
          id?: string
          incorporation_date?: string | null
          jurisdiction?: string | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      grants: {
        Row: {
          created_at: string | null
          fair_market_value: number | null
          grant_date: string
          id: string
          plan_id: string
          security_id: string
          strike_price: number
          updated_at: string | null
          vesting_schedule_id: string
        }
        Insert: {
          created_at?: string | null
          fair_market_value?: number | null
          grant_date: string
          id?: string
          plan_id: string
          security_id: string
          strike_price: number
          updated_at?: string | null
          vesting_schedule_id: string
        }
        Update: {
          created_at?: string | null
          fair_market_value?: number | null
          grant_date?: string
          id?: string
          plan_id?: string
          security_id?: string
          strike_price?: number
          updated_at?: string | null
          vesting_schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grants_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_vesting_schedule_id_fkey"
            columns: ["vesting_schedule_id"]
            isOneToOne: false
            referencedRelation: "vesting_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          address: Json | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      role_assignments: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          person_id: string
          role: string
          scopes: string[]
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          person_id: string
          role: string
          scopes?: string[]
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          person_id?: string
          role?: string
          scopes?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          closed_at: string | null
          company_id: string
          created_at: string | null
          id: string
          investment: number
          name: string
          pps: number | null
          pre_money: number
          status: string
          target_post_pool_pct: number
          type: string
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          investment: number
          name: string
          pps?: number | null
          pre_money: number
          status?: string
          target_post_pool_pct: number
          type: string
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          investment?: number
          name?: string
          pps?: number | null
          pre_money?: number
          status?: string
          target_post_pool_pct?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      securities: {
        Row: {
          cancelled_at: string | null
          class_id: string | null
          company_id: string
          created_at: string | null
          id: string
          issued_at: string
          quantity: number
          stakeholder_id: string
          terms: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          class_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          issued_at: string
          quantity: number
          stakeholder_id: string
          terms?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          class_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          issued_at?: string
          quantity?: number
          stakeholder_id?: string
          terms?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "securities_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "share_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "securities_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      share_classes: {
        Row: {
          authorized: number
          company_id: string
          created_at: string | null
          id: string
          name: string
          par_value: number
          preference_terms: Json | null
          seniority_rank: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          authorized: number
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          par_value?: number
          preference_terms?: Json | null
          seniority_rank?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          authorized?: number
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          par_value?: number
          preference_terms?: Json | null
          seniority_rank?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_classes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          company_id: string
          created_at: string | null
          entity_name: string | null
          id: string
          person_id: string | null
          tax_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          entity_name?: string | null
          id?: string
          person_id?: string | null
          tax_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          entity_name?: string | null
          id?: string
          person_id?: string | null
          tax_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholders_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          actor_id: string
          company_id: string
          created_at: string | null
          effective_at: string
          id: string
          kind: string
          payload: Json
          request_id: string
        }
        Insert: {
          actor_id: string
          company_id: string
          created_at?: string | null
          effective_at: string
          id?: string
          kind: string
          payload: Json
          request_id: string
        }
        Update: {
          actor_id?: string
          company_id?: string
          created_at?: string | null
          effective_at?: string
          id?: string
          kind?: string
          payload?: Json
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vesting_schedules: {
        Row: {
          acceleration: Json | null
          cliff_months: number
          created_at: string | null
          duration_months: number
          frequency: string
          id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          acceleration?: Json | null
          cliff_months?: number
          created_at?: string | null
          duration_months: number
          frequency: string
          id?: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          acceleration?: Json | null
          cliff_months?: number
          created_at?: string | null
          duration_months?: number
          frequency?: string
          id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_founder_role_assignment: {
        Args: { p_company_id: string; p_person_id: string }
        Returns: undefined
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
