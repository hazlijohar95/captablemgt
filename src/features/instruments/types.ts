import { Database } from '@/types/database';

// Base types from database
export type SecurityRow = Database['public']['Tables']['securities']['Row'];
export type SecurityInsert = Database['public']['Tables']['securities']['Insert'];
export type SecurityUpdate = Database['public']['Tables']['securities']['Update'];

export type ShareClassRow = Database['public']['Tables']['share_classes']['Row'];

// Security types
export type SecurityType = 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';

// Enhanced security interface with relationships
export interface SecurityWithDetails extends SecurityRow {
  stakeholder?: {
    id: string;
    type: string;
    people?: {
      name: string;
      email: string;
    } | null;
    entity_name?: string | null;
  };
  share_classes?: ShareClassRow | null;
}

// Security summary for instruments view
export interface SecuritySummary {
  id: string;
  type: SecurityType;
  quantity: number;
  issued_at: string;
  cancelled_at?: string | null;
  stakeholder_name: string;
  stakeholder_type: string;
  share_class_name?: string;
  share_class_type?: string;
  terms: any;
  status: 'active' | 'cancelled';
}

// Filter options for instruments
export interface InstrumentsFilter {
  type?: SecurityType | 'ALL';
  status?: 'active' | 'cancelled' | 'ALL';
  stakeholder_type?: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY' | 'ALL';
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Sort options
export type InstrumentsSortField = 'issued_at' | 'quantity' | 'type' | 'stakeholder_name';
export type InstrumentsSortDirection = 'asc' | 'desc';

export interface InstrumentsSort {
  field: InstrumentsSortField;
  direction: InstrumentsSortDirection;
}

// Statistics for instruments overview
export interface InstrumentsStats {
  total_securities: number;
  active_securities: number;
  cancelled_securities: number;
  total_shares_outstanding: number;
  by_type: Record<SecurityType, {
    count: number;
    total_quantity: number;
  }>;
  by_stakeholder_type: Record<string, {
    count: number;
    total_quantity: number;
  }>;
}

// Component props interfaces
export interface InstrumentsTableProps {
  securities: SecuritySummary[];
  loading?: boolean;
  onEdit?: (security: SecuritySummary) => void;
  onCancel?: (security: SecuritySummary) => void;
  onViewDetails?: (security: SecuritySummary) => void;
}

export interface InstrumentsFiltersProps {
  filters: InstrumentsFilter;
  onFiltersChange: (filters: InstrumentsFilter) => void;
  stats?: InstrumentsStats;
}

export interface InstrumentsHeaderProps {
  onIssueNew: () => void;
  stats?: InstrumentsStats;
}