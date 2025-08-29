-- Test script to verify RLS policies are working correctly
-- Run this AFTER applying the main RLS fix

-- Test 1: Verify people table has user_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'people' 
    AND column_name = 'user_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: people.user_id column exists';
  ELSE
    RAISE NOTICE 'ERROR: people.user_id column missing';
  END IF;
END
$$;

-- Test 2: Verify RLS is enabled on all tables
DO $$
DECLARE
  table_name TEXT;
  rls_enabled BOOLEAN;
  tables_to_check TEXT[] := ARRAY['people', 'companies', 'role_assignments', 'stakeholders', 'securities', 'share_classes'];
BEGIN
  FOREACH table_name IN ARRAY tables_to_check LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = table_name;
    
    IF rls_enabled THEN
      RAISE NOTICE 'SUCCESS: RLS enabled on %', table_name;
    ELSE
      RAISE NOTICE 'WARNING: RLS not enabled on %', table_name;
    END IF;
  END LOOP;
END
$$;

-- Test 3: Verify policies exist
DO $$
DECLARE
  policy_count INTEGER;
  expected_policies TEXT[] := ARRAY[
    'people_access_policy',
    'role_assignments_access_policy', 
    'companies_access_policy',
    'stakeholders_access_policy',
    'securities_access_policy',
    'share_classes_access_policy'
  ];
  policy_name TEXT;
BEGIN
  FOREACH policy_name IN ARRAY expected_policies LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE policyname = policy_name;
    
    IF policy_count > 0 THEN
      RAISE NOTICE 'SUCCESS: Policy % exists', policy_name;
    ELSE
      RAISE NOTICE 'WARNING: Policy % missing', policy_name;
    END IF;
  END LOOP;
END
$$;

-- Test 4: Verify helper function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_founder_role_assignment'
  ) THEN
    RAISE NOTICE 'SUCCESS: create_founder_role_assignment function exists';
  ELSE
    RAISE NOTICE 'WARNING: create_founder_role_assignment function missing';
  END IF;
END
$$;

-- Test 5: Create a test scenario (optional - requires authenticated user)
-- This would be run from your application, not directly in SQL editor

/*
-- Example test from application code:

// 1. Authenticate user
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpass123'
});

// 2. Create person record
const person = await capTableService.createOrUpdatePerson({
  email: 'test@example.com',
  name: 'Test User',
  userId: authData.user.id
});

// 3. Create company
const company = await capTableService.createCompany({
  name: 'Test Company',
  userId: authData.user.id,
  userEmail: 'test@example.com',
  userName: 'Test User'
});

// 4. Verify access to company data
const companies = await capTableService.getUserCompanies('test@example.com');
console.log('User can access companies:', companies.length > 0);
*/

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'RLS POLICY VERIFICATION COMPLETE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'If all tests show SUCCESS, your RLS policies are properly configured.';
  RAISE NOTICE 'Next step: Test the user authentication flow in your application.';
END
$$;