/**
 * Custom hook for comprehensive scenario modeling business logic
 * Separates business logic from UI rendering
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { capTableService } from '@/services/capTableService';
import { ComprehensiveScenarioEngine, defaultModelingConfiguration } from '../calc/comprehensiveScenarioEngine';
import { ShareholderPosition } from '../calc/dilution';
import {
  ComprehensiveScenario,
  EnhancedRoundScenario,
  ExitScenario,
  ComprehensiveScenarioResult,
  ScenarioModelingState,
  ModelingConfiguration
} from '../types/scenarioModeling';

export interface UseScenarioModelingProps {
  initialScenario?: ComprehensiveScenario;
  onScenarioSave?: (scenario: ComprehensiveScenario) => void;
  onScenarioLoad?: (scenarioId: string) => void;
}

export interface UseScenarioModelingReturn {
  // State
  state: ScenarioModelingState;
  currentPositions: ShareholderPosition[];
  config: ModelingConfiguration;
  loading: boolean;
  
  // Actions
  createNewScenario: () => void;
  updateScenario: (updates: Partial<ComprehensiveScenario>) => void;
  
  // Funding rounds
  addFundingRound: () => void;
  updateFundingRound: (index: number, updates: Partial<EnhancedRoundScenario>) => void;
  removeFundingRound: (index: number) => void;
  selectRound: (index: number) => void;
  
  // Exit scenarios
  addExitScenario: () => void;
  updateExitScenario: (index: number, updates: Partial<ExitScenario>) => void;
  removeExitScenario: (index: number) => void;
  selectExitScenario: (index: number) => void;
  
  // Calculations
  calculateScenario: () => Promise<void>;
  clearErrors: () => void;
  
  // Configuration
  updateConfig: (newConfig: ModelingConfiguration) => void;
}

export function useScenarioModeling({
  initialScenario,
  onScenarioSave,
  onScenarioLoad
}: UseScenarioModelingProps = {}): UseScenarioModelingReturn {
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

  // Current positions from cap table
  const [currentPositions, setCurrentPositions] = useState<ShareholderPosition[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Configuration and engine
  const [config, setConfig] = useState<ModelingConfiguration>(defaultModelingConfiguration);
  const engine = useMemo(() => new ComprehensiveScenarioEngine(config), [config]);

  // Load current cap table on company change
  useEffect(() => {
    if (hasCompany && companyId) {
      loadCurrentPositions();
    }
  }, [companyId, hasCompany]);

  // Auto-calculate when scenario changes
  useEffect(() => {
    if (state.activeScenario && currentPositions.length > 0 && !state.isCalculating) {
      calculateScenario();
    }
  }, [state.activeScenario, currentPositions]);

  const loadCurrentPositions = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const capTableData = await capTableService.getCapTable(companyId);
      
      const positions: ShareholderPosition[] = capTableData.stakeholders.map(stakeholder => {
        const totalShares = stakeholder.asConverted;
        const hasPreferred = (stakeholder.securities.preferred || 0) > 0;
        
        return {
          id: stakeholder.stakeholderId,
          name: stakeholder.name,
          shares: totalShares,
          shareClass: hasPreferred ? 'PREFERRED' : 'COMMON',
          // All financial values must be in cents - FIXED PRECISION ISSUE
          pricePerShare: 100 // $1.00 in cents
        };
      });

      setCurrentPositions(positions);
    } catch (error) {
      console.error('Failed to load current positions:', error);
      setState(prev => ({
        ...prev,
        calculationErrors: [...prev.calculationErrors, {
          type: 'LOAD_ERROR',
          message: 'Failed to load current cap table positions. Please check your connection and try again.',
          timestamp: new Date().toISOString()
        }]
      }));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const calculateScenario = useCallback(async () => {
    if (!state.activeScenario || currentPositions.length === 0) return;

    setState(prev => ({ ...prev, isCalculating: true, calculationErrors: [] }));

    try {
      const result = await engine.calculateComprehensiveScenario(
        state.activeScenario,
        currentPositions
      );

      setState(prev => ({
        ...prev,
        currentResults: result,
        isCalculating: false
      }));
    } catch (error) {
      console.error('Scenario calculation failed:', error);
      setState(prev => ({
        ...prev,
        isCalculating: false,
        calculationErrors: [{
          type: 'CALCULATION_ERROR',
          message: error instanceof Error 
            ? `Calculation failed: ${error.message}. Please check your inputs and try again.`
            : 'An unexpected calculation error occurred. Please try again.',
          timestamp: new Date().toISOString()
        }]
      }));
    }
  }, [state.activeScenario, currentPositions, engine]);

  const createNewScenario = useCallback(() => {
    const newScenario: ComprehensiveScenario = {
      id: `scenario-${Date.now()}`,
      name: 'New Scenario',
      description: '',
      fundingRounds: [],
      exitScenarios: [{
        id: `exit-${Date.now()}`,
        name: 'Base Case Exit',
        exitValue: 10000000000, // $100M in cents
        exitType: 'ACQUISITION',
        timeframe: '3-5 years',
        probability: 0.6
      }],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: []
    };

    setState(prev => ({ ...prev, activeScenario: newScenario }));
  }, []);

  const updateScenario = useCallback((updates: Partial<ComprehensiveScenario>) => {
    setState(prev => {
      if (!prev.activeScenario) return prev;
      
      return {
        ...prev,
        activeScenario: {
          ...prev.activeScenario,
          ...updates,
          lastModified: new Date().toISOString()
        }
      };
    });
  }, []);

  const addFundingRound = useCallback(() => {
    if (!state.activeScenario) return;

    const newRound: EnhancedRoundScenario = {
      name: `Series ${String.fromCharCode(65 + state.activeScenario.fundingRounds.length)}`,
      preMoney: 10000000000, // $100M in cents
      investmentAmount: 2000000000, // $20M in cents
      pricePerShare: 1000, // $10.00 in cents
      shareClass: 'PREFERRED',
      optionPoolIncrease: 10,
      antiDilutionType: 'WEIGHTED_AVERAGE_BROAD',
      liquidationPreferenceMultiple: 1.0,
      participationRights: 'FULL',
      isParticipating: true,
      seniorityRank: state.activeScenario.fundingRounds.length + 1
    };

    setState(prev => {
      if (!prev.activeScenario) return prev;
      
      const updatedScenario = {
        ...prev.activeScenario,
        fundingRounds: [...prev.activeScenario.fundingRounds, newRound],
        lastModified: new Date().toISOString()
      };

      return {
        ...prev,
        activeScenario: updatedScenario,
        selectedRoundIndex: updatedScenario.fundingRounds.length - 1
      };
    });
  }, [state.activeScenario]);

  const updateFundingRound = useCallback((index: number, updates: Partial<EnhancedRoundScenario>) => {
    setState(prev => {
      if (!prev.activeScenario) return prev;

      const updatedRounds = [...prev.activeScenario.fundingRounds];
      updatedRounds[index] = { ...updatedRounds[index], ...updates };

      return {
        ...prev,
        activeScenario: {
          ...prev.activeScenario,
          fundingRounds: updatedRounds,
          lastModified: new Date().toISOString()
        }
      };
    });
  }, []);

  const removeFundingRound = useCallback((index: number) => {
    setState(prev => {
      if (!prev.activeScenario) return prev;

      const updatedRounds = prev.activeScenario.fundingRounds.filter((_, i) => i !== index);
      
      return {
        ...prev,
        activeScenario: {
          ...prev.activeScenario,
          fundingRounds: updatedRounds,
          lastModified: new Date().toISOString()
        },
        selectedRoundIndex: null
      };
    });
  }, []);

  const selectRound = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedRoundIndex: index }));
  }, []);

  const addExitScenario = useCallback(() => {
    setState(prev => {
      if (!prev.activeScenario) return prev;

      const newExitScenario: ExitScenario = {
        id: `exit-${Date.now()}`,
        name: `Exit Scenario ${prev.activeScenario.exitScenarios.length + 1}`,
        exitValue: 25000000000, // $250M in cents
        exitType: 'IPO',
        timeframe: '5+ years',
        probability: 0.3
      };

      const updatedScenario = {
        ...prev.activeScenario,
        exitScenarios: [...prev.activeScenario.exitScenarios, newExitScenario],
        lastModified: new Date().toISOString()
      };

      return {
        ...prev,
        activeScenario: updatedScenario,
        selectedExitScenarioIndex: updatedScenario.exitScenarios.length - 1
      };
    });
  }, []);

  const updateExitScenario = useCallback((index: number, updates: Partial<ExitScenario>) => {
    setState(prev => {
      if (!prev.activeScenario) return prev;

      const updatedExits = [...prev.activeScenario.exitScenarios];
      updatedExits[index] = { ...updatedExits[index], ...updates };

      return {
        ...prev,
        activeScenario: {
          ...prev.activeScenario,
          exitScenarios: updatedExits,
          lastModified: new Date().toISOString()
        }
      };
    });
  }, []);

  const removeExitScenario = useCallback((index: number) => {
    setState(prev => {
      if (!prev.activeScenario || prev.activeScenario.exitScenarios.length <= 1) return prev;

      const updatedExits = prev.activeScenario.exitScenarios.filter((_, i) => i !== index);
      
      return {
        ...prev,
        activeScenario: {
          ...prev.activeScenario,
          exitScenarios: updatedExits,
          lastModified: new Date().toISOString()
        },
        selectedExitScenarioIndex: null
      };
    });
  }, []);

  const selectExitScenario = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedExitScenarioIndex: index }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, calculationErrors: [] }));
  }, []);

  const updateConfig = useCallback((newConfig: ModelingConfiguration) => {
    setConfig(newConfig);
  }, []);

  return {
    state,
    currentPositions,
    config,
    loading,
    createNewScenario,
    updateScenario,
    addFundingRound,
    updateFundingRound,
    removeFundingRound,
    selectRound,
    addExitScenario,
    updateExitScenario,
    removeExitScenario,
    selectExitScenario,
    calculateScenario,
    clearErrors,
    updateConfig
  };
}