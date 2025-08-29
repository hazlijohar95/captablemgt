import Decimal from 'decimal.js';
import { 
  ValidationError, 
  financialRules, 
  validationUtils, 
  capTableValidation 
} from '@/utils/validation';

/**
 * Dilution and scenario modeling calculations
 * All monetary values in cents (integers) to avoid floating-point errors
 */

export interface ShareholderPosition {
  id: string;
  name: string;
  shares: number;
  shareClass: 'COMMON' | 'PREFERRED';
  pricePerShare?: number; // in cents
}

export interface RoundScenario {
  name: string;
  preMoney: number; // valuation in cents
  investmentAmount: number; // in cents
  pricePerShare: number; // in cents
  shareClass: 'COMMON' | 'PREFERRED';
  optionPoolIncrease?: number; // percentage points (e.g., 10 for 10%)
  includeConversion?: boolean; // convert preferred to common
}

export interface DilutionResult {
  preRound: {
    totalShares: number;
    shareholderPositions: Array<{
      id: string;
      name: string;
      shares: number;
      percentage: number;
    }>;
  };
  postRound: {
    totalShares: number;
    newSharesIssued: number;
    postMoney: number;
    shareholderPositions: Array<{
      id: string;
      name: string;
      shares: number;
      percentage: number;
      dilution: number; // percentage points diluted
    }>;
  };
}

/**
 * Calculate dilution impact of a new funding round
 * @param currentPositions - Array of current shareholder positions
 * @param scenario - The funding round scenario to model
 * @returns Detailed dilution analysis results
 * @throws ValidationError if inputs are invalid
 */
