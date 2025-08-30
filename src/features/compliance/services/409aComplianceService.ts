import { supabase } from '@/services/supabase';
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

/**
 * Service for managing 409A valuations and compliance
 * Ensures proper strike price validation for US companies
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
    const now = new Date().toISOString();

    // TODO: Uncomment when valuations_409a table is created
    // const { data, error } = await supabase
    //   .from('valuations_409a')
    //   .insert({
    //     id,
    //     company_id: valuation.companyId,
    //     valuation_date: valuation.valuationDate.toISOString(),
    //     fair_market_value: valuation.fairMarketValue,
    //     preferred_price: valuation.preferredPrice,
    //     method: valuation.method,
    //     valid_through: valuation.validThrough.toISOString(),
    //     report_url: valuation.reportUrl,
    //     provider: valuation.provider,
    //     status: valuation.status,
    //     notes: valuation.notes,
    //     created_at: now,
    //     updated_at: now
    //   })
    //   .select()
    //   .single();

    // if (error) {
    //   throw new Error(`Failed to create 409A valuation: ${error.message}`);
    // }
    
    // Temporary mock data for demo
    const data = {
      id,
      company_id: valuation.companyId,
      valuation_date: valuation.valuationDate.toISOString(),
      fair_market_value: valuation.fairMarketValue,
      preferred_price: valuation.preferredPrice,
      method: valuation.method,
      valid_through: valuation.validThrough.toISOString(),
      report_url: valuation.reportUrl,
      provider: valuation.provider,
      status: valuation.status,
      notes: valuation.notes,
      created_at: now,
      updated_at: now
    };

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

    return this.mapToValuation(data);
  }

  /**
   * Get current active 409A valuation for a company
   */
  static async getCurrentValuation(companyId: string): Promise<I409AValuation | null> {
    await AuthorizationService.validateCompanyAccess(companyId);

    const { data, error } = await supabase
      .from('valuations_409a')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'ACTIVE')
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    const valuation = this.mapToValuation(data);
    
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
    grantDate: Date = new Date()
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
        // Calculate discount if applicable (e.g., for early employees)
        const discount = this.calculateAllowableDiscount(grantDate, currentValuation);
        if (discount > 0) {
          validation.warnings.push(
            `You may be able to offer a ${(discount * 100).toFixed(0)}% discount for early-stage grants.`
          );
        }
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

      // Check for material changes that might require new valuation
      const materialChanges = await this.checkForMaterialChanges(companyId, currentValuation);
      if (materialChanges.length > 0) {
        check.complianceStatus = 'WARNING';
        check.requiredActions.push(
          'Material changes detected that may require a new 409A valuation:',
          ...materialChanges
        );
      }

      return check;
    } catch (error) {
      check.complianceStatus = 'NON_COMPLIANT';
      check.requiredActions.push(`Compliance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return check;
    }
  }

  /**
   * Calculate safe harbor strike price
   */
  static calculateSafeHarborPrice(
    fmv: string,
    employeeType: 'STANDARD' | 'EARLY_EMPLOYEE' | 'CONSULTANT' = 'STANDARD'
  ): string {
    const fairMarketValue = new Decimal(fmv);
    
    // Early employees might get up to 20% discount in some cases
    // But standard practice is to use FMV to avoid any tax issues
    let multiplier = new Decimal(1);
    
    switch (employeeType) {
      case 'EARLY_EMPLOYEE':
        // Some companies offer slight discount for first employees
        // but this is risky and should be validated with legal counsel
        multiplier = new Decimal(1);
        break;
      case 'CONSULTANT':
        // Consultants typically get FMV or higher
        multiplier = new Decimal(1);
        break;
      default:
        multiplier = new Decimal(1);
    }
    
    return fairMarketValue.mul(multiplier).toFixed(0);
  }

  /**
   * Generate 409A compliance report
   */
  static async generateComplianceReport(companyId: string): Promise<{
    companyId: string;
    reportDate: Date;
    complianceStatus: I409AComplianceCheck;
    valuationHistory: I409AValuation[];
    recommendations: string[];
  }> {
    await AuthorizationService.validateCompanyAccess(companyId);

    const complianceStatus = await this.performComplianceCheck(companyId);
    
    // Get valuation history
    const { data: valuations } = await supabase
      .from('valuations_409a')
      .select('*')
      .eq('company_id', companyId)
      .order('valuation_date', { ascending: false });

    const valuationHistory = (valuations || []).map(v => this.mapToValuation(v));

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (complianceStatus.complianceStatus === 'NO_VALUATION') {
      recommendations.push(
        'Immediately obtain a 409A valuation from a qualified provider',
        'Do not grant any options until valuation is complete',
        'Consider using SAFEs or restricted stock until valuation is obtained'
      );
    } else if (complianceStatus.complianceStatus === 'NON_COMPLIANT') {
      recommendations.push(
        'Cease all option grants immediately',
        'Obtain updated 409A valuation within 30 days',
        'Review all recent grants for potential compliance issues'
      );
    } else if (complianceStatus.complianceStatus === 'WARNING') {
      recommendations.push(
        'Schedule new 409A valuation before current expires',
        'Review any material changes to company since last valuation',
        'Ensure all option grants use current FMV as strike price'
      );
    } else {
      recommendations.push(
        'Continue regular compliance monitoring',
        'Document all option grants properly',
        'Schedule next valuation 2-3 months before expiration'
      );
    }

    return {
      companyId,
      reportDate: new Date(),
      complianceStatus,
      valuationHistory,
      recommendations
    };
  }

  // Private helper methods

  private static mapToValuation(data: any): I409AValuation {
    return {
      id: data.id,
      companyId: data.company_id,
      valuationDate: new Date(data.valuation_date),
      fairMarketValue: data.fair_market_value,
      preferredPrice: data.preferred_price,
      method: data.method,
      validThrough: new Date(data.valid_through),
      reportUrl: data.report_url,
      provider: data.provider,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

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
    // TODO: Uncomment when table exists
    // await supabase
    //   .from('valuations_409a')
    //   .update({ status: 'SUPERSEDED' })
    //   .eq('company_id', companyId)
    //   .eq('status', 'ACTIVE');
    console.log('Invalidating previous valuations for company:', companyId);
  }

  private static async updateValuationStatus(valuationId: string, status: string): Promise<void> {
    // TODO: Uncomment when table exists
    // await supabase
    //   .from('valuations_409a')
    //   .update({ 
    //     status,
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('id', valuationId);
    console.log('Updating valuation status:', valuationId, status);
  }

  private static calculateAllowableDiscount(grantDate: Date, valuation: I409AValuation): number {
    // This is a simplified calculation
    // Real-world scenarios would need legal/tax advisor input
    const monthsSinceValuation = Math.floor(
      (grantDate.getTime() - valuation.valuationDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    
    // No discount if valuation is recent
    if (monthsSinceValuation < 3) {
      return 0;
    }
    
    // Very limited scenarios allow discount
    return 0;
  }

  private static async checkForMaterialChanges(
    _companyId: string,
    currentValuation: I409AValuation
  ): Promise<string[]> {
    const materialChanges: string[] = [];
    const valuationDate = currentValuation.valuationDate;

    // TODO: Check for new funding rounds when securities table query is available
    // const { data: recentSecurities } = await supabase
    //   .from('securities')
    //   .select('*')
    //   .eq('company_id', companyId)
    //   .eq('type', 'EQUITY')
    //   .gt('issued_at', valuationDate.toISOString())
    //   .limit(10);

    // if (recentSecurities && recentSecurities.length > 0) {
    //   const totalNewShares = recentSecurities.reduce((sum, s) => sum + s.quantity, 0);
    //   if (totalNewShares > 1000000) {
    //     materialChanges.push(`Large equity issuance (${totalNewShares.toLocaleString()} shares) since last valuation`);
    //   }
    // }

    // Check for significant time passage
    const monthsSinceValuation = Math.floor(
      (new Date().getTime() - valuationDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (monthsSinceValuation > 9) {
      materialChanges.push(`Valuation is ${monthsSinceValuation} months old`);
    }

    return materialChanges;
  }
}

// Export as singleton for convenience
export const ComplianceService409A = US409AComplianceService;