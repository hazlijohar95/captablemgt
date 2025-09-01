import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  Eye, 
  Lock, 
  Calendar,
  Filter,
  Search,
  AlertCircle 
} from 'lucide-react';
import { employeePortalService } from '@/services/employeePortalService';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { EmployeeDocument, EmployeeDocumentType } from '@/types/employeePortal';

const DOCUMENT_TYPE_LABELS: Record<EmployeeDocumentType, string> = {
  'EQUITY_GRANT_LETTER': 'Equity Grant Letter',
  'OPTION_AGREEMENT': 'Option Agreement',
  'EXERCISE_FORM': 'Exercise Form',
  'TAX_DOCUMENT': 'Tax Document',
  'COMPANY_VALUATION': 'Company Valuation',
  'BOARD_RESOLUTION': 'Board Resolution',
  'VESTING_CERTIFICATE': 'Vesting Certificate',
  'EMPLOYMENT_CONTRACT': 'Employment Contract',
  'OTHER': 'Other Document'
};

const DOCUMENT_TYPE_ICONS: Record<EmployeeDocumentType, string> = {
  'EQUITY_GRANT_LETTER': '📄',
  'OPTION_AGREEMENT': '📋',
  'EXERCISE_FORM': '💹',
  'TAX_DOCUMENT': '🧾',
  'COMPANY_VALUATION': '📊',
  'BOARD_RESOLUTION': '⚖️',
  'VESTING_CERTIFICATE': '🏆',
  'EMPLOYMENT_CONTRACT': '👔',
  'OTHER': '📎'
};

export const DocumentCenter: React.FC = () => {
  const { employee } = useEmployeeAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<EmployeeDocumentType | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: documents,
    isLoading,
    error
  } = useQuery({
    queryKey: ['employeeDocuments', employee?.id],
    queryFn: () => employeePortalService.getEmployeeDocuments(employee!.id),
    enabled: !!employee,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1
  });

  // Filter and search documents
  const filteredDocuments = React.useMemo(() => {
    if (!documents) return [];

    return documents.filter(doc => {
      const matchesSearch = searchTerm === '' || 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'ALL' || doc.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [documents, searchTerm, filterType]);

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownload = async (document: EmployeeDocument) => {
    try {
      // In a real implementation, this would trigger a secure download
      console.log('Downloading document:', document.name);
      // Track download activity
      await employeePortalService.logActivity(
        employee!.id,
        employee!.company_id,
        'DOWNLOAD_DOCUMENT',
        { document_id: document.id, document_name: document.name }
      );
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handleView = async (document: EmployeeDocument) => {
    try {
      // In a real implementation, this would open document viewer
      console.log('Viewing document:', document.name);
      // Track view activity
      await employeePortalService.logActivity(
        employee!.id,
        employee!.company_id,
        'VIEW_DOCUMENT',
        { document_id: document.id, document_name: document.name }
      );
    } catch (error) {
      console.error('Failed to view document:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading Search Bar */}
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg mb-4"></div>
        </div>
        
        {/* Loading Documents */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/2 ml-11"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-8 shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to Load Documents
        </h3>
        <p className="text-gray-600">
          We're having trouble loading your documents. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Filter Dropdown */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as EmployeeDocumentType | 'ALL')}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Document Types</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Results Summary */}
        <div className="mt-3 text-sm text-gray-600">
          {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg p-8 shadow-sm text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || filterType !== 'ALL' ? 'No Documents Found' : 'No Documents Available'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterType !== 'ALL' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Your documents will appear here when they become available.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  {/* Document Icon */}
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                    {DOCUMENT_TYPE_ICONS[document.type]}
                  </div>

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {document.name}
                      </h4>
                      {document.is_confidential && (
                        <Lock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {DOCUMENT_TYPE_LABELS[document.type]}
                    </p>
                    
                    {document.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {document.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(document.upload_date)}
                      </span>
                      <span>{formatFileSize(document.file_size)}</span>
                      {document.version && (
                        <span>v{document.version}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-3">
                  {document.access_granted ? (
                    <>
                      <button
                        onClick={() => handleView(document)}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                        title="View document"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDownload(document)}
                        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                      <Lock className="w-4 h-4" />
                      <span className="text-xs font-medium">Access Pending</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Access Status */}
              {!document.access_granted && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    This document requires approval before you can access it. 
                    Please contact your administrator if you need immediate access.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document Categories Summary */}
      {documents && documents.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Document Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => {
              const count = documents.filter(doc => doc.type === type).length;
              if (count === 0) return null;
              
              return (
                <div key={type} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};