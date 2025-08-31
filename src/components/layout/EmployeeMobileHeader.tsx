import React, { useState } from 'react';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { EmployeeProfile } from '@/types/employeePortal';

interface EmployeeMobileHeaderProps {
  employee: EmployeeProfile | null;
}

export const EmployeeMobileHeader: React.FC<EmployeeMobileHeaderProps> = ({ employee }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { logout } = useEmployeeAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Company Logo/Name */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {employee?.name?.charAt(0) || 'E'}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                Employee Portal
              </h1>
            </div>
          </div>

          {/* Right: Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <User className="w-6 h-6 text-gray-600" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-100">
                  <p className="font-medium text-gray-900 truncate">
                    {employee?.name || 'Employee'}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {employee?.email}
                  </p>
                  {employee?.job_title && (
                    <p className="text-xs text-gray-400 truncate">
                      {employee.job_title}
                    </p>
                  )}
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop for mobile menu */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </header>
  );
};