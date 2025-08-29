import React, { useMemo } from 'react';
import { 
  DocumentTextIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { InstrumentsStats as StatsType } from '../types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface InstrumentsStatsProps {
  stats: StatsType;
  loading?: boolean;
  error?: string | null;
}

export const InstrumentsStats = React.memo<InstrumentsStatsProps>(({ stats, loading, error }) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">
          Failed to load statistics: {error}
        </div>
      </div>
    );
  }

  const formatNumber = useMemo(() => (num: number) => num.toLocaleString(), []);
  
  // Get the most common security types for display
  const topSecurityTypes = useMemo(() => 
    Object.entries(stats.by_type)
      .filter(([, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3),
    [stats.by_type]
  );


  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
                  <DocumentTextIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Instruments</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_securities)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Securities</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.active_securities)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500">
                  <XCircleIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Cancelled Securities</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.cancelled_securities)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500">
                  <ChartBarIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Shares Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_shares_outstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Types Breakdown */}
      {topSecurityTypes.length > 0 && (
        <Card className="border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-200">
          <CardHeader 
            title="Securities by Type"
            icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
            className="pb-4"
          />
          <CardContent>
            <div className="space-y-3">
              {topSecurityTypes.map(([type, data]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      {type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{formatNumber(data.count)} instruments</span>
                    <span>{formatNumber(data.total_quantity)} total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stakeholder Types Breakdown */}
      {Object.keys(stats.by_stakeholder_type).length > 0 && (
        <Card className="border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-200">
          <CardHeader 
            title="Securities by Stakeholder Type"
            icon={<UserGroupIcon className="h-5 w-5 text-gray-400" />}
            className="pb-4"
          />
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.by_stakeholder_type)
                .filter(([, data]) => data.count > 0)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatNumber(data.count)} instruments</span>
                      <span>{formatNumber(data.total_quantity)} total</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

// Display name for debugging
InstrumentsStats.displayName = 'InstrumentsStats';