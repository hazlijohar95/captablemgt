import Decimal from 'decimal.js';
import { 
  ValidationError, 
  financialRules 
} from '@/utils/validation';

// Configure Decimal for high precision financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Advanced Anti-Dilution Protection Calculations
 * 
 * Implements industry-standard anti-dilution mechanisms:
 * - Weighted Average (Broad-based and Narrow-based)
 * - Full Ratchet
 * - Multiple round scenarios
 * 
 * All monetary values in cents to avoid floating-point precision issues.
 * 
 * References:
 * - NVCA Model Documents
 * - Fenwick & West Anti-Dilution Provisions Guide
 * - Venture Capital Deal Terms (Kaplan/Stromberg)
 */

export enum AntiDilutionType {
  NONE = 'NONE',
  FULL_RATCHET = 'FULL_RATCHET',
  WEIGHTED_AVERAGE_BROAD = 'WEIGHTED_AVERAGE_BROAD',
  WEIGHTED_AVERAGE_NARROW = 'WEIGHTED_AVERAGE_NARROW'
}

export interface IPreferredSeries {
  id: string;
  name: string;
  shares: number;
  originalPrice: number; // Original issue price in cents
  liquidationPreference: number; // Multiple (1x, 2x, etc.)
  antiDilutionType: AntiDilutionType;
  participatingPreferred: boolean;
  participationCap?: number; // Multiple cap for participating preferred
  conversionRatio: number; // Current conversion ratio (starts at 1:1)
  seniorityRank: number; // 1 = most senior
}

export interface IDownRound {
  name: string;
  newPrice: number; // New issue price in cents
  sharesIssued: number;
  investmentAmount: number; // Total investment in cents
}

export interface ICapTableSnapshot {
  commonShares: number;
  totalPreferredShares: number;
  optionsOutstanding: number;
  optionsAvailable: number;
  warrants: number;
  // Fully diluted includes: common + all preferred as-converted + all options/warrants
  fullyDilutedShares: number;
}

export interface IAntiDilutionResult {
  seriesId: string;
  seriesName: string;
  originalConversionRatio: number;
  adjustedConversionRatio: number;
  adjustmentFactor: number;
  newPreferredShares: number; // Shares after adjustment
  dilutionProtection: number; // Percentage of dilution protected
  formulaUsed: string;
  calculationSteps: string[];
}

export interface IAntiDilutionAnalysis {
  downRound: IDownRound;
  capTableBefore: ICapTableSnapshot;
  capTableAfter: ICapTableSnapshot;
  adjustments: IAntiDilutionResult[];
  totalDilutionWithoutProtection: number;
  totalDilutionWithProtection: number;
  dilutionSavings: number;
}

/**
 * Validates anti-dilution calculation inputs
 */
function validateAntiDilutionInputs(
  preferredSeries: IPreferredSeries[],
  downRound: IDownRound,
  capTable: ICapTableSnapshot
): void {
  try {
    financialRules.nonEmptyArray(preferredSeries, 'preferred series');
    
    // Validate each preferred series
    preferredSeries.forEach((series, index) => {
      financialRules.nonEmptyString(series.id, `series[${index}].id`);
      financialRules.nonEmptyString(series.name, `series[${index}].name`);
      financialRules.validShareCount(series.shares, `series[${index}].shares`);
      financialRules.positiveAmount(series.originalPrice, `series[${index}].originalPrice`);
      financialRules.positiveAmount(series.liquidationPreference, `series[${index}].liquidationPreference`);
      financialRules.positiveAmount(series.conversionRatio, `series[${index}].conversionRatio`);
      
      if (!Object.values(AntiDilutionType).includes(series.antiDilutionType)) {
        throw new ValidationError(
          `Invalid anti-dilution type: ${series.antiDilutionType}`,
          `series[${index}].antiDilutionType`
        );
      }
    });
    
    // Validate down round
    financialRules.nonEmptyString(downRound.name, 'downRound.name');
    financialRules.positiveAmount(downRound.newPrice, 'downRound.newPrice');
    financialRules.validShareCount(downRound.sharesIssued, 'downRound.sharesIssued');
    financialRules.positiveAmount(downRound.investmentAmount, 'downRound.investmentAmount');
    
    // Validate cap table
    financialRules.nonNegativeAmount(capTable.commonShares, 'capTable.commonShares');
    financialRules.nonNegativeAmount(capTable.totalPreferredShares, 'capTable.totalPreferredShares');
    financialRules.nonNegativeAmount(capTable.optionsOutstanding, 'capTable.optionsOutstanding');
    financialRules.nonNegativeAmount(capTable.optionsAvailable, 'capTable.optionsAvailable');
    financialRules.nonNegativeAmount(capTable.fullyDilutedShares, 'capTable.fullyDilutedShares');
    
    // Business logic validations
    const calculatedFD = capTable.commonShares + 
                        capTable.totalPreferredShares + 
                        capTable.optionsOutstanding + 
                        capTable.optionsAvailable + 
                        capTable.warrants;
                        
    if (Math.abs(calculatedFD - capTable.fullyDilutedShares) > 1) {
      throw new ValidationError(
        'Fully diluted shares calculation inconsistent with component shares',
        'capTable.fullyDilutedShares'
      );
    }
    
  } catch (error) {
    console.error('Anti-dilution validation failed:', error);
    throw error;
  }
}

