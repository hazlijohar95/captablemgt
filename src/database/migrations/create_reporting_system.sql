-- Board-Ready Cap Table Reports and Regulatory Filing System
-- Comprehensive reporting infrastructure for executive dashboards and compliance

-- ============================================
-- Report Templates and Configuration
-- ============================================

-- Master report templates for different report types
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Identification
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
        'BOARD_PACKAGE',
        'CAP_TABLE_SUMMARY',
        'DILUTION_ANALYSIS',
        'OPTION_POOL_ANALYSIS',
        'WATERFALL_ANALYSIS',
        'REGULATORY_FILING',
        'INVESTOR_REPORT',
        'EMPLOYEE_EQUITY_SUMMARY',
        'EXECUTIVE_DASHBOARD'
    )),
    
    -- Configuration
    template_config JSONB NOT NULL,
    output_format VARCHAR(20) NOT NULL DEFAULT 'PDF' CHECK (output_format IN (
        'PDF', 'EXCEL', 'CSV', 'JSON', 'HTML'
    )),
    
    -- Regulatory Compliance
    regulatory_framework VARCHAR(50), -- e.g., 'SEC_FORM_D', 'IRS_FORM_3921', 'SOX_404'
    compliance_level VARCHAR(20) DEFAULT 'INTERNAL' CHECK (compliance_level IN (
        'INTERNAL', 'BOARD', 'REGULATORY', 'PUBLIC'
    )),
    
    -- Template Metadata
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    requires_board_approval BOOLEAN DEFAULT false,
    
    -- Data Requirements
    required_data_sources JSONB, -- Arrays of required tables/views
    refresh_frequency VARCHAR(20) DEFAULT 'ON_DEMAND', -- 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'
    
    -- Access Control
    authorized_roles JSONB, -- Array of roles that can generate this report
    data_classification VARCHAR(20) DEFAULT 'CONFIDENTIAL',
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_active_template UNIQUE (template_name, template_type) 
        WHERE deleted_at IS NULL AND is_active = true
);

-- Generated reports tracking
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Report Identification
    report_name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES report_templates(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Report Metadata
    report_type VARCHAR(50) NOT NULL,
    report_period_start DATE,
    report_period_end DATE,
    as_of_date DATE NOT NULL,
    
    -- Generation Context
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    generation_parameters JSONB,
    
    -- File Information
    file_path TEXT,
    file_size INTEGER,
    file_hash VARCHAR(256),
    output_format VARCHAR(20),
    
    -- Status and Approval
    status VARCHAR(20) NOT NULL DEFAULT 'GENERATED' CHECK (status IN (
        'GENERATING',
        'GENERATED', 
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'SUPERSEDED',
        'ARCHIVED'
    )),
    
    -- Board Package Specific
    board_meeting_date DATE,
    board_resolution_id UUID,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Access and Distribution
    access_level VARCHAR(20) DEFAULT 'CONFIDENTIAL',
    distributed_to JSONB, -- Array of recipient information
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Report Content Summary
    executive_summary JSONB,
    key_metrics JSONB,
    data_sources JSONB,
    
    -- Regulatory Filing
    filing_reference VARCHAR(100),
    filing_date DATE,
    filing_status VARCHAR(20),
    
    -- Audit and Compliance
    retention_period_years INTEGER DEFAULT 7,
    legal_hold BOOLEAN DEFAULT false,
    
    -- Version Control
    version INTEGER NOT NULL DEFAULT 1,
    supersedes_report_id UUID REFERENCES generated_reports(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Dilution Analysis System
-- ============================================

-- Dilution scenarios and modeling
CREATE TABLE IF NOT EXISTS dilution_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scenario Identification
    company_id UUID NOT NULL REFERENCES companies(id),
    scenario_name VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL CHECK (scenario_type IN (
        'FUNDRAISING_ROUND',
        'OPTION_POOL_EXPANSION',
        'ACQUISITION_MODELING',
        'IPO_PREPARATION',
        'CONVERTIBLE_CONVERSION',
        'WARRANT_EXERCISE',
        'EMPLOYEE_GRANTS'
    )),
    
    -- Scenario Parameters
    base_date DATE NOT NULL,
    projected_date DATE,
    
    -- New Issuance Details
    new_shares_issued INTEGER,
    new_share_class_id UUID REFERENCES share_classes(id),
    issue_price_cents INTEGER, -- Price per share in cents
    total_proceeds_cents INTEGER, -- Total capital raised
    
    -- Pre-Money Valuation
    pre_money_valuation_cents INTEGER,
    post_money_valuation_cents INTEGER,
    
    -- Option Pool Details
    new_option_pool_shares INTEGER,
    option_pool_percentage DECIMAL(5,4), -- As decimal (0.15 = 15%)
    
    -- Conversion Details (for convertibles)
    converting_securities JSONB, -- Array of securities being converted
    conversion_terms JSONB,
    
    -- Anti-Dilution Provisions
    anti_dilution_adjustments JSONB,
    weighted_average_adjustments JSONB,
    
    -- Scenario Status
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'MODELING',
        'UNDER_REVIEW',
        'APPROVED',
        'EXECUTED',
        'CANCELLED'
    )),
    
    -- Modeling Results (calculated)
    pre_dilution_ownership JSONB, -- Ownership percentages before
    post_dilution_ownership JSONB, -- Ownership percentages after
    dilution_impact JSONB, -- Detailed dilution analysis
    
    -- Waterfall Impact
    waterfall_pre_scenario JSONB,
    waterfall_post_scenario JSONB,
    
    -- Board and Approval
    requires_board_approval BOOLEAN DEFAULT false,
    board_approval_date DATE,
    approved_by UUID REFERENCES users(id),
    
    -- Notes and Documentation
    scenario_description TEXT,
    assumptions TEXT,
    risks_and_considerations TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Dilution analysis results for stakeholders
