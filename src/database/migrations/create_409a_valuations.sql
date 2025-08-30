-- 409A Valuations and Audit Trail System
-- Implements comprehensive valuation tracking with full audit capabilities
-- Compliant with IRS Section 409A requirements

-- ============================================
-- 409A Valuations Core Tables
-- ============================================

-- Main 409A valuations table
CREATE TABLE IF NOT EXISTS valuations_409a (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Valuation Details
    valuation_date DATE NOT NULL,
    effective_period_start DATE NOT NULL,
    effective_period_end DATE,
    fair_market_value_per_share INTEGER NOT NULL, -- In cents for precision
    
    -- Valuation Metadata
    valuation_method VARCHAR(50) NOT NULL CHECK (valuation_method IN (
        'INCOME_APPROACH', 
        'MARKET_APPROACH', 
        'ASSET_APPROACH',
        'HYBRID_APPROACH',
        'OPM', -- Option Pricing Model
        'PWM', -- Probability Weighted Method
        'BACKSOLVE'
    )),
    
    -- Required Documentation
    report_file_path TEXT,
    report_file_size INTEGER,
    report_file_hash VARCHAR(256), -- SHA-256 hash for integrity
    
    -- Valuation Provider
    appraiser_name VARCHAR(255) NOT NULL,
    appraiser_credentials TEXT,
    appraiser_firm VARCHAR(255),
    appraiser_contact_info JSONB,
    
    -- IRS Compliance Fields
    safe_harbor_qualified BOOLEAN NOT NULL DEFAULT false,
    presumption_of_reasonableness BOOLEAN NOT NULL DEFAULT false,
    board_resolution_date DATE,
    board_resolution_file_path TEXT,
    
    -- Financial Data at Valuation Date
    enterprise_value INTEGER, -- In cents
    equity_value INTEGER, -- In cents
    revenue_ltm INTEGER, -- Last twelve months revenue in cents
    ebitda_ltm INTEGER, -- In cents
    cash_balance INTEGER, -- In cents
    debt_balance INTEGER, -- In cents
    
    -- Market Context
    market_multiple_revenue DECIMAL(10,2),
    market_multiple_ebitda DECIMAL(10,2),
    discount_rate DECIMAL(5,4), -- As decimal (e.g., 0.15 for 15%)
    risk_free_rate DECIMAL(5,4),
    
    -- Waterfall Analysis Results
    waterfall_analysis_id UUID REFERENCES waterfall_analyses(id),
    
    -- Status and Workflow
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'UNDER_REVIEW',
        'BOARD_APPROVED',
        'FINAL',
        'SUPERSEDED',
        'REJECTED'
    )),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Version Control
    version INTEGER NOT NULL DEFAULT 1,
    supersedes_valuation_id UUID REFERENCES valuations_409a(id),
    
    -- Notes and Comments
    notes TEXT,
    internal_comments TEXT,
    
    -- Constraints
    CONSTRAINT valid_valuation_period CHECK (
        effective_period_end IS NULL OR effective_period_end > effective_period_start
    ),
    CONSTRAINT positive_fair_value CHECK (fair_market_value_per_share > 0),
    CONSTRAINT valid_enterprise_value CHECK (
        enterprise_value IS NULL OR enterprise_value >= 0
    )
);

-- Share class specific valuations within a 409A report
CREATE TABLE IF NOT EXISTS valuation_share_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valuation_409a_id UUID NOT NULL REFERENCES valuations_409a(id) ON DELETE CASCADE,
    share_class_id UUID NOT NULL REFERENCES share_classes(id),
    
    -- Class-specific valuation
    fair_market_value_per_share INTEGER NOT NULL, -- In cents
    total_shares_outstanding INTEGER NOT NULL,
    total_value INTEGER NOT NULL, -- In cents
    
    -- Valuation methodology for this class
    valuation_method VARCHAR(50),
    discount_rate DECIMAL(5,4),
    
    -- Rights and preferences impact
    liquidation_preference INTEGER, -- In cents per share
    participating_preferred BOOLEAN DEFAULT false,
    dividend_rate DECIMAL(5,4),
    
    -- Waterfall position
    waterfall_rank INTEGER,
    waterfall_allocation_percentage DECIMAL(5,4),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT positive_class_fair_value CHECK (fair_market_value_per_share > 0),
    CONSTRAINT positive_shares_outstanding CHECK (total_shares_outstanding > 0),
    CONSTRAINT unique_class_per_valuation UNIQUE (valuation_409a_id, share_class_id)
);

