/**
 * Employee Authentication Hook
 * Manages employee portal authentication state and session management
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { employeePortalService } from '@/services/employeePortalService';
import {
  EmployeeProfile,
  EmployeePortalAuthRequest,
  EmployeePortalAuthResponse
} from '@/types/employeePortal';

interface EmployeeAuthState {
  employee: EmployeeProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionToken: string | null;
  firstLogin: boolean;
}

interface EmployeeAuthContextType extends EmployeeAuthState {
  login: (request: EmployeePortalAuthRequest) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// Create context
const EmployeeAuthContext = createContext<EmployeeAuthContextType | null>(null);

// Storage keys
const STORAGE_KEYS = {
  EMPLOYEE: 'employee_portal_employee',
  TOKEN: 'employee_portal_token',
  REFRESH_TOKEN: 'employee_portal_refresh_token'
} as const;

/**
 * Employee Authentication Hook
 */
export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
};

/**
 * Employee Authentication Provider Component
 */
export const EmployeeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EmployeeAuthState>({
    employee: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    sessionToken: null,
    firstLogin: false
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedEmployee = localStorage.getItem(STORAGE_KEYS.EMPLOYEE);
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

        if (storedEmployee && storedToken) {
          const employee = JSON.parse(storedEmployee) as EmployeeProfile;
          
          setState(prev => ({
            ...prev,
            employee,
            sessionToken: storedToken,
            isAuthenticated: true,
            isLoading: false
          }));
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false
          }));
        }
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        // Clear corrupted storage
        clearStoredAuth();
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to restore session'
        }));
      }
    };

    initializeAuth();
  }, []);

  // Auto-refresh session before expiry
  useEffect(() => {
    if (state.isAuthenticated && state.sessionToken) {
      const refreshInterval = setInterval(() => {
        refreshSession().catch(console.error);
      }, 15 * 60 * 1000); // Refresh every 15 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [state.isAuthenticated, state.sessionToken]);

  /**
   * Login employee
   */
  const login = useCallback(async (request: EmployeePortalAuthRequest): Promise<void> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // Get client info for security logging
      const ipAddress = await getClientIP().catch(() => undefined);
      const userAgent = navigator.userAgent;

      const response: EmployeePortalAuthResponse = await employeePortalService.authenticateEmployee(
        request,
        ipAddress,
        userAgent
      );

      if (!response.success) {
        throw new Error('Authentication failed');
      }

      // Store authentication data
      localStorage.setItem(STORAGE_KEYS.EMPLOYEE, JSON.stringify(response.employee));
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);

      setState(prev => ({
        ...prev,
        employee: response.employee,
        sessionToken: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        firstLogin: response.first_login,
        error: null
      }));

      // Track login analytics
      trackEmployeeEvent('employee_login', {
        employee_id: response.employee.id,
        company_id: response.employee.company_id,
        first_login: response.first_login,
        department: response.employee.department
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      // Track failed login
      trackEmployeeEvent('employee_login_failed', {
        email: request.email,
        company_id: request.company_id,
        error: errorMessage
      });

      throw error;
    }
  }, []);

  /**
   * Logout employee
   */
  const logout = useCallback(() => {
    // Track logout event
    if (state.employee) {
      trackEmployeeEvent('employee_logout', {
        employee_id: state.employee.id,
        company_id: state.employee.company_id
      });
    }

    // Clear authentication state
    clearStoredAuth();
    setState({
      employee: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionToken: null,
      firstLogin: false
    });
  }, [state.employee]);

  /**
   * Refresh session token
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    if (!state.employee || !state.sessionToken) {
      return;
    }

    try {
      // For MVP, we'll just validate the current session
      // In production, implement proper token refresh logic
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Simplified refresh - in production, call a proper refresh endpoint
      const newTokenData = {
        access_token: Buffer.from(`${state.employee.id}:${Date.now()}`).toString('base64'),
        refresh_token: Buffer.from(`${state.employee.id}:${Date.now() + 86400000}`).toString('base64')
      };

      localStorage.setItem(STORAGE_KEYS.TOKEN, newTokenData.access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newTokenData.refresh_token);

      setState(prev => ({
        ...prev,
        sessionToken: newTokenData.access_token,
        error: null
      }));

    } catch (error) {
      console.error('Session refresh failed:', error);
      // If refresh fails, logout user
      logout();
    }
  }, [state.employee, state.sessionToken, logout]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const contextValue: EmployeeAuthContextType = {
    ...state,
    login,
    logout,
    refreshSession,
    clearError
  };

  return (
    <EmployeeAuthContext.Provider value={contextValue}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

/**
 * Helper function to get client IP (simplified)
 */
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};

/**
 * Clear stored authentication data
 */
const clearStoredAuth = () => {
  localStorage.removeItem(STORAGE_KEYS.EMPLOYEE);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

/**
 * Analytics tracking for employee portal events
 */
const trackEmployeeEvent = (eventName: string, properties: Record<string, any>) => {
  // For MVP, just log to console
  // In production, integrate with analytics service (Mixpanel, Amplitude, etc.)
  console.log(`[Employee Portal Analytics] ${eventName}:`, properties);
  
  // Example production integration:
  // if (window.mixpanel) {
  //   window.mixpanel.track(eventName, properties);
  // }
};

/**
 * Employee authentication guard component
 */
interface EmployeeAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const EmployeeAuthGuard: React.FC<EmployeeAuthGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, isLoading } = useEmployeeAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

/**
 * Hook to get current employee profile
 */
export const useEmployeeProfile = (): EmployeeProfile | null => {
  const { employee } = useEmployeeAuth();
  return employee;
};

/**
 * Hook to check if user is authenticated
 */
export const useIsEmployeeAuthenticated = (): boolean => {
  const { isAuthenticated } = useEmployeeAuth();
  return isAuthenticated;
};