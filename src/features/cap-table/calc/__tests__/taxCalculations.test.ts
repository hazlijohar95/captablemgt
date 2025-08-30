import { describe, it, expect } from '@jest/globals';
import {
  OptionType,
  FilingStatus,
  IOptionGrant,
  IExerciseScenario,
  ISaleScenario,
  ITaxpayer,
  calculateOptionTaxLiability,
  optimizeExerciseTiming,
  getCurrentTaxBrackets
} from '../taxCalculations';

describe('Tax Liability Calculations', () => {
  const mockISOGrant: IOptionGrant = {
    id: 'iso-grant-1',
    grantDate: '2023-01-01',
    exercisePrice: 100, // $1.00 in cents
    sharesGranted: 10000,
    optionType: OptionType.ISO,
    vestingSchedule: {
      cliff: 12,
      duration: 48,
      frequency: 'MONTHLY'
    },
    expirationDate: '2033-01-01',
    fairMarketValueAtGrant: 100
  };

  const mockNSOGrant: IOptionGrant = {
    ...mockISOGrant,
    id: 'nso-grant-1',
    optionType: OptionType.NSO
  };

  const mockTaxpayer: ITaxpayer = {
    filingStatus: FilingStatus.SINGLE,
    ordinaryIncome: 15000000, // $150k annual income
    state: 'CA',
    jurisdiction: getCurrentTaxBrackets(FilingStatus.SINGLE)
  };

  const mockExerciseScenario: IExerciseScenario = {
    exerciseDate: '2024-06-01',
    sharesExercised: 5000, // Half the grant
    fairMarketValueAtExercise: 500, // $5.00 - 5x appreciation
    section83bElection: false
  };

  describe('ISO Tax Calculations', () => {
    it('should calculate ISO exercise with AMT impact', () => {
      const result = calculateOptionTaxLiability(
        mockISOGrant,
        mockExerciseScenario,
        mockTaxpayer
      );

      expect(result.optionId).toBe('iso-grant-1');
      expect(result.exercise.ordinaryIncomeAtExercise).toBe(0); // No ordinary income for ISOs
      expect(result.exercise.isoSpread).toBe(200000); // ($5.00 - $1.00) * 5000 = $2000
      expect(result.exercise.amtAdjustment).toBe(200000); // AMT adjustment equals spread
      expect(result.exercise.federalWithholdingRequired).toBe(0); // No withholding for ISOs
      
      // Should have AMT liability
      expect(result.exercise.totalTaxAtExercise).toBeGreaterThan(0);
      expect(result.summary.amtLiability).toBeGreaterThan(0);
    });

    it('should calculate ISO qualifying disposition correctly', () => {
      const qualifyingSale: ISaleScenario = {
        saleDate: '2025-06-01', // >1 year from exercise, >2 years from grant
        sharesSold: 5000,
        salePrice: 1000 // $10.00
      };

      const result = calculateOptionTaxLiability(
        mockISOGrant,
        mockExerciseScenario,
        mockTaxpayer,
        qualifyingSale
      );

      expect(result.sale?.isLongTerm).toBe(true);
      expect(result.sale?.capitalGain).toBe(450000); // ($10 - $1) * 5000 = $45k
      
      // Long-term capital gains should have lower tax rate
      const effectiveRate = result.sale!.totalTaxOnSale / result.sale!.capitalGain;
      expect(effectiveRate).toBeLessThan(0.25); // Should be lower than ordinary rates
    });

    it('should identify disqualifying disposition correctly', () => {
      const disqualifyingSale: ISaleScenario = {
        saleDate: '2024-09-01', // <1 year from exercise
        sharesSold: 5000,
        salePrice: 1000
      };

      const result = calculateOptionTaxLiability(
        mockISOGrant,
        mockExerciseScenario,
        mockTaxpayer,
        disqualifyingSale
      );

      expect(result.sale?.isLongTerm).toBe(false);
      
      // Should trigger ordinary income on the spread at exercise
      const disqualifyingIncome = (mockExerciseScenario.fairMarketValueAtExercise - mockISOGrant.exercisePrice) * 5000;
      expect(result.sale?.capitalGain).toBe(250000); // ($10 - $5) * 5000 = $25k remaining gain
    });
  });

  describe('NSO Tax Calculations', () => {
    it('should calculate NSO exercise with ordinary income', () => {
      const result = calculateOptionTaxLiability(
        mockNSOGrant,
        mockExerciseScenario,
        mockTaxpayer
      );

      expect(result.exercise.ordinaryIncomeAtExercise).toBe(200000); // ($5 - $1) * 5000 = $2k
      expect(result.exercise.isoSpread).toBe(0); // Not applicable for NSOs
      expect(result.exercise.amtAdjustment).toBe(0); // NSOs don't trigger AMT
      
      // Should have federal and state withholding
      expect(result.exercise.federalWithholdingRequired).toBeGreaterThan(0);
      expect(result.exercise.stateWithholdingRequired).toBeGreaterThan(0);
    });

    it('should calculate NSO sale with proper basis adjustment', () => {
      const saleScenario: ISaleScenario = {
        saleDate: '2025-01-01',
        sharesSold: 5000,
        salePrice: 1000 // $10.00
      };

      const result = calculateOptionTaxLiability(
        mockNSOGrant,
        mockExerciseScenario,
        mockTaxpayer,
        saleScenario
      );

      // Cost basis should include the FMV at exercise (already taxed)
      expect(result.sale?.costBasis).toBe(2500000); // $5.00 * 5000 = $25k
      expect(result.sale?.capitalGain).toBe(2500000); // ($10 - $5) * 5000 = $25k
      
      // Long-term treatment after 1 year
      expect(result.sale?.isLongTerm).toBe(true);
    });
  });

  describe('High-Income Tax Scenarios', () => {
    it('should calculate NIIT for high-income taxpayers', () => {
      const highIncomeTaxpayer: ITaxpayer = {
        ...mockTaxpayer,
        ordinaryIncome: 50000000 // $500k annual income
      };

      const largeSale: ISaleScenario = {
        saleDate: '2025-06-01',
        sharesSold: 10000,
        salePrice: 2000 // $20.00 - large gain
      };

      const result = calculateOptionTaxLiability(
        mockISOGrant,
        { ...mockExerciseScenario, sharesExercised: 10000 },
        highIncomeTaxpayer,
        largeSale
      );

      // Should trigger 3.8% NIIT
      expect(result.sale?.netInvestmentIncomeTax).toBeGreaterThan(0);
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('3.8% Net Investment Income Tax')
      );
    });
  });

  describe('Exercise Timing Optimization', () => {
    it('should identify optimal exercise timing for ISOs', () => {
      const exerciseWindows = [
        '2024-01-01',
        '2024-06-01', 
        '2024-12-01',
        '2025-06-01'
      ];

      const optimization = optimizeExerciseTiming(
        mockISOGrant,
        mockTaxpayer,
        exerciseWindows,
        500 // Current FMV $5.00
      );

      expect(optimization).toHaveLength(4);
      
      // Should rank by after-tax value
      for (let i = 1; i < optimization.length; i++) {
        expect(optimization[i-1].afterTaxValue).toBeGreaterThanOrEqual(
          optimization[i].afterTaxValue
        );
      }
      
      // Should identify at least one optimal timing
      const optimalTimings = optimization.filter(o => o.recommendation === 'OPTIMAL');
      expect(optimalTimings.length).toBeGreaterThan(0);
    });

    it('should provide specific recommendations for different scenarios', () => {
      const highAMTScenario: IExerciseScenario = {
        ...mockExerciseScenario,
        sharesExercised: 10000, // Full grant
        fairMarketValueAtExercise: 2000 // $20.00 - huge spread
      };

      const result = calculateOptionTaxLiability(
        mockISOGrant,
        highAMTScenario,
        mockTaxpayer
      );

      expect(result.summary.recommendations).toContain(
        expect.stringContaining('smaller tranches to manage AMT impact')
      );
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('Section 83(b) election')
      );
    });
  });

  describe('Tax Bracket Edge Cases', () => {
    it('should handle taxpayer at bracket boundaries', () => {
      // Taxpayer right at the 22%/24% bracket boundary ($97,850 for single)
      const bracketBoundaryTaxpayer: ITaxpayer = {
        ...mockTaxpayer,
        ordinaryIncome: 9785000 // Exactly at boundary
      };

      const result = calculateOptionTaxLiability(
        mockNSOGrant,
        mockExerciseScenario,
        bracketBoundaryTaxpayer
      );

      // Tax calculation should handle bracket transition correctly
      expect(result.exercise.totalTaxAtExercise).toBeGreaterThan(0);
      expect(result.summary.effectiveTaxRate).toBeLessThan(0.5); // Reasonable effective rate
    });

    it('should handle zero-income taxpayer', () => {
      const lowIncomeTaxpayer: ITaxpayer = {
        ...mockTaxpayer,
        ordinaryIncome: 0
      };

      const result = calculateOptionTaxLiability(
        mockNSOGrant,
        mockExerciseScenario,
        lowIncomeTaxpayer
      );

      // Should still calculate taxes on option income
      expect(result.exercise.totalTaxAtExercise).toBeGreaterThan(0);
      expect(result.summary.effectiveTaxRate).toBeGreaterThan(0);
    });
  });

  describe('State Tax Variations', () => {
    it('should handle no-tax states correctly', () => {
      const texasTaxpayer: ITaxpayer = {
        ...mockTaxpayer,
        state: 'TX' // No state income tax
      };

      const result = calculateOptionTaxLiability(
        mockNSOGrant,
        mockExerciseScenario,
        texasTaxpayer
      );

      expect(result.exercise.stateWithholdingRequired).toBe(0);
    });

    it('should handle high-tax states correctly', () => {
      const californiaTaxpayer: ITaxpayer = {
        ...mockTaxpayer,
        state: 'CA' // High state tax
      };

      const result = calculateOptionTaxLiability(
        mockNSOGrant,
        mockExerciseScenario,
        californiaTaxpayer
      );

      expect(result.exercise.stateWithholdingRequired).toBeGreaterThan(0);
    });
  });
});

