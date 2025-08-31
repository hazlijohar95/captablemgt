/**
 * TypeScript types for Employee Self-Service Portal
 * Comprehensive type definitions for employee equity access and management
 */

// ============================================
// Core Employee Portal Types
// ============================================

export interface EmployeeProfile {
  id: string;
  company_id: string;
  name: string;
  email: string;
  employee_id?: string;
  hire_date?: string;
  department?: string;
  job_title?: string;
  manager_id?: string;
  
  // Portal access
  employee_portal_enabled: boolean;
  portal_invitation_sent_at?: string;
  portal_first_login_at?: string;
  portal_last_login_at?: string;
  portal_login_count: number;
  
  // Manager relationship
  manager?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EmployeePortalPreferences {
  id: string;
  person_id: string;
  company_id: string;
  
  // Notification preferences
  email_notifications: boolean;
  vesting_reminders: boolean;
  equity_updates: boolean;
  document_notifications: boolean;
  
  // Display preferences
  preferred_currency: 'USD' | 'GBP' | 'EUR' | 'SGD' | 'MYR';
  show_tax_estimates: boolean;
  show_exercise_costs: boolean;
  dashboard_layout: {
    sections: DashboardSection[];
  };
  
  // Privacy settings
  allow_equity_sharing: boolean;
  data_export_requested: boolean;
  
  created_at: string;
  updated_at: string;
}

export type DashboardSection = 
  | 'equity_summary'
  | 'vesting_timeline'
  | 'documents'
  | 'exercise_calculator'
  | 'tax_estimates'
  | 'company_updates';

// ============================================
// Employee Equity Data Types
// ============================================

export interface EmployeeEquitySummary {
  person_id: string;
  company_id: string;
  employee_name: string;
  email: string;
  employee_id?: string;
  hire_date?: string;
  department?: string;
  job_title?: string;
  
  // Equity holdings
  common_shares_owned: number;
  options_granted: number;
  options_exercised: number;
  
  // Vesting status
  total_vested_shares: number;
  total_unvested_shares: number;
  
  // Valuation data
  current_fmv_per_share: number;
  total_exercise_cost: number;
  
  summary_updated_at: string;
}

export interface EmployeeEquityValue {
  common_shares_value: number;
  vested_options_value: number;
  unvested_options_potential_value: number;
  total_current_value: number;
  total_potential_value: number;
  exercise_cost: number;
  fmv_per_share: number;
  last_updated: string;
}

export interface EmployeeEquityGrant {
  id: string;
  security_id: string;
  grant_date: string;
  grant_type: 'STOCK_OPTION' | 'ISO' | 'NSO' | 'RSU' | 'COMMON_STOCK';
  quantity: number;
  strike_price?: number;
  fair_market_value?: number;
  status: 'GRANTED' | 'VESTING' | 'VESTED' | 'EXERCISED' | 'CANCELLED' | 'EXPIRED';
  
  // Vesting details
  vesting_schedule?: EmployeeVestingSchedule;
  
  // Exercise information
  exercise_cost?: number;
  tax_withholding?: number;
  net_shares?: number;
}

export interface EmployeeVestingSchedule {
  id: string;
  security_id: string;
  vesting_type: 'TIME_BASED' | 'MILESTONE_BASED' | 'PERFORMANCE_BASED';
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PAUSED';
  
  // Schedule details
  total_shares: number;
  vested_shares: number;
  unvested_shares: number;
  vesting_start_date: string;
  cliff_date?: string;
  vesting_end_date?: string;
  
  // Vesting frequency
  vesting_frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'MILESTONE';
  vesting_percentage_per_period?: number;
  
  // Progress tracking
  next_vesting_date?: string;
  next_vesting_amount?: number;
  completion_percentage: number;
  
  // Milestone-based specific
  milestones?: VestingMilestone[];
}

export interface VestingMilestone {
  id: string;
  description: string;
  shares_to_vest: number;
  target_date?: string;
  completion_date?: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
}

// ============================================
// Document Management Types
// ============================================

export interface EmployeeDocument {
  id: string;
  name: string;
  type: EmployeeDocumentType;
  description?: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
  uploaded_by: string;
  
  // Access control
  is_confidential: boolean;
  access_granted: boolean;
  access_granted_by?: string;
  access_granted_date?: string;
  
