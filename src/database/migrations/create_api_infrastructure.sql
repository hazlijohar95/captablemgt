-- API Integration Infrastructure
-- Comprehensive system for API keys, rate limiting, webhooks, and audit logging

-- ============================================
-- API Key Management
-- ============================================

-- API keys table for authentication and authorization
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Key identification
    key_id VARCHAR(32) NOT NULL UNIQUE, -- Public key identifier (e.g., ak_live_abc123...)
    key_hash VARCHAR(255) NOT NULL, -- Hashed secret key
    name VARCHAR(100) NOT NULL, -- Human-readable name for the key
    description TEXT,
    
    -- Environment and permissions
    environment VARCHAR(20) NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox', 'production')),
    scopes JSONB NOT NULL DEFAULT '["read"]', -- Array of permitted scopes
    permissions JSONB NOT NULL DEFAULT '{}', -- Detailed permissions object
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    usage_count BIGINT DEFAULT 0,
    
    -- Rate limiting
    rate_limit_tier VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (rate_limit_tier IN ('standard', 'premium', 'enterprise')),
    custom_rate_limit INTEGER, -- Custom requests per hour if set
    
    -- Status and lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    revoked_reason TEXT,
    
    -- Indexes
    CONSTRAINT unique_company_key_name UNIQUE (company_id, name)
);

-- API scopes definition table
CREATE TABLE IF NOT EXISTS api_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL, -- 'read', 'write', 'admin', 'webhook'
    resource_pattern VARCHAR(100), -- e.g., 'companies:*', 'companies:{company_id}:stakeholders'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default API scopes
INSERT INTO api_scopes (scope, name, description, category, resource_pattern) VALUES
-- Read scopes
('companies:read', 'Read Companies', 'Read access to company information and cap table data', 'read', 'companies:*'),
('stakeholders:read', 'Read Stakeholders', 'Read access to stakeholder information', 'read', 'companies:*:stakeholders'),
('securities:read', 'Read Securities', 'Read access to securities and holdings', 'read', 'companies:*:securities'),
('transactions:read', 'Read Transactions', 'Read access to transaction history', 'read', 'companies:*:transactions'),
('reports:read', 'Read Reports', 'Access to generate and download reports', 'read', 'companies:*:reports'),
('valuations:read', 'Read Valuations', 'Read access to company valuations', 'read', 'companies:*:valuations'),

-- Write scopes  
('companies:write', 'Write Companies', 'Create and update company information', 'write', 'companies:*'),
('stakeholders:write', 'Write Stakeholders', 'Create and update stakeholders', 'write', 'companies:*:stakeholders'),
('securities:write', 'Write Securities', 'Issue and manage securities', 'write', 'companies:*:securities'),
('transactions:write', 'Write Transactions', 'Create equity transactions', 'write', 'companies:*:transactions'),
('valuations:write', 'Write Valuations', 'Create company valuations', 'write', 'companies:*:valuations'),

-- Admin scopes
('api_keys:manage', 'Manage API Keys', 'Create and manage API keys', 'admin', 'api_keys'),
('webhooks:manage', 'Manage Webhooks', 'Create and manage webhook endpoints', 'admin', 'webhooks'),

-- Webhook scopes
('webhooks:receive', 'Receive Webhooks', 'Receive webhook notifications', 'webhook', 'webhooks')
ON CONFLICT (scope) DO NOTHING;

-- ============================================
-- Rate Limiting Infrastructure
-- ============================================

