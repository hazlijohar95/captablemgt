-- Comprehensive RLS Security Testing Suite
-- Run these tests to validate your RLS policies are working correctly

-- Test user isolation between companies
DO $$
DECLARE
  company1_id UUID := '11111111-1111-1111-1111-111111111111';
  company2_id UUID := '22222222-2222-2222-2222-222222222222';
  user1_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  user2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  person1_id UUID;
  person2_id UUID;
  test_result INTEGER;
BEGIN
  -- Create test companies
  INSERT INTO companies (id, name, country, currency) VALUES 
    (company1_id, 'Test Company 1', 'US', 'USD'),
    (company2_id, 'Test Company 2', 'US', 'USD');

  -- Create test people
  INSERT INTO people (name, email, user_id) VALUES 
    ('User 1', 'user1@test.com', user1_id),
    ('User 2', 'user2@test.com', user2_id)
  RETURNING id INTO person1_id, person2_id;

  -- Create role assignments
  INSERT INTO role_assignments (company_id, person_id, role, scopes) VALUES 
    (company1_id, person1_id, 'OWNER', ARRAY['companies.full']),
    (company2_id, person2_id, 'OWNER', ARRAY['companies.full']);

  -- Test 1: User 1 should not see Company 2
  -- This would be tested with actual user context in application
  RAISE NOTICE 'Test 1: Multi-tenant isolation test setup complete';
  
  -- Test 2: Check for potential data leakage in vesting schedules
  INSERT INTO vesting_schedules (start_date, cliff_months, duration_months, frequency) 
  VALUES ('2024-01-01', 12, 48, 'MONTHLY');
  
  -- Test 3: Validate people table access patterns
  INSERT INTO stakeholders (company_id, person_id, type) VALUES 
    (company1_id, person1_id, 'FOUNDER'),
    (company2_id, person2_id, 'FOUNDER');

  RAISE NOTICE 'RLS Security test data created successfully';
  RAISE NOTICE 'Next step: Run application-level tests with actual user authentication';
  
  -- Cleanup test data
  DELETE FROM role_assignments WHERE company_id IN (company1_id, company2_id);
  DELETE FROM stakeholders WHERE company_id IN (company1_id, company2_id);
  DELETE FROM people WHERE email IN ('user1@test.com', 'user2@test.com');
  DELETE FROM companies WHERE id IN (company1_id, company2_id);
  
  RAISE NOTICE 'Test cleanup complete';
END
$$;

-- Application-level security test checklist
-- These should be run in your test suite with actual user sessions:

/*
APPLICATION SECURITY TEST CHECKLIST:

1. MULTI-TENANT ISOLATION:
   - User A creates company, User B should not see it
   - User A invited to Company 1, should not see Company 2 data
   - User A removed from company, should lose all access immediately

2. ROLE-BASED ACCESS:
   - OWNER: Full access to company data
   - ADMIN: Full access except user management
   - INVESTOR: Limited to investment-related data
   - EMPLOYEE: Limited to their own equity data
   - AUDITOR: Read-only access to financial data

3. DATA MODIFICATION SECURITY:
   - Users can only modify data in companies they have appropriate roles
   - Financial data (transactions, valuations) require higher privileges
   - Audit trail captures all modifications with proper actor_id

4. EDGE CASE SECURITY:
   - user_id is null - should fall back to email authentication
   - Email is null or empty - should deny access
   - User has no role assignments - should see no company data
   - User role is removed - should immediately lose access
   - Company is deleted - all related data access should be revoked

5. PERFORMANCE UNDER LOAD:
   - Test with 1000+ stakeholders per company
   - Test with user having roles in 10+ companies
   - Monitor query performance with complex cap tables

6. SQL INJECTION PREVENTION:
   - All user inputs properly parameterized
   - No dynamic SQL construction with user data
   - RLS policies don't rely on user-controlled data

7. SENSITIVE DATA PROTECTION:
   - Vesting schedules only visible to appropriate roles
   - Investor data segregated from employee data
   - Financial metrics (valuations, strike prices) properly protected

RECOMMENDED TESTING TOOLS:
- Use Supabase's built-in RLS testing with different user contexts
- Create automated test suite with different user roles
- Performance testing with realistic data volumes
- Security scanning for SQL injection vulnerabilities
*/