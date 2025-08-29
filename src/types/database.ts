// Generated types for Supabase database
// This file will be auto-generated once you set up your Supabase schema

// Helper type for JSON fields
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Utility types for better type inference
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? U : never;
export type DbResultErr = PostgrestError;

export interface PostgrestError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          country: string;
          currency: string;
          fiscal_year_start: number;
          incorporation_date: string | null;
          jurisdiction: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          country?: string;
          currency?: string;
          fiscal_year_start?: number;
          incorporation_date?: string | null;
          jurisdiction?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          country?: string;
          currency?: string;
          fiscal_year_start?: number;
          incorporation_date?: string | null;
          jurisdiction?: string | null;
          settings?: Json;
          updated_at?: string;
        };
      };
      people: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          address: Json | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          address?: Json | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          address?: Json | null;
          user_id?: string | null;
          updated_at?: string;
        };
      };
      stakeholders: {
        Row: {
          id: string;
          company_id: string;
          person_id: string | null;
          entity_name: string | null;
          type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
          tax_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          person_id?: string | null;
          entity_name?: string | null;
          type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
          tax_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          person_id?: string | null;
          entity_name?: string | null;
          type?: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
          tax_id?: string | null;
          updated_at?: string;
        };
      };
      share_classes: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          type: 'COMMON' | 'PREFERRED';
          authorized: number;
          par_value: string;
          preference_terms: Json | null;
          seniority_rank: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          type: 'COMMON' | 'PREFERRED';
          authorized: number;
          par_value: string;
          preference_terms?: Json | null;
          seniority_rank?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          type?: 'COMMON' | 'PREFERRED';
          authorized?: number;
          par_value?: string;
          preference_terms?: Json | null;
          seniority_rank?: number | null;
          updated_at?: string;
        };
      };
      securities: {
        Row: {
          id: string;
          company_id: string;
          stakeholder_id: string;
          class_id: string | null;
          type: 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';
          quantity: number;
          issued_at: string;
          cancelled_at: string | null;
          terms: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          stakeholder_id: string;
          class_id?: string | null;
          type: 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';
          quantity: number;
          issued_at: string;
          cancelled_at?: string | null;
          terms?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          stakeholder_id?: string;
          class_id?: string | null;
          type?: 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';
          quantity?: number;
          issued_at?: string;
          cancelled_at?: string | null;
          terms?: Json | null;
          updated_at?: string;
        };
      };
      vesting_schedules: {
        Row: {
          id: string;
          start_date: string;
          cliff_months: number;
          duration_months: number;
          frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
          acceleration: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          start_date: string;
          cliff_months: number;
          duration_months: number;
          frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
          acceleration?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          start_date?: string;
          cliff_months?: number;
          duration_months?: number;
          frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
          acceleration?: Json | null;
          updated_at?: string;
        };
      };
      grants: {
        Row: {
          id: string;
          security_id: string;
          plan_id: string;
          strike_price: string;
          vesting_schedule_id: string;
          grant_date: string;
          fair_market_value: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          security_id: string;
          plan_id: string;
          strike_price: string;
          vesting_schedule_id: string;
          grant_date: string;
          fair_market_value?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          security_id?: string;
          plan_id?: string;
          strike_price?: string;
          vesting_schedule_id?: string;
          grant_date?: string;
          fair_market_value?: string | null;
          updated_at?: string;
        };
      };
      rounds: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          type: 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'SERIES_E' | 'BRIDGE' | 'OTHER';
          pre_money: string;
          investment: string;
          target_post_pool_pct: number;
          pps: string | null;
          closed_at: string | null;
          status: 'DRAFT' | 'CLOSED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          type: 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'SERIES_E' | 'BRIDGE' | 'OTHER';
          pre_money: string;
          investment: string;
          target_post_pool_pct: number;
          pps?: string | null;
          closed_at?: string | null;
          status?: 'DRAFT' | 'CLOSED';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          type?: 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'SERIES_E' | 'BRIDGE' | 'OTHER';
          pre_money?: string;
          investment?: string;
          target_post_pool_pct?: number;
          pps?: string | null;
          closed_at?: string | null;
          status?: 'DRAFT' | 'CLOSED';
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          company_id: string;
          kind: 'ISSUE' | 'TRANSFER' | 'CANCEL' | 'CONVERT' | 'EXERCISE';
          effective_at: string;
          payload: Json;
          actor_id: string;
          request_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          kind: 'ISSUE' | 'TRANSFER' | 'CANCEL' | 'CONVERT' | 'EXERCISE';
          effective_at: string;
          payload: Json;
          actor_id: string;
          request_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          kind?: 'ISSUE' | 'TRANSFER' | 'CANCEL' | 'CONVERT' | 'EXERCISE';
          effective_at?: string;
          payload?: Json;
          actor_id?: string;
          request_id?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          actor_id: string;
          company_id: string;
          timestamp: string;
          before: Json | null;
          after: Json | null;
          hash: string;
          reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          company_id: string;
          timestamp: string;
          before?: Json | null;
          after?: Json | null;
          hash: string;
          reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          company_id?: string;
          timestamp?: string;
          before?: Json | null;
          after?: Json | null;
          hash?: string;
          reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
      role_assignments: {
        Row: {
          id: string;
          company_id: string;
          person_id: string;
          role: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'INVESTOR' | 'AUDITOR';
          scopes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          person_id: string;
          role: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'INVESTOR' | 'AUDITOR';
          scopes: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          person_id?: string;
          role?: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'INVESTOR' | 'AUDITOR';
          scopes?: string[];
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}