-- Rate limit configurations per tier
CREATE TABLE IF NOT EXISTS rate_limit_tiers (
    tier VARCHAR(20) PRIMARY KEY,
    requests_per_hour INTEGER NOT NULL,
    burst_limit INTEGER NOT NULL, -- Burst allowance for short periods
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default rate limit tiers
INSERT INTO rate_limit_tiers (tier, requests_per_hour, burst_limit, description) VALUES
('standard', 1000, 100, 'Standard tier: 1,000 requests per hour with burst of 100'),
('premium', 5000, 500, 'Premium tier: 5,000 requests per hour with burst of 500'),
('enterprise', 10000, 1000, 'Enterprise tier: 10,000 requests per hour with burst of 1,000')
ON CONFLICT (tier) DO UPDATE SET
    requests_per_hour = EXCLUDED.requests_per_hour,
    burst_limit = EXCLUDED.burst_limit,
    updated_at = NOW();

-- Rate limiting tracking (using Redis in production, PostgreSQL for development)
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Time windows
    hour_window TIMESTAMP WITH TIME ZONE NOT NULL,
    minute_window TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Request counts
    requests_in_hour INTEGER DEFAULT 0,
    requests_in_minute INTEGER DEFAULT 0,
    
    -- Last request info
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_request_ip INET,
    last_request_endpoint VARCHAR(200),
    
    -- Performance tracking
    avg_response_time_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for efficient upserts
    CONSTRAINT unique_api_key_hour_minute UNIQUE (api_key_id, hour_window, minute_window)
);

-- ============================================
-- API Request Logging and Audit Trail
-- ============================================

-- Comprehensive API request logging
CREATE TABLE IF NOT EXISTS api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    
    -- Request details
    request_id VARCHAR(50) NOT NULL UNIQUE, -- Unique request identifier
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    path_params JSONB DEFAULT '{}',
    query_params JSONB DEFAULT '{}',
    headers JSONB DEFAULT '{}', -- Selected headers only (no sensitive data)
    
    -- Request body (for POST/PUT requests, truncated if large)
    request_body JSONB,
    request_size_bytes INTEGER DEFAULT 0,
    
    -- Response details
    status_code INTEGER NOT NULL,
    response_body JSONB, -- Sample response or error details
    response_size_bytes INTEGER DEFAULT 0,
    response_time_ms INTEGER NOT NULL,
    
    -- Client information
    ip_address INET NOT NULL,
    user_agent TEXT,
    referer TEXT,
    
    -- Geographic and network info
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    isp VARCHAR(200),
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    error_details JSONB,
    
    -- Rate limiting info
    rate_limit_hit BOOLEAN DEFAULT FALSE,
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Partitioning helper
    created_date DATE GENERATED ALWAYS AS (created_at::date) STORED
);

-- Partition API request logs by month for performance
-- Note: This would be done programmatically in production
-- CREATE TABLE api_request_logs_y2024m01 PARTITION OF api_request_logs
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ============================================
-- Webhook Infrastructure
-- ============================================

-- Webhook endpoint configurations
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Endpoint configuration
    name VARCHAR(100) NOT NULL,
    description TEXT,
    url TEXT NOT NULL, -- Target webhook URL
    secret VARCHAR(255) NOT NULL, -- For signature verification
    
    -- Event configuration
    events TEXT[] NOT NULL DEFAULT '{}', -- Array of subscribed events
    event_filters JSONB DEFAULT '{}', -- Additional filtering conditions
    
    -- Delivery configuration
    active BOOLEAN DEFAULT TRUE,
    retry_policy JSONB DEFAULT '{
        "max_retries": 3,
        "retry_delays": [1, 5, 15],
        "retry_on_statuses": [500, 502, 503, 504, 408, 429]
    }',
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Headers and authentication
    custom_headers JSONB DEFAULT '{}',
    auth_type VARCHAR(20) DEFAULT 'signature' CHECK (auth_type IN ('signature', 'bearer', 'basic', 'none')),
    auth_config JSONB DEFAULT '{}',
    
    -- Status and statistics
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    last_successful_delivery_at TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER DEFAULT 0,
    total_deliveries BIGINT DEFAULT 0,
    successful_deliveries BIGINT DEFAULT 0,
    
    -- Lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disabled_at TIMESTAMP WITH TIME ZONE,
    disabled_reason TEXT,
    
    CONSTRAINT unique_company_webhook_name UNIQUE (company_id, name)
);

