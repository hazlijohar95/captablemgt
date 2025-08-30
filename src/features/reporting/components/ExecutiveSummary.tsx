/**
 * Executive Summary Component
 * High-level executive dashboard with key metrics and insights
 */

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

import { 
  Card, 
  CardHeader, 
  CardContent, 
  StatCard,
  Badge,
  Button
} from '@/components/ui';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { reportingService } from '@/services/reportingService';
import { 
  BoardPackageData,
  ExecutiveSummaryData,
  KeyMetric,
  ComplianceAlert
} from '@/types/reporting';
import { STAT_CARD_COLORS } from '@/constants';

interface ExecutiveSummaryProps {
  className?: string;
  reportPeriod?: {
    start_date: string;
    end_date: string;
    as_of_date: string;
  };
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ 
  className = '',
  reportPeriod 
}) => {
  const { companyId } = useCompanyContext();
  
  const [executiveData, setExecutiveData] = useState<ExecutiveSummaryData | null>(null);
  const [boardData, setBoardData] = useState<BoardPackageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutiveSummary();
  }, [companyId, reportPeriod]);

  const loadExecutiveSummary = async () => {
    setLoading(true);
    try {
      const [executive, board] = await Promise.all([
        reportingService.getExecutiveSummary(companyId, reportPeriod?.as_of_date),
        reportingService.getBoardPackageData(companyId, reportPeriod?.as_of_date)
      ]);

      setExecutiveData(executive);
      setBoardData(board);
    } catch (error) {
      console.error('Error loading executive summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number, showSign = false) => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    } else if (change < 0) {
      return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'VALUATION': return <TrendingUpIcon className="h-6 w-6" />;
      case 'OWNERSHIP': return <ChartBarIcon className="h-6 w-6" />;
      case 'STAKEHOLDERS': return <UsersIcon className="h-6 w-6" />;
      case 'SHARES': return <DocumentTextIcon className="h-6 w-6" />;
      case 'REVENUE': return <BanknotesIcon className="h-6 w-6" />;
      default: return <ChartBarIcon className="h-6 w-6" />;
    }
  };

  const getAlertSeverityColor = (severity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getComplianceIcon = (isCompliant: boolean) => {
    return isCompliant 
      ? <CheckCircleIcon className="h-5 w-5 text-green-600" />
      : <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!executiveData || !boardData) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Executive Summary Available
        </h3>
        <p className="text-gray-500">
          Unable to load executive summary data. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Report Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Executive Summary</h2>
            <p className="text-blue-100">
              Cap Table Report • As of {formatDate(boardData.executive_summary.report_period.as_of_date)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(boardData.executive_summary.key_metrics.post_money_valuation)}
            </div>
            <p className="text-blue-100 text-sm">Post-Money Valuation</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Stakeholders"
          value={boardData.executive_summary.key_metrics.total_stakeholders.toLocaleString()}
          icon={<UsersIcon className="h-6 w-6" />}
          iconBgColor={STAT_CARD_COLORS.BLUE}
          subtitle={
            <div className="flex items-center space-x-1">
              {getTrendIcon(boardData.executive_summary.significant_changes.new_stakeholders)}
              <span className={getTrendColor(boardData.executive_summary.significant_changes.new_stakeholders)}>
                {boardData.executive_summary.significant_changes.new_stakeholders > 0 ? '+' : ''}
                {boardData.executive_summary.significant_changes.new_stakeholders} this period
              </span>
            </div>
          }
        />

        <StatCard
          title="Shares Outstanding"
          value={boardData.executive_summary.key_metrics.total_shares_outstanding.toLocaleString()}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          iconBgColor={STAT_CARD_COLORS.GREEN}
          subtitle={`${boardData.executive_summary.significant_changes.securities_issued} securities issued`}
        />

        <StatCard
          title="409A Valuation"
          value={formatCurrency(boardData.executive_summary.key_metrics.valuation_409a)}
          icon={<TrendingUpIcon className="h-6 w-6" />}
          iconBgColor={boardData.executive_summary.key_metrics.valuation_409a_status === 'CURRENT' 
            ? STAT_CARD_COLORS.GREEN 
            : STAT_CARD_COLORS.YELLOW
          }
          subtitle={boardData.executive_summary.key_metrics.valuation_409a_status === 'CURRENT' 
            ? 'Current & Compliant' 
            : 'Requires Update'
          }
        />

        <StatCard
          title="Option Pool"
          value={formatPercentage(boardData.executive_summary.key_metrics.option_pool_percentage)}
          icon={<ChartBarIcon className="h-6 w-6" />}
          iconBgColor={STAT_CARD_COLORS.PURPLE}
          subtitle={`${boardData.executive_summary.key_metrics.option_pool_allocated.toLocaleString()} allocated`}
        />
      </div>

      {/* Key Performance Indicators */}
      {executiveData.key_metrics && executiveData.key_metrics.length > 0 && (
        <Card>
          <CardHeader
            title="Key Performance Indicators"
            description="Critical business metrics and trends"
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {executiveData.key_metrics.map((metric) => (
                <div key={metric.metric_name} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getMetricIcon(metric.metric_type)}
                      <div>
                        <h4 className="font-medium text-gray-900">{metric.metric_name}</h4>
                        <p className="text-2xl font-bold text-gray-800 mt-1">
                          {metric.metric_type === 'VALUATION' || metric.metric_type === 'REVENUE'
                            ? formatCurrency(metric.current_value)
                            : metric.current_value.toLocaleString()
                          }
                        </p>
                      </div>
                    </div>
                    
                    {metric.change_from_previous && (
                      <div className="text-right">
                        <div className={`flex items-center space-x-1 ${getTrendColor(metric.change_from_previous)}`}>
                          {getTrendIcon(metric.change_from_previous)}
                          <span className="text-sm font-medium">
                            {formatPercentage(Math.abs(metric.change_from_previous), true)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">vs. previous</p>
                      </div>
                    )}
                  </div>
                  
                  {metric.benchmark && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        Industry benchmark: {formatCurrency(metric.benchmark)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Significant Events */}
      {executiveData.significant_events && executiveData.significant_events.length > 0 && (
        <Card>
          <CardHeader
            title="Significant Events"
            description="Notable changes during the reporting period"
          />
          <CardContent>
            <div className="space-y-4">
              {executiveData.significant_events.map((event, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{event.event_type.replace('_', ' ')}</h4>
                      <span className="text-sm text-gray-500">{formatDate(event.event_date)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    {event.impact_description && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                        Impact: {event.impact_description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Alerts */}
      {executiveData.compliance_alerts && executiveData.compliance_alerts.length > 0 && (
        <Card>
          <CardHeader
            title="Compliance Alerts"
            description="Items requiring management attention"
          />
          <CardContent>
            <div className="space-y-3">
              {executiveData.compliance_alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${getAlertSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getComplianceIcon(alert.is_resolved)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{alert.alert_type.replace('_', ' ')}</h4>
                        <Badge variant="outline" className="bg-white bg-opacity-50">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1 opacity-90">{alert.description}</p>
                      {alert.recommended_action && (
                        <div className="mt-2">
                          <p className="text-xs font-medium opacity-75">Recommended Action:</p>
                          <p className="text-xs opacity-60">{alert.recommended_action}</p>
                        </div>
                      )}
                      {alert.due_date && (
                        <p className="text-xs opacity-60 mt-1">
                          Due: {formatDate(alert.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Actions */}
      <Card>
        <CardHeader
          title="Recommended Actions"
          description="Priority items for management consideration"
        />
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Short-term (30 days)</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Review and address high-priority compliance alerts</li>
                <li>• Update 409A valuation if approaching expiration</li>
                <li>• Schedule quarterly board meeting materials preparation</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Medium-term (90 days)</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Implement automated compliance monitoring</li>
                <li>• Review and optimize equity compensation plans</li>
                <li>• Plan for next funding round if applicable</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveSummary;