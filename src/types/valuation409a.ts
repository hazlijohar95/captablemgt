/**
 * TypeScript types for IRS Section 409A Valuations
 * Comprehensive type definitions for valuation system
 */

// ============================================
// Core 409A Valuation Types
// ============================================

export type ValuationMethod = 
  | 'INCOME_APPROACH'
  | 'MARKET_APPROACH' 
  | 'ASSET_APPROACH'
  | 'HYBRID_APPROACH'
  | 'OPM'  // Option Pricing Model
  | 'PWM'  // Probability Weighted Method
  | 'BACKSOLVE';

export type ValuationStatus = 
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'BOARD_APPROVED'
  | 'FINAL'
  | 'SUPERSEDED'
  | 'REJECTED';

export interface Valuation409A {
  id: string;
  company_id: string;
  
  // Valuation Details
  valuation_date: string; // ISO date string
  effective_period_start: string;
  effective_period_end?: string | null;
  fair_market_value_per_share: number; // In cents
  
  // Methodology
  valuation_method: ValuationMethod;
  
  // Documentation
  report_file_path?: string | null;
  report_file_size?: number | null;
  report_file_hash?: string | null;
  
  // Appraiser Information
  appraiser_name: string;
  appraiser_credentials?: string | null;
  appraiser_firm?: string | null;
  appraiser_contact_info?: AppraisalContactInfo | null;
  
  // IRS Compliance
  safe_harbor_qualified: boolean;
  presumption_of_reasonableness: boolean;
  board_resolution_date?: string | null;
  board_resolution_file_path?: string | null;
  
  // Financial Data
  enterprise_value?: number | null; // In cents
  equity_value?: number | null; // In cents
  revenue_ltm?: number | null; // Last twelve months
  ebitda_ltm?: number | null;
  cash_balance?: number | null;
  debt_balance?: number | null;
  
  // Market Context
  market_multiple_revenue?: number | null;
  market_multiple_ebitda?: number | null;
  discount_rate?: number | null; // As decimal
  risk_free_rate?: number | null;
  
  // Related Analysis
  waterfall_analysis_id?: string | null;
  
  // Status and Workflow
  status: ValuationStatus;
  
  // Version Control
  version: number;
  supersedes_valuation_id?: string | null;
  
  // Notes
  notes?: string | null;
  internal_comments?: string | null;
  
  // Audit Fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface AppraisalContactInfo {
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  website?: string;
}

// ============================================
// Share Class Valuations
// ============================================

export interface ValuationShareClass {
  id: string;
  valuation_409a_id: string;
  share_class_id: string;
  
  // Class-specific Valuation
  fair_market_value_per_share: number; // In cents
  total_shares_outstanding: number;
  total_value: number; // In cents
  
  // Methodology
  valuation_method?: string | null;
  discount_rate?: number | null;
  
  // Rights and Preferences
  liquidation_preference?: number | null; // In cents per share
  participating_preferred?: boolean;
  dividend_rate?: number | null;
  
  // Waterfall Analysis
  waterfall_rank?: number | null;
  waterfall_allocation_percentage?: number | null;
  
  // Audit
  created_at: string;
  updated_at: string;
  
  // Relations (populated by joins)
  share_class?: ShareClass;
}

export interface ShareClass {
  id: string;
  name: string;
  company_id: string;
  par_value_cents: number;
  authorized_shares: number;
  liquidation_preference_cents?: number;
  dividend_rate?: number;
  voting_rights: boolean;
  anti_dilution_protection?: AntiDilutionType;
  seniority_rank: number;
}

export type AntiDilutionType = 'NONE' | 'FULL_RATCHET' | 'WEIGHTED_AVERAGE_BROAD' | 'WEIGHTED_AVERAGE_NARROW';

// ============================================
// Valuation Assumptions and Scenarios
// ============================================

export type AssumptionCategory = 
  | 'FINANCIAL_PROJECTIONS'
  | 'MARKET_DATA'
  | 'DISCOUNT_RATES'
  | 'MULTIPLES'
  | 'SCENARIO_PROBABILITIES'
  | 'COMPANY_SPECIFIC';

export interface ValuationAssumption {
  id: string;
  valuation_409a_id: string;
  
  category: AssumptionCategory;
  assumption_name: string;
  assumption_value: Record<string, any>; // JSONB data
  data_source?: string | null;
  rationale?: string | null;
  
  // Sensitivity Analysis
  base_case_value?: number | null;
  upside_case_value?: number | null;
  downside_case_value?: number | null;
  probability_weighting?: number | null;
  
