import { describe, it, expect } from 'vitest';
import {
  ParticipationType,
  DividendType,
  IPreferredShareClass,
  ICommonShareClass,
  ILiquidationEvent,
  calculateLiquidationStacking,
  analyzeLiquidationPreferenceStructures,
  calculateLiquidationCoverage,
  calculatePreferenceBreakeven
} from '../liquidationStacking';

describe('Liquidation Preference Stacking', () => {
  const mockCommonClass: ICommonShareClass = {
    id: 'common',
    name: 'Common Stock',
    shares: 6000000
  };

  const mockSeriesA: IPreferredShareClass = {
    id: 'series-a',
    name: 'Series A Preferred',
    shares: 1000000,
    originalInvestment: 100000000, // $1M
    liquidationMultiple: 1,
    participationType: ParticipationType.NON_PARTICIPATING,
    seniorityRank: 2, // Junior to Series B
    dividendType: DividendType.NONE,
    conversionRatio: 1,
    issuanceDate: '2023-01-01'
  };

  const mockSeriesB: IPreferredShareClass = {
    id: 'series-b',
    name: 'Series B Preferred',
    shares: 500000,
    originalInvestment: 200000000, // $2M
    liquidationMultiple: 2, // 2x preference
    participationType: ParticipationType.PARTICIPATING_CAPPED,
    participationCap: 3, // 3x cap
    seniorityRank: 1, // Most senior
    dividendType: DividendType.CUMULATIVE,
    dividendRate: 8, // 8% annual
    unpaidDividends: 5000000, // $50k unpaid
    conversionRatio: 1,
    issuanceDate: '2022-01-01'
  };

  const mockLiquidationEvent: ILiquidationEvent = {
    exitValue: 1000000000, // $10M exit
    eventDate: '2024-12-31',
    eventType: 'ACQUISITION'
  };

  describe('Basic Liquidation Waterfall', () => {
    it('should pay liquidation preferences by seniority', () => {
      const analysis = calculateLiquidationStacking(
        [mockSeriesA, mockSeriesB],
        [mockCommonClass],
        mockLiquidationEvent
      );

      // Series B should be paid first (seniority rank 1)
      const seriesBDist = analysis.distributions.find(d => d.classId === 'series-b')!;
      const seriesADist = analysis.distributions.find(d => d.classId === 'series-a')!;

      // Series B gets 2x liquidation preference = $4M
      expect(seriesBDist.liquidationPreference).toBe(400000000);
      
      // Series A gets 1x liquidation preference = $1M  
      expect(seriesADist.liquidationPreference).toBe(100000000);
      
      // Total liquidation preferences
      expect(analysis.summary.totalLiquidationPreferences).toBe(500000000); // $5M
    });

    it('should calculate cumulative dividends correctly', () => {
      const analysis = calculateLiquidationStacking(
        [mockSeriesB],
        [mockCommonClass],
        mockLiquidationEvent
      );

      const seriesBDist = analysis.distributions.find(d => d.classId === 'series-b')!;
      
      // 2 years * 8% * $2M investment + $50k unpaid = $370k total
      const expectedDividends = (2 * 0.08 * 200000000) + 5000000;
      expect(seriesBDist.cumulativeDividends).toBeCloseTo(expectedDividends, -3);
    });

    it('should handle participating preferred correctly', () => {
      const highExitEvent: ILiquidationEvent = {
        ...mockLiquidationEvent,
        exitValue: 2000000000 // $20M exit
      };

      const analysis = calculateLiquidationStacking(
        [mockSeriesB],
        [mockCommonClass],
        highExitEvent
      );

      const seriesBDist = analysis.distributions.find(d => d.classId === 'series-b')!;
      
      // Should get liquidation preference + participation (up to cap)
      expect(seriesBDist.liquidationPreference).toBe(400000000); // 2x * $2M = $4M
      expect(seriesBDist.participation).toBeGreaterThan(0);
      
      // Total should not exceed 3x cap = $6M
      const maxPayout = 3 * 200000000; // 3x cap
      expect(seriesBDist.totalDistribution).toBeLessThanOrEqual(maxPayout);
    });
  });

  describe('Preference vs Common Analysis', () => {
    it('should correctly identify optimal choice for preferred shareholders', () => {
      const lowExitEvent: ILiquidationEvent = {
        ...mockLiquidationEvent,
        exitValue: 300000000 // $3M exit - below liquidation preferences
      };

      const analysis = calculateLiquidationStacking(
        [mockSeriesA, mockSeriesB],
        [mockCommonClass],
        lowExitEvent
      );

      const seriesBDist = analysis.distributions.find(d => d.classId === 'series-b')!;
      const seriesADist = analysis.distributions.find(d => d.classId === 'series-a')!;

      // At $3M exit, preferred should be optimal choice
      expect(seriesBDist.preferredVsCommon.optimalChoice).toBe('PREFERRED');
      expect(seriesADist.preferredVsCommon.optimalChoice).toBe('PREFERRED');
      
      // Series A gets nothing (Series B takes all $3M with 2x pref + dividends)
      expect(seriesADist.totalDistribution).toBe(0);
    });

    it('should identify when conversion to common is optimal', () => {
      const highExitEvent: ILiquidationEvent = {
        ...mockLiquidationEvent,
        exitValue: 10000000000 // $100M exit
      };

      const analysis = calculateLiquidationStacking(
        [mockSeriesA],
        [mockCommonClass],
        highExitEvent
      );

      const seriesADist = analysis.distributions.find(d => d.classId === 'series-a')!;
      
      // At $100M exit, common conversion should be optimal
      expect(seriesADist.preferredVsCommon.optimalChoice).toBe('COMMON');
      expect(seriesADist.preferredVsCommon.asCommon).toBeGreaterThan(seriesADist.preferredVsCommon.asPreferred);
    });
  });

  describe('Complex Stacking Scenarios', () => {
    it('should handle three-series stacking correctly', () => {
      const seriesC: IPreferredShareClass = {
        id: 'series-c',
        name: 'Series C Preferred',
        shares: 250000,
        originalInvestment: 500000000, // $5M
        liquidationMultiple: 1.5,
        participationType: ParticipationType.PARTICIPATING,
        seniorityRank: 0, // Most senior
        dividendType: DividendType.NON_CUMULATIVE,
        conversionRatio: 1,
        issuanceDate: '2021-01-01'
      };

      const threeSeries = [mockSeriesA, mockSeriesB, seriesC];
      const analysis = calculateLiquidationStacking(
        threeSeries,
        [mockCommonClass],
        mockLiquidationEvent
      );

      // Verify seniority order: C (rank 0), B (rank 1), A (rank 2)
      const waterfallSteps = analysis.summary.waterfallSteps;
      expect(waterfallSteps[0].description).toContain('Series C');
      expect(waterfallSteps[1].description).toContain('Series B');
      expect(waterfallSteps[2].description).toContain('Series A');
      
      // Verify all preferences are paid
      expect(analysis.summary.totalLiquidationPreferences).toBeGreaterThan(0);
      expect(analysis.summary.undistributedAmount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Breakeven Analysis', () => {
    it('should find accurate conversion breakeven points', () => {
      const breakeven = calculatePreferenceBreakeven(
        mockSeriesB,
        mockCommonClass.shares,
        2000000000, // $20M max exit value
        1000 // 1000 analysis points
      );

      // Should find breakeven where preferred vs common returns are equal
      const breakevenPoint = breakeven.find(point => 
        Math.abs(point.asPreferredValue - point.asCommonValue) < 10000 // Within $100
      );

      expect(breakevenPoint).toBeDefined();
      expect(breakevenPoint?.optimalChoice).toBeDefined();
    });
  });

  describe('Structure Optimization', () => {
    it('should compare liquidation preference structures effectively', () => {
      const exitScenarios = [500000000, 1000000000, 2000000000, 5000000000]; // $5M, $10M, $20M, $50M

      const analysis = analyzeLiquidationPreferenceStructures(
        [mockSeriesA],
        [mockCommonClass],
        exitScenarios
      );

      expect(analysis).toHaveLength(4);

      analysis.forEach(scenario => {
        expect(scenario.structures).toHaveLength(4); // 4 different structures tested
        
        // At low exit values, higher multiples should yield higher returns
        if (scenario.exitValue <= 1000000000) {
          const nonParticipating2x = scenario.structures.find(s => s.name === 'Non-Participating 2x');
          const nonParticipating1x = scenario.structures.find(s => s.name === 'Non-Participating 1x');
          
          expect(nonParticipating2x?.preferredTotalReturn).toBeGreaterThanOrEqual(
            nonParticipating1x?.preferredTotalReturn || 0
          );
        }
        
        // At high exit values, participating should yield higher returns
        if (scenario.exitValue >= 2000000000) {
          const participating = scenario.structures.find(s => s.name === 'Participating 1x');
          const nonParticipating = scenario.structures.find(s => s.name === 'Non-Participating 1x');
          
          expect(participating?.preferredTotalReturn).toBeGreaterThan(
            nonParticipating?.preferredTotalReturn || 0
          );
        }
      });
    });
  });
});

describe('Error Handling and Validation', () => {
  it('should validate liquidation event inputs', () => {
    const invalidEvent = {
      exitValue: -1000000, // Negative exit value
      eventDate: '2024-12-31',
      eventType: 'ACQUISITION'
    } as ILiquidationEvent;

    expect(() => calculateLiquidationStacking([mockSeriesA], [mockCommonClass], invalidEvent))
      .toThrow('exitValue must be positive');
  });

  it('should validate preferred share class inputs', () => {
    const invalidSeries = {
      ...mockSeriesA,
      liquidationMultiple: -1 // Invalid multiple
    };

    expect(() => calculateLiquidationStacking([invalidSeries], [mockCommonClass], mockLiquidationEvent))
      .toThrow('liquidationMultiple must be positive');
  });

  it('should validate unique seniority ranks', () => {
    const duplicateRankSeries = [
      mockSeriesA,
      { ...mockSeriesB, seniorityRank: 2 } // Same rank as Series A
    ];

    expect(() => calculateLiquidationStacking(duplicateRankSeries, [mockCommonClass], mockLiquidationEvent))
      .toThrow('Seniority ranks must be unique');
  });

  it('should validate dividend rates within reasonable bounds', () => {
    const invalidDividendSeries = {
      ...mockSeriesB,
      dividendType: DividendType.CUMULATIVE,
      dividendRate: 75 // 75% dividend rate - unrealistic
    };

    expect(() => calculateLiquidationStacking([invalidDividendSeries], [mockCommonClass], mockLiquidationEvent))
      .toThrow('Dividend rate must be between 0% and 50%');
  });
});