/**
 * Calculate Full Ratchet Anti-Dilution Adjustment
 * 
 * Full ratchet provides complete protection by adjusting the conversion price
 * to the new lower price, regardless of how many shares were issued.
 * 
 * Formula: New Conversion Ratio = Original Price / New Price
 * 
 * @param series - The preferred series with full ratchet protection
 * @param downRound - Details of the down round
 * @returns Anti-dilution adjustment result
 */
export function calculateFullRatchet(
  series: IPreferredSeries,
  downRound: IDownRound
): IAntiDilutionResult {
  const originalPrice = new Decimal(series.originalPrice);
  const newPrice = new Decimal(downRound.newPrice);
  const originalShares = new Decimal(series.shares);
  
  // Full ratchet: adjust conversion price to new lower price
  const adjustmentFactor = originalPrice.dividedBy(newPrice);
  const adjustedConversionRatio = new Decimal(series.conversionRatio).times(adjustmentFactor);
  
  // Calculate new preferred shares after adjustment
  const newPreferredShares = originalShares.times(adjustmentFactor);
  
  // Calculate dilution protection
  const dilutionWithoutProtection = newPrice.dividedBy(originalPrice).minus(1).abs();
  const dilutionProtection = new Decimal(1); // 100% protection
  
  const calculationSteps = [
    `Original conversion price: $${originalPrice.dividedBy(100).toFixed(4)}`,
    `New issue price: $${newPrice.dividedBy(100).toFixed(4)}`,
    `Adjustment factor: ${originalPrice.toFixed(0)} ÷ ${newPrice.toFixed(0)} = ${adjustmentFactor.toFixed(6)}`,
    `New conversion ratio: ${series.conversionRatio} × ${adjustmentFactor.toFixed(6)} = ${adjustedConversionRatio.toFixed(6)}`,
    `Preferred shares after adjustment: ${originalShares.toFixed(0)} × ${adjustmentFactor.toFixed(6)} = ${newPreferredShares.toFixed(0)}`,
    `Dilution protection: 100% (full ratchet provides complete protection)`
  ];
  
  return {
    seriesId: series.id,
    seriesName: series.name,
    originalConversionRatio: series.conversionRatio,
    adjustedConversionRatio: adjustedConversionRatio.toNumber(),
    adjustmentFactor: adjustmentFactor.toNumber(),
    newPreferredShares: newPreferredShares.toNumber(),
    dilutionProtection: dilutionProtection.toNumber(),
    formulaUsed: 'Full Ratchet: New Ratio = Original Price ÷ New Price',
    calculationSteps
  };
}

