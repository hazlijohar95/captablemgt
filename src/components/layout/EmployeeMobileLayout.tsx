import React from 'react';
import { Outlet } from 'react-router-dom';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { EmployeeMobileNav } from './EmployeeMobileNav';
import { EmployeeMobileHeader } from './EmployeeMobileHeader';

interface EmployeeMobileLayoutProps {
  children?: React.ReactNode;
}

export const EmployeeMobileLayout: React.FC<EmployeeMobileLayoutProps> = ({ children }) => {
  const { employee, isLoading } = useEmployeeAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <EmployeeMobileHeader employee={employee} />
      
      {/* Main Content */}
      <main className="pb-20 pt-16">
        <div className="px-4 py-4">
          {children || <Outlet />}
        </div>
      </main>
      
      {/* Bottom Navigation */}
      <EmployeeMobileNav />
    </div>
  );
};