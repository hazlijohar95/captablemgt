import Decimal from 'decimal.js';
import { 
  ValidationError, 
  financialRules 
} from '@/utils/validation';

// Configure Decimal for high precision SAFE calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Enhanced SAFE Note Conversion Calculations
 * 
 * Implements comprehensive SAFE conversion scenarios including:
 * - Post-money and Pre-money SAFEs
 * - Multiple SAFE rounds with different terms
 * - MFN (Most Favored Nation) provisions
 * - Pro rata rights calculations
 * - Complex triggering events
 * - SAFE-on-SAFE scenarios
 * 
 * References:
 * - Y Combinator SAFE Documents (2018)
 * - NVCA SAFE Conversion Guide
 * - Cooley LLP SAFE Analysis
 * - Orrick SAFE Term Analysis
 */

export enum SAFEType {
  POST_MONEY_VALUATION_CAP = 'POST_MONEY_VALUATION_CAP',
  PRE_MONEY_VALUATION_CAP = 'PRE_MONEY_VALUATION_CAP',
  DISCOUNT_ONLY = 'DISCOUNT_ONLY',
  MFN_ONLY = 'MFN_ONLY'
}

export enum ConversionTrigger {
  EQUITY_FINANCING = 'EQUITY_FINANCING', // Priced round
  LIQUIDITY_EVENT = 'LIQUIDITY_EVENT',   // IPO, acquisition
  DISSOLUTION_EVENT = 'DISSOLUTION_EVENT', // Company dissolution
  MATURITY = 'MATURITY'                  // SAFE maturity date
}

export interface ISAFENote {
  id: string;
  investorName: string;
  investmentAmount: number; // Principal amount in cents
  safeType: SAFEType;
  
  // Terms
  valuationCap?: number; // Valuation cap in cents
  discountRate?: number; // Discount rate as decimal (e.g., 0.20 for 20%)
  
  // Advanced terms
  mostFavoredNation: boolean; // MFN provision
  proRataRights: boolean; // Right to participate in future rounds
  
  // Dates
  issuanceDate: string; // ISO date
  maturityDate?: string; // ISO date (if applicable)
  
  // Status
  converted: boolean;
  conversionDate?: string;
  conversionTrigger?: ConversionTrigger;
}

export interface IEquityRound {
  name: string;
  investmentAmount: number; // Total round size in cents
  pricePerShare: number; // Price per share in cents
  preMoneyValuation: number; // Pre-money valuation in cents
  shareClass: string;
  
  // Capital structure before round
  existingShares: number;
  existingValuation: number; // Based on previous round or valuation
  
  // Terms affecting SAFE conversion
  liquidationPreference: number; // Multiple
  antiDilutionProvision: boolean;
  participatingPreferred: boolean;
}

export interface ILiquidityEvent {
  type: 'IPO' | 'ACQUISITION' | 'MERGER';
  valuation: number; // Company valuation in cents
  proceedsToShareholders: number; // Cash to shareholders in cents
  stockConsideration?: number; // Stock value if stock+cash deal
}

export interface ISAFEConversionResult {
  safeId: string;
  investorName: string;
  originalInvestment: number;
  
  conversion: {
    trigger: ConversionTrigger;
    conversionPrice: number; // Effective price per share in cents
    sharesReceived: number;
    shareClass: string;
    
    // Valuation calculations
    impliedValuation: number; // Valuation implied by conversion
    ownershipPercentage: number;
    
    // Analysis
    returnMultiple: number; // Compared to investment
    isoStrike?: number; // If converting to options instead of equity
  };
  
  // MFN adjustments applied
  mfnAdjustments: Array<{
    reason: string;
    originalTerm: string;
    adjustedTerm: string;
    benefit: number; // Additional value in cents
  }>;
  
  // Pro rata analysis
  proRataAnalysis?: {
    eligible: boolean;
    allocationOffered: number; // Shares or investment amount
    percentageOfRound: number;
    valuationAtParticipation: number;
  };
}

