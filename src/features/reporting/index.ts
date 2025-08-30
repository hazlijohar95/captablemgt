/**
 * Reporting Feature Exports
 * Central export file for all reporting components and utilities
 */

// Main Dashboard Components
export { default as BoardReportsDashboard } from './components/BoardReportsDashboard';
export { default as DilutionAnalysisDashboard } from './components/DilutionAnalysisDashboard';
export { default as RegulatoryFilingDashboard } from './components/RegulatoryFilingDashboard';
export { default as ReportGenerationEngine } from './components/ReportGenerationEngine';
export { default as ExecutiveSummary } from './components/ExecutiveSummary';

// Re-export types for convenience
export type {
  ReportTemplate,
  GeneratedReport,
  GenerateReportRequest,
  BoardPackageData,
  DilutionScenario,
  DilutionAnalysisResults,
  RegulatoryFiling,
  ComplianceCalendarEvent,
  ComplianceDashboard,
  ExecutiveSummaryData,
  KeyMetric,
  ComplianceAlert
} from '@/types/reporting';

// Re-export service for convenience
export { reportingService } from '@/services/reportingService';