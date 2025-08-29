import React, { useMemo, useCallback } from 'react';
import { 
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  PencilIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SecuritySummary, InstrumentsSort } from '../types';

interface InstrumentsTableProps {
  securities: SecuritySummary[];
  loading?: boolean;
  sort?: InstrumentsSort;
  onSortChange?: (sort: InstrumentsSort) => void;
  onEdit?: (security: SecuritySummary) => void;
  onCancel?: (security: SecuritySummary) => void;
  onViewDetails?: (security: SecuritySummary) => void;
}

export const InstrumentsTable = React.memo<InstrumentsTableProps>(({ 
  securities, 
  loading, 
  sort,
  onSortChange,
  onEdit, 
  onCancel, 
  onViewDetails 
}) => {
  // Memoize formatting functions to prevent recreation on every render
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const formatNumber = useCallback((num: number) => num.toLocaleString(), []);

  // Memoize color functions with static objects
  const securityTypeColors = useMemo(() => ({
    EQUITY: 'bg-blue-100 text-blue-800',
    OPTION: 'bg-green-100 text-green-800',
    RSU: 'bg-purple-100 text-purple-800',
    WARRANT: 'bg-yellow-100 text-yellow-800',
    SAFE: 'bg-orange-100 text-orange-800',
    NOTE: 'bg-pink-100 text-pink-800'
  }), []);

  const getSecurityTypeColor = useCallback((type: string) => {
    return securityTypeColors[type as keyof typeof securityTypeColors] || 'bg-gray-100 text-gray-800';
  }, [securityTypeColors]);

  const getStatusColor = useCallback((status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  }, []);

  // Memoize valid sort fields to prevent recreation
  const validSortFields = useMemo(() => ['issued_at', 'quantity', 'type', 'stakeholder_name'], []);

  const handleSort = useCallback((field: keyof SecuritySummary) => {
    if (!onSortChange || !sort) return;
    
    if (!validSortFields.includes(field as string)) return;

    const newDirection = 
      sort.field === field && sort.direction === 'desc' ? 'asc' : 'desc';
    
    onSortChange({
      field: field as any,
      direction: newDirection
    });
  }, [onSortChange, sort, validSortFields]);

  const getSortIcon = useCallback((field: string) => {
    if (!sort || sort.field !== field) {
      return <ChevronUpDownIcon className="h-4 w-4" />;
    }
    
    return sort.direction === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4" />
      : <ChevronDownIcon className="h-4 w-4" />;
  }, [sort]);

  // Memoize SortableHeader component to prevent unnecessary re-renders
  const SortableHeader = useMemo(() => 
    React.memo<{ field: keyof SecuritySummary; children: React.ReactNode }>(({ field, children }) => (
      <th 
        onClick={() => handleSort(field)}
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors duration-150"
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {getSortIcon(field as string)}
        </div>
      </th>
    )), [handleSort, getSortIcon]);

  // Skeleton loading component
  const SkeletonRow = useMemo(() => () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="mt-1 h-3 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </div>
      </td>
    </tr>
  ), []);

  if (loading && securities.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stakeholder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Share Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terms</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (securities.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="text-center py-16 px-6">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No instruments found</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Start building your cap table by issuing your first security to stakeholders.
          </p>
          <div className="text-sm text-gray-400">
            💡 Tip: Use the "Issue Securities" button above to get started
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader field="stakeholder_name">Stakeholder</SortableHeader>
              <SortableHeader field="type">Type</SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Share Class
              </th>
              <SortableHeader field="quantity">Quantity</SortableHeader>
              <SortableHeader field="issued_at">Issue Date</SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Terms
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {securities.map((security) => (
              <tr key={security.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {security.stakeholder_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {security.stakeholder_type}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSecurityTypeColor(security.type)}`}>
                    {security.type}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {security.share_class_name ? (
                    <div>
                      <div>{security.share_class_name}</div>
                      <div className="text-xs text-gray-500">{security.share_class_type}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatNumber(security.quantity)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(security.issued_at)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(security.status)}`}>
                    {security.status}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {security.terms && Object.keys(security.terms).length > 0 ? (
                    <div className="space-y-1">
                      {security.terms.strikePrice && (
                        <div>Strike: ${parseFloat(security.terms.strikePrice).toFixed(2)}</div>
                      )}
                      {security.terms.expirationDate && (
                        <div className="text-xs">
                          Exp: {formatDate(security.terms.expirationDate)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                    {onViewDetails && (
                      <button
                        onClick={() => onViewDetails(security)}
                        className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors duration-150"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {onEdit && security.status === 'active' && (
                      <button
                        onClick={() => onEdit(security)}
                        className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors duration-150"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {onCancel && (
                      <button
                        onClick={() => onCancel(security)}
                        className={`p-1.5 rounded-md transition-colors duration-150 ${
                          security.status === 'active' 
                            ? "text-red-600 hover:text-red-900 hover:bg-red-50" 
                            : "text-green-600 hover:text-green-900 hover:bg-green-50"
                        }`}
                        title={security.status === 'active' ? 'Cancel Security' : 'Reactivate Security'}
                      >
                        {security.status === 'active' ? (
                          <XCircleIcon className="h-4 w-4" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && securities.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex justify-center items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-600">Updating data...</span>
        </div>
      )}
    </div>
  );
});

// Display name for debugging
InstrumentsTable.displayName = 'InstrumentsTable';