-- Supporting financial data and assumptions
CREATE TABLE IF NOT EXISTS valuation_assumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valuation_409a_id UUID NOT NULL REFERENCES valuations_409a(id) ON DELETE CASCADE,
    
    -- Assumption Details
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'FINANCIAL_PROJECTIONS',
        'MARKET_DATA',
        'DISCOUNT_RATES',
        'MULTIPLES',
        'SCENARIO_PROBABILITIES',
        'COMPANY_SPECIFIC'
    )),
    assumption_name VARCHAR(255) NOT NULL,
    assumption_value JSONB NOT NULL,
    data_source TEXT,
    rationale TEXT,
    
    -- Sensitivity Analysis
    base_case_value DECIMAL(15,2),
    upside_case_value DECIMAL(15,2),
    downside_case_value DECIMAL(15,2),
    probability_weighting DECIMAL(5,4),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scenario modeling for 409A valuations
CREATE TABLE IF NOT EXISTS valuation_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valuation_409a_id UUID NOT NULL REFERENCES valuations_409a(id) ON DELETE CASCADE,
    
    -- Scenario Details
    scenario_name VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL CHECK (scenario_type IN (
        'BASE_CASE',
        'UPSIDE_CASE',
        'DOWNSIDE_CASE',
        'IPO_SCENARIO',
        'ACQUISITION_SCENARIO',
        'LIQUIDATION_SCENARIO'
    )),
    
    -- Financial Projections
    projected_revenue_y1 INTEGER, -- In cents
    projected_revenue_y2 INTEGER,
    projected_revenue_y3 INTEGER,
    projected_revenue_y4 INTEGER,
    projected_revenue_y5 INTEGER,
    
    projected_ebitda_y1 INTEGER, -- In cents
    projected_ebitda_y2 INTEGER,
    projected_ebitda_y3 INTEGER,
    projected_ebitda_y4 INTEGER,
    projected_ebitda_y5 INTEGER,
    
    -- Exit Assumptions
    exit_multiple_revenue DECIMAL(10,2),
    exit_multiple_ebitda DECIMAL(10,2),
    time_to_exit_years DECIMAL(3,1),
    probability_of_scenario DECIMAL(5,4),
    
    -- Resulting Valuations
    terminal_value INTEGER, -- In cents
    present_value INTEGER, -- In cents
    probability_weighted_value INTEGER, -- In cents
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Comprehensive Audit Trail System
-- ============================================

-- Main audit log table for all system activities
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Identification
    event_id UUID NOT NULL DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'CREATE',
        'UPDATE',
        'DELETE',
        'VIEW',
        'EXPORT',
        'LOGIN',
        'LOGOUT',
        'PERMISSION_CHANGE',
        'BULK_OPERATION',
        'CALCULATION',
        'REPORT_GENERATION'
    )),
    
    -- Entity Information
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
        'COMPANY',
        'STAKEHOLDER',
        'SECURITY',
        'VESTING_SCHEDULE',
        'VALUATION_409A',
        'SHARE_CLASS',
        'TRANSACTION',
        'USER',
        'WATERFALL_ANALYSIS',
        'SCENARIO_MODEL',
        'REPORT'
    )),
    entity_id UUID NOT NULL,
    company_id UUID REFERENCES companies(id), -- For data partitioning
    
    -- User and Context
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Change Details
    field_name VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    change_summary TEXT,
    
    -- Request Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    
    -- Compliance and Security
    data_classification VARCHAR(20) DEFAULT 'INTERNAL' CHECK (data_classification IN (
        'PUBLIC',
        'INTERNAL',
        'CONFIDENTIAL',
        'RESTRICTED'
    )),
    retention_period_years INTEGER DEFAULT 7,
    
    -- Timestamp
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Additional metadata
    metadata JSONB,
    
    -- Indexes will be created below
    INDEX (entity_type, entity_id),
    INDEX (company_id, occurred_at),
    INDEX (user_id, occurred_at),
    INDEX (event_type, occurred_at)
);

