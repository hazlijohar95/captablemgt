-- Performance Optimization Indexes for Large Cap Tables
-- Designed to handle 1000+ stakeholders efficiently
-- Run this migration to optimize query performance

-- ============================================
-- Core Table Indexes
-- ============================================

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status) WHERE deleted_at IS NULL;

-- Stakeholders table indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_stakeholders_company_id ON stakeholders(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholders_type ON stakeholders(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholders_company_type ON stakeholders(company_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholders_entity_name ON stakeholders(entity_name) WHERE entity_name IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholders_created_at ON stakeholders(company_id, created_at DESC) WHERE deleted_at IS NULL;

-- People table indexes (for stakeholder lookups)
CREATE INDEX IF NOT EXISTS idx_people_stakeholder_id ON people(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_people_name_search ON people(name varchar_pattern_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email) WHERE deleted_at IS NULL;

-- Securities table indexes (most queried table)
CREATE INDEX IF NOT EXISTS idx_securities_stakeholder_id ON securities(stakeholder_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_securities_type ON securities(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_securities_status ON securities(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_securities_issue_date ON securities(issue_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_securities_stakeholder_type ON securities(stakeholder_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_securities_stakeholder_status ON securities(stakeholder_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_securities_date_range ON securities(issue_date, expiration_date) WHERE deleted_at IS NULL;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_securities_filters ON securities(stakeholder_id, type, status, issue_date DESC) 
    WHERE deleted_at IS NULL;

-- Share classes table indexes
CREATE INDEX IF NOT EXISTS idx_share_classes_company_id ON share_classes(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_share_classes_name ON share_classes(company_id, name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_share_classes_seniority ON share_classes(company_id, seniority_rank) WHERE deleted_at IS NULL;

-- Vesting schedules table indexes
CREATE INDEX IF NOT EXISTS idx_vesting_schedules_security_id ON vesting_schedules(security_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vesting_schedules_commencement ON vesting_schedules(commencement_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vesting_schedules_cliff ON vesting_schedules(cliff_date) WHERE deleted_at IS NULL AND cliff_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vesting_schedules_status ON vesting_schedules(security_id, commencement_date, cliff_date) 
    WHERE deleted_at IS NULL;

-- Transactions table indexes (for audit trail)
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_stakeholder ON transactions(stakeholder_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_security ON transactions(security_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type) WHERE deleted_at IS NULL;

-- Audit log table indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);

-- ============================================
-- Specialized Indexes for Complex Queries
-- ============================================

-- For cap table calculations (ownership percentages)
CREATE INDEX IF NOT EXISTS idx_securities_ownership_calc ON securities(stakeholder_id, shares, type) 
    WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- For vesting calculations
CREATE INDEX IF NOT EXISTS idx_vesting_active ON vesting_schedules(security_id, commencement_date, total_shares) 
    WHERE deleted_at IS NULL;

-- For waterfall analysis
CREATE INDEX IF NOT EXISTS idx_securities_liquidation ON securities(stakeholder_id, type, shares) 
    WHERE status IN ('ACTIVE', 'VESTED') AND deleted_at IS NULL;

-- For dilution calculations
CREATE INDEX IF NOT EXISTS idx_securities_dilution ON securities(issue_date, shares, type) 
    WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- ============================================
-- Full-Text Search Indexes
-- ============================================

-- Create GIN indexes for full-text search on names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_people_name_trgm ON people USING gin (name gin_trgm_ops) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stakeholders_entity_trgm ON stakeholders USING gin (entity_name gin_trgm_ops) 
    WHERE entity_name IS NOT NULL AND deleted_at IS NULL;

-- ============================================
-- Partial Indexes for Common Queries
-- ============================================

-- Active securities only (most common filter)
CREATE INDEX IF NOT EXISTS idx_securities_active ON securities(stakeholder_id, type, shares) 
    WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Cancelled securities (for historical queries)
CREATE INDEX IF NOT EXISTS idx_securities_cancelled ON securities(stakeholder_id, cancelled_at DESC) 
    WHERE status = 'CANCELLED' AND deleted_at IS NULL;

-- Employee securities (for option pool calculations)
CREATE INDEX IF NOT EXISTS idx_securities_employees ON securities(stakeholder_id, type, shares, issue_date) 
    WHERE type IN ('STOCK_OPTION', 'RSU') AND deleted_at IS NULL;

-- Investor securities (for investor reports)
CREATE INDEX IF NOT EXISTS idx_securities_investors ON securities(stakeholder_id, type, shares, issue_date) 
    WHERE type IN ('COMMON_STOCK', 'PREFERRED_STOCK') AND deleted_at IS NULL;

-- ============================================
-- Statistics Update for Query Planner
-- ============================================

-- Update statistics for better query planning
ANALYZE companies;
ANALYZE stakeholders;
ANALYZE people;
ANALYZE securities;
ANALYZE share_classes;
ANALYZE vesting_schedules;
ANALYZE transactions;
ANALYZE audit_log;

-- ============================================
-- Performance Monitoring Views
-- ============================================

-- Create a view for monitoring index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Create a view for monitoring slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries averaging over 100ms
ORDER BY mean_time DESC
LIMIT 50;

-- ============================================
-- Maintenance Commands (Run Periodically)
-- ============================================

-- VACUUM and REINDEX commands for maintenance (commented out, run manually)
-- VACUUM ANALYZE securities;
-- VACUUM ANALYZE stakeholders;
-- VACUUM ANALYZE vesting_schedules;
-- REINDEX TABLE securities;
-- REINDEX TABLE stakeholders;

COMMENT ON INDEX idx_securities_filters IS 'Composite index for common security filtering patterns';
COMMENT ON INDEX idx_securities_ownership_calc IS 'Optimized for ownership percentage calculations';
COMMENT ON INDEX idx_securities_liquidation IS 'Optimized for waterfall and liquidation analysis';
COMMENT ON INDEX idx_people_name_trgm IS 'Full-text search index for people names using trigrams';