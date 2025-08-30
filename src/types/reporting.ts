/**
 * TypeScript types for Board Reports, Dilution Analysis, and Regulatory Filing System
 * Comprehensive type definitions for enterprise reporting
 */

// ============================================
// Report Templates and Generation
// ============================================

export type ReportTemplateType = 
  | 'BOARD_PACKAGE'
  | 'CAP_TABLE_SUMMARY'
  | 'DILUTION_ANALYSIS'
  | 'OPTION_POOL_ANALYSIS'
  | 'WATERFALL_ANALYSIS'
  | 'REGULATORY_FILING'
  | 'INVESTOR_REPORT'
  | 'EMPLOYEE_EQUITY_SUMMARY'
  | 'EXECUTIVE_DASHBOARD';

export type OutputFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'HTML';

export type ComplianceLevel = 'INTERNAL' | 'BOARD' | 'REGULATORY' | 'PUBLIC';

export interface GenerationParameters {
  format?: OutputFormat;
  include_waterfall?: boolean;
  include_dilution_analysis?: boolean;
  board_meeting_date?: string;
  custom_notes?: string;
  output_format?: OutputFormat;
  compression_enabled?: boolean;
  watermark_enabled?: boolean;
}

export type ReportStatus = 
  | 'GENERATING'
  | 'GENERATED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'ARCHIVED';

export interface ReportTemplate {
  id: string;
  template_name: string;
  template_type: ReportTemplateType;
  template_config: ReportTemplateConfig;
  output_format: OutputFormat;
  
  // Regulatory
  regulatory_framework?: string | null;
  compliance_level: ComplianceLevel;
  
  // Metadata
  description?: string | null;
  version: number;
  is_active: boolean;
  requires_board_approval: boolean;
  
