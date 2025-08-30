import Decimal from 'decimal.js';
import { 
  ValidationError, 
  financialRules 
} from '@/utils/validation';

// Configure Decimal for high precision tax calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Comprehensive Tax Liability Calculations for Equity Compensation
 * 
 * Implements US federal and state tax calculations for:
 * - ISO (Incentive Stock Options) vs NSO (Non-Qualified Stock Options)
 * - AMT (Alternative Minimum Tax) calculations
 * - Section 83(b) elections
 * - Capital gains treatment (short-term vs long-term)
 * - Exercise timing optimization
 * 
 * IMPORTANT: This provides estimates only. Users should consult tax professionals.
 * 
 * References:
 * - IRC Section 421-424 (ISOs)
 * - IRC Section 83 (Property transferred in connection with services)
 * - IRC Section 55 (Alternative Minimum Tax)
 * - IRS Publication 525 (Taxable and Nontaxable Income)
 * - State-specific tax codes
 */

export enum OptionType {
  ISO = 'ISO', // Incentive Stock Option
  NSO = 'NSO', // Non-Qualified Stock Option
  RSU = 'RSU', // Restricted Stock Unit
  ESPP = 'ESPP' // Employee Stock Purchase Plan
}

export enum FilingStatus {
  SINGLE = 'SINGLE',
  MARRIED_FILING_JOINTLY = 'MARRIED_FILING_JOINTLY',
  MARRIED_FILING_SEPARATELY = 'MARRIED_FILING_SEPARATELY',
  HEAD_OF_HOUSEHOLD = 'HEAD_OF_HOUSEHOLD'
}

export interface ITaxBracket {
  min: number; // Minimum income for this bracket (in cents)
  max: number; // Maximum income for this bracket (in cents)
  rate: number; // Tax rate as decimal (e.g., 0.22 for 22%)
}

export interface ITaxJurisdiction {
  federal: {
    ordinaryIncomeBrackets: ITaxBracket[];
    capitalGainsBrackets: ITaxBracket[];
    altMinimumTaxRate: number; // AMT rate as decimal
    altMinimumTaxExemption: number; // AMT exemption amount in cents
    altMinimumTaxPhaseout: number; // AMT exemption phaseout threshold in cents
  };
  state: {
    name: string;
    ordinaryIncomeBrackets: ITaxBracket[];
    capitalGainsBrackets: ITaxBracket[];
    hasAMT: boolean;
    altMinimumTaxRate?: number;
  };
}

export interface IOptionGrant {
  id: string;
  grantDate: string; // ISO date
  exercisePrice: number; // Strike price in cents
  sharesGranted: number;
  optionType: OptionType;
  vestingSchedule: {
    cliff: number; // Months
    duration: number; // Months
    frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  };
  expirationDate: string; // ISO date
  fairMarketValueAtGrant: number; // FMV at grant in cents
}

export interface IExerciseScenario {
  exerciseDate: string; // ISO date
  sharesExercised: number;
  fairMarketValueAtExercise: number; // FMV at exercise in cents
  section83bElection: boolean; // Whether Section 83(b) election was made
}

export interface ISaleScenario {
  saleDate: string; // ISO date
  sharesSold: number;
  salePrice: number; // Price per share in cents
}

export interface ITaxpayer {
  filingStatus: FilingStatus;
  ordinaryIncome: number; // Annual ordinary income in cents
  state: string; // State code for state tax calculations
  jurisdiction: ITaxJurisdiction;
}

export interface ITaxCalculationResult {
  optionId: string;
  exerciseDate: string;
  sharesExercised: number;
  
  // Exercise tax implications
  exercise: {
    // For NSOs and RSUs
    ordinaryIncomeAtExercise: number;
    federalWithholdingRequired: number;
    stateWithholdingRequired: number;
    
    // For ISOs
    isoSpread: number; // FMV - Exercise Price
    amtAdjustment: number; // AMT adjustment for ISOs
    disqualifyingDisposition: boolean;
    
    // Total tax liability at exercise
    totalTaxAtExercise: number;
    
    // Cash required for exercise and taxes
    exerciseCost: number; // Strike price × shares
    cashForTaxes: number; // Withholding + estimated taxes
    totalCashRequired: number;
  };
  
