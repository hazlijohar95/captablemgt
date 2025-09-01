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
      webhook_endpoints: {
        Row: {
          id: string;
          company_id: string;
          api_key_id: string;
          name: string;
          description: string | null;
          url: string;
          secret: string;
          events: string[];
          event_filters: Json;
          active: boolean;
          retry_policy: Json;
          timeout_seconds: number;
          custom_headers: Json;
          auth_type: 'signature' | 'bearer' | 'basic' | 'none';
          auth_config: Json;
          last_delivery_at: string | null;
          last_successful_delivery_at: string | null;
          consecutive_failures: number;
          total_deliveries: number;
          successful_deliveries: number;
          disabled_at: string | null;
          disabled_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          api_key_id: string;
          name: string;
          description?: string | null;
          url: string;
          secret: string;
          events: string[];
          event_filters?: Json;
          active?: boolean;
          retry_policy?: Json;
          timeout_seconds?: number;
          custom_headers?: Json;
          auth_type?: 'signature' | 'bearer' | 'basic' | 'none';
          auth_config?: Json;
          last_delivery_at?: string | null;
          last_successful_delivery_at?: string | null;
          consecutive_failures?: number;
          total_deliveries?: number;
          successful_deliveries?: number;
          disabled_at?: string | null;
          disabled_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          api_key_id?: string;
          name?: string;
          description?: string | null;
          url?: string;
          secret?: string;
          events?: string[];
          event_filters?: Json;
          active?: boolean;
          retry_policy?: Json;
          timeout_seconds?: number;
          custom_headers?: Json;
          auth_type?: 'signature' | 'bearer' | 'basic' | 'none';
          auth_config?: Json;
          last_delivery_at?: string | null;
          last_successful_delivery_at?: string | null;
          consecutive_failures?: number;
          total_deliveries?: number;
          successful_deliveries?: number;
          disabled_at?: string | null;
          disabled_reason?: string | null;
          updated_at?: string;
        };
      };
      webhook_deliveries: {
        Row: {
          id: string;
          webhook_endpoint_id: string;
          event_type: string;
          event_data: Json;
          event_id: string;
          attempt_number: number;
          delivery_status: 'pending' | 'processing' | 'success' | 'failed' | 'retrying';
          request_headers: Json;
          request_body: Json;
          response_status: number | null;
          response_headers: Json | null;
          response_body: string | null;
          response_time_ms: number | null;
          error_message: string | null;
          error_code: string | null;
          scheduled_at: string;
          delivered_at: string | null;
          next_retry_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_endpoint_id: string;
          event_type: string;
          event_data: Json;
          event_id: string;
          attempt_number?: number;
          delivery_status?: 'pending' | 'processing' | 'success' | 'failed' | 'retrying';
          request_headers?: Json;
          request_body?: Json;
          response_status?: number | null;
          response_headers?: Json | null;
          response_body?: string | null;
          response_time_ms?: number | null;
          error_message?: string | null;
          error_code?: string | null;
          scheduled_at?: string;
          delivered_at?: string | null;
          next_retry_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_endpoint_id?: string;
          event_type?: string;
          event_data?: Json;
          event_id?: string;
          attempt_number?: number;
          delivery_status?: 'pending' | 'processing' | 'success' | 'failed' | 'retrying';
          request_headers?: Json;
          request_body?: Json;
          response_status?: number | null;
          response_headers?: Json | null;
          response_body?: string | null;
          response_time_ms?: number | null;
          error_message?: string | null;
          error_code?: string | null;
          scheduled_at?: string;
          delivered_at?: string | null;
          next_retry_at?: string | null;
        };
      };
      webhook_events: {
        Row: {
          id: string;
          event_type: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          name?: string;
          description?: string | null;
        };
      };
      api_keys: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          environment: 'sandbox' | 'production';
          scopes: string[];
          rate_limit_tier: 'standard' | 'premium' | 'enterprise';
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          expires_at: string | null;
          revoked_at: string | null;
          revoked_reason: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          environment: 'sandbox' | 'production';
          scopes: string[];
          rate_limit_tier?: 'standard' | 'premium' | 'enterprise';
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          environment?: 'sandbox' | 'production';
          scopes?: string[];
          rate_limit_tier?: 'standard' | 'premium' | 'enterprise';
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          created_by?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      queue_webhook_delivery: {
        Args: {
          p_company_id: string;
          p_event_type: string;
          p_event_data: string;
          p_event_id?: string;
        };
        Returns: number;
      };
      update_webhook_stats_success: {
        Args: {
          p_webhook_id: string;
        };
        Returns: void;
      };
      update_webhook_stats_failure: {
        Args: {
          p_webhook_id: string;
        };
        Returns: void;
      };
      get_webhook_delivery_stats: {
        Args: {
          p_webhook_id: string;
        };
        Returns: {
          total_deliveries: number;
          successful_deliveries: number;
          failed_deliveries: number;
          avg_response_time_ms: number;
          last_delivery_at: string | null;
          last_successful_delivery_at: string | null;
        };
      };
      get_webhook_uptime_stats: {
        Args: {
          p_webhook_id: string;
        };
        Returns: {
          successful_count: number;
          total_count: number;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}