import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface IImportProgressProps {
  total: number;
  processed: number;
  status: 'idle' | 'processing' | 'complete' | 'error';
  errors: string[];
}

export const ImportProgress: React.FC<IImportProgressProps> = ({
  total,
  processed,
  status,
  errors
}) => {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-8 w-8 text-red-500" />;
      case 'processing':
        return (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return 'Importing data...';
      case 'complete':
        return errors.length > 0 ? 'Import completed with warnings' : 'Import completed successfully';
      case 'error':
        return 'Import failed';
      default:
        return 'Ready to import';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return errors.length > 0 ? 'text-yellow-600' : 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-center space-x-4">
        {getStatusIcon()}
        <div className="text-center">
          <h3 className={`text-lg font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {processed} of {total} records processed
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span className="text-gray-700">Progress</span>
          <span className="text-gray-900">{percentage}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              status === 'error'
                ? 'bg-red-500'
                : status === 'complete'
                ? errors.length > 0
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{total}</span>
        </div>
      </div>

      {/* Processing Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{total}</div>
          <div className="text-sm text-blue-800">Total Records</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{processed}</div>
          <div className="text-sm text-green-800">Processed</div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{errors.length}</div>
          <div className="text-sm text-red-800">Errors</div>
        </div>
      </div>

      {/* Real-time Activity Log */}
      {status === 'processing' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Import Activity</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-gray-600">
                Processing batch {Math.ceil(processed / 100)} of {Math.ceil(total / 100)}...
              </span>
            </div>
            
            {processed > 0 && (
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-600">
                  Successfully processed {processed} records
                </span>
              </div>
            )}
            
            {errors.length > 0 && (
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-600">
                  {errors.length} errors encountered
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Details */}
      {errors.length > 0 && status !== 'processing' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">
                Import Issues ({errors.length})
              </h4>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {status === 'complete' && errors.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">
                Import Successful
              </h4>
              <p className="mt-1 text-sm text-green-700">
                All {processed} records have been successfully imported to your cap table.
                You can now view and manage the imported data from your dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Tips */}
      {status === 'processing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                Import in Progress
              </h4>
              <p className="mt-1 text-sm text-blue-700">
                Please keep this window open while your data is being imported. 
                The process may take a few minutes depending on the size of your dataset.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};