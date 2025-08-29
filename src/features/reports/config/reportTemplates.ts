import { ReportTemplate, ReportParameter } from '../types';

// Report Parameters
const asOfDateParameter: ReportParameter = {
  id: 'asOfDate',
  name: 'As of Date',
  type: 'date',
  required: true,
  defaultValue: new Date().toISOString().split('T')[0]
};

const dateRangeParameters: ReportParameter[] = [
  {
    id: 'fromDate',
    name: 'From Date',
    type: 'date',
    required: true,
    defaultValue: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    id: 'toDate',
    name: 'To Date',
    type: 'date',
    required: true,
    defaultValue: new Date().toISOString().split('T')[0]
  }
];

const stakeholderTypeParameter: ReportParameter = {
  id: 'stakeholderTypes',
  name: 'Stakeholder Types',
  type: 'multiselect',
  required: false,
  options: [
    { value: 'FOUNDER', label: 'Founders' },
    { value: 'EMPLOYEE', label: 'Employees' },
    { value: 'INVESTOR', label: 'Investors' },
    { value: 'ADVISOR', label: 'Advisors' },
    { value: 'CONSULTANT', label: 'Consultants' },
    { value: 'ENTITY', label: 'Entities' }
  ]
};

const includeOptionsParameter: ReportParameter = {
  id: 'includeOptions',
  name: 'Include Stock Options',
  type: 'boolean',
  required: false,
  defaultValue: true
};

// Report Templates
export const reportTemplates: ReportTemplate[] = [
  {
    id: 'cap_table_summary',
    name: 'Cap Table Summary',
    description: 'Complete ownership breakdown showing all shareholders, their holdings, and ownership percentages',
    category: 'ownership',
    icon: 'TableCellsIcon',
    exportFormats: ['pdf', 'csv', 'excel'],
    parameters: [
      asOfDateParameter,
      includeOptionsParameter,
      stakeholderTypeParameter
    ]
  },
  {
    id: 'equity_breakdown',
    name: 'Equity Breakdown',
    description: 'Detailed analysis of equity distribution by security type, stakeholder type, and share class',
    category: 'ownership',
    icon: 'ChartPieIcon',
    exportFormats: ['pdf', 'csv', 'excel'],
    parameters: [
      asOfDateParameter,
      {
        id: 'groupBy',
        name: 'Group By',
        type: 'select',
        required: true,
        defaultValue: 'securityType',
        options: [
          { value: 'securityType', label: 'Security Type' },
          { value: 'stakeholderType', label: 'Stakeholder Type' },
          { value: 'shareClass', label: 'Share Class' }
        ]
      }
    ]
  },
  {
    id: 'valuation_summary',
    name: 'Valuation Summary',
    description: '409A valuation summary with share prices and company valuation metrics',
    category: 'financial',
    icon: 'CurrencyDollarIcon',
    exportFormats: ['pdf', 'excel'],
    parameters: [
      asOfDateParameter,
      {
        id: 'includeComparisons',
        name: 'Include Historical Comparisons',
        type: 'boolean',
        required: false,
        defaultValue: true
      }
    ]
  },
  {
    id: 'vesting_schedule',
    name: 'Vesting Schedule',
    description: 'Complete vesting schedules for all outstanding options with upcoming vesting events',
    category: 'operational',
    icon: 'CalendarIcon',
    exportFormats: ['pdf', 'csv', 'excel'],
    parameters: [
      asOfDateParameter,
      {
        id: 'timeHorizon',
        name: 'Time Horizon',
        type: 'select',
        required: true,
        defaultValue: '12',
        options: [
          { value: '6', label: 'Next 6 months' },
          { value: '12', label: 'Next 12 months' },
          { value: '24', label: 'Next 24 months' },
          { value: 'all', label: 'Full vesting period' }
        ]
      },
      stakeholderTypeParameter
    ]
  },
  {
    id: 'transaction_history',
    name: 'Transaction History',
    description: 'Complete transaction log of all security issuances, cancellations, and transfers',
    category: 'operational',
    icon: 'ClipboardDocumentListIcon',
    exportFormats: ['pdf', 'csv', 'excel'],
    parameters: [
      ...dateRangeParameters,
      {
        id: 'transactionTypes',
        name: 'Transaction Types',
        type: 'multiselect',
        required: false,
        options: [
          { value: 'issuance', label: 'Issuances' },
          { value: 'cancellation', label: 'Cancellations' },
          { value: 'transfer', label: 'Transfers' },
          { value: 'exercise', label: 'Exercises' },
          { value: 'conversion', label: 'Conversions' }
        ]
      },
      stakeholderTypeParameter
    ]
  },
  {
    id: 'tax_summary',
    name: 'Tax Summary',
    description: 'Tax reporting summary for compliance and filing purposes',
    category: 'compliance',
    icon: 'DocumentTextIcon',
    exportFormats: ['pdf', 'excel'],
    parameters: [
      {
        id: 'taxYear',
        name: 'Tax Year',
        type: 'select',
        required: true,
        defaultValue: new Date().getFullYear().toString(),
        options: [
          { value: '2024', label: '2024' },
          { value: '2023', label: '2023' },
          { value: '2022', label: '2022' },
          { value: '2021', label: '2021' }
        ]
      },
      {
        id: 'includeExercises',
        name: 'Include Option Exercises',
        type: 'boolean',
        required: false,
        defaultValue: true
      }
    ]
  },
  {
    id: 'investor_update',
    name: 'Investor Update',
    description: 'Comprehensive investor update with key metrics and cap table changes',
    category: 'operational',
    icon: 'PresentationChartBarIcon',
    exportFormats: ['pdf'],
    parameters: [
      asOfDateParameter,
      {
        id: 'quarterlyUpdate',
        name: 'Quarterly Update',
        type: 'boolean',
        required: false,
        defaultValue: false
      },
      {
        id: 'includeMetrics',
        name: 'Include Key Metrics',
        type: 'boolean',
        required: false,
        defaultValue: true
      }
    ]
  }
];

// Report Categories
export const reportCategories = [
  {
    id: 'ownership',
    name: 'Ownership Reports',
    description: 'Cap table and equity ownership analysis',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'financial',
    name: 'Financial Reports',
    description: 'Valuation and financial metrics',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'compliance',
    name: 'Compliance Reports',
    description: 'Tax and regulatory reporting',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 'operational',
    name: 'Operational Reports',
    description: 'Vesting schedules and transaction history',
    color: 'bg-purple-100 text-purple-800'
  }
];

// Quick Actions
export const quickReports = [
  'cap_table_summary',
  'equity_breakdown',
  'vesting_schedule'
];

export const getReportTemplate = (reportType: string): ReportTemplate | undefined => {
  return reportTemplates.find(template => template.id === reportType);
};

export const getReportsByCategory = (category: string): ReportTemplate[] => {
  return reportTemplates.filter(template => template.category === category);
};