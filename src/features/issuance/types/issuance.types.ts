export interface ISecurityIssuanceForm {
  // Basic Security Information
  type: 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';
  quantity: number;
  shareClassId?: string;
  
  // Grant Information (for options/RSUs)
  strikePrice?: string; // in cents
  grantDate: string;
  
  // Vesting Information
  vestingStartDate: string;
  cliffMonths: number;
  durationMonths: number;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  
  // Stakeholder Information
  stakeholderId: string;
  
  // Additional Terms
  expirationDate?: string;
  notes?: string;
}

export interface ISecurityIssuanceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  complianceCheck?: {
    hasValid409A: boolean;
    fmvCompliant: boolean;
    recommendedStrikePrice?: string;
    expirationWarning?: string;
  };
}

export interface IIssuanceStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  optional?: boolean;
}

export interface ISecurityIssuanceResult {
  success: boolean;
  securityId?: string;
  grantId?: string;
  vestingScheduleId?: string;
  transactionId?: string;
  errors: string[];
  warnings: string[];
}

export interface IIssuancePreview {
  security: {
    type: string;
    quantity: number;
    shareClass: string;
    value: string; // Total value
  };
  grant?: {
    strikePrice: string;
    grantDate: string;
    fairMarketValue: string;
    expirationDate: string;
  };
  vesting: {
    startDate: string;
    cliffMonths: number;
    durationMonths: number;
    frequency: string;
    vestedToday: number;
    vestedInOneYear: number;
  };
  stakeholder: {
    name: string;
    type: string;
    currentOwnership: number;
    newOwnership: number;
    dilutionImpact: number;
  };
  compliance: {
    status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
    messages: string[];
  };
  estimatedValue: {
    currentValue: string;
    potentialValue: string;
    breakeven?: string;
  };
}

export const ISSUANCE_STEPS: IIssuanceStep[] = [
  {
    id: 'stakeholder',
    title: 'Select Stakeholder',
    description: 'Choose who will receive the security',
    completed: false,
    current: true
  },
  {
    id: 'security',
    title: 'Security Details',
    description: 'Configure security type and quantity',
    completed: false,
    current: false
  },
  {
    id: 'pricing',
    title: 'Pricing & Terms',
    description: 'Set strike price and expiration',
    completed: false,
    current: false
  },
  {
    id: 'vesting',
    title: 'Vesting Schedule',
    description: 'Configure vesting terms',
    completed: false,
    current: false
  },
  {
    id: 'review',
    title: 'Review & Compliance',
    description: 'Final review and compliance check',
    completed: false,
    current: false
  },
  {
    id: 'issue',
    title: 'Issue Security',
    description: 'Execute the transaction',
    completed: false,
    current: false
  }
];

export const SECURITY_TYPE_CONFIGS = {
  EQUITY: {
    label: 'Equity (Shares)',
    description: 'Direct ownership shares in the company',
    requiresStrikePrice: false,
    requiresVesting: false,
    requiresExpiration: false,
    icon: '📊'
  },
  OPTION: {
    label: 'Stock Options',
    description: 'Right to purchase shares at a fixed price',
    requiresStrikePrice: true,
    requiresVesting: true,
    requiresExpiration: true,
    icon: '🎯'
  },
  RSU: {
    label: 'Restricted Stock Units',
    description: 'Promise of shares upon vesting',
    requiresStrikePrice: false,
    requiresVesting: true,
    requiresExpiration: false,
    icon: '🔒'
  },
  WARRANT: {
    label: 'Warrants',
    description: 'Long-term option to purchase shares',
    requiresStrikePrice: true,
    requiresVesting: false,
    requiresExpiration: true,
    icon: '📜'
  },
  SAFE: {
    label: 'SAFE Agreement',
    description: 'Simple Agreement for Future Equity',
    requiresStrikePrice: false,
    requiresVesting: false,
    requiresExpiration: false,
    icon: '🛡️'
  },
  NOTE: {
    label: 'Convertible Note',
    description: 'Debt that converts to equity',
    requiresStrikePrice: false,
    requiresVesting: false,
    requiresExpiration: true,
    icon: '📝'
  }
};

export const DEFAULT_VESTING_SCHEDULES = {
  STANDARD_EMPLOYEE: {
    cliffMonths: 12,
    durationMonths: 48,
    frequency: 'MONTHLY' as const
  },
  FOUNDER: {
    cliffMonths: 12,
    durationMonths: 48,
    frequency: 'MONTHLY' as const
  },
  ADVISOR: {
    cliffMonths: 12,
    durationMonths: 24,
    frequency: 'MONTHLY' as const
  },
  CONSULTANT: {
    cliffMonths: 0,
    durationMonths: 24,
    frequency: 'MONTHLY' as const
  },
  NO_VESTING: {
    cliffMonths: 0,
    durationMonths: 0,
    frequency: 'MONTHLY' as const
  }
};