import { useAuth } from '@/features/auth/AuthContext';

/**
 * Custom error for unauthorized company access
 */
export class UnauthorizedCompanyAccessError extends Error {
  constructor(message: string = 'No company access granted') {
    super(message);
    this.name = 'UnauthorizedCompanyAccessError';
  }
}

/**
 * Hook to access company context with proper security controls
 * This ensures we always have a valid, authorized company ID for data operations
 */
export function useCompanyContext() {
  const { currentCompanyId, setCurrentCompanyId } = useAuth();

  // SECURITY: No fallback to demo company - require explicit authorization
  if (!currentCompanyId) {
    throw new UnauthorizedCompanyAccessError('No company selected. Please select a company to continue.');
  }

  return {
    companyId: currentCompanyId,
    currentCompanyId,
    setCurrentCompanyId,
    hasCompany: true, // Always true if we reach this point
  };
}