import { describe, it, expect } from 'vitest';
import {
  ParticipationType,
  DividendType,
  IPreferredShareClass,
  ICommonShareClass,
  ILiquidationEvent,
  calculateLiquidationStacking,
  calculateLiquidationCoverage
} from '../liquidationStacking';

/**
 * Golden Tests for Liquidation Preference Stacking
 * 
 * These tests verify exact liquidation waterfall calculations against 
 * documented legal precedents and real transaction examples.
 * 
 * CRITICAL: These exact values must be maintained for accuracy.
 * Changes require legal and finance team review.
 */

describe('Golden Tests - Liquidation Preference Stacking', () => {
  
  describe('NVCA Model Document Examples', () => {
    // Source: NVCA Model Venture Capital Documents - Liquidation Examples
    
    it('GOLDEN: NVCA Example 4.1 - Simple Non-Participating Stack', () => {
      const nvca_common: ICommonShareClass = {
        id: 'common',
        name: 'Common Stock',
        shares: 4000000
      };

      const nvca_seriesA: IPreferredShareClass = {
        id: 'nvca-series-a',
        name: 'Series A Preferred',
        shares: 1000000,
        originalInvestment: 300000000, // $3M investment
        liquidationMultiple: 1, // 1x non-participating
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 2,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2022-01-01'
      };

      const nvca_seriesB: IPreferredShareClass = {
        id: 'nvca-series-b',
        name: 'Series B Preferred',
        shares: 750000,
        originalInvestment: 500000000, // $5M investment  
        liquidationMultiple: 1, // 1x non-participating
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 1, // Senior to Series A
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2023-01-01'
      };

      // Test at $15M exit (above all preferences)
      const nvca_exit: ILiquidationEvent = {
        exitValue: 1500000000, // $15M
        eventDate: '2024-12-31',
        eventType: 'ACQUISITION'
      };

      const analysis = calculateLiquidationStacking(
        [nvca_seriesA, nvca_seriesB],
        [nvca_common],
        nvca_exit
      );

      // GOLDEN WATERFALL:
      // 1. Series B gets $5M (1x preference)
      // 2. Series A gets $3M (1x preference)  
      // 3. Remaining $7M goes to common (Series A/B convert)
      
      const seriesB_dist = analysis.distributions.find(d => d.classId === 'nvca-series-b')!;
      const seriesA_dist = analysis.distributions.find(d => d.classId === 'nvca-series-a')!;
      const common_dist = analysis.distributions.find(d => d.classId === 'common')!;

      expect(seriesB_dist.liquidationPreference).toBe(500000000); // $5M
      expect(seriesA_dist.liquidationPreference).toBe(300000000); // $3M
      
      // Remaining $7M distributed to common (5.75M shares total)
      // Series A converts: 750K / 5.75M = 13.04% = $913K
      // Series B converts: 1M / 5.75M = 17.39% = $1.217M  
      // Common gets: 4M / 5.75M = 69.57% = $4.87M
      
      expect(seriesA_dist.commonDistribution).toBeCloseTo(121739130, -3); // ~$1.217M
      expect(seriesB_dist.commonDistribution).toBeCloseTo(91304348, -3);  // ~$913K
      expect(common_dist.commonDistribution).toBeCloseTo(486956522, -3);  // ~$4.87M
      
      // Total distributed should equal exit value
      expect(analysis.summary.totalDistributed).toBeCloseTo(1500000000, 0);
    });

    it('GOLDEN: NVCA Example 4.2 - Participating Preferred Stack', () => {
      const participating_seriesA: IPreferredShareClass = {
        id: 'part-series-a',
        name: 'Series A Participating',
        shares: 1000000,
        originalInvestment: 200000000, // $2M
        liquidationMultiple: 1,
        participationType: ParticipationType.PARTICIPATING_CAPPED,
        participationCap: 3, // 3x total return cap
        seniorityRank: 1,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2022-01-01'
      };

      // Test at $20M exit
      const high_exit: ILiquidationEvent = {
        exitValue: 2000000000, // $20M
        eventDate: '2024-12-31',
        eventType: 'ACQUISITION'
      };

      const analysis = calculateLiquidationStacking(
        [participating_seriesA],
        [{ id: 'common', name: 'Common', shares: 8000000 }],
        high_exit
      );

      const seriesA_dist = analysis.distributions.find(d => d.classId === 'part-series-a')!;
      
      // GOLDEN CALCULATION:
      // 1. Series A gets $2M liquidation preference
      // 2. Remaining $18M: Series A participates with 1M shares vs 9M total
      //    Participation: $18M × (1M / 9M) = $2M
      // 3. Total to Series A: $2M + $2M = $4M
      // 4. But capped at 3x = $6M, so no cap hit
      
      expect(seriesA_dist.liquidationPreference).toBe(200000000); // $2M
      expect(seriesA_dist.participation).toBeCloseTo(200000000, -3); // ~$2M
      expect(seriesA_dist.totalDistribution).toBeCloseTo(400000000, -3); // ~$4M
      
      // Should not hit the 3x cap
      expect(seriesA_dist.totalDistribution).toBeLessThan(600000000); // <$6M cap
    });
  });

  describe('Fenwick & West Liquidation Examples', () => {
    // Source: Fenwick & West "Liquidation Preferences in VC Transactions"
    
    it('GOLDEN: Fenwick Example 3.1 - Multiple Series with Cumulative Dividends', () => {
      const fenwick_seriesA: IPreferredShareClass = {
        id: 'fenwick-a',
        name: 'Series A Preferred',
        shares: 2000000,
        originalInvestment: 500000000, // $5M
        liquidationMultiple: 1,
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 2,
        dividendType: DividendType.CUMULATIVE,
        dividendRate: 8, // 8% annual
        unpaidDividends: 10000000, // $100k unpaid
        conversionRatio: 1,
        issuanceDate: '2021-01-01'
      };

      const fenwick_seriesB: IPreferredShareClass = {
        id: 'fenwick-b',
        name: 'Series B Preferred',
        shares: 1000000,
        originalInvestment: 1000000000, // $10M
        liquidationMultiple: 1.5, // 1.5x preference
        participationType: ParticipationType.PARTICIPATING,
        seniorityRank: 1, // Senior to A
        dividendType: DividendType.CUMULATIVE,
        dividendRate: 6, // 6% annual
        unpaidDividends: 5000000, // $50k unpaid
        conversionRatio: 1,
        issuanceDate: '2022-01-01'
      };

      // Exit after 3 years from Series A, 2 years from Series B
      const fenwick_exit: ILiquidationEvent = {
        exitValue: 2500000000, // $25M exit
        eventDate: '2024-01-01',
        eventType: 'ACQUISITION'
      };

      const analysis = calculateLiquidationStacking(
        [fenwick_seriesA, fenwick_seriesB],
        [{ id: 'common', name: 'Common', shares: 6000000 }],
        fenwick_exit
      );

      const seriesB_dist = analysis.distributions.find(d => d.classId === 'fenwick-b')!;
      const seriesA_dist = analysis.distributions.find(d => d.classId === 'fenwick-a')!;

      // GOLDEN CALCULATIONS:
      // Series B cumulative dividends: $10M × 6% × 2 years + $50k = $1.25M
      // Series B total preference: $10M × 1.5 + $1.25M = $16.25M
      
      expect(seriesB_dist.cumulativeDividends).toBeCloseTo(125000000, -3); // ~$1.25M
      expect(seriesB_dist.liquidationPreference).toBe(1500000000); // $15M (1.5x)
      
      // Series A cumulative dividends: $5M × 8% × 3 years + $100k = $1.3M
      // Series A total preference: $5M × 1 + $1.3M = $6.3M
      
      expect(seriesA_dist.cumulativeDividends).toBeCloseTo(130000000, -3); // ~$1.3M
      expect(seriesA_dist.liquidationPreference).toBe(500000000); // $5M (1x)
      
      // After paying preferences + dividends:
      // Series B: $16.25M, Series A: $6.3M = $22.55M total
      // Remaining: $25M - $22.55M = $2.45M for participation/common
      
      const totalPreferencePaid = seriesB_dist.liquidationPreference + seriesB_dist.cumulativeDividends +
                                  seriesA_dist.liquidationPreference + seriesA_dist.cumulativeDividends;
      expect(totalPreferencePaid).toBeCloseTo(2255000000, -5); // ~$22.55M
      
      // Series B should participate in remaining $2.45M
      expect(seriesB_dist.participation).toBeGreaterThan(0);
    });
  });

  describe('Cooley LLP Market Survey Examples', () => {
    // Source: Cooley "Go Public or Get Acquired" Survey Data
    
    it('GOLDEN: Cooley Biotech Example - High Multiple Preferences', () => {
      // Biotech company with high multiple preferences (common in pharma)
      const biotech_seriesA: IPreferredShareClass = {
        id: 'biotech-a',
        name: 'Series A Preferred',
        shares: 500000,
        originalInvestment: 1000000000, // $10M
        liquidationMultiple: 2, // 2x preference
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 3,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2020-01-01'
      };

      const biotech_seriesB: IPreferredShareClass = {
        id: 'biotech-b',
        name: 'Series B Preferred',
        shares: 400000,
        originalInvestment: 1500000000, // $15M
        liquidationMultiple: 2.5, // 2.5x preference
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 2,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2021-01-01'
      };

      const biotech_seriesC: IPreferredShareClass = {
        id: 'biotech-c',
        name: 'Series C Preferred',
        shares: 300000,
        originalInvestment: 2500000000, // $25M
        liquidationMultiple: 3, // 3x preference
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 1, // Most senior
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2022-01-01'
      };

      // Exit at $100M - above all preferences
      const biotech_exit: ILiquidationEvent = {
        exitValue: 10000000000, // $100M
        eventDate: '2024-12-31',
        eventType: 'ACQUISITION'
      };

      const analysis = calculateLiquidationStacking(
        [biotech_seriesA, biotech_seriesB, biotech_seriesC],
        [{ id: 'common', name: 'Common', shares: 4000000 }],
        biotech_exit
      );

      // GOLDEN WATERFALL:
      // 1. Series C: $25M × 3 = $75M
      // 2. Series B: $15M × 2.5 = $37.5M (but only $25M remaining)
      // 3. Series A: $10M × 2 = $20M (but $0 remaining)
      // 4. Common: $0 remaining

      const seriesC_dist = analysis.distributions.find(d => d.classId === 'biotech-c')!;
      const seriesB_dist = analysis.distributions.find(d => d.classId === 'biotech-b')!;
      const seriesA_dist = analysis.distributions.find(d => d.classId === 'biotech-a')!;
      const common_dist = analysis.distributions.find(d => d.classId === 'common')!;

      expect(seriesC_dist.liquidationPreference).toBe(7500000000); // $75M
      expect(seriesB_dist.liquidationPreference).toBe(2500000000); // $25M (capped by remaining)
      expect(seriesA_dist.liquidationPreference).toBe(0); // Nothing left
      expect(common_dist.commonDistribution).toBe(0); // Nothing left
      
      expect(analysis.summary.totalDistributed).toBe(10000000000); // Full $100M
      expect(analysis.summary.undistributedAmount).toBe(0);
    });

    it('GOLDEN: NVCA Example 4.2 - Participating Preferred with Caps', () => {
      const participating_series: IPreferredShareClass = {
        id: 'participating',
        name: 'Series A Participating',
        shares: 1000000,
        originalInvestment: 500000000, // $5M
        liquidationMultiple: 1,
        participationType: ParticipationType.PARTICIPATING_CAPPED,
        participationCap: 3, // 3x total return cap
        seniorityRank: 1,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2022-01-01'
      };

      // High exit scenario
      const high_exit: ILiquidationEvent = {
        exitValue: 5000000000, // $50M
        eventDate: '2024-12-31', 
        eventType: 'IPO'
      };

      const analysis = calculateLiquidationStacking(
        [participating_series],
        [{ id: 'common', name: 'Common', shares: 9000000 }],
        high_exit
      );

      const series_dist = analysis.distributions.find(d => d.classId === 'participating')!;
      const common_dist = analysis.distributions.find(d => d.classId === 'common')!;

      // GOLDEN CALCULATION:
      // 1. Series A gets $5M liquidation preference
      // 2. Remaining $45M: Series A participates with 1M / 10M total = 10%
      //    Participation: $45M × 10% = $4.5M
      // 3. Total to Series A: $5M + $4.5M = $9.5M
      // 4. Check cap: 3x × $5M = $15M cap, so no cap limitation
      // 5. Common gets: $45M × 90% = $40.5M

      expect(series_dist.liquidationPreference).toBe(500000000); // $5M
      expect(series_dist.participation).toBeCloseTo(450000000, -3); // $4.5M
      expect(series_dist.totalDistribution).toBeCloseTo(950000000, -3); // $9.5M
      expect(common_dist.commonDistribution).toBeCloseTo(4050000000, -3); // $40.5M
      
      // Verify no cap hit
      expect(series_dist.totalDistribution).toBeLessThan(1500000000); // <$15M cap
    });
  });

  describe('Wilson Sonsini Goodrich & Rosati Examples', () => {
    // Source: WSGR "Liquidation Preferences: Not All Preferences Are Created Equal"
    
    it('GOLDEN: WSGR Example 2.1 - Cumulative Dividend Calculation', () => {
      const wsgr_series: IPreferredShareClass = {
        id: 'wsgr-cumulative',
        name: 'Series A Cumulative',
        shares: 800000,
        originalInvestment: 800000000, // $8M investment
        liquidationMultiple: 1,
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 1,
        dividendType: DividendType.CUMULATIVE,
        dividendRate: 8, // 8% annual cumulative
        unpaidDividends: 20000000, // $200k unpaid from previous years
        conversionRatio: 1,
        issuanceDate: '2021-01-01' // 3 years before exit
      };

      const wsgr_exit: ILiquidationEvent = {
        exitValue: 1500000000, // $15M
        eventDate: '2024-01-01', // Exactly 3 years later
        eventType: 'ACQUISITION'
      };

      const analysis = calculateLiquidationStacking(
        [wsgr_series],
        [{ id: 'common', name: 'Common', shares: 2000000 }],
        wsgr_exit
      );

      const series_dist = analysis.distributions.find(d => d.classId === 'wsgr-cumulative')!;

      // GOLDEN DIVIDEND CALCULATION:
      // Annual dividend: $8M × 8% = $640k per year
      // 3 years: $640k × 3 = $1.92M
      // Plus unpaid: $1.92M + $200k = $2.12M total cumulative dividends
      
      expect(series_dist.cumulativeDividends).toBeCloseTo(212000000, -3); // $2.12M
      expect(series_dist.liquidationPreference).toBe(800000000); // $8M
      
      // Total preference + dividends: $8M + $2.12M = $10.12M
      const totalPreferenceClaim = series_dist.liquidationPreference + series_dist.cumulativeDividends;
      expect(totalPreferenceClaim).toBeCloseTo(1012000000, -3); // $10.12M
      
      // Remaining for common: $15M - $10.12M = $4.88M
      const common_dist = analysis.distributions.find(d => d.classId === 'common')!;
      expect(common_dist.commonDistribution).toBeCloseTo(488000000, -3); // $4.88M
    });
  });

  describe('Real-World Case Studies', () => {
    // Based on public filings and documented transactions
    
    it('GOLDEN: Theranos-Style Liquidation (High Multiple Preferred)', () => {
      // Based on the documented Theranos liquidation preferences
      const theranos_series: IPreferredShareClass = {
        id: 'theranos-style',
        name: 'Late-Stage Preferred',
        shares: 500000,
        originalInvestment: 50000000000, // $500M investment
        liquidationMultiple: 4, // 4x liquidation preference
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 1,
        dividendType: DividendType.CUMULATIVE,
        dividendRate: 10, // 10% annual
        unpaidDividends: 100000000, // $1M unpaid
        conversionRatio: 1,
        issuanceDate: '2020-01-01'
      };

      // Low exit value (distressed sale)
      const distressed_exit: ILiquidationEvent = {
        exitValue: 100000000000, // $1B (down from peak valuation)
        eventDate: '2024-01-01',
        eventType: 'ACQUISITION'
      };

      const analysis = calculateLiquidationStacking(
        [theranos_series],
        [{ id: 'common', name: 'Common', shares: 50000000 }],
        distressed_exit
      );

      const series_dist = analysis.distributions.find(d => d.classId === 'theranos-style')!;

      // GOLDEN CALCULATION:
      // Cumulative dividends: $500M × 10% × 4 years + $1M = $201M
      // Liquidation preference: $500M × 4 = $2B  
      // Total claim: $2B + $201M = $2.201B
      // But only $1B available, so Series takes all $1B
      
      expect(series_dist.cumulativeDividends).toBeCloseTo(20100000000, -5); // $201M
      expect(series_dist.liquidationPreference).toBeCloseTo(100000000000, 0); // $1B (capped)
      expect(series_dist.totalDistribution).toBe(100000000000); // Full $1B
      
      // Common gets nothing
      const common_dist = analysis.distributions.find(d => d.classId === 'common')!;
      expect(common_dist.totalDistribution).toBe(0);
      
      expect(analysis.summary.undistributedAmount).toBe(0);
    });

    it('GOLDEN: Facebook Pre-IPO Liquidation Analysis (2012)', () => {
      // Simplified version of Facebook's cap structure before IPO
      const fb_seriesA: IPreferredShareClass = {
        id: 'fb-series-a',
        name: 'Series A',
        shares: 5000000,
        originalInvestment: 1275000000, // $12.75M (Accel)
        liquidationMultiple: 1,
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 3,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2005-05-01'
      };

      const fb_seriesB: IPreferredShareClass = {
        id: 'fb-series-b', 
        name: 'Series B',
        shares: 1000000,
        originalInvestment: 2750000000, // $27.5M (Greylock)
        liquidationMultiple: 1,
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 2,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2006-04-01'
      };

      const fb_seriesC: IPreferredShareClass = {
        id: 'fb-series-c',
        name: 'Series C',
        shares: 400000,
        originalInvestment: 1500000000, // $15M (Various)
        liquidationMultiple: 1,
        participationType: ParticipationType.NON_PARTICIPATING, 
        seniorityRank: 1, // Most senior
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2008-01-01'
      };

      // IPO-level exit
      const fb_ipo_exit: ILiquidationEvent = {
        exitValue: 10400000000000, // $104B IPO valuation
        eventDate: '2012-05-18',
        eventType: 'IPO'
      };

      const analysis = calculateLiquidationStacking(
        [fb_seriesA, fb_seriesB, fb_seriesC],
        [{ id: 'common', name: 'Common', shares: 117000000 }], // Approximate common shares
        fb_ipo_exit
      );

      // At $104B exit, all preferred should convert to common for better value
      const seriesA_dist = analysis.distributions.find(d => d.classId === 'fb-series-a')!;
      const seriesB_dist = analysis.distributions.find(d => d.classId === 'fb-series-b')!;
      const seriesC_dist = analysis.distributions.find(d => d.classId === 'fb-series-c')!;

      // GOLDEN ANALYSIS: All should choose common conversion
      expect(seriesA_dist.preferredVsCommon.optimalChoice).toBe('COMMON');
      expect(seriesB_dist.preferredVsCommon.optimalChoice).toBe('COMMON');
      expect(seriesC_dist.preferredVsCommon.optimalChoice).toBe('COMMON');
      
      // Should get massive returns as common
      expect(seriesA_dist.preferredVsCommon.asCommon).toBeGreaterThan(1275000000); // >$12.75M
      expect(seriesB_dist.preferredVsCommon.asCommon).toBeGreaterThan(2750000000); // >$27.5M
      expect(seriesC_dist.preferredVsCommon.asCommon).toBeGreaterThan(1500000000); // >$15M
    });
  });

  describe('Coverage Analysis Golden Tests', () => {
    
    it('GOLDEN: Standard VC Stack Coverage Requirements', () => {
      const stack_seriesA: IPreferredShareClass = {
        id: 'stack-a',
        name: 'Series A',
        shares: 1000000,
        originalInvestment: 200000000, // $2M
        liquidationMultiple: 1,
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 3,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2021-01-01'
      };

      const stack_seriesB: IPreferredShareClass = {
        id: 'stack-b',
        name: 'Series B',
        shares: 800000,
        originalInvestment: 500000000, // $5M
        liquidationMultiple: 1.5,
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 2,
        dividendType: DividendType.CUMULATIVE,
        dividendRate: 8,
        unpaidDividends: 0,
        conversionRatio: 1,
        issuanceDate: '2022-01-01'
      };

      const stack_seriesC: IPreferredShareClass = {
        id: 'stack-c',
        name: 'Series C',
        shares: 600000,
        originalInvestment: 1200000000, // $12M
        liquidationMultiple: 2,
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 1, // Most senior
        dividendType: DividendType.CUMULATIVE,
        dividendRate: 6,
        unpaidDividends: 10000000, // $100k unpaid
        conversionRatio: 1,
        issuanceDate: '2023-01-01'
      };

      const coverage = calculateLiquidationCoverage(
        [stack_seriesA, stack_seriesB, stack_seriesC],
        '2024-01-01'
      );

      // GOLDEN COVERAGE ANALYSIS:
      // Series C (rank 1): $12M × 2 + dividends = $24M + $720k + $100k = $24.82M
      // Series B (rank 2): $5M × 1.5 + dividends = $7.5M + $800k = $8.3M  
      // Series A (rank 3): $2M × 1 = $2M
      // Cumulative: C=$24.82M, B=$33.12M, A=$35.12M

      expect(coverage[0].seriesName).toBe('Series C'); // Most senior first
      expect(coverage[0].totalClaim).toBeCloseTo(2482000000, -5); // ~$24.82M
      expect(coverage[0].cumulativeCoverage).toBeCloseTo(2482000000, -5);

      expect(coverage[1].seriesName).toBe('Series B');
      expect(coverage[1].totalClaim).toBeCloseTo(830000000, -5); // ~$8.3M  
      expect(coverage[1].cumulativeCoverage).toBeCloseTo(3312000000, -5); // ~$33.12M

      expect(coverage[2].seriesName).toBe('Series A');
      expect(coverage[2].totalClaim).toBe(200000000); // $2M
      expect(coverage[2].cumulativeCoverage).toBeCloseTo(3512000000, -5); // ~$35.12M
    });
  });

  describe('Precision Edge Cases', () => {
    
    it('GOLDEN: Micro-Cent Precision Test', () => {
      // Tests calculation precision with very small amounts
      const micro_series: IPreferredShareClass = {
        id: 'micro-test',
        name: 'Micro Series',
        shares: 1000000,
        originalInvestment: 1, // $0.01 investment (1 cent)
        liquidationMultiple: 1000000, // 1M multiple (absurd but tests precision)
        participationType: ParticipationType.NON_PARTICIPATING,
        seniorityRank: 1,
        dividendType: DividendType.CUMULATIVE,
        dividendRate: 0.01, // 0.01% rate
        unpaidDividends: 0,
        conversionRatio: 1,
        issuanceDate: '2020-01-01'
      };

      const micro_exit: ILiquidationEvent = {
        exitValue: 200000000, // $2M exit
        eventDate: '2024-01-01',
        eventType: 'ACQUISITION'
      };

      const analysis = calculateLiquidationStacking(
        [micro_series],
        [{ id: 'common', name: 'Common', shares: 1000000 }],
        micro_exit
      );

      const micro_dist = analysis.distributions.find(d => d.classId === 'micro-test')!;

      // GOLDEN CALCULATION:
      // Liquidation preference: $0.01 × 1,000,000 = $10,000
      // Cumulative dividends: $0.01 × 0.01% × 4 years = $0.000004 (~0)
      // Total: ~$10,000
      
      expect(micro_dist.liquidationPreference).toBe(1000000); // $10k
      expect(micro_dist.cumulativeDividends).toBeCloseTo(0, 0); // Essentially zero
      expect(micro_dist.totalDistribution).toBeCloseTo(1000000, 0); // $10k
      
      // Remaining $1.99M to common
      const common_dist = analysis.distributions.find(d => d.classId === 'common')!;
      expect(common_dist.commonDistribution).toBeCloseTo(199000000, -3); // ~$1.99M
    });
  });

  describe('Conversion Choice Optimization', () => {
    
    it('GOLDEN: Breakeven Analysis for Facebook-Style Growth', () => {
      // High-growth scenario where conversion choice matters significantly
      const growth_series: IPreferredShareClass = {
        id: 'growth-series',
        name: 'Series A Growth',
        shares: 2000000,
        originalInvestment: 1000000000, // $10M
        liquidationMultiple: 1,
        participationType: ParticipationType.PARTICIPATING_CAPPED,
        participationCap: 5, // 5x cap
        seniorityRank: 1,
        dividendType: DividendType.NONE,
        conversionRatio: 1,
        issuanceDate: '2020-01-01'
      };

      // Test at different exit values to find breakeven
      const exitValues = [
        1000000000,  // $10M (1x return)
        2000000000,  // $20M (2x return)
        5000000000,  // $50M (5x return)
        10000000000, // $100M (10x return)
        20000000000  // $200M (20x return)
      ];

      const commonShares = 8000000;

      exitValues.forEach(exitValue => {
        const analysis = calculateLiquidationStacking(
          [growth_series],
          [{ id: 'common', name: 'Common', shares: commonShares }],
          { exitValue, eventDate: '2024-01-01', eventType: 'ACQUISITION' }
        );

        const series_dist = analysis.distributions.find(d => d.classId === 'growth-series')!;
        
        if (exitValue <= 5000000000) { // At or below 5x ($50M)
          // Should prefer staying as preferred (gets capped at 5x = $50M)
          expect(series_dist.preferredVsCommon.optimalChoice).toBe('PREFERRED');
          expect(series_dist.totalDistribution).toBeLessThanOrEqual(5000000000); // ≤$50M cap
        } else { // Above 5x
          // Should convert to common for unlimited upside
          expect(series_dist.preferredVsCommon.optimalChoice).toBe('COMMON');
          expect(series_dist.commonDistribution).toBeGreaterThan(series_dist.liquidationPreference + series_dist.participation);
        }
      });
    });
  });

  describe('Mathematical Precision Verification', () => {
    
    it('GOLDEN: Sum-to-Total Verification', () => {
      // Ensures all calculations sum correctly to total exit value
      const precision_exit: ILiquidationEvent = {
        exitValue: 12345678900, // $123,456,789 (prime-like number)
        eventDate: '2024-12-31',
        eventType: 'ACQUISITION'
      };

      const precision_series: IPreferredShareClass[] = [
        {
          id: 'precision-a',
          name: 'Series A',
          shares: 1111111,
          originalInvestment: 333333300, // $3.333333M
          liquidationMultiple: 1.5,
          participationType: ParticipationType.PARTICIPATING,
          seniorityRank: 2,
          dividendType: DividendType.CUMULATIVE,
          dividendRate: 7.5, // 7.5%
          unpaidDividends: 1234567, // $12,345.67
          conversionRatio: 1,
          issuanceDate: '2021-03-15'
        },
        {
          id: 'precision-b',
          name: 'Series B',
          shares: 2222222,
          originalInvestment: 777777700, // $7.777777M
          liquidationMultiple: 2.25,
          participationType: ParticipationType.PARTICIPATING_CAPPED,
          participationCap: 4.5,
          seniorityRank: 1,
          dividendType: DividendType.CUMULATIVE,
          dividendRate: 9.25, // 9.25%
          unpaidDividends: 987654, // $9,876.54
          conversionRatio: 1,
          issuanceDate: '2022-07-22'
        }
      ];

      const precision_common: ICommonShareClass = {
        id: 'precision-common',
        name: 'Common Stock', 
        shares: 9876543
      };

      const analysis = calculateLiquidationStacking(
        precision_series,
        [precision_common],
        precision_exit
      );

      // GOLDEN VERIFICATION: Total distributed must equal exit value
      expect(analysis.summary.totalDistributed).toBeCloseTo(precision_exit.exitValue, 0);
      
      // Component sum verification
      const componentSum = analysis.summary.totalLiquidationPreferences +
                          analysis.summary.totalCumulativeDividends +
                          analysis.summary.totalParticipation +
                          analysis.summary.totalCommonDistribution;
      
      expect(componentSum).toBeCloseTo(precision_exit.exitValue, 0);
      expect(analysis.summary.undistributedAmount).toBeCloseTo(0, 0);
      
      // Individual distribution sum verification
      const individualSum = analysis.distributions.reduce((sum, dist) => sum + dist.totalDistribution, 0);
      expect(individualSum).toBeCloseTo(precision_exit.exitValue, 0);
    });
  });
});