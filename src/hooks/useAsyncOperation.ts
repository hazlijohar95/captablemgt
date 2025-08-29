import { useState, useCallback } from 'react';

/**
 * Custom hook for managing async operations with loading, error, and success states
 */
export interface IAsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function useAsyncOperation<T = unknown>() {
  const [state, setState] = useState<IAsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T> => {
    setState(prev => ({ ...prev, loading: true, error: null, success: false }));
    
    try {
      const result = await operation();
      setState({ data: result, loading: false, error: null, success: true });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage, success: false }));
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, success: false });
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setError,
  };
}