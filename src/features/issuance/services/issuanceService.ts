import { capTableService } from '@/services/capTableService';
import { ComplianceService409A } from '@/features/compliance/services/409aComplianceService';
import { AuthorizationService } from '@/services/authorizationService';
import { CSRFService } from '@/services/csrfService';
import Decimal from 'decimal.js';
import { format, addYears } from 'date-fns';
import { 
  ISecurityIssuanceForm, 
  ISecurityIssuanceValidation, 
  ISecurityIssuanceResult,
  IIssuancePreview,
  SECURITY_TYPE_CONFIGS 
} from '../types/issuance.types';
import type { ULID } from '@/types';

export class SecuritiesIssuanceService {
  /**
   * Validate security issuance form with 409A compliance
   */
  static async validateIssuance(
    companyId: ULID,
    formData: ISecurityIssuanceForm
  ): Promise<ISecurityIssuanceValidation> {
    const validation: ISecurityIssuanceValidation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Basic form validation
      if (!formData.stakeholderId) {
        validation.errors.push('Stakeholder selection is required');
      }

      if (!formData.quantity || formData.quantity <= 0) {
        validation.errors.push('Quantity must be greater than zero');
      }

      if (!formData.grantDate) {
        validation.errors.push('Grant date is required');
      }

      const securityConfig = SECURITY_TYPE_CONFIGS[formData.type];
      
      // Validate strike price for securities that require it
      if (securityConfig.requiresStrikePrice) {
        if (!formData.strikePrice) {
          validation.errors.push(`Strike price is required for ${securityConfig.label}`);
        } else {
          // 409A Compliance Check for strike price
          const complianceCheck = await ComplianceService409A.performComplianceCheck(companyId);
          
          validation.complianceCheck = {
            hasValid409A: complianceCheck.hasValid409A,
            fmvCompliant: false
          };

          if (!complianceCheck.hasValid409A) {
            validation.errors.push('No valid 409A valuation found. A 409A valuation is required before granting options.');
            validation.complianceCheck.fmvCompliant = false;
          } else {
            // Validate strike price against 409A
            const strikePriceValidation = await ComplianceService409A.validateStrikePrice(
              companyId,
              formData.strikePrice,
              new Date(formData.grantDate)
            );

            validation.complianceCheck.fmvCompliant = strikePriceValidation.isValid;
            validation.complianceCheck.recommendedStrikePrice = strikePriceValidation.recommendedStrikePrice;

            if (!strikePriceValidation.isValid) {
              validation.errors.push(...strikePriceValidation.errors);
            }

            validation.warnings.push(...strikePriceValidation.warnings);

            // Add expiration warning if 409A is close to expiring
            if (strikePriceValidation.expirationDate) {
              const daysUntilExpiration = Math.floor(
                (strikePriceValidation.expirationDate.getTime() - new Date().getTime()) / 
                (1000 * 60 * 60 * 24)
              );
              
              if (daysUntilExpiration < 60) {
                validation.complianceCheck.expirationWarning = 
                  `Current 409A valuation expires in ${daysUntilExpiration} days`;
                validation.warnings.push(validation.complianceCheck.expirationWarning);
              }
            }
          }
        }
      }

      // Validate vesting for securities that require it
      if (securityConfig.requiresVesting) {
        if (!formData.vestingStartDate) {
          validation.errors.push('Vesting start date is required');
        }

        if (formData.durationMonths < 0) {
          validation.errors.push('Vesting duration cannot be negative');
        }

        if (formData.cliffMonths < 0) {
          validation.errors.push('Cliff period cannot be negative');
        }

        if (formData.cliffMonths > formData.durationMonths) {
          validation.errors.push('Cliff period cannot be longer than total vesting duration');
        }
      }

      // Validate expiration for securities that require it
      if (securityConfig.requiresExpiration) {
        if (!formData.expirationDate) {
          // Set default expiration (10 years for options)
          if (formData.type === 'OPTION') {
            const grantDate = new Date(formData.grantDate);
            const defaultExpiration = addYears(grantDate, 10);
            validation.warnings.push(
              `No expiration date specified. Using default 10-year expiration: ${format(defaultExpiration, 'yyyy-MM-dd')}`
            );
          } else {
            validation.errors.push(`Expiration date is required for ${securityConfig.label}`);
          }
        } else {
          const grantDate = new Date(formData.grantDate);
          const expirationDate = new Date(formData.expirationDate);
          
          if (expirationDate <= grantDate) {
            validation.errors.push('Expiration date must be after grant date');
          }

          // Warn about very long or short expiration periods
          const yearsUntilExpiration = (expirationDate.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          
          if (yearsUntilExpiration > 10) {
            validation.warnings.push('Expiration date is more than 10 years from grant date');
          } else if (yearsUntilExpiration < 1) {
            validation.warnings.push('Expiration date is less than 1 year from grant date');
          }
        }
      }

      // Share class validation
      if (formData.type === 'EQUITY' || formData.type === 'OPTION' || formData.type === 'RSU') {
        if (!formData.shareClassId) {
          validation.warnings.push('No share class specified. Will use default Common Stock.');
        } else {
          // Verify share class exists and has sufficient authorized shares
          const shareClasses = await capTableService.getShareClasses(companyId);
          const shareClass = shareClasses.find(sc => sc.id === formData.shareClassId);
          
          if (!shareClass) {
            validation.errors.push('Invalid share class selected');
          } else {
            // Check authorized shares (simplified check)
            const capTable = await capTableService.getCapTable(companyId);
            const currentIssued = formData.type === 'EQUITY' ? 
              (shareClass.type === 'COMMON' ? capTable.totals.common : capTable.totals.preferred) : 0;
            
            if (currentIssued + formData.quantity > shareClass.authorized) {
              validation.errors.push(
                `Insufficient authorized shares. ` +
                `Trying to issue ${formData.quantity.toLocaleString()} shares, ` +
                `but only ${(shareClass.authorized - currentIssued).toLocaleString()} remain authorized.`
              );
            }
          }
        }
      }

      validation.isValid = validation.errors.length === 0;

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return validation;
  }

  /**
   * Generate preview of the security issuance
   */
  static async generateIssuancePreview(
    companyId: ULID,
    formData: ISecurityIssuanceForm
  ): Promise<IIssuancePreview> {
    // Get current cap table
    const capTable = await capTableService.getCapTable(companyId);
    const stakeholder = capTable.stakeholders.find(s => s.stakeholderId === formData.stakeholderId);
    const shareClasses = await capTableService.getShareClasses(companyId);
    const shareClass = shareClasses.find(sc => sc.id === formData.shareClassId) || shareClasses[0];

    // Calculate current and new ownership
    const currentTotalShares = capTable.totals.common + capTable.totals.preferred + capTable.totals.optionsGranted;
    const currentOwnership = stakeholder ? stakeholder.ownershipPct : 0;
    
    // For equity, shares are added to total immediately
    // For options, they're added to the fully diluted calculation
    const newTotalShares = formData.type === 'EQUITY' ? 
      currentTotalShares + formData.quantity : 
      currentTotalShares + formData.quantity; // Options already counted in FD

    const stakeholderCurrentShares = stakeholder ? stakeholder.asConverted : 0;
    const stakeholderNewShares = formData.type === 'EQUITY' ? 
      stakeholderCurrentShares + formData.quantity :
      stakeholderCurrentShares + formData.quantity;

    const newOwnership = (stakeholderNewShares / newTotalShares) * 100;
    const dilutionImpact = newOwnership - currentOwnership;

    // Get 409A compliance info
    const complianceCheck = await ComplianceService409A.performComplianceCheck(companyId);
    const currentFMV = complianceCheck.currentValuation?.fairMarketValue || '0';

    // Calculate vesting details
    const vestedToday = formData.cliffMonths === 0 ? formData.quantity : 0;
    const monthsInYear = 12;
    const vestedInOneYear = formData.durationMonths === 0 ? formData.quantity :
      Math.min(formData.quantity, Math.floor((formData.quantity * monthsInYear) / formData.durationMonths));

    // Calculate values
    const currentValuePerShare = new Decimal(currentFMV).div(100); // Convert from cents
    const strikePrice = formData.strikePrice ? new Decimal(formData.strikePrice).div(100) : new Decimal(0);
    
    const currentValue = currentValuePerShare.mul(formData.quantity).toFixed(2);
    const potentialValue = currentValuePerShare.mul(2).mul(formData.quantity).toFixed(2); // Assume 2x growth
    const breakeven = formData.strikePrice ? 
      strikePrice.mul(formData.quantity).toFixed(2) : undefined;

    return {
      security: {
        type: SECURITY_TYPE_CONFIGS[formData.type].label,
        quantity: formData.quantity,
        shareClass: shareClass?.name || 'Common Stock',
        value: `$${currentValue}`
      },
      grant: formData.strikePrice ? {
        strikePrice: `$${strikePrice.toFixed(2)}`,
        grantDate: format(new Date(formData.grantDate), 'MMM dd, yyyy'),
        fairMarketValue: `$${currentValuePerShare.toFixed(2)}`,
        expirationDate: formData.expirationDate ? 
          format(new Date(formData.expirationDate), 'MMM dd, yyyy') : 'Not set'
      } : undefined,
      vesting: {
        startDate: format(new Date(formData.vestingStartDate), 'MMM dd, yyyy'),
        cliffMonths: formData.cliffMonths,
        durationMonths: formData.durationMonths,
        frequency: formData.frequency,
        vestedToday,
        vestedInOneYear
      },
      stakeholder: {
        name: stakeholder?.name || 'Unknown Stakeholder',
        type: stakeholder ? 'Existing' : 'New',
        currentOwnership,
        newOwnership,
        dilutionImpact
      },
      compliance: {
        status: !complianceCheck.hasValid409A ? 'NON_COMPLIANT' :
               complianceCheck.complianceStatus === 'WARNING' ? 'WARNING' : 'COMPLIANT',
        messages: complianceCheck.requiredActions
      },
      estimatedValue: {
        currentValue: `$${currentValue}`,
        potentialValue: `$${potentialValue}`,
        breakeven
      }
    };
  }

  /**
   * Issue security with full compliance checking and transaction safety
   */
  static async issueSecurity(
    companyId: ULID,
    formData: ISecurityIssuanceForm,
    csrfToken: string
  ): Promise<ISecurityIssuanceResult> {
    const result: ISecurityIssuanceResult = {
      success: false,
      errors: [],
      warnings: []
    };

    try {
      // Final validation before issuance
      const validation = await this.validateIssuance(companyId, formData);
      
      if (!validation.isValid) {
        result.errors = validation.errors;
        result.warnings = validation.warnings;
        return result;
      }

      // CSRF Protection
      await CSRFService.validateFinancialTransaction(
        csrfToken,
        'ISSUE',
        companyId,
        {
          type: formData.type,
          quantity: formData.quantity,
          stakeholderId: formData.stakeholderId
        }
      );

      // Import transaction service for atomic operations
      const { TransactionBuilder } = await import('@/services/transactionService');
      const transaction = new TransactionBuilder(companyId, csrfToken);

      let securityId: string = '';
      let vestingScheduleId: string | undefined;
      let grantId: string | undefined;

      // Step 1: Create vesting schedule if required
      const securityConfig = SECURITY_TYPE_CONFIGS[formData.type];
      if (securityConfig.requiresVesting && formData.durationMonths > 0) {
        transaction.addOperation(
          'Create vesting schedule',
          async () => {
            const vestingResult = await capTableService.createVestingSchedule({
              startDate: formData.vestingStartDate,
              cliffMonths: formData.cliffMonths,
              durationMonths: formData.durationMonths,
              frequency: formData.frequency
            });

            if (!vestingResult.success) {
              throw new Error(`Failed to create vesting schedule: ${vestingResult.error?.message}`);
            }

            vestingScheduleId = vestingResult.data.id;
            return vestingResult.data;
          }
        );
      }

      // Step 2: Issue the security
      transaction.addOperation(
        'Issue security',
        async () => {
          const securityTerms: any = {};
          
          if (formData.strikePrice) {
            securityTerms.strikePrice = formData.strikePrice;
          }
          
          if (formData.expirationDate) {
            securityTerms.expirationDate = formData.expirationDate;
          }

          const security = await capTableService.issueSecurity({
            companyId,
            stakeholderId: formData.stakeholderId,
            classId: formData.shareClassId,
            type: formData.type,
            quantity: formData.quantity,
            issuedAt: formData.grantDate,
            terms: Object.keys(securityTerms).length > 0 ? securityTerms : undefined,
            csrfToken
          });

          securityId = security.id;
          return security;
        }
      );

      // Step 3: Create grant if this is an option or RSU
      if ((formData.type === 'OPTION' || formData.type === 'RSU') && vestingScheduleId) {
        transaction.addOperation(
          'Create grant record',
          async () => {
            const grantResult = await capTableService.createGrant({
              securityId,
              strikePrice: formData.strikePrice || '0',
              vestingScheduleId: vestingScheduleId!,
              grantDate: formData.grantDate,
            });

            if (!grantResult.success) {
              throw new Error(`Failed to create grant: ${grantResult.error?.message}`);
            }

            grantId = grantResult.data.id;
            return grantResult.data;
          }
        );
      }

      // Step 4: Create transaction record for audit trail
      transaction.addOperation(
        'Create transaction record',
        async () => {
          const txResult = await capTableService.createTransaction({
            companyId,
            kind: 'ISSUE',
            effectiveAt: formData.grantDate,
            payload: {
              securityType: formData.type,
              quantity: formData.quantity,
              stakeholderId: formData.stakeholderId,
              shareClassId: formData.shareClassId,
              strikePrice: formData.strikePrice,
              vestingScheduleId,
              grantId,
              terms: formData
            },
            csrfToken
          });

          if (!txResult.success) {
            throw new Error(`Failed to create transaction record: ${txResult.error?.message}`);
          }

          result.transactionId = txResult.data.id;
          return txResult.data;
        }
      );

      // Execute all operations atomically
      const txResult = await transaction.execute();
      
      if (!txResult.success) {
        result.errors.push(`Transaction failed: ${txResult.error?.message || 'Unknown error'}`);
        return result;
      }

      // Success!
      result.success = true;
      result.securityId = securityId;
      result.grantId = grantId;
      result.vestingScheduleId = vestingScheduleId;
      result.warnings = validation.warnings;

      // Log the successful issuance
      await AuthorizationService.logSecurityEvent(
        companyId,
        'ISSUE_SECURITY_COMPLETE',
        'securities',
        {
          securityId,
          grantId,
          type: formData.type,
          quantity: formData.quantity,
          stakeholderId: formData.stakeholderId
        }
      );

    } catch (error) {
      result.success = false;
      result.errors.push(`Issuance failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Get available share classes for the company
   */
  static async getShareClasses(companyId: ULID) {
    return await capTableService.getShareClasses(companyId);
  }

  /**
   * Get stakeholders for the company
   */
  static async getStakeholders(companyId: ULID) {
    return await capTableService.getStakeholders(companyId);
  }

  /**
   * Get current cap table for dilution calculations
   */
  static async getCapTable(companyId: ULID) {
    return await capTableService.getCapTable(companyId);
  }

  /**
   * Get 409A compliance status
   */
  static async getComplianceStatus(companyId: ULID) {
    return await ComplianceService409A.performComplianceCheck(companyId);
  }

  /**
   * Calculate recommended strike price based on current 409A
   */
  static async getRecommendedStrikePrice(companyId: ULID, grantDate?: Date) {
    const validation = await ComplianceService409A.validateStrikePrice(
      companyId,
      '0', // Placeholder - we want the recommended price
      grantDate || new Date()
    );
    
    return {
      recommendedPrice: validation.recommendedStrikePrice,
      currentFMV: validation.currentFMV,
      isCompliant: validation.isValid
    };
  }
}

export const issuanceService = SecuritiesIssuanceService;