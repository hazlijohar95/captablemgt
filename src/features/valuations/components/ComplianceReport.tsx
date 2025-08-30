/**
 * 409A Valuation Compliance Report
 * Comprehensive compliance dashboard and reporting interface
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

import { 
  PageLayout, 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  StatCard 
} from '@/components/ui';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { use409AValuations } from '@/hooks/use409AValuations';
import { 
  ComplianceReport as ComplianceReportType,
  ValuationValidationResult 
} from '@/types/valuation409a';
import { validationService } from '@/services/validationService';
import { STAT_CARD_COLORS } from '@/constants';

interface ComplianceReportProps {
  className?: string;
}

export const ComplianceReport: React.FC<ComplianceReportProps> = ({ 
  className = '' 
}) => {
  const { companyId } = useCompanyContext();
  const { valuations, summaryStats, loading } = use409AValuations(companyId);
  
  const [complianceReport, setComplianceReport] = useState<ComplianceReportType | null>(null);
  const [validationResults, setValidationResults] = useState<Map<string, ValuationValidationResult>>(new Map());
  const [reportLoading, setReportLoading] = useState(false);

  // Generate compliance report
  useEffect(() => {
    if (!valuations.length) return;

    const generateReport = async () => {
      setReportLoading(true);
      try {
        const report = await validationService.generateComplianceReport(
          companyId,
          valuations
        );
        setComplianceReport(report);

        // Get detailed validation for each valuation
        const results = new Map<string, ValuationValidationResult>();
        for (const valuation of valuations) {
          const validation = await validationService.validateValuation(valuation);
          results.set(valuation.id, validation);
        }
        setValidationResults(results);
      } catch (error) {
        console.error('Error generating compliance report:', error);
      } finally {
        setReportLoading(false);
      }
    };

    generateReport();
  }, [companyId, valuations]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSeverityColor = (severity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (severity) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (severity) {
      case 'HIGH': return <XCircleIcon className="h-5 w-5" />;
      case 'MEDIUM': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'LOW': return <InformationCircleIcon className="h-5 w-5" />;
    }
  };

  const handleExportReport = async () => {
    // Implementation would generate PDF or Excel report
    console.log('Exporting compliance report...');
  };

  if (loading || reportLoading) {
    return (
      <PageLayout className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Generating compliance report...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!complianceReport) {
    return (
      <PageLayout className={className}>
        <Card>
          <CardContent className="p-6 text-center">
            <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Compliance Data Available
            </h3>
            <p className="text-gray-500">
              Create at least one 409A valuation to generate a compliance report.
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const overallComplianceScore = Math.round(
    (complianceReport.compliant_valuations / complianceReport.total_valuations) * 100
  );

  return (
    <PageLayout className={className}>
      <PageLayout.Header
        title="409A Compliance Report"
        description={`Generated on ${formatDate(complianceReport.report_date)}`}
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportReport}>
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Overall Compliance Score */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Compliance Score"
            value={`${overallComplianceScore}%`}
            icon={<ShieldCheckIcon className="h-6 w-6" />}
            iconBgColor={overallComplianceScore >= 80 
              ? STAT_CARD_COLORS.GREEN 
              : overallComplianceScore >= 60 
                ? STAT_CARD_COLORS.YELLOW 
                : STAT_CARD_COLORS.RED
            }
            subtitle={`${complianceReport.compliant_valuations}/${complianceReport.total_valuations} compliant`}
          />

          <StatCard
            title="Total Valuations"
            value={complianceReport.total_valuations.toString()}
            icon={<DocumentArrowDownIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.BLUE}
            subtitle={`${complianceReport.non_compliant_valuations} need attention`}
          />

          <StatCard
            title="Expired Valuations"
            value={complianceReport.expired_valuations.toString()}
            icon={<CalendarDaysIcon className="h-6 w-6" />}
            iconBgColor={complianceReport.expired_valuations > 0 
              ? STAT_CARD_COLORS.RED 
              : STAT_CARD_COLORS.GREEN
            }
            subtitle={`${complianceReport.upcoming_expirations} expiring soon`}
          />

          <StatCard
            title="Next Review"
            value={formatDate(complianceReport.next_review_date)}
            icon={<CalendarDaysIcon className="h-6 w-6" />}
            iconBgColor={STAT_CARD_COLORS.PURPLE}
            subtitle="Scheduled review date"
          />
        </div>

        {/* Compliance Issues */}
        {complianceReport.compliance_issues.length > 0 && (
          <Card>
            <CardHeader
              title="Compliance Issues"
              description="Issues that require attention to maintain IRS compliance"
            />
            <CardContent>
              <div className="space-y-4">
                {complianceReport.compliance_issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {getSeverityIcon(issue.severity)}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            {issue.issue_type.replace('_', ' ')}
                          </h4>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-50">
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm mt-1 opacity-90">
                          {issue.description}
                        </p>
                        <div className="mt-2">
                          <p className="text-xs font-medium">Recommended Action:</p>
                          <p className="text-xs opacity-75">{issue.recommended_action}</p>
                        </div>
                        {issue.valuation_id && (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => console.log('Navigate to valuation:', issue.valuation_id)}
                            >
                              View Valuation
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {complianceReport.recommendations.length > 0 && (
          <Card>
            <CardHeader
              title="Recommendations"
              description="Suggested actions to improve compliance and reduce risk"
            />
            <CardContent>
              <div className="space-y-3">
                {complianceReport.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Valuation Details */}
        <Card>
          <CardHeader
            title="Valuation Compliance Details"
            description="Individual validation results for each valuation"
          />
          <CardContent>
            <div className="space-y-4">
              {valuations.map((valuation) => {
                const validation = validationResults.get(valuation.id);
                if (!validation) return null;

                return (
                  <div key={valuation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Valuation - {formatDate(valuation.valuation_date)}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Version {valuation.version} • {valuation.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          {validation.is_valid ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          <span className="text-sm font-medium">
                            {validation.compliance_score}% Compliant
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {validation.errors.length} errors, {validation.warnings.length} warnings
                        </p>
                      </div>
                    </div>

                    {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                      <div className="space-y-2">
                        {validation.errors.length > 0 && (
                          <div className="bg-red-50 p-3 rounded">
                            <h5 className="text-sm font-medium text-red-800 mb-2">Errors:</h5>
                            <ul className="text-sm text-red-700 space-y-1">
                              {validation.errors.map((error, idx) => (
                                <li key={idx}>• {error.message}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {validation.warnings.length > 0 && (
                          <div className="bg-yellow-50 p-3 rounded">
                            <h5 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h5>
                            <ul className="text-sm text-yellow-700 space-y-1">
                              {validation.warnings.map((warning, idx) => (
                                <li key={idx}>• {warning.message}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader
            title="Next Steps"
            description="Recommended actions to maintain compliance"
          />
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Immediate Actions:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Review and address all high-severity compliance issues</li>
                <li>• Schedule board meetings for pending valuation approvals</li>
                <li>• Ensure all required documentation is uploaded and current</li>
                {complianceReport.expired_valuations > 0 && (
                  <li>• Initiate new valuation process to replace expired valuations</li>
                )}
              </ul>
            </div>

            <div className="mt-4 bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Long-term Planning:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Schedule regular valuation reviews (annually or with significant events)</li>
                <li>• Establish relationships with qualified appraisers</li>
                <li>• Implement governance processes for valuation approvals</li>
                <li>• Consider safe harbor qualifications for future valuations</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ComplianceReport;