-- Webhook delivery attempts and logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    
    -- Event information
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    event_id VARCHAR(50) NOT NULL, -- Unique event identifier
    
    -- Delivery attempt
    attempt_number INTEGER NOT NULL DEFAULT 1,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (delivery_status IN ('pending', 'success', 'failed', 'retrying')),
    
    -- HTTP details
    request_headers JSONB DEFAULT '{}',
    request_body JSONB NOT NULL,
    response_status INTEGER,
    response_headers JSONB DEFAULT '{}',
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Error tracking
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Partitioning helper
    created_date DATE GENERATED ALWAYS AS (created_at::date) STORED
);

-- Webhook events catalog
CREATE TABLE IF NOT EXISTS webhook_events (
    event_type VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL, -- 'company', 'stakeholder', 'security', 'transaction', 'report'
    payload_schema JSONB NOT NULL, -- JSON schema for the event payload
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default webhook events
INSERT INTO webhook_events (event_type, name, description, category, payload_schema) VALUES
-- Company events
('company.created', 'Company Created', 'Triggered when a new company is created', 'company', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "name": {"type": "string"},
        "jurisdiction": {"type": "string"},
        "created_at": {"type": "string", "format": "date-time"}
    }
}'),
('company.updated', 'Company Updated', 'Triggered when company information is updated', 'company', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "changes": {"type": "object"},
        "updated_at": {"type": "string", "format": "date-time"}
    }
}'),

-- Stakeholder events
('stakeholder.created', 'Stakeholder Created', 'Triggered when a new stakeholder is added', 'stakeholder', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "stakeholder_id": {"type": "string", "format": "uuid"},
        "name": {"type": "string"},
        "type": {"type": "string"},
        "created_at": {"type": "string", "format": "date-time"}
    }
}'),
('stakeholder.updated', 'Stakeholder Updated', 'Triggered when stakeholder information is updated', 'stakeholder', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "stakeholder_id": {"type": "string", "format": "uuid"},
        "changes": {"type": "object"},
        "updated_at": {"type": "string", "format": "date-time"}
    }
}'),

-- Security events
('security.issued', 'Security Issued', 'Triggered when new shares or options are issued', 'security', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "security_id": {"type": "string", "format": "uuid"},
        "stakeholder_id": {"type": "string", "format": "uuid"},
        "type": {"type": "string"},
        "quantity": {"type": "integer"},
        "issued_at": {"type": "string", "format": "date-time"}
    }
}'),
('security.exercised', 'Security Exercised', 'Triggered when options are exercised', 'security', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "security_id": {"type": "string", "format": "uuid"},
        "stakeholder_id": {"type": "string", "format": "uuid"},
        "quantity": {"type": "integer"},
        "exercise_price": {"type": "number"},
        "exercised_at": {"type": "string", "format": "date-time"}
    }
}'),

-- Transaction events
('transaction.created', 'Transaction Created', 'Triggered when a new transaction is recorded', 'transaction', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "transaction_id": {"type": "string", "format": "uuid"},
        "type": {"type": "string"},
        "stakeholder_id": {"type": "string", "format": "uuid"},
        "amount": {"type": "number"},
        "created_at": {"type": "string", "format": "date-time"}
    }
}'),

-- Valuation events
('valuation.created', 'Valuation Created', 'Triggered when a new valuation is recorded', 'valuation', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "valuation_id": {"type": "string", "format": "uuid"},
        "type": {"type": "string"},
        "price_per_share": {"type": "number"},
        "total_value": {"type": "number"},
        "created_at": {"type": "string", "format": "date-time"}
    }
}'),

