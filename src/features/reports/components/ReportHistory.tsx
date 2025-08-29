import React from 'react';
import { 
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ReportHistoryProps } from '../types';
import { format } from 'date-fns';

export const ReportHistory: React.FC<ReportHistoryProps> = ({ 
  reports, 
  onDownload, 
  onDelete 
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'generating':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getReportTypeName = (reportType: string) => {
    const names: Record<string, string> = {
      cap_table_summary: 'Cap Table Summary',
      equity_breakdown: 'Equity Breakdown',
      valuation_summary: 'Valuation Summary',
      vesting_schedule: 'Vesting Schedule',
      transaction_history: 'Transaction History',
      tax_summary: 'Tax Summary',
      investor_update: 'Investor Update'
    };
    return names[reportType] || reportType;
  };

  if (reports.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No reports generated yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Generate your first report from the templates above to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Generated Reports</h3>
        <p className="mt-1 text-sm text-gray-500">
          Download and manage your previously generated reports
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Report
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Generated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Format
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {getStatusIcon(report.status)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {report.reportName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getReportTypeName(report.reportType)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>
                    {format(new Date(report.generatedAt), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(report.generatedAt), 'h:mm a')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {report.fileSize ? formatFileSize(report.fileSize) : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded uppercase">
                    {report.exportFormat}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {report.status === 'completed' && report.downloadUrl && (
                      <>
                        <button
                          onClick={() => onDownload(report.id)}
                          className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50"
                          title="Download Report"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                          title="Preview Report"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {report.status === 'generating' && (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
                        <span className="text-sm text-gray-500">Generating...</span>
                      </div>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(report.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete Report"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">
          Reports are automatically deleted after 30 days. Download important reports for long-term storage.
        </p>
      </div>
    </div>
  );
};