-- Specialized audit table for financial calculations
CREATE TABLE IF NOT EXISTS audit_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Calculation Context
    calculation_type VARCHAR(50) NOT NULL CHECK (calculation_type IN (
        'OWNERSHIP_PERCENTAGE',
        'DILUTION_ANALYSIS',
        'WATERFALL_DISTRIBUTION',
        'VESTING_CALCULATION',
        'VALUATION_409A',
        'OPTION_PRICING',
        'TAX_CALCULATION'
    )),
    
    -- Related entities
    company_id UUID NOT NULL REFERENCES companies(id),
    triggered_by_entity_type VARCHAR(50),
    triggered_by_entity_id UUID,
    
    -- Input data
    input_parameters JSONB NOT NULL,
    input_data_hash VARCHAR(256), -- SHA-256 of input data
    
    -- Results
    output_results JSONB NOT NULL,
    calculation_method VARCHAR(100),
    
    -- Validation
    validation_status VARCHAR(20) DEFAULT 'VALID' CHECK (validation_status IN (
        'VALID',
        'WARNING',
        'ERROR',
        'NEEDS_REVIEW'
    )),
    validation_messages TEXT[],
    
    -- Performance metrics
    execution_time_ms INTEGER,
    memory_usage_mb INTEGER,
    
    -- User context
    calculated_by UUID REFERENCES users(id),
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Compliance
    regulatory_framework VARCHAR(50), -- e.g., 'IRS_409A', 'ASC_718'
    calculation_version VARCHAR(20),
    
    -- Audit trail
    previous_calculation_id UUID REFERENCES audit_calculations(id),
    superseded_at TIMESTAMP WITH TIME ZONE
);

-- Document and file audit trail
CREATE TABLE IF NOT EXISTS audit_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Document identification
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'VALUATION_REPORT',
        'BOARD_RESOLUTION',
        'LEGAL_OPINION',
        'FINANCIAL_STATEMENT',
        'CAP_TABLE_EXPORT',
        'WATERFALL_REPORT',
        'OPTION_AGREEMENT',
        'INVESTMENT_AGREEMENT'
    )),
    
    -- File information
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash VARCHAR(256) NOT NULL, -- SHA-256
    mime_type VARCHAR(100),
    
    -- Related entity
    company_id UUID NOT NULL REFERENCES companies(id),
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    
    -- Access control
    classification_level VARCHAR(20) DEFAULT 'CONFIDENTIAL',
    access_permissions JSONB,
    
    -- Lifecycle
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    accessed_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_by UUID REFERENCES users(id),
    
    -- Retention and compliance
    retention_period_years INTEGER DEFAULT 7,
    legal_hold BOOLEAN DEFAULT false,
    destruction_date DATE,
    
    -- Version control
    version INTEGER DEFAULT 1,
    supersedes_document_id UUID REFERENCES audit_documents(id),
    
    -- Digital signature support
    digital_signature TEXT,
    signature_valid BOOLEAN,
    signed_by VARCHAR(255),
    signed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- 409A Valuations indexes
