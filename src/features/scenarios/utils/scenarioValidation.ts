/**
 * Comprehensive validation utilities for scenario modeling
 * Ensures data integrity and provides detailed error messages
 */

import Decimal from 'decimal.js';
import { 
  ComprehensiveScenario, 
  EnhancedRoundScenario, 
  ExitScenario 
} from '../types/scenarioModeling';
import { 
  isValidCents, 
  isValidPrice, 
  isValidValuation, 
  isValidPercentage,
  isValidShareClass,
  isValidAntiDilutionType,
  isValidParticipationRights,
  isValidExitType,
  ValidationResult,
  validateAndParse
} from '@/utils/typeGuards';

// Validation error types
export interface ScenarioValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
  context?: Record<string, any>;
}

export interface ScenarioValidationResult {
  isValid: boolean;
  errors: ScenarioValidationError[];
  warnings: ScenarioValidationError[];
}

// Business rule constants
export const SCENARIO_VALIDATION_RULES = {
  MIN_PRE_MONEY: 100000, // $1,000 in cents
  MAX_PRE_MONEY: 1000000000000, // $10B in cents
  MIN_INVESTMENT: 10000, // $100 in cents
  MAX_INVESTMENT: 500000000000, // $5B in cents
  MIN_PRICE_PER_SHARE: 1, // $0.01 in cents
  MAX_PRICE_PER_SHARE: 100000000, // $1M in cents
  MIN_EXIT_VALUE: 100000, // $1,000 in cents
  MAX_EXIT_VALUE: 10000000000000, // $100B in cents
  MAX_LIQUIDATION_MULTIPLE: 10.0,
  MAX_PARTICIPATION_CAP: 20.0,
  MAX_OPTION_POOL_INCREASE: 0.5, // 50%
  MIN_PROBABILITY: 0.0,
  MAX_PROBABILITY: 1.0,
  MAX_FUNDING_ROUNDS: 20,
  MAX_EXIT_SCENARIOS: 10,
  SCENARIO_NAME_MAX_LENGTH: 100,
  ROUND_NAME_MAX_LENGTH: 50
} as const;

/**
 * Validate a funding round scenario
 */
