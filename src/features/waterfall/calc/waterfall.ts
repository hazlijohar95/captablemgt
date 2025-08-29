import Decimal from 'decimal.js';
import { 
  ValidationError, 
  financialRules
} from '@/utils/validation';

/**
 * Waterfall analysis for liquidity events (exit scenarios)
 * Handles liquidation preferences, participation rights, and conversion scenarios
 */

export interface SecurityHolder {
  id: string;
  name: string;
  securityType: 'COMMON' | 'PREFERRED_A' | 'PREFERRED_B' | 'PREFERRED_C' | 'OPTION' | 'WARRANT';
  shares: number;
  liquidationPreference?: number; // Multiple (e.g., 1x, 2x)
  liquidationAmount?: number; // Amount invested (in cents)
  participation?: 'NONE' | 'CAPPED' | 'FULL'; // Participation rights
  participationCap?: number; // Cap multiple if capped participation
  conversionRatio?: number; // Conversion ratio to common (default 1:1)
  strikePrice?: number; // For options/warrants (in cents)
  seniority?: number; // Higher number = more senior (paid first)
}

export interface WaterfallResult {
  exitValue: number; // Total exit value in cents
  distributions: Array<{
    holderId: string;
    holderName: string;
    securityType: string;
    shares: number;
    liquidationPref: number; // Amount from liquidation preference
    participation: number; // Amount from participation
    common: number; // Amount from common distribution
    total: number; // Total payout
    percentage: number; // Percentage of exit value
    impliedSharePrice: number; // Implied price per share
  }>;
  summary: {
    totalDistributed: number;
    totalLiquidationPreference: number;
    totalParticipation: number;
    totalCommon: number;
    remainingShares: number;
  };
}

/**
 * Validate security holder data for waterfall calculations
 */
function validateSecurityHolder(holder: any, index: number): void {
  try {
    financialRules.nonEmptyString(holder.id, 'holder ID');
    financialRules.nonEmptyString(holder.name, 'holder name');
    financialRules.validShareCount(holder.shares, 'shares');
    
    const validSecurityTypes = ['COMMON', 'PREFERRED_A', 'PREFERRED_B', 'PREFERRED_C', 'OPTION', 'WARRANT'];
    if (!validSecurityTypes.includes(holder.securityType)) {
      throw new ValidationError(`securityType must be one of: ${validSecurityTypes.join(', ')}`, 'securityType');
    }
    
    if (holder.liquidationPreference !== undefined) {
      financialRules.positiveAmount(holder.liquidationPreference, 'liquidation preference');
    }
    
    if (holder.liquidationAmount !== undefined) {
      financialRules.nonNegativeAmount(holder.liquidationAmount, 'liquidation amount');
    }
    
    if (holder.participation && !['NONE', 'CAPPED', 'FULL'].includes(holder.participation)) {
      throw new ValidationError('participation must be NONE, CAPPED, or FULL', 'participation');
    }
    
    if (holder.participationCap !== undefined) {
      financialRules.positiveAmount(holder.participationCap, 'participation cap');
    }
    
    if (holder.strikePrice !== undefined) {
      financialRules.nonNegativeAmount(holder.strikePrice, 'strike price');
    }
    
    if (holder.seniority !== undefined) {
      financialRules.nonNegativeAmount(holder.seniority, 'seniority');
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError(`Holder ${index + 1}: ${error.message}`, `holder[${index}].${error.field}`);
    }
    throw error;
  }
}

/**
 * Calculate waterfall distribution for a liquidity event
 * @param holders - Array of security holders
 * @param exitValue - Total exit value in cents
 * @param convertToCommon - Whether to assume preferred converts to common
 * @returns Detailed waterfall distribution analysis
 * @throws ValidationError if inputs are invalid
 */
