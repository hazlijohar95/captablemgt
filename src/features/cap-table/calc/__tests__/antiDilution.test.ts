import { describe, it, expect } from '@jest/globals';
import {
  AntiDilutionType,
  IPreferredSeries,
  IDownRound,
  ICapTableSnapshot,
  calculateFullRatchet,
  calculateWeightedAverage,
  analyzeAntiDilution,
  analyzeMultipleRoundAntiDilution,
  optimizeAntiDilutionTerms,
  calculateLiquidationCoverage
} from '../antiDilution';

describe('Anti-Dilution Calculations', () => {
  const mockPreferredSeries: IPreferredSeries = {
    id: 'series-a',
    name: 'Series A Preferred',
    shares: 1000000,
    originalPrice: 100, // $1.00 in cents
    liquidationPreference: 1,
    antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
    participatingPreferred: false,
    conversionRatio: 1,
    seniorityRank: 1
  };

  const mockCapTable: ICapTableSnapshot = {
    commonShares: 8000000,
    totalPreferredShares: 1000000,
    optionsOutstanding: 500000,
    optionsAvailable: 500000,
    warrants: 0,
    fullyDilutedShares: 10000000
  };

  const mockDownRound: IDownRound = {
    name: 'Series B Down Round',
    newPrice: 50, // $0.50 in cents - 50% down from Series A
    sharesIssued: 2000000,
    investmentAmount: 10000000 // $100,000
  };

  describe('Full Ratchet Anti-Dilution', () => {
    it('should calculate full ratchet adjustment correctly', () => {
      const result = calculateFullRatchet(mockPreferredSeries, mockDownRound);
      
      expect(result.seriesId).toBe('series-a');
      expect(result.adjustmentFactor).toBe(2); // 100/50 = 2
      expect(result.adjustedConversionRatio).toBe(2); // 1 * 2 = 2
      expect(result.newPreferredShares).toBe(2000000); // 1M * 2 = 2M
      expect(result.dilutionProtection).toBe(1); // 100% protection
      expect(result.formulaUsed).toContain('Full Ratchet');
    });

    it('should provide detailed calculation steps', () => {
      const result = calculateFullRatchet(mockPreferredSeries, mockDownRound);
      
      expect(result.calculationSteps).toHaveLength(6);
      expect(result.calculationSteps[0]).toContain('Original conversion price: $1.0000');
      expect(result.calculationSteps[1]).toContain('New issue price: $0.5000');
      expect(result.calculationSteps[2]).toContain('Adjustment factor: 100 ÷ 50 = 2.000000');
    });

    it('should handle edge case where new price equals original price', () => {
      const samePriceRound = { ...mockDownRound, newPrice: 100 };
      const result = calculateFullRatchet(mockPreferredSeries, samePriceRound);
      
      expect(result.adjustmentFactor).toBe(1);
      expect(result.adjustedConversionRatio).toBe(1);
      expect(result.newPreferredShares).toBe(1000000);
      expect(result.dilutionProtection).toBe(1);
    });
  });

  describe('Weighted Average Anti-Dilution', () => {
    it('should calculate broad-based weighted average correctly', () => {
      const result = calculateWeightedAverage(
        mockPreferredSeries, 
        mockDownRound, 
        mockCapTable, 
        true
      );
      
      // Formula: NCP = OCP × (A + B) ÷ (A + C)
      // A = 10,000,000 (fully diluted shares)
      // B = $100,000 ÷ $1.00 = 100,000 shares purchasable at original price
      // C = 2,000,000 shares actually issued
      // Adjustment = (10M + 100K) ÷ (10M + 2M) = 10.1M ÷ 12M = 0.8417
      
      expect(result.adjustmentFactor).toBeCloseTo(0.8417, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.1881, 4); // 1 ÷ 0.8417
      expect(result.formulaUsed).toContain('Broad-based');
    });

    it('should calculate narrow-based weighted average correctly', () => {
      const result = calculateWeightedAverage(
        mockPreferredSeries, 
        mockDownRound, 
        mockCapTable, 
        false
      );
      
      // Formula: NCP = OCP × (A + B) ÷ (A + C)
      // A = 9,000,000 (common + preferred only)
      // B = $100,000 ÷ $1.00 = 100,000 shares purchasable at original price
      // C = 2,000,000 shares actually issued
      // Adjustment = (9M + 100K) ÷ (9M + 2M) = 9.1M ÷ 11M = 0.8273
      
      expect(result.adjustmentFactor).toBeCloseTo(0.8273, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.2088, 4); // 1 ÷ 0.8273
      expect(result.formulaUsed).toContain('Narrow-based');
    });

    it('should show greater protection for narrow-based vs broad-based', () => {
      const broadResult = calculateWeightedAverage(mockPreferredSeries, mockDownRound, mockCapTable, true);
      const narrowResult = calculateWeightedAverage(mockPreferredSeries, mockDownRound, mockCapTable, false);
      
      // Narrow-based should provide more protection (higher adjustment factor)
      expect(narrowResult.adjustedConversionRatio).toBeGreaterThan(broadResult.adjustedConversionRatio);
      expect(narrowResult.newPreferredShares).toBeGreaterThan(broadResult.newPreferredShares);
    });
  });

  describe('Comprehensive Anti-Dilution Analysis', () => {
    it('should analyze multiple preferred series correctly', () => {
      const seriesB: IPreferredSeries = {
        id: 'series-b',
        name: 'Series B Preferred',
        shares: 500000,
        originalPrice: 200, // $2.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.FULL_RATCHET,
        participatingPreferred: true,
        conversionRatio: 1,
        seniorityRank: 2
      };

      const multipleSeries = [mockPreferredSeries, seriesB];
      const downRound = { ...mockDownRound, newPrice: 150 }; // Down round only for Series A

      const analysis = analyzeAntiDilution(multipleSeries, downRound, mockCapTable);
      
      expect(analysis.adjustments).toHaveLength(2);
      
      // Series A should get protection (150 < 100 is false, so no adjustment)
      const seriesAResult = analysis.adjustments.find(a => a.seriesId === 'series-a');
      expect(seriesAResult?.adjustmentFactor).toBe(1); // No adjustment - not a down round
      
      // Series B should get protection (150 < 200)
      const seriesBResult = analysis.adjustments.find(a => a.seriesId === 'series-b');
      expect(seriesBResult?.adjustmentFactor).toBeCloseTo(1.3333, 4); // 200/150
    });

    it('should calculate dilution savings correctly', () => {
      const analysis = analyzeAntiDilution([mockPreferredSeries], mockDownRound, mockCapTable);
      
      expect(analysis.totalDilutionWithoutProtection).toBeGreaterThan(0);
      expect(analysis.totalDilutionWithProtection).toBeGreaterThan(analysis.totalDilutionWithoutProtection);
      expect(analysis.dilutionSavings).toBeGreaterThan(0);
    });
  });

  describe('Multiple Round Analysis', () => {
    it('should handle sequential down rounds correctly', () => {
      const firstDownRound: IDownRound = {
        name: 'Series B Down Round',
        newPrice: 75, // $0.75
        sharesIssued: 1000000,
        investmentAmount: 7500000
      };

      const secondDownRound: IDownRound = {
        name: 'Series C Down Round', 
        newPrice: 50, // $0.50
        sharesIssued: 2000000,
        investmentAmount: 10000000
      };

      const analyses = analyzeMultipleRoundAntiDilution(
        [mockPreferredSeries],
        [firstDownRound, secondDownRound],
        mockCapTable
      );
      
      expect(analyses).toHaveLength(2);
      
      // First round should adjust Series A
      expect(analyses[0].adjustments[0].adjustedConversionRatio).toBeCloseTo(1.3333, 4); // 100/75
      
      // Second round should adjust again from the new basis
      expect(analyses[1].adjustments[0].adjustedConversionRatio).toBeGreaterThan(analyses[0].adjustments[0].adjustedConversionRatio);
    });
  });

  describe('Anti-Dilution Term Optimization', () => {
    it('should compare different protection types effectively', () => {
      const potentialDownRounds = [
        { ...mockDownRound, newPrice: 75, investmentAmount: 7500000 },
        { ...mockDownRound, newPrice: 50, investmentAmount: 10000000 },
        { ...mockDownRound, newPrice: 25, investmentAmount: 5000000 }
      ];

      const optimization = optimizeAntiDilutionTerms(
        mockPreferredSeries,
        potentialDownRounds,
        mockCapTable
      );
      
      expect(optimization).toHaveLength(3);
      
      optimization.forEach(scenario => {
        expect(scenario.protectionTypes).toHaveLength(3); // Full ratchet, broad, narrow
        
        // Full ratchet should always provide most protection
        const fullRatchet = scenario.protectionTypes.find(p => p.type === AntiDilutionType.FULL_RATCHET);
        const broadWeighted = scenario.protectionTypes.find(p => p.type === AntiDilutionType.WEIGHTED_AVERAGE_BROAD);
        
        expect(fullRatchet?.valueProtected).toBeGreaterThanOrEqual(broadWeighted?.valueProtected || 0);
      });
    });
  });

  describe('Liquidation Coverage Analysis', () => {
    it('should calculate cumulative coverage correctly', () => {
      const seriesB: IPreferredSeries = {
        ...mockPreferredSeries,
        id: 'series-b',
        name: 'Series B',
        originalPrice: 200,
        liquidationPreference: 2, // 2x preference
        seniorityRank: 1, // More senior than Series A
        dividendType: 'CUMULATIVE',
        dividendRate: 8, // 8% annual
        issuanceDate: '2023-01-01'
      };

      const coverage = calculateLiquidationCoverage([mockPreferredSeries, seriesB]);
      
      expect(coverage).toHaveLength(2);
      
      // Series B should be first (more senior)
      expect(coverage[0].seriesName).toBe('Series B');
      expect(coverage[0].seniorityRank).toBe(1);
      expect(coverage[0].liquidationPreference).toBe(200000000); // $2M investment * 2x = $4M
      
      // Cumulative coverage should stack
      expect(coverage[1].cumulativeCoverage).toBeGreaterThan(coverage[0].totalClaim);
    });
  });

  describe('Error Handling', () => {
    it('should validate negative prices', () => {
      const invalidDownRound = { ...mockDownRound, newPrice: -50 };
      
      expect(() => calculateFullRatchet(mockPreferredSeries, invalidDownRound))
        .toThrow(ValidationError);
    });

    it('should validate invalid share counts', () => {
      const invalidSeries = { ...mockPreferredSeries, shares: -1000 };
      
      expect(() => calculateFullRatchet(invalidSeries, mockDownRound))
        .toThrow(ValidationError);
    });

    it('should validate duplicate seniority ranks', () => {
      const duplicateRankSeries = [
        mockPreferredSeries,
        { ...mockPreferredSeries, id: 'series-b', seniorityRank: 1 }
      ];
      
      expect(() => analyzeAntiDilution(duplicateRankSeries, mockDownRound, mockCapTable))
        .toThrow('Seniority ranks must be unique');
    });
  });
});

