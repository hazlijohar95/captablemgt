/**
 * Comprehensive scenario modeling engine
 * Integrates all advanced financial calculations into unified scenario analysis
 */

import Decimal from 'decimal.js';
import { 
  ValidationError, 
  financialRules 
} from '@/utils/validation';

// Import all the financial calculation engines
import { calculateDilution, calculateMultipleRounds, ShareholderPosition, RoundScenario } from '../calc/dilution';
import { calculateWaterfall, calculateWaterfallScenarios, SecurityHolder } from '@/features/waterfall/calc/waterfall';
import { convertSAFEInEquityRound, analyzeSAFEConversions, ISAFENote } from '@/features/cap-table/calc/enhancedSAFE';
import { 
  calculateFullRatchet, 
  calculateWeightedAverage, 
  analyzeAntiDilution,
  WeightedAverageBasis 
} from '@/features/cap-table/calc/antiDilution';
import { calculateOptionTaxLiability } from '@/features/cap-table/calc/taxCalculations';
import { calculateLiquidationStacking } from '@/features/cap-table/calc/liquidationStacking';

import {
  ComprehensiveScenario,
  EnhancedRoundScenario,
  ExitScenario,
  ComprehensiveScenarioResult,
  StakeholderTaxAnalysis,
  ScenarioSummary,
  ScenarioComparison,
  SensitivityAnalysis,
  SensitivityVariable,
  ModelingConfiguration
} from '../types/scenarioModeling';

/**
 * Default configuration for scenario modeling
 */
export const defaultModelingConfiguration: ModelingConfiguration = {
  decimalPrecision: 28,
  roundingMethod: 'ROUND_HALF_EVEN',
  defaultTaxRates: {
    ordinaryIncomeRate: 0.37,
    capitalGainsRate: 0.20,
    amtRate: 0.28,
    stateRate: 0.13
  },
  defaultAntiDilutionType: 'WEIGHTED_AVERAGE_BROAD',
  defaultLiquidationMultiple: 1.0,
  defaultParticipationRights: 'FULL',
  chartColors: [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ],
  defaultCurrency: 'USD',
  displayFormat: 'MILLIONS'
};

/**
 * Main engine for comprehensive scenario modeling
 */
export class ComprehensiveScenarioEngine {
  private config: ModelingConfiguration;

  constructor(config: ModelingConfiguration = defaultModelingConfiguration) {
    this.config = config;
    
    // Set Decimal.js configuration
    Decimal.set({
      precision: config.decimalPrecision,
      rounding: this.getDecimalRounding(config.roundingMethod)
    });
  }

  private getDecimalRounding(method: string): number {
    switch (method) {
      case 'ROUND_HALF_UP': return Decimal.ROUND_HALF_UP;
      case 'ROUND_HALF_EVEN': return Decimal.ROUND_HALF_EVEN;
      case 'ROUND_DOWN': return Decimal.ROUND_DOWN;
      default: return Decimal.ROUND_HALF_EVEN;
    }
  }

  /**
   * Calculate comprehensive scenario results
   */
  async calculateComprehensiveScenario(
    scenario: ComprehensiveScenario,
    currentPositions: ShareholderPosition[]
  ): Promise<ComprehensiveScenarioResult> {
    try {
      // Validate inputs
      this.validateScenario(scenario);
      this.validateCurrentPositions(currentPositions);

      // Step 1: Process funding rounds with SAFE conversions and anti-dilution
      const { dilutionResults, antiDilutionResults, safeConversions, finalPositions } = 
        await this.processFundingRounds(scenario.fundingRounds, currentPositions);

      // Step 2: Convert final positions to security holders for waterfall analysis
      const securityHolders = this.convertToSecurityHolders(finalPositions, scenario.fundingRounds);

      // Step 3: Calculate waterfall analysis for all exit scenarios
      const waterfallResults = scenario.exitScenarios.map(exitScenario => 
        calculateWaterfall(securityHolders, exitScenario.exitValue, exitScenario.convertAllToCommon)
      );

      // Step 4: Calculate tax implications for stakeholders
      const taxAnalysis = await this.calculateTaxAnalysis(finalPositions, scenario, waterfallResults);

      // Step 5: Generate comprehensive summary
      const summary = this.generateScenarioSummary(
        scenario, 
        dilutionResults, 
        waterfallResults, 
        finalPositions,
        taxAnalysis
      );

      return {
        scenario,
        dilutionResults,
        antiDilutionResults,
        safeConversions,
        waterfallResults,
        taxAnalysis,
        summary
      };

    } catch (error) {
      console.error('Comprehensive scenario calculation failed:', error);
      throw error;
    }
  }