export function calculateWaterfall(
  holders: SecurityHolder[],
  exitValue: number,
  convertToCommon: boolean = false
): WaterfallResult {
  // SECURITY: Comprehensive input validation
  try {
    financialRules.nonEmptyArray(holders, 'security holders');
    financialRules.positiveAmount(exitValue, 'exit value');
    
    // Validate each security holder
    holders.forEach((holder, index) => {
      validateSecurityHolder(holder, index);
    });
    
    // Business logic validation
    const totalShares = holders.reduce((sum, holder) => sum + holder.shares, 0);
    if (totalShares === 0) {
      throw new ValidationError('Total shares cannot be zero', 'holders');
    }
    
  } catch (error) {
    console.error('Waterfall calculation validation failed:', error);
    throw error;
  }
  const exit = new Decimal(exitValue);
  let remainingValue = new Decimal(exitValue);
  const distributions = new Map<string, {
    holderId: string;
    holderName: string;
    securityType: string;
    shares: number;
    liquidationPref: Decimal;
    participation: Decimal;
    common: Decimal;
  }>();

  // Initialize distributions
  holders.forEach(holder => {
    distributions.set(holder.id, {
      holderId: holder.id,
      holderName: holder.name,
      securityType: holder.securityType,
      shares: holder.shares,
      liquidationPref: new Decimal(0),
      participation: new Decimal(0),
      common: new Decimal(0)
    });
  });

  // Sort holders by seniority (higher number = more senior)
  const sortedHolders = [...holders].sort((a, b) => 
    (b.seniority || 0) - (a.seniority || 0)
  );

  // Step 1: Pay liquidation preferences (if not converting to common)
  if (!convertToCommon) {
    for (const holder of sortedHolders) {
      if (holder.liquidationPreference && holder.liquidationAmount) {
        const prefAmount = new Decimal(holder.liquidationAmount)
          .times(holder.liquidationPreference);
        
        const payout = Decimal.min(prefAmount, remainingValue);
        const dist = distributions.get(holder.id)!;
        dist.liquidationPref = payout;
        remainingValue = remainingValue.minus(payout);
        
        if (remainingValue.lte(0)) break;
      }
    }

    // Step 2: Handle participation rights
    const participatingHolders = sortedHolders.filter(h => 
      h.participation && h.participation !== 'NONE' && 
      h.liquidationPreference && h.liquidationAmount
    );

    if (participatingHolders.length > 0 && remainingValue.gt(0)) {
      // Calculate participating shares (convert preferred to common equivalent)
      let totalParticipatingShares = new Decimal(0);
      participatingHolders.forEach(holder => {
        const conversionRatio = holder.conversionRatio || 1;
        totalParticipatingShares = totalParticipatingShares
          .plus(holder.shares * conversionRatio);
      });

      // Add common shares to participating pool
      const commonHolders = holders.filter(h => 
        h.securityType === 'COMMON' || 
        (h.securityType === 'OPTION' && h.strikePrice === 0)
      );
      
      commonHolders.forEach(holder => {
        totalParticipatingShares = totalParticipatingShares.plus(holder.shares);
      });

      // Distribute participation
      for (const holder of participatingHolders) {
        const conversionRatio = holder.conversionRatio || 1;
        const participatingShares = holder.shares * conversionRatio;
        const shareOfRemaining = totalParticipatingShares.gt(0)
          ? remainingValue.times(participatingShares).dividedBy(totalParticipatingShares)
          : new Decimal(0);

        // Apply participation cap if exists
        let payout = shareOfRemaining;
        if (holder.participation === 'CAPPED' && holder.participationCap) {
          const maxPayout = new Decimal(holder.liquidationAmount || 0)
            .times(holder.participationCap)
            .minus(distributions.get(holder.id)!.liquidationPref);
          payout = Decimal.min(payout, maxPayout);
        }

        const dist = distributions.get(holder.id)!;
        dist.participation = payout;
        remainingValue = remainingValue.minus(payout);
      }
    }
  }

  // Step 3: Distribute remaining to common (or all if converting)
  if (remainingValue.gt(0) || convertToCommon) {
    const valueToDistribute = convertToCommon ? exit : remainingValue;
    
    // Calculate total common shares (including converted preferred)
    let totalCommonShares = new Decimal(0);
    
    holders.forEach(holder => {
      if (holder.securityType === 'COMMON') {
        totalCommonShares = totalCommonShares.plus(holder.shares);
      } else if (convertToCommon || 
                 (holder.participation === 'NONE' && !holder.liquidationPreference)) {
        // Convert to common if converting all or if no liquidation preference
        const conversionRatio = holder.conversionRatio || 1;
        totalCommonShares = totalCommonShares.plus(holder.shares * conversionRatio);
      } else if (holder.securityType === 'OPTION' || holder.securityType === 'WARRANT') {
        // Include in-the-money options/warrants
        const impliedPrice = exitValue / totalCommonShares.toNumber();
        if (!holder.strikePrice || holder.strikePrice < impliedPrice) {
          totalCommonShares = totalCommonShares.plus(holder.shares);
        }
      }
    });

    // Distribute to common
    holders.forEach(holder => {
      let commonShares = 0;
      
      if (holder.securityType === 'COMMON') {
        commonShares = holder.shares;
      } else if (convertToCommon) {
        const conversionRatio = holder.conversionRatio || 1;
        commonShares = holder.shares * conversionRatio;
      } else if (holder.participation === 'NONE' && !holder.liquidationPreference) {
        const conversionRatio = holder.conversionRatio || 1;
        commonShares = holder.shares * conversionRatio;
      }

      if (commonShares > 0 && totalCommonShares.gt(0)) {
        const commonPayout = valueToDistribute
          .times(commonShares)
          .dividedBy(totalCommonShares);
        
        const dist = distributions.get(holder.id)!;
        dist.common = commonPayout;
      }
    });
  }

  // Calculate totals and format results
  let totalLiquidationPref = new Decimal(0);
  let totalParticipation = new Decimal(0);
  let totalCommon = new Decimal(0);
  
  const formattedDistributions = Array.from(distributions.values()).map(dist => {
    const total = dist.liquidationPref
      .plus(dist.participation)
      .plus(dist.common);
    
    totalLiquidationPref = totalLiquidationPref.plus(dist.liquidationPref);
    totalParticipation = totalParticipation.plus(dist.participation);
    totalCommon = totalCommon.plus(dist.common);
    
    return {
      holderId: dist.holderId,
      holderName: dist.holderName,
      securityType: dist.securityType,
      shares: dist.shares,
      liquidationPref: dist.liquidationPref.toNumber(),
      participation: dist.participation.toNumber(),
      common: dist.common.toNumber(),
      total: total.toNumber(),
      percentage: exit.gt(0) ? total.dividedBy(exit).times(100).toNumber() : 0,
      impliedSharePrice: dist.shares > 0 ? total.dividedBy(dist.shares).toNumber() : 0
    };
  });

  // Sort by total payout (descending)
  formattedDistributions.sort((a, b) => b.total - a.total);

  return {
    exitValue,
    distributions: formattedDistributions,
    summary: {
      totalDistributed: totalLiquidationPref.plus(totalParticipation).plus(totalCommon).toNumber(),
      totalLiquidationPreference: totalLiquidationPref.toNumber(),
      totalParticipation: totalParticipation.toNumber(),
      totalCommon: totalCommon.toNumber(),
      remainingShares: holders.reduce((sum, h) => sum + h.shares, 0)
    }
  };
}

