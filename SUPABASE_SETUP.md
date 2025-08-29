# Supabase Setup Guide

This guide will help you set up Supabase for your Cap Table Management Platform.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Project name:** `cap-table-management` (or your preferred name)
   - **Database password:** Generate a strong password and save it
   - **Region:** Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be set up (takes a few minutes)

## 2. Get Your Project Credentials

1. Go to your project dashboard
2. Click on "Settings" (gear icon) in the sidebar
3. Click on "API" in the settings menu
4. Copy the following values:
   - **Project URL:** `https://[your-project-ref].supabase.co`
   - **Anon public key:** `eyJ...` (long string starting with eyJ)

## 3. Configure Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
# Replace these with your actual Supabase project credentials
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-anon-key

# Keep these as they are
VITE_APP_NAME=Cap Table Management Platform
VITE_APP_VERSION=1.0.0
VITE_LOG_LEVEL=debug
VITE_ENABLE_DEV_TOOLS=true
```

## 4. Set Up the Database Schema

1. In your Supabase dashboard, go to the "SQL Editor" in the sidebar
2. Click "New query"
3. Copy the entire contents of `/supabase/schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This will create all the necessary tables, indexes, and sample data for your cap table platform.

## 5. Configure Authentication

1. Go to "Authentication" in your Supabase dashboard sidebar
2. Click on "Settings"
3. Configure the following:

### Email Settings
- **Enable email confirmations:** ON (recommended)
- **Enable email change confirmations:** ON
- **Enable secure email change:** ON

### URL Configuration
- **Site URL:** `http://localhost:3000` (for development)
- **Redirect URLs:** Add `http://localhost:3000/**`

### Auth Providers (Optional)
You can enable additional providers like Google, GitHub, etc. if desired.

## 6. Row Level Security (RLS)

The schema automatically enables RLS on all tables. The basic policies are:
- Users can only access companies they have role assignments for
- All data is scoped by company access

For production, you may need to refine these policies based on your specific requirements.

## 7. Test Your Setup

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000`
3. You should see the login page
4. Try creating a new account
5. Check your email for the confirmation link
6. Once confirmed, you should be able to access the dashboard

## 8. Sample Data

The schema includes sample data for testing:
- **Company:** Demo Startup Inc.
- **User:** founder@demostartup.com
- **Share Classes:** Common Stock and Series A Preferred
- **Role:** Owner role for the founder

You can sign in with `founder@demostartup.com` (after creating this user) or create your own account.

## 9. Troubleshooting

### Common Issues:

**"Invalid API key" error:**
- Double-check your `VITE_SUPABASE_ANON_KEY` in `.env.local`
- Make sure there are no extra spaces or newlines

**"Failed to fetch" error:**
- Verify your `VITE_SUPABASE_URL` is correct
- Check that your Supabase project is running

**Email confirmation not working:**
- Check your spam folder
- Verify email settings in Supabase dashboard
- Make sure your site URL is configured correctly

**Database connection issues:**
- Ensure the schema.sql was executed successfully
- Check the SQL Editor for any error messages
- Verify your database password is correct

## 10. Next Steps

Once Supabase is set up, you can:
- Create companies and stakeholders
- Issue equity grants
- Run financial calculations
- Generate cap table reports

The application includes comprehensive audit logging and role-based access control as specified in the PRD.

## 11. Production Considerations

For production deployment:
1. Update your site URL and redirect URLs in Supabase
2. Configure custom SMTP for email (instead of Supabase's development emails)
3. Set up database backups
4. Review and tighten RLS policies
5. Enable database logs for monitoring
6. Consider upgrading to Supabase Pro for better performance and support

---

**Need help?** Check the [Supabase documentation](https://supabase.com/docs) or reach out to the development team.