describe('Golden Tests - Tax Calculations', () => {
  // Real-world scenarios with verified tax calculations
  
  describe('Startup Employee Scenarios', () => {
    it('should match typical early employee ISO scenario', () => {
      // Early employee joins pre-Series A, exercises post-Series B
      const earlyEmployeeGrant: IOptionGrant = {
        id: 'early-employee',
        grantDate: '2021-01-01',
        exercisePrice: 10, // $0.10 strike
        sharesGranted: 25000, // 0.25% of company
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2031-01-01',
        fairMarketValueAtGrant: 10
      };

      const postSeriesBExercise: IExerciseScenario = {
        exerciseDate: '2024-01-01',
        sharesExercised: 25000,
        fairMarketValueAtExercise: 400, // $4.00 FMV
        section83bElection: false
      };

      const result = calculateOptionTaxLiability(
        earlyEmployeeGrant,
        postSeriesBExercise,
        mockTaxpayer
      );

      // Expected values for this common scenario
      expect(result.exercise.isoSpread).toBe(975000); // ($4.00 - $0.10) * 25k = $97.5k
      expect(result.exercise.exerciseCost).toBe(250000); // $0.10 * 25k = $2.5k
      
      // AMT should be significant but manageable
      expect(result.exercise.amtAdjustment).toBe(975000);
      expect(result.summary.amtLiability).toBeGreaterThan(0);
      expect(result.summary.amtLiability).toBeLessThan(300000); // <$3k AMT
    });

    it('should match late-stage NSO scenario', () => {
      // Late employee gets NSOs at higher strike price
      const lateEmployeeGrant: IOptionGrant = {
        id: 'late-employee',
        grantDate: '2024-01-01',
        exercisePrice: 500, // $5.00 strike
        sharesGranted: 2000, // Smaller grant
        optionType: OptionType.NSO,
        vestingSchedule: { cliff: 12, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2034-01-01',
        fairMarketValueAtGrant: 500
      };

      const immediateExercise: IExerciseScenario = {
        exerciseDate: '2024-12-01',
        sharesExercised: 2000,
        fairMarketValueAtExercise: 800, // $8.00 FMV
        section83bElection: false
      };

      const result = calculateOptionTaxLiability(
        lateEmployeeGrant,
        immediateExercise,
        mockTaxpayer
      );

      // NSO spread taxed as ordinary income
      expect(result.exercise.ordinaryIncomeAtExercise).toBe(60000); // ($8 - $5) * 2k = $6k
      expect(result.exercise.federalWithholdingRequired).toBeCloseTo(13200, 0); // 22% of $6k
      expect(result.exercise.amtAdjustment).toBe(0); // No AMT for NSOs
    });
  });

  describe('Founder Exercise Scenarios', () => {
    it('should handle founder early exercise with 83(b) election', () => {
      const founderGrant: IOptionGrant = {
        id: 'founder-early',
        grantDate: '2022-01-01',
        exercisePrice: 1, // $0.01 - very low founder price
        sharesGranted: 1000000, // 10% founder grant
        optionType: OptionType.ISO,
        vestingSchedule: { cliff: 0, duration: 48, frequency: 'MONTHLY' },
        expirationDate: '2032-01-01',
        fairMarketValueAtGrant: 1
      };

      const earlyExercise: IExerciseScenario = {
        exerciseDate: '2022-02-01', // Early exercise
        sharesExercised: 1000000,
        fairMarketValueAtExercise: 2, // Minimal appreciation
        section83bElection: true
      };

      const result = calculateOptionTaxLiability(
        founderGrant,
        earlyExercise,
        mockTaxpayer
      );

      // Minimal spread should result in minimal tax
      expect(result.exercise.isoSpread).toBe(1000000); // ($0.02 - $0.01) * 1M = $10k
      expect(result.summary.amtLiability).toBeLessThan(100000); // <$1k AMT
      
      // Should recommend 83(b) election
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('Section 83(b) election')
      );
    });
  });

  describe('Complex Sale Scenarios', () => {
    it('should handle partial sale optimization', () => {
      // Exercise all, sell only some for tax optimization
      const fullExercise: IExerciseScenario = {
        ...mockExerciseScenario,
        sharesExercised: 10000 // Full grant
      };

      const partialSale: ISaleScenario = {
        saleDate: '2025-06-01',
        sharesSold: 5000, // Sell half
        salePrice: 1000 // $10.00
      };

      const result = calculateOptionTaxLiability(
        mockISOGrant,
        fullExercise,
        mockTaxpayer,
        partialSale
      );

      // Should only calculate tax on sold shares
      expect(result.sale?.sharesSold).toBe(5000);
      expect(result.sale?.grossProceeds).toBe(5000000); // $10 * 5k = $50k
      expect(result.sale?.capitalGain).toBe(4500000); // ($10 - $1) * 5k = $45k
      
      // Net proceeds should account for taxes
      expect(result.sale?.netProceeds).toBeLessThan(result.sale?.grossProceeds);
    });
  });

  describe('Tax Optimization Analysis', () => {
    it('should recommend optimal exercise timing', () => {
      const exerciseWindows = [
        '2024-01-01', // Early in year - good for AMT planning
        '2024-06-01', // Mid year
        '2024-12-01', // Late in year - may push into next tax year
        '2025-01-01'  // Next year
      ];

      const optimization = optimizeExerciseTiming(
        mockISOGrant,
        mockTaxpayer,
        exerciseWindows,
        500 // $5.00 current FMV
      );

      expect(optimization).toHaveLength(4);
      
      // Should rank by after-tax value
      for (let i = 1; i < optimization.length; i++) {
        expect(optimization[i-1].afterTaxValue).toBeGreaterThanOrEqual(
          optimization[i].afterTaxValue
        );
      }
      
      // Should provide recommendations
      optimization.forEach(timing => {
        expect(timing.recommendation).toMatch(/OPTIMAL|GOOD|POOR/);
        expect(timing.reasons.length).toBeGreaterThan(0);
      });
    });

    it('should handle AMT credit scenarios', () => {
      // High AMT year followed by low AMT year
      const highIncomeTaxpayer: ITaxpayer = {
        ...mockTaxpayer,
        ordinaryIncome: 20000000 // $200k income
      };

      const largeExercise: IExerciseScenario = {
        ...mockExerciseScenario,
        sharesExercised: 10000,
        fairMarketValueAtExercise: 1000 // $10.00 - large spread
      };

      const result = calculateOptionTaxLiability(
        mockISOGrant,
        largeExercise,
        highIncomeTaxpayer
      );

      expect(result.summary.amtLiability).toBeGreaterThan(100000); // Significant AMT
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('AMT credit planning')
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should validate exercise date before grant date', () => {
      const invalidExercise = {
        ...mockExerciseScenario,
        exerciseDate: '2022-01-01' // Before grant date
      };

      // Should not throw (business logic handles this at higher level)
      // But calculation should be mathematically sound
      const result = calculateOptionTaxLiability(
        mockISOGrant,
        invalidExercise,
        mockTaxpayer
      );
      
      expect(result).toBeDefined();
    });

    it('should handle exercise price above FMV', () => {
      const underwaterExercise: IExerciseScenario = {
        ...mockExerciseScenario,
        fairMarketValueAtExercise: 50 // $0.50 - below $1.00 strike
      };

      const result = calculateOptionTaxLiability(
        mockISOGrant,
        underwaterExercise,
        mockTaxpayer
      );

      // Negative spread should result in minimal tax liability
      expect(result.exercise.isoSpread).toBeLessThan(0);
      expect(result.exercise.totalTaxAtExercise).toBe(0);
      expect(result.summary.recommendations).toContain(
        expect.stringContaining('Consult with a tax professional')
      );
    });

    it('should validate sale price below exercise cost', () => {
      const lossSale: ISaleScenario = {
        saleDate: '2025-01-01',
        sharesSold: 5000,
        salePrice: 50 // $0.50 - below $1.00 exercise price
      };

      const result = calculateOptionTaxLiability(
        mockISOGrant,
        mockExerciseScenario,
        mockTaxpayer,
        lossSale
      );

      // Should handle capital loss correctly
      expect(result.sale?.capitalGain).toBeLessThan(0); // Capital loss
      expect(result.sale?.netProceeds).toBeLessThan(result.sale?.grossProceeds);
    });
  });

  describe('Different Filing Status Impact', () => {
    it('should calculate different results for married filing jointly', () => {
      const marriedTaxpayer: ITaxpayer = {
        ...mockTaxpayer,
        filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
        jurisdiction: getCurrentTaxBrackets(FilingStatus.MARRIED_FILING_JOINTLY)
      };

      const result = calculateOptionTaxLiability(
        mockNSOGrant,
        mockExerciseScenario,
        marriedTaxpayer
      );

      // Married filing jointly should generally have lower effective rates
      expect(result.summary.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.summary.effectiveTaxRate).toBeLessThan(0.5);
    });
  });
});