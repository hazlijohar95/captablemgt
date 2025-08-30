# Financial Calculations Documentation

## Overview

This document provides comprehensive documentation for the advanced financial calculation engines implemented in the Cap Table Management Platform. These calculations are critical for accurate equity management, regulatory compliance, and financial reporting.

## Table of Contents

1. [Anti-Dilution Adjustments](#anti-dilution-adjustments)
2. [Liquidation Preference Stacking](#liquidation-preference-stacking)
3. [Tax Liability Calculations](#tax-liability-calculations)
4. [Enhanced SAFE Note Conversions](#enhanced-safe-note-conversions)
5. [Integration Examples](#integration-examples)
6. [Testing and Validation](#testing-and-validation)

## Anti-Dilution Adjustments

### Overview

Anti-dilution provisions protect investors from dilution when a company issues shares at a lower price than previous rounds. The system supports two main types of anti-dilution protection.

### API Reference

#### `calculateFullRatchet(series, downRound)`

Provides complete protection against dilution by adjusting conversion ratios to the new lower price.

**Parameters:**
- `series: IPreferredSeries` - The preferred share series with anti-dilution rights
- `downRound: IDownRound` - The down round financing details

**Returns:** `IAntiDilutionResult`

**Formula:**
```
Adjustment Factor = Original Issue Price / New Issue Price
New Conversion Ratio = Original Conversion Ratio × Adjustment Factor
```

**Legal Reference:** Standard NVCA Model Documents Section 4.5(a)

#### `calculateWeightedAverage(series, downRound, basis)`

Provides partial protection using weighted average methodology.

**Parameters:**
- `series: IPreferredSeries` - The preferred share series
- `downRound: IDownRound` - The down round details
- `basis: WeightedAverageBasis` - BROAD_BASED or NARROW_BASED

**Returns:** `IAntiDilutionResult`

**Formulas:**

**Broad-Based Weighted Average:**
```
NCP = [(A × O) + (B × P)] / (A + C)

Where:
- NCP = New Conversion Price
- A = Number of shares outstanding (fully diluted)
- O = Original conversion price
- B = Consideration received / New price per share
- P = New price per share  
- C = Number of new shares issued
```

**Narrow-Based Weighted Average:**
```
Same formula but A = Only preferred shares outstanding (excluding options/warrants)
```

**Legal Reference:** Fenwick & West Anti-Dilution Provisions Guide, NVCA Model Documents Section 4.5(b)

### Usage Example

```typescript
import { calculateFullRatchet, calculateWeightedAverage, WeightedAverageBasis } from '@/features/cap-table/calc/antiDilution';

// Full ratchet protection
const fullRatchetResult = calculateFullRatchet(
  {
    seriesName: 'Series A',
    originalPrice: 5.00,
    conversionRatio: 1.0,
    sharesOutstanding: 1000000
  },
  {
    newPrice: 2.00,
    sharesIssued: 500000
  }
);

// Weighted average protection
const weightedResult = calculateWeightedAverage(
  series,
  downRound,
  WeightedAverageBasis.BROAD_BASED
);
```

## Liquidation Preference Stacking

### Overview

Liquidation preference stacking determines the order and amounts distributed to different share classes during a liquidity event. The system supports complex seniority structures, participating preferences, and cumulative dividends.

### API Reference

#### `calculateLiquidationStacking(preferredClasses, commonClasses, liquidationEvent)`

Calculates the complete waterfall distribution for all share classes.

**Parameters:**
- `preferredClasses: IPreferredShareClass[]` - All preferred share classes
- `commonClasses: ICommonShareClass[]` - All common share classes  
- `liquidationEvent: ILiquidationEvent` - Liquidity event details

**Returns:** `ILiquidationAnalysis`

**Distribution Logic:**
1. **Senior Liquidation Preferences** (by seniority rank)
2. **Cumulative Dividends** (if applicable)
3. **Participating Preferred Rights** (if applicable)
4. **Common Stock Distribution** (remainder)

**Legal Reference:** NVCA Model Certificate of Incorporation Section 2.2, Delaware General Corporation Law Section 281

#### `calculateSeniorityWaterfall(classes, proceedsAvailable)`

Handles complex multi-class seniority structures.

**Parameters:**
- `classes: ISeniorityClass[]` - Share classes with seniority rankings
- `proceedsAvailable: number` - Total liquidation proceeds

**Returns:** `ISeniorityResult[]`

### Usage Example

```typescript
import { calculateLiquidationStacking } from '@/features/cap-table/calc/liquidationStacking';

const liquidationAnalysis = calculateLiquidationStacking(
  [
    {
      className: 'Series B',
      seniorityRank: 1,
      liquidationMultiple: 1.0,
      isParticipating: true,
      sharesOutstanding: 2000000,
      originalPrice: 10.00
    },
    {
      className: 'Series A', 
      seniorityRank: 2,
      liquidationMultiple: 1.0,
      isParticipating: false,
      sharesOutstanding: 1000000,
      originalPrice: 5.00
    }
  ],
  [
    {
      className: 'Common',
      sharesOutstanding: 5000000
    }
  ],
  {
    totalProceeds: 50000000,
    eventType: 'ACQUISITION'
  }
);
```

## Tax Liability Calculations

### Overview

Comprehensive tax calculations for equity compensation, supporting ISO/NSO options, AMT calculations, Section 83(b) elections, and multi-jurisdictional scenarios.

### API Reference

#### `calculateOptionTaxLiability(grant, exerciseScenario, taxpayer, saleScenario?)`

Calculates complete tax liability for option exercises and sales.

**Parameters:**
- `grant: IOptionGrant` - Option grant details
- `exerciseScenario: IExerciseScenario` - Exercise parameters
- `taxpayer: ITaxpayer` - Taxpayer profile and tax rates
- `saleScenario?: ISaleScenario` - Optional sale scenario

**Returns:** `ITaxCalculationResult`

**Tax Calculations:**

**ISO Exercise (No Immediate Tax):**
- Regular tax: $0
- AMT adjustment: (FMV - Strike Price) × Shares
- AMT tax: AMT Income × (AMT Rate - Regular Rate)

**NSO Exercise (Immediate Tax):**
- Ordinary income: (FMV - Strike Price) × Shares
- Tax liability: Ordinary Income × Marginal Tax Rate

**ISO Sale Scenarios:**
- **Qualifying Disposition:** Long-term capital gains on entire gain
- **Disqualifying Disposition:** Ordinary income on spread + capital gains on appreciation

**Legal References:** 
- IRC Section 422 (ISOs)
- IRC Section 83 (NSOs) 
- IRC Section 55 (AMT)
- Treasury Regulation 1.422-1

#### `calculateSection83b(grant, election, taxpayer)`

Handles Section 83(b) election tax implications.

### Usage Example

```typescript
import { calculateOptionTaxLiability, OptionType } from '@/features/cap-table/calc/taxCalculations';

const taxResult = calculateOptionTaxLiability(
  {
    optionType: OptionType.ISO,
    strikePrice: 1.00,
    grantDate: new Date('2023-01-01'),
    totalShares: 10000
  },
  {
    exerciseDate: new Date('2024-01-01'),
    sharesExercised: 5000,
    fmvAtExercise: 5.00
  },
  {
    marginalTaxRate: 0.37,
    altMinTaxRate: 0.28,
    longTermCapitalGainsRate: 0.20,
    stateRate: 0.13,
    netInvestmentIncomeRate: 0.038
  }
);
```

## Enhanced SAFE Note Conversions

### Overview

Advanced SAFE (Simple Agreement for Future Equity) conversion calculations supporting all Y Combinator SAFE variants with Most Favored Nation provisions and pro rata rights.

### API Reference

#### `convertSAFEInEquityRound(safe, equityRound, existingShares)`

Converts SAFE notes during equity financing rounds.

**Parameters:**
- `safe: ISAFENote` - SAFE note details
- `equityRound: IEquityRound` - Equity round parameters
- `existingShares: number` - Pre-round share count

**Returns:** `ISAFEConversionResult`

**Conversion Formulas by SAFE Type:**

**Post-Money Valuation Cap:**
```
Conversion Price = Valuation Cap / Post-Money Shares
Post-Money Shares = Existing Shares + (Investment Amount / Price Per Share)
```

**Pre-Money Valuation Cap:**
```
Conversion Price = MIN(
  Valuation Cap / (Existing Shares + Option Pool),
  Discount Price
)
```

**Discount Only:**
```
Conversion Price = Price Per Share × (1 - Discount Rate)
```

**Legal Reference:** Y Combinator SAFE Documents (2018), Series Seed Documents

#### `applyMostFavoredNation(safe, subsequentSafes)`

Applies MFN provisions to existing SAFEs when new SAFEs are issued with better terms.

### Usage Example

```typescript
import { convertSAFEInEquityRound, SAFEType } from '@/features/cap-table/calc/enhancedSAFE';

const conversionResult = convertSAFEInEquityRound(
  {
    safeType: SAFEType.POST_MONEY_VALUATION_CAP,
    investmentAmount: 100000,
    valuationCap: 5000000,
    discountRate: 0.20,
    hasMFN: true,
    hasProRata: true
  },
  {
    pricePerShare: 2.50,
    totalInvestment: 2000000,
    preMoneyValuation: 8000000,
    postMoneyValuation: 10000000
  },
  4000000
);
```

## Integration Examples

### Complete Dilution Analysis

```typescript
import { analyzeAntiDilution } from '@/features/cap-table/calc/antiDilution';
import { convertSAFEInEquityRound } from '@/features/cap-table/calc/enhancedSAFE';

// Comprehensive dilution analysis including SAFE conversions and anti-dilution
const dilutionAnalysis = {
  // Convert all SAFEs first
  safeConversions: safes.map(safe => 
    convertSAFEInEquityRound(safe, equityRound, existingShares)
  ),
  
  // Apply anti-dilution adjustments
  antiDilutionResults: preferredSeries.map(series =>
    analyzeAntiDilution(series, downRound, existingShares)
  )
};
```

### Tax Planning Scenario

```typescript
import { calculateOptionTaxLiability } from '@/features/cap-table/calc/taxCalculations';

// Compare ISO vs NSO tax implications
const isoTax = calculateOptionTaxLiability(isoGrant, exerciseScenario, taxpayer);
const nsoTax = calculateOptionTaxLiability(nsoGrant, exerciseScenario, taxpayer);

const taxComparison = {
  isoTotalTax: isoTax.totalTaxLiability,
  nsoTotalTax: nsoTax.totalTaxLiability,
  recommendation: isoTax.totalTaxLiability < nsoTax.totalTaxLiability ? 'ISO' : 'NSO'
};
```

## Testing and Validation

### Golden Tests

All financial calculations include golden tests based on real-world legal precedents:

- **Anti-Dilution:** Fenwick & West examples, NVCA standard scenarios
- **Liquidation:** Documented case studies from public company filings
- **SAFE Conversions:** Y Combinator examples, Series Seed scenarios
- **Tax Calculations:** IRS Publication 525 examples, Big 4 guidance

### Precision Standards

- All monetary calculations use `Decimal.js` with 28-digit precision
- Rounding follows banker's rounding (ROUND_HALF_EVEN)
- Results validated against Excel models and legal calculators

### Validation Rules

Each calculation engine includes comprehensive input validation:
- Range checks for percentages and rates
- Date validation for time-dependent calculations
- Cross-field validation for logical consistency
- Regulatory compliance checks

## Performance Considerations

- Calculations optimize for accuracy over speed
- Large datasets (10,000+ shareholders) tested for performance
- Memory-efficient algorithms for complex waterfall calculations
- Caching strategies for repeated calculations

## Legal Disclaimers

These calculations are based on standard industry practices and legal precedents. Always consult with qualified legal and tax professionals for:
- Specific legal interpretations
- Tax planning strategies  
- Regulatory compliance requirements
- Complex jurisdictional scenarios

## Support and Maintenance

For questions or issues with financial calculations:
1. Review golden test cases for expected behavior
2. Consult legal references cited in code comments
3. Contact development team for technical issues
4. Engage legal counsel for interpretation questions