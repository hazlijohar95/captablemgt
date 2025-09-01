import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { initializeCSRFMiddleware } from './csrfMiddleware';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

// Create a mock client for demo mode when environment variables are missing
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

if (isDemoMode) {
  console.warn('Running in DEMO MODE - Supabase environment variables not configured');
}

// Create Supabase client with type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'cap-table-management@1.0.0',
    },
  },
});

// Initialize CSRF protection middleware for all Supabase operations
if (!isDemoMode) {
  initializeCSRFMiddleware(supabase);
}

// Helper for authenticated requests
export const getAuthenticatedSupabase = () => {
  return supabase;
};

// Auth state helper
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Session helper
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Sign out helper
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};