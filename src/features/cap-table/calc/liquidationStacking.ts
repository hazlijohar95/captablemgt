import Decimal from 'decimal.js';
import { 
  ValidationError, 
  financialRules 
} from '@/utils/validation';

// Configure Decimal for high precision financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Enhanced Liquidation Preference Stacking Calculations
 * 
 * Implements sophisticated liquidation preference mechanisms:
 * - Multiple liquidation preference multiples
 * - Participating vs non-participating preferred
 * - Stacked preferences with complex seniority
 * - Cumulative dividend calculations
 * - Conversion option analysis
 * 
 * References:
 * - NVCA Term Sheet Standards
 * - Cooley LLP Liquidation Preference Guide
 * - Fenwick & West Liquidation Analysis
 */

export enum ParticipationType {
  NON_PARTICIPATING = 'NON_PARTICIPATING',
  PARTICIPATING = 'PARTICIPATING',
  PARTICIPATING_CAPPED = 'PARTICIPATING_CAPPED'
}

export enum DividendType {
  NONE = 'NONE',
  NON_CUMULATIVE = 'NON_CUMULATIVE',
  CUMULATIVE = 'CUMULATIVE'
}

export interface IPreferredShareClass {
  id: string;
  name: string;
  shares: number;
  originalInvestment: number; // Total amount invested in cents
  liquidationMultiple: number; // 1x, 2x, 3x, etc.
  participationType: ParticipationType;
  participationCap?: number; // Multiple cap for participating preferred
  seniorityRank: number; // 1 = most senior (paid first)
  
  // Dividend terms
  dividendType: DividendType;
  dividendRate?: number; // Annual percentage rate
  unpaidDividends?: number; // Accumulated unpaid dividends in cents
  
  // Conversion terms
  conversionRatio: number;
  antiDilutionType?: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE_BROAD' | 'WEIGHTED_AVERAGE_NARROW';
  
  // Date information for dividend calculations
  issuanceDate: string; // ISO date string
}

export interface ICommonShareClass {
  id: string;
  name: string;
  shares: number;
}

export interface ILiquidationEvent {
  exitValue: number; // Total proceeds in cents
  eventDate: string; // ISO date string
  eventType: 'ACQUISITION' | 'IPO' | 'LIQUIDATION' | 'DISSOLUTION';
}

export interface ILiquidationDistribution {
  classId: string;
  className: string;
  classType: 'PREFERRED' | 'COMMON';
  shares: number;
  
  // Distribution breakdown
  liquidationPreference: number;
  cumulativeDividends: number;
  participation: number;
  commonDistribution: number;
  
  // Totals
  totalDistribution: number;
  effectivePerShare: number;
  ownershipPercentage: number;
  
  // Analysis
  preferredVsCommon: {
    asPreferred: number;
    asCommon: number;
    optimalChoice: 'PREFERRED' | 'COMMON';
    additionalValue: number;
  };
}

export interface ILiquidationAnalysis {
  liquidationEvent: ILiquidationEvent;
  distributions: ILiquidationDistribution[];
  
  summary: {
    totalDistributed: number;
    totalLiquidationPreferences: number;
    totalCumulativeDividends: number;
    totalParticipation: number;
    totalCommonDistribution: number;
    undistributedAmount: number;
    
    // Waterfall breakdown by seniority
    waterfallSteps: Array<{
      step: number;
      description: string;
      amountDistributed: number;
      remainingAfterStep: number;
    }>;
  };
}

/**
 * Calculate cumulative dividends for a preferred share class
 * 
 * @param shareClass - Preferred share class with dividend terms
 * @param eventDate - Date of liquidation event
 * @returns Total cumulative dividends owed in cents
 */
