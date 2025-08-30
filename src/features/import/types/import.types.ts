export interface IImportRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface IStakeholderImportRow {
  name?: string;
  email?: string;
  phone?: string;
  type?: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
  entity_name?: string;
  tax_id?: string;
  // Securities data
  security_type?: 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';
  share_class?: string;
  quantity?: number;
  strike_price?: number;
  grant_date?: string;
  vesting_start?: string;
  vesting_months?: number;
  cliff_months?: number;
  // Additional fields
  notes?: string;
}

export interface IImportValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
}

export interface IImportValidationResult {
  isValid: boolean;
  errors: IImportValidationError[];
  warnings: IImportValidationError[];
  processedRows: IStakeholderImportRow[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface IImportMapping {
  sourceColumn: string;
  targetField: keyof IStakeholderImportRow;
  transform?: (value: any) => any;
  required?: boolean;
}

export interface IImportPreview {
  headers: string[];
  sampleRows: IImportRow[];
  detectedMappings: IImportMapping[];
  rowCount: number;
}

export interface IImportResult {
  success: boolean;
  importedStakeholders: number;
  importedSecurities: number;
  errors: IImportValidationError[];
  warnings: IImportValidationError[];
  skippedRows: number;
  transactionId?: string;
}

export type ImportFileType = 'csv' | 'xlsx' | 'json';

export interface IImportOptions {
  skipFirstRow?: boolean;
  delimiter?: string;
  encoding?: string;
  dateFormat?: string;
  skipEmptyRows?: boolean;
  validateUnique?: boolean;
  dryRun?: boolean;
}

export interface IImportProgress {
  step: 'parsing' | 'validating' | 'importing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  currentRow?: number;
  totalRows?: number;
}

export interface IImportTemplate {
  name: string;
  description: string;
  headers: string[];
  sampleData: IImportRow[];
  mappings: IImportMapping[];
}

// Standard templates for common import scenarios
export const IMPORT_TEMPLATES: Record<string, IImportTemplate> = {
  stakeholders: {
    name: 'Stakeholders Only',
    description: 'Import stakeholders without securities information',
    headers: ['name', 'email', 'phone', 'type', 'entity_name', 'tax_id'],
    sampleData: [
      {
        name: 'John Doe',
        email: 'john@company.com',
        phone: '+1-555-0123',
        type: 'FOUNDER',
        entity_name: '',
        tax_id: 'SSN-123456789'
      },
      {
        name: 'Jane Smith',
        email: 'jane@company.com',
        phone: '+1-555-0124',
        type: 'EMPLOYEE',
        entity_name: '',
        tax_id: ''
      }
    ],
    mappings: [
      { sourceColumn: 'name', targetField: 'name', required: true },
      { sourceColumn: 'email', targetField: 'email', required: true },
      { sourceColumn: 'phone', targetField: 'phone' },
      { sourceColumn: 'type', targetField: 'type', required: true },
      { sourceColumn: 'entity_name', targetField: 'entity_name' },
      { sourceColumn: 'tax_id', targetField: 'tax_id' }
    ]
  },
  
  fullCapTable: {
    name: 'Complete Cap Table',
    description: 'Import stakeholders with their securities holdings',
    headers: [
      'name', 'email', 'type', 'security_type', 'share_class', 'quantity', 
      'strike_price', 'grant_date', 'vesting_start', 'vesting_months', 'cliff_months'
    ],
    sampleData: [
      {
        name: 'John Doe',
        email: 'john@company.com',
        type: 'FOUNDER',
        security_type: 'EQUITY',
        share_class: 'Common Stock',
        quantity: 1000000,
        strike_price: 0.001,
        grant_date: '2024-01-01',
        vesting_start: '2024-01-01',
        vesting_months: 48,
        cliff_months: 12
      },
      {
        name: 'Jane Smith',
        email: 'jane@company.com',
        type: 'EMPLOYEE',
        security_type: 'OPTION',
        share_class: 'Common Stock',
        quantity: 10000,
        strike_price: 1.00,
        grant_date: '2024-03-01',
        vesting_start: '2024-03-01',
        vesting_months: 48,
        cliff_months: 12
      }
    ],
    mappings: [
      { sourceColumn: 'name', targetField: 'name', required: true },
      { sourceColumn: 'email', targetField: 'email', required: true },
      { sourceColumn: 'type', targetField: 'type', required: true },
      { sourceColumn: 'security_type', targetField: 'security_type' },
      { sourceColumn: 'share_class', targetField: 'share_class' },
      { sourceColumn: 'quantity', targetField: 'quantity', transform: (v) => parseInt(v) || 0 },
      { sourceColumn: 'strike_price', targetField: 'strike_price', transform: (v) => parseFloat(v) || 0 },
      { sourceColumn: 'grant_date', targetField: 'grant_date' },
      { sourceColumn: 'vesting_start', targetField: 'vesting_start' },
      { sourceColumn: 'vesting_months', targetField: 'vesting_months', transform: (v) => parseInt(v) || 48 },
      { sourceColumn: 'cliff_months', targetField: 'cliff_months', transform: (v) => parseInt(v) || 12 }
    ]
  },

  equity: {
    name: 'Equity Holdings',
    description: 'Import existing equity positions only',
    headers: ['name', 'email', 'type', 'share_class', 'quantity', 'grant_date'],
    sampleData: [
      {
        name: 'Venture Fund I',
        email: 'contact@venturefund.com',
        type: 'INVESTOR',
        share_class: 'Series A Preferred',
        quantity: 500000,
        grant_date: '2024-06-01'
      }
    ],
    mappings: [
      { sourceColumn: 'name', targetField: 'name', required: true },
      { sourceColumn: 'email', targetField: 'email', required: true },
      { sourceColumn: 'type', targetField: 'type', required: true },
      { sourceColumn: 'share_class', targetField: 'share_class', required: true },
      { sourceColumn: 'quantity', targetField: 'quantity', required: true, transform: (v) => parseInt(v) || 0 },
      { sourceColumn: 'grant_date', targetField: 'grant_date', required: true }
    ]
  }
};