-- Report events
('report.generated', 'Report Generated', 'Triggered when a report generation is completed', 'report', '{
    "type": "object",
    "properties": {
        "company_id": {"type": "string", "format": "uuid"},
        "report_id": {"type": "string", "format": "uuid"},
        "type": {"type": "string"},
        "format": {"type": "string"},
        "download_url": {"type": "string", "format": "uri"},
        "generated_at": {"type": "string", "format": "date-time"}
    }
}')
ON CONFLICT (event_type) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- API Performance and Monitoring
-- ============================================

-- API endpoint performance metrics
CREATE TABLE IF NOT EXISTS api_endpoint_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern VARCHAR(200) NOT NULL, -- e.g., '/companies/{id}/stakeholders'
    method VARCHAR(10) NOT NULL,
    
    -- Time window
    metric_date DATE NOT NULL,
    metric_hour INTEGER NOT NULL CHECK (metric_hour >= 0 AND metric_hour <= 23),
    
    -- Request metrics
    total_requests BIGINT DEFAULT 0,
    successful_requests BIGINT DEFAULT 0,
    failed_requests BIGINT DEFAULT 0,
    rate_limited_requests BIGINT DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms INTEGER DEFAULT 0,
    p50_response_time_ms INTEGER DEFAULT 0,
    p95_response_time_ms INTEGER DEFAULT 0,
    p99_response_time_ms INTEGER DEFAULT 0,
    min_response_time_ms INTEGER DEFAULT 0,
    max_response_time_ms INTEGER DEFAULT 0,
    
    -- Error tracking
    error_rate DECIMAL(5,4) DEFAULT 0.0000, -- Percentage
    top_errors JSONB DEFAULT '{}', -- Most common error codes and counts
    
    -- Data transfer
    avg_request_size_bytes INTEGER DEFAULT 0,
    avg_response_size_bytes INTEGER DEFAULT 0,
    total_bytes_transferred BIGINT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_endpoint_metric_hour UNIQUE (endpoint_pattern, method, metric_date, metric_hour)
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_company_status ON api_keys(company_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_environment ON api_keys(environment);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC) WHERE last_used_at IS NOT NULL;

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_window ON api_rate_limits(api_key_id, hour_window, minute_window);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_cleanup ON api_rate_limits(hour_window) WHERE hour_window < NOW() - INTERVAL '7 days';

-- API request logs indexes (partitioned tables would have their own indexes)
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_created ON api_request_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_company_created ON api_request_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_endpoint_status ON api_request_logs(endpoint, status_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_ip_created ON api_request_logs(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_request_id ON api_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_date ON api_request_logs(created_date) WHERE created_date >= CURRENT_DATE - INTERVAL '30 days';

-- Webhook indexes
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_company_active ON webhook_endpoints(company_id, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_api_key ON webhook_endpoints(api_key_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_status ON webhook_deliveries(webhook_endpoint_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE delivery_status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event_type, created_at DESC);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_api_endpoint_metrics_date_hour ON api_endpoint_metrics(metric_date DESC, metric_hour DESC);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_metrics_endpoint ON api_endpoint_metrics(endpoint_pattern, method, metric_date DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all API infrastructure tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- API keys policies - company users can only see their company's keys
CREATE POLICY "Company users can view their API keys" ON api_keys
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() 
              AND role IN ('ADMIN', 'DEVELOPER')
        )
    );

CREATE POLICY "Company admins can manage API keys" ON api_keys
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() 
              AND role = 'ADMIN'
        )
    );

-- Webhook endpoints policies
CREATE POLICY "Company users can manage their webhooks" ON webhook_endpoints
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() 
              AND role IN ('ADMIN', 'DEVELOPER')
        )
    );

-- API logs policies - company users can view their company's logs
CREATE POLICY "Company users can view their API logs" ON api_request_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() 
              AND role IN ('ADMIN', 'DEVELOPER')
        )
        OR
        api_key_id IN (
            SELECT ak.id FROM api_keys ak
            JOIN company_users cu ON cu.company_id = ak.company_id
            WHERE cu.user_id = auth.uid()
              AND cu.role IN ('ADMIN', 'DEVELOPER')
        )
    );

