import Decimal from 'decimal.js';
import { IRoundInput, IRoundOutput, Money } from '@/types';

// Configure Decimal for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Solves for pool top-up, PPS, and investor shares in a priced round
 * Following PRD §6.3 formulas exactly
 */
export function solvePricedRound(input: IRoundInput): IRoundOutput {
  const { preMoney, investment, targetPostPoolPct, s0FdShares } = input;
  
  // Convert money to Decimal for precision
  const pre = new Decimal(preMoney);
  const inv = new Decimal(investment);
  const x = new Decimal(targetPostPoolPct);
  const s0 = new Decimal(s0FdShares);
  
  // Alternative approach: solve directly for the post-money constraint
  // We want: poolShares / totalPostShares = x
  // Where totalPostShares = s0 + poolShares + investorShares
  // And investorShares = investment / pps
  // And pps = preMoney / (s0 + poolShares)
  
  // This gives us: P / (S0 + P + I*(S0+P)/Pre) = x
  // Simplifying: P*Pre / ((S0+P)*(Pre + I)) = x
  // P*Pre = x * (S0+P) * (Pre + I)
  // P*Pre = x * S0 * (Pre + I) + x * P * (Pre + I)
  // P*Pre - x*P*(Pre + I) = x * S0 * (Pre + I)
  // P * (Pre - x*(Pre + I)) = x * S0 * (Pre + I)
  // P = x * S0 * (Pre + I) / (Pre - x*(Pre + I))
  
  const postMoney = pre.plus(inv);
  const numerator = x.mul(s0).mul(postMoney);
  const denominator = pre.minus(x.mul(postMoney));
  const poolTopUp = numerator.div(denominator);
  
  // PPS = Pre / (S0 + P)
  const pps = pre.div(s0.plus(poolTopUp));
  
  // Ish = I / PPS
  const investorShares = inv.div(pps);
  
  return {
    poolTopUp: poolTopUp.toNumber(),
    pps: pps.toFixed(6),
    investorShares: Math.round(investorShares.toNumber()),
  };
}

/**
 * Validates round inputs
 */
export function validateRoundInput(input: IRoundInput): string[] {
  const errors: string[] = [];
  
  if (Number(input.preMoney) <= 0) {
    errors.push('Pre-money valuation must be positive');
  }
  
  if (Number(input.investment) <= 0) {
    errors.push('Investment amount must be positive');
  }
  
  if (input.targetPostPoolPct < 0 || input.targetPostPoolPct > 1) {
    errors.push('Target post-pool percentage must be between 0 and 1');
  }
  
  if (input.s0FdShares <= 0) {
    errors.push('Fully diluted shares must be positive');
  }
  
  return errors;
}

/**
 * Calculates dilution for existing shareholders
 */
export function calculateDilution(
  preRoundShares: number,
  postRoundTotalShares: number
): number {
  if (postRoundTotalShares <= 0) return 0;
  
  const postOwnership = preRoundShares / postRoundTotalShares;
  const dilution = 1 - postOwnership;
  
  return dilution;
}

/**
 * Calculates post-money valuation
 */
export function calculatePostMoney(
  preMoney: Money,
  investment: Money
): Money {
  const pre = new Decimal(preMoney);
  const inv = new Decimal(investment);
  return pre.plus(inv).toFixed(2);
}

/**
 * Calculates ownership percentage
 */
export function calculateOwnership(
  shares: number,
  totalShares: number
): number {
  if (totalShares <= 0) return 0;
  return shares / totalShares;
}