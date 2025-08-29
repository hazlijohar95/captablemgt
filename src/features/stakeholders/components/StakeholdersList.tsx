import React, { useState } from 'react';
import { 
  PlusIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentPlusIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { PageLayout, Card, CardHeader, Button } from '@/components/ui';
import { AddStakeholderModal } from './AddStakeholderModal';
import { EditStakeholderModal } from './EditStakeholderModal';
import { ViewStakeholderModal } from './ViewStakeholderModal';
import { IssueSecurityModal } from '@/features/securities/components/IssueSecurityModal';
import { useStakeholdersData } from '@/hooks/useStakeholdersData';
import { useCompanyContext } from '@/hooks/useCompanyContext';

type StakeholderWithRelations = {
  id: string;
  type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
  entity_name: string | null;
  tax_id: string | null;
  created_at: string;
  people?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  securities: {
    id: string;
    type: string;
    quantity: number;
    issued_at: string;
    cancelled_at: string | null;
  }[];
};

export const StakeholdersList = React.memo(() => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<{ id: string; name: string } | null>(null);
  const { companyId, hasCompany } = useCompanyContext();
  
  const { stakeholders, loading, error, refreshStakeholders } = useStakeholdersData(companyId);

  const getStakeholderName = (stakeholder: StakeholderWithRelations) => {
    return stakeholder.people?.name || stakeholder.entity_name || 'Unknown';
  };

  const getStakeholderIcon = (type: string) => {
    switch (type) {
      case 'ENTITY':
        return <BuildingOfficeIcon className="h-5 w-5" />;
      default:
        return <UserIcon className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FOUNDER':
        return 'bg-blue-100 text-blue-800';
      case 'INVESTOR':
        return 'bg-green-100 text-green-800';
      case 'EMPLOYEE':
        return 'bg-purple-100 text-purple-800';
      case 'ENTITY':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalShares = (stakeholder: StakeholderWithRelations) => {
    return stakeholder.securities
      .filter(s => !s.cancelled_at)
      .reduce((sum, security) => sum + security.quantity, 0);
  };

  // Show message if user hasn't created a company yet
  if (!hasCompany && !loading) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No company selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please create or select a company to manage stakeholders.
          </p>
          <div className="mt-6">
            <Button
              variant="primary"
              onClick={() => window.location.href = '/'}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto">
          <ErrorMessage 
            message={error}
            onRetry={refreshStakeholders}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayout.Header
        title="Stakeholders"
        description="Manage company stakeholders and their equity holdings"
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Stakeholder
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Stakeholders</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stakeholders.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-500 bg-opacity-10">
              <UserIcon className="h-6 w-6 text-gray-500" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Individuals</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stakeholders.filter(s => s.type !== 'ENTITY').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500 bg-opacity-10">
              <UserIcon className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Entities</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stakeholders.filter(s => s.type === 'ENTITY').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500 bg-opacity-10">
              <BuildingOfficeIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Stakeholders List */}
      <Card noPadding>
        <CardHeader 
          title="All Stakeholders"
          description="Complete list of individuals and entities with equity holdings"
          icon={<UserIcon className="h-5 w-5 text-gray-400" />}
          badge={
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {stakeholders.length} total
            </span>
          }
        />
        
        {stakeholders.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stakeholders</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first stakeholder.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Stakeholder
              </button>
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Securities
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Shares
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stakeholders.map((stakeholder) => (
                  <tr key={stakeholder.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                            {getStakeholderIcon(stakeholder.type)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getStakeholderName(stakeholder)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(stakeholder.type)}`}>
                        {stakeholder.type.toLowerCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stakeholder.people?.email ? (
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {stakeholder.people.email}
                          </div>
                          {stakeholder.people.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {stakeholder.people.phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No contact info</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {stakeholder.securities.filter(s => !s.cancelled_at).length} active
                      </div>
                      <div className="text-sm text-gray-500">
                        {stakeholder.securities.length} total
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getTotalShares(stakeholder).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedStakeholder({ 
                              id: stakeholder.id, 
                              name: getStakeholderName(stakeholder) 
                            });
                            setShowIssueModal(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700"
                        >
                          <DocumentPlusIcon className="h-3.5 w-3.5 mr-1" />
                          Issue
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStakeholder({ 
                              id: stakeholder.id, 
                              name: getStakeholderName(stakeholder) 
                            });
                            setShowEditModal(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <PencilIcon className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStakeholder({ 
                              id: stakeholder.id, 
                              name: getStakeholderName(stakeholder) 
                            });
                            setShowViewModal(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-3.5 w-3.5 mr-1" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Stakeholder Modal */}
      <AddStakeholderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refreshStakeholders}
      />

      {/* Edit Stakeholder Modal */}
      <EditStakeholderModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStakeholder(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setSelectedStakeholder(null);
          refreshStakeholders();
        }}
        stakeholderId={selectedStakeholder?.id || null}
      />

      {/* View Stakeholder Modal */}
      <ViewStakeholderModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedStakeholder(null);
        }}
        stakeholderId={selectedStakeholder?.id || null}
        onEdit={(stakeholderId) => {
          setSelectedStakeholder({ id: stakeholderId, name: selectedStakeholder?.name || '' });
          setShowViewModal(false);
          setShowEditModal(true);
        }}
      />
      
      {/* Issue Security Modal */}
      <IssueSecurityModal
        isOpen={showIssueModal}
        onClose={() => {
          setShowIssueModal(false);
          setSelectedStakeholder(null);
        }}
        onSuccess={() => {
          setShowIssueModal(false);
          setSelectedStakeholder(null);
          refreshStakeholders();
        }}
        stakeholderId={selectedStakeholder?.id}
        stakeholderName={selectedStakeholder?.name}
      />
    </PageLayout>
  );
});