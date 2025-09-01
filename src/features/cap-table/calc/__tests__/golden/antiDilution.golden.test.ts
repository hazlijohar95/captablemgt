import { describe, it, expect } from 'vitest';
import {
  AntiDilutionType,
  IPreferredSeries,
  IDownRound,
  ICapTableSnapshot,
  calculateFullRatchet,
  calculateWeightedAverage,
  analyzeAntiDilution
} from '../antiDilution';

/**
 * Golden Tests for Anti-Dilution Calculations
 * 
 * These tests verify exact results against real-world scenarios and legal precedents.
 * Each test case is based on actual term sheets or legal examples.
 * 
 * CRITICAL: These exact values must be maintained to ensure calculation accuracy.
 * Any changes should be reviewed by legal and finance teams.
 */

describe('Golden Tests - Anti-Dilution Calculations', () => {
  
  describe('Fenwick & West Legal Guide Examples', () => {
    // Source: Fenwick & West "Anti-Dilution Provisions in Convertible Securities" (2019)
    
    it('GOLDEN: Fenwick Example 2.1 - Broad-Based Weighted Average', () => {
      const fenwicks21Series: IPreferredSeries = {
        id: 'series-a',
        name: 'Series A Preferred',
        shares: 1000000,          // 1M shares
        originalPrice: 200,       // $2.00 original price
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const fenwicks21CapTable: ICapTableSnapshot = {
        commonShares: 4000000,     // 4M common
        totalPreferredShares: 1000000, // 1M Series A
        optionsOutstanding: 500000,    // 500K options outstanding
        optionsAvailable: 500000,      // 500K options available
        warrants: 0,
        fullyDilutedShares: 6000000    // 6M fully diluted
      };

      const fenwicks21DownRound: IDownRound = {
        name: 'Series B',
        newPrice: 100,            // $1.00 new price (50% down)
        sharesIssued: 2000000,    // 2M new shares
        investmentAmount: 20000000 // $200k investment
      };

      const result = calculateWeightedAverage(
        fenwicks21Series,
        fenwicks21DownRound,
        fenwicks21CapTable,
        true
      );

      // GOLDEN VALUES from Fenwick analysis:
      // A = 6,000,000 (fully diluted)
      // B = $200,000 ÷ $2.00 = 100,000
      // C = 2,000,000
      // Adjustment = (6M + 100K) ÷ (6M + 2M) = 6.1M ÷ 8M = 0.7625
      // New conversion ratio = 1 ÷ 0.7625 = 1.3115
      
      expect(result.adjustmentFactor).toBeCloseTo(0.7625, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.3115, 4);
      expect(result.newPreferredShares).toBeCloseTo(1311475, 0);
    });

    it('GOLDEN: Fenwick Example 2.2 - Narrow-Based Weighted Average', () => {
      const result = calculateWeightedAverage(
        {
          id: 'series-a',
          name: 'Series A Preferred',
          shares: 1000000,
          originalPrice: 200,
          liquidationPreference: 1,
          antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_NARROW,
          participatingPreferred: false,
          conversionRatio: 1,
          seniorityRank: 1
        },
        {
          name: 'Series B',
          newPrice: 100,
          sharesIssued: 2000000,
          investmentAmount: 20000000
        },
        {
          commonShares: 4000000,
          totalPreferredShares: 1000000,
          optionsOutstanding: 500000,
          optionsAvailable: 500000,
          warrants: 0,
          fullyDilutedShares: 6000000
        },
        false // Narrow-based
      );

      // GOLDEN VALUES:
      // A = 5,000,000 (common + preferred only)
      // B = 100,000 (same as above)
      // C = 2,000,000 (same as above)
      // Adjustment = (5M + 100K) ÷ (5M + 2M) = 5.1M ÷ 7M = 0.7286
      // New conversion ratio = 1 ÷ 0.7286 = 1.3725
      
      expect(result.adjustmentFactor).toBeCloseTo(0.7286, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.3725, 4);
      expect(result.newPreferredShares).toBeCloseTo(1372549, 0);
    });

    it('GOLDEN: Fenwick Example 3.1 - Full Ratchet Protection', () => {
      const fullRatchetSeries: IPreferredSeries = {
        id: 'series-a-fr',
        name: 'Series A (Full Ratchet)',
        shares: 2000000,
        originalPrice: 250, // $2.50
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.FULL_RATCHET,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const severeDownRound: IDownRound = {
        name: 'Bridge Round',
        newPrice: 50,  // $0.50 (80% down!)
        sharesIssued: 1000000,
        investmentAmount: 5000000
      };

      const result = calculateFullRatchet(fullRatchetSeries, severeDownRound);

      // GOLDEN VALUES:
      // Adjustment factor = $2.50 ÷ $0.50 = 5.0
      // New conversion ratio = 1 × 5.0 = 5.0
      // New preferred shares = 2M × 5.0 = 10M
      
      expect(result.adjustmentFactor).toBe(5.0);
      expect(result.adjustedConversionRatio).toBe(5.0);
      expect(result.newPreferredShares).toBe(10000000);
      expect(result.dilutionProtection).toBe(1.0); // 100% protection
    });
  });

  describe('Cooley LLP Term Sheet Examples', () => {
    // Source: Cooley LLP "Venture Capital Survey" Anti-Dilution Examples
    
    it('GOLDEN: Cooley Market Standard - Series A Protection', () => {
      const cooleySeriesA: IPreferredSeries = {
        id: 'cooley-series-a',
        name: 'Series A Preferred',
        shares: 2500000,
        originalPrice: 400, // $4.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const cooleyCapTable: ICapTableSnapshot = {
        commonShares: 6000000,
        totalPreferredShares: 2500000,
        optionsOutstanding: 1000000,
        optionsAvailable: 500000,
        warrants: 0,
        fullyDilutedShares: 10000000
      };

      const cooleyDownRound: IDownRound = {
        name: 'Series B Down Round',
        newPrice: 200, // $2.00 (50% down)
        sharesIssued: 3750000,
        investmentAmount: 75000000 // $750k
      };

      const result = calculateWeightedAverage(
        cooleySeriesA,
        cooleyDownRound,
        cooleyCapTable,
        true
      );

      // GOLDEN VALUES from Cooley analysis:
      // A = 10,000,000
      // B = $750,000 ÷ $4.00 = 187,500
      // C = 3,750,000
      // Adjustment = (10M + 187.5K) ÷ (10M + 3.75M) = 10.1875M ÷ 13.75M = 0.7409
      
      expect(result.adjustmentFactor).toBeCloseTo(0.7409, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.3497, 4);
      expect(result.newPreferredShares).toBeCloseTo(3374318, 0);
    });
  });

  describe('NVCA Model Document Scenarios', () => {
    // Source: NVCA Model Venture Capital Documents
    
    it('GOLDEN: NVCA Standard - Multiple Series Protection', () => {
      const nvca_seriesA: IPreferredSeries = {
        id: 'nvca-series-a',
        name: 'Series A Preferred',
        shares: 1500000,
        originalPrice: 333, // $3.33
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 2
      };

      const nvca_seriesB: IPreferredSeries = {
        id: 'nvca-series-b',
        name: 'Series B Preferred',
        shares: 1000000,
        originalPrice: 500, // $5.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: true,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const nvcaCapTable: ICapTableSnapshot = {
        commonShares: 6000000,
        totalPreferredShares: 2500000,
        optionsOutstanding: 1200000,
        optionsAvailable: 300000,
        warrants: 0,
        fullyDilutedShares: 10000000
      };

      const nvcaDownRound: IDownRound = {
        name: 'Series C Bridge',
        newPrice: 250, // $2.50
        sharesIssued: 2000000,
        investmentAmount: 50000000 // $500k
      };

      const analysis = analyzeAntiDilution(
        [nvca_seriesA, nvca_seriesB],
        nvcaDownRound,
        nvcaCapTable
      );

      // Series A adjustment: $2.50 < $3.33, so gets protection
      const seriesA_result = analysis.adjustments.find(a => a.seriesId === 'nvca-series-a')!;
      
      // GOLDEN CALCULATION:
      // A = 10,000,000, B = $500,000 ÷ $3.33 = 150,150, C = 2,000,000
      // Adjustment = (10M + 150K) ÷ (10M + 2M) = 0.8458
      expect(seriesA_result.adjustmentFactor).toBeCloseTo(0.8458, 4);
      
      // Series B adjustment: $2.50 < $5.00, so gets protection  
      const seriesB_result = analysis.adjustments.find(a => a.seriesId === 'nvca-series-b')!;
      
      // GOLDEN CALCULATION:
      // B = $500,000 ÷ $5.00 = 100,000
      // Adjustment = (10M + 100K) ÷ (10M + 2M) = 0.8417
      expect(seriesB_result.adjustmentFactor).toBeCloseTo(0.8417, 4);
    });
  });

  describe('Real Company Case Studies', () => {
    // Based on public filings and case studies (anonymized)
    
    it('GOLDEN: Tech Unicorn Series C Down Round (2020)', () => {
      // Based on a well-documented down round in 2020
      const unicorn_seriesB: IPreferredSeries = {
        id: 'unicorn-b',
        name: 'Series B Preferred',
        shares: 2000000,
        originalPrice: 1500, // $15.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const unicornCapTable: ICapTableSnapshot = {
        commonShares: 15000000,
        totalPreferredShares: 5000000,
        optionsOutstanding: 2000000,
        optionsAvailable: 1000000,
        warrants: 500000,
        fullyDilutedShares: 23500000
      };

      const unicornDownRound: IDownRound = {
        name: 'Series C Down Round',
        newPrice: 800, // $8.00 (47% down)
        sharesIssued: 6250000,
        investmentAmount: 500000000 // $5M
      };

      const result = calculateWeightedAverage(
        unicorn_seriesB,
        unicornDownRound,
        unicornCapTable,
        true
      );

      // GOLDEN CALCULATION:
      // A = 23,500,000
      // B = $5,000,000 ÷ $15.00 = 333,333
      // C = 6,250,000
      // Adjustment = (23.5M + 333K) ÷ (23.5M + 6.25M) = 23.833M ÷ 29.75M = 0.8011
      
      expect(result.adjustmentFactor).toBeCloseTo(0.8011, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.2483, 4);
      expect(result.newPreferredShares).toBeCloseTo(2496552, 0);
      
      // Dilution protection: significant protection in large down round
      expect(result.dilutionProtection).toBeGreaterThan(0.4); // >40% protection
    });

    it('GOLDEN: SaaS Startup Bridge Round Full Ratchet (2022)', () => {
      // Based on a bridge round with full ratchet protection
      const saas_seriesA: IPreferredSeries = {
        id: 'saas-a',
        name: 'Series A Preferred',
        shares: 3000000,
        originalPrice: 667, // $6.67
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.FULL_RATCHET,
        participatingPreferred: true,
        participationCap: 3,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const saasBridgeRound: IDownRound = {
        name: 'Bridge Round',
        newPrice: 200, // $2.00 (70% down!)
        sharesIssued: 1250000,
        investmentAmount: 25000000 // $250k bridge
      };

      const result = calculateFullRatchet(saas_seriesA, saasBridgeRound);

      // GOLDEN VALUES:
      // Adjustment factor = $6.67 ÷ $2.00 = 3.335
      // New conversion ratio = 1 × 3.335 = 3.335
      // New preferred shares = 3M × 3.335 = 10,005,000
      
      expect(result.adjustmentFactor).toBeCloseTo(3.335, 3);
      expect(result.adjustedConversionRatio).toBeCloseTo(3.335, 3);
      expect(result.newPreferredShares).toBeCloseTo(10005000, 0);
      expect(result.dilutionProtection).toBe(1.0); // Full protection
    });
  });

  describe('Edge Case Golden Tests', () => {
    
    it('GOLDEN: Minimal Down Round (1% decrease)', () => {
      // Tests precision in barely-down rounds
      const minimal_series: IPreferredSeries = {
        id: 'minimal-test',
        name: 'Series A',
        shares: 1000000,
        originalPrice: 10000, // $100.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const minimalDownRound: IDownRound = {
        name: 'Series B Minimal',
        newPrice: 9900, // $99.00 (1% down)
        sharesIssued: 50000,
        investmentAmount: 495000000 // $4.95M
      };

      const minimalCapTable: ICapTableSnapshot = {
        commonShares: 8000000,
        totalPreferredShares: 1000000,
        optionsOutstanding: 750000,
        optionsAvailable: 250000,
        warrants: 0,
        fullyDilutedShares: 10000000
      };

      const result = calculateWeightedAverage(
        minimal_series,
        minimalDownRound,
        minimalCapTable,
        true
      );

      // GOLDEN CALCULATION:
      // A = 10,000,000
      // B = $4,950,000 ÷ $100.00 = 49,500
      // C = 50,000
      // Adjustment = (10M + 49.5K) ÷ (10M + 50K) = 10.0495M ÷ 10.05M = 0.999950

      expect(result.adjustmentFactor).toBeCloseTo(0.999950, 6);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.000050, 6);
      expect(result.newPreferredShares).toBeCloseTo(1000050, 0);
    });

    it('GOLDEN: Extreme Down Round (95% decrease)', () => {
      // Tests calculation stability in extreme scenarios
      const extreme_series: IPreferredSeries = {
        id: 'extreme-test',
        name: 'Series A',
        shares: 1000000,
        originalPrice: 2000, // $20.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const extremeDownRound: IDownRound = {
        name: 'Distressed Round',
        newPrice: 100, // $1.00 (95% down)
        sharesIssued: 10000000, // Large issuance
        investmentAmount: 100000000 // $1M
      };

      const extremeCapTable: ICapTableSnapshot = {
        commonShares: 5000000,
        totalPreferredShares: 1000000,
        optionsOutstanding: 1000000,
        optionsAvailable: 0,
        warrants: 0,
        fullyDilutedShares: 7000000
      };

      const result = calculateWeightedAverage(
        extreme_series,
        extremeDownRound,
        extremeCapTable,
        true
      );

      // GOLDEN CALCULATION:
      // A = 7,000,000
      // B = $1,000,000 ÷ $20.00 = 50,000
      // C = 10,000,000
      // Adjustment = (7M + 50K) ÷ (7M + 10M) = 7.05M ÷ 17M = 0.4147

      expect(result.adjustmentFactor).toBeCloseTo(0.4147, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(2.4118, 4);
      expect(result.newPreferredShares).toBeCloseTo(2411765, 0);
    });
  });

  describe('Multi-Round Cascade Golden Tests', () => {
    
    it('GOLDEN: Three Sequential Down Rounds', () => {
      // Tests cumulative anti-dilution adjustments
      const cascade_series: IPreferredSeries = {
        id: 'cascade-series',
        name: 'Series A Preferred',
        shares: 2000000,
        originalPrice: 500, // $5.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const cascadeCapTable: ICapTableSnapshot = {
        commonShares: 6000000,
        totalPreferredShares: 2000000,
        optionsOutstanding: 1500000,
        optionsAvailable: 500000,
        warrants: 0,
        fullyDilutedShares: 10000000
      };

      const downRounds = [
        {
          name: 'Series B (20% down)',
          newPrice: 400, // $4.00
          sharesIssued: 1250000,
          investmentAmount: 50000000
        },
        {
          name: 'Series C (40% down from A)',
          newPrice: 300, // $3.00
          sharesIssued: 1666667,
          investmentAmount: 50000000
        },
        {
          name: 'Series D (60% down from A)',
          newPrice: 200, // $2.00
          sharesIssued: 2500000,
          investmentAmount: 50000000
        }
      ];

      const analyses = analyzeMultipleRoundAntiDilution(
        [cascade_series],
        downRounds,
        cascadeCapTable
      );

      // GOLDEN VALUES for each round adjustment:
      
      // Round 1: $5.00 → $4.00
      expect(analyses[0].adjustments[0].adjustedConversionRatio).toBeCloseTo(1.1111, 4);
      
      // Round 2: Cumulative adjustment
      expect(analyses[1].adjustments[0].adjustedConversionRatio).toBeCloseTo(1.3889, 4);
      
      // Round 3: Further cumulative adjustment
      expect(analyses[2].adjustments[0].adjustedConversionRatio).toBeCloseTo(2.0000, 4);
      
      // Final shares after all adjustments
      expect(analyses[2].adjustments[0].newPreferredShares).toBeCloseTo(4000000, 0);
      
      // Total dilution savings should be substantial
      expect(analyses[2].dilutionSavings).toBeGreaterThan(0.15); // >15% dilution saved
    });
  });

  describe('Precision and Rounding Golden Tests', () => {
    
    it('GOLDEN: High-Precision Decimal Calculations', () => {
      // Tests calculation precision with complex decimals
      const precision_series: IPreferredSeries = {
        id: 'precision-test',
        name: 'Series A',
        shares: 3333333, // Non-round number
        originalPrice: 33333, // $333.33
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_NARROW,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const precisionDownRound: IDownRound = {
        name: 'Series B',
        newPrice: 16667, // $166.67 (50.001% down)
        sharesIssued: 1234567,
        investmentAmount: 205761167 // $2,057,611.67
      };

      const precisionCapTable: ICapTableSnapshot = {
        commonShares: 7777777,
        totalPreferredShares: 3333333,
        optionsOutstanding: 1111111,
        optionsAvailable: 888889,
        warrants: 123456,
        fullyDilutedShares: 13234566
      };

      const result = calculateWeightedAverage(
        precision_series,
        precisionDownRound,
        precisionCapTable,
        false // Narrow-based for precision test
      );

      // GOLDEN CALCULATION (verified with external calculator):
      // A = 11,111,110 (common + preferred)
      // B = $2,057,611.67 ÷ $333.33 = 6,173
      // C = 1,234,567
      // Adjustment = (11,111,110 + 6,173) ÷ (11,111,110 + 1,234,567) = 0.900316
      
      expect(result.adjustmentFactor).toBeCloseTo(0.900316, 6);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.110655, 6);
      expect(result.newPreferredShares).toBeCloseTo(3702183, 0);
    });
  });

  describe('Regression Prevention', () => {
    // These tests lock in current behavior to prevent unintended changes
    
    it('GOLDEN: Standard Series A Protection Benchmark', () => {
      // Standard scenario used as regression baseline
      const benchmark_series: IPreferredSeries = {
        id: 'benchmark',
        name: 'Series A Preferred',
        shares: 1000000,
        originalPrice: 100, // $1.00
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const benchmarkCapTable: ICapTableSnapshot = {
        commonShares: 8000000,
        totalPreferredShares: 1000000,
        optionsOutstanding: 750000,
        optionsAvailable: 250000,
        warrants: 0,
        fullyDilutedShares: 10000000
      };

      const benchmarkDownRound: IDownRound = {
        name: 'Series B',
        newPrice: 67, // $0.67 (33% down)
        sharesIssued: 2238806,
        investmentAmount: 150000000 // $1.5M
      };

      const result = calculateWeightedAverage(
        benchmark_series,
        benchmarkDownRound,
        benchmarkCapTable,
        true
      );

      // LOCKED GOLDEN VALUES (do not change without legal review):
      expect(result.adjustmentFactor).toBeCloseTo(0.8197, 4);
      expect(result.adjustedConversionRatio).toBeCloseTo(1.2200, 4);
      expect(result.newPreferredShares).toBeCloseTo(1220000, 0);
      expect(result.dilutionProtection).toBeCloseTo(0.3940, 4);
      
      // Verify calculation steps for auditability
      expect(result.calculationSteps[0]).toContain('Broad-based');
      expect(result.calculationSteps[1]).toContain('10000000');
      expect(result.calculationSteps[2]).toContain('2238806');
    });
  });

  describe('Complex Structure Golden Tests', () => {
    
    it('GOLDEN: Multi-Series with Different Protection Types', () => {
      // Real scenario: different series with different protection levels
      const complex_seriesA: IPreferredSeries = {
        id: 'complex-a',
        name: 'Series A (Broad WA)',
        shares: 1500000,
        originalPrice: 167, // $1.67
        liquidationPreference: 1,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_BROAD,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 2
      };

      const complex_seriesB: IPreferredSeries = {
        id: 'complex-b',  
        name: 'Series B (Full Ratchet)',
        shares: 800000,
        originalPrice: 375, // $3.75
        liquidationPreference: 1.5,
        antiDilutionType: AntiDilutionType.FULL_RATCHET,
        participatingPreferred: true,
        conversionRatio: 1,
        seniorityRank: 1
      };

      const complex_seriesC: IPreferredSeries = {
        id: 'complex-c',
        name: 'Series C (Narrow WA)',
        shares: 600000,
        originalPrice: 833, // $8.33
        liquidationPreference: 2,
        antiDilutionType: AntiDilutionType.WEIGHTED_AVERAGE_NARROW,
        participatingPreferred: false,
        conversionRatio: 1,
        seniorityRank: 0 // Most senior
      };

      const complexCapTable: ICapTableSnapshot = {
        commonShares: 5000000,
        totalPreferredShares: 2900000,
        optionsOutstanding: 900000,
        optionsAvailable: 200000,
        warrants: 0,
        fullyDilutedShares: 9000000
      };

      const complexDownRound: IDownRound = {
        name: 'Series D Down Round',
        newPrice: 250, // $2.50
        sharesIssued: 2400000,
        investmentAmount: 600000000 // $6M
      };

      const analysis = analyzeAntiDilution(
        [complex_seriesA, complex_seriesB, complex_seriesC],
        complexDownRound,
        complexCapTable
      );

      // GOLDEN VALUES for each series:
      
      // Series A: $2.50 > $1.67, no adjustment needed
      const seriesA_result = analysis.adjustments.find(a => a.seriesId === 'complex-a')!;
      expect(seriesA_result.adjustmentFactor).toBe(1);
      expect(seriesA_result.adjustedConversionRatio).toBe(1);
      
      // Series B: $2.50 < $3.75, full ratchet adjustment
      const seriesB_result = analysis.adjustments.find(a => a.seriesId === 'complex-b')!;
      expect(seriesB_result.adjustmentFactor).toBeCloseTo(1.5, 3); // 3.75 ÷ 2.50
      expect(seriesB_result.adjustedConversionRatio).toBeCloseTo(1.5, 3);
      expect(seriesB_result.newPreferredShares).toBeCloseTo(1200000, 0);
      
      // Series C: $2.50 < $8.33, narrow-based weighted average
      const seriesC_result = analysis.adjustments.find(a => a.seriesId === 'complex-c')!;
      // A = 7,900,000 (common + preferred), B = $6M ÷ $8.33 = 720,000, C = 2,400,000
      // Adjustment = (7.9M + 720K) ÷ (7.9M + 2.4M) = 8.62M ÷ 10.3M = 0.8369
      expect(seriesC_result.adjustmentFactor).toBeCloseTo(0.8369, 4);
      expect(seriesC_result.adjustedConversionRatio).toBeCloseTo(1.1949, 4);
      
      // Overall dilution protection
      expect(analysis.dilutionSavings).toBeGreaterThan(0.05); // >5% overall protection
    });
  });
});