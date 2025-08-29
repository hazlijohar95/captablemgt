-- Fix RLS policies to allow proper user access
-- Run this SQL in your Supabase SQL editor

-- First, let's create more permissive RLS policies for the people table
DROP POLICY IF EXISTS "Users can access their company data" ON people;
DROP POLICY IF EXISTS "Users can manage their own profile" ON people;
DROP POLICY IF EXISTS "Users can read company people" ON people;

-- Simple policy: users can manage their own profile only
CREATE POLICY "Users can access people data" ON people
  FOR ALL USING (
    email = auth.email() OR user_id = auth.uid()
  )
  WITH CHECK (
    email = auth.email() OR user_id = auth.uid()
  );

-- Fix the companies RLS policy to be more permissive
DROP POLICY IF EXISTS "Users can access their companies" ON companies;

CREATE POLICY "Users can access their companies" ON companies
  FOR ALL USING (
    id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email() OR user_id = auth.uid()
      )
    )
  );

-- Update stakeholders policy to work with the new people policy
DROP POLICY IF EXISTS "Users can access their company data" ON stakeholders;

CREATE POLICY "Users can access their company stakeholders" ON stakeholders
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email() OR user_id = auth.uid()
      )
    )
  );

-- Update share_classes policy
DROP POLICY IF EXISTS "Users can access their company data" ON share_classes;

CREATE POLICY "Users can access their company share classes" ON share_classes
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email() OR user_id = auth.uid()
      )
    )
  );

-- Update securities policy
DROP POLICY IF EXISTS "Users can access their company data" ON securities;

CREATE POLICY "Users can access their company securities" ON securities
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email() OR user_id = auth.uid()
      )
    )
  );

-- Add policies for the new tables we're using
CREATE POLICY "Users can access their company grants" ON grants
  FOR ALL USING (
    security_id IN (
      SELECT id FROM securities WHERE company_id IN (
        SELECT company_id FROM role_assignments 
        WHERE person_id IN (
          SELECT id FROM people WHERE email = auth.email() OR user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can access vesting schedules" ON vesting_schedules
  FOR ALL USING (true); -- Vesting schedules can be accessed by anyone for now

CREATE POLICY "Users can access their company transactions" ON transactions
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM role_assignments 
      WHERE person_id IN (
        SELECT id FROM people WHERE email = auth.email() OR user_id = auth.uid()
      )
    )
  );

-- Add a policy for role_assignments itself
CREATE POLICY "Users can access their own role assignments" ON role_assignments
  FOR ALL USING (
    person_id IN (
      SELECT id FROM people WHERE email = auth.email() OR user_id = auth.uid()
    )
  );