function calculateCumulativeDividends(
  shareClass: IPreferredShareClass,
  eventDate: string
): number {
  if (shareClass.dividendType !== DividendType.CUMULATIVE || !shareClass.dividendRate) {
    return shareClass.unpaidDividends || 0;
  }
  
  const issuanceDate = new Date(shareClass.issuanceDate);
  const liquidationDate = new Date(eventDate);
  const yearsElapsed = (liquidationDate.getTime() - issuanceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  
  const annualDividend = new Decimal(shareClass.originalInvestment)
    .times(shareClass.dividendRate)
    .dividedBy(100);
    
  const totalDividends = annualDividend.times(yearsElapsed);
  const unpaidDividends = new Decimal(shareClass.unpaidDividends || 0);
  
  return totalDividends.plus(unpaidDividends).toNumber();
}

/**
 * Calculate liquidation preference waterfall with stacking
 * 
 * Implements the complete liquidation waterfall following industry standards:
 * 1. Pay senior liquidation preferences + cumulative dividends (by seniority)
 * 2. Pay junior liquidation preferences + cumulative dividends (by seniority)
 * 3. Distribute remaining via participation rights (if any)
 * 4. Distribute remainder to common (including preferred converting to common)
 * 
 * @param preferredClasses - All preferred share classes
 * @param commonClasses - All common share classes
 * @param liquidationEvent - Details of the liquidation event
 * @returns Comprehensive liquidation analysis
 */
export function calculateLiquidationStacking(
  preferredClasses: IPreferredShareClass[],
  commonClasses: ICommonShareClass[],
  liquidationEvent: ILiquidationEvent
): ILiquidationAnalysis {
  // Validate inputs
  validateLiquidationInputs(preferredClasses, commonClasses, liquidationEvent);
  
  const distributions: ILiquidationDistribution[] = [];
  let remainingValue = new Decimal(liquidationEvent.exitValue);
  const waterfallSteps: Array<{
    step: number;
    description: string;
    amountDistributed: number;
    remainingAfterStep: number;
  }> = [];
  
  // Initialize distribution tracking
  const distributionMap = new Map<string, {
    liquidationPreference: Decimal;
    cumulativeDividends: Decimal;
    participation: Decimal;
    commonDistribution: Decimal;
  }>();
  
  // Initialize preferred distributions
  preferredClasses.forEach(cls => {
    distributionMap.set(cls.id, {
      liquidationPreference: new Decimal(0),
      cumulativeDividends: new Decimal(0),
      participation: new Decimal(0),
      commonDistribution: new Decimal(0)
    });
  });
  
  // Initialize common distributions
  commonClasses.forEach(cls => {
    distributionMap.set(cls.id, {
      liquidationPreference: new Decimal(0),
      cumulativeDividends: new Decimal(0),
      participation: new Decimal(0),
      commonDistribution: new Decimal(0)
    });
  });
  
  let stepCounter = 1;
  
  // STEP 1-N: Pay liquidation preferences + cumulative dividends by seniority
  const sortedPreferred = [...preferredClasses].sort((a, b) => a.seniorityRank - b.seniorityRank);
  
  for (const preferredClass of sortedPreferred) {
    if (remainingValue.lte(0)) break;
    
    // Calculate liquidation preference
    const liquidationPreference = new Decimal(preferredClass.originalInvestment)
      .times(preferredClass.liquidationMultiple);
    
    // Calculate cumulative dividends
    const cumulativeDividends = new Decimal(
      calculateCumulativeDividends(preferredClass, liquidationEvent.eventDate)
    );
    
    // Total preference + dividends for this class
    const totalClassPreference = liquidationPreference.plus(cumulativeDividends);
    const actualPayout = Decimal.min(totalClassPreference, remainingValue);
    
    // Allocate between preference and dividends proportionally
    const prefPortion = totalClassPreference.gt(0) 
      ? liquidationPreference.dividedBy(totalClassPreference)
      : new Decimal(0);
    const dividendPortion = totalClassPreference.gt(0)
      ? cumulativeDividends.dividedBy(totalClassPreference)
      : new Decimal(0);
    
    const dist = distributionMap.get(preferredClass.id)!;
    dist.liquidationPreference = actualPayout.times(prefPortion);
    dist.cumulativeDividends = actualPayout.times(dividendPortion);
    
    remainingValue = remainingValue.minus(actualPayout);
    
    waterfallSteps.push({
      step: stepCounter++,
      description: `${preferredClass.name}: ${preferredClass.liquidationMultiple}x liquidation preference + cumulative dividends`,
      amountDistributed: actualPayout.toNumber(),
      remainingAfterStep: remainingValue.toNumber()
    });
  }
  
  // STEP N+1: Handle participation rights
  const participatingClasses = sortedPreferred.filter(cls => 
    cls.participationType !== ParticipationType.NON_PARTICIPATING
  );
  
  if (participatingClasses.length > 0 && remainingValue.gt(0)) {
    // Calculate total shares participating in remainder
    let totalParticipatingShares = new Decimal(0);
    
    // Add participating preferred (as converted)
    participatingClasses.forEach(cls => {
      totalParticipatingShares = totalParticipatingShares
        .plus(cls.shares * cls.conversionRatio);
    });
    
    // Add common shares
    commonClasses.forEach(cls => {
      totalParticipatingShares = totalParticipatingShares.plus(cls.shares);
    });
    
    // Distribute participation
    let participationDistributed = new Decimal(0);
    
    for (const preferredClass of participatingClasses) {
      if (remainingValue.lte(0)) break;
      
      const participatingShares = new Decimal(preferredClass.shares)
        .times(preferredClass.conversionRatio);
      
      let participationShare = totalParticipatingShares.gt(0)
        ? remainingValue.times(participatingShares).dividedBy(totalParticipatingShares)
        : new Decimal(0);
      
      // Apply participation cap if exists
      if (preferredClass.participationType === ParticipationType.PARTICIPATING_CAPPED 
          && preferredClass.participationCap) {
        const maxParticipation = new Decimal(preferredClass.originalInvestment)
          .times(preferredClass.participationCap)
          .minus(distributionMap.get(preferredClass.id)!.liquidationPreference)
          .minus(distributionMap.get(preferredClass.id)!.cumulativeDividends);
        
        participationShare = Decimal.min(participationShare, Decimal.max(maxParticipation, new Decimal(0)));
      }
      
      const dist = distributionMap.get(preferredClass.id)!;
      dist.participation = participationShare;
      participationDistributed = participationDistributed.plus(participationShare);
    }
    
    remainingValue = remainingValue.minus(participationDistributed);
    
    waterfallSteps.push({
      step: stepCounter++,
      description: 'Participating preferred: Pro-rata distribution of remaining proceeds',
      amountDistributed: participationDistributed.toNumber(),
      remainingAfterStep: remainingValue.toNumber()
    });
  }
  
  // STEP FINAL: Distribute remainder to common (including converting preferred)
  if (remainingValue.gt(0)) {
    // Calculate total common shares (including preferred as-converted)
    let totalCommonShares = new Decimal(0);
    
    // Add actual common shares
    commonClasses.forEach(cls => {
      totalCommonShares = totalCommonShares.plus(cls.shares);
    });
    
    // Add preferred shares that would convert to common
    sortedPreferred.forEach(cls => {
      // Check if converting to common is better than preferred payout
      const preferredPayout = distributionMap.get(cls.id)!.liquidationPreference
        .plus(distributionMap.get(cls.id)!.cumulativeDividends)
        .plus(distributionMap.get(cls.id)!.participation);
      
      const asConvertedShares = new Decimal(cls.shares).times(cls.conversionRatio);
      const potentialCommonPayout = totalCommonShares.gt(0)
        ? remainingValue.times(asConvertedShares).dividedBy(totalCommonShares.plus(asConvertedShares))
        : new Decimal(0);
      
      // If common conversion yields more value, include in common pool
      if (potentialCommonPayout.gt(preferredPayout)) {
        totalCommonShares = totalCommonShares.plus(asConvertedShares);
      }
    });
    
    // Distribute to common shares
    const commonDistributionTotal = remainingValue;
    
    // Distribute to actual common classes
    commonClasses.forEach(cls => {
      if (totalCommonShares.gt(0)) {
        const commonShare = commonDistributionTotal
          .times(cls.shares)
          .dividedBy(totalCommonShares);
        
        const dist = distributionMap.get(cls.id)!;
        dist.commonDistribution = commonShare;
      }
    });
    
    // Distribute to converting preferred
    sortedPreferred.forEach(cls => {
      const preferredPayout = distributionMap.get(cls.id)!.liquidationPreference
        .plus(distributionMap.get(cls.id)!.cumulativeDividends)
        .plus(distributionMap.get(cls.id)!.participation);
      
      const asConvertedShares = new Decimal(cls.shares).times(cls.conversionRatio);
      const potentialCommonPayout = totalCommonShares.gt(0)
        ? commonDistributionTotal.times(asConvertedShares).dividedBy(totalCommonShares)
        : new Decimal(0);
      
      // If conversion is better, clear preferred payouts and use common
      if (potentialCommonPayout.gt(preferredPayout)) {
        const dist = distributionMap.get(cls.id)!;
        dist.liquidationPreference = new Decimal(0);
        dist.cumulativeDividends = new Decimal(0);
        dist.participation = new Decimal(0);
        dist.commonDistribution = potentialCommonPayout;
      }
    });
    
    remainingValue = new Decimal(0);
    
    waterfallSteps.push({
      step: stepCounter++,
      description: 'Common distribution: Remaining proceeds to common shareholders (including converting preferred)',
      amountDistributed: commonDistributionTotal.toNumber(),
      remainingAfterStep: 0
    });
  }
  
  // Create final distribution results
  const allClasses = [...preferredClasses, ...commonClasses];
  
  for (const cls of allClasses) {
    const dist = distributionMap.get(cls.id)!;
    const totalDistribution = dist.liquidationPreference
      .plus(dist.cumulativeDividends)
      .plus(dist.participation)
      .plus(dist.commonDistribution);
    
    const isPreferred = 'liquidationMultiple' in cls;
    
    // Calculate preferred vs common analysis
    let preferredVsCommon;
    if (isPreferred) {
      const preferredCls = cls as IPreferredShareClass;
      const asPreferredValue = dist.liquidationPreference
        .plus(dist.cumulativeDividends)
        .plus(dist.participation);
      
      const totalCommonShares = commonClasses.reduce((sum, c) => sum + c.shares, 0) +
        preferredClasses.reduce((sum, p) => sum + (p.shares * p.conversionRatio), 0);
      
      const asCommonValue = totalCommonShares > 0 
        ? new Decimal(liquidationEvent.exitValue)
            .times(preferredCls.shares * preferredCls.conversionRatio)
            .dividedBy(totalCommonShares)
        : new Decimal(0);
      
      preferredVsCommon = {
        asPreferred: asPreferredValue.toNumber(),
        asCommon: asCommonValue.toNumber(),
        optimalChoice: asPreferredValue.gte(asCommonValue) ? 'PREFERRED' as const : 'COMMON' as const,
        additionalValue: asPreferredValue.minus(asCommonValue).abs().toNumber()
      };
    } else {
      preferredVsCommon = {
        asPreferred: 0,
        asCommon: totalDistribution.toNumber(),
        optimalChoice: 'COMMON' as const,
        additionalValue: 0
      };
    }
    
    const shares = isPreferred ? (cls as IPreferredShareClass).shares : (cls as ICommonShareClass).shares;
    const effectivePerShare = shares > 0 ? totalDistribution.dividedBy(shares) : new Decimal(0);
    const ownershipPercentage = liquidationEvent.exitValue > 0 
      ? totalDistribution.dividedBy(liquidationEvent.exitValue).times(100)
      : new Decimal(0);
    
    distributions.push({
      classId: cls.id,
      className: cls.name,
      classType: isPreferred ? 'PREFERRED' : 'COMMON',
      shares,
      liquidationPreference: dist.liquidationPreference.toNumber(),
      cumulativeDividends: dist.cumulativeDividends.toNumber(),
      participation: dist.participation.toNumber(),
      commonDistribution: dist.commonDistribution.toNumber(),
      totalDistribution: totalDistribution.toNumber(),
      effectivePerShare: effectivePerShare.toNumber(),
      ownershipPercentage: ownershipPercentage.toNumber(),
      preferredVsCommon
    });
  }
  
  // Calculate summary
  const totalDistributed = distributions.reduce((sum, d) => sum + d.totalDistribution, 0);
  const totalLiquidationPreferences = distributions.reduce((sum, d) => sum + d.liquidationPreference, 0);
  const totalCumulativeDividends = distributions.reduce((sum, d) => sum + d.cumulativeDividends, 0);
  const totalParticipation = distributions.reduce((sum, d) => sum + d.participation, 0);
  const totalCommonDistribution = distributions.reduce((sum, d) => sum + d.commonDistribution, 0);
  
  return {
    liquidationEvent,
    distributions: distributions.sort((a, b) => b.totalDistribution - a.totalDistribution),
    summary: {
      totalDistributed,
      totalLiquidationPreferences,
      totalCumulativeDividends,
      totalParticipation,
      totalCommonDistribution,
      undistributedAmount: liquidationEvent.exitValue - totalDistributed,
      waterfallSteps
    }
  };
}

/**
 * Analyze optimal liquidation preference structures
 * 
 * Compares different preference multiples and participation rights
 * to help optimize term sheet negotiations.
 * 
 * @param basePreferred - Base preferred terms to analyze
 * @param commonClasses - Common share classes
 * @param exitScenarios - Different exit value scenarios to test
 * @returns Analysis of different preference structures
 */
export function analyzeLiquidationPreferenceStructures(
  basePreferred: IPreferredShareClass[],
  commonClasses: ICommonShareClass[],
  exitScenarios: number[]
): Array<{
  exitValue: number;
  structures: Array<{
    name: string;
    description: string;
    preferredClasses: IPreferredShareClass[];
    analysis: ILiquidationAnalysis;
    preferredTotalReturn: number;
    preferredROI: number;
  }>;
}> {
  return exitScenarios.map(exitValue => {
    const liquidationEvent: ILiquidationEvent = {
      exitValue,
      eventDate: new Date().toISOString(),
      eventType: 'ACQUISITION'
    };
    
    const structures = [
      // Non-participating with 1x preference
      {
        name: 'Non-Participating 1x',
        description: '1x liquidation preference, non-participating',
        preferredClasses: basePreferred.map(cls => ({
          ...cls,
          liquidationMultiple: 1,
          participationType: ParticipationType.NON_PARTICIPATING
        }))
      },
      
      // Participating with 1x preference
      {
        name: 'Participating 1x',
        description: '1x liquidation preference, participating',
        preferredClasses: basePreferred.map(cls => ({
          ...cls,
          liquidationMultiple: 1,
          participationType: ParticipationType.PARTICIPATING
        }))
      },
      
      // Participating with 2x cap
      {
        name: 'Participating 1x (2x Cap)',
        description: '1x liquidation preference, participating capped at 2x',
        preferredClasses: basePreferred.map(cls => ({
          ...cls,
          liquidationMultiple: 1,
          participationType: ParticipationType.PARTICIPATING_CAPPED,
          participationCap: 2
        }))
      },
      
      // Non-participating with 2x preference
      {
        name: 'Non-Participating 2x',
        description: '2x liquidation preference, non-participating',
        preferredClasses: basePreferred.map(cls => ({
          ...cls,
          liquidationMultiple: 2,
          participationType: ParticipationType.NON_PARTICIPATING
        }))
      }
    ];
    
    return {
      exitValue,
      structures: structures.map(structure => {
        const analysis = calculateLiquidationStacking(
          structure.preferredClasses,
          commonClasses,
          liquidationEvent
        );
        
        const preferredTotalReturn = analysis.distributions
          .filter(d => d.classType === 'PREFERRED')
          .reduce((sum, d) => sum + d.totalDistribution, 0);
        
        const totalInvestment = structure.preferredClasses
          .reduce((sum, cls) => sum + cls.originalInvestment, 0);
        
        const preferredROI = totalInvestment > 0 
          ? (preferredTotalReturn / totalInvestment) - 1
          : 0;
        
        return {
          ...structure,
          analysis,
          preferredTotalReturn,
          preferredROI
        };
      })
    };
  });
}

/**
 * Calculate liquidation preference coverage analysis
 * 
 * Determines the minimum exit value needed to cover different preference layers
 * 
 * @param preferredClasses - Preferred share classes
 * @param eventDate - Date for cumulative dividend calculations
 * @returns Coverage analysis
 */
export function calculateLiquidationCoverage(
  preferredClasses: IPreferredShareClass[],
  eventDate: string = new Date().toISOString()
): Array<{
  seriesName: string;
  seniorityRank: number;
  liquidationPreference: number;
  cumulativeDividends: number;
  totalClaim: number;
  cumulativeCoverage: number; // Exit value needed to cover this and all senior claims
}> {
  const sortedPreferred = [...preferredClasses].sort((a, b) => a.seniorityRank - b.seniorityRank);
  let cumulativeCoverage = 0;
  
  return sortedPreferred.map(cls => {
    const liquidationPreference = cls.originalInvestment * cls.liquidationMultiple;
    const cumulativeDividends = calculateCumulativeDividends(cls, eventDate);
    const totalClaim = liquidationPreference + cumulativeDividends;
    
    cumulativeCoverage += totalClaim;
    
    return {
      seriesName: cls.name,
      seniorityRank: cls.seniorityRank,
      liquidationPreference,
      cumulativeDividends,
      totalClaim,
      cumulativeCoverage
    };
  });
}

/**
 * Validates liquidation stacking calculation inputs
 */
function validateLiquidationInputs(
  preferredClasses: IPreferredShareClass[],
  commonClasses: ICommonShareClass[],
  liquidationEvent: ILiquidationEvent
): void {
  try {
    // Validate liquidation event
    financialRules.positiveAmount(liquidationEvent.exitValue, 'liquidationEvent.exitValue');
    financialRules.nonEmptyString(liquidationEvent.eventDate, 'liquidationEvent.eventDate');
    
    // Validate preferred classes
    preferredClasses.forEach((cls, index) => {
      financialRules.nonEmptyString(cls.id, `preferredClasses[${index}].id`);
      financialRules.nonEmptyString(cls.name, `preferredClasses[${index}].name`);
      financialRules.validShareCount(cls.shares, `preferredClasses[${index}].shares`);
      financialRules.positiveAmount(cls.originalInvestment, `preferredClasses[${index}].originalInvestment`);
      financialRules.positiveAmount(cls.liquidationMultiple, `preferredClasses[${index}].liquidationMultiple`);
      financialRules.positiveAmount(cls.conversionRatio, `preferredClasses[${index}].conversionRatio`);
      
      if (cls.dividendRate !== undefined) {
        if (cls.dividendRate < 0 || cls.dividendRate > 50) {
          throw new ValidationError(
            'Dividend rate must be between 0% and 50%',
            `preferredClasses[${index}].dividendRate`
          );
        }
      }
      
      if (cls.participationCap !== undefined) {
        financialRules.positiveAmount(cls.participationCap, `preferredClasses[${index}].participationCap`);
      }
    });
    
    // Validate common classes
    commonClasses.forEach((cls, index) => {
      financialRules.nonEmptyString(cls.id, `commonClasses[${index}].id`);
      financialRules.nonEmptyString(cls.name, `commonClasses[${index}].name`);
      financialRules.validShareCount(cls.shares, `commonClasses[${index}].shares`);
    });
    
    // Business logic validations
    const seniorityRanks = preferredClasses.map(cls => cls.seniorityRank);
    const uniqueRanks = new Set(seniorityRanks);
    if (seniorityRanks.length !== uniqueRanks.size) {
      throw new ValidationError(
        'Seniority ranks must be unique across all preferred classes',
        'preferredClasses.seniorityRank'
      );
    }
    
  } catch (error) {
    console.error('Liquidation stacking validation failed:', error);
    throw error;
  }
}

/**
 * Calculate break-even analysis for different preference structures
 * 
 * Finds exit values where different liquidation structures yield equivalent returns
 * 
 * @param preferredClass - Preferred class to analyze
 * @param commonShares - Total common shares for comparison
 * @param maxExitValue - Maximum exit value to analyze
 * @param steps - Number of analysis steps
 * @returns Break-even points and analysis
 */
export function calculatePreferenceBreakeven(
  preferredClass: IPreferredShareClass,
  commonShares: number,
  maxExitValue: number,
  steps: number = 1000
): Array<{
  exitValue: number;
  asPreferredValue: number;
  asCommonValue: number;
  optimalChoice: 'PREFERRED' | 'COMMON';
  valueDifference: number;
}> {
  const stepSize = maxExitValue / steps;
  const results = [];
  
  for (let i = 1; i <= steps; i++) {
    const exitValue = i * stepSize;
    
    // Calculate value as preferred
    const liquidationPreference = preferredClass.originalInvestment * preferredClass.liquidationMultiple;
    const cumulativeDividends = calculateCumulativeDividends(preferredClass, new Date().toISOString());
    
    let asPreferredValue = liquidationPreference + cumulativeDividends;
    
    // Add participation if applicable
    if (preferredClass.participationType !== ParticipationType.NON_PARTICIPATING) {
      const remainingAfterPreferences = Math.max(0, exitValue - liquidationPreference - cumulativeDividends);
      const totalParticipatingShares = commonShares + (preferredClass.shares * preferredClass.conversionRatio);
      
      let participation = totalParticipatingShares > 0 
        ? (remainingAfterPreferences * (preferredClass.shares * preferredClass.conversionRatio)) / totalParticipatingShares
        : 0;
      
      // Apply cap if participating capped
      if (preferredClass.participationType === ParticipationType.PARTICIPATING_CAPPED 
          && preferredClass.participationCap) {
        const maxParticipation = (preferredClass.originalInvestment * preferredClass.participationCap) - asPreferredValue;
        participation = Math.min(participation, Math.max(0, maxParticipation));
      }
      
      asPreferredValue += participation;
    }
    
    // Calculate value as common
    const totalCommonShares = commonShares + (preferredClass.shares * preferredClass.conversionRatio);
    const asCommonValue = totalCommonShares > 0 
      ? (exitValue * (preferredClass.shares * preferredClass.conversionRatio)) / totalCommonShares
      : 0;
    
    const optimalChoice = asPreferredValue >= asCommonValue ? 'PREFERRED' as const : 'COMMON' as const;
    const valueDifference = Math.abs(asPreferredValue - asCommonValue);
    
    results.push({
      exitValue,
      asPreferredValue,
      asCommonValue,
      optimalChoice,
      valueDifference
    });
  }
  
  return results;
}