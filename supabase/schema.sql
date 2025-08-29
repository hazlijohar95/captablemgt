-- Cap Table Management Platform Database Schema
-- Run this SQL in your Supabase SQL editor to create the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security on all tables
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  fiscal_year_start INTEGER NOT NULL DEFAULT 1 CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People table
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stakeholders table
CREATE TABLE stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  entity_name VARCHAR(255),
  type VARCHAR(20) NOT NULL CHECK (type IN ('FOUNDER', 'INVESTOR', 'EMPLOYEE', 'ENTITY')),
  tax_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT stakeholder_person_or_entity CHECK (
    (person_id IS NOT NULL AND entity_name IS NULL) OR 
    (person_id IS NULL AND entity_name IS NOT NULL)
  )
);

-- Share classes table
CREATE TABLE share_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('COMMON', 'PREFERRED')),
  authorized BIGINT NOT NULL CHECK (authorized > 0),
  par_value DECIMAL(20, 8) NOT NULL DEFAULT 0.0001,
  preference_terms JSONB,
  seniority_rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Vesting schedules table
CREATE TABLE vesting_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_date DATE NOT NULL,
  cliff_months INTEGER NOT NULL DEFAULT 0 CHECK (cliff_months >= 0),
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')),
  acceleration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Securities table
CREATE TABLE securities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  class_id UUID REFERENCES share_classes(id) ON DELETE RESTRICT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('EQUITY', 'OPTION', 'RSU', 'WARRANT', 'SAFE', 'NOTE')),
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  issued_at DATE NOT NULL,
  cancelled_at DATE,
  terms JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grants table (for options/RSUs)
CREATE TABLE grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL, -- References to equity plans (to be implemented)
  strike_price DECIMAL(20, 8) NOT NULL,
  vesting_schedule_id UUID NOT NULL REFERENCES vesting_schedules(id) ON DELETE RESTRICT,
  grant_date DATE NOT NULL,
  fair_market_value DECIMAL(20, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rounds table
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'SERIES_D', 'SERIES_E', 'BRIDGE', 'OTHER')),
  pre_money DECIMAL(20, 2) NOT NULL CHECK (pre_money > 0),
  investment DECIMAL(20, 2) NOT NULL CHECK (investment > 0),
  target_post_pool_pct DECIMAL(5, 4) NOT NULL CHECK (target_post_pool_pct >= 0 AND target_post_pool_pct <= 1),
  pps DECIMAL(20, 8),
  closed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CLOSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (for audit trail)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('ISSUE', 'TRANSFER', 'CANCEL', 'CONVERT', 'EXERCISE')),
  effective_at TIMESTAMP WITH TIME ZONE NOT NULL,
  payload JSONB NOT NULL,
  actor_id UUID NOT NULL,
  request_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id) -- Idempotency
);

-- Audit events table
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  before JSONB,
  after JSONB,
  hash VARCHAR(64) NOT NULL,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role assignments table
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'EMPLOYEE', 'INVESTOR', 'AUDITOR')),
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, person_id, role)
);

-- Indexes for performance
CREATE INDEX idx_stakeholders_company_id ON stakeholders(company_id);
CREATE INDEX idx_stakeholders_person_id ON stakeholders(person_id);
CREATE INDEX idx_securities_company_id ON securities(company_id);
CREATE INDEX idx_securities_stakeholder_id ON securities(stakeholder_id);
CREATE INDEX idx_securities_issued_at ON securities(issued_at);
CREATE INDEX idx_grants_security_id ON grants(security_id);
CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_transactions_effective_at ON transactions(effective_at);
CREATE INDEX idx_audit_events_company_id ON audit_events(company_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX idx_role_assignments_company_id ON role_assignments(company_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stakeholders_updated_at BEFORE UPDATE ON stakeholders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_share_classes_updated_at BEFORE UPDATE ON share_classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vesting_schedules_updated_at BEFORE UPDATE ON vesting_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_securities_updated_at BEFORE UPDATE ON securities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grants_updated_at BEFORE UPDATE ON grants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_role_assignments_updated_at BEFORE UPDATE ON role_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vesting_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE securities ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access companies they have roles in)
CREATE POLICY "Users can access their companies" ON companies
  FOR ALL USING (
    id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email()
      )
    )
  );

-- Similar policies for other tables (simplified for now)
CREATE POLICY "Users can access their company data" ON stakeholders
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email()
      )
    )
  );

CREATE POLICY "Users can access their company data" ON share_classes
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email()
      )
    )
  );

CREATE POLICY "Users can access their company data" ON securities
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email()
      )
    )
  );

-- Sample data for development
INSERT INTO companies (id, name, country, currency) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Startup Inc.', 'US', 'USD');

INSERT INTO people (id, name, email) 
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'John Founder', 'founder@demostartup.com');

INSERT INTO stakeholders (id, company_id, person_id, type) 
VALUES ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'FOUNDER');

INSERT INTO role_assignments (company_id, person_id, role, scopes) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'OWNER', '{companies.full,stakeholders.full,securities.full}');

INSERT INTO share_classes (id, company_id, name, type, authorized, par_value) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Common Stock', 'COMMON', 10000000, 0.0001),
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Series A Preferred', 'PREFERRED', 2000000, 0.0001);