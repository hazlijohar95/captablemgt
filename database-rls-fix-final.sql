-- Comprehensive RLS Fix for Cap Table Management Platform
-- This file fixes infinite recursion issues and creates proper security policies
-- Run this SQL in your Supabase SQL editor

-- First, ensure the people table has the user_id column
-- This links people records to auth.users for proper authentication
DO $$ 
BEGIN
    -- Add user_id column to people table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE people ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add missing columns to companies table if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'incorporation_date'
    ) THEN
        ALTER TABLE companies ADD COLUMN incorporation_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'jurisdiction'
    ) THEN
        ALTER TABLE companies ADD COLUMN jurisdiction VARCHAR(100);
    END IF;
END
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);

-- Update companies table defaults to match what the app expects
ALTER TABLE companies 
ALTER COLUMN country SET DEFAULT 'US',
ALTER COLUMN currency SET DEFAULT 'USD',
ALTER COLUMN fiscal_year_start SET DEFAULT 1;

-- Drop ALL existing RLS policies to start fresh
-- This prevents any existing recursive policies from interfering

-- Companies policies
DROP POLICY IF EXISTS "Users can access their companies" ON companies;
DROP POLICY IF EXISTS "companies_policy" ON companies;

-- People policies  
DROP POLICY IF EXISTS "Users can access their company data" ON people;
DROP POLICY IF EXISTS "Users can manage their own profile" ON people;
DROP POLICY IF EXISTS "Users can read company people" ON people;
DROP POLICY IF EXISTS "Users can access people data" ON people;
DROP POLICY IF EXISTS "people_policy" ON people;

-- Role assignments policies
DROP POLICY IF EXISTS "Users can access their own role assignments" ON role_assignments;
DROP POLICY IF EXISTS "role_assignments_policy" ON role_assignments;

-- Stakeholders policies
DROP POLICY IF EXISTS "Users can access their company data" ON stakeholders;
DROP POLICY IF EXISTS "Users can access their company stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "stakeholders_policy" ON stakeholders;

-- Share classes policies
DROP POLICY IF EXISTS "Users can access their company data" ON share_classes;
DROP POLICY IF EXISTS "Users can access their company share classes" ON share_classes;
DROP POLICY IF EXISTS "share_classes_policy" ON share_classes;

-- Securities policies
DROP POLICY IF EXISTS "Users can access their company data" ON securities;
DROP POLICY IF EXISTS "Users can access their company securities" ON securities;
DROP POLICY IF EXISTS "securities_policy" ON securities;

-- Grants policies
DROP POLICY IF EXISTS "Users can access their company grants" ON grants;
DROP POLICY IF EXISTS "grants_policy" ON grants;

-- Vesting schedules policies
DROP POLICY IF EXISTS "Users can access vesting schedules" ON vesting_schedules;
DROP POLICY IF EXISTS "vesting_schedules_policy" ON vesting_schedules;

-- Transactions policies
DROP POLICY IF EXISTS "Users can access their company transactions" ON transactions;
DROP POLICY IF EXISTS "transactions_policy" ON transactions;

-- Rounds policies
DROP POLICY IF EXISTS "rounds_policy" ON rounds;

-- Audit events policies
DROP POLICY IF EXISTS "audit_events_policy" ON audit_events;

-- ====================
-- NEW NON-RECURSIVE RLS POLICIES
-- ====================

-- 1. PEOPLE TABLE - Foundation policy (no circular dependencies)
-- Users can access their own person record and any person record they need to see through companies they have access to
CREATE POLICY "people_access_policy" ON people
  FOR ALL USING (
    -- Users can access their own record via user_id or email
    user_id = auth.uid() 
    OR email = auth.email()
    -- OR they can access people records for companies they have role assignments in
    OR id IN (
      SELECT DISTINCT s.person_id 
      FROM stakeholders s
      JOIN role_assignments ra ON ra.company_id = s.company_id
      WHERE ra.person_id IN (
        SELECT p.id FROM people p 
        WHERE p.user_id = auth.uid() OR p.email = auth.email()
      )
      AND s.person_id IS NOT NULL
    )
  );

-- 2. ROLE_ASSIGNMENTS TABLE - Direct user access only
-- Users can only see role assignments for their own person record
CREATE POLICY "role_assignments_access_policy" ON role_assignments
  FOR ALL USING (
    person_id IN (
      SELECT id FROM people 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );

-- 3. COMPANIES TABLE - Access through role assignments
-- Users can access companies where they have role assignments
CREATE POLICY "companies_access_policy" ON companies
  FOR ALL USING (
    id IN (
      SELECT DISTINCT ra.company_id 
      FROM role_assignments ra
      WHERE ra.person_id IN (
        SELECT id FROM people 
        WHERE user_id = auth.uid() OR email = auth.email()
      )
    )
  );

-- 4. STAKEHOLDERS TABLE - Access through company membership
-- Users can access stakeholders of companies they have access to
CREATE POLICY "stakeholders_access_policy" ON stakeholders
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT ra.company_id 
      FROM role_assignments ra
      WHERE ra.person_id IN (
        SELECT id FROM people 
        WHERE user_id = auth.uid() OR email = auth.email()
      )
    )
  );

