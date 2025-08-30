import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssuanceWizardProvider } from '../context/IssuanceWizardContext';
import { 
  ISecurityIssuanceForm,
  ISecurityIssuanceValidation,
  IIssuancePreview,
  ISecurityIssuanceResult,
  DEFAULT_VESTING_SCHEDULES
} from '../types/issuance.types';

// Mock data factories
export const createMockStakeholder = (overrides = {}) => ({
  id: 'stakeholder-1',
  type: 'EMPLOYEE',
  people: {
    id: 'person-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123'
  },
  entity_name: null,
  tax_id: null,
  ...overrides
});

export const createMockShareClass = (overrides = {}) => ({
  id: 'share-class-1',
  name: 'Common Stock',
  type: 'COMMON',
  authorized: 10000000,
  par_value: 0.0001,
  seniority_rank: 1,
  ...overrides
});

export const createMockFormData = (overrides: Partial<ISecurityIssuanceForm> = {}): ISecurityIssuanceForm => ({
  type: 'OPTION',
  quantity: 1000,
  shareClassId: 'share-class-1',
  strikePrice: '100', // $1.00 in cents
  grantDate: '2024-01-01',
  vestingStartDate: '2024-01-01',
  cliffMonths: 12,
  durationMonths: 48,
  frequency: 'MONTHLY',
  stakeholderId: 'stakeholder-1',
  expirationDate: '2034-01-01',
  ...overrides
});

export const createMockValidation = (overrides: Partial<ISecurityIssuanceValidation> = {}): ISecurityIssuanceValidation => ({
  isValid: true,
  errors: [],
  warnings: [],
  complianceCheck: {
    hasValid409A: true,
    fmvCompliant: true,
    recommendedStrikePrice: '100',
    expirationWarning: undefined
  },
  ...overrides
});

export const createMockPreview = (overrides: Partial<IIssuancePreview> = {}): IIssuancePreview => ({
  security: {
    type: 'Stock Options',
    quantity: 1000,
    shareClass: 'Common Stock',
    value: '$1,000.00'
  },
  grant: {
    strikePrice: '$1.00',
    grantDate: 'Jan 01, 2024',
    fairMarketValue: '$1.00',
    expirationDate: 'Jan 01, 2034'
  },
  vesting: {
    startDate: 'Jan 01, 2024',
    cliffMonths: 12,
    durationMonths: 48,
    frequency: 'MONTHLY',
    vestedToday: 0,
    vestedInOneYear: 250
  },
  stakeholder: {
    name: 'John Doe',
    type: 'Existing',
    currentOwnership: 0.5,
    newOwnership: 1.0,
    dilutionImpact: 0.5
  },
  compliance: {
    status: 'COMPLIANT',
    messages: []
  },
  estimatedValue: {
    currentValue: '$1,000.00',
    potentialValue: '$2,000.00',
    breakeven: '$1,000.00'
  },
  ...overrides
});

export const createMockResult = (overrides: Partial<ISecurityIssuanceResult> = {}): ISecurityIssuanceResult => ({
  success: true,
  securityId: 'security-123',
  grantId: 'grant-123',
  vestingScheduleId: 'vesting-123',
  transactionId: 'transaction-123',
  errors: [],
  warnings: [],
  ...overrides
});

// Mock services
export const createMockIssuanceService = () => ({
  validateIssuance: jest.fn().mockResolvedValue(createMockValidation()),
  generateIssuancePreview: jest.fn().mockResolvedValue(createMockPreview()),
  issueSecurity: jest.fn().mockResolvedValue(createMockResult()),
  getStakeholders: jest.fn().mockResolvedValue([createMockStakeholder()]),
  getShareClasses: jest.fn().mockResolvedValue([createMockShareClass()]),
  getRecommendedStrikePrice: jest.fn().mockResolvedValue({
    recommendedPrice: '100',
    currentFMV: '100',
    isCompliant: true
  })
});

// Mock CSRF service
export const createMockCSRFService = () => ({
  getToken: jest.fn().mockResolvedValue('mock-csrf-token'),
  validateToken: jest.fn().mockResolvedValue(true),
  validateFinancialTransaction: jest.fn().mockResolvedValue(true)
});

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  companyId?: string;
  initialStakeholderId?: string;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  companyId = 'test-company-1',
  initialStakeholderId 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <IssuanceWizardProvider 
        companyId={companyId} 
        initialStakeholderId={initialStakeholderId}
      >
        {children}
      </IssuanceWizardProvider>
    </QueryClientProvider>
  );
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  companyId?: string;
  initialStakeholderId?: string;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { companyId, initialStakeholderId, ...renderOptions } = options;
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestWrapper companyId={companyId} initialStakeholderId={initialStakeholderId}>
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Testing utilities
export const waitForStepToLoad = async () => {
  // Wait for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
};

export const fillFormField = (input: HTMLElement, value: string) => {
  // Helper for filling form fields consistently
  if (input instanceof HTMLInputElement) {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.blur();
  }
};

// Test data sets for comprehensive testing
export const testDataSets = {
  validOptions: createMockFormData({
    type: 'OPTION',
    quantity: 1000,
    strikePrice: '100',
    ...DEFAULT_VESTING_SCHEDULES.STANDARD_EMPLOYEE
  }),
  
  validEquity: createMockFormData({
    type: 'EQUITY',
    quantity: 500,
    strikePrice: undefined,
    cliffMonths: 0,
    durationMonths: 0
  }),
  
  invalidForm: createMockFormData({
    quantity: 0,
    stakeholderId: '',
    strikePrice: '50' // Below FMV
  }),
  
  nonCompliantStrike: createMockFormData({
    strikePrice: '50' // Below $1.00 FMV
  })
};

// Mock server responses
export const mockServerResponses = {
  success: createMockResult(),
  failure: createMockResult({
    success: false,
    errors: ['Insufficient authorized shares'],
    securityId: undefined,
    grantId: undefined
  }),
  validationError: createMockValidation({
    isValid: false,
    errors: ['Strike price below fair market value'],
    complianceCheck: {
      hasValid409A: true,
      fmvCompliant: false,
      recommendedStrikePrice: '100'
    }
  })
};

export default renderWithProviders;