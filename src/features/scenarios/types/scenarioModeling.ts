/**
 * Comprehensive scenario modeling types
 * Integrates dilution, waterfall, SAFE conversions, anti-dilution, and tax calculations
 */

import { SecurityHolder, WaterfallResult } from '@/features/waterfall/calc/waterfall';
import { ShareholderPosition, RoundScenario, DilutionResult } from '@/features/scenarios/calc/dilution';
import { ISAFENote, ISAFEConversionResult } from '@/features/cap-table/calc/enhancedSAFE';
import { IAntiDilutionResult } from '@/features/cap-table/calc/antiDilution';
import { ITaxCalculationResult } from '@/features/cap-table/calc/taxCalculations';

// Enhanced round scenario that includes all advanced features
export interface EnhancedRoundScenario extends RoundScenario {
  // Anti-dilution protection
  antiDilutionType?: 'NONE' | 'FULL_RATCHET' | 'WEIGHTED_AVERAGE_BROAD' | 'WEIGHTED_AVERAGE_NARROW';
  liquidationPreferenceMultiple?: number; // e.g., 1.0, 2.0
  participationRights?: 'NONE' | 'FULL' | 'CAPPED';
  participationCap?: number; // e.g., 3.0 for 3x cap
  
  // SAFE note conversions in this round
  convertingSAFEs?: ISAFENote[];
  
  // Advanced terms
  dividendRate?: number; // annual dividend rate
  isParticipating?: boolean;
  seniorityRank?: number; // for liquidation waterfall
}

// Comprehensive scenario that includes funding + exit modeling
export interface ComprehensiveScenario {
  id: string;
  name: string;
  description?: string;
  
  // Funding rounds sequence
  fundingRounds: EnhancedRoundScenario[];
  
  // Exit scenario modeling
  exitScenarios: ExitScenario[];
  
  // Scenario metadata
  createdAt: string;
  lastModified: string;
  tags?: string[];
}

// Exit scenario with comprehensive analysis
export interface ExitScenario {
  id: string;
  name: string;
  exitValue: number; // in cents
  exitType: 'IPO' | 'ACQUISITION' | 'MERGER' | 'LIQUIDATION';
  timeframe?: string; // e.g., "2 years", "5 years"
  probability?: number; // 0-1 probability estimate
  
  // Exit scenario specific settings
  convertAllToCommon?: boolean;
  applyDragAlongRights?: boolean;
  tagAlongApplies?: boolean;
}

// Comprehensive results combining all calculations
export interface ComprehensiveScenarioResult {
  scenario: ComprehensiveScenario;
  
  // Dilution analysis through funding rounds
  dilutionResults: DilutionResult[];
  
  // Anti-dilution adjustments applied
  antiDilutionResults: IAntiDilutionResult[];
  
  // SAFE conversions
  safeConversions: ISAFEConversionResult[];
  
  // Final waterfall analysis for each exit scenario
  waterfallResults: WaterfallResult[];
  
  // Tax implications for key stakeholders
  taxAnalysis: StakeholderTaxAnalysis[];
  
  // Summary metrics
  summary: ScenarioSummary;
}

export interface StakeholderTaxAnalysis {
  stakeholderId: string;
  stakeholderName: string;
  
  // Tax analysis for different events
  exerciseTax?: ITaxCalculationResult;
  saleTax?: ITaxCalculationResult;
  
  // Tax optimization recommendations
  recommendations: string[];
  
  // Key metrics
  totalTaxLiability: number; // in cents
  effectiveRate: number; // percentage
  amtExposure?: number; // AMT liability in cents
}

export interface ScenarioSummary {
  // Ownership at different stages
  finalOwnershipDistribution: Array<{
    stakeholderId: string;
    stakeholderName: string;
    finalOwnershipPercentage: number;
    totalDilution: number; // percentage points
    estimatedValue: number; // in cents at median exit
  }>;
  
  // Financial metrics
  totalFundingRaised: number; // in cents
  finalPostMoneyValuation: number; // in cents
  totalShares: number;
  
