import Decimal from 'decimal.js';
import { AuthorizationService } from '@/services/authorizationService';
import { ulid } from 'ulid';

export interface I409AValuation {
  id: string;
  companyId: string;
  valuationDate: Date;
  fairMarketValue: string; // Per share FMV in cents
  preferredPrice?: string; // Latest preferred price if applicable
  method: '409A' | 'MARKET_APPROACH' | 'INCOME_APPROACH' | 'ASSET_APPROACH' | 'SAFE_HARBOR';
  validThrough: Date;
  reportUrl?: string;
  provider?: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'SUPERSEDED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStrikePriceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendedStrikePrice: string;
  currentFMV: string;
  discount?: number;
  expirationDate?: Date;
}

export interface I409AComplianceCheck {
  companyId: string;
  hasValid409A: boolean;
  currentValuation?: I409AValuation;
  daysUntilExpiration?: number;
  complianceStatus: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' | 'NO_VALUATION';
  requiredActions: string[];
}

// In-memory store for demo (will be replaced with real database)
const mockValuations: Map<string, I409AValuation[]> = new Map();

/**
 * Demo version of 409A compliance service
 * This provides full functionality without requiring database changes
 */
export class US409AComplianceService {
  private static readonly WARNING_THRESHOLD_DAYS = 60; // 2 months before expiration

  /**
   * Create or update a 409A valuation
   */
  static async createValuation(valuation: Omit<I409AValuation, 'id' | 'createdAt' | 'updatedAt'>): Promise<I409AValuation> {
    // Verify authorization
    await AuthorizationService.validateCompanyAccess(valuation.companyId);
    await AuthorizationService.verifyFinancialDataAccess(valuation.companyId, 'admin');

    // Invalidate previous active valuations
    await this.invalidatePreviousValuations(valuation.companyId);

    const id = ulid();
    const now = new Date();

    const newValuation: I409AValuation = {
      id,
      companyId: valuation.companyId,
      valuationDate: valuation.valuationDate,
      fairMarketValue: valuation.fairMarketValue,
      preferredPrice: valuation.preferredPrice,
      method: valuation.method,
      validThrough: valuation.validThrough,
      reportUrl: valuation.reportUrl,
      provider: valuation.provider,
      status: valuation.status,
      notes: valuation.notes,
      createdAt: now,
      updatedAt: now
    };

    // Store in mock database
    const companyValuations = mockValuations.get(valuation.companyId) || [];
    companyValuations.push(newValuation);
    mockValuations.set(valuation.companyId, companyValuations);

    // Log compliance event
    await AuthorizationService.logSecurityEvent(
      valuation.companyId,
      'CREATE_409A_VALUATION',
      'valuations_409a',
      {
        valuationId: id,
        fmv: valuation.fairMarketValue,
        method: valuation.method
      }
    );

    return newValuation;
  }

  /**
   * Get current active 409A valuation for a company
   */
  static async getCurrentValuation(companyId: string): Promise<I409AValuation | null> {
    await AuthorizationService.validateCompanyAccess(companyId);

    const companyValuations = mockValuations.get(companyId) || [];
    const activeValuations = companyValuations
      .filter(v => v.status === 'ACTIVE')
      .sort((a, b) => b.valuationDate.getTime() - a.valuationDate.getTime());

    if (activeValuations.length === 0) {
      return null;
    }

    const valuation = activeValuations[0];
    
    // Check if valuation is still valid
    if (this.isValuationExpired(valuation)) {
      // Mark as expired
      await this.updateValuationStatus(valuation.id, 'EXPIRED');
      return null;
    }

    return valuation;
  }

