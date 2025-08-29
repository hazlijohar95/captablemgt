import React, { useCallback } from 'react';
import { 
  EyeIcon,
  PencilIcon,
  XCircleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  HashtagIcon,
  UserIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { SecuritySummary } from '../types';

interface InstrumentsTableMobileProps {
  securities: SecuritySummary[];
  loading?: boolean;
  onEdit?: (security: SecuritySummary) => void;
  onCancel?: (security: SecuritySummary) => void;
  onViewDetails?: (security: SecuritySummary) => void;
}

export const InstrumentsTableMobile = React.memo<InstrumentsTableMobileProps>(({ 
  securities, 
  loading,
  onEdit, 
  onCancel, 
  onViewDetails 
}) => {
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const formatNumber = useCallback((num: number) => num.toLocaleString(), []);

  const getSecurityTypeColor = useCallback((type: string) => {
    const colors = {
      EQUITY: 'bg-blue-100 text-blue-800 border-blue-200',
      OPTION: 'bg-green-100 text-green-800 border-green-200',
      RSU: 'bg-purple-100 text-purple-800 border-purple-200',
      WARRANT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      SAFE: 'bg-orange-100 text-orange-800 border-orange-200',
      NOTE: 'bg-pink-100 text-pink-800 border-pink-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  const getStatusColor = useCallback((status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  }, []);

  if (securities.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <DocumentIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No instruments found</h3>
        <p className="text-gray-500 mb-4">
          Start building your cap table by issuing securities to stakeholders.
        </p>
        <div className="text-sm text-gray-400">
          💡 Tip: Use the "Issue Securities" button above to get started
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {securities.map((security) => (
        <div
          key={security.id}
          className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow duration-150"
        >
          {/* Header Row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {security.stakeholder_name}
                </h3>
              </div>
              <p className="text-xs text-gray-500">{security.stakeholder_type}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-1 ml-2">
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(security)}
                  className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors duration-150"
                  title="View Details"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              )}
              
              {onEdit && security.status === 'active' && (
                <button
                  onClick={() => onEdit(security)}
                  className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors duration-150"
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
              
              {onCancel && (
                <button
                  onClick={() => onCancel(security)}
                  className={`p-2 rounded-md transition-colors duration-150 ${
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
          </div>

          {/* Security Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-2">
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <span className="text-xs text-gray-500">Type</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSecurityTypeColor(security.type)}`}>
                  {security.type}
                </span>
              </div>
              
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <HashtagIcon className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Quantity</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatNumber(security.quantity)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <span className="text-xs text-gray-500">Status</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(security.status)}`}>
                  {security.status}
                </span>
              </div>
              
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <CalendarDaysIcon className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Issue Date</span>
                </div>
                <p className="text-sm text-gray-900">
                  {formatDate(security.issued_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Share Class Info */}
          {security.share_class_name && (
            <div className="border-t border-gray-100 pt-2 mb-2">
              <div className="flex items-center space-x-1 mb-1">
                <span className="text-xs text-gray-500">Share Class</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {security.share_class_name}
                </span>
                {security.share_class_type && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {security.share_class_type}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Terms */}
          {security.terms && Object.keys(security.terms).length > 0 && (
            <div className="border-t border-gray-100 pt-2">
              <div className="flex items-center space-x-1 mb-1">
                <span className="text-xs text-gray-500">Terms</span>
              </div>
              <div className="space-y-1">
                {security.terms.strikePrice && (
                  <div className="text-sm text-gray-900">
                    Strike: <span className="font-medium">${parseFloat(security.terms.strikePrice).toFixed(2)}</span>
                  </div>
                )}
                {security.terms.expirationDate && (
                  <div className="text-sm text-gray-600">
                    Exp: {formatDate(security.terms.expirationDate)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-center items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          <span className="text-sm text-gray-600">Updating data...</span>
        </div>
      )}
    </div>
  );
});

// Display name for debugging
InstrumentsTableMobile.displayName = 'InstrumentsTableMobile';