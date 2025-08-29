import React from 'react';
import { ICapTableStakeholder } from '@/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { StatCard, Button, PageLayout, Card, CardHeader, CardContent } from '@/components/ui';
import { useCapTableData } from '@/hooks/useCapTableData';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { STAT_CARD_COLORS } from '@/constants';
import {
  ChartBarIcon,
  TrophyIcon,
  CogIcon,
  UsersIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export const CapTable = React.memo(() => {
  const { companyId } = useCompanyContext();
  
  const { capTableData, loading, error, refreshCapTable } = useCapTableData(companyId);

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const getSecurityDisplay = (stakeholder: ICapTableStakeholder) => {
    const securities = [];
    if (stakeholder.securities.common) securities.push(`${formatNumber(stakeholder.securities.common)} Common`);
    if (stakeholder.securities.preferred) securities.push(`${formatNumber(stakeholder.securities.preferred)} Preferred`);
    if (stakeholder.securities.options) securities.push(`${formatNumber(stakeholder.securities.options)} Options`);
    if (stakeholder.securities.rsus) securities.push(`${formatNumber(stakeholder.securities.rsus)} RSUs`);
    if (stakeholder.securities.warrants) securities.push(`${formatNumber(stakeholder.securities.warrants)} Warrants`);
    if (stakeholder.securities.safes) securities.push(`${formatNumber(stakeholder.securities.safes)} SAFEs`);
    if (stakeholder.securities.notes) securities.push(`${formatNumber(stakeholder.securities.notes)} Notes`);
    
    return securities.length > 0 ? securities.join(', ') : 'No securities';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <ErrorMessage 
          message={error}
          onRetry={refreshCapTable}
        />
      </div>
    );
  }

  if (!capTableData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No cap table data available</p>
      </div>
    );
  }

  return (
    <PageLayout>
      <PageLayout.Header
        title="Cap Table"
        description={`Ownership summary as of ${new Date(capTableData.asOf).toLocaleDateString()}`}
      />
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <StatCard
            title="Common Shares"
            value={formatNumber(capTableData.totals.common)}
            icon={<ChartBarIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.BLUE}
          />
          <StatCard
            title="Preferred Shares"
            value={formatNumber(capTableData.totals.preferred)}
            icon={<TrophyIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.PURPLE}
          />
          <StatCard
            title="Options Granted"
            value={formatNumber(capTableData.totals.optionsGranted)}
            icon={<CogIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.GREEN}
          />
          <StatCard
            title="Total Stakeholders"
            value={capTableData.stakeholders.length}
            icon={<UsersIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.GRAY}
          />
        </div>

        {/* Stakeholders Table */}
        <Card className="border-gray-200 rounded-lg">
          <CardHeader
            title="Stakeholders"
            description="List of all stakeholders and their ownership details"
            actions={
              <Button>
                Add Stakeholder
              </Button>
            }
          />
          <CardContent className="p-0">
            {capTableData.stakeholders.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No stakeholders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first stakeholder.
                </p>
                <div className="mt-6">
                  <Button>
                    Add Stakeholder
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Securities
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Shares
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ownership %
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {capTableData.stakeholders.map((stakeholder) => (
                      <tr key={stakeholder.stakeholderId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {stakeholder.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {stakeholder.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {getSecurityDisplay(stakeholder)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatNumber(stakeholder.asConverted)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatPercentage(stakeholder.ownershipPct)}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${Math.min(stakeholder.ownershipPct * 100, 100)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-primary-600 hover:text-primary-900 inline-flex items-center">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
});