  created_at: string;
  updated_at: string;
}

export type ScenarioType = 
  | 'BASE_CASE'
  | 'UPSIDE_CASE'
  | 'DOWNSIDE_CASE'
  | 'IPO_SCENARIO'
  | 'ACQUISITION_SCENARIO'
  | 'LIQUIDATION_SCENARIO';

export interface ValuationScenario {
  id: string;
  valuation_409a_id: string;
  
  scenario_name: string;
  scenario_type: ScenarioType;
  
  // 5-Year Financial Projections
  projected_revenue_y1?: number | null;
  projected_revenue_y2?: number | null;
  projected_revenue_y3?: number | null;
  projected_revenue_y4?: number | null;
  projected_revenue_y5?: number | null;
  
  projected_ebitda_y1?: number | null;
  projected_ebitda_y2?: number | null;
  projected_ebitda_y3?: number | null;
  projected_ebitda_y4?: number | null;
  projected_ebitda_y5?: number | null;
  
  // Exit Assumptions
  exit_multiple_revenue?: number | null;
  exit_multiple_ebitda?: number | null;
  time_to_exit_years?: number | null;
  probability_of_scenario?: number | null;
  
  // Results
  terminal_value?: number | null; // In cents
  present_value?: number | null; // In cents
  probability_weighted_value?: number | null; // In cents
  
  created_at: string;
  updated_at: string;
}

// ============================================
// Audit Trail Types
// ============================================

export type AuditEventType = 
  | 'CREATE'
  | 'UPDATE' 
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PERMISSION_CHANGE'
  | 'BULK_OPERATION'
  | 'CALCULATION'
  | 'REPORT_GENERATION';

export type AuditEntityType = 
  | 'COMPANY'
  | 'STAKEHOLDER'
  | 'SECURITY'
  | 'VESTING_SCHEDULE'
  | 'VALUATION_409A'
  | 'SHARE_CLASS'
  | 'TRANSACTION'
  | 'USER'
  | 'WATERFALL_ANALYSIS'
  | 'SCENARIO_MODEL'
  | 'REPORT';

export type DataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface AuditLogEntry {
  id: string;
  event_id: string;
  event_type: AuditEventType;
  
  // Entity Information
  entity_type: AuditEntityType;
  entity_id: string;
  company_id?: string | null;
  
  // User Context
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  
  // Change Details
  field_name?: string | null;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  change_summary?: string | null;
  
  // Request Context
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  request_id?: string | null;
  
  // Compliance
  data_classification: DataClassification;
  retention_period_years: number;
  
  // Timestamp
  occurred_at: string;
  
  // Additional metadata
  metadata?: Record<string, any> | null;
}

export type CalculationType = 
  | 'OWNERSHIP_PERCENTAGE'
  | 'DILUTION_ANALYSIS'
  | 'WATERFALL_DISTRIBUTION'
  | 'VESTING_CALCULATION'
  | 'VALUATION_409A'
  | 'OPTION_PRICING'
  | 'TAX_CALCULATION';

export type ValidationStatus = 'VALID' | 'WARNING' | 'ERROR' | 'NEEDS_REVIEW';

export interface AuditCalculation {
  id: string;
  calculation_type: CalculationType;
  
  // Context
  company_id: string;
  triggered_by_entity_type?: string | null;
  triggered_by_entity_id?: string | null;
  
  // Data
  input_parameters: Record<string, any>;
  input_data_hash?: string | null;
  output_results: Record<string, any>;
  calculation_method?: string | null;
  
  // Validation
  validation_status: ValidationStatus;
  validation_messages?: string[] | null;
  
  // Performance
  execution_time_ms?: number | null;
  memory_usage_mb?: number | null;
  
  // Audit
  calculated_by?: string | null;
  calculated_at: string;
  
  // Compliance
  regulatory_framework?: string | null;
  calculation_version?: string | null;
  
  // Version Control
  previous_calculation_id?: string | null;
  superseded_at?: string | null;
}

export type DocumentType = 
  | 'VALUATION_REPORT'
  | 'BOARD_RESOLUTION'
  | 'LEGAL_OPINION'
  | 'FINANCIAL_STATEMENT'
  | 'CAP_TABLE_EXPORT'
  | 'WATERFALL_REPORT'
  | 'OPTION_AGREEMENT'
  | 'INVESTMENT_AGREEMENT';

export interface AuditDocument {
  id: string;
  document_type: DocumentType;
  