/**
 * Calculate Weighted Average Anti-Dilution Adjustment
 * 
 * Weighted average provides partial protection based on the size of the down round
 * relative to the existing capitalization.
 * 
 * Formula: NCP = OCP × (A + B) ÷ (A + C)
 * Where:
 * - NCP = New Conversion Price
 * - OCP = Old Conversion Price  
 * - A = Shares outstanding before down round (varies by broad vs narrow)
 * - B = Shares that could be purchased at OCP with down round proceeds
 * - C = New shares actually issued in down round
 * 
 * @param series - The preferred series with weighted average protection
 * @param downRound - Details of the down round
 * @param capTable - Current cap table snapshot
 * @param broadBased - True for broad-based, false for narrow-based
 * @returns Anti-dilution adjustment result
 */
export function calculateWeightedAverage(
  series: IPreferredSeries,
  downRound: IDownRound,
  capTable: ICapTableSnapshot,
  broadBased: boolean = true
): IAntiDilutionResult {
  const originalPrice = new Decimal(series.originalPrice);
  const newPrice = new Decimal(downRound.newPrice);
  const investmentAmount = new Decimal(downRound.investmentAmount);
  const newSharesIssued = new Decimal(downRound.sharesIssued);
  
  // Determine A: Outstanding shares for calculation basis
  let outstandingShares: Decimal;
  let basisDescription: string;
  
  if (broadBased) {
    // Broad-based includes all securities in the denominator
    outstandingShares = new Decimal(capTable.fullyDilutedShares);
    basisDescription = 'Broad-based (includes common, preferred, options, warrants)';
  } else {
    // Narrow-based includes only common and preferred shares
    outstandingShares = new Decimal(capTable.commonShares + capTable.totalPreferredShares);
    basisDescription = 'Narrow-based (includes only common and preferred shares)';
  }
  
  // B: Shares that could be purchased at original price with down round proceeds
  const sharesPurchasableAtOriginalPrice = investmentAmount.dividedBy(originalPrice);
  
  // C: New shares actually issued
  const actualNewShares = newSharesIssued;
  
  // Calculate weighted average adjustment
  const numerator = outstandingShares.plus(sharesPurchasableAtOriginalPrice);
  const denominator = outstandingShares.plus(actualNewShares);
  const adjustmentFactor = numerator.dividedBy(denominator);
  
  // New conversion price and ratio
  const newConversionPrice = originalPrice.times(adjustmentFactor);
  const newConversionRatio = originalPrice.dividedBy(newConversionPrice);
  const adjustedConversionRatio = new Decimal(series.conversionRatio).times(newConversionRatio);
  
  // Calculate new preferred shares after adjustment
  const originalShares = new Decimal(series.shares);
  const newPreferredShares = originalShares.times(newConversionRatio);
  
  // Calculate dilution protection
  const dilutionWithoutProtection = newPrice.dividedBy(originalPrice).minus(1).abs();
  const dilutionWithProtection = newConversionPrice.dividedBy(originalPrice).minus(1).abs();
  const dilutionProtection = dilutionWithoutProtection.minus(dilutionWithProtection)
                           .dividedBy(dilutionWithoutProtection);
  
  const calculationSteps = [
    `Calculation basis: ${basisDescription}`,
    `A (Outstanding shares): ${outstandingShares.toFixed(0)}`,
    `B (Shares purchasable at original price): $${investmentAmount.dividedBy(100).toFixed(2)} ÷ $${originalPrice.dividedBy(100).toFixed(4)} = ${sharesPurchasableAtOriginalPrice.toFixed(0)}`,
    `C (New shares issued): ${actualNewShares.toFixed(0)}`,
    `Adjustment factor: (${outstandingShares.toFixed(0)} + ${sharesPurchasableAtOriginalPrice.toFixed(0)}) ÷ (${outstandingShares.toFixed(0)} + ${actualNewShares.toFixed(0)}) = ${adjustmentFactor.toFixed(6)}`,
    `New conversion price: $${originalPrice.dividedBy(100).toFixed(4)} × ${adjustmentFactor.toFixed(6)} = $${newConversionPrice.dividedBy(100).toFixed(4)}`,
    `New conversion ratio: ${adjustedConversionRatio.toFixed(6)}`,
    `Preferred shares after adjustment: ${originalShares.toFixed(0)} × ${newConversionRatio.toFixed(6)} = ${newPreferredShares.toFixed(0)}`,
    `Dilution protection: ${dilutionProtection.times(100).toFixed(2)}%`
  ];
  
  return {
    seriesId: series.id,
    seriesName: series.name,
    originalConversionRatio: series.conversionRatio,
    adjustedConversionRatio: adjustedConversionRatio.toNumber(),
    adjustmentFactor: newConversionRatio.toNumber(),
    newPreferredShares: newPreferredShares.toNumber(),
    dilutionProtection: dilutionProtection.toNumber(),
    formulaUsed: `Weighted Average (${broadBased ? 'Broad' : 'Narrow'}-based): NCP = OCP × (A + B) ÷ (A + C)`,
    calculationSteps
  };
}