export interface ISAFEConversionAnalysis {
  triggeringEvent: IEquityRound | ILiquidityEvent;
  conversions: ISAFEConversionResult[];
  
  // Stack analysis
  totalSAFEInvestment: number;
  totalSharesIssued: number;
  totalOwnershipToSAFEs: number;
  
  // Impact on existing shareholders
  dilutionToExisting: number;
  dilutionToFounders: number;
  
  // Post-conversion cap table
  postConversionShares: number;
  postConversionValuation: number;
  
  summary: {
    averageReturnMultiple: number;
    totalValueCreated: number;
    effectiveValuation: number;
    recommendedActions: string[];
  };
}

/**
 * Convert SAFE to equity in an equity financing round
 * 
 * @param safe - SAFE note details
 * @param equityRound - Details of the triggering equity round
 * @param existingShares - Shares outstanding before conversion
 * @returns SAFE conversion result
 */
export function convertSAFEInEquityRound(
  safe: ISAFENote,
  equityRound: IEquityRound,
  existingShares: number
): ISAFEConversionResult {
  validateSAFEConversion(safe, equityRound, existingShares);
  
  const investment = new Decimal(safe.investmentAmount);
  const roundPrice = new Decimal(equityRound.pricePerShare);
  
  let conversionPrice: Decimal;
  let calculationMethod: string;
  
  // Calculate conversion price based on SAFE type
  switch (safe.safeType) {
    case SAFEType.POST_MONEY_VALUATION_CAP:
      conversionPrice = calculatePostMoneyCapConversion(safe, equityRound, existingShares);
      calculationMethod = 'Post-money valuation cap';
      break;
      
    case SAFEType.PRE_MONEY_VALUATION_CAP:
      conversionPrice = calculatePreMoneyCapConversion(safe, equityRound, existingShares);
      calculationMethod = 'Pre-money valuation cap';
      break;
      
    case SAFEType.DISCOUNT_ONLY:
      conversionPrice = calculateDiscountOnlyConversion(safe, equityRound);
      calculationMethod = 'Discount only';
      break;
      
    case SAFEType.MFN_ONLY:
      conversionPrice = roundPrice; // Will be adjusted by MFN if applicable
      calculationMethod = 'Most Favored Nation';
      break;
      
    default:
      throw new ValidationError(`Unsupported SAFE type: ${safe.safeType}`, 'safe.safeType');
  }
  
  // Apply discount if both cap and discount exist
  if (safe.discountRate && safe.valuationCap) {
    const discountPrice = roundPrice.times(new Decimal(1).minus(safe.discountRate));
    conversionPrice = Decimal.min(conversionPrice, discountPrice);
    
    if (discountPrice.lt(conversionPrice)) {
      calculationMethod += ' (limited by discount)';
    }
  }
  
  // Calculate shares received
  const sharesReceived = investment.dividedBy(conversionPrice).floor();
  
  // Calculate ownership percentage (simplified - doesn't account for all post-conversion dilution)
  const totalPostConversionShares = existingShares + sharesReceived.toNumber() + 
    Math.floor(equityRound.investmentAmount / equityRound.pricePerShare);
  const ownershipPercentage = sharesReceived.dividedBy(totalPostConversionShares).times(100);
  
  // Calculate implied valuation and returns
  const impliedValuation = sharesReceived.times(roundPrice);
  const returnMultiple = impliedValuation.dividedBy(investment);
  
  return {
    safeId: safe.id,
    investorName: safe.investorName,
    originalInvestment: safe.investmentAmount,
    conversion: {
      trigger: ConversionTrigger.EQUITY_FINANCING,
      conversionPrice: conversionPrice.toNumber(),
      sharesReceived: sharesReceived.toNumber(),
      shareClass: equityRound.shareClass,
      impliedValuation: impliedValuation.toNumber(),
      ownershipPercentage: ownershipPercentage.toNumber(),
      returnMultiple: returnMultiple.toNumber()
    },
    mfnAdjustments: [], // Will be calculated separately
    proRataAnalysis: safe.proRataRights ? {
      eligible: true,
      allocationOffered: 0, // To be calculated based on round terms
      percentageOfRound: 0,
      valuationAtParticipation: equityRound.preMoneyValuation + equityRound.investmentAmount
    } : undefined
  };
}

