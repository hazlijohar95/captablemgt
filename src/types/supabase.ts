// Temporary Supabase types until we can generate them properly
// This file provides explicit types to avoid 'never' type issues

export interface SupabaseDatabase {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          country: string;
          currency: string;
          fiscal_year_start: number;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          country: string;
          currency?: string;
          fiscal_year_start?: number;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          country?: string;
          currency?: string;
          fiscal_year_start?: number;
          settings?: any;
          updated_at?: string;
        };
      };
      people: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          address: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          address?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          address?: any | null;
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
          preference_terms: any | null;
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
          par_value?: string;
          preference_terms?: any | null;
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
          preference_terms?: any | null;
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
          terms: any | null;
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
          issued_at?: string;
          cancelled_at?: string | null;
          terms?: any | null;
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
          terms?: any | null;
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