/**
 * Comprehensive Anti-Dilution Analysis
 * 
 * Calculates anti-dilution adjustments for all protected preferred series
 * in a down round scenario and provides detailed analysis.
 * 
 * @param preferredSeries - All preferred series with their protection terms
 * @param downRound - Details of the down round
 * @param capTable - Current cap table snapshot before the down round
 * @returns Comprehensive anti-dilution analysis
 */
export function analyzeAntiDilution(
  preferredSeries: IPreferredSeries[],
  downRound: IDownRound,
  capTable: ICapTableSnapshot
): IAntiDilutionAnalysis {
  validateAntiDilutionInputs(preferredSeries, downRound, capTable);
  
  const adjustments: IAntiDilutionResult[] = [];
  let totalNewPreferredShares = 0;
  
  // Calculate adjustments for each protected series
  for (const series of preferredSeries) {
    let adjustment: IAntiDilutionResult;
    
    // Only calculate adjustments if it's a down round for this series
    if (downRound.newPrice < series.originalPrice) {
      switch (series.antiDilutionType) {
        case AntiDilutionType.FULL_RATCHET:
          adjustment = calculateFullRatchet(series, downRound);
          break;
          
        case AntiDilutionType.WEIGHTED_AVERAGE_BROAD:
          adjustment = calculateWeightedAverage(series, downRound, capTable, true);
          break;
          
        case AntiDilutionType.WEIGHTED_AVERAGE_NARROW:
          adjustment = calculateWeightedAverage(series, downRound, capTable, false);
          break;
          
        case AntiDilutionType.NONE:
        default:
          // No adjustment for series without protection
          adjustment = {
            seriesId: series.id,
            seriesName: series.name,
            originalConversionRatio: series.conversionRatio,
            adjustedConversionRatio: series.conversionRatio,
            adjustmentFactor: 1,
            newPreferredShares: series.shares,
            dilutionProtection: 0,
            formulaUsed: 'No anti-dilution protection',
            calculationSteps: ['No adjustment - series has no anti-dilution protection']
          };
          break;
      }
    } else {
      // Not a down round for this series
      adjustment = {
        seriesId: series.id,
        seriesName: series.name,
        originalConversionRatio: series.conversionRatio,
        adjustedConversionRatio: series.conversionRatio,
        adjustmentFactor: 1,
        newPreferredShares: series.shares,
        dilutionProtection: 0,
        formulaUsed: 'No adjustment required',
        calculationSteps: ['No adjustment - new price is not below original price']
      };
    }
    
    adjustments.push(adjustment);
    totalNewPreferredShares += adjustment.newPreferredShares;
  }
  
  // Calculate post-adjustment cap table
  const additionalPreferredShares = totalNewPreferredShares - capTable.totalPreferredShares;
  
  const capTableAfter: ICapTableSnapshot = {
    commonShares: capTable.commonShares,
    totalPreferredShares: totalNewPreferredShares,
    optionsOutstanding: capTable.optionsOutstanding,
    optionsAvailable: capTable.optionsAvailable,
    warrants: capTable.warrants,
    fullyDilutedShares: capTable.fullyDilutedShares + additionalPreferredShares + downRound.sharesIssued
  };
  
  // Calculate overall dilution metrics
  const totalDilutionWithoutProtection = new Decimal(downRound.sharesIssued)
    .dividedBy(capTable.fullyDilutedShares + downRound.sharesIssued)
    .toNumber();
    
  const totalDilutionWithProtection = new Decimal(downRound.sharesIssued + additionalPreferredShares)
    .dividedBy(capTableAfter.fullyDilutedShares)
    .toNumber();
    
  const dilutionSavings = totalDilutionWithoutProtection - totalDilutionWithProtection;
  
  return {
    downRound,
    capTableBefore: capTable,
    capTableAfter,
    adjustments,
    totalDilutionWithoutProtection,
    totalDilutionWithProtection,
    dilutionSavings
  };
}