export function validateFundingRound(
  round: EnhancedRoundScenario, 
  index: number
): ScenarioValidationResult {
  const errors: ScenarioValidationError[] = [];
  const warnings: ScenarioValidationError[] = [];

  // Name validation
  if (!round.name || round.name.trim().length === 0) {
    errors.push({
      field: `rounds[${index}].name`,
      message: 'Round name is required',
      code: 'ROUND_NAME_REQUIRED',
      severity: 'error'
    });
  } else if (round.name.length > SCENARIO_VALIDATION_RULES.ROUND_NAME_MAX_LENGTH) {
    errors.push({
      field: `rounds[${index}].name`,
      message: `Round name must be ${SCENARIO_VALIDATION_RULES.ROUND_NAME_MAX_LENGTH} characters or less`,
      code: 'ROUND_NAME_TOO_LONG',
      severity: 'error'
    });
  }

  // Pre-money validation
  if (!isValidCents(round.preMoney)) {
    errors.push({
      field: `rounds[${index}].preMoney`,
      message: 'Pre-money valuation must be a positive integer (in cents)',
      code: 'INVALID_PRE_MONEY',
      severity: 'error'
    });
  } else if (round.preMoney < SCENARIO_VALIDATION_RULES.MIN_PRE_MONEY) {
    errors.push({
      field: `rounds[${index}].preMoney`,
      message: `Pre-money valuation must be at least $${SCENARIO_VALIDATION_RULES.MIN_PRE_MONEY / 100}`,
      code: 'PRE_MONEY_TOO_LOW',
      severity: 'error'
    });
  } else if (round.preMoney > SCENARIO_VALIDATION_RULES.MAX_PRE_MONEY) {
    errors.push({
      field: `rounds[${index}].preMoney`,
      message: `Pre-money valuation cannot exceed $${SCENARIO_VALIDATION_RULES.MAX_PRE_MONEY / 100}`,
      code: 'PRE_MONEY_TOO_HIGH',
      severity: 'error'
    });
  }

  // Investment amount validation
  if (!isValidCents(round.investmentAmount)) {
    errors.push({
      field: `rounds[${index}].investmentAmount`,
      message: 'Investment amount must be a positive integer (in cents)',
      code: 'INVALID_INVESTMENT_AMOUNT',
      severity: 'error'
    });
  } else if (round.investmentAmount < SCENARIO_VALIDATION_RULES.MIN_INVESTMENT) {
    errors.push({
      field: `rounds[${index}].investmentAmount`,
      message: `Investment amount must be at least $${SCENARIO_VALIDATION_RULES.MIN_INVESTMENT / 100}`,
      code: 'INVESTMENT_TOO_LOW',
      severity: 'error'
    });
  } else if (round.investmentAmount > SCENARIO_VALIDATION_RULES.MAX_INVESTMENT) {
    errors.push({
      field: `rounds[${index}].investmentAmount`,
      message: `Investment amount cannot exceed $${SCENARIO_VALIDATION_RULES.MAX_INVESTMENT / 100}`,
      code: 'INVESTMENT_TOO_HIGH',
      severity: 'error'
    });
  }

  // Price per share validation
  if (!isValidPrice(round.pricePerShare)) {
    errors.push({
      field: `rounds[${index}].pricePerShare`,
      message: 'Price per share must be a positive number (in cents)',
      code: 'INVALID_PRICE_PER_SHARE',
      severity: 'error'
    });
  } else if (round.pricePerShare < SCENARIO_VALIDATION_RULES.MIN_PRICE_PER_SHARE) {
    errors.push({
      field: `rounds[${index}].pricePerShare`,
      message: `Price per share must be at least $${SCENARIO_VALIDATION_RULES.MIN_PRICE_PER_SHARE / 100}`,
      code: 'PRICE_TOO_LOW',
      severity: 'error'
    });
  } else if (round.pricePerShare > SCENARIO_VALIDATION_RULES.MAX_PRICE_PER_SHARE) {
    errors.push({
      field: `rounds[${index}].pricePerShare`,
      message: `Price per share cannot exceed $${SCENARIO_VALIDATION_RULES.MAX_PRICE_PER_SHARE / 100}`,
      code: 'PRICE_TOO_HIGH',
      severity: 'error'
    });
  }

  // Share class validation
  if (!isValidShareClass(round.shareClass)) {
    errors.push({
      field: `rounds[${index}].shareClass`,
      message: 'Share class must be COMMON or PREFERRED',
      code: 'INVALID_SHARE_CLASS',
      severity: 'error'
    });
  }

  // Optional fields validation
  if (round.optionPoolIncrease !== undefined) {
    if (!isValidPercentage(round.optionPoolIncrease * 100)) {
      errors.push({
        field: `rounds[${index}].optionPoolIncrease`,
        message: 'Option pool increase must be a valid percentage',
        code: 'INVALID_OPTION_POOL',
        severity: 'error'
      });
    } else if (round.optionPoolIncrease > SCENARIO_VALIDATION_RULES.MAX_OPTION_POOL_INCREASE) {
      warnings.push({
        field: `rounds[${index}].optionPoolIncrease`,
        message: `Option pool increase of ${(round.optionPoolIncrease * 100).toFixed(1)}% is unusually high`,
        code: 'HIGH_OPTION_POOL',
        severity: 'warning'
      });
    }
  }

  if (round.antiDilutionType && !isValidAntiDilutionType(round.antiDilutionType)) {
    errors.push({
      field: `rounds[${index}].antiDilutionType`,
      message: 'Invalid anti-dilution protection type',
      code: 'INVALID_ANTI_DILUTION',
      severity: 'error'
    });
  }

  if (round.liquidationPreferenceMultiple !== undefined) {
    if (round.liquidationPreferenceMultiple < 0) {
      errors.push({
        field: `rounds[${index}].liquidationPreferenceMultiple`,
        message: 'Liquidation preference multiple cannot be negative',
        code: 'NEGATIVE_LIQUIDATION_PREF',
        severity: 'error'
      });
    } else if (round.liquidationPreferenceMultiple > SCENARIO_VALIDATION_RULES.MAX_LIQUIDATION_MULTIPLE) {
      warnings.push({
        field: `rounds[${index}].liquidationPreferenceMultiple`,
        message: `Liquidation preference of ${round.liquidationPreferenceMultiple}x is unusually high`,
        code: 'HIGH_LIQUIDATION_PREF',
        severity: 'warning'
      });
    }
  }

  if (round.participationRights && !isValidParticipationRights(round.participationRights)) {
    errors.push({
      field: `rounds[${index}].participationRights`,
      message: 'Invalid participation rights setting',
      code: 'INVALID_PARTICIPATION',
      severity: 'error'
    });
  }

  if (round.participationCap !== undefined && round.participationCap < 0) {
    errors.push({
      field: `rounds[${index}].participationCap`,
      message: 'Participation cap cannot be negative',
      code: 'NEGATIVE_PARTICIPATION_CAP',
      severity: 'error'
    });
  } else if (round.participationCap && round.participationCap > SCENARIO_VALIDATION_RULES.MAX_PARTICIPATION_CAP) {
    warnings.push({
      field: `rounds[${index}].participationCap`,
      message: `Participation cap of ${round.participationCap}x is unusually high`,
      code: 'HIGH_PARTICIPATION_CAP',
      severity: 'warning'
    });
  }

  // Business logic validations
  if (isValidCents(round.preMoney) && isValidCents(round.investmentAmount) && isValidPrice(round.pricePerShare)) {
    const impliedShares = new Decimal(round.investmentAmount).dividedBy(round.pricePerShare);
    const impliedValuation = impliedShares.times(round.pricePerShare);
    
    // Check if investment amount and price per share are consistent
    if (!impliedValuation.equals(round.investmentAmount)) {
      const tolerance = new Decimal(round.investmentAmount).times(0.01); // 1% tolerance
      const difference = impliedValuation.minus(round.investmentAmount).abs();
      
      if (difference.greaterThan(tolerance)) {
        warnings.push({
          field: `rounds[${index}].pricePerShare`,
          message: 'Investment amount and price per share may not be consistent',
          code: 'INCONSISTENT_PRICING',
          severity: 'warning',
          context: {
            calculatedInvestment: impliedValuation.toNumber(),
            providedInvestment: round.investmentAmount,
            difference: difference.toNumber()
          }
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate an exit scenario
 */
export function validateExitScenario(
  exitScenario: ExitScenario, 
  index: number
): ScenarioValidationResult {
  const errors: ScenarioValidationError[] = [];
  const warnings: ScenarioValidationError[] = [];

  // Name validation
  if (!exitScenario.name || exitScenario.name.trim().length === 0) {
    errors.push({
      field: `exits[${index}].name`,
      message: 'Exit scenario name is required',
      code: 'EXIT_NAME_REQUIRED',
      severity: 'error'
    });
  }

  // Exit value validation
  if (!isValidCents(exitScenario.exitValue)) {
    errors.push({
      field: `exits[${index}].exitValue`,
      message: 'Exit value must be a positive integer (in cents)',
      code: 'INVALID_EXIT_VALUE',
      severity: 'error'
    });
  } else if (exitScenario.exitValue < SCENARIO_VALIDATION_RULES.MIN_EXIT_VALUE) {
    errors.push({
      field: `exits[${index}].exitValue`,
      message: `Exit value must be at least $${SCENARIO_VALIDATION_RULES.MIN_EXIT_VALUE / 100}`,
      code: 'EXIT_VALUE_TOO_LOW',
      severity: 'error'
    });
  } else if (exitScenario.exitValue > SCENARIO_VALIDATION_RULES.MAX_EXIT_VALUE) {
    warnings.push({
      field: `exits[${index}].exitValue`,
      message: `Exit value of $${exitScenario.exitValue / 100} is extremely high`,
      code: 'EXIT_VALUE_VERY_HIGH',
      severity: 'warning'
    });
  }

  // Exit type validation
  if (!isValidExitType(exitScenario.exitType)) {
    errors.push({
      field: `exits[${index}].exitType`,
      message: 'Invalid exit type',
      code: 'INVALID_EXIT_TYPE',
      severity: 'error'
    });
  }

  // Probability validation
  if (exitScenario.probability !== undefined) {
    if (exitScenario.probability < SCENARIO_VALIDATION_RULES.MIN_PROBABILITY || 
        exitScenario.probability > SCENARIO_VALIDATION_RULES.MAX_PROBABILITY) {
      errors.push({
        field: `exits[${index}].probability`,
        message: 'Probability must be between 0 and 1',
        code: 'INVALID_PROBABILITY',
        severity: 'error'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a complete comprehensive scenario
 */
export function validateComprehensiveScenario(
  scenario: ComprehensiveScenario
): ScenarioValidationResult {
  const errors: ScenarioValidationError[] = [];
  const warnings: ScenarioValidationError[] = [];

  // Scenario name validation
  if (!scenario.name || scenario.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Scenario name is required',
      code: 'SCENARIO_NAME_REQUIRED',
      severity: 'error'
    });
  } else if (scenario.name.length > SCENARIO_VALIDATION_RULES.SCENARIO_NAME_MAX_LENGTH) {
    errors.push({
      field: 'name',
      message: `Scenario name must be ${SCENARIO_VALIDATION_RULES.SCENARIO_NAME_MAX_LENGTH} characters or less`,
      code: 'SCENARIO_NAME_TOO_LONG',
      severity: 'error'
    });
  }

  // Funding rounds validation
  if (scenario.fundingRounds.length > SCENARIO_VALIDATION_RULES.MAX_FUNDING_ROUNDS) {
    warnings.push({
      field: 'fundingRounds',
      message: `Unusually high number of funding rounds (${scenario.fundingRounds.length})`,
      code: 'MANY_FUNDING_ROUNDS',
      severity: 'warning'
    });
  }

  scenario.fundingRounds.forEach((round, index) => {
    const roundValidation = validateFundingRound(round, index);
    errors.push(...roundValidation.errors);
    warnings.push(...roundValidation.warnings);
  });

  // Exit scenarios validation
  if (scenario.exitScenarios.length === 0) {
    errors.push({
      field: 'exitScenarios',
      message: 'At least one exit scenario is required',
      code: 'NO_EXIT_SCENARIOS',
      severity: 'error'
    });
  } else if (scenario.exitScenarios.length > SCENARIO_VALIDATION_RULES.MAX_EXIT_SCENARIOS) {
    warnings.push({
      field: 'exitScenarios',
      message: `Unusually high number of exit scenarios (${scenario.exitScenarios.length})`,
      code: 'MANY_EXIT_SCENARIOS',
      severity: 'warning'
    });
  }

  scenario.exitScenarios.forEach((exitScenario, index) => {
    const exitValidation = validateExitScenario(exitScenario, index);
    errors.push(...exitValidation.errors);
    warnings.push(...exitValidation.warnings);
  });

  // Cross-scenario validations
  if (scenario.fundingRounds.length > 0 && scenario.exitScenarios.length > 0) {
    // Check if exit values are reasonable compared to funding
    const totalFunding = scenario.fundingRounds.reduce(
      (sum, round) => new Decimal(sum).plus(round.investmentAmount).toNumber(), 
      0
    );
    const totalPreMoney = scenario.fundingRounds.length > 0 
      ? scenario.fundingRounds[scenario.fundingRounds.length - 1].preMoney 
      : 0;
    const finalPostMoney = new Decimal(totalPreMoney).plus(totalFunding).toNumber();

    scenario.exitScenarios.forEach((exitScenario, index) => {
      if (exitScenario.exitValue < finalPostMoney * 0.1) {
        warnings.push({
          field: `exits[${index}].exitValue`,
          message: 'Exit value is significantly lower than post-money valuation',
          code: 'LOW_EXIT_VALUE',
          severity: 'warning',
          context: {
            exitValue: exitScenario.exitValue,
            postMoneyValuation: finalPostMoney
          }
        });
      }
    });
  }

  // Probability validation across exit scenarios
  const totalProbability = scenario.exitScenarios.reduce(
    (sum, exit) => sum + (exit.probability || 0), 
    0
  );
  
  if (totalProbability > 1.0) {
    warnings.push({
      field: 'exitScenarios',
      message: 'Total probability across exit scenarios exceeds 100%',
      code: 'PROBABILITY_OVER_100',
      severity: 'warning',
      context: { totalProbability }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Helper function to get validation summary
 */
export function getValidationSummary(result: ScenarioValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return 'No issues found';
  }

  const parts = [];
  
  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`);
  }
  
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}`);
  }

  return parts.join(', ');
}