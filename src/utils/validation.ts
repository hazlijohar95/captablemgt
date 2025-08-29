import Decimal from 'decimal.js';

/**
 * Financial validation utilities for cap table calculations
 * Ensures data integrity and prevents calculation errors
 */

export class ValidationError extends Error {
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Financial validation rules
 */
export const financialRules = {
  /**
   * Validates positive monetary amounts
   */
  positiveAmount: (value: number, fieldName: string = 'value'): void => {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`${fieldName} must be a finite number`, fieldName);
    }
    if (value <= 0) {
      throw new ValidationError(`${fieldName} must be positive`, fieldName);
    }
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new ValidationError(`${fieldName} exceeds maximum safe value`, fieldName);
    }
  },

  /**
   * Validates non-negative monetary amounts (can be zero)
   */
  nonNegativeAmount: (value: number, fieldName: string = 'value'): void => {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`${fieldName} must be a finite number`, fieldName);
    }
    if (value < 0) {
      throw new ValidationError(`${fieldName} cannot be negative`, fieldName);
    }
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new ValidationError(`${fieldName} exceeds maximum safe value`, fieldName);
    }
  },

  /**
   * Validates percentage values (0-100)
   */
  validPercentage: (value: number, fieldName: string = 'percentage'): void => {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`${fieldName} must be a finite number`, fieldName);
    }
    if (value < 0 || value > 100) {
      throw new ValidationError(`${fieldName} must be between 0 and 100`, fieldName);
    }
  },

  /**
   * Validates share counts (positive integers)
   */
  validShareCount: (value: number, fieldName: string = 'shares'): void => {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`${fieldName} must be a finite number`, fieldName);
    }
    if (!Number.isInteger(value)) {
      throw new ValidationError(`${fieldName} must be a whole number`, fieldName);
    }
    if (value <= 0) {
      throw new ValidationError(`${fieldName} must be positive`, fieldName);
    }
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new ValidationError(`${fieldName} exceeds maximum safe value`, fieldName);
    }
  },

  /**
   * Validates string inputs
   */
  nonEmptyString: (value: string, fieldName: string = 'field'): void => {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }
    if (value.trim().length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
    }
    if (value.length > 255) {
      throw new ValidationError(`${fieldName} is too long (max 255 characters)`, fieldName);
    }
  },

  /**
   * Validates arrays are not empty
   */
  nonEmptyArray: <T>(value: T[], fieldName: string = 'array'): void => {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName);
    }
    if (value.length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
    }
  },

  /**
   * Validates price per share calculations make sense
   */
  validPricePerShare: (preMoney: number, totalShares: number, fieldName: string = 'price per share'): void => {
    if (totalShares === 0) {
      throw new ValidationError('Cannot calculate price per share with zero total shares', fieldName);
    }
    const pricePerShare = preMoney / totalShares;
    if (pricePerShare <= 0) {
      throw new ValidationError(`${fieldName} must be positive`, fieldName);
    }
    if (pricePerShare < 0.01) {
      throw new ValidationError(`${fieldName} is unreasonably low (< $0.01)`, fieldName);
    }
  }
};

/**
 * Validation utilities for specific financial calculations
 */
export const validationUtils = {
  /**
   * Batch validation that collects all errors instead of throwing on first error
   */
  validateAll: (validationFunctions: Array<() => void>): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const validate of validationFunctions) {
      try {
        validate();
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error.message);
        } else {
          errors.push(`Unexpected validation error: ${error}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Sanitize string inputs to prevent injection attacks
   */
  sanitizeString: (input: string): string => {
    return input
      .replace(/[<>\"']/g, '') // Remove potential XSS characters
      .trim()
      .substring(0, 255); // Limit length
  },

  /**
   * Normalize monetary amounts to cents (integers)
   */
  normalizeToCents: (dollarAmount: number): number => {
    const cents = Math.round(dollarAmount * 100);
    financialRules.nonNegativeAmount(cents, 'monetary amount');
    return cents;
  },

  /**
   * Convert cents back to dollars for display
   */
  centsToDisplay: (cents: number): number => {
    return cents / 100;
  },

  /**
   * Validate Decimal.js calculations don't result in invalid values
   */
  validateDecimalResult: (result: Decimal, fieldName: string = 'calculation result'): void => {
    if (result.isNaN()) {
      throw new ValidationError(`${fieldName} resulted in NaN`, fieldName);
    }
    if (!result.isFinite()) {
      throw new ValidationError(`${fieldName} resulted in infinite value`, fieldName);
    }
    if (result.isNegative() && fieldName.includes('share') || fieldName.includes('amount')) {
      throw new ValidationError(`${fieldName} cannot be negative`, fieldName);
    }
  }
};

/**
 * Common validation patterns for cap table operations
 */
export const capTableValidation = {
  /**
   * Validate shareholder position data
   */
  validateShareholderPosition: (position: any): void => {
    financialRules.nonEmptyString(position.id, 'shareholder ID');
    financialRules.nonEmptyString(position.name, 'shareholder name');
    financialRules.validShareCount(position.shares, 'shares');
    
    if (position.shareClass && !['COMMON', 'PREFERRED'].includes(position.shareClass)) {
      throw new ValidationError('shareClass must be COMMON or PREFERRED', 'shareClass');
    }
    
    if (position.pricePerShare !== undefined) {
      financialRules.positiveAmount(position.pricePerShare, 'pricePerShare');
    }
  },

  /**
   * Validate funding round scenario data
   */
  validateRoundScenario: (scenario: any): void => {
    financialRules.nonEmptyString(scenario.name, 'scenario name');
    financialRules.positiveAmount(scenario.preMoney, 'pre-money valuation');
    financialRules.positiveAmount(scenario.investmentAmount, 'investment amount');
    financialRules.positiveAmount(scenario.pricePerShare, 'price per share');
    
    if (!['COMMON', 'PREFERRED'].includes(scenario.shareClass)) {
      throw new ValidationError('shareClass must be COMMON or PREFERRED', 'shareClass');
    }
    
    if (scenario.optionPoolIncrease !== undefined) {
      financialRules.validPercentage(scenario.optionPoolIncrease, 'option pool increase');
    }
  },

  /**
   * Validate exit scenario data for waterfall calculations
   */
  validateExitScenario: (scenario: any): void => {
    financialRules.nonEmptyString(scenario.name, 'scenario name');
    financialRules.positiveAmount(scenario.value, 'exit value');
  }
};