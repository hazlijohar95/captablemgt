/**
 * Type guards and validation utilities for better type safety
 * Addresses unsafe type assertions and missing validation
 */

import { 
  ComprehensiveScenario, 
  EnhancedRoundScenario, 
  ExitScenario 
} from '@/features/scenarios/types/scenarioModeling';

// Base type guard utilities
export const isString = (value: unknown): value is string => 
  typeof value === 'string';

export const isNumber = (value: unknown): value is number => 
  typeof value === 'number' && !isNaN(value) && isFinite(value);

export const isPositiveNumber = (value: unknown): value is number =>
  isNumber(value) && value > 0;

export const isNonNegativeNumber = (value: unknown): value is number =>
  isNumber(value) && value >= 0;

export const isValidCents = (value: unknown): value is number =>
  isNumber(value) && Number.isInteger(value) && value >= 0;

export const isArray = <T>(value: unknown, itemGuard: (item: unknown) => item is T): value is T[] =>
  Array.isArray(value) && value.every(itemGuard);

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Financial value validation
export const isValidPrice = (value: unknown): value is number => {
  if (!isNumber(value)) return false;
  return value > 0 && value <= 1000000000000; // Max $10B in cents
};

export const isValidValuation = (value: unknown): value is number => {
  if (!isNumber(value)) return false;
  return value > 0 && value <= 10000000000000; // Max $100B in cents
};

export const isValidPercentage = (value: unknown): value is number => {
  if (!isNumber(value)) return false;
  return value >= 0 && value <= 100;
};

export const isValidProbability = (value: unknown): value is number => {
  if (!isNumber(value)) return false;
  return value >= 0 && value <= 1;
};

// Share class validation
export const isValidShareClass = (value: unknown): value is 'COMMON' | 'PREFERRED' => {
  return value === 'COMMON' || value === 'PREFERRED';
};

// Anti-dilution type validation
export const isValidAntiDilutionType = (
  value: unknown
): value is 'NONE' | 'FULL_RATCHET' | 'WEIGHTED_AVERAGE_BROAD' | 'WEIGHTED_AVERAGE_NARROW' => {
  return ['NONE', 'FULL_RATCHET', 'WEIGHTED_AVERAGE_BROAD', 'WEIGHTED_AVERAGE_NARROW'].includes(value as string);
};

// Participation rights validation
export const isValidParticipationRights = (
  value: unknown
): value is 'NONE' | 'FULL' | 'CAPPED' => {
  return ['NONE', 'FULL', 'CAPPED'].includes(value as string);
};

// Exit type validation
export const isValidExitType = (
  value: unknown
): value is 'IPO' | 'ACQUISITION' | 'MERGER' | 'LIQUIDATION' => {
  return ['IPO', 'ACQUISITION', 'MERGER', 'LIQUIDATION'].includes(value as string);
};

// Complex type guards for scenario objects
export const isValidFundingRound = (value: unknown): value is EnhancedRoundScenario => {
  if (!isObject(value)) return false;

  const round = value as Record<string, unknown>;

  // Required fields
  if (!isString(round.name) || round.name.trim().length === 0) return false;
  if (!isValidValuation(round.preMoney)) return false;
  if (!isValidCents(round.investmentAmount)) return false;
  if (!isValidPrice(round.pricePerShare)) return false;
  if (!isValidShareClass(round.shareClass)) return false;

  // Optional fields validation
  if (round.optionPoolIncrease !== undefined && !isValidPercentage(round.optionPoolIncrease)) return false;
  if (round.antiDilutionType !== undefined && !isValidAntiDilutionType(round.antiDilutionType)) return false;
  if (round.liquidationPreferenceMultiple !== undefined && !isPositiveNumber(round.liquidationPreferenceMultiple)) return false;
  if (round.participationRights !== undefined && !isValidParticipationRights(round.participationRights)) return false;
  if (round.participationCap !== undefined && !isPositiveNumber(round.participationCap)) return false;
  if (round.dividendRate !== undefined && !isNonNegativeNumber(round.dividendRate)) return false;
  if (round.isParticipating !== undefined && typeof round.isParticipating !== 'boolean') return false;
  if (round.seniorityRank !== undefined && !isPositiveNumber(round.seniorityRank)) return false;

  return true;
};

export const isValidExitScenario = (value: unknown): value is ExitScenario => {
  if (!isObject(value)) return false;

  const exit = value as Record<string, unknown>;

  // Required fields
  if (!isString(exit.id) || exit.id.trim().length === 0) return false;
  if (!isString(exit.name) || exit.name.trim().length === 0) return false;
  if (!isValidValuation(exit.exitValue)) return false;
  if (!isValidExitType(exit.exitType)) return false;

  // Optional fields validation
  if (exit.timeframe !== undefined && !isString(exit.timeframe)) return false;
  if (exit.probability !== undefined && !isValidProbability(exit.probability)) return false;
  if (exit.convertAllToCommon !== undefined && typeof exit.convertAllToCommon !== 'boolean') return false;
  if (exit.applyDragAlongRights !== undefined && typeof exit.applyDragAlongRights !== 'boolean') return false;
  if (exit.tagAlongApplies !== undefined && typeof exit.tagAlongApplies !== 'boolean') return false;

  return true;
};