CREATE TABLE IF NOT EXISTS dilution_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    dilution_scenario_id UUID NOT NULL REFERENCES dilution_scenarios(id) ON DELETE CASCADE,
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id),
    
    -- Pre-Dilution Position
    pre_dilution_shares INTEGER NOT NULL,
    pre_dilution_percentage DECIMAL(10,6) NOT NULL,
    pre_dilution_value_cents INTEGER,
    
    -- Post-Dilution Position
    post_dilution_shares INTEGER NOT NULL,
    post_dilution_percentage DECIMAL(10,6) NOT NULL,
    post_dilution_value_cents INTEGER,
    
    -- Dilution Impact
    absolute_dilution_shares INTEGER, -- Shares lost to dilution
    percentage_dilution DECIMAL(10,6), -- Percentage points lost
    relative_dilution_percentage DECIMAL(10,6), -- Percentage of original lost
    
    -- Value Impact
    pre_dilution_total_value_cents INTEGER,
    post_dilution_total_value_cents INTEGER,
    value_change_cents INTEGER,
    
    -- Anti-Dilution Protection
    anti_dilution_shares_received INTEGER DEFAULT 0,
    anti_dilution_protection_type VARCHAR(50),
    
    -- Participation Rights
    pro_rata_rights_exercised BOOLEAN DEFAULT false,
    additional_investment_cents INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_stakeholder_scenario UNIQUE (dilution_scenario_id, stakeholder_id)
);

-- ============================================
-- Regulatory Filing Support
-- ============================================

