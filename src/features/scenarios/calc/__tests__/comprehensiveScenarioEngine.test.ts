/**
 * Tests for Comprehensive Scenario Engine
 * Unit tests for the integrated scenario modeling calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComprehensiveScenarioEngine } from '../comprehensiveScenarioEngine';
import { 
  ComprehensiveScenario,
  EnhancedRoundScenario,
  ExitScenario,
  ModelingConfiguration
} from '../types/scenarioModeling';
import { ShareholderPosition } from '../dilution';
import { SAFEType } from '@/features/cap-table/calc/enhancedSAFE';

describe('ComprehensiveScenarioEngine', () => {
  let engine: ComprehensiveScenarioEngine;
  let testConfig: ModelingConfiguration;
  let mockCurrentPositions: ShareholderPosition[];
  let mockScenario: ComprehensiveScenario;

  beforeEach(() => {
    testConfig = {
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
      chartColors: ['#3B82F6', '#EF4444', '#10B981'],
      defaultCurrency: 'USD',
      displayFormat: 'MILLIONS'
    };

    engine = new ComprehensiveScenarioEngine(testConfig);

    mockCurrentPositions = [
      {
        id: 'founder-1',
        name: 'Founder 1',
        shares: 4000000,
        shareClass: 'COMMON',
        pricePerShare: 100
      },
      {
        id: 'founder-2', 
        name: 'Founder 2',
        shares: 3000000,
        shareClass: 'COMMON',
        pricePerShare: 100
      },
      {
        id: 'employee-pool',
        name: 'Employee Option Pool',
        shares: 1000000,
        shareClass: 'COMMON',
        pricePerShare: 100
      }
    ];

    mockScenario = {
      id: 'test-scenario-1',
      name: 'Test Series A Scenario',
      description: 'Test scenario for Series A funding',
      fundingRounds: [
        {
          name: 'Series A',
          preMoney: 8000000000, // $80M
          investmentAmount: 2000000000, // $20M
          pricePerShare: 1000, // $10.00
          shareClass: 'PREFERRED',
          optionPoolIncrease: 10,
          antiDilutionType: 'WEIGHTED_AVERAGE_BROAD',
          liquidationPreferenceMultiple: 1.0,
          participationRights: 'FULL',
          isParticipating: true,
          seniorityRank: 1
        }
      ],
      exitScenarios: [
        {
          id: 'exit-1',
          name: 'Strategic Sale',
          exitValue: 20000000000, // $200M
          exitType: 'ACQUISITION',
          timeframe: '3-5 years',
          probability: 0.6,
          convertAllToCommon: false
        }
      ],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: ['series-a', 'test']
    };
  });

  describe('calculateComprehensiveScenario', () => {
    it('should calculate a complete scenario with dilution and waterfall analysis', async () => {
      const result = await engine.calculateComprehensiveScenario(
        mockScenario, 
        mockCurrentPositions
      );

      expect(result).toBeDefined();
      expect(result.scenario).toBe(mockScenario);
      expect(result.dilutionResults).toHaveLength(1);
      expect(result.waterfallResults).toHaveLength(1);
      expect(result.summary).toBeDefined();

      // Check dilution results
      const dilutionResult = result.dilutionResults[0];
      expect(dilutionResult.preRound.totalShares).toBe(8000000); // Initial shares
      expect(dilutionResult.postRound.totalShares).toBeGreaterThan(8000000); // Should have new shares
      
      // Check waterfall results
      const waterfallResult = result.waterfallResults[0];
      expect(waterfallResult.exitValue).toBe(20000000000); // $200M
      expect(waterfallResult.distributions.length).toBeGreaterThan(0);

      // Check summary
      expect(result.summary.totalFundingRaised).toBe(2000000000); // $20M
      expect(result.summary.finalPostMoneyValuation).toBe(10000000000); // $100M
      expect(result.summary.finalOwnershipDistribution.length).toBeGreaterThan(0);
    });

    it('should handle scenarios with SAFE conversions', async () => {
      const scenarioWithSAFE = {
        ...mockScenario,
        fundingRounds: [
          {
            ...mockScenario.fundingRounds[0],
            convertingSAFEs: [
              {
                id: 'safe-1',
                investmentAmount: 50000000, // $500K
                safeType: SAFEType.POST_MONEY_VALUATION_CAP,
                valuationCap: 500000000, // $5M
                discountRate: 0.20,
                hasMFN: true,
                hasProRata: false,
                investorName: 'SAFE Investor',
                investmentDate: '2023-01-01'
              }
            ]
          }
        ]
      };

      const result = await engine.calculateComprehensiveScenario(
        scenarioWithSAFE,
        mockCurrentPositions
      );

      expect(result.safeConversions).toHaveLength(1);
      expect(result.safeConversions[0]).toBeDefined();
      expect(result.safeConversions[0].conversion.sharesIssued).toBeGreaterThan(0);
    });

    it('should handle multiple funding rounds', async () => {
      const multiRoundScenario: ComprehensiveScenario = {
        ...mockScenario,
        fundingRounds: [
          mockScenario.fundingRounds[0],
          {
            name: 'Series B',
            preMoney: 20000000000, // $200M
            investmentAmount: 5000000000, // $50M  
            pricePerShare: 2000, // $20.00
            shareClass: 'PREFERRED',
            optionPoolIncrease: 5,
            antiDilutionType: 'WEIGHTED_AVERAGE_BROAD',
            liquidationPreferenceMultiple: 1.0,
            participationRights: 'FULL',
            isParticipating: true,
            seniorityRank: 2
          }
        ]
      };

      const result = await engine.calculateComprehensiveScenario(
        multiRoundScenario,
        mockCurrentPositions
      );

      expect(result.dilutionResults).toHaveLength(2);
      expect(result.summary.totalFundingRaised).toBe(7000000000); // $70M total
      expect(result.summary.finalPostMoneyValuation).toBe(25000000000); // $250M
    });

    it('should validate input parameters', async () => {
      const invalidScenario = {
        ...mockScenario,
        name: '', // Invalid empty name
        fundingRounds: [] // Invalid empty array
      };

      await expect(
        engine.calculateComprehensiveScenario(invalidScenario, mockCurrentPositions)
      ).rejects.toThrow();
    });

    it('should handle empty current positions', async () => {
      await expect(
        engine.calculateComprehensiveScenario(mockScenario, [])
      ).rejects.toThrow();
    });
  });

  describe('compareScenarios', () => {
    it('should compare multiple scenarios', async () => {
      const scenario2: ComprehensiveScenario = {
        ...mockScenario,
        id: 'test-scenario-2',
        name: 'Optimistic Scenario',
        fundingRounds: [
          {
            ...mockScenario.fundingRounds[0],
            preMoney: 12000000000, // $120M higher valuation
            investmentAmount: 3000000000 // $30M
          }
        ]
      };

      const comparison = await engine.compareScenarios(
        [mockScenario, scenario2],
        mockCurrentPositions
      );

      expect(comparison.scenarios).toHaveLength(2);
      expect(comparison.results).toHaveLength(2);
      expect(comparison.comparison).toBeDefined();
      expect(comparison.comparison.dilutionComparison).toBeDefined();
      expect(comparison.comparison.exitValueComparison).toBeDefined();
      expect(comparison.comparison.riskReturnProfile).toBeDefined();
    });
  });

  describe('performSensitivityAnalysis', () => {
    it('should perform sensitivity analysis on key variables', async () => {
      const sensitivityVariables = [
        {
          name: 'Pre-Money Valuation',
          parameter: 'preMoney',
          baseValue: 8000000000,
          testRange: {
            min: 4000000000, // $40M
            max: 12000000000, // $120M
            steps: 5
          }
        }
      ];

      const sensitivityResult = await engine.performSensitivityAnalysis(
        mockScenario,
        mockCurrentPositions,
        sensitivityVariables
      );

      expect(sensitivityResult.baseScenario).toBe(mockScenario);
      expect(sensitivityResult.baseResult).toBeDefined();
      expect(sensitivityResult.sensitivityVariables).toEqual(sensitivityVariables);
      expect(sensitivityResult.sensitivityResults.length).toBeGreaterThan(0);

      // Check that we have results for different parameter values
      const uniqueValues = new Set(
        sensitivityResult.sensitivityResults.map(r => r.parameterValue)
      );
      expect(uniqueValues.size).toBe(6); // 5 steps + 1 base case
    });
  });

  describe('Input Validation', () => {
    it('should validate scenario structure', async () => {
      const invalidScenario = {
        ...mockScenario,
        fundingRounds: [
          {
            ...mockScenario.fundingRounds[0],
            preMoney: -1000000000 // Invalid negative value
          }
        ]
      };

      await expect(
        engine.calculateComprehensiveScenario(invalidScenario, mockCurrentPositions)
      ).rejects.toThrow();
    });

    it('should validate current positions', async () => {
      const invalidPositions = [
        {
          id: '',
          name: 'Invalid Position',
          shares: -1000,
          shareClass: 'COMMON' as const,
          pricePerShare: 100
        }
      ];

      await expect(
        engine.calculateComprehensiveScenario(mockScenario, invalidPositions)
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero exit value', async () => {
      const zeroExitScenario = {
        ...mockScenario,
        exitScenarios: [
          {
            ...mockScenario.exitScenarios[0],
            exitValue: 0
          }
        ]
      };

      const result = await engine.calculateComprehensiveScenario(
        zeroExitScenario,
        mockCurrentPositions
      );

      expect(result.waterfallResults[0].distributions.every(d => d.total === 0)).toBe(true);
    });

    it('should handle very large numbers', async () => {
      const largeScenario = {
        ...mockScenario,
        fundingRounds: [
          {
            ...mockScenario.fundingRounds[0],
            preMoney: 100000000000000, // $1T
            investmentAmount: 10000000000000 // $100B
          }
        ]
      };

      const result = await engine.calculateComprehensiveScenario(
        largeScenario,
        mockCurrentPositions
      );

      expect(result).toBeDefined();
      expect(result.summary.totalFundingRaised).toBe(10000000000000);
    });

    it('should handle multiple exit scenarios', async () => {
      const multiExitScenario = {
        ...mockScenario,
        exitScenarios: [
          mockScenario.exitScenarios[0],
          {
            id: 'exit-2',
            name: 'IPO',
            exitValue: 50000000000, // $500M
            exitType: 'IPO' as const,
            convertAllToCommon: true
          }
        ]
      };

      const result = await engine.calculateComprehensiveScenario(
        multiExitScenario,
        mockCurrentPositions
      );

      expect(result.waterfallResults).toHaveLength(2);
      expect(result.summary.exitValueAnalysis).toHaveLength(2);
    });
  });
});