CREATE INDEX IF NOT EXISTS idx_valuations_409a_company_date 
    ON valuations_409a(company_id, valuation_date DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_valuations_409a_effective_period 
    ON valuations_409a(company_id, effective_period_start, effective_period_end) 
    WHERE deleted_at IS NULL AND status = 'FINAL';

CREATE INDEX IF NOT EXISTS idx_valuations_409a_status 
    ON valuations_409a(company_id, status, updated_at DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_valuation_share_classes_lookup 
    ON valuation_share_classes(valuation_409a_id, share_class_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_company_time 
    ON audit_log(company_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
    ON audit_log(entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_activity 
    ON audit_log(user_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_compliance 
    ON audit_log(data_classification, occurred_at) 
    WHERE data_classification IN ('CONFIDENTIAL', 'RESTRICTED');

-- Calculation audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_calculations_company 
    ON audit_calculations(company_id, calculation_type, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_calculations_entity 
    ON audit_calculations(triggered_by_entity_type, triggered_by_entity_id, calculated_at DESC);

-- Document audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_documents_company 
    ON audit_documents(company_id, document_type, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_documents_entity 
    ON audit_documents(related_entity_type, related_entity_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_documents_retention 
    ON audit_documents(destruction_date, legal_hold) 
    WHERE destruction_date IS NOT NULL;

-- ============================================
-- Triggers for Automatic Audit Trail
-- ============================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log_entry()
RETURNS TRIGGER AS $$
DECLARE
    event_type_val VARCHAR(50);
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Determine event type
    IF TG_OP = 'INSERT' THEN
        event_type_val := 'CREATE';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        event_type_val := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        event_type_val := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;
    
    -- Insert audit log entry
    INSERT INTO audit_log (
        event_type,
        entity_type,
        entity_id,
        company_id,
        user_id,
        old_value,
        new_value,
        occurred_at
    ) VALUES (
        event_type_val,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.company_id, OLD.company_id),
        COALESCE(NEW.updated_by, NEW.created_by, OLD.updated_by, OLD.created_by),
        old_data,
        new_data,
        now()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_valuations_409a
    AFTER INSERT OR UPDATE OR DELETE ON valuations_409a
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_valuation_share_classes
    AFTER INSERT OR UPDATE OR DELETE ON valuation_share_classes
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_stakeholders
    AFTER INSERT OR UPDATE OR DELETE ON stakeholders
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_securities
    AFTER INSERT OR UPDATE OR DELETE ON securities
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_vesting_schedules
    AFTER INSERT OR UPDATE OR DELETE ON vesting_schedules
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

-- ============================================
-- Views for Common Queries
-- ============================================

-- Current effective 409A valuations
CREATE OR REPLACE VIEW current_409a_valuations AS
SELECT 
    v.*,
    c.name as company_name,
    u1.email as created_by_email,
    u2.email as updated_by_email
FROM valuations_409a v
JOIN companies c ON v.company_id = c.id
LEFT JOIN users u1 ON v.created_by = u1.id
LEFT JOIN users u2 ON v.updated_by = u2.id
WHERE v.deleted_at IS NULL 
    AND v.status = 'FINAL'
    AND v.effective_period_start <= CURRENT_DATE
    AND (v.effective_period_end IS NULL OR v.effective_period_end >= CURRENT_DATE);

-- Recent audit activity summary
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT 
    DATE_TRUNC('day', occurred_at) as activity_date,
    entity_type,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT entity_id) as unique_entities
FROM audit_log 
WHERE occurred_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', occurred_at), entity_type, event_type
ORDER BY activity_date DESC, event_count DESC;

-- Document retention schedule
CREATE OR REPLACE VIEW document_retention_schedule AS
SELECT 
    document_type,
    COUNT(*) as document_count,
    COUNT(*) FILTER (WHERE legal_hold = true) as legal_hold_count,
    COUNT(*) FILTER (WHERE destruction_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
    MIN(destruction_date) as next_destruction_date,
    AVG(file_size) as avg_file_size_bytes
FROM audit_documents
WHERE destruction_date IS NOT NULL
GROUP BY document_type
ORDER BY next_destruction_date;

-- ============================================
-- Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE valuations_409a ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_share_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_documents ENABLE ROW LEVEL SECURITY;

-- Company-based access policies
CREATE POLICY valuations_company_access ON valuations_409a
    USING (company_id IN (
        SELECT company_id FROM user_company_access 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY audit_company_access ON audit_log
    USING (company_id IN (
        SELECT company_id FROM user_company_access 
        WHERE user_id = auth.uid()
    ));

-- ============================================
-- Comments and Documentation
-- ============================================

COMMENT ON TABLE valuations_409a IS 'IRS Section 409A compliant fair market value determinations';
COMMENT ON TABLE valuation_share_classes IS 'Per-share class valuations within a 409A report';
COMMENT ON TABLE valuation_assumptions IS 'Detailed assumptions and methodologies used in valuations';
COMMENT ON TABLE valuation_scenarios IS 'Scenario analysis and probability weightings';
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE audit_calculations IS 'Detailed logging of all financial calculations';
COMMENT ON TABLE audit_documents IS 'File and document access audit trail with retention management';

COMMENT ON COLUMN valuations_409a.fair_market_value_per_share IS 'FMV per share in cents for precision';
COMMENT ON COLUMN valuations_409a.safe_harbor_qualified IS 'Meets IRS safe harbor provisions';
COMMENT ON COLUMN valuations_409a.presumption_of_reasonableness IS 'Entitled to presumption of reasonableness';
COMMENT ON COLUMN audit_log.retention_period_years IS 'Legal retention requirement in years';
COMMENT ON COLUMN audit_documents.legal_hold IS 'Document under legal hold, cannot be destroyed';