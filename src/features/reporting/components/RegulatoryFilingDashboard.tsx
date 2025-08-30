/**
 * Regulatory Filing Support Dashboard
 * Comprehensive regulatory compliance tracking and filing management
 */

import React, { useState, useEffect } from 'react';
import { 
  DocumentCheckIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  DocumentArrowUpIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

import { 
  PageLayout, 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  StatCard,
  Badge,
  Tabs,
  Tab,
  Modal
} from '@/components/ui';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { reportingService } from '@/services/reportingService';
import { 
  RegulatoryFiling,
  ComplianceCalendarEvent,
  ComplianceDashboard
} from '@/types/reporting';
import { STAT_CARD_COLORS } from '@/constants';

const FILING_TYPES = {
  'FORM_D': 'Form D - Regulation D Offering',
  'FORM_3': 'Form 3 - Initial Statement of Ownership',
  'FORM_4': 'Form 4 - Statement of Changes in Ownership', 
  'FORM_5': 'Form 5 - Annual Statement of Changes in Ownership',
  '83B_ELECTION': '83(b) Election',
  '409A_VALUATION': '409A Valuation Report',
  'STATE_NOTICE': 'State Blue Sky Notice Filing',
  'ANNUAL_REPORT': 'Annual Corporate Report',
  'FRANCHISE_TAX': 'Franchise Tax Filing'
};

const JURISDICTIONS = {
  'FEDERAL': 'Federal (SEC)',
  'DELAWARE': 'Delaware',
  'CALIFORNIA': 'California', 
  'NEW_YORK': 'New York',
  'TEXAS': 'Texas'
};

export const RegulatoryFilingDashboard: React.FC = () => {
  const { companyId } = useCompanyContext();
  
  const [filings, setFilings] = useState<RegulatoryFiling[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<ComplianceCalendarEvent[]>([]);
  const [complianceDashboard, setComplianceDashboard] = useState<ComplianceDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'filings' | 'calendar' | 'compliance'>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedFiling, setSelectedFiling] = useState<RegulatoryFiling | null>(null);
  const [showFilingModal, setShowFilingModal] = useState(false);

  useEffect(() => {
    loadRegulatoryData();
  }, [companyId]);

  const loadRegulatoryData = async () => {
    setLoading(true);
    try {
      const [
        regulatoryFilings,
        compliance,
        upcomingEvents
      ] = await Promise.all([
        reportingService.getRegulatoryFilings(companyId),
        reportingService.getComplianceDashboard(companyId),
        reportingService.getComplianceCalendar(companyId, {
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
      ]);

      setFilings(regulatoryFilings);
      setComplianceDashboard(compliance);
      setCalendarEvents(upcomingEvents);
    } catch (error) {
      console.error('Error loading regulatory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (filingId: string, file: File) => {
    try {
      // Implementation would handle file upload to storage
      console.log('Uploading file for filing:', filingId, file.name);
      await loadRegulatoryData(); // Refresh data
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleCreateFiling = async (filingData: Partial<RegulatoryFiling>) => {
    try {
      await reportingService.createRegulatoryFiling(companyId, filingData);
      await loadRegulatoryData();
      setShowFilingModal(false);
    } catch (error) {
      console.error('Error creating filing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilingStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'filed': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilingStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'filed': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'overdue': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      default: return <DocumentCheckIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUpcomingFilings = () => {
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return filings.filter(filing => {
      const dueDate = new Date(filing.due_date);
      return dueDate >= now && dueDate <= next30Days && filing.status !== 'FILED';
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  };

  const getOverdueFilings = () => {
    const now = new Date();
    return filings.filter(filing => {
      const dueDate = new Date(filing.due_date);
      return dueDate < now && filing.status !== 'FILED';
    });
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading regulatory filing dashboard...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayout.Header
        title="Regulatory Filing Support"
        description="Comprehensive compliance tracking and filing management"
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={() => setShowFilingModal(true)}>
              <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
              New Filing
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-200 mb-6">
          <Tab value="overview">Overview</Tab>
          <Tab value="filings">Filings</Tab>
          <Tab value="calendar">Calendar</Tab>
          <Tab value="compliance">Compliance</Tab>
        </div>

        {/* Overview Tab */}
        <Tab.Content value="overview">
          <div className="space-y-6">
            {/* Summary Stats */}
            {complianceDashboard && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Filings"
                  value={filings.length.toString()}
                  icon={<DocumentCheckIcon className="h-6 w-6" />}
                  iconBgColor={STAT_CARD_COLORS.BLUE}
                  subtitle={`${complianceDashboard.compliant_filings} compliant`}
                />

                <StatCard
                  title="Upcoming Deadlines"
                  value={complianceDashboard.upcoming_deadlines.toString()}
                  icon={<ClockIcon className="h-6 w-6" />}
                  iconBgColor={STAT_CARD_COLORS.YELLOW}
                  subtitle="Next 30 days"
                />

                <StatCard
                  title="Overdue Filings"
                  value={complianceDashboard.overdue_filings.toString()}
                  icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                  iconBgColor={complianceDashboard.overdue_filings > 0 
                    ? STAT_CARD_COLORS.RED 
                    : STAT_CARD_COLORS.GREEN
                  }
                  subtitle={complianceDashboard.overdue_filings > 0 ? 'Requires attention' : 'All current'}
                />

                <StatCard
                  title="Compliance Score"
                  value={`${Math.round((complianceDashboard.compliant_filings / filings.length) * 100)}%`}
                  icon={<CheckCircleIcon className="h-6 w-6" />}
                  iconBgColor={complianceDashboard.compliant_filings / filings.length >= 0.8 
                    ? STAT_CARD_COLORS.GREEN 
                    : STAT_CARD_COLORS.YELLOW
                  }
                  subtitle="Overall compliance"
                />
              </div>
            )}

            {/* Upcoming Filings Alert */}
            {getUpcomingFilings().length > 0 && (
              <Card>
                <CardHeader
                  title="Upcoming Deadlines"
                  description="Filings due in the next 30 days"
                  icon={<BellIcon className="h-5 w-5 text-amber-500" />}
                />
                <CardContent>
                  <div className="space-y-3">
                    {getUpcomingFilings().map((filing) => (
                      <div key={filing.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getFilingStatusIcon(filing.status)}
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {FILING_TYPES[filing.filing_type as keyof typeof FILING_TYPES] || filing.filing_type}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {JURISDICTIONS[filing.jurisdiction as keyof typeof JURISDICTIONS]} • Due {formatDate(filing.due_date)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(filing.priority)}>
                            {filing.priority}
                          </Badge>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overdue Filings */}
            {getOverdueFilings().length > 0 && (
              <Card>
                <CardHeader
                  title="Overdue Filings"
                  description="Filings that require immediate attention"
                  icon={<ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
                />
                <CardContent>
                  <div className="space-y-3">
                    {getOverdueFilings().map((filing) => (
                      <div key={filing.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <XCircleIcon className="h-5 w-5 text-red-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {FILING_TYPES[filing.filing_type as keyof typeof FILING_TYPES] || filing.filing_type}
                            </h4>
                            <p className="text-sm text-red-600">
                              Overdue since {formatDate(filing.due_date)} • {JURISDICTIONS[filing.jurisdiction as keyof typeof JURISDICTIONS]}
                            </p>
                          </div>
                        </div>
                        
                        <Button size="sm" className="bg-red-600 hover:bg-red-700">
                          File Now
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </Tab.Content>

        {/* Filings Tab */}
        <Tab.Content value="filings">
          <Card>
            <CardHeader
              title="All Regulatory Filings"
              description="Complete list of regulatory filings and their status"
            />
            <CardContent>
              <div className="space-y-4">
                {filings.map((filing) => (
                  <div
                    key={filing.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedFiling(filing)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getFilingStatusIcon(filing.status)}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {FILING_TYPES[filing.filing_type as keyof typeof FILING_TYPES] || filing.filing_type}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>{JURISDICTIONS[filing.jurisdiction as keyof typeof JURISDICTIONS]}</span>
                            <span>Due: {formatDate(filing.due_date)}</span>
                            {filing.filing_date && (
                              <span>Filed: {formatDate(filing.filing_date)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Badge className={getPriorityColor(filing.priority)}>
                          {filing.priority}
                        </Badge>
                        <Badge className={getFilingStatusColor(filing.status)}>
                          {filing.status}
                        </Badge>
                      </div>
                    </div>

                    {filing.description && (
                      <p className="text-sm text-gray-600 mt-2 pl-9">
                        {filing.description}
                      </p>
                    )}

                    {filing.documents && filing.documents.length > 0 && (
                      <div className="flex items-center space-x-2 mt-3 pl-9">
                        <DocumentCheckIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {filing.documents.length} document{filing.documents.length !== 1 ? 's' : ''} attached
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Tab.Content>

        {/* Calendar Tab */}
        <Tab.Content value="calendar">
          <Card>
            <CardHeader
              title="Compliance Calendar"
              description="Upcoming compliance events and deadlines"
            />
            <CardContent>
              <div className="space-y-4">
                {calendarEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{event.event_title}</h4>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>{formatDate(event.event_date)}</span>
                          <span>{event.jurisdiction}</span>
                          {event.regulatory_body && <span>{event.regulatory_body}</span>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(event.priority)}>
                          {event.priority}
                        </Badge>
                        {event.reminder_sent && (
                          <Badge variant="outline">Reminder Sent</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Tab.Content>

        {/* Compliance Tab */}
        <Tab.Content value="compliance">
          <div className="space-y-6">
            {complianceDashboard?.next_compliance_action && (
              <Card>
                <CardHeader
                  title="Next Compliance Action"
                  description="Immediate action required for compliance"
                />
                <CardContent>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      {complianceDashboard.next_compliance_action.description}
                    </h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Due: {formatDate(complianceDashboard.next_compliance_action.due_date)}
                    </p>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Take Action
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader
                title="Compliance Health Check"
                description="Overall regulatory compliance status"
              />
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Current Filings</p>
                        <p className="text-2xl font-bold text-green-800">
                          {filings.filter(f => f.status === 'FILED').length}
                        </p>
                      </div>
                      <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-900">Action Required</p>
                        <p className="text-2xl font-bold text-red-800">
                          {filings.filter(f => f.status === 'OVERDUE' || (new Date(f.due_date) < new Date() && f.status !== 'FILED')).length}
                        </p>
                      </div>
                      <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Compliance Recommendations</h4>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• Set up automated reminders for recurring filings</li>
                    <li>• Review and update filing calendars quarterly</li>
                    <li>• Maintain organized document repositories</li>
                    <li>• Consider professional compliance services for complex filings</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </Tab.Content>
      </Tabs>
    </PageLayout>
  );
};

export default RegulatoryFilingDashboard;