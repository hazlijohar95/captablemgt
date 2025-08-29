import React, { useState } from 'react';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useInstruments } from '../hooks/useInstruments';
import { InstrumentsFilters } from './InstrumentsFilters';
import { InstrumentsTableResponsive } from './InstrumentsTableResponsive';
import { InstrumentsStats } from './InstrumentsStats';
// Modal will be provided via props for better decoupling
// import { IssueSecurityModal } from '@/features/securities/components/IssueSecurityModal';
import { PageLayout, Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SecuritySummary } from '../types';

interface InstrumentsPageProps {
  IssueModal?: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }>;
}

export function InstrumentsPage({ IssueModal }: InstrumentsPageProps = {}) {
  const { companyId } = useCompanyContext();
  const {
    securities,
    stats,
    loading,
    statsLoading,
    error,
    statsError,
    filters,
    sort,
    updateFilters,
    updateSort,
    refreshData,
    cancelSecurity,
    reactivateSecurity
  } = useInstruments(companyId);

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [, setSelectedSecurity] = useState<SecuritySummary | null>(null);

  const handleIssueNew = () => {
    setShowIssueModal(true);
  };

  const handleIssueSuccess = () => {
    setShowIssueModal(false);
    refreshData();
  };

  const handleEditSecurity = (security: SecuritySummary) => {
    setSelectedSecurity(security);
    // TODO: Implement edit modal
    console.log('Edit security:', security);
  };

  const handleCancelSecurity = async (security: SecuritySummary) => {
    try {
      if (security.status === 'cancelled') {
        await reactivateSecurity(security.id);
      } else {
        const confirmed = window.confirm(
          `Are you sure you want to cancel ${security.quantity} ${security.type} securities for ${security.stakeholder_name}?`
        );
        if (confirmed) {
          await cancelSecurity(security.id);
        }
      }
    } catch (error) {
      console.error('Failed to update security status:', error);
      // TODO: Add proper error handling/toast
    }
  };

  const handleViewDetails = (security: SecuritySummary) => {
    setSelectedSecurity(security);
    // TODO: Implement details modal
    console.log('View security details:', security);
  };

  if (loading && securities.length === 0) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error && securities.length === 0) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto">
          <ErrorMessage 
            message={error}
            onRetry={refreshData}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayout.Header
        title="Instruments"
        description={
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
            <span>Manage securities, stock options, and other instruments</span>
            {stats && (
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                <DocumentTextIcon className="mr-1.5 h-4 w-4 flex-shrink-0" />
                {stats.active_securities} active instruments
              </div>
            )}
          </div>
        }
        actions={
          <Button
            onClick={handleIssueNew}
            variant="primary"
            className="flex items-center hover:bg-indigo-700 transition-colors duration-200"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
            Issue Securities
          </Button>
        }
      />

      {/* Statistics Overview */}
      {stats && (
        <InstrumentsStats 
          stats={stats}
          loading={statsLoading}
          error={statsError}
        />
      )}

      {/* Filters */}
      <InstrumentsFilters
        filters={filters}
        onFiltersChange={updateFilters}
        stats={stats || undefined}
      />

      {/* Securities Table */}
      <InstrumentsTableResponsive
        securities={securities}
        loading={loading}
        onEdit={handleEditSecurity}
        onCancel={handleCancelSecurity}
        onViewDetails={handleViewDetails}
        sort={sort}
        onSortChange={updateSort}
      />

      {/* Modals */}
      {IssueModal && (
        <IssueModal
          isOpen={showIssueModal}
          onClose={() => setShowIssueModal(false)}
          onSuccess={handleIssueSuccess}
        />
      )}
    </PageLayout>
  );
}