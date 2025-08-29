import { useState, useMemo } from 'react';
import { 
  DocumentChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {
  TableCellsIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PresentationChartBarIcon
} from '@heroicons/react/24/solid';
import { reportTemplates, reportCategories, quickReports } from '../config/reportTemplates';
import { ReportTemplate, ReportType, GeneratedReport, ExportFormat } from '../types';
import { ReportCard } from './ReportCard';
import { ReportHistory } from './ReportHistory';
import { ReportParametersModal } from './ReportParametersModal';

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

// Mock data for generated reports
const mockGeneratedReports: GeneratedReport[] = [
  {
    id: 'report-1',
    reportType: 'cap_table_summary',
    reportName: 'Cap Table Summary - Dec 2024',
    companyId: 'company-1',
    generatedBy: 'user-1',
    generatedAt: '2024-12-01T10:30:00Z',
    parameters: { asOfDate: '2024-12-01' },
    status: 'completed',
    downloadUrl: '/reports/cap-table-summary-dec-2024.pdf',
    exportFormat: 'pdf',
    fileSize: 245760,
    expiresAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'report-2',
    reportType: 'equity_breakdown',
    reportName: 'Equity Breakdown - Q4 2024',
    companyId: 'company-1',
    generatedBy: 'user-1',
    generatedAt: '2024-11-28T15:45:00Z',
    parameters: { asOfDate: '2024-11-30', groupBy: 'securityType' },
    status: 'completed',
    downloadUrl: '/reports/equity-breakdown-q4-2024.xlsx',
    exportFormat: 'excel',
    fileSize: 189440,
    expiresAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'report-3',
    reportType: 'vesting_schedule',
    reportName: 'Vesting Schedule - Next 12 Months',
    companyId: 'company-1',
    generatedBy: 'user-1',
    generatedAt: '2024-11-25T09:15:00Z',
    parameters: { asOfDate: '2024-11-25', timeHorizon: '12' },
    status: 'generating',
    exportFormat: 'pdf',
    expiresAt: '2025-01-01T00:00:00Z'
  }
];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState<Record<ReportType, boolean>>({} as Record<ReportType, boolean>);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return reportTemplates.filter(template => {
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Quick report templates
  const quickReportTemplates = useMemo(() => {
    return reportTemplates.filter(template => quickReports.includes(template.id));
  }, []);

  const handleGenerateReport = async (reportType: ReportType) => {
    const template = reportTemplates.find(t => t.id === reportType);
    if (!template) return;

    if (template.parameters && template.parameters.length > 0) {
      setSelectedTemplate(template);
    } else {
      // Generate report directly if no parameters needed
      setIsGenerating(prev => ({ ...prev, [reportType]: true }));
      
      // Simulate report generation
      setTimeout(() => {
        setIsGenerating(prev => ({ ...prev, [reportType]: false }));
        console.log(`Generated ${template.name} report`);
      }, 3000);
    }
  };

  const handleGenerateWithParameters = async (parameters: Record<string, any>, exportFormat: ExportFormat) => {
    if (!selectedTemplate) return;

    setIsGenerating(prev => ({ ...prev, [selectedTemplate.id]: true }));
    
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(prev => ({ ...prev, [selectedTemplate.id]: false }));
      setSelectedTemplate(null);
      console.log(`Generated ${selectedTemplate.name} report with parameters:`, parameters, 'format:', exportFormat);
    }, 3000);
  };

  const handleDownloadReport = (reportId: string) => {
    const report = mockGeneratedReports.find(r => r.id === reportId);
    if (report?.downloadUrl) {
      // Simulate download
      console.log(`Downloading report: ${report.reportName}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate and manage cap table reports for stakeholders and compliance
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700">
          <PlusIcon className="h-4 w-4 mr-2" />
          Custom Report
        </button>
      </div>

      {/* Quick Reports */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickReportTemplates.map((template) => {
            const IconComponent = iconMap[template.icon as keyof typeof iconMap];
            return (
              <button
                key={template.id}
                onClick={() => handleGenerateReport(template.id)}
                disabled={isGenerating[template.id]}
                className="relative group p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all duration-200 text-left"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <IconComponent className="h-8 w-8 text-primary-600 group-hover:text-primary-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary-600">
                      {template.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {template.description}
                    </p>
                  </div>
                </div>
                {isGenerating[template.id] && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Report Templates
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Generated Reports ({mockGeneratedReports.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'templates' ? 'Search report templates...' : 'Search generated reports...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            {activeTab === 'templates' && (
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Categories</option>
                  {reportCategories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'templates' ? (
        <div className="space-y-6">
          {/* Category Sections */}
          {reportCategories.map(category => {
            const categoryTemplates = filteredTemplates.filter(template => template.category === category.id);
            if (categoryTemplates.length === 0 && selectedCategory !== 'all') return null;
            if (categoryTemplates.length === 0) return null;

            return (
              <div key={category.id} className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${category.color}`}>
                        {categoryTemplates.length} {categoryTemplates.length === 1 ? 'report' : 'reports'}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{category.description}</p>
                </div>
                <div className="p-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryTemplates.map((template) => (
                      <ReportCard
                        key={template.id}
                        template={template}
                        onGenerate={handleGenerateReport}
                        isGenerating={isGenerating[template.id]}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter to find the report you're looking for.
              </p>
            </div>
          )}
        </div>
      ) : (
        <ReportHistory
          reports={mockGeneratedReports}
          onDownload={handleDownloadReport}
        />
      )}

      {/* Report Parameters Modal */}
      {selectedTemplate && (
        <ReportParametersModal
          isOpen={true}
          onClose={() => setSelectedTemplate(null)}
          template={selectedTemplate}
          onGenerate={handleGenerateWithParameters}
          isGenerating={isGenerating[selectedTemplate.id]}
        />
      )}
    </div>
  );
}