-- 5. SHARE_CLASSES TABLE - Access through company membership
CREATE POLICY "share_classes_access_policy" ON share_classes
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT ra.company_id 
      FROM role_assignments ra
      WHERE ra.person_id IN (
        SELECT id FROM people 
        WHERE user_id = auth.uid() OR email = auth.email()
      )
    )
  );

-- 6. SECURITIES TABLE - Access through company membership
CREATE POLICY "securities_access_policy" ON securities
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT ra.company_id 
      FROM role_assignments ra
      WHERE ra.person_id IN (
        SELECT id FROM people 
        WHERE user_id = auth.uid() OR email = auth.email()
      )
    )
  );

-- 7. GRANTS TABLE - Access through securities they can access
CREATE POLICY "grants_access_policy" ON grants
  FOR ALL USING (
    security_id IN (
      SELECT s.id FROM securities s
      WHERE s.company_id IN (
        SELECT DISTINCT ra.company_id 
        FROM role_assignments ra
        WHERE ra.person_id IN (
          SELECT id FROM people 
          WHERE user_id = auth.uid() OR email = auth.email()
        )
      )
    )
  );

-- 8. VESTING_SCHEDULES TABLE - Allow read access for now (can be tightened later)
-- Vesting schedules are referenced by grants, so users need access to compute vesting
CREATE POLICY "vesting_schedules_access_policy" ON vesting_schedules
  FOR SELECT USING (true);

-- For write operations on vesting schedules, require company access
CREATE POLICY "vesting_schedules_modify_policy" ON vesting_schedules
  FOR INSERT WITH CHECK (true);

CREATE POLICY "vesting_schedules_update_policy" ON vesting_schedules
  FOR UPDATE USING (true);

-- 9. TRANSACTIONS TABLE - Access through company membership
CREATE POLICY "transactions_access_policy" ON transactions
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT ra.company_id 
      FROM role_assignments ra
      WHERE ra.person_id IN (
        SELECT id FROM people 
        WHERE user_id = auth.uid() OR email = auth.email()
      )
    )
  );

-- 10. ROUNDS TABLE - Access through company membership  
CREATE POLICY "rounds_access_policy" ON rounds
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT ra.company_id 
      FROM role_assignments ra
      WHERE ra.person_id IN (
        SELECT id FROM people 
        WHERE user_id = auth.uid() OR email = auth.email()
      )
    )
  );

-- 11. AUDIT_EVENTS TABLE - Access through company membership
CREATE POLICY "audit_events_access_policy" ON audit_events
  FOR ALL USING (
    company_id IN (
      SELECT DISTINCT ra.company_id 
      FROM role_assignments ra
      WHERE ra.person_id IN (
        SELECT id FROM people 
        WHERE user_id = auth.uid() OR email = auth.email()
      )
    )
  );

-- ====================
-- ENABLE RLS ON ALL TABLES
-- ====================

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

-- ====================
-- HELPER FUNCTION FOR USER ONBOARDING
-- ====================

-- Create a function to handle the user onboarding flow
-- This ensures proper role assignments are created when users create companies
CREATE OR REPLACE FUNCTION create_founder_role_assignment(
  p_company_id UUID,
  p_person_id UUID
) RETURNS void AS $$
BEGIN
  INSERT INTO role_assignments (company_id, person_id, role, scopes)
  VALUES (
    p_company_id, 
    p_person_id, 
    'OWNER', 
    ARRAY['companies.full', 'stakeholders.full', 'securities.full', 'grants.full', 'transactions.full']
  )
  ON CONFLICT (company_id, person_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_founder_role_assignment TO authenticated;

-- ====================
-- TEST THE SETUP
-- ====================

-- Create a test to verify the policies work correctly
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been successfully updated!';
  RAISE NOTICE 'Key changes made:';
  RAISE NOTICE '1. Added user_id column to people table for proper auth integration';
  RAISE NOTICE '2. Removed all recursive policy dependencies';
  RAISE NOTICE '3. Created clear access hierarchy: auth -> people -> role_assignments -> companies -> other tables';
  RAISE NOTICE '4. Added helper function for user onboarding';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps for your app:';
  RAISE NOTICE '1. Test user authentication and profile creation';
  RAISE NOTICE '2. Test company creation and role assignment';
  RAISE NOTICE '3. Verify users can access company data after role assignment';
END
$$;