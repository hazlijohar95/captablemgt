import { describe, it, expect } from 'vitest';
import { solvePricedRound, validateRoundInput } from './round';
import roundGoldenData from '@/testdata/golden/round.solver.gold.json';

describe('Round Calculator', () => {
  describe('solvePricedRound', () => {
    it('should match golden test data from PRD', () => {
      const { input, expectedOutput, tolerance } = roundGoldenData;
      const result = solvePricedRound(input);
      
      // Check pool top-up
      expect(Math.abs(result.poolTopUp - expectedOutput.poolTopUp))
        .toBeLessThan(tolerance.poolTopUp);
      
      // Check PPS
      expect(Math.abs(Number(result.pps) - Number(expectedOutput.pps)))
        .toBeLessThan(tolerance.pps);
      
      // Check investor shares
      expect(Math.abs(result.investorShares - expectedOutput.investorShares))
        .toBeLessThan(tolerance.investorShares);
    });
    
    it('should handle edge case with 0% pool', () => {
      const input = {
        preMoney: "10000000",
        investment: "2000000",
        targetPostPoolPct: 0,
        s0FdShares: 1000000,
      };
      
      const result = solvePricedRound(input);
      expect(result.poolTopUp).toBe(0);
      expect(Number(result.pps)).toBeGreaterThan(0);
      expect(result.investorShares).toBeGreaterThan(0);
    });
    
    it('should handle small investment amounts', () => {
      const input = {
        preMoney: "1000000",
        investment: "100",
        targetPostPoolPct: 0.1,
        s0FdShares: 100000,
      };
      
      const result = solvePricedRound(input);
      expect(result.poolTopUp).toBeGreaterThanOrEqual(0);
      expect(Number(result.pps)).toBeGreaterThan(0);
      expect(result.investorShares).toBeGreaterThan(0);
    });
  });
  
  describe('validateRoundInput', () => {
    it('should validate valid input', () => {
      const input = {
        preMoney: "20000000",
        investment: "5000000",
        targetPostPoolPct: 0.10,
        s0FdShares: 10000000,
      };
      
      const errors = validateRoundInput(input);
      expect(errors).toHaveLength(0);
    });
    
    it('should catch negative pre-money', () => {
      const input = {
        preMoney: "-1000000",
        investment: "5000000",
        targetPostPoolPct: 0.10,
        s0FdShares: 10000000,
      };
      
      const errors = validateRoundInput(input);
      expect(errors).toContain('Pre-money valuation must be positive');
    });
    
    it('should catch invalid pool percentage', () => {
      const input = {
        preMoney: "20000000",
        investment: "5000000",
        targetPostPoolPct: 1.5,
        s0FdShares: 10000000,
      };
      
      const errors = validateRoundInput(input);
      expect(errors).toContain('Target post-pool percentage must be between 0 and 1');
    });
  });
});