/**
 * Calculate post-money cap conversion price
 */
function calculatePostMoneyCapConversion(
  safe: ISAFENote,
  equityRound: IEquityRound,
  existingShares: number
): Decimal {
  if (!safe.valuationCap) {
    throw new ValidationError('Post-money cap SAFE requires valuation cap', 'safe.valuationCap');
  }
  
  const cap = new Decimal(safe.valuationCap);
  const existingSharesDecimal = new Decimal(existingShares);
  
  // Post-money cap: Price = Cap / (Existing Shares + All SAFE Shares as if converted)
  // Simplified calculation - in practice would need iterative solving for multiple SAFEs
  const conversionPrice = cap.dividedBy(existingSharesDecimal);
  
  return conversionPrice;
}

/**
 * Calculate pre-money cap conversion price
 */
function calculatePreMoneyCapConversion(
  safe: ISAFENote,
  equityRound: IEquityRound,
  existingShares: number
): Decimal {
  if (!safe.valuationCap) {
    throw new ValidationError('Pre-money cap SAFE requires valuation cap', 'safe.valuationCap');
  }
  
  const cap = new Decimal(safe.valuationCap);
  const existingSharesDecimal = new Decimal(existingShares);
  
  // Pre-money cap: Price = Cap / Existing Shares (before SAFE conversion)
  const conversionPrice = cap.dividedBy(existingSharesDecimal);
  
  return conversionPrice;
}

/**
 * Calculate discount-only conversion price
 */
function calculateDiscountOnlyConversion(
  safe: ISAFENote,
  equityRound: IEquityRound
): Decimal {
  if (!safe.discountRate) {
    throw new ValidationError('Discount-only SAFE requires discount rate', 'safe.discountRate');
  }
  
  const roundPrice = new Decimal(equityRound.pricePerShare);
  const discountMultiplier = new Decimal(1).minus(safe.discountRate);
  
  return roundPrice.times(discountMultiplier);
}

/**
 * Apply Most Favored Nation provisions across multiple SAFEs
 * 
 * @param safes - All SAFE notes to analyze
 * @param triggeringRound - The equity round triggering conversion
 * @returns SAFEs with MFN adjustments applied
 */
