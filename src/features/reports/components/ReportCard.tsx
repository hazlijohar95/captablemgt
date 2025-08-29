import React from 'react';
import { 
  ArrowRightIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { ReportCardProps } from '../types';

// Icon mapping
const iconMap = {
  TableCellsIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PresentationChartBarIcon
};

export const ReportCard: React.FC<ReportCardProps> = ({ 
  template, 
  onGenerate, 
  isGenerating = false 
}) => {
  const IconComponent = iconMap[template.icon as keyof typeof iconMap] || DocumentTextIcon;

  const getCategoryColor = (category: string) => {
    const colors = {
      ownership: 'bg-blue-100 text-blue-800',
      financial: 'bg-green-100 text-green-800',
      compliance: 'bg-yellow-100 text-yellow-800',
      operational: 'bg-purple-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-primary-300 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <IconComponent className="h-8 w-8 text-primary-600 group-hover:text-primary-700" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600">
              {template.name}
            </h3>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(template.category)}`}>
              {template.category}
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {template.description}
      </p>
      
      {/* Export formats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Export as:</span>
          <div className="flex space-x-1">
            {template.exportFormats.map(format => (
              <span
                key={format}
                className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded uppercase"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Parameters count */}
      {template.parameters && template.parameters.length > 0 && (
        <div className="text-xs text-gray-500 mb-4">
          {template.parameters.length} parameter{template.parameters.length !== 1 ? 's' : ''} required
        </div>
      )}
      
      <button
        onClick={() => onGenerate(template.id)}
        disabled={isGenerating}
        className="w-full inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            Generating...
          </>
        ) : (
          <>
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Generate Report
            <ArrowRightIcon className="h-3 w-3 ml-2 opacity-70" />
          </>
        )}
      </button>

      {isGenerating && (
        <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-gray-600">Generating report...</p>
          </div>
        </div>
      )}
    </div>
  );
};