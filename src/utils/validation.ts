import Decimal from 'decimal.js';
import { z } from 'zod';

/**
 * Comprehensive validation utilities for cap table reporting system
 * Ensures data integrity, security, and prevents calculation errors
 */

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
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

// UUID validation
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Date validation
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes('-');
};

// Report generation request validation
const GenerateReportRequestSchema = z.object({
  company_id: z.string().uuid('Invalid company ID format'),
  template_id: z.string().uuid('Invalid template ID format'),
  as_of_date: z.string().refine(isValidDate, 'Invalid date format'),
  parameters: z.object({
    format: z.enum(['PDF', 'EXCEL', 'CSV', 'JSON', 'HTML']).optional(),
    include_waterfall: z.boolean().optional(),
    include_dilution_analysis: z.boolean().optional(),
    board_meeting_date: z.string().refine(isValidDate, 'Invalid board meeting date').optional(),
    custom_notes: z.string().max(1000, 'Custom notes too long').optional(),
    output_format: z.enum(['PDF', 'EXCEL', 'CSV', 'JSON', 'HTML']).optional(),
    compression_enabled: z.boolean().optional(),
    watermark_enabled: z.boolean().optional()
  }).optional()
});

export const validateGenerateReportRequest = (data: any) => {
  try {
    return GenerateReportRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new ValidationError(`Validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

// User authentication validation
export const validateUserId = (userId: string): void => {
  if (!userId || typeof userId !== 'string') {
    throw new AuthenticationError('User ID is required');
  }
  
  if (!isValidUUID(userId)) {
    throw new AuthenticationError('Invalid user ID format');
  }
};

// Company access validation
export const validateCompanyAccess = (companyId: string, userId: string): void => {
  validateUserId(userId);
  
  if (!companyId || typeof companyId !== 'string') {
    throw new ValidationError('Company ID is required');
  }
  
  if (!isValidUUID(companyId)) {
    throw new ValidationError('Invalid company ID format');
  }
};

// Sanitize sensitive data
export const sanitizeReportData = <T extends Record<string, any>>(
  data: T, 
  userRole: string
): Partial<T> => {
  const sanitized = { ...data };
  
  // Remove sensitive fields for non-admin users
  if (userRole !== 'ADMIN') {
    delete sanitized.file_hash;
    delete sanitized.generation_parameters;
    delete sanitized.audit_trail;
  }
  
  // Remove internal system fields
  delete sanitized.created_by;
  delete sanitized.updated_by;
  
  return sanitized;
};

// SQL injection prevention
export const sanitizeSqlInput = (input: string): string => {
  return input.replace(/['";\\\x00-\x1f]/g, '').trim();
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