export function applyMostFavoredNation(
  safes: ISAFENote[],
  triggeringRound: IEquityRound
): Array<ISAFENote & { mfnAdjustments: Array<{ reason: string; originalTerm: string; adjustedTerm: string; benefit: number }> }> {
  const mfnSafes = safes.filter(safe => safe.mostFavoredNation);
  const results = safes.map(safe => ({ ...safe, mfnAdjustments: [] }));
  
  if (mfnSafes.length === 0) {
    return results;
  }
  
  // Find the most favorable terms across all SAFEs
  const bestDiscount = Math.max(...safes.map(s => s.discountRate || 0));
  const bestCap = Math.min(...safes.filter(s => s.valuationCap).map(s => s.valuationCap!));
  
  // Apply MFN adjustments
  for (let i = 0; i < results.length; i++) {
    const safe = results[i];
    
    if (!safe.mostFavoredNation) continue;
    
    // Apply better discount if available
    if (bestDiscount > (safe.discountRate || 0)) {
      const originalTerm = safe.discountRate 
        ? `${(safe.discountRate * 100).toFixed(1)}% discount`
        : 'No discount';
      const adjustedTerm = `${(bestDiscount * 100).toFixed(1)}% discount`;
      
      // Calculate benefit
      const roundPrice = new Decimal(triggeringRound.pricePerShare);
      const originalPrice = safe.discountRate 
        ? roundPrice.times(new Decimal(1).minus(safe.discountRate))
        : roundPrice;
      const adjustedPrice = roundPrice.times(new Decimal(1).minus(bestDiscount));
      
      const originalShares = new Decimal(safe.investmentAmount).dividedBy(originalPrice);
      const adjustedShares = new Decimal(safe.investmentAmount).dividedBy(adjustedPrice);
      const additionalShares = adjustedShares.minus(originalShares);
      const benefit = additionalShares.times(roundPrice);
      
      safe.discountRate = bestDiscount;
      safe.mfnAdjustments.push({
        reason: 'MFN: Better discount rate applied',
        originalTerm,
        adjustedTerm,
        benefit: benefit.toNumber()
      });
    }
    
    // Apply better cap if available
    if (safe.valuationCap && bestCap < safe.valuationCap) {
      const originalTerm = `$${(safe.valuationCap / 100).toLocaleString()} cap`;
      const adjustedTerm = `$${(bestCap / 100).toLocaleString()} cap`;
      
      // Calculate benefit
      const originalCapPrice = new Decimal(safe.valuationCap).dividedBy(triggeringRound.existingShares);
      const adjustedCapPrice = new Decimal(bestCap).dividedBy(triggeringRound.existingShares);
      
      const originalShares = new Decimal(safe.investmentAmount).dividedBy(originalCapPrice);
      const adjustedShares = new Decimal(safe.investmentAmount).dividedBy(adjustedCapPrice);
      const additionalShares = adjustedShares.minus(originalShares);
      const benefit = additionalShares.times(triggeringRound.pricePerShare);
      
      safe.valuationCap = bestCap;
      safe.mfnAdjustments.push({
        reason: 'MFN: Better valuation cap applied',
        originalTerm,
        adjustedTerm,
        benefit: benefit.toNumber()
      });
    }
  }
  
  return results;
}

/**
 * Calculate comprehensive SAFE conversion analysis for equity round
 * 
 * @param safes - All SAFE notes
 * @param equityRound - Triggering equity round
 * @param existingCapTable - Current cap table before conversion
 * @returns Comprehensive conversion analysis
 */
