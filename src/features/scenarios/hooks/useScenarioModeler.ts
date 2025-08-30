/**
 * Custom hook for managing comprehensive scenario modeling state and logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { capTableService } from '@/services/capTableService';
import { 
  ComprehensiveScenarioEngine, 
  defaultModelingConfiguration 
} from '../calc/comprehensiveScenarioEngine';
import { ShareholderPosition } from '../calc/dilution';
import {
  ComprehensiveScenario,
  EnhancedRoundScenario,
  ExitScenario,
  ScenarioModelingState,
  ModelingConfiguration
} from '../types/scenarioModeling';

export const useScenarioModeler = (initialScenario?: ComprehensiveScenario) => {
  const { companyId, hasCompany } = useCompanyContext();
  
  // Core state
  const [state, setState] = useState<ScenarioModelingState>({
    activeScenario: initialScenario || null,
    selectedRoundIndex: null,
    selectedExitScenarioIndex: null,
    comparisonMode: false,
    selectedScenariosForComparison: [],
    currentResults: null,
    comparisonResults: null,
    sensitivityResults: null,
    isCalculating: false,
    isLoadingScenarios: false,
    calculationErrors: []
  });

  // Current positions and loading
  const [currentPositions, setCurrentPositions] = useState<ShareholderPosition[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Configuration and engine
  const [config, setConfig] = useState<ModelingConfiguration>(defaultModelingConfiguration);
  const [engine] = useState(() => new ComprehensiveScenarioEngine(config));

  // Load current cap table positions
  const loadCurrentPositions = useCallback(async () => {
    if (!hasCompany || !companyId) return;
    
    try {
      setLoading(true);
      
      // Get current cap table data
      const capTableData = await capTableService.getCapTable(companyId);
      
      // Convert to ShareholderPosition format
      const positions: ShareholderPosition[] = capTableData.shareholders.map(shareholder => ({
        id: shareholder.id,
        name: shareholder.name,
        shares: shareholder.totalShares,
        shareClass: shareholder.shareClass || 'COMMON'
      }));
      
      setCurrentPositions(positions);
    } catch (error) {
      console.error('Failed to load current positions:', error);
      setState(prev => ({
        ...prev,
        calculationErrors: [...prev.calculationErrors, {
          message: 'Failed to load current cap table positions',
          details: error instanceof Error ? error.message : 'Unknown error'
        }]
      }));
    } finally {
      setLoading(false);
    }
  }, [companyId, hasCompany]);

  // Calculate scenario results
  const calculateScenario = useCallback(async () => {
    if (!state.activeScenario || currentPositions.length === 0) return;

    setState(prev => ({ 
      ...prev, 
      isCalculating: true, 
      calculationErrors: [] 
    }));

    try {
      const results = await engine.calculateComprehensiveScenario(
        state.activeScenario,
        currentPositions
      );

      setState(prev => ({
        ...prev,
        currentResults: results,
        isCalculating: false
      }));
    } catch (error) {
      console.error('Scenario calculation failed:', error);
      setState(prev => ({
        ...prev,
        isCalculating: false,
        calculationErrors: [...prev.calculationErrors, {
          message: 'Scenario calculation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }]
      }));
    }
  }, [state.activeScenario, currentPositions, engine]);

  // Create new scenario
  const createNewScenario = useCallback(() => {
    const newScenario: ComprehensiveScenario = {
      id: `scenario-${Date.now()}`,
      name: 'New Scenario',
      description: '',
      fundingRounds: [],
      exitScenarios: [{
        id: `exit-${Date.now()}`,
        name: 'Base Exit',
        exitValue: 50000000000, // $500M in cents
        exitType: 'ACQUISITION',
        timeframe: '3 years',
        probability: 0.3
      }],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: []
    };

    setState(prev => ({
      ...prev,
      activeScenario: newScenario
    }));
  }, []);

  // Funding round operations
  const addFundingRound = useCallback(() => {
    if (!state.activeScenario) return;

    const newRound: EnhancedRoundScenario = {
      id: `round-${Date.now()}`,
      name: `Series ${String.fromCharCode(65 + state.activeScenario.fundingRounds.length)}`,
      preMoney: 2000000000, // $20M in cents
      investmentAmount: 500000000, // $5M in cents
      pricePerShare: 100, // $1.00 in cents
      shareClass: 'PREFERRED',
      optionPoolIncrease: 0.1,
      antiDilutionType: 'WEIGHTED_AVERAGE_BROAD',
      liquidationPreferenceMultiple: 1.0,
      participationRights: 'FULL',
      includeConversion: false
    };

    setState(prev => ({
      ...prev,
      activeScenario: prev.activeScenario ? {
        ...prev.activeScenario,
        fundingRounds: [...prev.activeScenario.fundingRounds, newRound],
        lastModified: new Date().toISOString()
      } : prev.activeScenario
    }));
  }, [state.activeScenario]);

  const updateFundingRound = useCallback((index: number, updates: Partial<EnhancedRoundScenario>) => {
    if (!state.activeScenario) return;

    setState(prev => ({
      ...prev,
      activeScenario: prev.activeScenario ? {
        ...prev.activeScenario,
        fundingRounds: prev.activeScenario.fundingRounds.map((round, i) => 
          i === index ? { ...round, ...updates } : round
        ),
        lastModified: new Date().toISOString()
      } : prev.activeScenario
    }));
  }, [state.activeScenario]);

  const removeFundingRound = useCallback((index: number) => {
    if (!state.activeScenario) return;

    setState(prev => ({
      ...prev,
      activeScenario: prev.activeScenario ? {
        ...prev.activeScenario,
        fundingRounds: prev.activeScenario.fundingRounds.filter((_, i) => i !== index),
        lastModified: new Date().toISOString()
      } : prev.activeScenario
    }));
  }, [state.activeScenario]);

  // Exit scenario operations
  const addExitScenario = useCallback(() => {
    if (!state.activeScenario) return;

    const newExit: ExitScenario = {
      id: `exit-${Date.now()}`,
      name: `Exit Scenario ${state.activeScenario.exitScenarios.length + 1}`,
      exitValue: 100000000000, // $1B in cents
      exitType: 'ACQUISITION',
      timeframe: '5 years',
      probability: 0.2
    };

    setState(prev => ({
      ...prev,
      activeScenario: prev.activeScenario ? {
        ...prev.activeScenario,
        exitScenarios: [...prev.activeScenario.exitScenarios, newExit],
        lastModified: new Date().toISOString()
      } : prev.activeScenario
    }));
  }, [state.activeScenario]);

  const updateExitScenario = useCallback((index: number, updates: Partial<ExitScenario>) => {
    if (!state.activeScenario) return;

    setState(prev => ({
      ...prev,
      activeScenario: prev.activeScenario ? {
        ...prev.activeScenario,
        exitScenarios: prev.activeScenario.exitScenarios.map((exit, i) => 
          i === index ? { ...exit, ...updates } : exit
        ),
        lastModified: new Date().toISOString()
      } : prev.activeScenario
    }));
  }, [state.activeScenario]);

  const removeExitScenario = useCallback((index: number) => {
    if (!state.activeScenario || state.activeScenario.exitScenarios.length <= 1) return;

    setState(prev => ({
      ...prev,
      activeScenario: prev.activeScenario ? {
        ...prev.activeScenario,
        exitScenarios: prev.activeScenario.exitScenarios.filter((_, i) => i !== index),
        lastModified: new Date().toISOString()
      } : prev.activeScenario
    }));
  }, [state.activeScenario]);

  // Load current positions on mount
  useEffect(() => {
    if (hasCompany && companyId) {
      loadCurrentPositions();
    }
  }, [loadCurrentPositions]);

  // Auto-calculate when scenario changes
  useEffect(() => {
    if (state.activeScenario && currentPositions.length > 0 && !state.isCalculating) {
      calculateScenario();
    }
  }, [state.activeScenario, currentPositions, calculateScenario]);

  return {
    // State
    state,
    setState,
    currentPositions,
    loading,
    config,
    setConfig,
    engine,

    // Actions
    loadCurrentPositions,
    calculateScenario,
    createNewScenario,
    addFundingRound,
    updateFundingRound,
    removeFundingRound,
    addExitScenario,
    updateExitScenario,
    removeExitScenario
  };
};