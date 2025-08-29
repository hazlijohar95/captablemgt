import { ULID } from '@/types';

// Report Types
export type ReportType = 
  | 'cap_table_summary'
  | 'equity_breakdown' 
  | 'valuation_summary'
  | 'vesting_schedule'
  | 'transaction_history'
  | 'tax_summary'
  | 'investor_update';

export interface ReportTemplate {
  id: ReportType;
  name: string;
  description: string;
  category: 'ownership' | 'financial' | 'compliance' | 'operational';
  icon: string;
  exportFormats: ExportFormat[];
  parameters?: ReportParameter[];
}

export interface ReportParameter {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
}

export type ExportFormat = 'pdf' | 'csv' | 'excel' | 'json';

// Report Data Interfaces
export interface CapTableSummaryData {
  asOfDate: string;
  totalSharesOutstanding: number;
  totalSharesAuthorized: number;
  utilizationPercentage: number;
  ownershipBreakdown: OwnershipEntry[];
  securityTypeBreakdown: SecurityTypeEntry[];
}

export interface OwnershipEntry {
  stakeholderId: ULID;
  stakeholderName: string;
  stakeholderType: string;
  totalShares: number;
  ownershipPercentage: number;
  securities: SecuritySummary[];
}

export interface SecurityTypeEntry {
  type: string;
  count: number;
  totalShares: number;
  percentage: number;
}

export interface SecuritySummary {
  id: ULID;
  type: string;
  quantity: number;
  issuedAt: string;
  status: 'active' | 'cancelled';
  shareClassName?: string;
  strikePrice?: string;
  expirationDate?: string;
}

export interface EquityBreakdownData {
  asOfDate: string;
  bySecurityType: SecurityTypeBreakdown[];
  byStakeholderType: StakeholderTypeBreakdown[];
  byShareClass: ShareClassBreakdown[];
  totalEquityValue: number;
}

export interface SecurityTypeBreakdown {
  type: string;
  count: number;
  totalQuantity: number;
  percentage: number;
  estimatedValue?: number;
}

export interface StakeholderTypeBreakdown {
  type: string;
  stakeholderCount: number;
  totalShares: number;
  percentage: number;
  averageOwnership: number;
}

export interface ShareClassBreakdown {
  id: ULID;
  name: string;
  type: string;
  sharesOutstanding: number;
  sharesAuthorized: number;
  utilizationPercentage: number;
  parValue?: number;
  liquidationPreference?: number;
}

export interface ValuationSummaryData {
  asOfDate: string;
  totalCompanyValue: number;
  pricePerShare: number;
  valuationMethod: string;
  previousValuation?: {
    date: string;
    value: number;
    changePercentage: number;
  };
  shareClassValues: {
    shareClassId: ULID;
    shareClassName: string;
    pricePerShare: number;
    totalValue: number;
  }[];
}

export interface VestingScheduleData {
  asOfDate: string;
  totalOptionsGranted: number;
  totalVested: number;
  totalUnvested: number;
  vestingPercentage: number;
  schedules: VestingEntry[];
  upcomingVestingEvents: VestingEvent[];
}

export interface VestingEntry {
  securityId: ULID;
  stakeholderName: string;
  totalOptions: number;
  vestedOptions: number;
  unvestedOptions: number;
  vestingPercentage: number;
  grantDate: string;
  vestingStart: string;
  vestingEnd: string;
  cliffDate?: string;
  exercisePrice: number;
}

export interface VestingEvent {
  date: string;
  stakeholderName: string;
  sharesVesting: number;
  cumulativeVested: number;
  eventType: 'cliff' | 'monthly' | 'quarterly' | 'annual';
}

export interface TransactionHistoryData {
  fromDate: string;
  toDate: string;
  totalTransactions: number;
  transactions: TransactionEntry[];
  summary: {
    issuances: number;
    cancellations: number;
    transfers: number;
    exercises: number;
  };
}

export interface TransactionEntry {
  id: ULID;
  date: string;
  type: 'issuance' | 'cancellation' | 'transfer' | 'exercise' | 'conversion';
  securityType: string;
  quantity: number;
  stakeholderName: string;
  details: string;
  pricePerShare?: number;
  totalValue?: number;
}

// Report Generation
export interface ReportGenerationRequest {
  reportType: ReportType;
  companyId: ULID;
  parameters: Record<string, any>;
  exportFormat: ExportFormat;
}

export interface ReportGenerationResponse {
  id: ULID;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  error?: string;
  generatedAt: string;
  expiresAt: string;
}

export interface GeneratedReport {
  id: ULID;
  reportType: ReportType;
  reportName: string;
  companyId: ULID;
  generatedBy: ULID;
  generatedAt: string;
  parameters: Record<string, any>;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  exportFormat: ExportFormat;
  fileSize?: number;
  expiresAt: string;
}

// Report Statistics
export interface ReportStats {
  totalReports: number;
  reportsByType: { type: ReportType; count: number }[];
  recentReports: GeneratedReport[];
  popularReports: { type: ReportType; count: number; name: string }[];
}

// Component Props
export interface ReportsPageProps {
  companyId: ULID;
}

export interface ReportCardProps {
  template: ReportTemplate;
  onGenerate: (reportType: ReportType) => void;
  isGenerating?: boolean;
}

export interface ReportHistoryProps {
  reports: GeneratedReport[];
  onDownload: (reportId: ULID) => void;
  onDelete?: (reportId: ULID) => void;
}

export interface ReportParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ReportTemplate;
  onGenerate: (parameters: Record<string, any>, format: ExportFormat) => void;
  isGenerating?: boolean;
}