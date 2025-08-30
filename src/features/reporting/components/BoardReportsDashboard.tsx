/**
 * Board Reports Dashboard
 * Main dashboard for board-ready cap table reports and executive summaries
 */

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  PresentationChartLineIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

import { 
  PageLayout, 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  StatCard,
  Badge
} from '@/components/ui';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { reportingService } from '@/services/reportingService';
import { 
  BoardPackageData,
  GeneratedReport,
  ComplianceDashboard,
  ReportTemplate 
} from '@/types/reporting';
import { STAT_CARD_COLORS } from '@/constants';

export const BoardReportsDashboard: React.FC = () => {
  const { companyId } = useCompanyContext();
  
  const [boardData, setBoardData] = useState<BoardPackageData | null>(null);
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);
  const [complianceDashboard, setComplianceDashboard] = useState<ComplianceDashboard | null>(null);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [
          boardPackage,
          reports,
          compliance,
          templates
        ] = await Promise.all([
          reportingService.getBoardPackageData(companyId),
          reportingService.getRecentReports(companyId, { limit: 5 }),
          reportingService.getComplianceDashboard(companyId),
          reportingService.getReportTemplates({ 
            template_types: ['BOARD_PACKAGE', 'CAP_TABLE_SUMMARY', 'EXECUTIVE_SUMMARY'] 
          })
        ]);

        setBoardData(boardPackage);
        setRecentReports(reports);
        setComplianceDashboard(compliance);
        setReportTemplates(templates);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [companyId]);

  const handleGenerateReport = async (templateId: string) => {
    try {
      await reportingService.generateReport({
        company_id: companyId,
        template_id: templateId,
        as_of_date: new Date().toISOString().split('T')[0],
        parameters: {}
      }, 'current-user-id'); // TODO: Get from auth context

      // Refresh recent reports
      const updatedReports = await reportingService.getRecentReports(companyId, { limit: 5 });
      setRecentReports(updatedReports);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading board reports dashboard...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayout.Header
        title="Board Reports"
        description="Executive summaries and board-ready cap table reports"
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <CalendarDaysIcon className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
            <Button>
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Executive Summary Metrics */}
        {boardData && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Stakeholders"
              value={boardData.executive_summary.key_metrics.total_stakeholders.toLocaleString()}
              icon={<ChartBarIcon className="h-6 w-6" />}
              iconBgColor={STAT_CARD_COLORS.BLUE}
              subtitle={`+${boardData.executive_summary.significant_changes.new_stakeholders} this period`}
            />

            <StatCard
              title="Shares Outstanding"
              value={boardData.executive_summary.key_metrics.total_shares_outstanding.toLocaleString()}
              icon={<PresentationChartLineIcon className="h-6 w-6" />}
              iconBgColor={STAT_CARD_COLORS.GREEN}
              subtitle={`${boardData.executive_summary.significant_changes.securities_issued} securities issued`}
            />

            <StatCard
              title="Post-Money Valuation"
              value={formatCurrency(boardData.executive_summary.key_metrics.post_money_valuation)}
              icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
              iconBgColor={STAT_CARD_COLORS.PURPLE}
              subtitle={`As of ${formatDate(boardData.executive_summary.report_period.as_of_date)}`}
            />

            <StatCard
              title="409A Valuation"
              value={formatCurrency(boardData.executive_summary.key_metrics.valuation_409a)}
              icon={<DocumentTextIcon className="h-6 w-6" />}
              iconBgColor={boardData.executive_summary.key_metrics.valuation_409a_status === 'CURRENT' 
                ? STAT_CARD_COLORS.GREEN 
                : STAT_CARD_COLORS.YELLOW
              }
              subtitle={boardData.executive_summary.key_metrics.valuation_409a_status === 'CURRENT' 
                ? 'Current' 
                : 'Needs Update'
              }
            />
          </div>
        )}

        {/* Quick Report Generation */}
        <Card>
          <CardHeader
            title="Generate Board Reports"
            description="Create board-ready reports and summaries"
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reportTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{template.template_name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </div>
                    <Badge variant="outline">{template.template_type.replace('_', ' ')}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      ~{template.estimated_generation_time_minutes} min
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => handleGenerateReport(template.id)}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader
            title="Recent Reports"
            description="Latest generated board reports and summaries"
          />
          <CardContent>
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium text-gray-900">{report.report_name}</h4>
                          <p className="text-sm text-gray-500">
                            Generated on {formatDate(report.generated_at)} • 
                            As of {formatDate(report.as_of_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                      
                      {report.status === 'COMPLETED' && (
                        <Button size="sm" variant="outline">
                          Download
                        </Button>
                      )}
                    </div>
                  </div>

                  {report.metadata?.file_size && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <span>File size: {(report.metadata.file_size / 1024 / 1024).toFixed(1)} MB</span>
                      {report.format && <span className="ml-2">• Format: {report.format}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Overview */}
        {complianceDashboard && (
          <Card>
            <CardHeader
              title="Compliance Overview"
              description="Regulatory filing status and upcoming deadlines"
            />
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-green-900">
                        {complianceDashboard.compliant_filings}
                      </p>
                      <p className="text-sm text-green-700">Compliant Filings</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ClockIcon className="h-8 w-8 text-yellow-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-900">
                        {complianceDashboard.upcoming_deadlines}
                      </p>
                      <p className="text-sm text-yellow-700">Upcoming Deadlines</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-red-900">
                        {complianceDashboard.overdue_filings}
                      </p>
                      <p className="text-sm text-red-700">Overdue Filings</p>
                    </div>
                  </div>
                </div>
              </div>

              {complianceDashboard.next_compliance_action && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Next Action Required:</h4>
                  <p className="text-sm text-blue-800">
                    {complianceDashboard.next_compliance_action.description}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Due: {formatDate(complianceDashboard.next_compliance_action.due_date)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default BoardReportsDashboard;