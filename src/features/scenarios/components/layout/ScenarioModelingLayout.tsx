/**
 * Responsive layout component for scenario modeling interface
 * Implements mobile-first design with progressive disclosure
 */

import React, { useState, useCallback } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

export interface ScenarioModelingLayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;
  errors?: React.ReactNode;
  className?: string;
}

export const ScenarioModelingLayout: React.FC<ScenarioModelingLayoutProps> = React.memo(({
  header,
  sidebar,
  main,
  errors,
  className = ''
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 lg:z-auto lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile close button */}
        <div className="absolute top-0 right-0 -mr-12 pt-2 lg:hidden">
          <button
            type="button"
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Sidebar content */}
        <div className="flex h-full flex-col overflow-y-auto">
          {sidebar}
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-80">
        {/* Mobile header with menu button */}
        <div className="sticky top-0 z-30 bg-white shadow-sm lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Scenario Modeling</h1>
            <div className="w-6" /> {/* Spacer for balance */}
          </div>
        </div>

        {/* Page header - hidden on mobile, shown on desktop */}
        <div className="hidden lg:block">
          {header}
        </div>

        {/* Error banner */}
        {errors && (
          <div className="relative z-20">
            {errors}
          </div>
        )}

        {/* Main content */}
        <main className="pb-8">
          {main}
        </main>
      </div>
    </div>
  );
});

ScenarioModelingLayout.displayName = 'ScenarioModelingLayout';