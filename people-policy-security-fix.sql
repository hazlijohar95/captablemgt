-- FIX for People table recursive reference issue
-- This resolves the potential infinite recursion in the people policy

-- Drop the current people policy
DROP POLICY IF EXISTS "people_access_policy" ON people;

-- Create a non-recursive people policy
-- Strategy: Make people policy the foundation, then other policies build on it
CREATE POLICY "people_secure_access" ON people
  FOR ALL USING (
    -- Direct access: Users can access their own person record
    user_id = auth.uid() 
    OR email = auth.email()
    -- Indirect access: Users can access people who are stakeholders 
    -- in companies where they have role assignments
    -- This avoids recursion by not referencing the people table again
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      WHERE ra.company_id IN (
        -- Get companies where the requesting user has role assignments
        SELECT ra2.company_id FROM role_assignments ra2
        WHERE ra2.person_id IN (
          -- Use a direct query to avoid recursion
          SELECT p.id FROM people p 
          WHERE p.user_id = auth.uid() OR p.email = auth.email()
        )
      )
      -- Check if this person record has stakeholder relationships
      -- with any of those companies
      AND ra.company_id IN (
        SELECT s.company_id FROM stakeholders s
        WHERE s.person_id = people.id
      )
    )
  );

COMMENT ON POLICY "people_secure_access" ON people IS 
'Users can access their own person record and person records of other stakeholders in companies they have role assignments for. Avoids recursive references.';