import Decimal from 'decimal.js';
import { ISAFEInput, ISAFEOutput } from '@/types';

// Configure Decimal for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Converts a post-money SAFE to shares
 * Following PRD §6.4 formulas
 */
export function convertPostMoneySAFE(input: ISAFEInput): ISAFEOutput {
  const { investment, cap, discount, roundPps, postMoneyCapBasis } = input;
  
  const inv = new Decimal(investment);
  const rPps = new Decimal(roundPps);
  
  let conversionPrice: Decimal;
  
  // Calculate discount price if applicable
  const discountPrice = discount 
    ? rPps.mul(new Decimal(1).minus(new Decimal(discount)))
    : rPps;
  
  // Calculate cap price if applicable
  const capPrice = cap 
    ? new Decimal(cap).div(new Decimal(postMoneyCapBasis))
    : new Decimal(Infinity);
  
  // Conversion price is the minimum of discount price and cap price
  conversionPrice = Decimal.min(discountPrice, capPrice);
  
  // Shares = Investment / ConversionPrice
  const shares = inv.div(conversionPrice);
  
  return {
    shares: Math.round(shares.toNumber()),
    price: conversionPrice.toFixed(6),
  };
}

/**
 * Converts a pre-money SAFE to shares
 */
export function convertPreMoneySAFE(input: ISAFEInput): ISAFEOutput {
  // Similar to post-money but cap basis excludes SAFE money
  // For pre-money SAFE, the cap PPS calculation is different
  const { investment, cap, discount, roundPps } = input;
  
  const inv = new Decimal(investment);
  const rPps = new Decimal(roundPps);
  
  let conversionPrice: Decimal;
  
  // Calculate discount price if applicable
  const discountPrice = discount 
    ? rPps.mul(new Decimal(1).minus(new Decimal(discount)))
    : rPps;
  
  // For pre-money SAFE, cap price uses pre-money valuation
  // This requires different calculation based on the specific SAFE terms
  const capPrice = cap 
    ? new Decimal(cap).div(input.postMoneyCapBasis) // Simplified for MVP
    : new Decimal(Infinity);
  
  // Conversion price is the minimum
  conversionPrice = Decimal.min(discountPrice, capPrice);
  
  // Shares = Investment / ConversionPrice
  const shares = inv.div(conversionPrice);
  
  return {
    shares: Math.round(shares.toNumber()),
    price: conversionPrice.toFixed(6),
  };
}

/**
 * Apply MFN (Most Favored Nation) clause
 */
export function applyMFN(
  originalTerms: ISAFEInput,
  betterTerms: Partial<ISAFEInput>
): ISAFEInput {
  const updatedTerms = { ...originalTerms };
  
  // Apply better cap if lower
  if (betterTerms.cap && (!originalTerms.cap || Number(betterTerms.cap) < Number(originalTerms.cap))) {
    updatedTerms.cap = betterTerms.cap;
  }
  
  // Apply better discount if higher
  if (betterTerms.discount && (!originalTerms.discount || betterTerms.discount > originalTerms.discount)) {
    updatedTerms.discount = betterTerms.discount;
  }
  
  return updatedTerms;
}

/**
 * Calculate effective ownership from SAFE
 */
export function calculateSAFEOwnership(
  safeShares: number,
  existingShares: number,
  roundInvestorShares: number
): number {
  const totalShares = existingShares + safeShares + roundInvestorShares;
  return totalShares > 0 ? safeShares / totalShares : 0;
}