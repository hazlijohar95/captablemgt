import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: object) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Company context - will be populated after authentication
  currentCompanyId: string | null;
  setCurrentCompanyId: (companyId: string | null) => void;
  // User profile data
  userProfile: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; email: string; } | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle specific auth events
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user.email);
        // Load user profile and company associations
        loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        // Clear user-related state
        setUserProfile(null);
        setCurrentCompanyId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: object) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  // Load user profile from database
  const loadUserProfile = async (authUser: User) => {
    try {
      // Create or update person record in database
      const { capTableService } = await import('@/services/capTableService');
      
      const person = await capTableService.createOrUpdatePerson({
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        userId: authUser.id,
      });

      setUserProfile({
        id: authUser.id,
        name: person.name,
        email: person.email,
      });
      
      // Load user's companies and set default company using cap table service
      const companies = await capTableService.getUserCompanies(authUser.email || '');
      if (companies.length > 0) {
        setCurrentCompanyId(companies[0].id);
        console.log('Set default company:', companies[0].name, companies[0].id);
      } else {
        console.log('No companies found for user, will need to create or join one');
        setCurrentCompanyId(null);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Fallback to basic profile if database fails
      setUserProfile({
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
      });
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    currentCompanyId,
    setCurrentCompanyId,
    userProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}