export function analyzeSAFEConversions(
  safes: ISAFENote[],
  equityRound: IEquityRound,
  existingCapTable: {
    commonShares: number;
    preferredShares: number;
    optionsOutstanding: number;
    optionsAvailable: number;
  }
): ISAFEConversionAnalysis {
  validateSAFEConversionInputs(safes, equityRound, existingCapTable);
  
  // Apply MFN provisions first
  const adjustedSAFEs = applyMostFavoredNation(safes, equityRound);
  
  // Convert each SAFE
  const conversions: ISAFEConversionResult[] = [];
  let totalSAFEShares = 0;
  let totalSAFEInvestment = 0;
  
  const existingShares = existingCapTable.commonShares + existingCapTable.preferredShares;
  
  for (const safe of adjustedSAFEs) {
    const conversion = convertSAFEInEquityRound(safe, equityRound, existingShares);
    
    // Calculate pro rata rights if applicable
    if (safe.proRataRights) {
      const proRataAnalysis = calculateProRataRights(
        safe, conversion, equityRound, existingCapTable
      );
      conversion.proRataAnalysis = proRataAnalysis;
    }
    
    conversions.push(conversion);
    totalSAFEShares += conversion.conversion.sharesReceived;
    totalSAFEInvestment += safe.investmentAmount;
  }
  
  // Calculate round investor shares
  const roundInvestorShares = Math.floor(equityRound.investmentAmount / equityRound.pricePerShare);
  
  // Calculate post-conversion metrics
  const postConversionShares = existingShares + totalSAFEShares + roundInvestorShares;
  const postConversionValuation = postConversionShares * equityRound.pricePerShare;
  
  // Calculate dilution impact
  const totalOwnershipToSAFEs = (totalSAFEShares / postConversionShares) * 100;
  const dilutionToExisting = ((existingShares / (existingShares + totalSAFEShares + roundInvestorShares)) - 
                             (existingShares / existingShares)) * 100;
  
  // Calculate summary metrics
  const averageReturnMultiple = totalSAFEInvestment > 0 
    ? (totalSAFEShares * equityRound.pricePerShare) / totalSAFEInvestment
    : 0;
  
  const totalValueCreated = (totalSAFEShares * equityRound.pricePerShare) - totalSAFEInvestment;
  const effectiveValuation = totalSAFEInvestment > 0 
    ? totalSAFEInvestment / (totalOwnershipToSAFEs / 100)
    : 0;
  
  // Generate recommendations
  const recommendations = generateConversionRecommendations(
    conversions, equityRound, totalOwnershipToSAFEs, averageReturnMultiple
  );
  
  return {
    triggeringEvent: equityRound,
    conversions,
    totalSAFEInvestment,
    totalSharesIssued: totalSAFEShares,
    totalOwnershipToSAFEs,
    dilutionToExisting,
    dilutionToFounders: dilutionToExisting, // Simplified - assumes founders hold existing shares
    postConversionShares,
    postConversionValuation,
    summary: {
      averageReturnMultiple,
      totalValueCreated,
      effectiveValuation,
      recommendedActions: recommendations
    }
  };
}

/**
 * Calculate SAFE conversion in liquidity event
 * 
 * @param safes - SAFE notes to convert
 * @param liquidityEvent - Liquidity event details
 * @param existingCapTable - Current cap table
 * @returns Liquidity conversion analysis
 */
