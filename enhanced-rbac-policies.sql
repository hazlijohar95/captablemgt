-- Enhanced Role-Based Access Control Policies
-- This provides different access levels based on user roles

-- Helper function to check if user has specific role in a company
CREATE OR REPLACE FUNCTION user_has_company_role(
  company_uuid UUID, 
  required_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN people p ON p.id = ra.person_id
    WHERE ra.company_id = company_uuid
    AND ra.role = required_role
    AND (p.user_id = auth.uid() OR p.email = auth.email())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION user_has_any_company_role(
  company_uuid UUID, 
  roles TEXT[]
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN people p ON p.id = ra.person_id
    WHERE ra.company_id = company_uuid
    AND ra.role = ANY(roles)
    AND (p.user_id = auth.uid() OR p.email = auth.email())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example of enhanced policy for sensitive financial data
-- This could be applied to high-value transactions or valuations
CREATE OR REPLACE FUNCTION create_enhanced_transactions_policy() RETURNS VOID AS $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "transactions_access_policy" ON transactions;
  
  -- Create role-based transaction access policy
  CREATE POLICY "transactions_rbac_policy" ON transactions
    FOR ALL USING (
      -- OWNER and ADMIN can see all transactions
      user_has_any_company_role(company_id, ARRAY['OWNER', 'ADMIN'])
      
      -- AUDITOR can only read transactions
      OR (
        user_has_company_role(company_id, 'AUDITOR') 
        AND current_setting('request.method', true) = 'GET'
      )
      
      -- INVESTOR can only see transactions related to their investments
      OR (
        user_has_company_role(company_id, 'INVESTOR')
        AND (
          -- Can see their own investment transactions
          payload->>'stakeholder_id' IN (
            SELECT s.id FROM stakeholders s
            JOIN people p ON p.id = s.person_id
            WHERE s.company_id = transactions.company_id
            AND (p.user_id = auth.uid() OR p.email = auth.email())
          )
          -- Can see public financing rounds
          OR kind IN ('ISSUE') AND payload->>'round_type' IS NOT NULL
        )
      )
      
      -- EMPLOYEE can only see their own equity-related transactions
      OR (
        user_has_company_role(company_id, 'EMPLOYEE')
        AND payload->>'stakeholder_id' IN (
          SELECT s.id FROM stakeholders s
          JOIN people p ON p.id = s.person_id
          WHERE s.company_id = transactions.company_id
          AND (p.user_id = auth.uid() OR p.email = auth.email())
          AND s.type = 'EMPLOYEE'
        )
      )
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION user_has_company_role TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_any_company_role TO authenticated;
GRANT EXECUTE ON FUNCTION create_enhanced_transactions_policy TO authenticated;

COMMENT ON FUNCTION user_has_company_role IS 'Check if authenticated user has specific role in given company';
COMMENT ON FUNCTION user_has_any_company_role IS 'Check if authenticated user has any of the specified roles in given company';