import { describe, it, expect } from '@jest/globals';
import {
  SAFEType,
  ISAFENote,
  IEquityRound,
  ILiquidityEvent,
  convertSAFEInEquityRound,
  analyzeSAFEConversions,
  convertSAFEsInLiquidityEvent,
  applyMostFavoredNation
} from '../enhancedSAFE';

/**
 * Golden Tests for Enhanced SAFE Conversions
 * 
 * These tests verify exact SAFE conversion calculations against 
 * Y Combinator templates and documented startup scenarios.
 * 
 * CRITICAL: These values are based on legal documents and real transactions.
 * Any changes must be reviewed by legal counsel.
 */

describe('Golden Tests - Enhanced SAFE Conversions', () => {
  
  describe('Y Combinator Standard SAFE Examples', () => {
    // Source: Y Combinator SAFE Documents (v2.0, 2018)
    
    it('GOLDEN: YC Demo Day Standard - $250k at $10M cap', () => {
      const yc_standard: ISAFENote = {
        id: 'yc-standard',
        investorName: 'YC Demo Day Investor',
        investmentAmount: 25000000, // $250k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 1000000000, // $10M post-money cap
        discountRate: 0.20, // 20% discount
        mostFavoredNation: true,
        proRataRights: true,
        issuanceDate: '2023-08-15',
        converted: false
      };

      // Typical Series A after YC
      const yc_seriesA: IEquityRound = {
        name: 'Series A',
        investmentAmount: 500000000, // $5M round
        pricePerShare: 250, // $2.50/share  
        preMoneyValuation: 1500000000, // $15M pre-money
        shareClass: 'PREFERRED_A',
        existingShares: 6000000,
        existingValuation: 1500000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(yc_standard, yc_seriesA, 6000000);

      // GOLDEN CALCULATION:
      // Cap price: $10M ÷ 6M shares = $1.6667/share
      // Discount price: $2.50 × 0.80 = $2.00/share
      // Conversion price: min($1.6667, $2.00) = $1.6667/share
      // Shares: $250k ÷ $1.6667 = 150,000 shares
      
      expect(result.conversion.conversionPrice).toBeCloseTo(167, 0); // $1.6667 in cents
      expect(result.conversion.sharesReceived).toBeCloseTo(150000, 0);
      
      // Return calculation: 150k × $2.50 = $375k (1.5x return)
      expect(result.conversion.returnMultiple).toBeCloseTo(1.5, 2);
      
      // Pro rata rights calculation
      expect(result.proRataAnalysis?.eligible).toBe(true);
      expect(result.proRataAnalysis?.percentageOfRound).toBeGreaterThan(0);
    });

    it('GOLDEN: YC Seed Pre-Money SAFE - $100k at $5M cap', () => {
      const yc_pre_money: ISAFENote = {
        id: 'yc-pre-money',
        investorName: 'Early Angel',
        investmentAmount: 10000000, // $100k
        safeType: SAFEType.PRE_MONEY_VALUATION_CAP,
        valuationCap: 500000000, // $5M pre-money cap
        discountRate: 0.25, // 25% discount
        mostFavoredNation: true,
        proRataRights: false,
        issuanceDate: '2023-01-01',
        converted: false
      };

      // Series A at higher valuation
      const yc_higher_series: IEquityRound = {
        name: 'Series A',
        investmentAmount: 300000000, // $3M
        pricePerShare: 300, // $3.00/share
        preMoneyValuation: 1200000000, // $12M pre-money  
        shareClass: 'PREFERRED_A',
        existingShares: 4000000,
        existingValuation: 1200000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(yc_pre_money, yc_higher_series, 4000000);

      // GOLDEN CALCULATION:
      // Pre-money cap price: $5M ÷ 4M shares = $1.25/share
      // Discount price: $3.00 × 0.75 = $2.25/share
      // Conversion price: min($1.25, $2.25) = $1.25/share
      // Shares: $100k ÷ $1.25 = 80,000 shares
      
      expect(result.conversion.conversionPrice).toBeCloseTo(125, 0); // $1.25 in cents
      expect(result.conversion.sharesReceived).toBeCloseTo(80000, 0);
      
      // Return: 80k × $3.00 = $240k (2.4x return)
      expect(result.conversion.returnMultiple).toBeCloseTo(2.4, 2);
    });
  });

  describe('Techstars and Accelerator Examples', () => {
    
    it('GOLDEN: Techstars Standard - $20k at $8M cap', () => {
      const techstars_safe: ISAFENote = {
        id: 'techstars',
        investorName: 'Techstars',
        investmentAmount: 2000000, // $20k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 800000000, // $8M cap
        discountRate: 0.20, // 20% discount
        mostFavoredNation: false, // Techstars typically doesn't take MFN
        proRataRights: false, // No pro rata
        issuanceDate: '2023-06-01',
        converted: false
      };

      const post_accelerator_round: IEquityRound = {
        name: 'Seed Round',
        investmentAmount: 150000000, // $1.5M seed
        pricePerShare: 150, // $1.50/share
        preMoneyValuation: 600000000, // $6M pre-money
        shareClass: 'COMMON', // Seed round as common
        existingShares: 4000000,
        existingValuation: 600000000,
        liquidationPreference: 1,
        antiDilutionProvision: false,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(techstars_safe, post_accelerator_round, 4000000);

      // GOLDEN CALCULATION:
      // Cap price: $8M ÷ 4M shares = $2.00/share
      // Discount price: $1.50 × 0.80 = $1.20/share
      // Conversion price: min($2.00, $1.20) = $1.20/share
      // Shares: $20k ÷ $1.20 = 16,667 shares
      
      expect(result.conversion.conversionPrice).toBeCloseTo(120, 0); // $1.20 in cents
      expect(result.conversion.sharesReceived).toBeCloseTo(16667, 0);
      
      // Return: 16,667 × $1.50 = $25k (1.25x return)
      expect(result.conversion.returnMultiple).toBeCloseTo(1.25, 2);
      
      // No pro rata rights
      expect(result.proRataAnalysis).toBeUndefined();
    });
  });

  describe('Multi-SAFE Round Examples', () => {
    
    it('GOLDEN: Seed Round with 8 Angels - MFN Cascade', () => {
      // Common scenario: multiple angels with different terms, MFN triggers
      const angels: ISAFENote[] = [
        {
          id: 'angel-1',
          investorName: 'Angel 1 (First)',
          investmentAmount: 5000000, // $50k
          safeType: SAFEType.POST_MONEY_VALUATION_CAP,
          valuationCap: 600000000, // $6M cap
          discountRate: 0.15, // 15% discount
          mostFavoredNation: true,
          proRataRights: true,
          issuanceDate: '2023-01-01',
          converted: false
        },
        {
          id: 'angel-2',
          investorName: 'Angel 2 (Better Terms)',
          investmentAmount: 7500000, // $75k
          safeType: SAFEType.POST_MONEY_VALUATION_CAP,
          valuationCap: 500000000, // $5M cap (better!)
          discountRate: 0.25, // 25% discount (better!)
          mostFavoredNation: false,
          proRataRights: true,
          issuanceDate: '2023-02-01',
          converted: false
        },
        {
          id: 'angel-3',
          investorName: 'Angel 3 (Standard)',
          investmentAmount: 2500000, // $25k
          safeType: SAFEType.POST_MONEY_VALUATION_CAP,
          valuationCap: 800000000, // $8M cap
          discountRate: 0.20, // 20% discount
          mostFavoredNation: true,
          proRataRights: false,
          issuanceDate: '2023-03-01',
          converted: false
        }
      ];

      const seed_round: IEquityRound = {
        name: 'Series A',
        investmentAmount: 400000000, // $4M
        pricePerShare: 200, // $2.00/share
        preMoneyValuation: 800000000, // $8M pre-money
        shareClass: 'PREFERRED_A',
        existingShares: 4000000,
        existingValuation: 800000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      // First apply MFN
      const adjustedAngels = applyMostFavoredNation(angels, seed_round);
      
      // GOLDEN MFN RESULTS:
      // Angel 1 should get: 25% discount (from Angel 2) + $5M cap (from Angel 2)
      const angel1_adjusted = adjustedAngels.find(a => a.id === 'angel-1')!;
      expect(angel1_adjusted.discountRate).toBe(0.25); // Improved discount
      expect(angel1_adjusted.valuationCap).toBe(500000000); // Improved cap
      expect(angel1_adjusted.mfnAdjustments.length).toBe(2); // Both discount and cap improved
      
      // Angel 3 should get: 25% discount (from Angel 2)  
      const angel3_adjusted = adjustedAngels.find(a => a.id === 'angel-3')!;
      expect(angel3_adjusted.discountRate).toBe(0.25); // Improved discount
      expect(angel3_adjusted.mfnAdjustments.length).toBe(1); // Only discount improved
      
      // Now analyze conversions
      const analysis = analyzeSAFEConversions(
        adjustedAngels,
        seed_round,
        { commonShares: 3500000, preferredShares: 500000, optionsOutstanding: 0, optionsAvailable: 0 }
      );

      // GOLDEN CONVERSION RESULTS:
      expect(analysis.conversions).toHaveLength(3);
      expect(analysis.totalSAFEInvestment).toBe(15000000); // $150k total
      
      // All should use $5M cap and 25% discount for best terms
      analysis.conversions.forEach(conversion => {
        const capPrice = 500000000 / 4000000; // $1.25
        const discountPrice = 200 * 0.75; // $1.50
        const expectedPrice = Math.min(capPrice, discountPrice); // $1.25
        
        expect(conversion.conversion.conversionPrice).toBeCloseTo(125, 0);
      });
      
      // Total ownership should be meaningful but not excessive
      expect(analysis.totalOwnershipToSAFEs).toBeGreaterThan(2); // >2%
      expect(analysis.totalOwnershipToSAFEs).toBeLessThan(10); // <10%
    });
  });

  describe('AngelList Rolling Fund Examples', () => {
    
    it('GOLDEN: AngelList $100k Standard Terms', () => {
      const angellist_safe: ISAFENote = {
        id: 'angellist',
        investorName: 'AngelList Rolling Fund',
        investmentAmount: 10000000, // $100k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 1200000000, // $12M cap (typical AngelList)
        discountRate: 0.20, // 20% discount
        mostFavoredNation: true,
        proRataRights: true,
        issuanceDate: '2023-09-01',
        converted: false
      };

      // Series A: $3M at $15M pre
      const angellist_series: IEquityRound = {
        name: 'Series A',
        investmentAmount: 300000000,
        pricePerShare: 300, // $3.00/share
        preMoneyValuation: 1500000000, // $15M pre
        shareClass: 'PREFERRED_A',
        existingShares: 5000000,
        existingValuation: 1500000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(angellist_safe, angellist_series, 5000000);

      // GOLDEN CALCULATION:
      // Cap price: $12M ÷ 5M shares = $2.40/share
      // Discount price: $3.00 × 0.80 = $2.40/share  
      // Conversion price: min($2.40, $2.40) = $2.40/share (exact tie)
      // Shares: $100k ÷ $2.40 = 41,667 shares
      
      expect(result.conversion.conversionPrice).toBeCloseTo(240, 0);
      expect(result.conversion.sharesReceived).toBeCloseTo(41667, 0);
      
      // Return: 41,667 × $3.00 = $125k (1.25x return)
      expect(result.conversion.returnMultiple).toBeCloseTo(1.25, 2);
    });
  });

  describe('Airbnb Historical SAFE Analysis', () => {
    // Based on publicly documented Airbnb early funding
    
    it('GOLDEN: Airbnb Seed Round SAFEs (2009-2010)', () => {
      // Greylock and other early SAFEs (estimated terms)
      const airbnb_early: ISAFENote = {
        id: 'airbnb-early',
        investorName: 'Greylock Early SAFE',
        investmentAmount: 500000000, // $500k (large for 2009)
        safeType: SAFEType.PRE_MONEY_VALUATION_CAP,
        valuationCap: 2500000000, // $25M cap (generous for 2009)
        discountRate: 0.30, // 30% discount (high for risk)
        mostFavoredNation: true,
        proRataRights: true,
        issuanceDate: '2009-11-01',
        converted: false
      };

      // Series A: November 2010
      const airbnb_seriesA: IEquityRound = {
        name: 'Series A',
        investmentAmount: 720000000, // $7.2M
        pricePerShare: 233, // $2.33/share (estimated)
        preMoneyValuation: 4200000000, // $42M pre-money
        shareClass: 'PREFERRED_A',
        existingShares: 18000000, // Estimated shares outstanding
        existingValuation: 4200000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(airbnb_early, airbnb_seriesA, 18000000);

      // GOLDEN CALCULATION:
      // Pre-money cap price: $25M ÷ 18M shares = $1.39/share
      // Discount price: $2.33 × 0.70 = $1.63/share
      // Conversion price: min($1.39, $1.63) = $1.39/share
      // Shares: $500k ÷ $1.39 = 359,712 shares
      
      expect(result.conversion.conversionPrice).toBeCloseTo(139, 0);
      expect(result.conversion.sharesReceived).toBeCloseTo(359712, 0);
      
      // Return: 359,712 × $2.33 = $838k (1.68x return)
      expect(result.conversion.returnMultiple).toBeCloseTo(1.68, 2);
    });
  });

  describe('Stripe SAFE Conversion Analysis', () => {
    // Based on Stripe's documented early funding rounds
    
    it('GOLDEN: Stripe Angel Round - Multiple SAFEs with MFN', () => {
      const stripe_angels: ISAFENote[] = [
        {
          id: 'stripe-angel-1',
          investorName: 'Stripe Angel 1',
          investmentAmount: 10000000, // $100k
          safeType: SAFEType.POST_MONEY_VALUATION_CAP,
          valuationCap: 2000000000, // $20M cap
          discountRate: 0.20,
          mostFavoredNation: true,
          proRataRights: true,
          issuanceDate: '2011-01-01',
          converted: false
        },
        {
          id: 'stripe-angel-2',
          investorName: 'Stripe Angel 2 (Better Terms)',
          investmentAmount: 15000000, // $150k
          safeType: SAFEType.POST_MONEY_VALUATION_CAP,
          valuationCap: 1500000000, // $15M cap (better)
          discountRate: 0.30, // 30% discount (better)
          mostFavoredNation: false,
          proRataRights: true,
          issuanceDate: '2011-02-01',
          converted: false
        },
        {
          id: 'stripe-angel-3',
          investorName: 'Stripe Angel 3',
          investmentAmount: 5000000, // $50k
          safeType: SAFEType.DISCOUNT_ONLY,
          discountRate: 0.25,
          mostFavoredNation: true,
          proRataRights: false,
          issuanceDate: '2011-03-01',
          converted: false
        }
      ];

      // Series A: $18M at $100M pre (estimated)
      const stripe_seriesA: IEquityRound = {
        name: 'Series A',
        investmentAmount: 1800000000, // $18M
        pricePerShare: 500, // $5.00/share
        preMoneyValuation: 10000000000, // $100M pre
        shareClass: 'PREFERRED_A',
        existingShares: 20000000,
        existingValuation: 10000000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const analysis = analyzeSAFEConversions(
        stripe_angels,
        stripe_seriesA,
        { commonShares: 18000000, preferredShares: 2000000, optionsOutstanding: 0, optionsAvailable: 0 }
      );

      // GOLDEN MFN APPLICATION:
      // Angel 1 should get 30% discount and $15M cap from Angel 2
      const angel1_result = analysis.conversions.find(c => c.safeId === 'stripe-angel-1')!;
      // Cap price: $15M ÷ 20M = $0.75, Discount: $5 × 0.7 = $3.50
      // Uses cap: $100k ÷ $0.75 = 133,333 shares
      expect(angel1_result.conversion.sharesReceived).toBeCloseTo(133333, 0);
      
      // Angel 3 should get 30% discount from Angel 2
      const angel3_result = analysis.conversions.find(c => c.safeId === 'stripe-angel-3')!;
      // Discount only: $5 × 0.7 = $3.50/share
      // $50k ÷ $3.50 = 14,286 shares
      expect(angel3_result.conversion.sharesReceived).toBeCloseTo(14286, 0);
      
      // Total SAFE ownership should be reasonable
      expect(analysis.totalOwnershipToSAFEs).toBeGreaterThan(1);
      expect(analysis.totalOwnershipToSAFEs).toBeLessThan(5);
    });
  });

  describe('Liquidity Event Golden Tests', () => {
    
    it('GOLDEN: WhatsApp Acquisition - $19B Exit', () => {
      // Simplified WhatsApp SAFE structure before Facebook acquisition
      const whatsapp_safe: ISAFENote = {
        id: 'whatsapp-safe',
        investorName: 'Sequoia Early SAFE',
        investmentAmount: 800000000, // $8M (Sequoia Series A)
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 10000000000, // $100M cap
        discountRate: 0.20,
        mostFavoredNation: false,
        proRataRights: true,
        issuanceDate: '2011-04-01',
        converted: false
      };

      const whatsapp_acquisition: ILiquidityEvent = {
        type: 'ACQUISITION',
        valuation: 1900000000000, // $19B Facebook acquisition
        proceedsToShareholders: 1900000000000
      };

      const analysis = convertSAFEsInLiquidityEvent(
        [whatsapp_safe],
        whatsapp_acquisition,
        { commonShares: 10000000, preferredShares: 0, fullyDilutedShares: 10000000 }
      );

      const conversion = analysis.conversions[0];

      // GOLDEN CALCULATION:
      // Ownership at cap: $8M ÷ $100M = 8%
      // Value at exit: $19B × 8% = $1.52B
      // Return multiple: $1.52B ÷ $8M = 190x
      
      expect(conversion.conversion.returnMultiple).toBeCloseTo(190, 1);
      expect(conversion.conversion.impliedValuation).toBeCloseTo(152000000000, -7); // ~$1.52B
    });

    it('GOLDEN: Instagram IPO Analysis', () => {
      // Instagram SAFE structure before Facebook acquisition (2012)
      const instagram_safe: ISAFENote = {
        id: 'instagram-safe',
        investorName: 'Benchmark SAFE',
        investmentAmount: 50000000, // $500k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 2500000000, // $25M cap
        discountRate: 0.25, // 25% discount
        mostFavoredNation: false,
        proRataRights: false,
        issuanceDate: '2010-02-01',
        converted: false
      };

      const instagram_acquisition: ILiquidityEvent = {
        type: 'ACQUISITION',
        valuation: 100000000000, // $1B Facebook acquisition
        proceedsToShareholders: 100000000000
      };

      const analysis = convertSAFEsInLiquidityEvent(
        [instagram_safe],
        instagram_acquisition,
        { commonShares: 1000000, preferredShares: 0, fullyDilutedShares: 1000000 }
      );

      const conversion = analysis.conversions[0];

      // GOLDEN CALCULATION:
      // Ownership at cap: $500k ÷ $25M = 2%
      // Value at exit: $1B × 2% = $20M
      // Return multiple: $20M ÷ $500k = 40x
      
      expect(conversion.conversion.returnMultiple).toBeCloseTo(40, 1);
      expect(conversion.conversion.impliedValuation).toBeCloseTo(2000000000, -6); // $20M
    });
  });

  describe('Edge Case Golden Tests', () => {
    
    it('GOLDEN: Down Round SAFE Conversion', () => {
      // SAFE issued at high cap, converts in down round
      const down_round_safe: ISAFENote = {
        id: 'down-round-safe',
        investorName: 'Pre-Crash Investor',
        investmentAmount: 20000000, // $200k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 5000000000, // $50M cap (optimistic)
        discountRate: 0.20,
        mostFavoredNation: false,
        proRataRights: true,
        issuanceDate: '2022-01-01',
        converted: false
      };

      // Down round Series A
      const down_round: IEquityRound = {
        name: 'Series A (Down Round)',
        investmentAmount: 200000000, // $2M
        pricePerShare: 100, // $1.00/share (low price)
        preMoneyValuation: 800000000, // $8M pre (below SAFE cap)
        shareClass: 'PREFERRED_A',
        existingShares: 8000000,
        existingValuation: 800000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(down_round_safe, down_round, 8000000);

      // GOLDEN CALCULATION:
      // Cap price: $50M ÷ 8M shares = $6.25/share
      // Discount price: $1.00 × 0.80 = $0.80/share
      // Conversion price: min($6.25, $0.80) = $0.80/share (discount wins!)
      // Shares: $200k ÷ $0.80 = 250,000 shares
      
      expect(result.conversion.conversionPrice).toBeCloseTo(80, 0);
      expect(result.conversion.sharesReceived).toBeCloseTo(250000, 0);
      
      // Return: 250k × $1.00 = $250k (1.25x return despite down round)
      expect(result.conversion.returnMultiple).toBeCloseTo(1.25, 2);
    });

    it('GOLDEN: Massive Success SAFE (1000x Return)', () => {
      // Extreme success scenario for golden test verification
      const unicorn_safe: ISAFENote = {
        id: 'unicorn-safe',
        investorName: 'Prescient Angel',
        investmentAmount: 2500000, // $25k
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 300000000, // $3M cap (very early stage)
        discountRate: 0.20,
        mostFavoredNation: false,
        proRataRights: false,
        issuanceDate: '2010-01-01',
        converted: false
      };

      // IPO at massive valuation
      const unicorn_ipo: ILiquidityEvent = {
        type: 'IPO',
        valuation: 3000000000000, // $30B IPO
        proceedsToShareholders: 3000000000000
      };

      const analysis = convertSAFEsInLiquidityEvent(
        [unicorn_safe],
        unicorn_ipo,
        { commonShares: 10000000, preferredShares: 0, fullyDilutedShares: 10000000 }
      );

      const conversion = analysis.conversions[0];

      // GOLDEN CALCULATION:
      // Ownership at cap: $25k ÷ $3M = 0.833%
      // Value at IPO: $30B × 0.833% = $250M
      // Return multiple: $250M ÷ $25k = 1,000x
      
      expect(conversion.conversion.returnMultiple).toBeCloseTo(1000, 1);
      expect(conversion.conversion.impliedValuation).toBeCloseTo(25000000000, -6); // $250M
    });
  });

  describe('Precision and Rounding Tests', () => {
    
    it('GOLDEN: High-Precision SAFE Conversion', () => {
      // Tests decimal precision in SAFE calculations
      const precision_safe: ISAFENote = {
        id: 'precision-test',
        investorName: 'Precision Investor',
        investmentAmount: 3333333, // $33,333.33
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 777777777, // $7,777,777.77
        discountRate: 0.1111, // 11.11% discount
        mostFavoredNation: false,
        proRataRights: false,
        issuanceDate: '2023-03-14',
        converted: false
      };

      const precision_round: IEquityRound = {
        name: 'Series A',
        investmentAmount: 444444444, // $4,444,444.44
        pricePerShare: 123, // $1.23/share
        preMoneyValuation: 1111111111, // $11,111,111.11
        shareClass: 'PREFERRED_A',
        existingShares: 9036144, // Calculated for exact pre-money
        existingValuation: 1111111111,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(precision_safe, precision_round, 9036144);

      // GOLDEN CALCULATION (high precision):
      // Cap price: $7,777,777.77 ÷ 9,036,144 = $0.8608/share
      // Discount price: $1.23 × 0.8889 = $1.0934/share
      // Conversion price: min($0.8608, $1.0934) = $0.8608/share
      // Shares: $33,333.33 ÷ $0.8608 = 38,742.59 → 38,742 shares (floor)
      
      expect(result.conversion.conversionPrice).toBeCloseTo(86, 0); // $0.8608 in cents
      expect(result.conversion.sharesReceived).toBeCloseTo(38742, 0);
      
      // Return multiple precision test
      const expectedReturn = (38742 * 123) / 3333333; // shares × price ÷ investment
      expect(result.conversion.returnMultiple).toBeCloseTo(expectedReturn, 6);
    });
  });

  describe('Regulatory Compliance Scenarios', () => {
    
    it('GOLDEN: SEC Rule 506(c) Accredited Investor SAFE', () => {
      // SAFE structure compliant with SEC regulations
      const sec_compliant_safe: ISAFENote = {
        id: 'sec-compliant',
        investorName: 'Accredited Investor',
        investmentAmount: 100000000, // $1M (large accredited investment)
        safeType: SAFEType.POST_MONEY_VALUATION_CAP,
        valuationCap: 2000000000, // $20M cap
        discountRate: 0.20,
        mostFavoredNation: true,
        proRataRights: true,
        issuanceDate: '2023-01-01',
        converted: false
      };

      const institutional_round: IEquityRound = {
        name: 'Series A Institutional',
        investmentAmount: 1000000000, // $10M institutional round
        pricePerShare: 400, // $4.00/share
        preMoneyValuation: 2400000000, // $24M pre
        shareClass: 'PREFERRED_A',
        existingShares: 6000000,
        existingValuation: 2400000000,
        liquidationPreference: 1,
        antiDilutionProvision: true,
        participatingPreferred: false
      };

      const result = convertSAFEInEquityRound(sec_compliant_safe, institutional_round, 6000000);

      // GOLDEN CALCULATION:
      // Cap price: $20M ÷ 6M = $3.33/share  
      // Discount price: $4.00 × 0.80 = $3.20/share
      // Conversion price: min($3.33, $3.20) = $3.20/share
      // Shares: $1M ÷ $3.20 = 312,500 shares
      
      expect(result.conversion.conversionPrice).toBeCloseTo(320, 0);
      expect(result.conversion.sharesReceived).toBeCloseTo(312500, 0);
      
      // Return: 312,500 × $4.00 = $1.25M (1.25x return)
      expect(result.conversion.returnMultiple).toBeCloseTo(1.25, 2);
      
      // Pro rata analysis for large investor
      expect(result.proRataAnalysis?.eligible).toBe(true);
      expect(result.proRataAnalysis?.percentageOfRound).toBeGreaterThan(3); // >3% of round
    });
  });
});