export function convertSAFEsInLiquidityEvent(
  safes: ISAFENote[],
  liquidityEvent: ILiquidityEvent,
  existingCapTable: {
    commonShares: number;
    preferredShares: number;
    fullyDilutedShares: number;
  }
): ISAFEConversionAnalysis {
  const conversions: ISAFEConversionResult[] = [];
  let totalSAFEValue = 0;
  
  for (const safe of safes) {
    let liquidationValue: Decimal;
    
    if (liquidityEvent.type === 'IPO') {
      // In IPO, SAFEs typically convert to common stock
      // Use the post-money valuation to determine conversion
      const impliedSharePrice = new Decimal(liquidityEvent.valuation)
        .dividedBy(existingCapTable.fullyDilutedShares);
      
      let conversionPrice = impliedSharePrice;
      
      // Apply cap if beneficial
      if (safe.valuationCap) {
        const capPrice = new Decimal(safe.valuationCap)
          .dividedBy(existingCapTable.fullyDilutedShares);
        conversionPrice = Decimal.min(conversionPrice, capPrice);
      }
      
      // Apply discount if beneficial
      if (safe.discountRate) {
        const discountPrice = impliedSharePrice.times(new Decimal(1).minus(safe.discountRate));
        conversionPrice = Decimal.min(conversionPrice, discountPrice);
      }
      
      const sharesReceived = new Decimal(safe.investmentAmount).dividedBy(conversionPrice).floor();
      liquidationValue = sharesReceived.times(impliedSharePrice);
      
      conversions.push({
        safeId: safe.id,
        investorName: safe.investorName,
        originalInvestment: safe.investmentAmount,
        conversion: {
          trigger: ConversionTrigger.LIQUIDITY_EVENT,
          conversionPrice: conversionPrice.toNumber(),
          sharesReceived: sharesReceived.toNumber(),
          shareClass: 'COMMON',
          impliedValuation: liquidationValue.toNumber(),
          ownershipPercentage: sharesReceived.dividedBy(existingCapTable.fullyDilutedShares + sharesReceived.toNumber()).times(100).toNumber(),
          returnMultiple: liquidationValue.dividedBy(safe.investmentAmount).toNumber()
        },
        mfnAdjustments: []
      });
      
    } else {
      // In acquisition/merger, SAFEs get cash payout
      // Calculate based on either conversion to shares or direct payout
      const directPayout = new Decimal(safe.investmentAmount); // Minimum payout
      
      // Calculate as-if-converted value
      let asIfConvertedValue = directPayout;
      
      if (safe.valuationCap) {
        const ownershipPercentage = new Decimal(safe.investmentAmount)
          .dividedBy(safe.valuationCap);
        asIfConvertedValue = new Decimal(liquidityEvent.valuation)
          .times(ownershipPercentage);
      }
      
      liquidationValue = Decimal.max(directPayout, asIfConvertedValue);
      
      conversions.push({
        safeId: safe.id,
        investorName: safe.investorName,
        originalInvestment: safe.investmentAmount,
        conversion: {
          trigger: ConversionTrigger.LIQUIDITY_EVENT,
          conversionPrice: liquidationValue.dividedBy(safe.investmentAmount).toNumber(), // Effective price
          sharesReceived: 0, // Cash payout, not shares
          shareClass: 'CASH',
          impliedValuation: liquidationValue.toNumber(),
          ownershipPercentage: 0, // Cash payout
          returnMultiple: liquidationValue.dividedBy(safe.investmentAmount).toNumber()
        },
        mfnAdjustments: []
      });
    }
    
    totalSAFEValue += liquidationValue.toNumber();
  }
  
  return {
    triggeringEvent: liquidityEvent,
    conversions,
    totalSAFEInvestment: safes.reduce((sum, safe) => sum + safe.investmentAmount, 0),
    totalSharesIssued: conversions.reduce((sum, conv) => sum + conv.conversion.sharesReceived, 0),
    totalOwnershipToSAFEs: 0, // Not applicable for liquidity events
    dilutionToExisting: 0,
    dilutionToFounders: 0,
    postConversionShares: existingCapTable.fullyDilutedShares,
    postConversionValuation: liquidityEvent.valuation,
    summary: {
      averageReturnMultiple: safes.length > 0 
        ? totalSAFEValue / safes.reduce((sum, safe) => sum + safe.investmentAmount, 0)
        : 0,
      totalValueCreated: totalSAFEValue - safes.reduce((sum, safe) => sum + safe.investmentAmount, 0),
      effectiveValuation: liquidityEvent.valuation,
      recommendedActions: [
        'Review liquidity event terms with legal counsel',
        'Validate SAFE conversion calculations with cap table provider',
        'Consider tax implications of liquidity proceeds'
      ]
    }
  };
}

/**
 * Calculate pro rata rights for SAFE holders
 */
function calculateProRataRights(
  _safe: ISAFENote,
  conversion: ISAFEConversionResult,
  equityRound: IEquityRound,
  _existingCapTable: any
) {
  const ownershipPercentage = conversion.conversion.ownershipPercentage / 100;
  const proRataAllocation = equityRound.investmentAmount * ownershipPercentage;
  const proRataShares = Math.floor(proRataAllocation / equityRound.pricePerShare);
  
  return {
    eligible: true,
    allocationOffered: proRataShares,
    percentageOfRound: (proRataAllocation / equityRound.investmentAmount) * 100,
    valuationAtParticipation: equityRound.preMoneyValuation + equityRound.investmentAmount
  };
}

/**
 * Model SAFE-on-SAFE scenarios
 * 
 * When no equity round triggers conversion, but new SAFEs are issued
 * 
 * @param existingSafes - Existing SAFE notes
 * @param newSafes - New SAFE notes being issued
 * @param currentValuation - Current company valuation estimate
 * @returns Analysis of SAFE stacking implications
 */