  // Data Requirements
  required_data_sources?: string[] | null;
  refresh_frequency: 'ON_DEMAND' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  
  // Access Control
  authorized_roles?: string[] | null;
  data_classification: string;
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface ReportTemplateConfig {
  // Layout Configuration
  layout: {
    page_size: 'LETTER' | 'A4' | 'LEGAL';
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  
  // Header/Footer
  header?: {
    include_logo: boolean;
    include_company_name: boolean;
    include_date: boolean;
    custom_text?: string;
  };
  
  footer?: {
    include_page_numbers: boolean;
    include_confidentiality: boolean;
    custom_text?: string;
  };
  
  // Content Sections
  sections: ReportSection[];
  
  // Data Filters
  data_filters?: {
    include_inactive: boolean;
    stakeholder_types?: string[];
    security_types?: string[];
    date_range?: {
      start: string;
      end: string;
    };
  };
  
  // Formatting
  formatting: {
    font_family: string;
    font_size: number;
    currency_format: 'USD' | 'EUR' | 'GBP';
    number_format: 'STANDARD' | 'ACCOUNTING';
    date_format: string;
  };
}

export interface ReportSection {
  section_id: string;
  section_name: string;
  section_type: 'EXECUTIVE_SUMMARY' | 'CAP_TABLE' | 'OWNERSHIP_BREAKDOWN' | 
                'DILUTION_ANALYSIS' | 'WATERFALL' | 'CHARTS' | 'APPENDIX';
  order: number;
  include_in_output: boolean;
  
  // Content Configuration
  config: {
    include_charts?: boolean;
    chart_types?: string[];
    aggregation_level?: 'STAKEHOLDER' | 'SECURITY_TYPE' | 'SHARE_CLASS';
    show_percentages?: boolean;
    show_values?: boolean;
    precision?: number;
  };
}

export interface GeneratedReport {
  id: string;
  report_name: string;
  template_id?: string | null;
  company_id: string;
  
  // Report Metadata
  report_type: ReportTemplateType;
  report_period_start?: string | null;
  report_period_end?: string | null;
  as_of_date: string;
  
  // Generation Context
  generated_by?: string | null;
  generated_at: string;
  generation_parameters?: GenerationParameters | null;
  
  // File Information
  file_path?: string | null;
  file_size?: number | null;
  file_hash?: string | null;
  output_format?: string | null;
  
  // Status and Approval
  status: ReportStatus;
  
  // Board Package Specific
  board_meeting_date?: string | null;
  board_resolution_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  
  // Access and Distribution
  access_level: string;
  distributed_to?: ReportDistribution[] | null;
  access_count: number;
  last_accessed_at?: string | null;
  
  // Report Content Summary
  executive_summary?: ReportExecutiveSummary | null;
  key_metrics?: Record<string, number | string | boolean> | null;
  data_sources?: string[] | null;
  
  // Regulatory Filing
  filing_reference?: string | null;
  filing_date?: string | null;
  filing_status?: string | null;
  
  // Audit and Compliance
  retention_period_years: number;
  legal_hold: boolean;
  
  // Version Control
  version: number;
  supersedes_report_id?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface ReportDistribution {
  recipient_email: string;
  recipient_name: string;
  role: string;
  sent_at: string;
  access_level: 'VIEW_ONLY' | 'DOWNLOAD' | 'FULL_ACCESS';
}

export interface ReportExecutiveSummary {
  total_stakeholders: number;
  total_shares_outstanding: number;
  fully_diluted_shares: number;
  current_valuation_per_share: number;
  total_company_value: number;
  
  // Key Changes Since Last Report
  new_stakeholders: number;
  new_securities_issued: number;
  major_transactions: string[];
  
  // Compliance Status
  compliance_items: {
    item: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
    due_date?: string;
  }[];
  
  // Risk Factors
  risk_factors: string[];
  
  // Recommendations
  recommendations: string[];
}

// ============================================
// Dilution Analysis System
// ============================================

export type DilutionScenarioType = 
  | 'FUNDRAISING_ROUND'
  | 'OPTION_POOL_EXPANSION'
  | 'ACQUISITION_MODELING'
  | 'IPO_PREPARATION'
  | 'CONVERTIBLE_CONVERSION'
  | 'WARRANT_EXERCISE'
  | 'EMPLOYEE_GRANTS';

export type DilutionScenarioStatus = 
  | 'DRAFT'
  | 'MODELING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'EXECUTED'
  | 'CANCELLED';

export interface DilutionScenario {
  id: string;
  company_id: string;
  scenario_name: string;
  scenario_type: DilutionScenarioType;
  
  // Scenario Parameters
  base_date: string;
  projected_date?: string | null;
  
  // New Issuance Details
  new_shares_issued?: number | null;
  new_share_class_id?: string | null;
  issue_price_cents?: number | null;
  total_proceeds_cents?: number | null;
  
  // Pre-Money Valuation
  pre_money_valuation_cents?: number | null;
  post_money_valuation_cents?: number | null;
  
  // Option Pool Details
  new_option_pool_shares?: number | null;
  option_pool_percentage?: number | null;
  
  // Conversion Details
  converting_securities?: ConvertingSecurityDetails[] | null;
  conversion_terms?: ConversionTerms | null;
  
  // Anti-Dilution Provisions
  anti_dilution_adjustments?: AntiDilutionAdjustments | null;
  weighted_average_adjustments?: WeightedAverageAdjustments | null;
  
  // Scenario Status
  status: DilutionScenarioStatus;
  
  // Modeling Results
  pre_dilution_ownership?: OwnershipSnapshot | null;
  post_dilution_ownership?: OwnershipSnapshot | null;
  dilution_impact?: DilutionImpactSummary | null;
  
  // Waterfall Impact
  waterfall_pre_scenario?: WaterfallResults | null;
  waterfall_post_scenario?: WaterfallResults | null;
  
  // Board and Approval
  requires_board_approval: boolean;
  board_approval_date?: string | null;
  approved_by?: string | null;
  
  // Notes and Documentation
  scenario_description?: string | null;
  assumptions?: string | null;
  risks_and_considerations?: string | null;
  
  // Audit Fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface ConvertingSecurityDetails {
  security_id: string;
  security_type: string;
  shares_to_convert: number;
  conversion_price_cents: number;
  shares_received: number;
}

export interface ConversionTerms {
  conversion_type: 'AUTOMATIC' | 'OPTIONAL' | 'QUALIFIED_FINANCING';
  trigger_conditions: string[];
  conversion_cap?: number;
  discount_rate?: number;
  most_favored_nation?: boolean;
}

export interface AntiDilutionAdjustments {
  provision_type: 'NONE' | 'FULL_RATCHET' | 'WEIGHTED_AVERAGE_BROAD' | 'WEIGHTED_AVERAGE_NARROW';
  adjustment_calculations: {
    stakeholder_id: string;
    original_shares: number;
    adjusted_shares: number;
    additional_shares: number;
  }[];
}

export interface WeightedAverageAdjustments {
  formula_type: 'BROAD_BASED' | 'NARROW_BASED';
  outstanding_shares_calculation: number;
  consideration_received: number;
  fair_value_per_share: number;
  adjustment_ratio: number;
}

export interface OwnershipSnapshot {
  as_of_date: string;
  total_shares_outstanding: number;
  fully_diluted_shares: number;
  stakeholder_breakdown: StakeholderOwnership[];
}

export interface StakeholderOwnership {
  stakeholder_id: string;
  stakeholder_name: string;
  stakeholder_type: string;
  shares_held: number;
  ownership_percentage: number;
  fully_diluted_percentage: number;
  estimated_value_cents: number;
}

export interface DilutionImpactSummary {
  total_new_shares: number;
  total_dilution_percentage: number;
  
  // By Stakeholder Type
  founder_dilution: number;
  employee_dilution: number;
  investor_dilution: number;
  
  // Value Impact
  total_value_created: number;
  dilution_cost: number;
  
  // Key Impacts
  most_diluted_stakeholders: {
    stakeholder_name: string;
    percentage_diluted: number;
    value_impact_cents: number;
  }[];
}

export interface WaterfallResults {
  exit_value_cents: number;
  distributions: {
    stakeholder_id: string;
    distribution_amount_cents: number;
    distribution_percentage: number;
  }[];
  liquidation_preferences_paid: number;
  common_distribution_pool: number;
}

export interface DilutionAnalysisResult {
  id: string;
  dilution_scenario_id: string;
  stakeholder_id: string;
  
  // Pre-Dilution Position
  pre_dilution_shares: number;
  pre_dilution_percentage: number;
  pre_dilution_value_cents?: number | null;
  
  // Post-Dilution Position
  post_dilution_shares: number;
  post_dilution_percentage: number;
  post_dilution_value_cents?: number | null;
  
  // Dilution Impact
  absolute_dilution_shares?: number | null;
  percentage_dilution?: number | null;
  relative_dilution_percentage?: number | null;
  
  // Value Impact
  pre_dilution_total_value_cents?: number | null;
  post_dilution_total_value_cents?: number | null;
  value_change_cents?: number | null;
  
  // Anti-Dilution Protection
  anti_dilution_shares_received: number;
  anti_dilution_protection_type?: string | null;
  
  // Participation Rights
  pro_rata_rights_exercised: boolean;
  additional_investment_cents: number;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// Regulatory Filing System
// ============================================

export type RegulatoryFilingType = 
  | 'SEC_FORM_D'
  | 'SEC_FORM_4'
  | 'SEC_FORM_8_K'
  | 'IRS_FORM_3921'
  | 'IRS_FORM_8937'
  | 'STATE_BLUE_SKY'
  | 'BENEFIT_CORP_ANNUAL'
  | 'FRANCHISE_TAX_REPORT'
  | 'UNCLAIMED_PROPERTY'
  | 'WORKER_CLASSIFICATION';

export type FilingFrequency = 
  | 'ONE_TIME'
  | 'ANNUAL'
  | 'QUARTERLY'
  | 'MONTHLY'
  | 'AS_NEEDED'
  | 'EVENT_DRIVEN';

export type FilingStatus = 
  | 'PENDING'
  | 'IN_PREPARATION'
  | 'UNDER_REVIEW'
  | 'READY_TO_FILE'
  | 'FILED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'AMENDED'
  | 'LATE'
  | 'WAIVED';

export type ComplianceStatus = 
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'LATE'
  | 'WAIVED'
  | 'EXEMPT';

export interface RegulatoryFiling {
  id: string;
  company_id: string;
  filing_type: RegulatoryFilingType;
  
  // Filing Requirements
  filing_frequency: FilingFrequency;
  jurisdiction: string;
  
  // Due Dates and Deadlines
  filing_period_start?: string | null;
  filing_period_end?: string | null;
  due_date: string;
  extended_due_date?: string | null;
  
  // Filing Status
  status: FilingStatus;
  
  // Filing Details
  confirmation_number?: string | null;
  filed_date?: string | null;
  acceptance_date?: string | null;
  
  // Required Data Elements
  required_data_elements: FilingDataRequirements;
  filing_data?: Record<string, any> | null;
  supporting_documents?: string[] | null;
  
  // Financial Thresholds
  revenue_threshold_cents?: number | null;
  asset_threshold_cents?: number | null;
  employee_threshold?: number | null;
  shareholder_threshold?: number | null;
  
  // Compliance Status
  compliance_status: ComplianceStatus;
  compliance_notes?: string | null;
  
  // Professional Services
  prepared_by?: string | null;
  reviewed_by?: string | null;
  law_firm_contact?: string | null;
  accountant_contact?: string | null;
  
  // Fees and Costs
  filing_fee_cents: number;
  professional_fees_cents: number;
  total_cost_cents: number;
  
  // Reminders and Notifications
  reminder_sent: boolean;
  notification_recipients?: string[] | null;
  
  // Audit Fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  
  // Next filing calculation
  next_filing_due_date?: string | null;
}

export interface FilingDataRequirements {
  required_fields: FilingDataField[];
  validation_rules: ValidationRule[];
  supporting_documents: SupportingDocumentRequirement[];
}

export interface FilingDataField {
  field_name: string;
  field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'PERCENTAGE' | 'BOOLEAN';
  is_required: boolean;
  validation_pattern?: string;
  min_value?: number;
  max_value?: number;
  description: string;
}

export interface ValidationRule {
  rule_name: string;
  rule_type: 'REQUIRED' | 'FORMAT' | 'RANGE' | 'CROSS_REFERENCE';
  rule_expression: string;
  error_message: string;
}

export interface SupportingDocumentRequirement {
  document_type: string;
  is_required: boolean;
  description: string;
  acceptable_formats: string[];
}

// ============================================
// Compliance Calendar
// ============================================

export type CalendarEventType = 
  | 'FILING_DEADLINE'
  | 'BOARD_MEETING'
  | 'SHAREHOLDER_MEETING'
  | 'TAX_DEADLINE'
  | 'COMPLIANCE_REVIEW'
  | 'AUDIT_DEADLINE'
  | 'INSURANCE_RENEWAL';

export type CalendarEventStatus = 
  | 'SCHEDULED'
  | 'APPROACHING'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ComplianceCalendarEvent {
  id: string;
  company_id: string;
  
  // Calendar Event Details
  event_name: string;
  event_type: CalendarEventType;
  
  // Timing
  event_date: string;
  reminder_days_before: number;
  is_recurring: boolean;
  recurrence_pattern?: string | null;
  
  // Status and Completion
  status: CalendarEventStatus;
  completion_date?: string | null;
  completion_notes?: string | null;
  
  // Associated Records
  related_filing_id?: string | null;
  related_report_id?: string | null;
  
  // Responsibility
  assigned_to?: string | null;
  responsible_department?: string | null;
  
  // Priority and Impact
  priority_level: PriorityLevel;
  business_impact?: string | null;
  consequences_of_delay?: string | null;
  
  // Notifications
  notification_sent: boolean;
  escalation_sent: boolean;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// Board Report Specific Types
// ============================================

export interface BoardPackageData {
  // Executive Summary
  executive_summary: {
    report_period: {
      start_date: string;
      end_date: string;
      as_of_date: string;
    };
    
    key_metrics: {
      total_stakeholders: number;
      total_shares_outstanding: number;
      fully_diluted_shares: number;
      current_409a_value_per_share: number;
      total_company_value: number;
    };
    
    significant_changes: {
      new_stakeholders: number;
      securities_issued: number;
      major_transactions: string[];
      governance_changes: string[];
    };
    
    upcoming_deadlines: {
      regulatory_filings: number;
      board_matters: number;
      compliance_items: number;
    };
  };
  
  // Cap Table Summary
  cap_table_summary: {
    by_stakeholder_type: {
      founders: StakeholderTypeSummary;
      employees: StakeholderTypeSummary;
      investors: StakeholderTypeSummary;
      advisors: StakeholderTypeSummary;
      other: StakeholderTypeSummary;
    };
    
    by_security_type: {
      common_stock: SecurityTypeSummary;
      preferred_stock: SecurityTypeSummary;
      stock_options: SecurityTypeSummary;
      warrants: SecurityTypeSummary;
      convertible_securities: SecurityTypeSummary;
    };
    
    option_pool_analysis: {
      total_authorized: number;
      total_granted: number;
      available_for_grant: number;
      pool_utilization_percentage: number;
      recommended_pool_size: number;
    };
  };
  
  // Recent Activity
  recent_activity: {
    new_grants: SecurityGrant[];
    exercises: SecurityExercise[];
    transfers: SecurityTransfer[];
    cancellations: SecurityCancellation[];
  };
  
  // Compliance Status
  compliance_status: {
    regulatory_filings: ComplianceItem[];
    corporate_governance: ComplianceItem[];
    tax_obligations: ComplianceItem[];
    insurance_coverage: ComplianceItem[];
  };
  
  // Forward-Looking Analysis
  forward_looking: {
    dilution_scenarios: DilutionScenarioSummary[];
    upcoming_events: UpcomingEvent[];
    recommendations: Recommendation[];
  };
}

export interface StakeholderTypeSummary {
  count: number;
  total_shares: number;
  ownership_percentage: number;
  fully_diluted_percentage: number;
  estimated_value: number;
}

export interface SecurityTypeSummary {
  count: number;
  total_shares: number;
  percentage_of_total: number;
  weighted_average_price: number;
  total_value: number;
}

export interface SecurityGrant {
  grant_date: string;
  recipient_name: string;
  security_type: string;
  shares_granted: number;
  exercise_price: number;
  vesting_schedule: string;
}

export interface SecurityExercise {
  exercise_date: string;
  holder_name: string;
  security_type: string;
  shares_exercised: number;
  exercise_price: number;
  total_proceeds: number;
}

export interface SecurityTransfer {
  transfer_date: string;
  from_holder: string;
  to_holder: string;
  security_type: string;
  shares_transferred: number;
  transfer_price?: number;
}

export interface SecurityCancellation {
  cancellation_date: string;
  holder_name: string;
  security_type: string;
  shares_cancelled: number;
  reason: string;
}

export interface ComplianceItem {
  item_name: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING' | 'OVERDUE';
  due_date?: string;
  responsible_party: string;
  priority: PriorityLevel;
  notes?: string;
}

export interface DilutionScenarioSummary {
  scenario_name: string;
  scenario_type: string;
  projected_dilution: number;
  new_money_raised?: number;
  impact_on_founders: number;
  impact_on_employees: number;
}

export interface UpcomingEvent {
  event_name: string;
  event_date: string;
  event_type: string;
  preparation_required: string[];
  board_action_required: boolean;
}

export interface Recommendation {
  category: 'GOVERNANCE' | 'COMPLIANCE' | 'FINANCING' | 'EQUITY' | 'TAX';
  priority: PriorityLevel;
  recommendation: string;
  rationale: string;
  timeline: string;
  responsible_party: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface GenerateReportRequest {
  template_id: string;
  company_id: string;
  as_of_date: string;
  report_period_start?: string;
  report_period_end?: string;
  parameters?: Record<string, any>;
  output_format?: OutputFormat;
}

export interface CreateDilutionScenarioRequest {
  company_id: string;
  scenario_name: string;
  scenario_type: DilutionScenarioType;
  base_date: string;
  
  // Scenario-specific parameters
  new_shares_issued?: number;
  issue_price_cents?: number;
  new_option_pool_shares?: number;
  converting_securities?: ConvertingSecurityDetails[];
  
  scenario_description?: string;
  assumptions?: string;
}

export interface RegulatoryFilingSchedule {
  company_id: string;
  filings: {
    filing_type: RegulatoryFilingType;
    jurisdiction: string;
    due_date: string;
    estimated_cost: number;
    priority: PriorityLevel;
  }[];
}

export interface ComplianceDashboard {
  company_id: string;
  as_of_date: string;
  
  // Overview Metrics
  total_compliance_items: number;
  compliant_items: number;
  overdue_items: number;
  upcoming_deadlines: number;
  
  // By Category
  regulatory_compliance: number;
  corporate_governance: number;
  tax_compliance: number;
  employment_compliance: number;
  
  // Upcoming Deadlines (next 90 days)
  upcoming_filings: {
    filing_type: string;
    due_date: string;
    status: string;
    estimated_cost: number;
  }[];
  
  // Risk Assessment
  compliance_score: number; // 0-100
  risk_factors: string[];
  recommendations: string[];
}