import React, { useState, useEffect, useCallback } from 'react';
import { CSRFService, CSRFError } from '@/services/csrfService';

interface CSRFState {
  token: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

/**
 * Custom hook for CSRF protection in React components
 * Manages CSRF token lifecycle and provides validation helpers
 */
export function useCSRFProtection() {
  const [state, setState] = useState<CSRFState>({
    token: null,
    loading: true,
    error: null,
    initialized: false
  });

  // Initialize CSRF token when hook mounts
  const initializeCSRF = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { csrfToken } = await CSRFService.initializeForm();
      
      setState({
        token: csrfToken,
        loading: false,
        error: null,
        initialized: true
      });
    } catch (error) {
      setState({
        token: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize CSRF protection',
        initialized: false
      });
    }
  }, []);

  // Refresh CSRF token manually
  const refreshToken = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Clear existing token
      CSRFService.clearToken();
      
      // Get new token
      const { csrfToken } = await CSRFService.initializeForm();
      
      setState(prev => ({
        ...prev,
        token: csrfToken,
        loading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh CSRF token'
      }));
    }
  }, []);

  // Validate current token
  const validateToken = useCallback(async (companyId?: string): Promise<boolean> => {
    if (!state.token) {
      setState(prev => ({ ...prev, error: 'No CSRF token available' }));
      return false;
    }

    try {
      await CSRFService.validateToken(state.token, companyId);
      setState(prev => ({ ...prev, error: null }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'CSRF validation failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      // If token is invalid or expired, try to refresh
      if (error instanceof CSRFError) {
        await refreshToken();
      }
      
      return false;
    }
  }, [state.token, refreshToken]);

  // Get headers for API requests
  const getCSRFHeaders = useCallback((): Record<string, string> => {
    if (!state.token) {
      throw new CSRFError('CSRF token not available');
    }
    
    return {
      'X-CSRF-Token': state.token
    };
  }, [state.token]);

  // Initialize on mount
  useEffect(() => {
    initializeCSRF();
  }, [initializeCSRF]);

  // Auto-refresh token every 25 minutes (before 30-minute expiry)
  useEffect(() => {
    if (!state.initialized) return;

    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 25 * 60 * 1000); // 25 minutes

    return () => clearInterval(refreshInterval);
  }, [state.initialized, refreshToken]);

  return {
    // State
    token: state.token,
    loading: state.loading,
    error: state.error,
    initialized: state.initialized,
    
    // Actions
    refreshToken,
    validateToken,
    getCSRFHeaders,
    
    // Utilities
    isReady: state.initialized && state.token && !state.loading,
    hasError: Boolean(state.error)
  };
}

/**
 * Hook for form components that need CSRF protection
 */
export function useCSRFForm() {
  const csrf = useCSRFProtection();
  
  // Get form data with CSRF token included
  const getFormDataWithCSRF = useCallback(<T extends Record<string, any>>(formData: T) => {
    if (!csrf.token) {
      throw new CSRFError('CSRF token not available');
    }
    
    return {
      ...formData,
      csrfToken: csrf.token
    };
  }, [csrf.token]);

  // Validate and prepare data for submission
  const prepareSubmission = useCallback(async <T extends Record<string, any>>(
    formData: T,
    companyId?: string
  ): Promise<T & { csrfToken: string }> => {
    // Ensure we have a valid token
    if (!csrf.isReady) {
      throw new CSRFError('CSRF protection not ready');
    }

    // Validate token
    const isValid = await csrf.validateToken(companyId);
    if (!isValid) {
      throw new CSRFError('CSRF token validation failed');
    }

    // Return form data with CSRF token
    return getFormDataWithCSRF(formData);
  }, [csrf.isReady, csrf.validateToken, getFormDataWithCSRF]);

  return {
    ...csrf,
    getFormDataWithCSRF,
    prepareSubmission
  };
}

/**
 * Higher-order component wrapper for CSRF protection
 */
export function withCSRFProtection<P extends Record<string, any>>(
  WrappedComponent: React.ComponentType<P & { csrf: ReturnType<typeof useCSRFProtection> }>
) {
  return function CSRFProtectedComponent(props: P) {
    const csrf = useCSRFProtection();
    
    // Don't render component until CSRF is ready or if there's an error
    if (csrf.loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-sm text-gray-600">Initializing security...</span>
        </div>
      );
    }

    if (csrf.hasError) {
      return (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">
            Security initialization failed: {csrf.error}
          </div>
          <button
            onClick={csrf.refreshToken}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return <WrappedComponent {...props} csrf={csrf} />;
  };
}