export function modelSAFEonSAFE(
  existingSafes: ISAFENote[],
  newSafes: ISAFENote[],
  currentValuation: number
): {
  mfnAdjustments: Array<{
    safeId: string;
    adjustments: Array<{ reason: string; originalTerm: string; adjustedTerm: string; benefit: number }>;
  }>;
  stackingAnalysis: {
    totalSAFEInvestment: number;
    impliedOwnership: number;
    overhang: number; // Total SAFE obligation as % of current valuation
    nextRoundImpact: {
      minimumRoundPrice: number; // To avoid massive dilution
      recommendedRoundSize: number; // To balance SAFE conversion
    };
  };
  recommendations: string[];
} {
  const allSafes = [...existingSafes, ...newSafes];
  const totalInvestment = allSafes.reduce((sum, safe) => sum + safe.investmentAmount, 0);
  
  // Apply MFN to existing SAFEs based on new SAFE terms
  const mfnAdjustments = [];
  for (const existingSafe of existingSafes) {
    if (!existingSafe.mostFavoredNation) continue;
    
    const adjustments = [];
    
    // Check if any new SAFE has better terms
    for (const newSafe of newSafes) {
      if (newSafe.discountRate && newSafe.discountRate > (existingSafe.discountRate || 0)) {
        adjustments.push({
          reason: `MFN triggered by ${newSafe.investorName}'s better discount`,
          originalTerm: existingSafe.discountRate 
            ? `${(existingSafe.discountRate * 100).toFixed(1)}% discount`
            : 'No discount',
          adjustedTerm: `${(newSafe.discountRate * 100).toFixed(1)}% discount`,
          benefit: 0 // Will be calculated at conversion
        });
      }
      
      if (newSafe.valuationCap && (!existingSafe.valuationCap || newSafe.valuationCap < existingSafe.valuationCap)) {
        adjustments.push({
          reason: `MFN triggered by ${newSafe.investorName}'s better cap`,
          originalTerm: existingSafe.valuationCap 
            ? `$${(existingSafe.valuationCap / 100).toLocaleString()} cap`
            : 'No cap',
          adjustedTerm: `$${(newSafe.valuationCap / 100).toLocaleString()} cap`,
          benefit: 0 // Will be calculated at conversion
        });
      }
    }
    
    if (adjustments.length > 0) {
      mfnAdjustments.push({
        safeId: existingSafe.id,
        adjustments
      });
    }
  }
  
  // Calculate stacking implications
  const lowestCap = Math.min(...allSafes.filter(s => s.valuationCap).map(s => s.valuationCap!));
  const _highestDiscount = Math.max(...allSafes.map(s => s.discountRate || 0));
  
  // Estimate implied ownership if all converted at current valuation
  const estimatedShares = allSafes.reduce((sum, safe) => {
    let conversionPrice = currentValuation / 1000000; // Assume 1M shares outstanding (simplified)
    
    if (safe.valuationCap) {
      const capPrice = safe.valuationCap / 1000000;
      conversionPrice = Math.min(conversionPrice, capPrice);
    }
    
    if (safe.discountRate) {
      const discountPrice = conversionPrice * (1 - safe.discountRate);
      conversionPrice = Math.min(conversionPrice, discountPrice);
    }
    
    return sum + (safe.investmentAmount / conversionPrice);
  }, 0);
  
  const impliedOwnership = estimatedShares / (1000000 + estimatedShares);
  const overhang = totalInvestment / currentValuation;
  
  // Calculate recommendations for next round
  const minimumRoundPrice = lowestCap / 1000000; // Simplified
  const recommendedRoundSize = totalInvestment * 2; // 2x SAFE investment as rule of thumb
  
  const recommendations = [
    `Total SAFE overhang: ${(overhang * 100).toFixed(1)}% of current valuation`,
    `Implied SAFE ownership at conversion: ${(impliedOwnership * 100).toFixed(1)}%`,
    `Consider raising $${(recommendedRoundSize / 100).toLocaleString()} to balance SAFE conversion`,
    'Review MFN provisions before issuing new SAFEs',
    'Consider converting SAFEs to equity to clean up cap table'
  ];
  
  if (overhang > 0.3) {
    recommendations.push('WARNING: High SAFE overhang may complicate future fundraising');
  }
  
  return {
    mfnAdjustments,
    stackingAnalysis: {
      totalSAFEInvestment: totalInvestment,
      impliedOwnership: impliedOwnership * 100,
      overhang: overhang * 100,
      nextRoundImpact: {
        minimumRoundPrice: minimumRoundPrice,
        recommendedRoundSize: recommendedRoundSize
      }
    },
    recommendations
  };
}