  /**
   * Process funding rounds with SAFE conversions and anti-dilution adjustments
   */
  private async processFundingRounds(
    rounds: EnhancedRoundScenario[],
    initialPositions: ShareholderPosition[]
  ) {
    const dilutionResults = [];
    const antiDilutionResults = [];
    const safeConversions = [];
    let currentPositions = [...initialPositions];

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];

      // Handle SAFE conversions first
      if (round.convertingSAFEs && round.convertingSAFEs.length > 0) {
        const safesInRound = round.convertingSAFEs;
        const equityRound = {
          pricePerShare: round.pricePerShare, // Keep in cents for precision
          totalInvestment: round.investmentAmount,
          preMoneyValuation: round.preMoney,
          postMoneyValuation: round.preMoney + round.investmentAmount
        };

        const existingShares = currentPositions.reduce((sum, pos) => sum + pos.shares, 0);

        for (const safe of safesInRound) {
          const conversion = convertSAFEInEquityRound(safe, equityRound, existingShares);
          safeConversions.push(conversion);

          // Add converted SAFE holders to current positions
          if (conversion.conversion.sharesIssued > 0) {
            currentPositions.push({
              id: `safe-${safe.id}`,
              name: `SAFE Investor (${safe.id})`,
              shares: conversion.conversion.sharesIssued,
              shareClass: 'PREFERRED'
            });
          }
        }
      }

      // Calculate dilution for this round
      const roundScenario: RoundScenario = {
        name: round.name,
        preMoney: round.preMoney,
        investmentAmount: round.investmentAmount,
        pricePerShare: round.pricePerShare,
        shareClass: round.shareClass,
        optionPoolIncrease: round.optionPoolIncrease,
        includeConversion: round.includeConversion
      };

      const dilutionResult = calculateDilution(currentPositions, roundScenario);
      dilutionResults.push(dilutionResult);

      // Apply anti-dilution adjustments if applicable
      if (round.antiDilutionType && round.antiDilutionType !== 'NONE') {
        const antiDilutionResult = await this.applyAntiDilutionAdjustments(
          round,
          currentPositions,
          dilutionResult
        );
        antiDilutionResults.push(antiDilutionResult);
      }