-- Regulatory filing requirements tracking
CREATE TABLE IF NOT EXISTS regulatory_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Filing Identification
    company_id UUID NOT NULL REFERENCES companies(id),
    filing_type VARCHAR(100) NOT NULL CHECK (filing_type IN (
        'SEC_FORM_D', -- Regulation D offerings
        'SEC_FORM_4', -- Statement of changes in beneficial ownership
        'SEC_FORM_8_K', -- Current report
        'IRS_FORM_3921', -- Exercise of incentive stock option
        'IRS_FORM_8937', -- Report of organizational actions
        'STATE_BLUE_SKY', -- State securities filings
        'BENEFIT_CORP_ANNUAL', -- Benefit corporation reports
        'FRANCHISE_TAX_REPORT', -- State franchise tax
        'UNCLAIMED_PROPERTY', -- State unclaimed property reports
        'WORKER_CLASSIFICATION' -- Worker classification reports
    )),
    
    -- Filing Requirements
    filing_frequency VARCHAR(20) NOT NULL CHECK (filing_frequency IN (
        'ONE_TIME', 'ANNUAL', 'QUARTERLY', 'MONTHLY', 'AS_NEEDED', 'EVENT_DRIVEN'
    )),
    jurisdiction VARCHAR(100) NOT NULL, -- 'FEDERAL', 'CALIFORNIA', 'DELAWARE', etc.
    
    -- Due Dates and Deadlines
    filing_period_start DATE,
    filing_period_end DATE,
    due_date DATE NOT NULL,
    extended_due_date DATE,
    
    -- Filing Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'IN_PREPARATION',
        'UNDER_REVIEW',
        'READY_TO_FILE',
        'FILED',
        'ACCEPTED',
        'REJECTED',
        'AMENDED',
        'LATE',
        'WAIVED'
    )),
    
    -- Filing Details
    confirmation_number VARCHAR(100),
    filed_date DATE,
    acceptance_date DATE,
    
    -- Required Data Elements
    required_data_elements JSONB NOT NULL,
    filing_data JSONB, -- Actual data for the filing
    supporting_documents JSONB, -- Array of document references
    
    -- Financial Thresholds
    revenue_threshold_cents INTEGER,
    asset_threshold_cents INTEGER,
    employee_threshold INTEGER,
    shareholder_threshold INTEGER,
    
    -- Compliance Status
    compliance_status VARCHAR(20) DEFAULT 'COMPLIANT' CHECK (compliance_status IN (
        'COMPLIANT', 'NON_COMPLIANT', 'LATE', 'WAIVED', 'EXEMPT'
    )),
    compliance_notes TEXT,
    
    -- Professional Services
    prepared_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    law_firm_contact VARCHAR(255),
    accountant_contact VARCHAR(255),
    
    -- Fees and Costs
    filing_fee_cents INTEGER DEFAULT 0,
    professional_fees_cents INTEGER DEFAULT 0,
    total_cost_cents INTEGER DEFAULT 0,
    
    -- Reminders and Notifications
    reminder_sent BOOLEAN DEFAULT false,
    notification_recipients JSONB,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Next filing calculation
    next_filing_due_date DATE
);

-- Regulatory compliance calendar
CREATE TABLE IF NOT EXISTS compliance_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Calendar Event Details
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'FILING_DEADLINE',
        'BOARD_MEETING',
        'SHAREHOLDER_MEETING',
        'TAX_DEADLINE',
        'COMPLIANCE_REVIEW',
        'AUDIT_DEADLINE',
        'INSURANCE_RENEWAL'
    )),
    
    -- Timing
    event_date DATE NOT NULL,
    reminder_days_before INTEGER DEFAULT 30,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(20), -- 'MONTHLY', 'QUARTERLY', 'ANNUALLY'
    
    -- Status and Completion
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
        'SCHEDULED',
        'APPROACHING',
        'DUE_TODAY',
        'OVERDUE',
        'COMPLETED',
        'CANCELLED',
        'RESCHEDULED'
    )),
    completion_date DATE,
    completion_notes TEXT,
    
    -- Associated Records
    related_filing_id UUID REFERENCES regulatory_filings(id),
    related_report_id UUID REFERENCES generated_reports(id),
    
    -- Responsibility
    assigned_to UUID REFERENCES users(id),
    responsible_department VARCHAR(100),
    
    -- Priority and Impact
    priority_level VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority_level IN (
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    )),
    business_impact TEXT,
    consequences_of_delay TEXT,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT false,
    escalation_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Performance Indexes
-- ============================================

-- Report templates indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_type 
    ON report_templates(template_type, is_active) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_templates_compliance 
    ON report_templates(compliance_level, regulatory_framework) 
    WHERE deleted_at IS NULL;

-- Generated reports indexes
CREATE INDEX IF NOT EXISTS idx_generated_reports_company_date 
    ON generated_reports(company_id, as_of_date DESC, report_type);

CREATE INDEX IF NOT EXISTS idx_generated_reports_status 
    ON generated_reports(company_id, status, generated_at DESC);