  // Sale tax implications (if applicable)
  sale?: {
    saleDate: string;
    sharesSold: number;
    grossProceeds: number;
    
    // Basis calculations
    costBasis: number;
    adjustedBasis: number; // For AMT purposes
    
    // Gain/loss calculations
    capitalGain: number;
    isLongTerm: boolean;
    
    // Tax calculations
    federalCapitalGainsTax: number;
    stateCapitalGainsTax: number;
    netInvestmentIncomeTax: number; // 3.8% NIIT if applicable
    totalTaxOnSale: number;
    
    // Net proceeds
    netProceeds: number;
  };
  
  // Overall analysis
  summary: {
    totalTaxLiability: number;
    effectiveTaxRate: number;
    afterTaxValue: number;
    amtLiability: number;
    recommendations: string[];
  };
}

/**
 * Calculate comprehensive tax liability for option exercise and sale
 * 
 * @param grant - Option grant details
 * @param exerciseScenario - Exercise scenario
 * @param saleScenario - Sale scenario (optional)
 * @param taxpayer - Taxpayer information
 * @returns Comprehensive tax calculation
 */
export function calculateOptionTaxLiability(
  grant: IOptionGrant,
  exerciseScenario: IExerciseScenario,
  taxpayer: ITaxpayer,
  saleScenario?: ISaleScenario
): ITaxCalculationResult {
  validateTaxInputs(grant, exerciseScenario, taxpayer, saleScenario);
  
  const exercisePrice = new Decimal(grant.exercisePrice);
  const sharesExercised = new Decimal(exerciseScenario.sharesExercised);
  const fmvAtExercise = new Decimal(exerciseScenario.fairMarketValueAtExercise);
  
  // Calculate exercise costs and spread
  const exerciseCost = exercisePrice.times(sharesExercised);
  const isoSpread = fmvAtExercise.minus(exercisePrice).times(sharesExercised);
  
  let exerciseResults;
  
  if (grant.optionType === OptionType.ISO) {
    exerciseResults = calculateISOExerciseTax(
      grant, exerciseScenario, taxpayer, exerciseCost, isoSpread
    );
  } else {
    exerciseResults = calculateNSOExerciseTax(
      grant, exerciseScenario, taxpayer, exerciseCost, isoSpread
    );
  }
  
  // Calculate sale tax implications if sale scenario provided
  let saleResults;
  if (saleScenario) {
    saleResults = calculateSaleTax(
      grant, exerciseScenario, saleScenario, taxpayer, exerciseResults
    );
  }
  
  // Generate overall summary and recommendations
  const totalTaxLiability = exerciseResults.totalTaxAtExercise + (saleResults?.totalTaxOnSale || 0);
  const grossValue = saleScenario 
    ? new Decimal(saleScenario.salePrice).times(saleScenario.sharesSold).toNumber()
    : fmvAtExercise.times(sharesExercised).toNumber();
  
  const effectiveTaxRate = grossValue > 0 ? totalTaxLiability / grossValue : 0;
  const afterTaxValue = grossValue - totalTaxLiability - exerciseCost.toNumber();
  
  const recommendations = generateTaxRecommendations(
    grant, exerciseScenario, taxpayer, exerciseResults, saleResults
  );
  
  return {
    optionId: grant.id,
    exerciseDate: exerciseScenario.exerciseDate,
    sharesExercised: sharesExercised.toNumber(),
    exercise: exerciseResults,
    sale: saleResults,
    summary: {
      totalTaxLiability,
      effectiveTaxRate,
      afterTaxValue,
      amtLiability: exerciseResults.amtAdjustment,
      recommendations
    }
  };
}

