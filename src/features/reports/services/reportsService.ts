import { ULID } from '@/types';
import { AuthorizationService } from '@/services/authorizationService';
import { logger } from '@/utils/simpleLogger';
import {
  ReportType,
  ReportGenerationRequest,
  ReportGenerationResponse,
  GeneratedReport,
  ReportStats,
  CapTableSummaryData
} from '../types';

// Mock data store for development
const mockReports: GeneratedReport[] = [
  {
    id: 'report-1' as ULID,
    reportType: 'cap_table_summary',
    reportName: 'Cap Table Summary - Dec 2024',
    companyId: 'company-1' as ULID,
    generatedBy: 'user-1' as ULID,
    generatedAt: '2024-12-01T10:30:00Z',
    parameters: { asOfDate: '2024-12-01' },
    status: 'completed',
    downloadUrl: '/reports/cap-table-summary-dec-2024.pdf',
    exportFormat: 'pdf',
    fileSize: 245760,
    expiresAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'report-2' as ULID,
    reportType: 'equity_breakdown',
    reportName: 'Equity Breakdown - Q4 2024',
    companyId: 'company-1' as ULID,
    generatedBy: 'user-1' as ULID,
    generatedAt: '2024-11-28T15:45:00Z',
    parameters: { asOfDate: '2024-11-30', groupBy: 'securityType' },
    status: 'completed',
    downloadUrl: '/reports/equity-breakdown-q4-2024.xlsx',
    exportFormat: 'excel',
    fileSize: 189440,
    expiresAt: '2025-01-01T00:00:00Z'
  }
];