/**
 * Generate conversion recommendations
 */
function generateConversionRecommendations(
  conversions: ISAFEConversionResult[],
  _equityRound: IEquityRound,
  totalOwnership: number,
  averageReturn: number
): string[] {
  const recommendations: string[] = [];
  
  if (totalOwnership > 25) {
    recommendations.push('WARNING: SAFE conversions result in >25% dilution to existing shareholders');
  }
  
  if (averageReturn < 2) {
    recommendations.push('Low return multiple - consider if conversion terms are fair');
  }
  
  if (averageReturn > 10) {
    recommendations.push('High return multiple - excellent outcome for SAFE investors');
  }
  
  const highReturnSafes = conversions.filter(c => c.conversion.returnMultiple > 5);
  if (highReturnSafes.length > 0) {
    recommendations.push(`${highReturnSafes.length} SAFE(s) achieving >5x return`);
  }
  
  recommendations.push('Validate all calculations with legal counsel before finalizing round');
  
  return recommendations;
}

/**
 * Validate SAFE conversion inputs
 */
function validateSAFEConversion(
  safe: ISAFENote,
  equityRound: IEquityRound,
  existingShares: number
): void {
  try {
    financialRules.nonEmptyString(safe.id, 'safe.id');
    financialRules.positiveAmount(safe.investmentAmount, 'safe.investmentAmount');
    financialRules.validShareCount(existingShares, 'existingShares');
    
    financialRules.positiveAmount(equityRound.investmentAmount, 'equityRound.investmentAmount');
    financialRules.positiveAmount(equityRound.pricePerShare, 'equityRound.pricePerShare');
    financialRules.positiveAmount(equityRound.preMoneyValuation, 'equityRound.preMoneyValuation');
    
    if (safe.discountRate && (safe.discountRate < 0 || safe.discountRate >= 1)) {
      throw new ValidationError('Discount rate must be between 0 and 1', 'safe.discountRate');
    }
    
  } catch (error) {
    console.error('SAFE conversion validation failed:', error);
    throw error;
  }
}

/**
 * Validate SAFE conversion analysis inputs
 */
function validateSAFEConversionInputs(
  safes: ISAFENote[],
  equityRound: IEquityRound,
  existingCapTable: any
): void {
  try {
    financialRules.nonEmptyArray(safes, 'safes');
    
    safes.forEach((safe, index) => {
      try {
        validateSAFEConversion(safe, equityRound, existingCapTable.commonShares + existingCapTable.preferredShares);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(`SAFE ${index + 1}: ${error.message}`, `safes[${index}].${error.field}`);
        }
        throw error;
      }
    });
    
    financialRules.validShareCount(existingCapTable.commonShares, 'existingCapTable.commonShares');
    financialRules.validShareCount(existingCapTable.preferredShares, 'existingCapTable.preferredShares');
    financialRules.validShareCount(existingCapTable.optionsOutstanding, 'existingCapTable.optionsOutstanding');
    financialRules.validShareCount(existingCapTable.optionsAvailable, 'existingCapTable.optionsAvailable');
    
  } catch (error) {
    console.error('SAFE conversion analysis validation failed:', error);
    throw error;
  }
}