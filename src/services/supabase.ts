import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { initializeCSRFMiddleware } from './csrfMiddleware';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
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
initializeCSRFMiddleware(supabase);

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