/**
 * Calculate Multiple Round Anti-Dilution Scenarios
 * 
 * Models anti-dilution adjustments across multiple down rounds,
 * taking into account cumulative effects.
 * 
 * @param preferredSeries - Initial preferred series
 * @param downRounds - Sequence of down rounds
 * @param initialCapTable - Starting cap table
 * @returns Array of anti-dilution analyses for each round
 */
export function analyzeMultipleRoundAntiDilution(
  preferredSeries: IPreferredSeries[],
  downRounds: IDownRound[],
  initialCapTable: ICapTableSnapshot
): IAntiDilutionAnalysis[] {
  const results: IAntiDilutionAnalysis[] = [];
  let currentCapTable = { ...initialCapTable };
  let currentSeries = [...preferredSeries];
  
  for (const downRound of downRounds) {
    const analysis = analyzeAntiDilution(currentSeries, downRound, currentCapTable);
    results.push(analysis);
    
    // Update cap table and series for next round
    currentCapTable = analysis.capTableAfter;
    
    // Update conversion ratios for next round calculations
    currentSeries = currentSeries.map(series => {
      const adjustment = analysis.adjustments.find(adj => adj.seriesId === series.id);
      return adjustment ? {
        ...series,
        conversionRatio: adjustment.adjustedConversionRatio,
        shares: adjustment.newPreferredShares
      } : series;
    });
  }
  
  return results;
}

/**
 * Find optimal anti-dilution terms for a preferred series
 * 
 * Analyzes different protection scenarios to help with term sheet negotiations
 * 
 * @param series - Preferred series to analyze
 * @param potentialDownRounds - Scenarios to test
 * @param capTable - Current cap table
 * @returns Analysis of different protection scenarios
 */
export function optimizeAntiDilutionTerms(
  series: IPreferredSeries,
  potentialDownRounds: IDownRound[],
  capTable: ICapTableSnapshot
): Array<{
  scenario: IDownRound;
  protectionTypes: Array<{
    type: AntiDilutionType;
    result: IAntiDilutionResult;
    valueProtected: number; // Estimated value protected in cents
  }>;
}> {
  return potentialDownRounds.map(downRound => {
    const protectionTypes: Array<{
      type: AntiDilutionType;
      result: IAntiDilutionResult;
      valueProtected: number;
    }> = [];
    
    // Test each protection type
    for (const protectionType of Object.values(AntiDilutionType)) {
      if (protectionType === AntiDilutionType.NONE) continue;
      
      const testSeries = { ...series, antiDilutionType: protectionType };
      let result: IAntiDilutionResult;
      
      switch (protectionType) {
        case AntiDilutionType.FULL_RATCHET:
          result = calculateFullRatchet(testSeries, downRound);
          break;
        case AntiDilutionType.WEIGHTED_AVERAGE_BROAD:
          result = calculateWeightedAverage(testSeries, downRound, capTable, true);
          break;
        case AntiDilutionType.WEIGHTED_AVERAGE_NARROW:
          result = calculateWeightedAverage(testSeries, downRound, capTable, false);
          break;
        default:
          continue;
      }
      
      // Calculate value protected (simplified estimate)
      const valueProtected = (result.newPreferredShares - series.shares) * downRound.newPrice;
      
      protectionTypes.push({
        type: protectionType,
        result,
        valueProtected
      });
    }
    
    return {
      scenario: downRound,
      protectionTypes
    };
  });
}