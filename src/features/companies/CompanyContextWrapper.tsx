import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { CompanySelector } from './CompanySelector';

interface CompanyContextWrapperProps {
  children: React.ReactNode;
}

/**
 * Component that ensures user has selected a company before showing app content
 */
export function CompanyContextWrapper({ children }: CompanyContextWrapperProps) {
  const { currentCompanyId, setCurrentCompanyId } = useAuth();

  // If no company is selected, show the company selector
  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <CompanySelector onCompanySelected={setCurrentCompanyId} />
        </div>
      </div>
    );
  }

  // Company is selected, show the app content
  return <>{children}</>;
}