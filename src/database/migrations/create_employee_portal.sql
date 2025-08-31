-- Employee Self-Service Portal Database Schema
-- Secure employee access to equity information with proper RLS

-- ============================================
-- Employee Portal Configuration
-- ============================================

-- Enhanced people table for employee portal access
ALTER TABLE people ADD COLUMN IF NOT EXISTS employee_portal_enabled BOOLEAN DEFAULT false;
ALTER TABLE people ADD COLUMN IF NOT EXISTS portal_invitation_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS portal_first_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS portal_last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS portal_login_count INTEGER DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50); -- Company employee ID
ALTER TABLE people ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE people ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE people ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES people(id);

-- Employee portal preferences
CREATE TABLE IF NOT EXISTS employee_portal_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    vesting_reminders BOOLEAN DEFAULT true,
    equity_updates BOOLEAN DEFAULT true,
    document_notifications BOOLEAN DEFAULT true,
    
    -- Display preferences
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    show_tax_estimates BOOLEAN DEFAULT true,
    show_exercise_costs BOOLEAN DEFAULT true,
    dashboard_layout JSONB DEFAULT '{"sections": ["equity_summary", "vesting_timeline", "documents"]}',
    
    -- Privacy settings
    allow_equity_sharing BOOLEAN DEFAULT false,
    data_export_requested BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_portal_preferences UNIQUE (person_id, company_id)
);

-- Employee equity summary view (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS employee_equity_summary AS
SELECT 
    p.id as person_id,
    p.company_id,
    p.name as employee_name,
    p.email,
    p.employee_id,
    p.hire_date,
    p.department,
    p.job_title,
    
    -- Equity holdings aggregation
    COALESCE(SUM(CASE 
        WHEN s.type = 'COMMON_STOCK' AND s.status = 'ISSUED' 
        THEN s.quantity 
        ELSE 0 
    END), 0) as common_shares_owned,
    
    COALESCE(SUM(CASE 
        WHEN s.type IN ('STOCK_OPTION', 'ISO', 'NSO') AND s.status = 'GRANTED'
        THEN s.quantity 
        ELSE 0 
    END), 0) as options_granted,
    
    COALESCE(SUM(CASE 
        WHEN s.type IN ('STOCK_OPTION', 'ISO', 'NSO') AND s.status = 'EXERCISED'
        THEN s.quantity 
        ELSE 0 
    END), 0) as options_exercised,
    
    -- Vesting information
    COALESCE(SUM(CASE 
        WHEN vs.status = 'ACTIVE' AND vs.vesting_type IN ('TIME_BASED', 'MILESTONE_BASED')
        THEN COALESCE(vs.vested_shares, 0)
        ELSE 0 
    END), 0) as total_vested_shares,
    
    COALESCE(SUM(CASE 
        WHEN vs.status = 'ACTIVE' AND vs.vesting_type IN ('TIME_BASED', 'MILESTONE_BASED')
        THEN vs.total_shares - COALESCE(vs.vested_shares, 0)
        ELSE 0 
    END), 0) as total_unvested_shares,
    
    -- Valuation data (most recent 409A)
    (SELECT fmv.fair_market_value_per_share 
     FROM fair_market_valuations fmv 
     WHERE fmv.company_id = p.company_id 
       AND fmv.valuation_date <= CURRENT_DATE 
       AND fmv.status = 'APPROVED'
     ORDER BY fmv.valuation_date DESC 
     LIMIT 1) as current_fmv_per_share,
    
    -- Exercise costs
    COALESCE(SUM(CASE 
        WHEN s.type IN ('STOCK_OPTION', 'ISO', 'NSO') AND s.status = 'GRANTED'
           AND vs.status = 'ACTIVE' AND COALESCE(vs.vested_shares, 0) > 0
        THEN COALESCE(vs.vested_shares, 0) * COALESCE(s.strike_price, 0)
        ELSE 0 
    END), 0) as total_exercise_cost,
    
    -- Last updated
    NOW() as summary_updated_at

FROM people p
LEFT JOIN securities s ON s.stakeholder_id = p.id 
LEFT JOIN vesting_schedules vs ON vs.security_id = s.id
WHERE p.employee_portal_enabled = true
  AND p.type = 'EMPLOYEE'
GROUP BY p.id, p.company_id, p.name, p.email, p.employee_id, 
         p.hire_date, p.department, p.job_title;

-- Create index for fast employee lookups
CREATE INDEX IF NOT EXISTS idx_employee_equity_summary_person_company 
    ON employee_equity_summary(person_id, company_id);

-- Employee document access tracking
CREATE TABLE IF NOT EXISTS employee_document_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_id UUID NOT NULL, -- References documents table
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'EQUITY_GRANT_LETTER',
        'OPTION_AGREEMENT',
        'EXERCISE_FORM',
        'TAX_DOCUMENT',
        'COMPANY_VALUATION',
        'BOARD_RESOLUTION',
        'OTHER'
    )),
    access_granted_by UUID REFERENCES auth.users(id),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_method VARCHAR(20) DEFAULT 'PORTAL' CHECK (access_method IN ('PORTAL', 'EMAIL', 'DOWNLOAD')),
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_person_document_access UNIQUE (person_id, document_id, accessed_at)
);

-- Employee portal activity log
CREATE TABLE IF NOT EXISTS employee_portal_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'LOGIN',
        'LOGOUT',
        'VIEW_EQUITY_SUMMARY',
        'VIEW_VESTING_SCHEDULE',
        'DOWNLOAD_DOCUMENT',
        'UPDATE_PROFILE',
        'EXPORT_DATA',
        'VIEW_EXERCISE_CALCULATOR'
    )),
    
    activity_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_employee_portal_preferences_person 
    ON employee_portal_preferences(person_id);