export const isValidComprehensiveScenario = (value: unknown): value is ComprehensiveScenario => {
  if (!isObject(value)) return false;

  const scenario = value as Record<string, unknown>;

  // Required fields
  if (!isString(scenario.id) || scenario.id.trim().length === 0) return false;
  if (!isString(scenario.name) || scenario.name.trim().length === 0) return false;
  if (!Array.isArray(scenario.fundingRounds)) return false;
  if (!Array.isArray(scenario.exitScenarios) || scenario.exitScenarios.length === 0) return false;
  if (!isString(scenario.createdAt)) return false;
  if (!isString(scenario.lastModified)) return false;

  // Validate arrays
  if (!scenario.fundingRounds.every(isValidFundingRound)) return false;
  if (!scenario.exitScenarios.every(isValidExitScenario)) return false;

  // Optional fields
  if (scenario.description !== undefined && !isString(scenario.description)) return false;
  if (scenario.tags !== undefined) {
    if (!Array.isArray(scenario.tags) || !scenario.tags.every(isString)) return false;
  }

  // Date validation
  try {
    new Date(scenario.createdAt as string);
    new Date(scenario.lastModified as string);
  } catch {
    return false;
  }

  return true;
};

// Result type helpers for safer error handling
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; path?: string };

export const validateAndParse = <T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  errorMessage: string
): ValidationResult<T> => {
  if (guard(value)) {
    return { success: true, data: value };
  }
  return { success: false, error: errorMessage };
};

// Schema-like validation for complex objects
export class ValidationSchema<T> {
  private validators: Array<{
    path: string;
    validator: (value: any) => boolean;
    message: string;
  }> = [];

  field<K extends keyof T>(
    path: K,
    validator: (value: T[K]) => boolean,
    message: string
  ): this {
    this.validators.push({
      path: path as string,
      validator,
      message
    });
    return this;
  }

  validate(value: unknown): ValidationResult<T> {
    if (!isObject(value)) {
      return { success: false, error: 'Value must be an object' };
    }

    for (const { path, validator, message } of this.validators) {
      const fieldValue = (value as any)[path];
      if (!validator(fieldValue)) {
        return { success: false, error: message, path };
      }
    }

    return { success: true, data: value as T };
  }
}

// Pre-built schemas for common validations
export const fundingRoundSchema = new ValidationSchema<EnhancedRoundScenario>()
  .field('name', (v) => isString(v) && v.trim().length > 0, 'Round name is required')
  .field('preMoney', isValidValuation, 'Pre-money valuation must be a positive number in cents')
  .field('investmentAmount', isValidCents, 'Investment amount must be a positive integer in cents')
  .field('pricePerShare', isValidPrice, 'Price per share must be a positive number in cents')
  .field('shareClass', isValidShareClass, 'Share class must be COMMON or PREFERRED');

export const exitScenarioSchema = new ValidationSchema<ExitScenario>()
  .field('id', (v) => isString(v) && v.trim().length > 0, 'Exit scenario ID is required')
  .field('name', (v) => isString(v) && v.trim().length > 0, 'Exit scenario name is required')
  .field('exitValue', isValidValuation, 'Exit value must be a positive number in cents')
  .field('exitType', isValidExitType, 'Exit type must be IPO, ACQUISITION, MERGER, or LIQUIDATION');

export const comprehensiveScenarioSchema = new ValidationSchema<ComprehensiveScenario>()
  .field('id', (v) => isString(v) && v.trim().length > 0, 'Scenario ID is required')
  .field('name', (v) => isString(v) && v.trim().length > 0, 'Scenario name is required')
  .field('fundingRounds', (v) => Array.isArray(v), 'Funding rounds must be an array')
  .field('exitScenarios', (v) => Array.isArray(v) && v.length > 0, 'At least one exit scenario is required')
  .field('createdAt', isString, 'Created date is required')
  .field('lastModified', isString, 'Last modified date is required');

// Safe conversion utilities
export const safeParseInt = (value: string | number | undefined, fallback: number = 0): number => {
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

export const safeParseFloat = (value: string | number | undefined, fallback: number = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

export const safeParseCents = (dollarValue: string | number | undefined, fallback: number = 0): number => {
  const dollars = safeParseFloat(dollarValue, fallback / 100);
  return Math.round(dollars * 100);
};

// Assertion functions for critical paths
export function assertIsValidCents(value: unknown, context: string): asserts value is number {
  if (!isValidCents(value)) {
    throw new Error(`Invalid cents value in ${context}: expected positive integer, got ${typeof value}`);
  }
}

export function assertIsValidScenario(value: unknown, context: string): asserts value is ComprehensiveScenario {
  if (!isValidComprehensiveScenario(value)) {
    throw new Error(`Invalid scenario in ${context}: failed validation checks`);
  }
}

// Utility for exhaustive checking
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

// Tagged union discriminator
export function isDiscriminatedUnion<T extends Record<string, any>>(
  value: unknown,
  discriminatorKey: keyof T,
  discriminatorValue: T[keyof T]
): value is T {
  return isObject(value) && value[discriminatorKey as string] === discriminatorValue;
}