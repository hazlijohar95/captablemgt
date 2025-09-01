/**
 * Employee Authentication Hook
 * Provides authentication state for employee portal
 */

import { useQuery } from '@tanstack/react-query';

export interface EmployeeAuthState {
  isAuthenticated: boolean;
  employee?: {
    id: string;
    name: string;
    email: string;
    company_id: string;
    employee_id?: string;
    job_title?: string;
    department?: string;
    hire_date?: string;
  };
  loading: boolean;
  error?: Error;
}

export const useEmployeeAuth = (): EmployeeAuthState => {
  const { data: employee, isLoading: loading, error } = useQuery({
    queryKey: ['employee-auth'],
    queryFn: async () => {
      // Mock implementation - replace with actual auth service
      return {
        id: 'emp-1',
        name: 'Employee User',
        email: 'employee@example.com',
        company_id: 'company-1'
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isAuthenticated: !!employee,
    employee,
    loading,
    error: error as Error | undefined
  };
};