export function calculateDilution(
  currentPositions: ShareholderPosition[],
  scenario: RoundScenario
): DilutionResult {
  // SECURITY: Comprehensive input validation
  try {
    financialRules.nonEmptyArray(currentPositions, 'current positions');
    capTableValidation.validateRoundScenario(scenario);
    
    // Validate each shareholder position
    currentPositions.forEach((position, index) => {
      try {
        capTableValidation.validateShareholderPosition(position);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(`Position ${index + 1}: ${error.message}`, `position[${index}].${error.field}`);
        }
        throw error;
      }
    });
    
    // Additional business logic validation
    const totalCurrentShares = currentPositions.reduce((sum, pos) => sum + pos.shares, 0);
    if (totalCurrentShares === 0) {
      throw new ValidationError('Total current shares cannot be zero', 'currentPositions');
    }
    
    // Validate price per share makes sense given pre-money and current shares
    financialRules.validPricePerShare(scenario.preMoney, totalCurrentShares, 'scenario price per share');
    
  } catch (error) {
    // Log validation error for monitoring
    console.error('Dilution calculation validation failed:', error);
    throw error;
  }
  const preMoney = new Decimal(scenario.preMoney);
  const investment = new Decimal(scenario.investmentAmount);
  const pricePerShare = new Decimal(scenario.pricePerShare);
  
  // Calculate pre-round totals
  let totalSharesPre = new Decimal(0);
  const preRoundPositions = currentPositions.map(pos => {
    totalSharesPre = totalSharesPre.plus(pos.shares);
    return { ...pos };
  });
  
  // Calculate new shares to be issued
  const newShares = investment.dividedBy(pricePerShare).floor();
  validationUtils.validateDecimalResult(newShares, 'new shares');
  
  // Calculate option pool increase if specified
  let optionPoolShares = new Decimal(0);
  if (scenario.optionPoolIncrease) {
    const targetPercentage = new Decimal(scenario.optionPoolIncrease).dividedBy(100);
    validationUtils.validateDecimalResult(targetPercentage, 'option pool percentage');
    
    const postMoneyShares = totalSharesPre.plus(newShares);
    validationUtils.validateDecimalResult(postMoneyShares, 'post-money shares');
    
    optionPoolShares = postMoneyShares.times(targetPercentage).floor();
    validationUtils.validateDecimalResult(optionPoolShares, 'option pool shares');
  }
  
  // Calculate post-round totals
  const totalSharesPost = totalSharesPre.plus(newShares).plus(optionPoolShares);
  validationUtils.validateDecimalResult(totalSharesPost, 'total post-round shares');
  
  const postMoney = preMoney.plus(investment);
  validationUtils.validateDecimalResult(postMoney, 'post-money valuation');
  
  // Calculate pre-round percentages
  const preRoundResult = preRoundPositions.map(pos => ({
    id: pos.id,
    name: pos.name,
    shares: pos.shares,
    percentage: totalSharesPre.gt(0) 
      ? new Decimal(pos.shares).dividedBy(totalSharesPre).times(100).toNumber()
      : 0
  }));
  
  // Calculate post-round positions
  const postRoundResult = preRoundPositions.map(pos => {
    const prePercentage = totalSharesPre.gt(0) 
      ? new Decimal(pos.shares).dividedBy(totalSharesPre).times(100)
      : new Decimal(0);
    
    const postPercentage = totalSharesPost.gt(0)
      ? new Decimal(pos.shares).dividedBy(totalSharesPost).times(100)
      : new Decimal(0);
    
    return {
      id: pos.id,
      name: pos.name,
      shares: pos.shares,
      percentage: postPercentage.toNumber(),
      dilution: prePercentage.minus(postPercentage).toNumber()
    };
  });
  
  // Add new investor position
  if (newShares.gt(0)) {
    const investorPercentage = newShares.dividedBy(totalSharesPost).times(100);
    postRoundResult.push({
      id: 'new-investor',
      name: `New Investor (${scenario.name})`,
      shares: newShares.toNumber(),
      percentage: investorPercentage.toNumber(),
      dilution: 0
    });
  }
  
  // Add option pool if increased
  if (optionPoolShares.gt(0)) {
    const poolPercentage = optionPoolShares.dividedBy(totalSharesPost).times(100);
    postRoundResult.push({
      id: 'option-pool',
      name: 'Option Pool (Unallocated)',
      shares: optionPoolShares.toNumber(),
      percentage: poolPercentage.toNumber(),
      dilution: 0
    });
  }
  
  return {
    preRound: {
      totalShares: totalSharesPre.toNumber(),
      shareholderPositions: preRoundResult
    },
    postRound: {
      totalShares: totalSharesPost.toNumber(),
      newSharesIssued: newShares.plus(optionPoolShares).toNumber(),
      postMoney: postMoney.toNumber(),
      shareholderPositions: postRoundResult
    }
  };
}

/**
 * Calculate multiple round scenarios sequentially
 */
export function calculateMultipleRounds(
  initialPositions: ShareholderPosition[],
  scenarios: RoundScenario[]
): DilutionResult[] {
  const results: DilutionResult[] = [];
  let currentPositions = [...initialPositions];
  
  for (const scenario of scenarios) {
    const result = calculateDilution(currentPositions, scenario);
    results.push(result);
    
    // Update positions for next round
    currentPositions = result.postRound.shareholderPositions.map(pos => ({
      id: pos.id,
      name: pos.name,
      shares: pos.shares,
      shareClass: 'COMMON' as const // Simplification for now
    }));
  }
  
  return results;
}

/**
 * Calculate ownership at different exit valuations
 */
export function calculateExitScenarios(
  positions: ShareholderPosition[],
  exitValuations: number[] // in cents
): Array<{
  valuation: number;
  positions: Array<{
    id: string;
    name: string;
    shares: number;
    percentage: number;
    value: number; // in cents
  }>;
}> {
  const totalShares = positions.reduce((sum, pos) => sum + pos.shares, 0);
  
  return exitValuations.map(valuation => {
    const pricePerShare = totalShares > 0 ? valuation / totalShares : 0;
    
    return {
      valuation,
      positions: positions.map(pos => ({
        id: pos.id,
        name: pos.name,
        shares: pos.shares,
        percentage: totalShares > 0 ? (pos.shares / totalShares) * 100 : 0,
        value: Math.floor(pos.shares * pricePerShare)
      }))
    };
  });
}