/**
 * Calculate tax liability for ISO exercise
 */
function calculateISOExerciseTax(
  _grant: IOptionGrant,
  _exerciseScenario: IExerciseScenario,
  taxpayer: ITaxpayer,
  exerciseCost: Decimal,
  isoSpread: Decimal
) {
  // ISO exercise: No ordinary income at exercise for regular tax
  const ordinaryIncomeAtExercise = 0;
  
  // But ISO spread is AMT adjustment
  const amtAdjustment = isoSpread.toNumber();
  
  // Calculate AMT liability
  const adjustedOrdinaryIncome = new Decimal(taxpayer.ordinaryIncome).plus(amtAdjustment);
  const amtTax = calculateAMT(adjustedOrdinaryIncome.toNumber(), taxpayer);
  const regularTax = calculateFederalTax(taxpayer.ordinaryIncome, taxpayer.jurisdiction.federal.ordinaryIncomeBrackets);
  const amtLiability = Math.max(0, amtTax - regularTax);
  
  // No federal withholding for ISO exercise
  const federalWithholdingRequired = 0;
  const stateWithholdingRequired = 0;
  
  return {
    ordinaryIncomeAtExercise,
    federalWithholdingRequired,
    stateWithholdingRequired,
    isoSpread: isoSpread.toNumber(),
    amtAdjustment,
    disqualifyingDisposition: false, // Will be determined at sale
    totalTaxAtExercise: amtLiability,
    exerciseCost: exerciseCost.toNumber(),
    cashForTaxes: amtLiability,
    totalCashRequired: exerciseCost.plus(amtLiability).toNumber()
  };
}

/**
 * Calculate tax liability for NSO exercise
 */
function calculateNSOExerciseTax(
  _grant: IOptionGrant,
  _exerciseScenario: IExerciseScenario,
  taxpayer: ITaxpayer,
  exerciseCost: Decimal,
  spread: Decimal
) {
  // NSO exercise: Ordinary income equal to spread
  const ordinaryIncomeAtExercise = spread.toNumber();
  
  // Calculate withholding requirements
  const federalWithholdingRate = 0.22; // Standard supplemental rate
  const federalWithholdingRequired = spread.times(federalWithholdingRate).toNumber();
  
  // State withholding varies by state
  const stateWithholdingRate = getStateWithholdingRate(taxpayer.state);
  const stateWithholdingRequired = spread.times(stateWithholdingRate).toNumber();
  
  // Calculate total tax liability
  const federalTax = calculateFederalTax(
    taxpayer.ordinaryIncome + ordinaryIncomeAtExercise,
    taxpayer.jurisdiction.federal.ordinaryIncomeBrackets
  ) - calculateFederalTax(taxpayer.ordinaryIncome, taxpayer.jurisdiction.federal.ordinaryIncomeBrackets);
  
  const stateTax = calculateStateTax(
    taxpayer.ordinaryIncome + ordinaryIncomeAtExercise,
    taxpayer.jurisdiction.state.ordinaryIncomeBrackets
  ) - calculateStateTax(taxpayer.ordinaryIncome, taxpayer.jurisdiction.state.ordinaryIncomeBrackets);
  
  const totalTaxAtExercise = federalTax + stateTax;
  
  return {
    ordinaryIncomeAtExercise,
    federalWithholdingRequired,
    stateWithholdingRequired,
    isoSpread: 0, // Not applicable for NSOs
    amtAdjustment: 0, // NSOs don't trigger AMT
    disqualifyingDisposition: false, // Not applicable for NSOs
    totalTaxAtExercise,
    exerciseCost: exerciseCost.toNumber(),
    cashForTaxes: totalTaxAtExercise,
    totalCashRequired: exerciseCost.plus(totalTaxAtExercise).toNumber()
  };
}

/**
 * Calculate tax liability for stock sale
 */