describe('Golden Tests - Anti-Dilution', () => {
  // These tests verify exact calculation results against known scenarios
  // Based on real-world term sheets and legal precedents
  
  describe('Classic VC Scenarios', () => {
    it('should match Fenwick & West Example 1: Broad-based weighted average', () => {
      // Scenario from Fenwick & West Anti-Dilution Guide
      const fenwicks1Series: IPreferredSeries = {
        id: 'series-a',
        name: 'Series A',
        shares: 2000000,
        originalPrice: 100, // $1.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const fenwicks1CapTable: ICapTableSnapshot = {
        commonShares: 6000000,
        totalPreferredShares: 2000000,
        optionsOutstanding: 1000000,
        optionsAvailable: 1000000,
        warrants: 0,
        fullyDilutedShares: 10000000
      };

      const fenwicks1DownRound: IDownRound = {
        name: 'Series B',
        newPrice: 50, // $0.50
        sharesIssued: 4000000,
        investmentAmount: 20000000 // $200,000
      };

      const result = calculateWeightedAverage(
        fenwicks1Series,
        fenwicks1DownRound,
        fenwicks1CapTable,
        true
      );

      // Expected: NCP = $1.00 × (10M + 2M) ÷ (10M + 4M) = $1.00 × 0.857 = $0.857
      expect(result.adjustedConversionRatio).toBeCloseTo(1.1667, 4);
      expect(result.newPreferredShares).toBeCloseTo(2333333, 0);
    });

    it('should match NVCA Model: Full ratchet in severe down round', () => {
      // Severe down round scenario (90% down)
      const severeDownRound: IDownRound = {
        name: 'Distressed Series B',
        newPrice: 10, // $0.10 - 90% down
        sharesIssued: 10000000,
        investmentAmount: 100000000 // $1M
      };

      const result = calculateFullRatchet(mockPreferredSeries, severeDownRound);

      expect(result.adjustmentFactor).toBe(10); // 100/10
      expect(result.adjustedConversionRatio).toBe(10);
      expect(result.newPreferredShares).toBe(10000000); // 1M * 10
      expect(result.dilutionProtection).toBe(1); // Full protection
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal down round correctly', () => {
      // Very small down round (1% down)
      const minimalDownRound: IDownRound = {
        name: 'Series B Minimal',
        newPrice: 99, // $0.99
        sharesIssued: 100000,
        investmentAmount: 9900000
      };

      const result = calculateWeightedAverage(
        mockPreferredSeries,
        minimalDownRound,
        mockCapTable,
        true
      );

      // Should provide minimal adjustment
      expect(result.adjustmentFactor).toBeCloseTo(1.0099, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.0099, 4);
    });

    it('should handle large investment in down round', () => {
      // Large investment at low price
      const largeInvestmentRound: IDownRound = {
        name: 'Series B Large',
        newPrice: 50,
        sharesIssued: 20000000, // Very large issuance
        investmentAmount: 100000000 // $1M
      };

      const result = calculateWeightedAverage(
        mockPreferredSeries,
        largeInvestmentRound,
        mockCapTable,
        true
      );

      // Large issuance should reduce adjustment factor
      expect(result.adjustmentFactor).toBeLessThan(0.7);
      expect(result.adjustedConversionRatio).toBeGreaterThan(1.4);
    });
  });

  describe('Multi-Round Scenarios', () => {
    it('should handle cascading down rounds correctly', () => {
      const rounds = [
        {
          name: 'Series B Down 25%',
          newPrice: 75,
          sharesIssued: 1333333,
          investmentAmount: 10000000
        },
        {
          name: 'Series C Down 50%',
          newPrice: 50,
          sharesIssued: 2000000,
          investmentAmount: 10000000
        },
        {
          name: 'Series D Down 75%',
          newPrice: 25,
          sharesIssued: 4000000,
          investmentAmount: 10000000
        }
      ];

      const analyses = analyzeMultipleRoundAntiDilution(
        [mockPreferredSeries],
        rounds,
        mockCapTable
      );

      expect(analyses).toHaveLength(3);
      
      // Each subsequent round should provide additional adjustment
      expect(analyses[0].adjustments[0].adjustedConversionRatio).toBeGreaterThan(1);
      expect(analyses[1].adjustments[0].adjustedConversionRatio).toBeGreaterThan(analyses[0].adjustments[0].adjustedConversionRatio);
      expect(analyses[2].adjustments[0].adjustedConversionRatio).toBeGreaterThan(analyses[1].adjustments[0].adjustedConversionRatio);
      
      // Total dilution protection should compound
      expect(analyses[2].dilutionSavings).toBeGreaterThan(0.1); // Significant protection
    });
  });
});