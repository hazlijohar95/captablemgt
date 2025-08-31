import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeePortalService } from '@/services/employeePortalService';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { EquityOverview } from './EquityOverview';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const EquityDashboard: React.FC = () => {
  const { employee } = useEmployeeAuth();

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employeeDashboard', employee?.id],
    queryFn: () => employeePortalService.getDashboardData(employee!.id, employee!.company_id),
    enabled: !!employee,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4">
          {/* Loading Header */}
          <div className="mb-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
          
          {/* Loading Cards */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 shadow-sm max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-gray-600 mb-4">
            We're having trouble loading your equity information. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 shadow-sm max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No Data Available
          </h2>
          <p className="text-gray-600">
            Your equity information is not yet available. Please contact your company administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back, {employee?.name?.split(' ')[0] || 'Employee'}
          </h1>
          <p className="text-gray-600">
            Here's your current equity overview
          </p>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Equity Value</p>
            <p className="text-xl font-bold text-blue-600">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(dashboardData.equity_value.total_current_value)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Vested Shares</p>
            <p className="text-xl font-bold text-green-600">
              {new Intl.NumberFormat('en-US').format(dashboardData.equity_summary.total_vested_shares)}
            </p>
          </div>
        </div>

        {/* Main Equity Overview */}
        <EquityOverview
          equitySummary={dashboardData.equity_summary}
          equityValue={dashboardData.equity_value}
          isLoading={false}
        />

        {/* Recent Activity Placeholder */}
        {dashboardData.recent_activity.length > 0 && (
          <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {dashboardData.recent_activity.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm text-gray-600">{activity.activity_type.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company Info */}
        <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Company Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Company</span>
              <span className="font-medium">{dashboardData.company_info.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Currency</span>
              <span className="font-medium">{dashboardData.company_info.primary_currency}</span>
            </div>
            {dashboardData.company_info.current_409a_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last 409A</span>
                <span className="font-medium">
                  {new Date(dashboardData.company_info.current_409a_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Data freshness indicator */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Data last updated: {new Date(dashboardData.equity_summary.summary_updated_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};