  /**
   * Validate strike price against current 409A valuation
   */
  static async validateStrikePrice(
    companyId: string,
    proposedStrikePrice: string,
    _grantDate: Date = new Date()
  ): Promise<IStrikePriceValidation> {
    const validation: IStrikePriceValidation = {
      isValid: false,
      errors: [],
      warnings: [],
      recommendedStrikePrice: '0',
      currentFMV: '0'
    };

    try {
      // Get current valuation
      const currentValuation = await this.getCurrentValuation(companyId);
      
      if (!currentValuation) {
        validation.errors.push('No valid 409A valuation found. A 409A valuation is required before granting options.');
        return validation;
      }

      validation.currentFMV = currentValuation.fairMarketValue;
      validation.recommendedStrikePrice = currentValuation.fairMarketValue;
      validation.expirationDate = currentValuation.validThrough;

      // Check if valuation is close to expiration
      const daysUntilExpiration = this.getDaysUntilExpiration(currentValuation);
      if (daysUntilExpiration < this.WARNING_THRESHOLD_DAYS) {
        validation.warnings.push(
          `Current 409A valuation expires in ${daysUntilExpiration} days. Consider obtaining a new valuation.`
        );
      }

      // Validate strike price
      const strike = new Decimal(proposedStrikePrice);
      const fmv = new Decimal(currentValuation.fairMarketValue);

      if (strike.lt(fmv)) {
        validation.errors.push(
          `Strike price ($${strike.div(100).toFixed(2)}) is below fair market value ($${fmv.div(100).toFixed(2)}). ` +
          `This would create immediate taxable income for the recipient under IRC Section 409A.`
        );
        validation.isValid = false;
      } else if (strike.equals(fmv)) {
        validation.isValid = true;
      } else {
        validation.isValid = true;
        validation.warnings.push(
          `Strike price is above FMV. While compliant, this reduces the potential value for the recipient.`
        );
      }

      return validation;
    } catch (error) {
      validation.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return validation;
    }
  }

  /**
   * Perform comprehensive 409A compliance check
   */
  static async performComplianceCheck(companyId: string): Promise<I409AComplianceCheck> {
    const check: I409AComplianceCheck = {
      companyId,
      hasValid409A: false,
      complianceStatus: 'NO_VALUATION',
      requiredActions: []
    };

    try {
      const currentValuation = await this.getCurrentValuation(companyId);
      
      if (!currentValuation) {
        check.complianceStatus = 'NO_VALUATION';
        check.requiredActions.push('Obtain initial 409A valuation before granting options');
        return check;
      }

      check.hasValid409A = true;
      check.currentValuation = currentValuation;
      check.daysUntilExpiration = this.getDaysUntilExpiration(currentValuation);

      // Determine compliance status
      if (check.daysUntilExpiration <= 0) {
        check.complianceStatus = 'NON_COMPLIANT';
        check.hasValid409A = false;
        check.requiredActions.push('409A valuation has expired. Obtain new valuation immediately.');
      } else if (check.daysUntilExpiration < this.WARNING_THRESHOLD_DAYS) {
        check.complianceStatus = 'WARNING';
        check.requiredActions.push(
          `409A valuation expires in ${check.daysUntilExpiration} days. Schedule new valuation.`
        );
      } else {
        check.complianceStatus = 'COMPLIANT';
      }

      return check;
    } catch (error) {
      check.complianceStatus = 'NON_COMPLIANT';
      check.requiredActions.push(`Compliance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return check;
    }
  }

  // Private helper methods
  private static isValuationExpired(valuation: I409AValuation): boolean {
    return new Date() > valuation.validThrough;
  }

  private static getDaysUntilExpiration(valuation: I409AValuation): number {
    const now = new Date();
    const expiration = valuation.validThrough;
    const diffMs = expiration.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private static async invalidatePreviousValuations(companyId: string): Promise<void> {
    const companyValuations = mockValuations.get(companyId) || [];
    companyValuations.forEach(v => {
      if (v.status === 'ACTIVE') {
        v.status = 'SUPERSEDED';
        v.updatedAt = new Date();
      }
    });
    mockValuations.set(companyId, companyValuations);
  }

  private static async updateValuationStatus(valuationId: string, status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'SUPERSEDED'): Promise<void> {
    for (const [companyId, valuations] of mockValuations.entries()) {
      const valuation = valuations.find(v => v.id === valuationId);
      if (valuation) {
        valuation.status = status;
        valuation.updatedAt = new Date();
        mockValuations.set(companyId, valuations);
        break;
      }
    }
  }
}

// Export as singleton for convenience
export const ComplianceService409A = US409AComplianceService;