function calculateSaleTax(
  grant: IOptionGrant,
  exerciseScenario: IExerciseScenario,
  saleScenario: ISaleScenario,
  taxpayer: ITaxpayer,
  _exerciseResults: any
) {
  const sharesSold = new Decimal(saleScenario.sharesSold);
  const salePrice = new Decimal(saleScenario.salePrice);
  const grossProceeds = sharesSold.times(salePrice);
  
  // Determine cost basis
  const exercisePrice = new Decimal(grant.exercisePrice);
  let costBasis: Decimal;
  let adjustedBasis: Decimal;
  
  if (grant.optionType === OptionType.ISO) {
    // ISO basis calculation
    costBasis = exercisePrice.times(sharesSold);
    
    // AMT basis includes the spread at exercise
    const fmvAtExercise = new Decimal(exerciseScenario.fairMarketValueAtExercise);
    adjustedBasis = fmvAtExercise.times(sharesSold);
  } else {
    // NSO basis includes the spread (already taxed as ordinary income)
    const fmvAtExercise = new Decimal(exerciseScenario.fairMarketValueAtExercise);
    costBasis = fmvAtExercise.times(sharesSold);
    adjustedBasis = costBasis; // Same for NSOs
  }
  
  // Calculate capital gain/loss
  const capitalGain = grossProceeds.minus(costBasis);
  const _amtCapitalGain = grossProceeds.minus(adjustedBasis);
  
  // Determine if long-term or short-term
  const exerciseDate = new Date(exerciseScenario.exerciseDate);
  const saleDate = new Date(saleScenario.saleDate);
  const holdingPeriod = (saleDate.getTime() - exerciseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  
  // For ISOs, need both 1-year from exercise AND 2-year from grant for qualifying disposition
  let isLongTerm = holdingPeriod >= 1;
  let isQualifyingDisposition = false;
  
  if (grant.optionType === OptionType.ISO) {
    const grantDate = new Date(grant.grantDate);
    const yearsFromGrant = (saleDate.getTime() - grantDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    isQualifyingDisposition = holdingPeriod >= 1 && yearsFromGrant >= 2;
    isLongTerm = isQualifyingDisposition;
  }
  
  // Calculate taxes based on treatment
  let federalCapitalGainsTax: Decimal;
  let stateCapitalGainsTax: Decimal;
  
  if (isLongTerm) {
    federalCapitalGainsTax = new Decimal(calculateFederalTax(
      capitalGain.toNumber(),
      taxpayer.jurisdiction.federal.capitalGainsBrackets
    ));
    stateCapitalGainsTax = new Decimal(calculateStateTax(
      capitalGain.toNumber(),
      taxpayer.jurisdiction.state.capitalGainsBrackets
    ));
  } else {
    // Short-term capital gains taxed as ordinary income
    federalCapitalGainsTax = new Decimal(calculateFederalTax(
      taxpayer.ordinaryIncome + capitalGain.toNumber(),
      taxpayer.jurisdiction.federal.ordinaryIncomeBrackets
    )).minus(calculateFederalTax(
      taxpayer.ordinaryIncome,
      taxpayer.jurisdiction.federal.ordinaryIncomeBrackets
    ));
    
    stateCapitalGainsTax = new Decimal(calculateStateTax(
      taxpayer.ordinaryIncome + capitalGain.toNumber(),
      taxpayer.jurisdiction.state.ordinaryIncomeBrackets
    )).minus(calculateStateTax(
      taxpayer.ordinaryIncome,
      taxpayer.jurisdiction.state.ordinaryIncomeBrackets
    ));
  }
  
  // Calculate Net Investment Income Tax (3.8% on high earners)
  const netInvestmentIncomeTax = calculateNIIT(
    taxpayer.ordinaryIncome + capitalGain.toNumber(),
    capitalGain.toNumber(),
    taxpayer.filingStatus
  );
  
  const totalTaxOnSale = federalCapitalGainsTax
    .plus(stateCapitalGainsTax)
    .plus(netInvestmentIncomeTax);
  
  const netProceeds = grossProceeds.minus(totalTaxOnSale);
  
  return {
    saleDate: saleScenario.saleDate,
    sharesSold: sharesSold.toNumber(),
    grossProceeds: grossProceeds.toNumber(),
    costBasis: costBasis.toNumber(),
    adjustedBasis: adjustedBasis.toNumber(),
    capitalGain: capitalGain.toNumber(),
    isLongTerm,
    federalCapitalGainsTax: federalCapitalGainsTax.toNumber(),
    stateCapitalGainsTax: stateCapitalGainsTax.toNumber(),
    netInvestmentIncomeTax,
    totalTaxOnSale: totalTaxOnSale.toNumber(),
    netProceeds: netProceeds.toNumber()
  };
}

/**
 * Calculate Alternative Minimum Tax (AMT)
 */
function calculateAMT(
  amtIncome: number,
  taxpayer: ITaxpayer
): number {
  const { federal } = taxpayer.jurisdiction;
  const income = new Decimal(amtIncome);
  
  // Apply AMT exemption
  let exemption = new Decimal(federal.altMinimumTaxExemption);
  
  // Phase out exemption for high earners
  if (income.gt(federal.altMinimumTaxPhaseout)) {
    const phaseoutAmount = income.minus(federal.altMinimumTaxPhaseout).times(0.25);
    exemption = Decimal.max(new Decimal(0), exemption.minus(phaseoutAmount));
  }
  
  // Calculate AMT taxable income
  const amtTaxableIncome = Decimal.max(new Decimal(0), income.minus(exemption));
  
  // Apply AMT rate
  const amtTax = amtTaxableIncome.times(federal.altMinimumTaxRate);
  
  return amtTax.toNumber();
}

/**
 * Calculate federal income tax using brackets
 */
function calculateFederalTax(
  income: number,
  brackets: ITaxBracket[]
): number {
  return calculateTaxFromBrackets(income, brackets);
}

/**
 * Calculate state income tax using brackets
 */
function calculateStateTax(
  income: number,
  brackets: ITaxBracket[]
): number {
  return calculateTaxFromBrackets(income, brackets);
}

/**
 * Generic tax calculation using progressive brackets
 */
function calculateTaxFromBrackets(
  income: number,
  brackets: ITaxBracket[]
): number {
  const totalIncome = new Decimal(income);
  let tax = new Decimal(0);
  let _previousMax = new Decimal(0);
  
  for (const bracket of brackets.sort((a, b) => a.min - b.min)) {
    const bracketMin = new Decimal(bracket.min);
    const bracketMax = new Decimal(bracket.max);
    
    if (totalIncome.lte(bracketMin)) {
      break; // Income doesn't reach this bracket
    }
    
    const taxableInThisBracket = Decimal.min(
      totalIncome.minus(bracketMin),
      bracketMax.minus(bracketMin)
    );
    
    if (taxableInThisBracket.gt(0)) {
      tax = tax.plus(taxableInThisBracket.times(bracket.rate));
    }
    
    _previousMax = bracketMax;
    
    if (totalIncome.lte(bracketMax)) {
      break; // All income has been taxed
    }
  }
  
  return tax.toNumber();
}

/**
 * Calculate Net Investment Income Tax (NIIT)
 * 3.8% tax on investment income for high-income taxpayers
 */
function calculateNIIT(
  totalIncome: number,
  investmentIncome: number,
  filingStatus: FilingStatus
): number {
  const niitThresholds = {
    [FilingStatus.SINGLE]: 20000000, // $200,000 in cents
    [FilingStatus.MARRIED_FILING_JOINTLY]: 25000000, // $250,000 in cents
    [FilingStatus.MARRIED_FILING_SEPARATELY]: 12500000, // $125,000 in cents
    [FilingStatus.HEAD_OF_HOUSEHOLD]: 20000000 // $200,000 in cents
  };
  
  const threshold = niitThresholds[filingStatus];
  
  if (totalIncome <= threshold) {
    return 0; // Below NIIT threshold
  }
  
  const excessIncome = totalIncome - threshold;
  const taxableNIIT = Math.min(investmentIncome, excessIncome);
  
  return taxableNIIT * 0.038; // 3.8% rate
}

/**
 * Get state withholding rate for NSO exercises
 */
function getStateWithholdingRate(stateCode: string): number {
  const stateRates: Record<string, number> = {
    'CA': 0.1023, // California
    'NY': 0.0685, // New York
    'TX': 0.0000, // Texas (no state income tax)
    'FL': 0.0000, // Florida (no state income tax)
    'WA': 0.0000, // Washington (no state income tax)
    'DE': 0.066,  // Delaware
    // Add more states as needed
  };
  
  return stateRates[stateCode] || 0.05; // Default 5% if state not found
}

/**
 * Generate tax optimization recommendations
 */
function generateTaxRecommendations(
  grant: IOptionGrant,
  _exerciseScenario: IExerciseScenario,
  _taxpayer: ITaxpayer,
  exerciseResults: any,
  saleResults?: any
): string[] {
  const recommendations: string[] = [];
  
  // ISO-specific recommendations
  if (grant.optionType === OptionType.ISO) {
    if (exerciseResults.amtAdjustment > 0) {
      recommendations.push(
        'Consider exercising ISOs in smaller tranches to manage AMT impact'
      );
      recommendations.push(
        'Evaluate exercising early in the year to allow AMT credit planning'
      );
    }
    
    if (saleResults && !saleResults.isLongTerm) {
      recommendations.push(
        'Sale may be a disqualifying disposition - consider holding for qualifying treatment'
      );
    }
    
    recommendations.push(
      'Consider Section 83(b) election for early exercise if available'
    );
  }
  
  // General recommendations
  if (exerciseResults.totalCashRequired > 0) {
    recommendations.push(
      `Total cash required: $${(exerciseResults.totalCashRequired / 100).toLocaleString()}`
    );
  }
  
  if (saleResults && saleResults.netInvestmentIncomeTax > 0) {
    recommendations.push(
      'High income triggers 3.8% Net Investment Income Tax on capital gains'
    );
  }
  
  recommendations.push(
    'Consult with a tax professional before exercising options'
  );
  
  return recommendations;
}

/**
 * Calculate optimal exercise timing to minimize taxes
 * 
 * @param grant - Option grant
 * @param taxpayer - Taxpayer information
 * @param exerciseWindows - Potential exercise dates to analyze
 * @param currentFMV - Current fair market value
 * @returns Optimal exercise timing analysis
 */
export function optimizeExerciseTiming(
  grant: IOptionGrant,
  taxpayer: ITaxpayer,
  exerciseWindows: string[],
  currentFMV: number
): Array<{
  exerciseDate: string;
  fmvAtExercise: number;
  taxLiability: number;
  afterTaxValue: number;
  amtImpact: number;
  recommendation: 'OPTIMAL' | 'GOOD' | 'POOR';
  reasons: string[];
}> {
  const results = [];
  
  for (const exerciseDate of exerciseWindows) {
    // For this analysis, assume FMV grows at 20% annually (adjustable)
    const grantDate = new Date(grant.grantDate);
    const exerciseDateObj = new Date(exerciseDate);
    const yearsFromGrant = (exerciseDateObj.getTime() - grantDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    
    // Estimate FMV at exercise date (simple growth model)
    const estimatedFMV = new Decimal(currentFMV).times(
      new Decimal(1.20).pow(yearsFromGrant)
    ).toNumber();
    
    const exerciseScenario: IExerciseScenario = {
      exerciseDate,
      sharesExercised: grant.sharesGranted,
      fairMarketValueAtExercise: estimatedFMV,
      section83bElection: false
    };
    
    const taxResult = calculateOptionTaxLiability(
      grant, exerciseScenario, taxpayer
    );
    
    // Determine recommendation
    let recommendation: 'OPTIMAL' | 'GOOD' | 'POOR';
    const reasons: string[] = [];
    
    if (grant.optionType === OptionType.ISO) {
      if (taxResult.exercise.amtAdjustment < taxpayer.ordinaryIncome * 0.1) {
        recommendation = 'OPTIMAL';
        reasons.push('Low AMT impact relative to income');
      } else if (taxResult.exercise.amtAdjustment < taxpayer.ordinaryIncome * 0.25) {
        recommendation = 'GOOD';
        reasons.push('Moderate AMT impact');
      } else {
        recommendation = 'POOR';
        reasons.push('High AMT impact - consider smaller exercise');
      }
    } else {
      // NSO recommendations based on tax rate optimization
      if (taxResult.summary.effectiveTaxRate < 0.30) {
        recommendation = 'OPTIMAL';
        reasons.push('Favorable effective tax rate');
      } else if (taxResult.summary.effectiveTaxRate < 0.40) {
        recommendation = 'GOOD';
        reasons.push('Reasonable effective tax rate');
      } else {
        recommendation = 'POOR';
        reasons.push('High effective tax rate');
      }
    }
    
    results.push({
      exerciseDate,
      fmvAtExercise: estimatedFMV,
      taxLiability: taxResult.summary.totalTaxLiability,
      afterTaxValue: taxResult.summary.afterTaxValue,
      amtImpact: taxResult.exercise.amtAdjustment,
      recommendation,
      reasons
    });
  }
  
  return results.sort((a, b) => b.afterTaxValue - a.afterTaxValue);
}

/**
 * Get current tax year brackets (2024 tax year)
 * Note: These should be updated annually or fetched from an external source
 */
export function getCurrentTaxBrackets(filingStatus: FilingStatus): ITaxJurisdiction {
  // 2024 Federal Tax Brackets (amounts in cents)
  const federalOrdinaryBrackets: ITaxBracket[] = 
    filingStatus === FilingStatus.SINGLE ? [
      { min: 0, max: 1127500, rate: 0.10 },        // 10% up to $11,275
      { min: 1127500, max: 4555000, rate: 0.12 },  // 12% $11,275 - $45,550
      { min: 4555000, max: 9785000, rate: 0.22 },  // 22% $45,550 - $97,850
      { min: 9785000, max: 20475000, rate: 0.24 }, // 24% $97,850 - $204,750
      { min: 20475000, max: 51875000, rate: 0.32 }, // 32% $204,750 - $518,750
      { min: 51875000, max: 62200000, rate: 0.35 }, // 35% $518,750 - $622,000
      { min: 62200000, max: Infinity, rate: 0.37 }  // 37% $622,000+
    ] : [
      // Married Filing Jointly brackets
      { min: 0, max: 2255000, rate: 0.10 },
      { min: 2255000, max: 9110000, rate: 0.12 },
      { min: 9110000, max: 19570000, rate: 0.22 },
      { min: 19570000, max: 40950000, rate: 0.24 },
      { min: 40950000, max: 73375000, rate: 0.32 },
      { min: 73375000, max: 69340000, rate: 0.35 },
      { min: 69340000, max: Infinity, rate: 0.37 }
    ];
  
  const federalCapitalGainsBrackets: ITaxBracket[] = 
    filingStatus === FilingStatus.SINGLE ? [
      { min: 0, max: 4785000, rate: 0.00 },         // 0% up to $47,850
      { min: 4785000, max: 51875000, rate: 0.15 },  // 15% $47,850 - $518,750
      { min: 51875000, max: Infinity, rate: 0.20 }  // 20% $518,750+
    ] : [
      { min: 0, max: 9570000, rate: 0.00 },         // 0% up to $95,700
      { min: 9570000, max: 59375000, rate: 0.15 },  // 15% $95,700 - $593,750
      { min: 59375000, max: Infinity, rate: 0.20 }  // 20% $593,750+
    ];
  
  return {
    federal: {
      ordinaryIncomeBrackets: federalOrdinaryBrackets,
      capitalGainsBrackets: federalCapitalGainsBrackets,
      altMinimumTaxRate: 0.26, // 26% AMT rate (28% for high earners)
      altMinimumTaxExemption: filingStatus === FilingStatus.SINGLE ? 8500000 : 13260000, // $85k/$132.6k
      altMinimumTaxPhaseout: filingStatus === FilingStatus.SINGLE ? 59900000 : 119800000 // $599k/$1.198M
    },
    state: {
      name: 'California', // Default to CA - highest rates
      ordinaryIncomeBrackets: [
        { min: 0, max: 1000000, rate: 0.01 },
        { min: 1000000, max: 2374100, rate: 0.02 },
        { min: 2374100, max: 5616900, rate: 0.04 },
        { min: 5616900, max: 9813800, rate: 0.06 },
        { min: 9813800, max: 1366830000, rate: 0.08 },
        { min: 1366830000, max: Infinity, rate: 0.1023 }
      ],
      capitalGainsBrackets: [
        { min: 0, max: 1000000, rate: 0.01 },
        { min: 1000000, max: 2374100, rate: 0.02 },
        { min: 2374100, max: 5616900, rate: 0.04 },
        { min: 5616900, max: 9813800, rate: 0.06 },
        { min: 9813800, max: 1366830000, rate: 0.08 },
        { min: 1366830000, max: Infinity, rate: 0.1023 }
      ],
      hasAMT: true,
      altMinimumTaxRate: 0.07 // California AMT rate
    }
  };
}

/**
 * Validate tax calculation inputs
 */
function validateTaxInputs(
  grant: IOptionGrant,
  exerciseScenario: IExerciseScenario,
  taxpayer: ITaxpayer,
  saleScenario?: ISaleScenario
): void {
  try {
    // Validate grant
    financialRules.nonEmptyString(grant.id, 'grant.id');
    financialRules.positiveAmount(grant.exercisePrice, 'grant.exercisePrice');
    financialRules.validShareCount(grant.sharesGranted, 'grant.sharesGranted');
    financialRules.positiveAmount(grant.fairMarketValueAtGrant, 'grant.fairMarketValueAtGrant');
    
    // Validate exercise scenario
    financialRules.validShareCount(exerciseScenario.sharesExercised, 'exerciseScenario.sharesExercised');
    financialRules.positiveAmount(exerciseScenario.fairMarketValueAtExercise, 'exerciseScenario.fairMarketValueAtExercise');
    
    if (exerciseScenario.sharesExercised > grant.sharesGranted) {
      throw new ValidationError(
        'Cannot exercise more shares than granted',
        'exerciseScenario.sharesExercised'
      );
    }
    
    // Validate taxpayer
    financialRules.nonNegativeAmount(taxpayer.ordinaryIncome, 'taxpayer.ordinaryIncome');
    
    // Validate sale scenario if provided
    if (saleScenario) {
      financialRules.validShareCount(saleScenario.sharesSold, 'saleScenario.sharesSold');
      financialRules.positiveAmount(saleScenario.salePrice, 'saleScenario.salePrice');
      
      if (saleScenario.sharesSold > exerciseScenario.sharesExercised) {
        throw new ValidationError(
          'Cannot sell more shares than exercised',
          'saleScenario.sharesSold'
        );
      }
      
      // Validate sale date is after exercise date
      const exerciseDate = new Date(exerciseScenario.exerciseDate);
      const saleDate = new Date(saleScenario.saleDate);
      if (saleDate <= exerciseDate) {
        throw new ValidationError(
          'Sale date must be after exercise date',
          'saleScenario.saleDate'
        );
      }
    }
    
  } catch (error) {
    console.error('Tax calculation validation failed:', error);
    throw error;
  }
}