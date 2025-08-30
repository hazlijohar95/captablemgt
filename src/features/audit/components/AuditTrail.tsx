/**
 * Comprehensive Audit Trail Viewer
 * Displays audit logs with filtering, search, and compliance reporting
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  UserIcon,
  ClockIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

import { 
  PageLayout, 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  Input 
} from '@/components/ui';
import { PaginatedVirtualizedTable, EnhancedColumn } from '@/components/tables/PaginatedVirtualizedTable';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { 
  AuditLogEntry, 
  AuditEventType, 
  AuditEntityType,
  AuditTrailFilters,
  DataClassification 
} from '@/types/valuation409a';
import { auditService } from '@/services/auditService';

interface AuditTrailProps {
  entityType?: AuditEntityType;
  entityId?: string;
  className?: string;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  entityType,
  entityId,
  className = ''
}) => {
  const { companyId } = useCompanyContext();
  
  // State
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [selectedEventType, setSelectedEventType] = useState<AuditEventType | ''>('');
  const [selectedEntityType, setSelectedEntityType] = useState<AuditEntityType | ''>(entityType || '');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<DataClassification | ''>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Summary stats
  const [summaryStats, setSummaryStats] = useState<any>(null);

  // Fetch audit trail
  const fetchAuditTrail = async () => {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const filters: AuditTrailFilters = {
        entity_type: selectedEntityType || undefined,
        entity_id: entityId,
        event_type: selectedEventType || undefined,
        user_id: selectedUserId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        data_classification: selectedClassification || undefined
      };

      const response = await auditService.getAuditTrail(
        companyId,
        filters,
        page,
        pageSize
      );
      
      setAuditEntries(response.entries);
      setTotalItems(response.pagination.totalItems);
      setTotalPages(response.pagination.totalPages);
      setSummaryStats(response.summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audit trail';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and dependency updates
  useEffect(() => {
    fetchAuditTrail();
  }, [
    companyId, 
    selectedEventType, 
    selectedEntityType, 
    selectedUserId, 
    dateFrom, 
    dateTo, 
    selectedClassification,
    page, 
    pageSize
  ]);

  // Format functions
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventTypeIcon = (eventType: AuditEventType) => {
    const iconMap = {
      'CREATE': PencilIcon,
      'UPDATE': PencilIcon,
      'DELETE': TrashIcon,
      'VIEW': EyeIcon,
      'LOGIN': UserIcon,
      'LOGOUT': UserIcon,
      'EXPORT': DocumentArrowDownIcon,
      'CALCULATION': ClockIcon,
      'PERMISSION_CHANGE': ShieldCheckIcon,
      'BULK_OPERATION': ClockIcon,
      'REPORT_GENERATION': DocumentArrowDownIcon
    };
    
    const IconComponent = iconMap[eventType] || ClockIcon;
    return <IconComponent className="h-4 w-4" />;
  };

  const getEventTypeColor = (eventType: AuditEventType) => {
    const colorMap = {
      'CREATE': 'text-green-600 bg-green-50',
      'UPDATE': 'text-blue-600 bg-blue-50',
      'DELETE': 'text-red-600 bg-red-50',
      'VIEW': 'text-gray-600 bg-gray-50',
      'LOGIN': 'text-purple-600 bg-purple-50',
      'LOGOUT': 'text-purple-600 bg-purple-50',
      'EXPORT': 'text-orange-600 bg-orange-50',
      'CALCULATION': 'text-indigo-600 bg-indigo-50',
      'PERMISSION_CHANGE': 'text-red-600 bg-red-50',
      'BULK_OPERATION': 'text-yellow-600 bg-yellow-50',
      'REPORT_GENERATION': 'text-teal-600 bg-teal-50'
    };
    
    return colorMap[eventType] || 'text-gray-600 bg-gray-50';
  };

  const getClassificationBadge = (classification: DataClassification) => {
    const config = {
      'PUBLIC': 'bg-green-100 text-green-800',
      'INTERNAL': 'bg-blue-100 text-blue-800',
      'CONFIDENTIAL': 'bg-yellow-100 text-yellow-800',
      'RESTRICTED': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config[classification]}`}>
        {classification}
      </span>
    );
  };

  // Define table columns
  const columns: EnhancedColumn<AuditLogEntry>[] = useMemo(() => [
    {
      key: 'occurred_at',
      header: 'Date/Time',
      width: 160,
      sortable: true,
      render: (entry) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {formatDateTime(entry.occurred_at).split(' ')[0]}
          </div>
          <div className="text-gray-500 text-xs">
            {formatDateTime(entry.occurred_at).split(' ')[1]}
          </div>
        </div>
      )
    },
    {
      key: 'event_type',
      header: 'Event',
      width: 120,
      render: (entry) => (
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(entry.event_type)}`}>
            {getEventTypeIcon(entry.event_type)}
            <span className="ml-1">{entry.event_type}</span>
          </span>
        </div>
      )
    },
    {
      key: 'entity_type',
      header: 'Entity',
      width: 140,
      render: (entry) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {entry.entity_type.replace('_', ' ')}
          </div>
          <div className="text-gray-500 text-xs font-mono">
            {entry.entity_id.slice(0, 8)}...
          </div>
        </div>
      )
    },
    {
      key: 'user_info',
      header: 'User',
      width: 180,
      render: (entry) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {entry.user_email || 'System'}
          </div>
          {entry.user_role && (
            <div className="text-gray-500 text-xs">
              {entry.user_role}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'change_summary',
      header: 'Description',
      width: 300,
      render: (entry) => (
        <div className="text-sm text-gray-900">
          {entry.change_summary || 'No description available'}
        </div>
      )
    },
    {
      key: 'classification',
      header: 'Classification',
      width: 120,
      render: (entry) => getClassificationBadge(entry.data_classification)
    },
    {
      key: 'details',
      header: 'Details',
      width: 80,
      align: 'center' as const,
      render: (entry) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleViewDetails(entry)}
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
      )
    }
  ], []);

  // Event handlers
  const handleViewDetails = (entry: AuditLogEntry) => {
    // Would open a modal with detailed audit entry information
    console.log('View audit details:', entry);
  };

  const handleExportAuditTrail = async () => {
    try {
      const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = dateTo || new Date().toISOString().split('T')[0];
      
      const exportData = await auditService.exportAuditData(companyId, fromDate, toDate, 'JSON');
      
      // Create download
      const blob = new Blob([JSON.stringify(exportData.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportData.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit trail:', error);
    }
  };

  const resetFilters = () => {
    setSelectedEventType('');
    setSelectedEntityType(entityType || '');
    setSelectedUserId('');
    setDateFrom('');
    setDateTo('');
    setSelectedClassification('');
    setSearchQuery('');
    setPage(1);
  };

  if (error) {
    return (
      <PageLayout className={className}>
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error Loading Audit Trail
            </h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchAuditTrail} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout className={className}>
      <PageLayout.Header
        title="Audit Trail"
        description="Comprehensive activity log and compliance monitoring"
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportAuditTrail}>
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Summary Stats */}
        {summaryStats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Total Events</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryStats.total_events.toLocaleString()}
                    </p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Unique Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryStats.unique_users}
                    </p>
                  </div>
                  <UserIcon className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Entities Modified</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryStats.unique_entities}
                    </p>
                  </div>
                  <PencilIcon className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Security Events</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(summaryStats.event_type_breakdown?.PERMISSION_CHANGE || 0) + 
                       (summaryStats.event_type_breakdown?.LOGIN || 0)}
                    </p>
                  </div>
                  <ShieldCheckIcon className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader
            title="Filters"
            description="Filter audit entries by type, user, date range, and classification"
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value as AuditEventType | '')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Events</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                  <option value="VIEW">View</option>
                  <option value="EXPORT">Export</option>
                  <option value="LOGIN">Login</option>
                  <option value="LOGOUT">Logout</option>
                  <option value="PERMISSION_CHANGE">Permission Change</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity Type
                </label>
                <select
                  value={selectedEntityType}
                  onChange={(e) => setSelectedEntityType(e.target.value as AuditEntityType | '')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Entities</option>
                  <option value="VALUATION_409A">409A Valuations</option>
                  <option value="STAKEHOLDER">Stakeholders</option>
                  <option value="SECURITY">Securities</option>
                  <option value="TRANSACTION">Transactions</option>
                  <option value="USER">Users</option>
                  <option value="REPORT">Reports</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classification
                </label>
                <select
                  value={selectedClassification}
                  onChange={(e) => setSelectedClassification(e.target.value as DataClassification | '')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Classifications</option>
                  <option value="PUBLIC">Public</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Trail Table */}
        <Card>
          <CardHeader
            title="Activity Log"
            description={`${totalItems} events found`}
          />
          <CardContent className="p-0">
            <PaginatedVirtualizedTable
              columns={columns}
              pagination={{
                data: auditEntries,
                pagination: {
                  page,
                  pageSize,
                  totalItems,
                  totalPages,
                  hasNext: page < totalPages,
                  hasPrevious: page > 1
                },
                loading,
                error: null,
                refetch: fetchAuditTrail,
                setPage,
                setPageSize,
                setSort: () => {},
                setFilters: () => {}
              }}
              height={600}
              rowHeight={56}
              emptyMessage="No audit entries found for the selected filters."
              showPageControls={true}
              pageSizeOptions={[25, 50, 100, 200]}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default AuditTrail;