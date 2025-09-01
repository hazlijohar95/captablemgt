import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeePortalService } from '@/services/employeePortalService';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { ProfileSettings } from '@/components/Employee/ProfileSettings';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ProfilePage: React.FC = () => {
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
          
          {/* Loading Profile Cards */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
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
            Unable to Load Profile
          </h2>
          <p className="text-gray-600 mb-4">
            We're having trouble loading your profile information. Please try again.
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Profile & Settings
          </h1>
          <p className="text-gray-600">
            Manage your personal information and preferences
          </p>
        </div>

        {/* Profile Settings Component */}
        <ProfileSettings preferences={dashboardData?.preferences} />
      </div>
    </div>
  );
};

export default ProfilePage;