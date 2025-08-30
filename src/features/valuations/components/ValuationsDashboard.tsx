/**
 * 409A Valuations Dashboard
 * Main interface for managing IRS Section 409A valuations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

import { PageLayout, Card, CardHeader, CardContent, Button, StatCard } from '@/components/ui';
import { PaginatedVirtualizedTable, EnhancedColumn } from '@/components/tables/PaginatedVirtualizedTable';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { use409AValuations } from '@/hooks/use409AValuations';
import { Valuation409A, ValuationStatus } from '@/types/valuation409a';
import { STAT_CARD_COLORS } from '@/constants';

interface ValuationsDashboardProps {
  className?: string;
}

export const ValuationsDashboard: React.FC<ValuationsDashboardProps> = ({ 
  className = '' 
}) => {
  const { companyId } = useCompanyContext();
  const [selectedStatus, setSelectedStatus] = useState<ValuationStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    valuations,
    loading,
    error,
    summaryStats,
    currentValuation,
    pagination,
    filters,
    setFilters,
    refetch
  } = use409AValuations(companyId, {
    status: selectedStatus || undefined
  });

  // Format functions
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: ValuationStatus) => {
    const statusConfig = {
      'DRAFT': { color: 'bg-gray-100 text-gray-800', icon: PencilIcon },
      'UNDER_REVIEW': { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      'BOARD_APPROVED': { color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
      'FINAL': { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      'SUPERSEDED': { color: 'bg-gray-100 text-gray-500', icon: ClockIcon },
      'REJECTED': { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getComplianceBadge = (valuation: Valuation409A) => {
    if (valuation.safe_harbor_qualified) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Safe Harbor
        </span>
      );
    } else if (valuation.presumption_of_reasonableness) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Presumption
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          Standard
        </span>
      );
    }
  };

  // Define table columns
  const columns: EnhancedColumn<Valuation409A>[] = useMemo(() => [
    {
      key: 'valuation_date',
      header: 'Valuation Date',
      width: 140,
      sortable: true,
      render: (valuation) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {formatDate(valuation.valuation_date)}
          </div>
          <div className="text-gray-500 text-xs">
            v{valuation.version}
          </div>
        </div>
      )
    },
    {
      key: 'fair_market_value_per_share',
      header: 'FMV per Share',
      width: 140,
      align: 'right' as const,
      sortable: true,
      render: (valuation) => (
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(valuation.fair_market_value_per_share)}
          </div>
        </div>
      )
    },
    {
      key: 'effective_period',
      header: 'Effective Period',
      width: 180,
      render: (valuation) => (
        <div className="text-sm">
          <div className="text-gray-900">
            {formatDate(valuation.effective_period_start)}
          </div>
          <div className="text-gray-500 text-xs">
            {valuation.effective_period_end 
              ? `to ${formatDate(valuation.effective_period_end)}`
              : 'Ongoing'
            }
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 140,
      sortable: true,
      render: (valuation) => getStatusBadge(valuation.status)
    },
    {
      key: 'compliance',
      header: 'Compliance',
      width: 120,
      render: (valuation) => getComplianceBadge(valuation)
    },
    {
      key: 'appraiser',
      header: 'Appraiser',
      width: 180,
      render: (valuation) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {valuation.appraiser_name}
          </div>
          {valuation.appraiser_firm && (
            <div className="text-gray-500 text-xs">
              {valuation.appraiser_firm}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'valuation_method',
      header: 'Method',
      width: 120,
      render: (valuation) => (
        <span className="text-xs text-gray-600">
          {valuation.valuation_method.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 100,
      align: 'center' as const,
      render: (valuation) => (
        <div className="flex items-center justify-center space-x-2">
          <button
            className="text-blue-600 hover:text-blue-900 p-1"
            title="View details"
            onClick={() => handleViewValuation(valuation.id)}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {valuation.status !== 'FINAL' && (
            <button
              className="text-gray-600 hover:text-gray-900 p-1"
              title="Edit valuation"
              onClick={() => handleEditValuation(valuation.id)}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ], []);

  // Event handlers
  const handleViewValuation = (valuationId: string) => {
    // Navigate to valuation details
    console.log('View valuation:', valuationId);
  };

  const handleEditValuation = (valuationId: string) => {
    // Navigate to valuation edit form
    console.log('Edit valuation:', valuationId);
  };

  const handleCreateValuation = () => {
    setShowCreateModal(true);
  };

  const handleStatusFilter = (status: ValuationStatus | '') => {
    setSelectedStatus(status);
    setFilters({
      ...filters,
      status: status || undefined
    });
  };

  if (error) {
    return (
      <PageLayout className={className}>
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error Loading Valuations
              </h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout className={className}>
      <PageLayout.Header
        title="409A Valuations"
        description="Manage IRS Section 409A fair market value determinations"
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Compliance Report
            </Button>
            <Button onClick={handleCreateValuation}>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Valuation
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Current Valuation Alert */}
        {!currentValuation && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    No Current 409A Valuation
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You don't have a current effective 409A valuation. This may impact your ability to 
                    grant stock options or other equity compensation.
                  </p>
                  <div className="mt-3">
                    <Button size="sm" onClick={handleCreateValuation}>
                      Create Valuation
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Valuations"
            value={summaryStats?.total_valuations?.toString() || '0'}
            icon={<ChartBarIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.BLUE}
            subtitle={`${summaryStats?.active_valuations || 0} active`}
          />
          
          <StatCard
            title="Current FMV"
            value={currentValuation 
              ? formatCurrency(currentValuation.fair_market_value_per_share)
              : 'N/A'
            }
            icon={<DocumentTextIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.GREEN}
            subtitle={currentValuation 
              ? `Effective ${formatDate(currentValuation.effective_period_start)}`
              : 'No current valuation'
            }
          />
          
          <StatCard
            title="Compliance Score"
            value={`${summaryStats?.compliance_percentage || 0}%`}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            iconBgColor={summaryStats?.compliance_percentage >= 80 
              ? STAT_CARD_COLORS.GREEN 
              : STAT_CARD_COLORS.YELLOW
            }
            subtitle="IRS compliance rating"
          />
          
          <StatCard
            title="Next Review"
            value={summaryStats?.next_expiring_valuation 
              ? formatDate(summaryStats.next_expiring_valuation)
              : 'TBD'
            }
            icon={<ClockIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.PURPLE}
            subtitle="Upcoming expiration"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">
                  Filter by status:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusFilter(e.target.value as ValuationStatus | '')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="BOARD_APPROVED">Board Approved</option>
                  <option value="FINAL">Final</option>
                  <option value="SUPERSEDED">Superseded</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {pagination.totalItems} valuations
                </span>
                {loading && (
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valuations Table */}
        <Card>
          <CardHeader
            title="All Valuations"
            description="Historical and current 409A valuations with compliance status"
          />
          <CardContent className="p-0">
            <PaginatedVirtualizedTable
              columns={columns}
              pagination={{
                data: valuations,
                pagination,
                loading,
                error: null,
                refetch,
                setPage: () => {}, // Would be implemented with proper pagination hook
                setPageSize: () => {},
                setSort: () => {},
                setFilters: () => {}
              }}
              height={600}
              rowHeight={64}
              emptyMessage="No valuations found. Create your first 409A valuation to get started."
              showPageControls={true}
              pageSizeOptions={[25, 50, 100]}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ValuationsDashboard;