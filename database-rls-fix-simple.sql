-- Simplified RLS policies to fix infinite recursion
-- Run this SQL in your Supabase SQL editor

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can access their company data" ON people;
DROP POLICY IF EXISTS "Users can manage their own profile" ON people;
DROP POLICY IF EXISTS "Users can read company people" ON people;
DROP POLICY IF EXISTS "Users can access people data" ON people;

DROP POLICY IF EXISTS "Users can access their companies" ON companies;

DROP POLICY IF EXISTS "Users can access their company data" ON stakeholders;
DROP POLICY IF EXISTS "Users can access their company stakeholders" ON stakeholders;

DROP POLICY IF EXISTS "Users can access their company data" ON share_classes;
DROP POLICY IF EXISTS "Users can access their company share classes" ON share_classes;

DROP POLICY IF EXISTS "Users can access their company data" ON securities;
DROP POLICY IF EXISTS "Users can access their company securities" ON securities;

DROP POLICY IF EXISTS "Users can access their company grants" ON grants;
DROP POLICY IF EXISTS "Users can access vesting schedules" ON vesting_schedules;
DROP POLICY IF EXISTS "Users can access their company transactions" ON transactions;
DROP POLICY IF EXISTS "Users can access their own role assignments" ON role_assignments;

-- Create simple, non-recursive policies

-- People table: users can only access their own records
CREATE POLICY "people_policy" ON people
  FOR ALL USING (
    email = auth.email() OR user_id = auth.uid()
  );

-- Companies table: allow access to companies where user has role
CREATE POLICY "companies_policy" ON companies
  FOR ALL USING (
    id IN (
      SELECT ra.company_id FROM role_assignments ra
      JOIN auth.users u ON u.id = auth.uid()
      WHERE ra.person_id IN (
        SELECT p.id FROM people p WHERE p.email = u.email OR p.user_id = u.id
      )
    )
  );

-- Role assignments: users can see their own role assignments
CREATE POLICY "role_assignments_policy" ON role_assignments
  FOR ALL USING (
    person_id IN (
      SELECT p.id FROM people p 
      JOIN auth.users u ON u.id = auth.uid()
      WHERE p.email = u.email OR p.user_id = u.id
    )
  );

-- Stakeholders: allow access based on company access
CREATE POLICY "stakeholders_policy" ON stakeholders
  FOR ALL USING (
    company_id IN (
      SELECT ra.company_id FROM role_assignments ra
      JOIN auth.users u ON u.id = auth.uid()
      WHERE ra.person_id IN (
        SELECT p.id FROM people p WHERE p.email = u.email OR p.user_id = u.id
      )
    )
  );

-- Share classes: allow access based on company access
CREATE POLICY "share_classes_policy" ON share_classes
  FOR ALL USING (
    company_id IN (
      SELECT ra.company_id FROM role_assignments ra
      JOIN auth.users u ON u.id = auth.uid()
      WHERE ra.person_id IN (
        SELECT p.id FROM people p WHERE p.email = u.email OR p.user_id = u.id
      )
    )
  );

-- Securities: allow access based on company access
CREATE POLICY "securities_policy" ON securities
  FOR ALL USING (
    company_id IN (
      SELECT ra.company_id FROM role_assignments ra
      JOIN auth.users u ON u.id = auth.uid()
      WHERE ra.person_id IN (
        SELECT p.id FROM people p WHERE p.email = u.email OR p.user_id = u.id
      )
    )
  );

-- Grants: allow access based on security access
CREATE POLICY "grants_policy" ON grants
  FOR ALL USING (
    security_id IN (
      SELECT s.id FROM securities s
      WHERE s.company_id IN (
        SELECT ra.company_id FROM role_assignments ra
        JOIN auth.users u ON u.id = auth.uid()
        WHERE ra.person_id IN (
          SELECT p.id FROM people p WHERE p.email = u.email OR p.user_id = u.id
        )
      )
    )
  );

-- Vesting schedules: allow access to all for now
CREATE POLICY "vesting_schedules_policy" ON vesting_schedules
  FOR ALL USING (true);

-- Transactions: allow access based on company access
CREATE POLICY "transactions_policy" ON transactions
  FOR ALL USING (
    company_id IN (
      SELECT ra.company_id FROM role_assignments ra
      JOIN auth.users u ON u.id = auth.uid()
      WHERE ra.person_id IN (
        SELECT p.id FROM people p WHERE p.email = u.email OR p.user_id = u.id
      )
    )
  );