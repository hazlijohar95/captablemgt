# 🔧 Supabase Setup Guide for Cap Table Platform

## Current Status
The application is running in **Test Mode** at http://localhost:3000/ to verify connectivity.

## Issue Diagnosis
The main application requires:
1. ✅ Supabase project (URL is accessible)
2. ⚠️ Database schema to be created
3. ⚠️ Authentication to be configured
4. ⚠️ Row-level security policies

## To Get the Full Application Working:

### Option 1: Use Existing Supabase Project
If you want to use the preconfigured Supabase project:

1. **Current credentials in `.env.local`:**
   ```
   VITE_SUPABASE_URL=https://qrnxjjodigtdxsdgzuof.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhb...
   ```

2. **Set up the database schema:**
   ```bash
   # Check if migration files exist
   ls supabase/migrations/
   
   # If migrations exist, you'd need the Supabase CLI to run them
   # Install Supabase CLI first if needed
   ```

### Option 2: Create Your Own Supabase Project (Recommended)

1. **Create a free Supabase account:**
   - Go to https://supabase.com
   - Sign up for a free account
   - Create a new project

2. **Get your project credentials:**
   - Go to Settings → API
   - Copy your Project URL
   - Copy your `anon` public key

3. **Update `.env.local`:**
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Set up the database schema:**
   ```sql
   -- Run these in Supabase SQL editor
   -- Create tables for cap table management
   
   -- Companies table
   CREATE TABLE companies (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Add more tables as needed...
   ```

### Option 3: Run Without Supabase (Development Only)

To run the UI without database functionality:

1. Keep the test app running (already configured)
2. Or create a mock Supabase service for development

## Restoring the Full Application

Once Supabase is properly configured, restore the main app:

1. **Edit `src/main.tsx`:**
   - Uncomment the original imports
   - Comment out TestApp import
   - Restore the original App component

2. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## Test Page Features

The current test page at http://localhost:3000/ shows:
- ✅ React is working
- ✅ Vite dev server is running
- ✅ Environment variables are loaded
- ⚠️ Supabase connection status

## Troubleshooting

### Blank Page Issues:
1. Open browser console (F12)
2. Check for errors
3. Verify network tab for failed requests

### Common Errors:
- **"Missing Supabase environment variables"** - Check `.env.local` file
- **"Failed to fetch"** - Check Supabase URL is correct
- **401 Unauthorized** - Normal if no auth is set up yet

### Browser Console Commands:
```javascript
// Check if environment variables are loaded
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```

## Next Steps

1. **For Quick Demo:** Keep using the test page
2. **For Full Features:** Set up Supabase properly
3. **For Development:** Can work on UI components without database

The application architecture is solid, but needs the backend infrastructure to be fully functional.