      // Update current positions for next round
      currentPositions = dilutionResult.postRound.shareholderPositions.map(pos => ({
        id: pos.id,
        name: pos.name,
        shares: pos.shares,
        shareClass: 'COMMON' // Simplified - in practice this would be more nuanced
      }));
    }

    return {
      dilutionResults,
      antiDilutionResults,
      safeConversions,
      finalPositions: currentPositions
    };
  }

  /**
   * Apply anti-dilution adjustments
   */
  private async applyAntiDilutionAdjustments(
    round: EnhancedRoundScenario,
    currentPositions: ShareholderPosition[],
    dilutionResult: any
  ) {
    // This is a simplified implementation
    // In practice, you'd need to identify which series have anti-dilution rights
    // and apply the appropriate calculations

    const preferredSeries = {
      seriesName: round.name,
      originalPrice: round.pricePerShare,
      conversionRatio: 1.0,
      sharesOutstanding: new Decimal(round.investmentAmount).dividedBy(round.pricePerShare).toNumber()
    };

    const downRound = {
      newPrice: round.pricePerShare,
      sharesIssued: new Decimal(round.investmentAmount).dividedBy(round.pricePerShare).toNumber()
    };

    const existingShares = currentPositions.reduce((sum, pos) => sum + pos.shares, 0);

    switch (round.antiDilutionType) {
      case 'FULL_RATCHET':
        return calculateFullRatchet(preferredSeries, downRound);
      
      case 'WEIGHTED_AVERAGE_BROAD':
        return calculateWeightedAverage(
          preferredSeries, 
          downRound, 
          WeightedAverageBasis.BROAD_BASED
        );
      
      case 'WEIGHTED_AVERAGE_NARROW':
        return calculateWeightedAverage(
          preferredSeries, 
          downRound, 
          WeightedAverageBasis.NARROW_BASED
        );
      
      default:
        throw new ValidationError('Invalid anti-dilution type', 'antiDilutionType');
    }
  }

  /**
   * Convert shareholder positions to security holders for waterfall analysis
   */
  private convertToSecurityHolders(
    positions: ShareholderPosition[],
    rounds: EnhancedRoundScenario[]
  ): SecurityHolder[] {
    return positions.map(pos => {
      const holder: SecurityHolder = {
        id: pos.id,
        name: pos.name,
        securityType: pos.shareClass === 'PREFERRED' ? 'PREFERRED_A' : 'COMMON',
        shares: pos.shares
      };

      // Add liquidation preferences for preferred shares
      if (pos.shareClass === 'PREFERRED') {
        // Find the round where this position was created to get terms
        const relevantRound = rounds.find(r => r.shareClass === 'PREFERRED');
        if (relevantRound) {
          holder.liquidationPreference = relevantRound.liquidationPreferenceMultiple || 1.0;
          holder.liquidationAmount = pos.shares * (relevantRound.pricePerShare || 100); // Price per share already in cents
          holder.participation = this.mapParticipationRights(relevantRound.participationRights);
          holder.participationCap = relevantRound.participationCap;
          holder.seniority = relevantRound.seniorityRank || 100;
        }
      }

      return holder;
    });
  }

  private mapParticipationRights(rights?: string): 'NONE' | 'CAPPED' | 'FULL' {
    switch (rights) {
      case 'FULL': return 'FULL';
      case 'CAPPED': return 'CAPPED';
      case 'NONE':
      default: return 'NONE';
    }
  }

  /**
   * Calculate tax analysis for stakeholders
   */
  private async calculateTaxAnalysis(
    positions: ShareholderPosition[],
    scenario: ComprehensiveScenario,
    waterfallResults: any[]
  ): Promise<StakeholderTaxAnalysis[]> {
    const taxAnalysis: StakeholderTaxAnalysis[] = [];

    // This is a simplified implementation
    // In practice, you'd need detailed grant information for each stakeholder

    for (const position of positions) {
      if (position.id.includes('option') || position.id.includes('employee')) {
        // Simplified tax calculation for option holders
        const analysis: StakeholderTaxAnalysis = {
          stakeholderId: position.id,
          stakeholderName: position.name,
          recommendations: [],
          totalTaxLiability: 0,
          effectiveRate: 0
        };

        // Add basic tax optimization recommendations
        analysis.recommendations = [
          'Consider early exercise if available to start capital gains treatment',
          'Evaluate 83(b) election timing for restricted stock',
          'Monitor AMT implications for ISO exercises',
          'Consider tax-loss harvesting strategies'
        ];

        taxAnalysis.push(analysis);
      }
    }

    return taxAnalysis;
  }

  /**
   * Generate comprehensive scenario summary
   */
  private generateScenarioSummary(
    scenario: ComprehensiveScenario,
    dilutionResults: any[],
    waterfallResults: any[],
    finalPositions: ShareholderPosition[],
    taxAnalysis: StakeholderTaxAnalysis[]
  ): ScenarioSummary {
    const totalFundingRaised = scenario.fundingRounds.reduce(
      (sum, round) => new Decimal(sum).plus(round.investmentAmount).toNumber(), 
      0
    );

    const finalPostMoneyValuation = scenario.fundingRounds.length > 0 
      ? new Decimal(scenario.fundingRounds[scenario.fundingRounds.length - 1].preMoney)
          .plus(scenario.fundingRounds[scenario.fundingRounds.length - 1].investmentAmount)
          .toNumber()
      : 0;

    const totalShares = finalPositions.reduce((sum, pos) => sum + pos.shares, 0);

    const finalOwnershipDistribution = finalPositions.map(pos => ({
      stakeholderId: pos.id,
      stakeholderName: pos.name,
      finalOwnershipPercentage: totalShares > 0 
        ? new Decimal(pos.shares).dividedBy(totalShares).times(100).toNumber()
        : 0,
      totalDilution: 0, // Would need to calculate from initial positions
      estimatedValue: totalShares > 0 
        ? new Decimal(pos.shares).dividedBy(totalShares).times(finalPostMoneyValuation).floor().toNumber()
        : 0
    }));

    const exitValueAnalysis = scenario.exitScenarios.map((exitScenario, index) => {
      const waterfall = waterfallResults[index];
      const commonReturn = waterfall?.distributions
        ?.filter((d: any) => d.securityType === 'COMMON')
        ?.reduce((sum: number, d: any) => sum + d.total, 0) || 0;
      
      const preferredReturn = waterfall?.distributions
        ?.filter((d: any) => d.securityType.includes('PREFERRED'))
        ?.reduce((sum: number, d: any) => sum + d.total, 0) || 0;

      return {
        exitScenarioId: exitScenario.id,
        exitScenarioName: exitScenario.name,
        commonHolderReturn: commonReturn,
        preferredHolderReturn: preferredReturn,
        founderReturn: 0 // Would need to identify founder positions
      };
    });

    return {
      finalOwnershipDistribution,
      totalFundingRaised,
      finalPostMoneyValuation,
      totalShares,
      exitValueAnalysis,
      downSideProtection: 0, // Would calculate from liquidation preferences
      upSideParticipation: 100 // Would calculate from participation rights
    };
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    scenarios: ComprehensiveScenario[],
    currentPositions: ShareholderPosition[]
  ): Promise<ScenarioComparison> {
    const results = await Promise.all(
      scenarios.map(scenario => 
        this.calculateComprehensiveScenario(scenario, currentPositions)
      )
    );

    // Generate comparison analysis
    const comparison = this.generateScenarioComparison(scenarios, results);

    return {
      scenarios,
      results,
      comparison
    };
  }

  private generateScenarioComparison(
    scenarios: ComprehensiveScenario[],
    results: ComprehensiveScenarioResult[]
  ) {
    // Get all unique stakeholders
    const allStakeholders = new Set<string>();
    results.forEach(result => {
      result.summary.finalOwnershipDistribution.forEach(dist => {
        allStakeholders.add(dist.stakeholderId);
      });
    });

    const dilutionComparison = Array.from(allStakeholders).map(stakeholderId => {
      const stakeholderName = results[0].summary.finalOwnershipDistribution
        .find(dist => dist.stakeholderId === stakeholderId)?.stakeholderName || stakeholderId;

      const scenarioResults = results.map((result, index) => {
        const dist = result.summary.finalOwnershipDistribution
          .find(d => d.stakeholderId === stakeholderId);
        return {
          scenarioId: scenarios[index].id,
          finalOwnership: dist?.finalOwnershipPercentage || 0,
          totalDilution: dist?.totalDilution || 0
        };
      });

      return {
        stakeholderId,
        stakeholderName,
        scenarioResults
      };
    });

    // Generate exit value comparison matrix
    const exitValues = new Set<number>();
    scenarios.forEach(scenario => {
      scenario.exitScenarios.forEach(exit => {
        exitValues.add(exit.exitValue);
      });
    });

    const exitValueComparison = Array.from(exitValues).map(exitValue => {
      const scenarioReturns = results.map((result, index) => {
        const exitAnalysis = result.summary.exitValueAnalysis
          .find(analysis => {
            const scenario = scenarios[index];
            const matchingExit = scenario.exitScenarios
              .find(exit => exit.exitValue === exitValue);
            return matchingExit?.id === analysis.exitScenarioId;
          });

        const totalReturn = (exitAnalysis?.commonHolderReturn || 0) + 
                          (exitAnalysis?.preferredHolderReturn || 0);
        
        return {
          scenarioId: scenarios[index].id,
          totalReturn,
          returnMultiple: result.summary.totalFundingRaised > 0 
            ? new Decimal(totalReturn).dividedBy(result.summary.totalFundingRaised).toNumber()
            : 0
        };
      });

      return {
        exitValue,
        scenarioReturns
      };
    });

    const riskReturnProfile = results.map((result, index) => ({
      scenarioId: scenarios[index].id,
      expectedReturn: result.summary.exitValueAnalysis.reduce((sum, analysis) => 
        sum + analysis.commonHolderReturn + analysis.preferredHolderReturn, 0) / 
        result.summary.exitValueAnalysis.length,
      volatility: 0, // Would need to calculate from exit scenario variations
      maxLoss: Math.min(...result.summary.exitValueAnalysis.map(analysis => 
        analysis.commonHolderReturn + analysis.preferredHolderReturn))
    }));

    return {
      dilutionComparison,
      exitValueComparison,
      riskReturnProfile
    };
  }

  /**
   * Perform sensitivity analysis
   */
  async performSensitivityAnalysis(
    baseScenario: ComprehensiveScenario,
    currentPositions: ShareholderPosition[],
    sensitivityVariables: SensitivityVariable[]
  ): Promise<SensitivityAnalysis> {
    const baseResult = await this.calculateComprehensiveScenario(baseScenario, currentPositions);
    const sensitivityResults = [];

    for (const variable of sensitivityVariables) {
      const stepSize = (variable.testRange.max - variable.testRange.min) / variable.testRange.steps;
      
      for (let i = 0; i <= variable.testRange.steps; i++) {
        const testValue = variable.testRange.min + (stepSize * i);
        
        // Create modified scenario
        const modifiedScenario = this.modifyScenarioParameter(
          baseScenario, 
          variable.parameter, 
          testValue
        );
        
        const testResult = await this.calculateComprehensiveScenario(modifiedScenario, currentPositions);
        
        // Calculate impact
        const impactOnOwnership = testResult.summary.finalOwnershipDistribution.map(dist => {
          const baseDist = baseResult.summary.finalOwnershipDistribution
            .find(base => base.stakeholderId === dist.stakeholderId);
          return {
            stakeholderId: dist.stakeholderId,
            ownershipChange: dist.finalOwnershipPercentage - (baseDist?.finalOwnershipPercentage || 0)
          };
        });

        const impactOnReturns = testResult.summary.exitValueAnalysis.map(analysis => {
          const baseAnalysis = baseResult.summary.exitValueAnalysis
            .find(base => base.exitScenarioId === analysis.exitScenarioId);
          return {
            exitScenarioId: analysis.exitScenarioId,
            returnChange: (analysis.commonHolderReturn + analysis.preferredHolderReturn) -
                         ((baseAnalysis?.commonHolderReturn || 0) + (baseAnalysis?.preferredHolderReturn || 0))
          };
        });

        sensitivityResults.push({
          variableName: variable.name,
          parameterValue: testValue,
          impactOnOwnership,
          impactOnReturns
        });
      }
    }

    return {
      baseScenario,
      baseResult,
      sensitivityVariables,
      sensitivityResults
    };
  }

  private modifyScenarioParameter(
    scenario: ComprehensiveScenario,
    parameter: string,
    value: number
  ): ComprehensiveScenario {
    const modified = JSON.parse(JSON.stringify(scenario)); // Deep clone

    // Modify the appropriate parameter
    if (parameter.includes('preMoney') && modified.fundingRounds.length > 0) {
      modified.fundingRounds[0].preMoney = value;
    } else if (parameter.includes('exitValue') && modified.exitScenarios.length > 0) {
      modified.exitScenarios[0].exitValue = value;
    }
    // Add more parameter modifications as needed

    return modified;
  }

  // Validation methods
  private validateScenario(scenario: ComprehensiveScenario): void {
    try {
      financialRules.nonEmptyString(scenario.name, 'scenario name');
      financialRules.nonEmptyArray(scenario.fundingRounds, 'funding rounds');
      
      scenario.fundingRounds.forEach((round, index) => {
        financialRules.positiveAmount(round.preMoney, `round ${index + 1} pre-money`);
        financialRules.positiveAmount(round.investmentAmount, `round ${index + 1} investment`);
        financialRules.positiveAmount(round.pricePerShare, `round ${index + 1} price per share`);
      });

      scenario.exitScenarios.forEach((exit, index) => {
        financialRules.positiveAmount(exit.exitValue, `exit scenario ${index + 1} value`);
      });

    } catch (error) {
      console.error('Scenario validation failed:', error);
      throw error;
    }
  }

  private validateCurrentPositions(positions: ShareholderPosition[]): void {
    try {
      financialRules.nonEmptyArray(positions, 'current positions');
      
      positions.forEach((pos, index) => {
        financialRules.nonEmptyString(pos.id, `position ${index + 1} ID`);
        financialRules.nonEmptyString(pos.name, `position ${index + 1} name`);
        financialRules.validShareCount(pos.shares, `position ${index + 1} shares`);
      });

    } catch (error) {
      console.error('Current positions validation failed:', error);
      throw error;
    }
  }
}