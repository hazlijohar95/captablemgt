/**
 * Business logic constants for cap table management
 */

// Default company ID - TODO: Replace with actual auth context
export const DEMO_COMPANY_ID = '01234567-89ab-cdef-0123-456789abcdef';

// Security types
export const SECURITY_TYPES = {
  EQUITY: 'EQUITY',
  OPTION: 'OPTION', 
  RSU: 'RSU',
  WARRANT: 'WARRANT',
  SAFE: 'SAFE',
  NOTE: 'NOTE',
} as const;

// Stakeholder types  
export const STAKEHOLDER_TYPES = {
  FOUNDER: 'FOUNDER',
  INVESTOR: 'INVESTOR',
  EMPLOYEE: 'EMPLOYEE', 
  ENTITY: 'ENTITY',
} as const;

// Share class types
export const SHARE_CLASS_TYPES = {
  COMMON: 'COMMON',
  PREFERRED: 'PREFERRED',
} as const;

// Cap table display modes
export const CAP_TABLE_MODES = {
  FULLY_DILUTED: 'FD',
  AS_CONVERTED: 'AS_CONVERTED', 
  OUTSTANDING: 'OUTSTANDING',
} as const;

// Default vesting parameters (in months)
export const DEFAULT_VESTING = {
  CLIFF_MONTHS: 12,
  DURATION_MONTHS: 48,
  FREQUENCY: 'MONTHLY',
} as const;