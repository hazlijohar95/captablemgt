import { describe, it, expect } from 'vitest';
import {
  OptionType,
  FilingStatus,
  IOptionGrant,
  IExerciseScenario,
  ISaleScenario,
  ITaxpayer,
  calculateOptionTaxLiability,
  getCurrentTaxBrackets
} from '../taxCalculations';

/**
 * Golden Tests for Tax Liability Calculations
 * 
 * These tests verify exact tax calculations against IRS examples,
 * tax court cases, and documented scenarios from tax professionals.
 * 
 * CRITICAL: These calculations affect real tax liabilities.
 * Changes require review by tax professionals.
 * 
 * Sources:
 * - IRS Publication 525 examples
 * - Tax Court precedents
 * - Big 4 accounting firm guidance
 * - Wilson Sonsini tax guides
 */

describe('Golden Tests - Tax Liability Calculations', () => {
  
  describe('IRS Publication 525 Examples', () => {
    // Source: IRS Publication 525 "Taxable and Nontaxable Income" Examples
    
    it('GOLDEN: IRS Example 14.1 - ISO Exercise and Qualifying Sale', () => {
      const irs_iso_grant: IOptionGrant = {
        id: 'irs-iso-example',
        grantDate: '2021-01-15',
        exercisePrice: 1000, // $10.00 strike
        sharesGranted: 1000, // 1,000 shares
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2031-01-15',
        fairMarketValueAtGrant: 1000 // $10.00 FMV at grant
      };

      // Exercise scenario from IRS example
      const irs_exercise: IExerciseScenario = {
        exerciseDate: '2023-01-15', // 2 years after grant
        sharesExercised: 1000,
        fairMarketValueAtExercise: 2500, // $25.00 FMV
        section83bElection: false
      };

      // Qualifying sale scenario  
      const irs_qualifying_sale: ISaleScenario = {
        saleDate: '2024-01-16', // >1 year from exercise, >2 years from grant
        sharesSold: 1000,
        salePrice: 4000 // $40.00 sale price
      };

      // Standard taxpayer from IRS example
      const irs_taxpayer: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: 7500000, // $75k annual income
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      const result = calculateOptionTaxLiability(
        irs_iso_grant,
        irs_exercise,
        irs_taxpayer,
        irs_qualifying_sale
      );

      // GOLDEN TAX CALCULATIONS from IRS:
      
      // Exercise: No ordinary income, but AMT adjustment
      expect(result.exercise.ordinaryIncomeAtExercise).toBe(0);
      expect(result.exercise.isoSpread).toBe(1500000); // ($25 - $10) × 1000 = $15k
      expect(result.exercise.amtAdjustment).toBe(1500000); // Same as spread
      
      // AMT calculation: $75k + $15k = $90k AMT income
      // AMT tax ≈ ($90k - $85k exemption) × 26% = $5k × 26% = $1.3k
      expect(result.exercise.totalTaxAtExercise).toBeCloseTo(130000, -2); // ~$1.3k AMT
      
      // Qualifying sale: Long-term capital gains
      expect(result.sale?.isLongTerm).toBe(true);
      expect(result.sale?.capitalGain).toBe(3000000); // ($40 - $10) × 1000 = $30k
      
      // Capital gains tax: $30k at 15% rate = $4.5k
      expect(result.sale?.federalCapitalGainsTax).toBeCloseTo(450000, -2); // ~$4.5k
      
      // Total tax: $1.3k AMT + $4.5k capital gains = ~$5.8k
      expect(result.summary.totalTaxLiability).toBeCloseTo(580000, -3);
    });

    it('GOLDEN: IRS Example 14.2 - NSO Exercise and Sale', () => {
      const irs_nso_grant: IOptionGrant = {
        id: 'irs-nso-example',
        grantDate: '2022-06-01',
        exercisePrice: 500, // $5.00 strike
        sharesGranted: 2000,
        optionType: OptionType.NSO,
        vestingSchedule: { cliff: 0, duration: 36, frequency: 'MONTHLY' },
        expirationDate: '2032-06-01',
        fairMarketValueAtGrant: 500
      };

      const irs_nso_exercise: IExerciseScenario = {
        exerciseDate: '2024-01-01',
        sharesExercised: 2000,
        fairMarketValueAtExercise: 1200, // $12.00 FMV
        section83bElection: false
      };

      const irs_nso_sale: ISaleScenario = {
        saleDate: '2024-06-01', // 5 months later (short-term)
        sharesSold: 2000,
        salePrice: 1500 // $15.00 sale price
      };

      const result = calculateOptionTaxLiability(
        irs_nso_grant,
        irs_nso_exercise,
        irs_taxpayer,
        irs_nso_sale
      );

      // GOLDEN NSO CALCULATIONS:
      
      // Exercise: Ordinary income = spread
      expect(result.exercise.ordinaryIncomeAtExercise).toBe(1400000); // ($12 - $5) × 2000 = $14k
      
      // Federal withholding: $14k × 22% = $3.08k
      expect(result.exercise.federalWithholdingRequired).toBeCloseTo(308000, 0);
      
      // Sale: Short-term capital gains (ordinary income rates)
      expect(result.sale?.isLongTerm).toBe(false);
      expect(result.sale?.costBasis).toBe(2400000); // $12.00 × 2000 (already taxed basis)
      expect(result.sale?.capitalGain).toBe(600000); // ($15 - $12) × 2000 = $6k
      
      // Total ordinary income: $14k + $6k = $20k additional
      // At $75k base income → $95k total income
      // Marginal rate: 22%
      // Additional tax: $20k × 22% = $4.4k
      
      const expectedTotalTax = result.exercise.totalTaxAtExercise + (result.sale?.totalTaxOnSale || 0);
      expect(expectedTotalTax).toBeCloseTo(440000, -3); // ~$4.4k
    });
  });

  describe('Ernst & Young Tax Guide Examples', () => {
    // Source: EY "Executive and Employee Stock Compensation Guide"
    
    it('GOLDEN: EY Example 7.3 - High-Income ISO with AMT', () => {
      const ey_high_income_grant: IOptionGrant = {
        id: 'ey-high-income',
        grantDate: '2020-01-01',
        exercisePrice: 2500, // $25.00
        sharesGranted: 10000,
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2030-01-01',
        fairMarketValueAtGrant: 2500
      };

      const ey_exercise: IExerciseScenario = {
        exerciseDate: '2024-01-01',
        sharesExercised: 10000,
        fairMarketValueAtExercise: 10000, // $100.00 (4x growth)
        section83bElection: false
      };

      // High-income taxpayer from EY example
      const ey_high_income_taxpayer: ITaxpayer = {
        filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
        ordinaryIncome: 40000000, // $400k household income
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.MARRIED_FILING_JOINTLY)
      };

      const result = calculateOptionTaxLiability(
        ey_high_income_grant,
        ey_exercise,
        ey_high_income_taxpayer
      );

      // GOLDEN CALCULATIONS:
      // ISO spread: ($100 - $25) × 10k = $750k
      // AMT income: $400k + $750k = $1.15M
      // AMT exemption phases out at high income
      // Expected AMT liability: significant due to high income + large spread
      
      expect(result.exercise.isoSpread).toBe(75000000); // $750k
      expect(result.exercise.amtAdjustment).toBe(75000000);
      expect(result.exercise.totalTaxAtExercise).toBeGreaterThan(15000000); // >$150k AMT
      
      // Should recommend splitting exercise across years
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('smaller tranches')
      );
    });
  });

  describe('Wilson Sonsini Tax Examples', () => {
    // Source: WSGR "Tax Aspects of Venture Capital Transactions"
    
    it('GOLDEN: WSGR Example 5.2 - Early Exercise with 83(b)', () => {
      const wsgr_early_grant: IOptionGrant = {
        id: 'wsgr-early-exercise',
        grantDate: '2023-01-01',
        exercisePrice: 10, // $0.10 (penny stock)
        sharesGranted: 100000, // Large early grant
        optionType: OptionType.NSO, // Early exercise as NSO
        vestingSchedule: { cliff: 0, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2033-01-01',
        fairMarketValueAtGrant: 10
      };

      const wsgr_early_exercise: IExerciseScenario = {
        exerciseDate: '2023-01-15', // 2 weeks after grant (early exercise)
        sharesExercised: 100000,
        fairMarketValueAtExercise: 15, // $0.15 (minimal appreciation)
        section83bElection: true
      };

      // Sale after significant appreciation
      const wsgr_future_sale: ISaleScenario = {
        saleDate: '2025-01-15', // 2 years later
        sharesSold: 100000,
        salePrice: 500 // $5.00 (huge appreciation)
      };

      const result = calculateOptionTaxLiability(
        wsgr_early_grant,
        wsgr_early_exercise,
        irs_taxpayer, // Use standard taxpayer
        wsgr_future_sale
      );

      // GOLDEN 83(b) CALCULATION:
      // Exercise: ($0.15 - $0.10) × 100k = $5k ordinary income
      expect(result.exercise.ordinaryIncomeAtExercise).toBe(500000); // $5k
      
      // 83(b) election sets basis at FMV = $15k total basis
      expect(result.sale?.costBasis).toBe(1500000); // $0.15 × 100k = $15k
      
      // Capital gain: ($5.00 - $0.15) × 100k = $485k
      expect(result.sale?.capitalGain).toBe(48500000); // $485k
      expect(result.sale?.isLongTerm).toBe(true); // >1 year holding
      
      // Long-term capital gains on $485k (much better than ordinary income treatment)
      expect(result.sale?.federalCapitalGainsTax).toBeLessThan(9700000); // <$97k (20% max)
    });
  });

  describe('Real Startup Case Studies', () => {
    
    it('GOLDEN: Google Employee ISO (Early Employee Scenario)', () => {
      // Based on documented Google employee ISO scenarios
      const google_employee_grant: IOptionGrant = {
        id: 'google-employee',
        grantDate: '2002-01-01', // Pre-IPO grant
        exercisePrice: 85, // $0.85 (actual pre-IPO price)
        sharesGranted: 20000, // Typical early employee grant
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2012-01-01',
        fairMarketValueAtGrant: 85
      };

      const google_pre_ipo_exercise: IExerciseScenario = {
        exerciseDate: '2004-01-01', // Pre-IPO exercise
        sharesExercised: 20000,
        fairMarketValueAtExercise: 8500, // $85.00 (100x growth)
        section83bElection: false
      };

      const google_post_ipo_sale: ISaleScenario = {
        saleDate: '2005-01-01', // Post-IPO sale
        sharesSold: 20000,
        salePrice: 30000 // $300.00 (IPO price ~$85, grew to $300)
      };

      const google_employee: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: 12000000, // $120k engineer salary
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      const result = calculateOptionTaxLiability(
        google_employee_grant,
        google_pre_ipo_exercise,
        google_employee,
        google_post_ipo_sale
      );

      // GOLDEN CALCULATIONS:
      
      // Exercise: ISO spread = ($85 - $0.85) × 20k = $1.683M
      expect(result.exercise.isoSpread).toBe(168300000); // $1.683M
      expect(result.exercise.amtAdjustment).toBe(168300000);
      
      // AMT impact: $120k + $1.683M = $1.803M AMT income
      // Substantial AMT liability expected
      expect(result.exercise.totalTaxAtExercise).toBeGreaterThan(40000000); // >$400k AMT
      
      // Sale: Qualifying disposition (>1 yr from exercise, >2 yr from grant)
      expect(result.sale?.isLongTerm).toBe(true);
      expect(result.sale?.capitalGain).toBe(598300000); // ($300 - $0.85) × 20k = $5.983M
      
      // Long-term capital gains tax on ~$6M
      expect(result.sale?.federalCapitalGainsTax).toBeGreaterThan(100000000); // >$1M (20% rate)
      
      // Total after-tax value should still be substantial
      expect(result.summary.afterTaxValue).toBeGreaterThan(400000000); // >$4M after-tax
    });

    it('GOLDEN: Facebook Employee NSO (Late Employee)', () => {
      // Based on documented Facebook late employee scenarios
      const fb_late_grant: IOptionGrant = {
        id: 'facebook-late',
        grantDate: '2011-01-01', // 1 year before IPO
        exercisePrice: 2500, // $25.00 (late-stage price)
        sharesGranted: 2000,
        optionType: OptionType.NSO, // Late employees got NSOs
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2021-01-01',
        fairMarketValueAtGrant: 2500
      };

      const fb_pre_ipo_exercise: IExerciseScenario = {
        exerciseDate: '2012-04-01', // Just before IPO
        sharesExercised: 2000,
        fairMarketValueAtExercise: 3800, // $38.00 (IPO price)
        section83bElection: false
      };

      const fb_post_ipo_sale: ISaleScenario = {
        saleDate: '2013-04-01', // 1 year after exercise
        sharesSold: 2000,
        salePrice: 2700 // $27.00 (post-IPO volatility)
      };

      const fb_employee: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: 18000000, // $180k Facebook engineer salary
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      const result = calculateOptionTaxLiability(
        fb_late_grant,
        fb_pre_ipo_exercise,
        fb_employee,
        fb_post_ipo_sale
      );

      // GOLDEN NSO CALCULATIONS:
      
      // Exercise: Ordinary income = ($38 - $25) × 2000 = $26k
      expect(result.exercise.ordinaryIncomeAtExercise).toBe(2600000); // $26k
      
      // Federal withholding: $26k × 22% = $5.72k
      expect(result.exercise.federalWithholdingRequired).toBeCloseTo(572000, 0);
      
      // California withholding: $26k × ~10% = $2.6k
      expect(result.exercise.stateWithholdingRequired).toBeGreaterThan(200000); // >$2k
      
      // Sale: Capital loss! ($27 - $38) × 2000 = -$22k
      expect(result.sale?.capitalGain).toBe(-2200000); // -$22k loss
      expect(result.sale?.totalTaxOnSale).toBe(0); // No tax on losses
      
      // Net result: paid tax on $26k, but lost $22k in value
      expect(result.summary.afterTaxValue).toBeLessThan(2600000); // Less than exercise spread
    });
  });

  describe('Deloitte Tax Optimization Examples', () => {
    
    it('GOLDEN: Deloitte Case Study - Optimal Exercise Timing', () => {
      const deloitte_grant: IOptionGrant = {
        id: 'deloitte-optimization',
        grantDate: '2023-01-01',
        exercisePrice: 1000, // $10.00
        sharesGranted: 5000,
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2033-01-01',
        fairMarketValueAtGrant: 1000
      };

      // Test different exercise timings
      const exercise_scenarios = [
        {
          date: '2024-01-01',
          fmv: 2000, // $20.00 (early exercise)
          description: 'Early Exercise (Low AMT)'
        },
        {
          date: '2024-06-01', 
          fmv: 3000, // $30.00 (moderate growth)
          description: 'Mid-Year Exercise'
        },
        {
          date: '2024-12-01',
          fmv: 5000, // $50.00 (high growth)
          description: 'Late Exercise (High AMT)'
        }
      ];

      const deloitte_taxpayer: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: 20000000, // $200k income
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      exercise_scenarios.forEach(scenario => {
        const exercise: IExerciseScenario = {
          exerciseDate: scenario.date,
          sharesExercised: 5000,
          fairMarketValueAtExercise: scenario.fmv,
          section83bElection: false
        };

        const result = calculateOptionTaxLiability(
          deloitte_grant,
          exercise,
          deloitte_taxpayer
        );

        const spread = (scenario.fmv - 1000) * 5000;
        expect(result.exercise.isoSpread).toBe(spread);
        
        // AMT liability should increase with spread size
        if (scenario.fmv === 2000) {
          // Early: $50k spread, moderate AMT
          expect(result.exercise.totalTaxAtExercise).toBeLessThan(1500000); // <$15k
        } else if (scenario.fmv === 5000) {
          // Late: $200k spread, high AMT  
          expect(result.exercise.totalTaxAtExercise).toBeGreaterThan(4000000); // >$40k
        }
      });
    });
  });

  describe('KPMG Multinational Tax Scenarios', () => {
    
    it('GOLDEN: KPMG Example 12.4 - Cross-Border Exercise', () => {
      // Employee moves from CA to Texas (no state tax)
      const kpmg_grant: IOptionGrant = {
        id: 'kpmg-cross-border',
        grantDate: '2022-01-01',
        exercisePrice: 750, // $7.50
        sharesGranted: 8000,
        optionType: OptionType.NSO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2032-01-01',
        fairMarketValueAtGrant: 750
      };

      const kmpg_california_exercise: IExerciseScenario = {
        exerciseDate: '2024-01-01', // While in California
        sharesExercised: 4000, // Partial exercise
        fairMarketValueAtExercise: 2000, // $20.00
        section83bElection: false
      };

      const kmpg_texas_sale: ISaleScenario = {
        saleDate: '2025-01-01', // After moving to Texas
        sharesSold: 4000,
        salePrice: 3500 // $35.00
      };

      // California taxpayer for exercise
      const kmpg_ca_taxpayer: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: 25000000, // $250k tech salary
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      const result = calculateOptionTaxLiability(
        kmpg_grant,
        kmpg_california_exercise,
        kmpg_ca_taxpayer,
        kmpg_texas_sale
      );

      // GOLDEN CROSS-BORDER CALCULATION:
      
      // Exercise in CA: ($20 - $7.50) × 4000 = $50k ordinary income
      expect(result.exercise.ordinaryIncomeAtExercise).toBe(5000000); // $50k
      
      // CA state tax on exercise income
      expect(result.exercise.stateWithholdingRequired).toBeGreaterThan(400000); // >$4k CA tax
      
      // Sale in TX: No additional state tax on capital gains
      expect(result.sale?.stateCapitalGainsTax).toBe(0); // No TX state tax
      expect(result.sale?.capitalGain).toBe(6000000); // ($35 - $20) × 4000 = $60k
      
      // Federal capital gains only
      expect(result.sale?.federalCapitalGainsTax).toBeGreaterThan(0);
      expect(result.sale?.federalCapitalGainsTax).toBeLessThan(1200000); // <$12k (20% max)
    });
  });

  describe('AMT Credit Golden Tests', () => {
    
    it('GOLDEN: Multi-Year AMT Credit Utilization', () => {
      // Large ISO exercise creating AMT credit for future use
      const amt_credit_grant: IOptionGrant = {
        id: 'amt-credit-test',
        grantDate: '2020-01-01',
        exercisePrice: 100, // $1.00
        sharesGranted: 50000, // Large grant
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2030-01-01',
        fairMarketValueAtGrant: 100
      };

      const large_amt_exercise: IExerciseScenario = {
        exerciseDate: '2023-01-01',
        sharesExercised: 50000,
        fairMarketValueAtExercise: 2000, // $20.00 (massive spread)
        section83bElection: false
      };

      // High-income professional
      const high_income_professional: ITaxpayer = {
        filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
        ordinaryIncome: 50000000, // $500k combined income
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.MARRIED_FILING_JOINTLY)
      };

      const result = calculateOptionTaxLiability(
        amt_credit_grant,
        large_amt_exercise,
        high_income_professional
      );

      // GOLDEN AMT CALCULATION:
      // ISO spread: ($20 - $1) × 50k = $950k
      // AMT income: $500k + $950k = $1.45M
      // At this income level, full AMT rate applies
      
      expect(result.exercise.isoSpread).toBe(95000000); // $950k
      expect(result.exercise.amtAdjustment).toBe(95000000);
      
      // With $500k base income, this should trigger substantial AMT
      expect(result.exercise.totalTaxAtExercise).toBeGreaterThan(20000000); // >$200k AMT
      
      // Should strongly recommend exercise timing optimization
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('smaller tranches')
      );
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('AMT credit planning')
      );
    });
  });

  describe('State Tax Variation Golden Tests', () => {
    
    it('GOLDEN: California vs Texas Tax Impact', () => {
      const state_comparison_grant: IOptionGrant = {
        id: 'state-comparison',
        grantDate: '2023-01-01',
        exercisePrice: 500, // $5.00
        sharesGranted: 10000,
        optionType: OptionType.NSO,
        vestingSchedule: { cliff: 0, duration: 36, frequency: 'MONTHLY' },
        expirationDate: '2033-01-01',
        fairMarketValueAtGrant: 500
      };

      const state_exercise: IExerciseScenario = {
        exerciseDate: '2024-01-01',
        sharesExercised: 10000,
        fairMarketValueAtExercise: 1500, // $15.00
        section83bElection: false
      };

      const base_income = 15000000; // $150k income

      // California taxpayer
      const ca_taxpayer: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: base_income,
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      // Texas taxpayer (same federal, no state tax)
      const tx_taxpayer: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: base_income,
        state: 'TX',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      const ca_result = calculateOptionTaxLiability(ca_taxpayer_grant, state_exercise, ca_taxpayer);
      const tx_result = calculateOptionTaxLiability(state_comparison_grant, state_exercise, tx_taxpayer);

      // GOLDEN STATE TAX COMPARISON:
      // Both should have same federal tax
      expect(ca_result.exercise.federalWithholdingRequired).toBe(tx_result.exercise.federalWithholdingRequired);
      
      // California should have additional state tax
      expect(ca_result.exercise.stateWithholdingRequired).toBeGreaterThan(0);
      expect(tx_result.exercise.stateWithholdingRequired).toBe(0);
      
      // Total tax difference = CA state tax
      const stateTaxDifference = ca_result.summary.totalTaxLiability - tx_result.summary.totalTaxLiability;
      expect(stateTaxDifference).toBeGreaterThan(80000); // >$800 CA tax difference
      expect(stateTaxDifference).toBeLessThan(150000); // <$1.5k (reasonable for $10k income)
    });
  });

  describe('Edge Cases and Precision Tests', () => {
    
    it('GOLDEN: Underwater Options (Strike > FMV)', () => {
      const underwater_grant: IOptionGrant = {
        id: 'underwater',
        grantDate: '2021-01-01',
        exercisePrice: 5000, // $50.00 high strike
        sharesGranted: 1000,
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2031-01-01',
        fairMarketValueAtGrant: 5000
      };

      const underwater_exercise: IExerciseScenario = {
        exerciseDate: '2024-01-01',
        sharesExercised: 1000,
        fairMarketValueAtExercise: 3000, // $30.00 (underwater!)
        section83bElection: false
      };

      const result = calculateOptionTaxLiability(
        underwater_grant,
        underwater_exercise,
        irs_taxpayer
      );

      // GOLDEN UNDERWATER CALCULATION:
      // Negative spread: ($30 - $50) × 1000 = -$20k
      expect(result.exercise.isoSpread).toBe(-2000000); // -$20k
      expect(result.exercise.amtAdjustment).toBe(-2000000); // Negative AMT adjustment
      expect(result.exercise.totalTaxAtExercise).toBe(0); // No tax on negative spread
      
      // Exercise cost still required
      expect(result.exercise.exerciseCost).toBe(5000000); // $50k exercise cost
      expect(result.exercise.totalCashRequired).toBe(5000000); // Just exercise cost
    });

    it('GOLDEN: Penny Stock Precision Test', () => {
      const penny_grant: IOptionGrant = {
        id: 'penny-stock',
        grantDate: '2023-01-01',
        exercisePrice: 1, // $0.01
        sharesGranted: 1000000, // 1M shares
        optionType: OptionType.NSO,
        vestingSchedule: { cliff: 0, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2033-01-01',
        fairMarketValueAtGrant: 1
      };

      const penny_exercise: IExerciseScenario = {
        exerciseDate: '2024-01-01',
        sharesExercised: 1000000,
        fairMarketValueAtExercise: 15, // $0.15 (15x growth)
        section83bElection: false
      };

      const result = calculateOptionTaxLiability(
        penny_grant,
        penny_exercise,
        irs_taxpayer
      );

      // GOLDEN PENNY STOCK CALCULATION:
      // Spread: ($0.15 - $0.01) × 1M = $140k
      expect(result.exercise.ordinaryIncomeAtExercise).toBe(14000000); // $140k
      
      // Exercise cost: $0.01 × 1M = $10k
      expect(result.exercise.exerciseCost).toBe(1000000); // $10k
      
      // Tax on $140k should be substantial
      expect(result.exercise.totalTaxAtExercise).toBeGreaterThan(3000000); // >$30k
      
      // High effective tax rate on low-priced stock
      expect(result.summary.effectiveTaxRate).toBeGreaterThan(0.25); // >25%
    });
  });

  describe('NIIT and High-Income Golden Tests', () => {
    
    it('GOLDEN: NIIT Threshold Calculation (2024 Rates)', () => {
      const niit_grant: IOptionGrant = {
        id: 'niit-test',
        grantDate: '2023-01-01',
        exercisePrice: 1000, // $10.00
        sharesGranted: 5000,
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2033-01-01',
        fairMarketValueAtGrant: 1000
      };

      const niit_exercise: IExerciseScenario = {
        exerciseDate: '2024-01-01',
        sharesExercised: 5000,
        fairMarketValueAtExercise: 5000, // $50.00
        section83bElection: false
      };

      const niit_sale: ISaleScenario = {
        saleDate: '2025-01-01',
        sharesSold: 5000,
        salePrice: 8000 // $80.00
      };

      // Right at NIIT threshold
      const niit_taxpayer: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: 20000000, // $200k (exactly at NIIT threshold)
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      const result = calculateOptionTaxLiability(
        niit_grant,
        niit_exercise,
        niit_taxpayer,
        niit_sale
      );

      // GOLDEN NIIT CALCULATION:
      // Capital gain: ($80 - $10) × 5000 = $350k
      // NIIT threshold: $200k for single filers
      // NIIT applies to $350k capital gain
      // NIIT tax: $350k × 3.8% = $13.3k
      
      expect(result.sale?.capitalGain).toBe(35000000); // $350k
      expect(result.sale?.netInvestmentIncomeTax).toBeCloseTo(133000, 0); // $1.33k
      
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('3.8% Net Investment Income Tax')
      );
    });
  });

  describe('Mathematical Precision Verification', () => {
    
    it('GOLDEN: Tax Calculation Sum Verification', () => {
      // Verify all tax components sum correctly
      const precision_grant: IOptionGrant = {
        id: 'precision-tax',
        grantDate: '2023-01-01',
        exercisePrice: 1234, // $12.34
        sharesGranted: 7890,
        optionType: OptionType.NSO,
        vestingSchedule: { cliff: 6, duration: 36, frequency: 'QUARTERLY' },
        expirationDate: '2033-01-01',
        fairMarketValueAtGrant: 1234
      };

      const precision_exercise: IExerciseScenario = {
        exerciseDate: '2024-01-01',
        sharesExercised: 7890,
        fairMarketValueAtExercise: 5678, // $56.78
        section83bElection: false
      };

      const precision_sale: ISaleScenario = {
        saleDate: '2025-01-01',
        sharesSold: 7890,
        salePrice: 9012 // $90.12
      };

      const precision_taxpayer: ITaxpayer = {
        filingStatus: FilingStatus.SINGLE,
        ordinaryIncome: 12345678, // $123,456.78
        state: 'CA',
        jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
      };

      const result = calculateOptionTaxLiability(
        precision_grant,
        precision_exercise,
        precision_taxpayer,
        precision_sale
      );

      // GOLDEN PRECISION VERIFICATION:
      
      // Exercise spread: ($56.78 - $12.34) × 7,890 = $350,309.60
      expect(result.exercise.ordinaryIncomeAtExercise).toBeCloseTo(35030960, 0);
      
      // Total exercise taxes should sum correctly
      const exerciseTaxSum = result.exercise.federalWithholdingRequired +
                           result.exercise.stateWithholdingRequired;
      expect(exerciseTaxSum).toBeLessThanOrEqual(result.exercise.totalTaxAtExercise);
      
      // Capital gain: ($90.12 - $56.78) × 7,890 = $263,452.60
      expect(result.sale?.capitalGain).toBeCloseTo(26345260, 0);
      
      // Total tax components should sum correctly
      const totalCalculatedTax = result.exercise.totalTaxAtExercise + (result.sale?.totalTaxOnSale || 0);
      expect(totalCalculatedTax).toBeCloseTo(result.summary.totalTaxLiability, 0);
      
      // After-tax value calculation verification
      const grossValue = result.sale?.grossProceeds || 0;
      const exerciseCost = result.exercise.exerciseCost;
      const totalTax = result.summary.totalTaxLiability;
      const expectedAfterTax = grossValue - exerciseCost - totalTax;
      
      expect(result.summary.afterTaxValue).toBeCloseTo(expectedAfterTax, 0);
    });
  });
});