/**
 * Calculate waterfall at multiple exit values
 */
export function calculateWaterfallScenarios(
  holders: SecurityHolder[],
  exitValues: number[],
  convertToCommon: boolean = false
): WaterfallResult[] {
  return exitValues.map(exitValue => 
    calculateWaterfall(holders, exitValue, convertToCommon)
  );
}

/**
 * Find break-even points where different holders' returns change
 */
export function findBreakPoints(
  holders: SecurityHolder[],
  maxValue: number,
  steps: number = 100
): number[] {
  const breakPoints: Set<number> = new Set();
  
  // Add liquidation preference amounts as potential break points
  holders.forEach(holder => {
    if (holder.liquidationAmount && holder.liquidationPreference) {
      breakPoints.add(holder.liquidationAmount * holder.liquidationPreference);
    }
  });
  
  // Test various exit values to find where rankings change
  const stepSize = maxValue / steps;
  let previousRanking: string[] = [];
  
  for (let i = 1; i <= steps; i++) {
    const exitValue = i * stepSize;
    const result = calculateWaterfall(holders, exitValue, false);
    
    const currentRanking = result.distributions
      .filter(d => d.total > 0)
      .map(d => d.holderId);
    
    if (JSON.stringify(currentRanking) !== JSON.stringify(previousRanking)) {
      breakPoints.add(exitValue);
      previousRanking = currentRanking;
    }
  }
  
  return Array.from(breakPoints).sort((a, b) => a - b);
}