-- ============================================
-- Utility Functions
-- ============================================

-- Function to generate API key pairs
CREATE OR REPLACE FUNCTION generate_api_key_pair(
    p_company_id UUID,
    p_name VARCHAR(100),
    p_environment VARCHAR(20) DEFAULT 'production',
    p_scopes TEXT[] DEFAULT ARRAY['companies:read'],
    p_rate_limit_tier VARCHAR(20) DEFAULT 'standard'
)
RETURNS TABLE (
    key_id VARCHAR(32),
    secret_key VARCHAR(64)
) AS $$
DECLARE
    v_key_id VARCHAR(32);
    v_secret_key VARCHAR(64);
    v_key_hash VARCHAR(255);
BEGIN
    -- Generate key ID and secret
    v_key_id := CASE 
        WHEN p_environment = 'sandbox' THEN 'ak_test_'
        ELSE 'ak_live_'
    END || encode(gen_random_bytes(12), 'hex');
    
    v_secret_key := encode(gen_random_bytes(32), 'hex');
    v_key_hash := encode(digest(v_secret_key, 'sha256'), 'hex');
    
    -- Insert API key
    INSERT INTO api_keys (
        company_id, key_id, key_hash, name, environment, 
        scopes, rate_limit_tier, created_by
    ) VALUES (
        p_company_id, v_key_id, v_key_hash, p_name, p_environment,
        to_jsonb(p_scopes), p_rate_limit_tier, auth.uid()
    );
    
    RETURN QUERY SELECT v_key_id, v_secret_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate API key and get permissions
CREATE OR REPLACE FUNCTION validate_api_key(p_key_id VARCHAR(32), p_secret_key VARCHAR(64))
RETURNS TABLE (
    api_key_id UUID,
    company_id UUID,
    scopes JSONB,
    rate_limit_tier VARCHAR(20),
    is_valid BOOLEAN
) AS $$
DECLARE
    v_key_hash VARCHAR(255);
    v_record RECORD;