  // File Information
  file_name: string;
  file_path: string;
  file_size: number;
  file_hash: string;
  mime_type?: string | null;
  
  // Relations
  company_id: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  
  // Access Control
  classification_level?: string | null;
  access_permissions?: Record<string, any> | null;
  
  // Lifecycle
  uploaded_by?: string | null;
  uploaded_at: string;
  accessed_count: number;
  last_accessed_at?: string | null;
  last_accessed_by?: string | null;
  
  // Retention
  retention_period_years: number;
  legal_hold: boolean;
  destruction_date?: string | null;
  
  // Version Control
  version: number;
  supersedes_document_id?: string | null;
  
  // Digital Signature
  digital_signature?: string | null;
  signature_valid?: boolean | null;
  signed_by?: string | null;
  signed_at?: string | null;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateValuation409ARequest {
  company_id: string;
  valuation_date: string;
  effective_period_start: string;
  effective_period_end?: string;
  fair_market_value_per_share: number;
  valuation_method: ValuationMethod;
  
  // Appraiser info
  appraiser_name: string;
  appraiser_credentials?: string;
  appraiser_firm?: string;
  appraiser_contact_info?: AppraisalContactInfo;
  
  // Financial data
  enterprise_value?: number;
  equity_value?: number;
  revenue_ltm?: number;
  ebitda_ltm?: number;
  cash_balance?: number;
  debt_balance?: number;
  
  // Market data
  market_multiple_revenue?: number;
  market_multiple_ebitda?: number;
  discount_rate?: number;
  risk_free_rate?: number;
  
  // Compliance
  safe_harbor_qualified?: boolean;
  presumption_of_reasonableness?: boolean;
  board_resolution_date?: string;
  
  // Notes
  notes?: string;
  internal_comments?: string;
}

export interface UpdateValuation409ARequest extends Partial<CreateValuation409ARequest> {
  id: string;
  status?: ValuationStatus;
}

export interface Valuation409AResponse extends Valuation409A {
  // Populated relations
  share_class_valuations?: ValuationShareClass[];
  assumptions?: ValuationAssumption[];
  scenarios?: ValuationScenario[];
  company?: {
    id: string;
    name: string;
  };
  created_by_user?: {
    id: string;
    email: string;
    name: string;
  };
  updated_by_user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ValuationSummaryStats {
  total_valuations: number;
  active_valuations: number;
  draft_valuations: number;
  average_fmv_per_share: number;
  latest_valuation_date?: string;
  next_expiring_valuation?: string;
  compliance_percentage: number;
}

export interface AuditTrailFilters {
  entity_type?: AuditEntityType;
  entity_id?: string;
  event_type?: AuditEventType;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  data_classification?: DataClassification;
}

export interface AuditTrailResponse {
  entries: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  summary: {
    total_events: number;
    unique_users: number;
    unique_entities: number;
    event_type_breakdown: Record<AuditEventType, number>;
    entity_type_breakdown: Record<AuditEntityType, number>;
  };
}

// ============================================
// Validation and Business Rules
// ============================================

export interface ValuationValidationRule {
  rule_id: string;
  rule_name: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  check: (valuation: Valuation409A) => boolean;
  message: string;
  regulatory_reference?: string;
}

export interface ValuationValidationResult {
  is_valid: boolean;
  errors: Array<{
    rule_id: string;
    message: string;
    field?: string;
  }>;
  warnings: Array<{
    rule_id: string;
    message: string;
    field?: string;
  }>;
  compliance_score: number; // 0-100
}

export interface ComplianceReport {
  company_id: string;
  report_date: string;
  total_valuations: number;
  compliant_valuations: number;
  non_compliant_valuations: number;
  expired_valuations: number;
  upcoming_expirations: number;
  
  compliance_issues: Array<{
    valuation_id: string;
    issue_type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    recommended_action: string;
  }>;
  
  recommendations: string[];
  next_review_date: string;
}

// ============================================
// Utility Types
// ============================================

export type SortDirection = 'asc' | 'desc';

export interface ValuationListFilters {
  company_id?: string;
  status?: ValuationStatus;
  date_from?: string;
  date_to?: string;
  appraiser_firm?: string;
  valuation_method?: ValuationMethod;
  safe_harbor_only?: boolean;
}

export interface ValuationListSort {
  field: keyof Valuation409A;
  direction: SortDirection;
}

export interface PaginatedValuationResponse {
  data: Valuation409AResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: ValuationListFilters;
  sort: ValuationListSort;
}