-- Performance indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_reports_company_template_date 
    ON generated_reports(company_id, template_id, as_of_date DESC) 
    WHERE status = 'GENERATED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_reports_company_status_date
    ON generated_reports(company_id, status, generated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dilution_scenarios_company_status_date
    ON dilution_scenarios(company_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regulatory_filings_jurisdiction_status
    ON regulatory_filings(jurisdiction, status, due_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_calendar_company_date
    ON compliance_calendar(company_id, event_date)
    WHERE event_date >= CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_generated_reports_board_meeting 
    ON generated_reports(board_meeting_date, status) 
    WHERE board_meeting_date IS NOT NULL;

-- Dilution scenarios indexes
CREATE INDEX IF NOT EXISTS idx_dilution_scenarios_company 
    ON dilution_scenarios(company_id, base_date DESC, scenario_type) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dilution_scenarios_status 
    ON dilution_scenarios(status, created_at DESC) 
    WHERE deleted_at IS NULL;

-- Dilution analysis results indexes
CREATE INDEX IF NOT EXISTS idx_dilution_results_scenario 
    ON dilution_analysis_results(dilution_scenario_id, stakeholder_id);

CREATE INDEX IF NOT EXISTS idx_dilution_results_impact 
    ON dilution_analysis_results(relative_dilution_percentage DESC, post_dilution_percentage DESC);

-- Regulatory filings indexes
CREATE INDEX IF NOT EXISTS idx_regulatory_filings_company_due 
    ON regulatory_filings(company_id, due_date ASC, status);

CREATE INDEX IF NOT EXISTS idx_regulatory_filings_type_jurisdiction 
    ON regulatory_filings(filing_type, jurisdiction, status);

CREATE INDEX IF NOT EXISTS idx_regulatory_filings_compliance 
    ON regulatory_filings(compliance_status, due_date) 
    WHERE status IN ('PENDING', 'IN_PREPARATION', 'UNDER_REVIEW');

-- Compliance calendar indexes
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_company_date 
    ON compliance_calendar(company_id, event_date ASC, status);

CREATE INDEX IF NOT EXISTS idx_compliance_calendar_approaching 
    ON compliance_calendar(event_date, reminder_days_before, status) 
    WHERE status IN ('SCHEDULED', 'APPROACHING', 'DUE_TODAY');

-- ============================================
-- Useful Views for Reporting
-- ============================================

-- Current cap table snapshot view
CREATE OR REPLACE VIEW current_cap_table_snapshot AS
SELECT 
    s.company_id,
    s.id as stakeholder_id,
    COALESCE(p.name, s.entity_name) as stakeholder_name,
    s.type as stakeholder_type,
    
    -- Securities summary
    COUNT(sec.id) as total_securities,
    SUM(CASE WHEN sec.status = 'ACTIVE' THEN sec.shares ELSE 0 END) as active_shares,
    SUM(CASE WHEN sec.type = 'COMMON_STOCK' AND sec.status = 'ACTIVE' THEN sec.shares ELSE 0 END) as common_shares,
    SUM(CASE WHEN sec.type LIKE '%PREFERRED%' AND sec.status = 'ACTIVE' THEN sec.shares ELSE 0 END) as preferred_shares,
    SUM(CASE WHEN sec.type = 'STOCK_OPTION' AND sec.status = 'ACTIVE' THEN sec.shares ELSE 0 END) as option_shares,
    
    -- Valuation data (requires current 409A valuation)
    (SELECT fair_market_value_per_share 
     FROM valuations_409a v 
     WHERE v.company_id = s.company_id 
       AND v.status = 'FINAL' 
       AND v.effective_period_start <= CURRENT_DATE
       AND (v.effective_period_end IS NULL OR v.effective_period_end >= CURRENT_DATE)
     ORDER BY v.valuation_date DESC LIMIT 1) as current_fmv_per_share,
    
    -- Last updated
    MAX(sec.updated_at) as last_security_update
    
FROM stakeholders s
LEFT JOIN people p ON s.id = p.stakeholder_id
LEFT JOIN securities sec ON s.id = sec.stakeholder_id AND sec.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.company_id, s.id, p.name, s.entity_name, s.type;

-- Upcoming compliance deadlines view
CREATE OR REPLACE VIEW upcoming_compliance_deadlines AS
SELECT 
    c.company_id,
    c.event_name,
    c.event_type,
    c.event_date,
    c.priority_level,
    c.assigned_to,
    
    -- Days until due
    c.event_date - CURRENT_DATE as days_until_due,
    
    -- Associated filing info
    rf.filing_type,
    rf.jurisdiction,
    rf.status as filing_status,
    
    -- Risk assessment
    CASE 
        WHEN c.event_date < CURRENT_DATE THEN 'OVERDUE'
        WHEN c.event_date = CURRENT_DATE THEN 'DUE_TODAY'
        WHEN c.event_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'DUE_THIS_WEEK'
        WHEN c.event_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_THIS_MONTH'
        ELSE 'FUTURE'
    END as urgency_level
    
FROM compliance_calendar c
LEFT JOIN regulatory_filings rf ON c.related_filing_id = rf.id
WHERE c.status IN ('SCHEDULED', 'APPROACHING', 'DUE_TODAY', 'OVERDUE')
  AND c.event_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY c.event_date ASC;

-- Board report metrics view
CREATE OR REPLACE VIEW board_report_metrics AS
SELECT 
    company_id,
    
    -- Cap table metrics
    (SELECT COUNT(*) FROM stakeholders WHERE company_id = companies.id AND deleted_at IS NULL) as total_stakeholders,
    (SELECT COUNT(*) FROM stakeholders WHERE company_id = companies.id AND type = 'INDIVIDUAL' AND deleted_at IS NULL) as individual_stakeholders,
    (SELECT COUNT(*) FROM stakeholders WHERE company_id = companies.id AND type = 'ENTITY' AND deleted_at IS NULL) as entity_stakeholders,
    
    -- Securities metrics
    (SELECT COUNT(*) FROM securities s JOIN stakeholders st ON s.stakeholder_id = st.id 
     WHERE st.company_id = companies.id AND s.status = 'ACTIVE' AND s.deleted_at IS NULL) as active_securities,
    
    -- Share counts by type
    (SELECT COALESCE(SUM(s.shares), 0) FROM securities s JOIN stakeholders st ON s.stakeholder_id = st.id 
     WHERE st.company_id = companies.id AND s.type = 'COMMON_STOCK' AND s.status = 'ACTIVE' AND s.deleted_at IS NULL) as total_common_shares,
    (SELECT COALESCE(SUM(s.shares), 0) FROM securities s JOIN stakeholders st ON s.stakeholder_id = st.id 
     WHERE st.company_id = companies.id AND s.type LIKE '%PREFERRED%' AND s.status = 'ACTIVE' AND s.deleted_at IS NULL) as total_preferred_shares,
    (SELECT COALESCE(SUM(s.shares), 0) FROM securities s JOIN stakeholders st ON s.stakeholder_id = st.id 
     WHERE st.company_id = companies.id AND s.type = 'STOCK_OPTION' AND s.status = 'ACTIVE' AND s.deleted_at IS NULL) as total_option_shares,
    
    -- Valuation info
    (SELECT fair_market_value_per_share FROM valuations_409a v 
     WHERE v.company_id = companies.id AND v.status = 'FINAL' 
       AND v.effective_period_start <= CURRENT_DATE
       AND (v.effective_period_end IS NULL OR v.effective_period_end >= CURRENT_DATE)
     ORDER BY v.valuation_date DESC LIMIT 1) as current_fmv_per_share,
    
    (SELECT valuation_date FROM valuations_409a v 
     WHERE v.company_id = companies.id AND v.status = 'FINAL'
       AND v.effective_period_start <= CURRENT_DATE
       AND (v.effective_period_end IS NULL OR v.effective_period_end >= CURRENT_DATE)
     ORDER BY v.valuation_date DESC LIMIT 1) as current_valuation_date
    
FROM companies
WHERE deleted_at IS NULL;

-- ============================================
-- Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dilution_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dilution_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_calendar ENABLE ROW LEVEL SECURITY;

-- Company-based access policies
CREATE POLICY reports_company_access ON generated_reports
    USING (company_id IN (
        SELECT company_id FROM user_company_access 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY dilution_company_access ON dilution_scenarios
    USING (company_id IN (
        SELECT company_id FROM user_company_access 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY filings_company_access ON regulatory_filings
    USING (company_id IN (
        SELECT company_id FROM user_company_access 
        WHERE user_id = auth.uid()
    ));

-- ============================================
-- Comments and Documentation
-- ============================================

COMMENT ON TABLE report_templates IS 'Master templates for generating board reports and regulatory filings';
COMMENT ON TABLE generated_reports IS 'Historical record of all generated reports with approval workflow';
COMMENT ON TABLE dilution_scenarios IS 'Modeling scenarios for analyzing dilution impact of corporate actions';
COMMENT ON TABLE dilution_analysis_results IS 'Per-stakeholder dilution impact analysis results';
COMMENT ON TABLE regulatory_filings IS 'Tracking and management of all regulatory filing requirements';
COMMENT ON TABLE compliance_calendar IS 'Calendar of compliance deadlines and important dates';

COMMENT ON COLUMN generated_reports.executive_summary IS 'Key metrics and highlights for executive review';
COMMENT ON COLUMN dilution_scenarios.anti_dilution_adjustments IS 'JSON data for anti-dilution provision calculations';
COMMENT ON COLUMN regulatory_filings.required_data_elements IS 'JSON schema of required data for the filing type';
COMMENT ON COLUMN compliance_calendar.consequences_of_delay IS 'Business impact description if deadline is missed';