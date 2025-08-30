/**
 * Report Generation Engine
 * Comprehensive report generation interface with template management
 */

import React, { useState, useEffect } from 'react';
import { 
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

import { 
  PageLayout, 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  Badge,
  Input,
  Select,
  DatePicker,
  Textarea,
  Modal,
  Tabs,
  Tab,
  ProgressBar
} from '@/components/ui';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { reportingService } from '@/services/reportingService';
import { 
  ReportTemplate,
  GeneratedReport,
  GenerateReportRequest
} from '@/types/reporting';

interface ReportParameters {
  as_of_date: string;
  include_waterfall?: boolean;
  include_dilution_analysis?: boolean;
  board_meeting_date?: string;
  custom_notes?: string;
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'HTML';
  [key: string]: any;
}

interface GenerationProgress {
  step: string;
  progress: number;
  eta_minutes?: number;
}

export const ReportGenerationEngine: React.FC = () => {
  const { companyId } = useCompanyContext();
  
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'templates'>('generate');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);

  const [parameters, setParameters] = useState<ReportParameters>({
    as_of_date: new Date().toISOString().split('T')[0],
    format: 'PDF'
  });

  useEffect(() => {
    loadReportData();
  }, [companyId]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [reportTemplates, recentReports] = await Promise.all([
        reportingService.getReportTemplates(),
        reportingService.getRecentReports(companyId, { limit: 20 })
      ]);

      setTemplates(reportTemplates);
      setGeneratedReports(recentReports);
      
      if (reportTemplates.length > 0 && !selectedTemplate) {
        setSelectedTemplate(reportTemplates[0]);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    setGenerating(true);
    setGenerationProgress({
      step: 'Initializing report generation...',
      progress: 0
    });

    try {
      // Simulate progress updates
      const progressSteps = [
        { step: 'Gathering cap table data...', progress: 20, eta: 2 },
        { step: 'Calculating ownership percentages...', progress: 40, eta: 1.5 },
        { step: 'Generating dilution analysis...', progress: 60, eta: 1 },
        { step: 'Formatting report content...', progress: 80, eta: 0.5 },
        { step: 'Finalizing document...', progress: 95, eta: 0.2 }
      ];

      for (const [index, step] of progressSteps.entries()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setGenerationProgress({
          step: step.step,
          progress: step.progress,
          eta_minutes: step.eta
        });
      }

      const request: GenerateReportRequest = {
        company_id: companyId,
        template_id: selectedTemplate.id,
        as_of_date: parameters.as_of_date,
        parameters: {
          format: parameters.format,
          include_waterfall: parameters.include_waterfall,
          include_dilution_analysis: parameters.include_dilution_analysis,
          board_meeting_date: parameters.board_meeting_date,
          custom_notes: parameters.custom_notes
        }
      };

      const report = await reportingService.generateReport(request, 'current-user-id');
      
      setGenerationProgress({
        step: 'Report generated successfully!',
        progress: 100
      });

      // Refresh reports list
      await loadReportData();
      
      // Clear progress after a short delay
      setTimeout(() => {
        setGenerationProgress(null);
      }, 2000);

    } catch (error) {
      console.error('Error generating report:', error);
      setGenerationProgress(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      // Implementation would trigger download
      console.log('Downloading report:', reportId);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const handlePreviewReport = (report: GeneratedReport) => {
    setSelectedReport(report);
    setShowPreviewModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'BOARD_PACKAGE': return 'bg-blue-100 text-blue-800';
      case 'CAP_TABLE_SUMMARY': return 'bg-green-100 text-green-800';
      case 'DILUTION_ANALYSIS': return 'bg-purple-100 text-purple-800';
      case 'EXECUTIVE_SUMMARY': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading report generation engine...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayout.Header
        title="Report Generation Engine"
        description="Generate comprehensive cap table reports and analyses"
        actions={
          <Button variant="outline">
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Settings
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-200 mb-6">
          <Tab value="generate">Generate Report</Tab>
          <Tab value="history">Report History</Tab>
          <Tab value="templates">Templates</Tab>
        </div>

        {/* Generate Report Tab */}
        <Tab.Content value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Selection */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader
                  title="Select Report Template"
                  description="Choose the type of report you want to generate"
                />
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{template.template_name}</h4>
                          <Badge className={getTemplateTypeColor(template.template_type)}>
                            {template.template_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>~{template.estimated_generation_time_minutes} min</span>
                          <span>{template.supported_formats.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Report Parameters */}
              {selectedTemplate && (
                <Card className="mt-6">
                  <CardHeader
                    title="Report Parameters"
                    description="Configure your report settings"
                  />
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            As of Date
                          </label>
                          <DatePicker
                            value={parameters.as_of_date}
                            onChange={(date) => setParameters({ ...parameters, as_of_date: date })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Output Format
                          </label>
                          <Select
                            value={parameters.format}
                            onChange={(value) => setParameters({ ...parameters, format: value as any })}
                          >
                            {selectedTemplate.supported_formats.map(format => (
                              <Select.Option key={format} value={format}>{format}</Select.Option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {selectedTemplate.template_type === 'BOARD_PACKAGE' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Board Meeting Date (Optional)
                          </label>
                          <DatePicker
                            value={parameters.board_meeting_date || ''}
                            onChange={(date) => setParameters({ ...parameters, board_meeting_date: date })}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={parameters.include_waterfall || false}
                            onChange={(e) => setParameters({
                              ...parameters,
                              include_waterfall: e.target.checked
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include waterfall analysis</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={parameters.include_dilution_analysis || false}
                            onChange={(e) => setParameters({
                              ...parameters,
                              include_dilution_analysis: e.target.checked
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include dilution scenarios</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Notes (Optional)
                        </label>
                        <Textarea
                          value={parameters.custom_notes || ''}
                          onChange={(e) => setParameters({ ...parameters, custom_notes: e.target.value })}
                          placeholder="Add any custom notes or context for this report..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Generation Panel */}
            <div>
              <Card>
                <CardHeader
                  title="Generate Report"
                  description="Review and generate your report"
                />
                <CardContent>
                  <div className="space-y-4">
                    {selectedTemplate && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Report Summary</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Template:</span>
                            <span>{selectedTemplate.template_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Format:</span>
                            <span>{parameters.format}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>As of:</span>
                            <span>{new Date(parameters.as_of_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Est. Time:</span>
                            <span>{selectedTemplate.estimated_generation_time_minutes} min</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {generationProgress && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {generationProgress.step}
                          </span>
                          {generationProgress.eta_minutes && (
                            <span className="text-xs text-gray-500">
                              ~{generationProgress.eta_minutes}m left
                            </span>
                          )}
                        </div>
                        <ProgressBar progress={generationProgress.progress} />
                      </div>
                    )}

                    <Button
                      onClick={handleGenerateReport}
                      disabled={!selectedTemplate || generating}
                      className="w-full"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4 mr-2" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tab.Content>

        {/* Report History Tab */}
        <Tab.Content value="history">
          <Card>
            <CardHeader
              title="Generated Reports"
              description="History of all generated reports"
            />
            <CardContent>
              <div className="space-y-4">
                {generatedReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <DocumentArrowDownIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <h4 className="font-medium text-gray-900">{report.report_name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span>Generated: {formatDate(report.generated_at)}</span>
                              <span>As of: {new Date(report.as_of_date).toLocaleDateString()}</span>
                              <span>Format: {report.format}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>

                        {report.status === 'COMPLETED' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewReport(report)}
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDownloadReport(report.id)}
                            >
                              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        )}

                        {report.status === 'PROCESSING' && (
                          <div className="flex items-center text-yellow-600">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span className="text-sm">Processing...</span>
                          </div>
                        )}

                        {report.status === 'FAILED' && (
                          <div className="flex items-center text-red-600">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            <span className="text-sm">Failed</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {report.metadata && (
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        {report.metadata.file_size && (
                          <span>Size: {(report.metadata.file_size / 1024 / 1024).toFixed(1)} MB</span>
                        )}
                        {report.metadata.page_count && (
                          <span>Pages: {report.metadata.page_count}</span>
                        )}
                        {report.metadata.generation_time_seconds && (
                          <span>Generation time: {report.metadata.generation_time_seconds}s</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Tab.Content>

        {/* Templates Tab */}
        <Tab.Content value="templates">
          <Card>
            <CardHeader
              title="Report Templates"
              description="Available report templates and configurations"
            />
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{template.template_name}</h4>
                        <Badge className={`mt-1 ${getTemplateTypeColor(template.template_type)}`}>
                          {template.template_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Cog6ToothIcon className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                    <div className="space-y-2 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Est. Time:</span>
                        <span>{template.estimated_generation_time_minutes} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Formats:</span>
                        <span>{template.supported_formats.join(', ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level:</span>
                        <span className="capitalize">{template.compliance_level.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Tab.Content>
      </Tabs>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={selectedReport?.report_name || 'Report Preview'}
        size="large"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{selectedReport.report_name}</h4>
                <p className="text-sm text-gray-600">
                  Generated on {formatDate(selectedReport.generated_at)} • 
                  As of {new Date(selectedReport.as_of_date).toLocaleDateString()}
                </p>
              </div>
              <Button onClick={() => handleDownloadReport(selectedReport.id)}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="bg-white border rounded-lg p-6 min-h-96">
              <p className="text-gray-500 text-center py-12">
                Report preview would be displayed here
              </p>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default ReportGenerationEngine;