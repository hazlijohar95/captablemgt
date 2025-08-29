import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { ReportsService } from '../services/reportsService';
import { logError, logInfo } from '@/utils/logger';
import { 
  ReportType, 
  GeneratedReport, 
  ReportStats,
  ReportGenerationRequest,
  ReportGenerationResponse,
  ExportFormat 
} from '../types';
import { ULID } from '@/types';

interface UseReportsOptions {
  companyId: ULID;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useReports({ companyId, autoRefresh = true, refreshInterval = 30000 }: UseReportsOptions) {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [generatingReports, setGeneratingReports] = useState<Record<string, boolean>>({});

  const { loading, error, execute, reset } = useAsyncOperation<GeneratedReport[]>();
  const { 
    loading: statsLoading, 
    error: statsError, 
    execute: executeStats 
  } = useAsyncOperation<ReportStats>();

  // Load reports
  const loadReports = useCallback(async () => {
    if (!companyId) {
      setReports([]);
      return;
    }

    try {
      const data = await execute(() => ReportsService.getGeneratedReports(companyId));
      setReports(data || []);
      return data;
    } catch (error) {
      logError('Failed to load reports', error as Error, { companyId });
      setReports([]);
      return [];
    }
  }, [companyId, execute]);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!companyId) {
      setStats(null);
      return;
    }

    try {
      const data = await executeStats(() => ReportsService.getReportStats(companyId));
      setStats(data || null);
      return data;
    } catch (error) {
      logError('Failed to load report stats', error as Error, { companyId });
      setStats(null);
      return null;
    }
  }, [companyId, executeStats]);

  // Generate report
  const generateReport = useCallback(async (
    reportType: ReportType,
    parameters: Record<string, any> = {},
    exportFormat: ExportFormat = 'pdf'
  ): Promise<ReportGenerationResponse | null> => {
    if (!companyId) return null;

    const requestId = `${reportType}_${Date.now()}`;
    setGeneratingReports(prev => ({ ...prev, [requestId]: true }));

    try {
      logInfo('Starting report generation', { companyId, reportType, exportFormat });

      const request: ReportGenerationRequest = {
        reportType,
        companyId,
        parameters,
        exportFormat
      };

      const response = await ReportsService.generateReport(companyId, request);
      
      // Poll for completion if auto-refresh is enabled
      if (autoRefresh && response.status === 'generating') {
        setTimeout(() => {
          loadReports();
          loadStats();
        }, 5000);
      }

      logInfo('Report generation started successfully', { 
        companyId, 
        reportType, 
        reportId: response.id 
      });

      return response;

    } catch (error) {
      logError('Report generation failed', error as Error, { 
        companyId, 
        reportType, 
        exportFormat 
      });
      throw error;
    } finally {
      setGeneratingReports(prev => ({ ...prev, [requestId]: false }));
    }
  }, [companyId, autoRefresh, loadReports, loadStats]);

  // Download report
  const downloadReport = useCallback(async (reportId: ULID): Promise<void> => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report?.downloadUrl) {
        throw new Error('Report download URL not available');
      }

      // In a real implementation, this would trigger the download
      logInfo('Downloading report', { companyId, reportId, reportName: report.reportName });
      
      // Simulate download
      window.open(report.downloadUrl, '_blank');

    } catch (error) {
      logError('Report download failed', error as Error, { companyId, reportId });
      throw error;
    }
  }, [reports, companyId]);

  // Delete report
  const deleteReport = useCallback(async (reportId: ULID): Promise<void> => {
    try {
      await ReportsService.deleteReport(companyId, reportId);
      
      // Update local state
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      logInfo('Report deleted successfully', { companyId, reportId });
      
      // Refresh stats
      await loadStats();

    } catch (error) {
      logError('Report deletion failed', error as Error, { companyId, reportId });
      throw error;
    }
  }, [companyId, loadStats]);

  // Check report status
  const checkReportStatus = useCallback(async (reportId: ULID): Promise<ReportGenerationResponse | null> => {
    try {
      return await ReportsService.getReportStatus(companyId, reportId);
    } catch (error) {
      logError('Failed to check report status', error as Error, { companyId, reportId });
      return null;
    }
  }, [companyId]);

  // Refresh all data
  const refreshData = useCallback(async (): Promise<void> => {
    await Promise.all([loadReports(), loadStats()]);
  }, [loadReports, loadStats]);

  // Initialize data loading
  useEffect(() => {
    if (companyId) {
      refreshData();
    }
  }, [companyId, refreshData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !companyId) return;

    const interval = setInterval(() => {
      const hasGeneratingReports = reports.some(r => r.status === 'generating');
      if (hasGeneratingReports) {
        loadReports();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, companyId, reports, refreshInterval, loadReports]);

  // Computed values
  const reportsByType = useMemo(() => {
    const groups: Record<ReportType, GeneratedReport[]> = {} as Record<ReportType, GeneratedReport[]>;
    reports.forEach(report => {
      if (!groups[report.reportType]) {
        groups[report.reportType] = [];
      }
      groups[report.reportType].push(report);
    });
    return groups;
  }, [reports]);

  const recentReports = useMemo(() => {
    return [...reports]
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, 10);
  }, [reports]);

  const completedReports = useMemo(() => {
    return reports.filter(r => r.status === 'completed');
  }, [reports]);

  const generatingReportsCount = useMemo(() => {
    return reports.filter(r => r.status === 'generating').length;
  }, [reports]);

  const isGenerating = useMemo(() => {
    return Object.values(generatingReports).some(Boolean) || generatingReportsCount > 0;
  }, [generatingReports, generatingReportsCount]);

  return {
    // Data
    reports,
    stats,
    reportsByType,
    recentReports,
    completedReports,
    
    // Loading states
    loading,
    statsLoading,
    error,
    statsError,
    isGenerating,
    generatingReportsCount,
    
    // Actions
    generateReport,
    downloadReport,
    deleteReport,
    checkReportStatus,
    refreshData,
    
    // Utilities
    reset
  };
}