export class ReportsService {
  /**
   * Generate a new report
   */
  static async generateReport(
    companyId: ULID,
    request: ReportGenerationRequest
  ): Promise<ReportGenerationResponse> {
    // Validate access
    await AuthorizationService.validateCompanyAccess(companyId);
    await AuthorizationService.verifyFinancialDataAccess(companyId, 'read');

    logger.info('Starting report generation', {
      companyId,
      reportType: request.reportType,
      exportFormat: request.exportFormat
    });

      // Create report generation record
      const reportId = crypto.randomUUID() as ULID;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Create new report in mock store
      const newReport: GeneratedReport = {
        id: reportId,
        reportType: request.reportType,
        reportName: this.getDefaultReportName(request.reportType, request.parameters),
        companyId: companyId,
        generatedBy: 'current-user' as ULID,
        generatedAt: new Date().toISOString(),
        parameters: request.parameters,
        status: 'generating',
        exportFormat: request.exportFormat,
        expiresAt: expiresAt.toISOString()
      };

      mockReports.push(newReport);

      // Simulate report generation
      setTimeout(() => {
        this.simulateReportGeneration(reportId);
      }, 2000);

      return {
        id: reportId,
        status: 'generating',
        generatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };
    });
  }

  /**
   * Get report generation status
   */
  static async getReportStatus(
    companyId: ULID,
    reportId: ULID
  ): Promise<ReportGenerationResponse> {
    return withTiming('ReportsService.getReportStatus', async () => {
      await AuthorizationService.validateCompanyAccess(companyId);

      const report = mockReports.find(r => r.id === reportId && r.companyId === companyId);
      
      if (!report) {
        throw new Error('Report not found');
      }

      return {
        id: report.id,
        status: report.status,
        downloadUrl: report.downloadUrl,
        generatedAt: report.generatedAt,
        expiresAt: report.expiresAt
      };
    });
  }

  /**
   * Get list of generated reports
   */
  static async getGeneratedReports(
    companyId: ULID,
    limit = 50
  ): Promise<GeneratedReport[]> {
    return withTiming('ReportsService.getGeneratedReports', async () => {
      await AuthorizationService.validateCompanyAccess(companyId);

      return mockReports
        .filter(report => report.companyId === companyId)
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
        .slice(0, limit);
    });
  }

  /**
   * Delete a generated report
   */
  static async deleteReport(
    companyId: ULID,
    reportId: ULID
  ): Promise<void> {
    return withTiming('ReportsService.deleteReport', async () => {
      await AuthorizationService.validateCompanyAccess(companyId);
      await AuthorizationService.verifyFinancialDataAccess(companyId, 'write');

      // Remove from mock store
      const initialLength = mockReports.length;
      const filteredReports = mockReports.filter(r => !(r.id === reportId && r.companyId === companyId));
      
      if (filteredReports.length === initialLength) {
        throw new Error('Report not found');
      }

      // Update mock store
      mockReports.length = 0;
      mockReports.push(...filteredReports);

      logInfo('Report deleted successfully', { companyId, reportId });
    });
  }

  /**
   * Get report statistics
   */
  static async getReportStats(companyId: ULID): Promise<ReportStats> {
    return withTiming('ReportsService.getReportStats', async () => {
      await AuthorizationService.validateCompanyAccess(companyId);

      // Filter reports for this company from mock store
      const companyReports = mockReports.filter(report => report.companyId === companyId);
      
      // Transform to match expected data structure
      const data = companyReports.map(report => ({
        report_type: report.reportType,
        status: report.status,
        created_at: report.generatedAt
      }));

      // Calculate statistics
      const totalReports = data.length;
      const reportsByType = this.calculateReportsByType(data);
      const recentReports = await this.getGeneratedReports(companyId, 5);
      const popularReports = this.calculatePopularReports(data);

      return {
        totalReports,
        reportsByType,
        recentReports,
        popularReports
      };
    });
  }

  /**
   * Generate Cap Table Summary Data
   */
  static async generateCapTableSummary(
    companyId: ULID,
    parameters: Record<string, any>
  ): Promise<CapTableSummaryData> {
    return withTiming('ReportsService.generateCapTableSummary', async () => {
      await AuthorizationService.validateCompanyAccess(companyId);

      // This would typically fetch real data from the instruments service
      // For now, return mock data based on parameters
      const asOfDate = parameters.asOfDate || new Date().toISOString().split('T')[0];

      // Mock implementation - in real app, fetch from database
      return {
        asOfDate,
        totalSharesOutstanding: 10000000,
        totalSharesAuthorized: 15000000,
        utilizationPercentage: 66.67,
        ownershipBreakdown: [
          {
            stakeholderId: 'stakeholder-1',
            stakeholderName: 'John Founder',
            stakeholderType: 'FOUNDER',
            totalShares: 4000000,
            ownershipPercentage: 40.0,
            securities: []
          },
          {
            stakeholderId: 'stakeholder-2',
            stakeholderName: 'Jane Cofounder',
            stakeholderType: 'FOUNDER',
            totalShares: 3000000,
            ownershipPercentage: 30.0,
            securities: []
          }
        ],
        securityTypeBreakdown: [
          {
            type: 'EQUITY',
            count: 2,
            totalShares: 7000000,
            percentage: 70.0
          },
          {
            type: 'OPTION',
            count: 15,
            totalShares: 3000000,
            percentage: 30.0
          }
        ]
      };
    });
  }

  // Private helper methods

  private static async simulateReportGeneration(reportId: ULID): Promise<void> {
    try {
      // Simulate report generation delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generate mock download URL
      const downloadUrl = `/api/reports/${reportId}/download`;
      const fileSize = Math.floor(Math.random() * 500000) + 100000; // 100KB - 600KB

      // Find and update report in mock store
      const reportIndex = mockReports.findIndex(r => r.id === reportId);
      if (reportIndex !== -1) {
        mockReports[reportIndex] = {
          ...mockReports[reportIndex],
          status: 'completed',
          downloadUrl,
          fileSize
        };
      }

      logInfo('Report generation completed', { reportId });

    } catch (error) {
      // Mark report as failed in mock store
      const reportIndex = mockReports.findIndex(r => r.id === reportId);
      if (reportIndex !== -1) {
        mockReports[reportIndex] = {
          ...mockReports[reportIndex],
          status: 'failed'
        };
      }

      logError('Report generation failed', error as Error, { reportId });
    }
  }

  private static getDefaultReportName(reportType: ReportType, parameters: Record<string, any>): string {
    const typeNames = {
      cap_table_summary: 'Cap Table Summary',
      equity_breakdown: 'Equity Breakdown',
      valuation_summary: 'Valuation Summary',
      vesting_schedule: 'Vesting Schedule',
      transaction_history: 'Transaction History',
      tax_summary: 'Tax Summary',
      investor_update: 'Investor Update'
    };

    const baseName = typeNames[reportType] || reportType;
    const date = parameters.asOfDate || new Date().toISOString().split('T')[0];
    
    return `${baseName} - ${date}`;
  }

  private static calculateReportsByType(data: any[]): { type: ReportType; count: number }[] {
    const counts: Record<string, number> = {};
    
    data.forEach(report => {
      counts[report.report_type] = (counts[report.report_type] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({
      type: type as ReportType,
      count
    }));
  }

  private static calculatePopularReports(data: any[]): { type: ReportType; count: number; name: string }[] {
    const typeNames = {
      cap_table_summary: 'Cap Table Summary',
      equity_breakdown: 'Equity Breakdown',
      valuation_summary: 'Valuation Summary',
      vesting_schedule: 'Vesting Schedule',
      transaction_history: 'Transaction History',
      tax_summary: 'Tax Summary',
      investor_update: 'Investor Update'
    };

    return this.calculateReportsByType(data)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        ...item,
        name: typeNames[item.type] || item.type
      }));
  }
}