BEGIN
    v_key_hash := encode(digest(p_secret_key, 'sha256'), 'hex');
    
    SELECT ak.id, ak.company_id, ak.scopes, ak.rate_limit_tier,
           (ak.status = 'active' AND (ak.expires_at IS NULL OR ak.expires_at > NOW())) as valid
    INTO v_record
    FROM api_keys ak
    WHERE ak.key_id = p_key_id 
      AND ak.key_hash = v_key_hash;
    
    IF FOUND THEN
        -- Update usage tracking
        UPDATE api_keys 
        SET last_used_at = NOW(), 
            usage_count = usage_count + 1
        WHERE id = v_record.id;
        
        RETURN QUERY SELECT v_record.id, v_record.company_id, v_record.scopes, 
                           v_record.rate_limit_tier, v_record.valid;
    ELSE
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::JSONB, NULL::VARCHAR(20), FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_api_key_id UUID,
    p_endpoint VARCHAR(200),
    p_ip_address INET
)
RETURNS TABLE (
    allowed BOOLEAN,
    remaining INTEGER,
    reset_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_tier_config RECORD;
    v_current_usage RECORD;
    v_hour_window TIMESTAMP WITH TIME ZONE;
    v_minute_window TIMESTAMP WITH TIME ZONE;
BEGIN
    v_hour_window := date_trunc('hour', NOW());
    v_minute_window := date_trunc('minute', NOW());
    
    -- Get rate limit configuration
    SELECT rlt.requests_per_hour, rlt.burst_limit,
           COALESCE(ak.custom_rate_limit, rlt.requests_per_hour) as effective_limit
    INTO v_tier_config
    FROM api_keys ak
    JOIN rate_limit_tiers rlt ON rlt.tier = ak.rate_limit_tier
    WHERE ak.id = p_api_key_id;
    
    -- Get current usage
    SELECT COALESCE(arl.requests_in_hour, 0) as hour_requests,
           COALESCE(arl.requests_in_minute, 0) as minute_requests
    INTO v_current_usage
    FROM api_rate_limits arl
    WHERE arl.api_key_id = p_api_key_id
      AND arl.hour_window = v_hour_window
      AND arl.minute_window = v_minute_window;
    
    -- Check limits
    IF v_current_usage.hour_requests >= v_tier_config.effective_limit THEN
        RETURN QUERY SELECT FALSE, 0, v_hour_window + INTERVAL '1 hour';
    ELSIF v_current_usage.minute_requests >= v_tier_config.burst_limit THEN
        RETURN QUERY SELECT FALSE, 
                           GREATEST(0, v_tier_config.effective_limit - v_current_usage.hour_requests),
                           v_minute_window + INTERVAL '1 minute';
    ELSE
        -- Update usage counters
        INSERT INTO api_rate_limits (
            api_key_id, hour_window, minute_window, 
            requests_in_hour, requests_in_minute,
            last_request_at, last_request_ip, last_request_endpoint
        ) VALUES (
            p_api_key_id, v_hour_window, v_minute_window,
            1, 1, NOW(), p_ip_address, p_endpoint
        ) ON CONFLICT (api_key_id, hour_window, minute_window) DO UPDATE SET
            requests_in_hour = api_rate_limits.requests_in_hour + 1,
            requests_in_minute = CASE 
                WHEN api_rate_limits.minute_window = v_minute_window 
                THEN api_rate_limits.requests_in_minute + 1
                ELSE 1
            END,
            minute_window = v_minute_window,
            last_request_at = NOW(),
            last_request_ip = p_ip_address,
            last_request_endpoint = p_endpoint,
            updated_at = NOW();
        
        RETURN QUERY SELECT TRUE,
                           GREATEST(0, v_tier_config.effective_limit - COALESCE(v_current_usage.hour_requests, 0) - 1),
                           v_hour_window + INTERVAL '1 hour';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue webhook delivery
CREATE OR REPLACE FUNCTION queue_webhook_delivery(
    p_company_id UUID,
    p_event_type VARCHAR(50),
    p_event_data JSONB,
    p_event_id VARCHAR(50) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_event_id VARCHAR(50);
    v_webhook RECORD;
    v_queued_count INTEGER := 0;
BEGIN
    -- Generate event ID if not provided
    v_event_id := COALESCE(p_event_id, 'evt_' || encode(gen_random_bytes(12), 'hex'));
    
    -- Find all active webhooks subscribed to this event
    FOR v_webhook IN
        SELECT we.id, we.url, we.secret, we.retry_policy, we.timeout_seconds
        FROM webhook_endpoints we
        WHERE we.company_id = p_company_id
          AND we.active = TRUE
          AND p_event_type = ANY(we.events)
    LOOP
        -- Queue delivery
        INSERT INTO webhook_deliveries (
            webhook_endpoint_id, event_type, event_data, event_id,
            request_body, scheduled_at
        ) VALUES (
            v_webhook.id, p_event_type, p_event_data, v_event_id,
            jsonb_build_object(
                'event_type', p_event_type,
                'event_id', v_event_id,
                'company_id', p_company_id,
                'data', p_event_data,
                'timestamp', NOW()
            ),
            NOW()
        );
        
        v_queued_count := v_queued_count + 1;
    END LOOP;
    
    RETURN v_queued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON api_scopes TO authenticated;
GRANT SELECT ON rate_limit_tiers TO authenticated;
GRANT SELECT ON webhook_events TO authenticated;
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_rate_limits TO authenticated;
GRANT ALL ON api_request_logs TO authenticated;
GRANT ALL ON webhook_endpoints TO authenticated;
GRANT ALL ON webhook_deliveries TO authenticated;
GRANT ALL ON api_endpoint_metrics TO authenticated;