CREATE INDEX IF NOT EXISTS idx_employee_document_access_person_date 
    ON employee_document_access(person_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_portal_activity_person_date 
    ON employee_portal_activity(person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_employee_portal_enabled 
    ON people(company_id, employee_portal_enabled) 
    WHERE employee_portal_enabled = true;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE employee_portal_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_document_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_portal_activity ENABLE ROW LEVEL SECURITY;

-- Employee can only access their own portal data
CREATE POLICY "Employees can view own portal preferences" ON employee_portal_preferences
    FOR SELECT USING (
        person_id IN (
            SELECT id FROM people 
            WHERE auth.uid()::text = ANY(auth_user_ids) 
               OR auth.email() = email
        )
    );

CREATE POLICY "Employees can update own portal preferences" ON employee_portal_preferences
    FOR UPDATE USING (
        person_id IN (
            SELECT id FROM people 
            WHERE auth.uid()::text = ANY(auth_user_ids) 
               OR auth.email() = email
        )
    );

-- Employee document access policies
CREATE POLICY "Employees can view own document access" ON employee_document_access
    FOR SELECT USING (
        person_id IN (
            SELECT id FROM people 
            WHERE auth.uid()::text = ANY(auth_user_ids) 
               OR auth.email() = email
        )
    );

-- Admin/legal can view all employee portal activity for their company
CREATE POLICY "Company admins can view employee portal activity" ON employee_portal_activity
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() 
              AND role IN ('ADMIN', 'LEGAL', 'FINANCE')
        )
    );

-- Employees can view their own activity
CREATE POLICY "Employees can view own portal activity" ON employee_portal_activity
    FOR SELECT USING (
        person_id IN (
            SELECT id FROM people 
            WHERE auth.uid()::text = ANY(auth_user_ids) 
               OR auth.email() = email
        )
    );

-- ============================================
-- Utility Functions
-- ============================================

-- Function to refresh employee equity summary
CREATE OR REPLACE FUNCTION refresh_employee_equity_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY employee_equity_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track employee portal activity
CREATE OR REPLACE FUNCTION log_employee_portal_activity(
    p_person_id UUID,
    p_company_id UUID,
    p_activity_type VARCHAR(50),
    p_activity_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO employee_portal_activity (
        person_id, company_id, activity_type, activity_details,
        ip_address, user_agent, session_id
    ) VALUES (
        p_person_id, p_company_id, p_activity_type, p_activity_details,
        p_ip_address, p_user_agent, p_session_id
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate employee equity value
CREATE OR REPLACE FUNCTION calculate_employee_equity_value(p_person_id UUID)
RETURNS JSONB AS $$
DECLARE
    equity_data JSONB;
    current_fmv DECIMAL;
    result JSONB;
BEGIN
    -- Get current fair market value
    SELECT fair_market_value_per_share INTO current_fmv
    FROM fair_market_valuations fmv
    JOIN people p ON p.company_id = fmv.company_id
    WHERE p.id = p_person_id
      AND fmv.status = 'APPROVED'
      AND fmv.valuation_date <= CURRENT_DATE
    ORDER BY fmv.valuation_date DESC
    LIMIT 1;
    
    -- Calculate equity value
    SELECT jsonb_build_object(
        'common_shares_value', (common_shares_owned * COALESCE(current_fmv, 0)),
        'vested_options_value', (total_vested_shares * COALESCE(current_fmv, 0)) - total_exercise_cost,
        'unvested_options_potential_value', (total_unvested_shares * COALESCE(current_fmv, 0)),
        'total_current_value', (common_shares_owned * COALESCE(current_fmv, 0)) + 
                              GREATEST((total_vested_shares * COALESCE(current_fmv, 0)) - total_exercise_cost, 0),
        'total_potential_value', ((common_shares_owned + total_vested_shares + total_unvested_shares) * COALESCE(current_fmv, 0)) - total_exercise_cost,
        'exercise_cost', total_exercise_cost,
        'fmv_per_share', COALESCE(current_fmv, 0),
        'last_updated', NOW()
    ) INTO result
    FROM employee_equity_summary
    WHERE person_id = p_person_id;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update equity summary when relevant data changes
CREATE OR REPLACE FUNCTION trigger_refresh_employee_equity_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh in background (non-blocking)
    PERFORM pg_notify('refresh_employee_equity', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic summary refresh
DROP TRIGGER IF EXISTS refresh_employee_equity_on_securities_change ON securities;
CREATE TRIGGER refresh_employee_equity_on_securities_change
    AFTER INSERT OR UPDATE OR DELETE ON securities
    FOR EACH ROW EXECUTE FUNCTION trigger_refresh_employee_equity_summary();

DROP TRIGGER IF EXISTS refresh_employee_equity_on_vesting_change ON vesting_schedules;
CREATE TRIGGER refresh_employee_equity_on_vesting_change
    AFTER INSERT OR UPDATE OR DELETE ON vesting_schedules
    FOR EACH ROW EXECUTE FUNCTION trigger_refresh_employee_equity_summary();

-- Initial refresh of the materialized view
SELECT refresh_employee_equity_summary();

-- Grant necessary permissions
GRANT SELECT ON employee_equity_summary TO authenticated;
GRANT ALL ON employee_portal_preferences TO authenticated;
GRANT ALL ON employee_document_access TO authenticated;
GRANT ALL ON employee_portal_activity TO authenticated;