  // Exit value range analysis
  exitValueAnalysis: Array<{
    exitScenarioId: string;
    exitScenarioName: string;
    commonHolderReturn: number; // total return in cents
    preferredHolderReturn: number; // total return in cents
    founderReturn: number; // specific founder return in cents
  }>;
  
  // Risk metrics
  downSideProtection: number; // minimum return in worst case
  upSideParticipation: number; // participation in best case
}

// Scenario comparison interface
export interface ScenarioComparison {
  scenarios: ComprehensiveScenario[];
  results: ComprehensiveScenarioResult[];
  
  // Comparison metrics
  comparison: {
    dilutionComparison: Array<{
      stakeholderId: string;
      stakeholderName: string;
      scenarioResults: Array<{
        scenarioId: string;
        finalOwnership: number;
        totalDilution: number;
      }>;
    }>;
    
    exitValueComparison: Array<{
      exitValue: number;
      scenarioReturns: Array<{
        scenarioId: string;
        totalReturn: number;
        returnMultiple: number;
      }>;
    }>;
    
    riskReturnProfile: Array<{
      scenarioId: string;
      expectedReturn: number;
      volatility: number;
      maxLoss: number;
    }>;
  };
}

// Sensitivity analysis types
export interface SensitivityAnalysis {
  baseScenario: ComprehensiveScenario;
  baseResult: ComprehensiveScenarioResult;
  
  // Variables to analyze
  sensitivityVariables: SensitivityVariable[];
  
  // Results matrix
  sensitivityResults: SensitivityResult[];
}

export interface SensitivityVariable {
  name: string;
  parameter: string; // e.g., 'preMoney', 'exitValue', 'optionPoolSize'
  baseValue: number;
  testRange: {
    min: number;
    max: number;
    steps: number;
  };
}

export interface SensitivityResult {
  variableName: string;
  parameterValue: number;
  impactOnOwnership: Array<{
    stakeholderId: string;
    ownershipChange: number; // percentage points
  }>;
  impactOnReturns: Array<{
    exitScenarioId: string;
    returnChange: number; // in cents
  }>;
}

// UI State management types
export interface ScenarioModelingState {
  // Current workspace
  activeScenario: ComprehensiveScenario | null;
  
  // UI state
  selectedRoundIndex: number | null;
  selectedExitScenarioIndex: number | null;
  comparisonMode: boolean;
  selectedScenariosForComparison: string[];
  
  // Results
  currentResults: ComprehensiveScenarioResult | null;
  comparisonResults: ScenarioComparison | null;
  sensitivityResults: SensitivityAnalysis | null;
  
  // Loading states
  isCalculating: boolean;
  isLoadingScenarios: boolean;
  
  // Error states
  calculationErrors: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

// Form state for scenario editor
export interface ScenarioEditorState {
  // Basic scenario info
  name: string;
  description: string;
  tags: string[];
  
  // Current editing states
  editingRound: EnhancedRoundScenario | null;
  editingRoundIndex: number | null;
  editingExitScenario: ExitScenario | null;
  editingExitScenarioIndex: number | null;
  
  // Validation
  validationErrors: Record<string, string>;
  hasUnsavedChanges: boolean;
}

// Advanced configuration options
export interface ModelingConfiguration {
  // Calculation precision
  decimalPrecision: number;
  roundingMethod: 'ROUND_HALF_UP' | 'ROUND_HALF_EVEN' | 'ROUND_DOWN';
  
  // Tax calculation settings
  defaultTaxRates: {
    ordinaryIncomeRate: number;
    capitalGainsRate: number;
    amtRate: number;
    stateRate: number;
  };
  
  // Anti-dilution settings
  defaultAntiDilutionType: 'WEIGHTED_AVERAGE_BROAD' | 'WEIGHTED_AVERAGE_NARROW';
  
  // Waterfall settings
  defaultLiquidationMultiple: number;
  defaultParticipationRights: 'NONE' | 'FULL' | 'CAPPED';
  
  // UI preferences
  chartColors: string[];
  defaultCurrency: 'USD' | 'EUR' | 'GBP';
  displayFormat: 'MILLIONS' | 'THOUSANDS' | 'ACTUAL';
}