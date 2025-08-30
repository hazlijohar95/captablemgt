import { describe, it, expect } from '@jest/globals';
import {
  SAFEType,
  ConversionTrigger,
  ISAFENote,
  IEquityRound,
  ILiquidityEvent,
  convertSAFEInEquityRound,
  applyMostFavoredNation,
  analyzeSAFEConversions,
  convertSAFEsInLiquidityEvent,
  modelSAFEonSAFE
} from '../enhancedSAFE';

describe('Enhanced SAFE Conversion Calculations', () => {
  const mockPostMoneySAFE: ISAFENote = {
    id: 'safe-1',
    investorName: 'Angel Investor A',
    investmentAmount: 10000000, // $100k
    safeType: SAFEType.POST_MONEY_VALUATION_CAP,
    valuationCap: 1000000000, // $10M cap
    discountRate: 0.20, // 20% discount
    mostFavoredNation: true,
    proRataRights: true,
    issuanceDate: '2023-01-01',
    converted: false
  };

  const mockPreMoneySAFE: ISAFENote = {
    id: 'safe-2',
    investorName: 'Angel Investor B',
    investmentAmount: 5000000, // $50k
    safeType: SAFEType.PRE_MONEY_VALUATION_CAP,
    valuationCap: 800000000, // $8M cap
    discountRate: 0.15, // 15% discount
    mostFavoredNation: true,
    proRataRights: false,
    issuanceDate: '2023-03-01',
    converted: false
  };

  const mockDiscountOnlySAFE: ISAFENote = {
    id: 'safe-3',
    investorName: 'Angel Investor C',
    investmentAmount: 2500000, // $25k
    safeType: SAFEType.DISCOUNT_ONLY,
    discountRate: 0.25, // 25% discount
    mostFavoredNation: false,
    proRataRights: false,
    issuanceDate: '2023-06-01',
    converted: false
  };

  const mockEquityRound: IEquityRound = {
    name: 'Series A',
    investmentAmount: 500000000, // $5M
    pricePerShare: 200, // $2.00
    preMoneyValuation: 1500000000, // $15M pre-money
    shareClass: 'PREFERRED_A',
    existingShares: 8000000,
    existingValuation: 1500000000,
    liquidationPreference: 1,
    antiDilutionProvision: true,
    participatingPreferred: false
  };

  const mockCapTable = {
    commonShares: 7000000,
    preferredShares: 1000000,
    optionsOutstanding: 500000,
    optionsAvailable: 500000
  };

  describe('Individual SAFE Conversions', () => {
    it('should convert post-money SAFE correctly', () => {
      const result = convertSAFEInEquityRound(
        mockPostMoneySAFE,
        mockEquityRound,
        8000000
      );

      expect(result.safeId).toBe('safe-1');
      expect(result.originalInvestment).toBe(10000000);
      
      // Post-money cap: $10M cap ÷ 8M shares = $1.25/share
      // Discount: $2.00 * 0.80 = $1.60/share
      // Conversion price: min($1.25, $1.60) = $1.25
      expect(result.conversion.conversionPrice).toBeCloseTo(125, 0);
      
      // Shares: $100k ÷ $1.25 = 80k shares
      expect(result.conversion.sharesReceived).toBeCloseTo(80000, 0);
      
      // Return multiple should be favorable
      expect(result.conversion.returnMultiple).toBeGreaterThan(1.5);
    });

    it('should convert pre-money SAFE correctly', () => {
      const result = convertSAFEInEquityRound(
        mockPreMoneySAFE,
        mockEquityRound,
        8000000
      );

      // Pre-money cap: $8M cap ÷ 8M shares = $1.00/share
      // Discount: $2.00 * 0.85 = $1.70/share  
      // Conversion price: min($1.00, $1.70) = $1.00
      expect(result.conversion.conversionPrice).toBeCloseTo(100, 0);
      
      // Shares: $50k ÷ $1.00 = 50k shares
      expect(result.conversion.sharesReceived).toBeCloseTo(50000, 0);
    });

    it('should convert discount-only SAFE correctly', () => {
      const result = convertSAFEInEquityRound(
        mockDiscountOnlySAFE,
        mockEquityRound,
        8000000
      );

      // Discount only: $2.00 * 0.75 = $1.50/share
      expect(result.conversion.conversionPrice).toBeCloseTo(150, 0);
      
      // Shares: $25k ÷ $1.50 = 16,667 shares
      expect(result.conversion.sharesReceived).toBeCloseTo(16667, 0);
    });
  });

  describe('Most Favored Nation Provisions', () => {
    it('should apply MFN to improve terms across SAFEs', () => {
      const safesWithMFN = [mockPostMoneySAFE, mockPreMoneySAFE, mockDiscountOnlySAFE];
      
      const adjustedSAFEs = applyMostFavoredNation(safesWithMFN, mockEquityRound);
      
      // Find the best terms
      const bestDiscount = 0.25; // mockDiscountOnlySAFE has 25%
      
      // MFN SAFEs should get the best terms
      const adjustedPostMoney = adjustedSAFEs.find(s => s.id === 'safe-1')!;
      const adjustedPreMoney = adjustedSAFEs.find(s => s.id === 'safe-2')!;
      
      expect(adjustedPostMoney.discountRate).toBe(bestDiscount); // Improved from 20% to 25%
      expect(adjustedPostMoney.mfnAdjustments.length).toBeGreaterThan(0);
      
      expect(adjustedPreMoney.discountRate).toBe(bestDiscount); // Improved from 15% to 25%
      expect(adjustedPreMoney.mfnAdjustments.length).toBeGreaterThan(0);
      
      // Non-MFN SAFE should not change
      const nonMFN = adjustedSAFEs.find(s => s.id === 'safe-3')!;
      expect(nonMFN.discountRate).toBe(0.25); // Unchanged
      expect(nonMFN.mfnAdjustments.length).toBe(0);
    });

    it('should calculate MFN benefit accurately', () => {
      const adjustedSAFEs = applyMostFavoredNation([mockPostMoneySAFE, mockDiscountOnlySAFE], mockEquityRound);
      
      const adjustedSAFE = adjustedSAFEs.find(s => s.id === 'safe-1')!;
      const discountAdjustment = adjustedSAFE.mfnAdjustments.find(adj => 
        adj.reason.includes('discount')
      );
      
      expect(discountAdjustment).toBeDefined();
      expect(discountAdjustment?.benefit).toBeGreaterThan(0);
    });
  });

  describe('Comprehensive SAFE Analysis', () => {
    it('should analyze multiple SAFE conversions correctly', () => {
      const allSAFEs = [mockPostMoneySAFE, mockPreMoneySAFE, mockDiscountOnlySAFE];
      
      const analysis = analyzeSAFEConversions(allSAFEs, mockEquityRound, mockCapTable);
      
      expect(analysis.conversions).toHaveLength(3);
      expect(analysis.totalSAFEInvestment).toBe(17500000); // $175k total
      expect(analysis.totalSharesIssued).toBeGreaterThan(0);
      expect(analysis.totalOwnershipToSAFEs).toBeGreaterThan(0);
      
      // Should provide meaningful analysis
      expect(analysis.summary.averageReturnMultiple).toBeGreaterThan(1);
      expect(analysis.summary.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should calculate pro rata rights correctly', () => {
      const analysis = analyzeSAFEConversions([mockPostMoneySAFE], mockEquityRound, mockCapTable);
      
      const safeWithProRata = analysis.conversions.find(c => c.safeId === 'safe-1')!;
      expect(safeWithProRata.proRataAnalysis).toBeDefined();
      expect(safeWithProRata.proRataAnalysis?.eligible).toBe(true);
      expect(safeWithProRata.proRataAnalysis?.allocationOffered).toBeGreaterThan(0);
      expect(safeWithProRata.proRataAnalysis?.percentageOfRound).toBeGreaterThan(0);
    });
  });

  describe('Liquidity Event Conversions', () => {
    it('should handle IPO conversion correctly', () => {
      const ipoEvent: ILiquidityEvent = {
        type: 'IPO',
        valuation: 5000000000, // $50M IPO valuation
        proceedsToShareholders: 5000000000
      };

      const analysis = convertSAFEsInLiquidityEvent(
        [mockPostMoneySAFE],
        ipoEvent,
        { ...mockCapTable, fullyDilutedShares: 8500000 }
      );

      const conversion = analysis.conversions[0];
      expect(conversion.conversion.trigger).toBe(ConversionTrigger.LIQUIDITY_EVENT);
      expect(conversion.conversion.shareClass).toBe('COMMON');
      expect(conversion.conversion.sharesReceived).toBeGreaterThan(0);
      
      // Return should be significant in IPO scenario
      expect(conversion.conversion.returnMultiple).toBeGreaterThan(2);
    });

    it('should handle acquisition cash payout correctly', () => {
      const acquisitionEvent: ILiquidityEvent = {
        type: 'ACQUISITION',
        valuation: 2000000000, // $20M acquisition
        proceedsToShareholders: 2000000000
      };

      const analysis = convertSAFEsInLiquidityEvent(
        [mockPostMoneySAFE],
        acquisitionEvent,
        { ...mockCapTable, fullyDilutedShares: 8500000 }
      );

      const conversion = analysis.conversions[0];
      expect(conversion.conversion.shareClass).toBe('CASH');
      expect(conversion.conversion.sharesReceived).toBe(0);
      expect(conversion.conversion.impliedValuation).toBeGreaterThan(conversion.originalInvestment);
    });
  });

  describe('SAFE-on-SAFE Scenarios', () => {
    it('should model SAFE stacking implications correctly', () => {
      const existingSAFEs = [mockPostMoneySAFE, mockPreMoneySAFE];
      const newSAFEs = [{
        id: 'safe-new',
        investorName: 'New Angel',
        investmentAmount: 15000000, // $150k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 1200000000, // $12M cap (higher than existing)
        discountRate: 0.30, // 30% discount (better than existing)
        mostFavoredNation: false,
        proRataRights: true,
        issuanceDate: '2024-01-01',
        converted: false
      }];

      const analysis = modelSAFEonSAFE(
        existingSAFEs,
        newSAFEs,
        1500000000 // $15M current valuation
      );

      // Should trigger MFN adjustments
      expect(analysis.mfnAdjustments.length).toBeGreaterThan(0);
      
      // Should calculate stacking implications
      expect(analysis.stackingAnalysis.totalSAFEInvestment).toBe(30000000); // $300k total
      expect(analysis.stackingAnalysis.overhang).toBeGreaterThan(15); // >15% overhang
      expect(analysis.stackingAnalysis.impliedOwnership).toBeGreaterThan(10); // >10% ownership
      
      // Should provide recommendations
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      
      if (analysis.stackingAnalysis.overhang > 30) {
        expect(analysis.recommendations).toContain(
          expect.stringContaining('WARNING: High SAFE overhang')
        );
      }
    });

    it('should identify MFN triggers correctly', () => {
      const existingSAFE = {
        ...mockPostMoneySAFE,
        discountRate: 0.15, // 15% discount
        valuationCap: 1200000000 // $12M cap
      };

      const betterNewSAFE = {
        ...mockPreMoneySAFE,
        discountRate: 0.25, // Better 25% discount
        valuationCap: 800000000 // Better $8M cap
      };

      const analysis = modelSAFEonSAFE([existingSAFE], [betterNewSAFE], 1500000000);
      
      const mfnAdjustment = analysis.mfnAdjustments.find(adj => adj.safeId === existingSAFE.id);
      expect(mfnAdjustment).toBeDefined();
      expect(mfnAdjustment?.adjustments.length).toBe(2); // Both discount and cap improved
      
      const discountAdjustment = mfnAdjustment?.adjustments.find(adj => 
        adj.reason.includes('discount')
      );
      const capAdjustment = mfnAdjustment?.adjustments.find(adj => 
        adj.reason.includes('cap')
      );
      
      expect(discountAdjustment).toBeDefined();
      expect(capAdjustment).toBeDefined();
    });
  });

  describe('Complex Conversion Scenarios', () => {
    it('should handle multiple SAFEs with different triggers', () => {
      const mixedSAFEs = [
        mockPostMoneySAFE,
        mockPreMoneySAFE,
        mockDiscountOnlySAFE,
        {
          id: 'safe-mfn',
          investorName: 'MFN Investor',
          investmentAmount: 7500000, // $75k
          safeType: SAFEType.MFN_ONLY,
          mostFavoredNation: true,
          proRataRights: true,
          issuanceDate: '2023-09-01',
          converted: false
        }
      ];

      const analysis = analyzeSAFEConversions(mixedSAFEs, mockEquityRound, mockCapTable);
      
      expect(analysis.conversions).toHaveLength(4);
      expect(analysis.totalSAFEInvestment).toBe(25000000); // $250k total
      
      // Each SAFE should convert appropriately
      analysis.conversions.forEach(conversion => {
        expect(conversion.conversion.sharesReceived).toBeGreaterThan(0);
        expect(conversion.conversion.ownershipPercentage).toBeGreaterThan(0);
        expect(conversion.conversion.returnMultiple).toBeGreaterThan(0);
      });
      
      // Total dilution should be reasonable
      expect(analysis.totalOwnershipToSAFEs).toBeLessThan(25); // <25% to SAFEs
    });

    it('should optimize conversion choices correctly', () => {
      // High-value scenario where conversion choice matters
      const highValueRound: IEquityRound = {
        ...mockEquityRound,
        pricePerShare: 500, // $5.00 - high price
        preMoneyValuation: 4000000000, // $40M pre-money
        investmentAmount: 1000000000 // $10M round
      };

      const analysis = analyzeSAFEConversions([mockPostMoneySAFE], highValueRound, mockCapTable);
      const conversion = analysis.conversions[0];
      
      // At high valuation, discount should be the better choice
      const capPrice = mockPostMoneySAFE.valuationCap! / 8000000; // $1.25
      
      expect(conversion.conversion.conversionPrice).toBeCloseTo(capPrice, 0); // Cap should win
      expect(conversion.conversion.returnMultiple).toBeGreaterThan(3); // High return
    });
  });

  describe('Liquidation Event Analysis', () => {
    it('should handle different liquidation event types', () => {
      const ipoEvent: ILiquidityEvent = {
        type: 'IPO',
        valuation: 10000000000, // $100M IPO
        proceedsToShareholders: 10000000000
      };

      const acquisitionEvent: ILiquidityEvent = {
        type: 'ACQUISITION',
        valuation: 5000000000, // $50M acquisition
        proceedsToShareholders: 5000000000
      };

      const ipoAnalysis = convertSAFEsInLiquidityEvent(
        [mockPostMoneySAFE],
        ipoEvent,
        { ...mockCapTable, fullyDilutedShares: 8500000 }
      );

      const acquisitionAnalysis = convertSAFEsInLiquidityEvent(
        [mockPostMoneySAFE],
        acquisitionEvent,
        { ...mockCapTable, fullyDilutedShares: 8500000 }
      );

      // IPO should convert to shares
      expect(ipoAnalysis.conversions[0].conversion.shareClass).toBe('COMMON');
      expect(ipoAnalysis.conversions[0].conversion.sharesReceived).toBeGreaterThan(0);
      
      // Acquisition should provide cash payout
      expect(acquisitionAnalysis.conversions[0].conversion.shareClass).toBe('CASH');
      expect(acquisitionAnalysis.conversions[0].conversion.sharesReceived).toBe(0);
      
      // Both should provide positive returns
      expect(ipoAnalysis.conversions[0].conversion.returnMultiple).toBeGreaterThan(1);
      expect(acquisitionAnalysis.conversions[0].conversion.returnMultiple).toBeGreaterThan(1);
    });
  });

  describe('Pro Rata Rights Analysis', () => {
    it('should calculate pro rata allocation correctly', () => {
      const analysis = analyzeSAFEConversions([mockPostMoneySAFE], mockEquityRound, mockCapTable);
      const conversion = analysis.conversions[0];
      
      expect(conversion.proRataAnalysis).toBeDefined();
      expect(conversion.proRataAnalysis?.eligible).toBe(true);
      
      // Pro rata should be proportional to ownership
      const expectedProRata = mockEquityRound.investmentAmount * 
        (conversion.conversion.ownershipPercentage / 100);
      
      expect(conversion.proRataAnalysis?.allocationOffered).toBeCloseTo(
        expectedProRata / mockEquityRound.pricePerShare, 
        0
      );
    });
  });

  describe('Error Handling', () => {
    it('should validate SAFE investment amounts', () => {
      const invalidSAFE = {
        ...mockPostMoneySAFE,
        investmentAmount: -100000 // Negative investment
      };

      expect(() => convertSAFEInEquityRound(invalidSAFE, mockEquityRound, 8000000))
        .toThrow('investmentAmount must be positive');
    });

    it('should validate equity round terms', () => {
      const invalidRound = {
        ...mockEquityRound,
        pricePerShare: 0 // Zero price
      };

      expect(() => convertSAFEInEquityRound(mockPostMoneySAFE, invalidRound, 8000000))
        .toThrow('pricePerShare must be positive');
    });

    it('should validate discount rates', () => {
      const invalidSAFE = {
        ...mockPostMoneySAFE,
        discountRate: 1.5 // 150% discount - impossible
      };

      expect(() => convertSAFEInEquityRound(invalidSAFE, mockEquityRound, 8000000))
        .toThrow('Discount rate must be between 0 and 1');
    });
  });
});

describe('Golden Tests - SAFE Conversions', () => {
  // Real-world SAFE conversion scenarios with verified results
  
  describe('Y Combinator Standard SAFEs', () => {
    it('should match YC Demo Day SAFE conversion', () => {
      // Standard YC SAFE: $250k at $10M cap, 20% discount
      const ycSAFE: ISAFENote = {
        id: 'yc-safe',
        investorName: 'YC Angel',
        investmentAmount: 25000000, // $250k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 1000000000, // $10M cap
        discountRate: 0.20,
        mostFavoredNation: true,
        proRataRights: true,
        issuanceDate: '2023-08-01',
        converted: false
      };

      // Series A: $5M at $15M pre, $2.50/share
      const seriesA: IEquityRound = {
        name: 'Series A',
        investmentAmount: 500000000,
        pricePerShare: 250, // $2.50
        preMoneyValuation: 1500000000, // $15M
        shareClass: 'PREFERRED_A',
        existingShares: 6000000,
        existingValuation: 1500000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(ycSAFE, seriesA, 6000000);
      
      // Cap price: $10M ÷ 6M shares = $1.67/share
      // Discount price: $2.50 × 0.80 = $2.00/share
      // Conversion: min($1.67, $2.00) = $1.67/share
      expect(result.conversion.conversionPrice).toBeCloseTo(167, 0);
      
      // Shares: $250k ÷ $1.67 = ~150k shares
      expect(result.conversion.sharesReceived).toBeCloseTo(150000, -3);
      
      // Return: 150k × $2.50 = $375k (1.5x return)
      expect(result.conversion.returnMultiple).toBeCloseTo(1.5, 1);
    });

    it('should match Techstars SAFE structure', () => {
      // Techstars typically does $20k at lower cap
      const techstarsSAFE: ISAFENote = {
        id: 'techstars-safe',
        investorName: 'Techstars',
        investmentAmount: 2000000, // $20k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 800000000, // $8M cap
        discountRate: 0.20,
        mostFavoredNation: true,
        proRataRights: false, // Techstars typically doesn't take pro rata
        issuanceDate: '2023-01-01',
        converted: false
      };

      const result = convertSAFEInEquityRound(techstarsSAFE, mockEquityRound, 8000000);
      
      // Should get favorable conversion due to lower cap
      expect(result.conversion.returnMultiple).toBeGreaterThan(2);
      expect(result.proRataAnalysis).toBeUndefined(); // No pro rata rights
    });
  });

  describe('Multi-SAFE Round Scenarios', () => {
    it('should handle seed round with 10+ SAFEs', () => {
      // Create multiple SAFEs with varying terms (common in seed rounds)
      const multipleSAFEs: ISAFENote[] = [];
      
      for (let i = 1; i <= 10; i++) {
        multipleSAFEs.push({
          id: `safe-${i}`,
          investorName: `Angel ${i}`,
          investmentAmount: 2500000 + (i * 500000), // $25k-$75k range
          safeType: SAFEType.POST_MONEY_VALUATION_CAP,
          valuationCap: 800000000 + (i * 100000000), // $8M-$17M range
          discountRate: 0.15 + (i * 0.01), // 15%-25% range
          mostFavoredNation: i <= 5, // First 5 have MFN
          proRataRights: i <= 3, // First 3 have pro rata
          issuanceDate: `2023-${String(i).padStart(2, '0')}-01`,
          converted: false
        });
      }

      const analysis = analyzeSAFEConversions(multipleSAFEs, mockEquityRound, mockCapTable);
      
      expect(analysis.conversions).toHaveLength(10);
      expect(analysis.totalSAFEInvestment).toBeGreaterThan(40000000); // >$400k total
      
      // Should provide meaningful dilution analysis
      expect(analysis.dilutionToExisting).toBeGreaterThan(5); // >5% dilution
      expect(analysis.summary.averageReturnMultiple).toBeGreaterThan(1);
      
      // Pro rata rights should only apply to first 3
      const proRataConversions = analysis.conversions.filter(c => c.proRataAnalysis?.eligible);
      expect(proRataConversions).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle SAFE conversion at exact cap price', () => {
      // Round price exactly equals cap-implied price
      const exactCapRound: IEquityRound = {
        ...mockEquityRound,
        pricePerShare: 125, // Exactly $10M cap ÷ 8M shares
        preMoneyValuation: 1000000000 // $10M pre-money
      };

      const result = convertSAFEInEquityRound(mockPostMoneySAFE, exactCapRound, 8000000);
      
      // Should use cap price (no discount benefit)
      expect(result.conversion.conversionPrice).toBe(125);
      expect(result.conversion.returnMultiple).toBeCloseTo(1, 1); // Minimal return
    });

    it('should handle SAFE with very high cap (no cap benefit)', () => {
      const highCapSAFE: ISAFENote = {
        ...mockPostMoneySAFE,
        valuationCap: 10000000000 // $100M cap - much higher than round
      };

      const result = convertSAFEInEquityRound(highCapSAFE, mockEquityRound, 8000000);
      
      // Should use discount price since cap doesn't help
      const expectedPrice = mockEquityRound.pricePerShare * (1 - mockPostMoneySAFE.discountRate!);
      expect(result.conversion.conversionPrice).toBeCloseTo(expectedPrice, 0);
    });

    it('should handle SAFE in down round correctly', () => {
      // Series A at lower price than cap
      const downRound: IEquityRound = {
        ...mockEquityRound,
        pricePerShare: 100, // $1.00 - below $1.25 cap price
        preMoneyValuation: 600000000 // $6M pre-money
      };

      const result = convertSAFEInEquityRound(mockPostMoneySAFE, downRound, 8000000);
      
      // Should still get cap protection
      expect(result.conversion.conversionPrice).toBeCloseTo(125, 0); // Cap price
      expect(result.conversion.returnMultiple).toBeLessThan(1); // Negative return scenario
    });
  });

  describe('Valuation Impact Analysis', () => {
    it('should calculate accurate post-conversion valuations', () => {
      const analysis = analyzeSAFEConversions(
        [mockPostMoneySAFE, mockPreMoneySAFE],
        mockEquityRound,
        mockCapTable
      );

      // Post-conversion valuation should account for all new shares
      const expectedNewShares = analysis.totalSharesIssued + 
        Math.floor(mockEquityRound.investmentAmount / mockEquityRound.pricePerShare);
      
      const expectedPostConversionShares = 8000000 + expectedNewShares;
      expect(analysis.postConversionShares).toBeCloseTo(expectedPostConversionShares, -3);
      
      // Valuation should be share count × price
      const expectedValuation = analysis.postConversionShares * mockEquityRound.pricePerShare;
      expect(analysis.postConversionValuation).toBeCloseTo(expectedValuation, -5);
    });
  });
});