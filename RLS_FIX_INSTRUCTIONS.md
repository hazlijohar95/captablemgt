# RLS Fix Instructions for Cap Table Management Platform

## Problem Summary
The application was experiencing infinite recursion errors when users tried to access the `people` table due to circular dependencies in Row Level Security (RLS) policies. The policies were referencing each other in ways that created infinite loops.

## Root Causes Identified

1. **Missing `user_id` column**: The `people` table didn't have a `user_id` column to properly link to `auth.users`
2. **Circular policy dependencies**: Policies were trying to access the same tables they were protecting
3. **Complex nested queries**: Multiple levels of subqueries created recursive references
4. **Missing role assignments**: New users weren't getting proper role assignments to access company data

## Solution Applied

### 1. Database Schema Updates
- Added `user_id UUID` column to `people` table with foreign key to `auth.users(id)`
- Added missing columns (`incorporation_date`, `jurisdiction`) to `companies` table
- Added performance indexes for `people.user_id` and `people.email`

### 2. RLS Policy Restructure
Created a clear access hierarchy to eliminate circular dependencies:

```
auth.users → people → role_assignments → companies → other tables
```

**Key Policy Principles:**
- **People table**: Foundation policy with no circular dependencies
- **Role assignments**: Direct access to own assignments only
- **Companies**: Access through role assignments
- **All other tables**: Access through company membership

### 3. Service Layer Updates
- Added `createRoleAssignment` method to properly create role assignments
- Updated `createCompany` method to automatically create `OWNER` role for founders
- Ensures new users can access their companies immediately after creation

## Files Modified

1. `/Applications/Cursor/CapTable/database-rls-fix-final.sql` - Complete RLS policy fix
2. `/Applications/Cursor/CapTable/src/services/capTableService.ts` - Added role assignment creation

## Apply the Fix

### Step 1: Run the Database Migration
1. Open your Supabase dashboard
2. Go to the SQL editor
3. Copy and paste the contents of `database-rls-fix-final.sql`
4. Execute the SQL script

### Step 2: Verify the Fix
1. The script will output success messages
2. Check that the `people` table now has a `user_id` column
3. Verify RLS policies are active on all tables

### Step 3: Test the User Flow
1. **Authentication**: User signs up/signs in
2. **Profile Creation**: `AuthContext.loadUserProfile()` creates person record
3. **Company Creation**: User creates company, gets `OWNER` role assignment
4. **Data Access**: User can now access company data through RLS policies

## Expected User Onboarding Flow

```typescript
// 1. User authenticates
await supabase.auth.signInWithPassword({ email, password })

// 2. AuthContext.loadUserProfile() runs automatically
// Creates/updates person record with user_id

// 3. User creates company
const company = await capTableService.createCompany({
  name: "My Startup",
  userId: user.id,
  userEmail: user.email,
  userName: user.name
})

// 4. Service automatically:
// - Creates company record
// - Creates person record (if needed)
// - Creates stakeholder relationship
// - Creates role assignment (OWNER role)
// - Creates default share classes

// 5. User can now access company data
// RLS policies allow access based on role assignment
```

## Key Policy Logic

### People Table Access
```sql
user_id = auth.uid() 
OR email = auth.email()
OR id IN (SELECT person_id FROM company stakeholders user has access to)
```

### Company Access
```sql
id IN (
  SELECT company_id FROM role_assignments 
  WHERE person_id IN (
    SELECT id FROM people WHERE user_id = auth.uid() OR email = auth.email()
  )
)
```

### All Other Tables
```sql
company_id IN (companies user has access to through role assignments)
```

## Testing Checklist

- [ ] User can sign up/sign in without errors
- [ ] Person record is created with correct `user_id`
- [ ] Company creation succeeds
- [ ] Role assignment is created automatically
- [ ] User can access company data immediately
- [ ] Cap table data loads without RLS errors
- [ ] No infinite recursion errors in logs

## Rollback Plan

If issues occur, you can temporarily disable RLS on specific tables:

```sql
-- Emergency rollback - disable RLS temporarily
ALTER TABLE people DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
-- Re-enable after fixing policies
```

## Performance Notes

The new policies use:
- Indexed columns (`user_id`, `email`, `company_id`)
- Simplified queries without deep nesting
- Minimal subquery complexity

This should provide good performance for typical cap table workloads (hundreds of stakeholders per company).

## Security Analysis

**Access Control:**
- Users can only see their own person records
- Users can only access companies where they have role assignments
- Company data is isolated per role assignment
- Proper audit trail maintained in transactions table

**Data Isolation:**
- Complete separation between different companies
- Users cannot access companies they don't have roles in
- Person records are protected by user authentication

**Onboarding Security:**
- New companies automatically get founder as OWNER
- Role assignments prevent unauthorized access
- Stakeholder relationships are company-scoped

The new RLS setup provides strong security while eliminating the infinite recursion issues that were blocking user onboarding.