  // Document metadata
  related_security_id?: string;
  document_date?: string;
  expiry_date?: string;
  version?: number;
}

export type EmployeeDocumentType = 
  | 'EQUITY_GRANT_LETTER'
  | 'OPTION_AGREEMENT'
  | 'EXERCISE_FORM'
  | 'TAX_DOCUMENT'
  | 'COMPANY_VALUATION'
  | 'BOARD_RESOLUTION'
  | 'VESTING_CERTIFICATE'
  | 'EMPLOYMENT_CONTRACT'
  | 'OTHER';

export interface DocumentAccessLog {
  id: string;
  person_id: string;
  company_id: string;
  document_id: string;
  document_type: EmployeeDocumentType;
  access_granted_by?: string;
  accessed_at: string;
  access_method: 'PORTAL' | 'EMAIL' | 'DOWNLOAD';
}

// ============================================
// Activity and Audit Types
// ============================================

export interface EmployeePortalActivity {
  id: string;
  person_id: string;
  company_id: string;
  activity_type: EmployeeActivityType;
  activity_details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
}

export type EmployeeActivityType = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'VIEW_EQUITY_SUMMARY'
  | 'VIEW_VESTING_SCHEDULE'
  | 'DOWNLOAD_DOCUMENT'
  | 'UPDATE_PROFILE'
  | 'EXPORT_DATA'
  | 'VIEW_EXERCISE_CALCULATOR'
  | 'UPDATE_PREFERENCES'
  | 'VIEW_TAX_ESTIMATES';

// ============================================
// Exercise and Tax Calculation Types
// ============================================

export interface ExerciseCalculation {
  security_id: string;
  shares_to_exercise: number;
  strike_price: number;
  current_fmv: number;
  
  // Cost calculations
  exercise_cost: number;
  spread_value: number;
  
  // Tax estimates (for informational purposes only)
  estimated_tax_liability?: TaxEstimate;
  estimated_net_proceeds?: number;
  
  // Exercise methods
  available_exercise_methods: ExerciseMethod[];
  recommended_method?: ExerciseMethod;
}

export interface TaxEstimate {
  jurisdiction: 'US' | 'UK' | 'CA' | 'AU' | 'SG' | 'MY' | 'DE';
  tax_year: number;
  
  // Tax calculations
  ordinary_income: number;
  capital_gains: number;
  total_tax_liability: number;
  effective_tax_rate: number;
  
  // Disclaimers and warnings
  disclaimers: string[];
  is_estimate_only: true;
  consult_tax_professional: true;
}

export type ExerciseMethod = 
  | 'CASH'
  | 'CASHLESS'
  | 'NET_EXERCISE'
  | 'STOCK_SWAP';

// ============================================
// Dashboard and UI Types
// ============================================

export interface EmployeeDashboardData {
  profile: EmployeeProfile;
  equity_summary: EmployeeEquitySummary;
  equity_value: EmployeeEquityValue;
  grants: EmployeeEquityGrant[];
  vesting_schedules: EmployeeVestingSchedule[];
  documents: EmployeeDocument[];
  recent_activity: EmployeePortalActivity[];
  preferences: EmployeePortalPreferences;
  
  // Company context
  company_info: {
    id: string;
    name: string;
    logo_url?: string;
    primary_currency: string;
    current_409a_date?: string;
    next_409a_date?: string;
  };
  
  // Notifications
  pending_notifications: EmployeeNotification[];
}

export interface EmployeeNotification {
  id: string;
  type: 'VESTING_MILESTONE' | 'DOCUMENT_AVAILABLE' | 'EXERCISE_WINDOW' | 'TAX_DEADLINE' | 'COMPANY_UPDATE';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  read_at?: string;
  action_required: boolean;
  action_url?: string;
  expires_at?: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface EmployeePortalAuthRequest {
  email: string;
  employee_id?: string;
  company_id: string;
  invitation_token?: string;
}

export interface EmployeePortalAuthResponse {
  success: boolean;
  employee: EmployeeProfile;
  access_token: string;
  refresh_token: string;
  portal_enabled: boolean;
  first_login: boolean;
}

export interface UpdateEmployeePreferencesRequest {
  preferences: Partial<Omit<EmployeePortalPreferences, 'id' | 'person_id' | 'company_id' | 'created_at' | 'updated_at'>>;
}

export interface ExerciseOptionsRequest {
  security_id: string;
  shares_to_exercise: number;
  exercise_method: ExerciseMethod;
  tax_jurisdiction: string;
  estimated_net_proceeds?: number;
}

export interface DataExportRequest {
  export_format: 'PDF' | 'CSV' | 'JSON';
  include_sections: string[];
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

// ============================================
// Error Types
// ============================================

export interface EmployeePortalError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export type EmployeePortalErrorCode = 
  | 'PORTAL_DISABLED'
  | 'INVALID_INVITATION'
  | 'ACCESS_DENIED'
  | 'DOCUMENT_NOT_FOUND'
  | 'INSUFFICIENT_VESTED_SHARES'
  | 'EXERCISE_WINDOW_CLOSED'
  | 'TAX_CALCULATION_ERROR'
  | 'DATA_EXPORT_FAILED'
  | 'VALIDATION_ERROR';