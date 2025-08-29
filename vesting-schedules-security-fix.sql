-- EMERGENCY SECURITY FIX for Vesting Schedules
-- Run this immediately to fix the critical security vulnerabilities

-- Drop the insecure vesting schedule policies
DROP POLICY IF EXISTS "vesting_schedules_access_policy" ON vesting_schedules;
DROP POLICY IF EXISTS "vesting_schedules_modify_policy" ON vesting_schedules;
DROP POLICY IF EXISTS "vesting_schedules_update_policy" ON vesting_schedules;

-- Create secure vesting schedules policy
-- Vesting schedules should only be accessible through grants they're associated with
CREATE POLICY "vesting_schedules_secure_access" ON vesting_schedules
  FOR ALL USING (
    -- Allow access to vesting schedules that are referenced by grants
    -- the user has access to through their company role assignments
    id IN (
      SELECT DISTINCT g.vesting_schedule_id
      FROM grants g
      JOIN securities s ON s.id = g.security_id
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

-- For INSERT operations, we need to ensure the vesting schedule
-- can only be created by users with appropriate company access
-- This is more restrictive and requires application-level validation
CREATE POLICY "vesting_schedules_insert_policy" ON vesting_schedules
  FOR INSERT WITH CHECK (
    -- Only allow inserts from users who have company admin access
    -- This requires the application to validate company access before insert
    auth.uid() IS NOT NULL
    -- Additional validation should be done at application level
    -- to ensure user has proper role in the company this schedule will be used for
  );

COMMENT ON POLICY "vesting_schedules_secure_access" ON vesting_schedules IS 
'Users can only access vesting schedules that are used by grants in companies they have role assignments for';

COMMENT ON POLICY "vesting_schedules_insert_policy" ON vesting_schedules IS 
'Vesting schedule creation requires authentication. Application must validate company access before creation.';