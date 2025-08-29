export type DocumentType = 
  | 'stock-certificate'
  | 'option-agreement'
  | 'board-resolution'
  | 'cap-table-summary'
  | 'valuation-report'
  | '409a-report'
  | 'section-83b-election'
  | 'assignment-agreement';

export interface DocumentTemplate {
  id: string;
  type: DocumentType;
  name: string;
  description: string;
  category: string;
  isRequired: boolean;
  fields: DocumentField[];
  previewUrl?: string;
}

export interface DocumentField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'email';
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface DocumentGeneration {
  id: string;
  templateId: string;
  name: string;
  status: 'draft' | 'generating' | 'ready' | 'signed' | 'error';
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  downloadUrl?: string;
  signatureRequired: boolean;
  signedBy?: Array<{
    name: string;
    email: string;
    signedAt: Date;
    ipAddress?: string;
  }>;
}

export const documentCategories = [
  'Equity Instruments',
  'Corporate Resolutions', 
  'Reports & Valuations',
  'Tax Elections',
  'Legal Agreements'
] as const;

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'stock-cert',
    type: 'stock-certificate',
    name: 'Stock Certificate',
    description: 'Official certificate representing ownership of company shares',
    category: 'Equity Instruments',
    isRequired: true,
    fields: [
      { id: 'holderName', name: 'holderName', label: 'Shareholder Name', type: 'text', required: true },
      { id: 'shareCount', name: 'shareCount', label: 'Number of Shares', type: 'number', required: true },
      { id: 'shareClass', name: 'shareClass', label: 'Share Class', type: 'select', required: true, options: ['Common', 'Preferred A', 'Preferred B'] },
      { id: 'certificateNumber', name: 'certificateNumber', label: 'Certificate Number', type: 'text', required: true },
      { id: 'issueDate', name: 'issueDate', label: 'Issue Date', type: 'date', required: true },
      { id: 'parValue', name: 'parValue', label: 'Par Value per Share', type: 'number', required: false, defaultValue: 0.0001 }
    ]
  },
  {
    id: 'option-grant',
    type: 'option-agreement',
    name: 'Stock Option Agreement',
    description: 'Legal agreement granting stock options to employees or consultants',
    category: 'Equity Instruments',
    isRequired: true,
    fields: [
      { id: 'granteeName', name: 'granteeName', label: 'Grantee Name', type: 'text', required: true },
      { id: 'granteeEmail', name: 'granteeEmail', label: 'Grantee Email', type: 'email', required: true },
      { id: 'optionShares', name: 'optionShares', label: 'Number of Options', type: 'number', required: true },
      { id: 'exercisePrice', name: 'exercisePrice', label: 'Exercise Price per Share', type: 'number', required: true },
      { id: 'grantDate', name: 'grantDate', label: 'Grant Date', type: 'date', required: true },
      { id: 'vestingStart', name: 'vestingStart', label: 'Vesting Commencement Date', type: 'date', required: true },
      { id: 'vestingPeriod', name: 'vestingPeriod', label: 'Vesting Period (months)', type: 'number', required: true, defaultValue: 48 },
      { id: 'cliffPeriod', name: 'cliffPeriod', label: 'Cliff Period (months)', type: 'number', required: true, defaultValue: 12 },
      { id: 'expirationDate', name: 'expirationDate', label: 'Expiration Date', type: 'date', required: true }
    ]
  },
  {
    id: 'board-resolution',
    type: 'board-resolution',
    name: 'Board Resolution',
    description: 'Formal decision or authorization by the board of directors',
    category: 'Corporate Resolutions',
    isRequired: false,
    fields: [
      { id: 'resolutionTitle', name: 'resolutionTitle', label: 'Resolution Title', type: 'text', required: true },
      { id: 'meetingDate', name: 'meetingDate', label: 'Meeting Date', type: 'date', required: true },
      { id: 'resolutionText', name: 'resolutionText', label: 'Resolution Text', type: 'text', required: true },
      { id: 'directors', name: 'directors', label: 'Board Members Present', type: 'text', required: true },
      { id: 'votingResults', name: 'votingResults', label: 'Voting Results', type: 'text', required: false }
    ]
  },
  {
    id: 'cap-table-summary',
    type: 'cap-table-summary',
    name: 'Cap Table Summary',
    description: 'Comprehensive overview of company ownership structure',
    category: 'Reports & Valuations',
    isRequired: false,
    fields: [
      { id: 'reportDate', name: 'reportDate', label: 'Report Date', type: 'date', required: true },
      { id: 'includeOptions', name: 'includeOptions', label: 'Include Outstanding Options', type: 'checkbox', required: false, defaultValue: true },
      { id: 'includeWarrants', name: 'includeWarrants', label: 'Include Warrants', type: 'checkbox', required: false, defaultValue: false },
      { id: 'fullyDiluted', name: 'fullyDiluted', label: 'Show Fully Diluted Ownership', type: 'checkbox', required: false, defaultValue: true }
    ]
  },
  {
    id: '409a-report',
    type: '409a-report',
    name: '409A Valuation Report',
    description: 'IRS Section 409A valuation for option pricing compliance',
    category: 'Reports & Valuations',
    isRequired: true,
    fields: [
      { id: 'valuationDate', name: 'valuationDate', label: 'Valuation Date', type: 'date', required: true },
      { id: 'fairMarketValue', name: 'fairMarketValue', label: 'Fair Market Value per Share', type: 'number', required: true },
      { id: 'valuationMethod', name: 'valuationMethod', label: 'Valuation Method', type: 'select', required: true, 
        options: ['Market Approach', 'Income Approach', 'Asset Approach', 'Hybrid Method'] },
      { id: 'validityPeriod', name: 'validityPeriod', label: 'Validity Period (months)', type: 'number', required: true, defaultValue: 12 }
    ]
  },
  {
    id: '83b-election',
    type: 'section-83b-election',
    name: 'Section 83(b) Election',
    description: 'IRS tax election for restricted stock grants',
    category: 'Tax Elections',
    isRequired: false,
    fields: [
      { id: 'taxpayerName', name: 'taxpayerName', label: 'Taxpayer Name', type: 'text', required: true },
      { id: 'taxpayerId', name: 'taxpayerId', label: 'Taxpayer ID (SSN)', type: 'text', required: true },
      { id: 'grantDate', name: 'grantDate', label: 'Grant Date', type: 'date', required: true },
      { id: 'shareCount', name: 'shareCount', label: 'Number of Shares', type: 'number', required: true },
      { id: 'purchasePrice', name: 'purchasePrice', label: 'Purchase Price per Share', type: 'number', required: true },
      { id: 'fairMarketValue', name: 'fairMarketValue', label: 'Fair Market Value per Share', type: 'number', required: true }
    ]
  }
];