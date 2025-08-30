/**
 * Optimized scenario store with Zustand and Immer
 * Handles complex state updates efficiently with proper performance optimizations
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import {
  ComprehensiveScenario,
  EnhancedRoundScenario,
  ExitScenario,
  ComprehensiveScenarioResult,
  ScenarioComparison,
  SensitivityAnalysis,
  ModelingConfiguration
} from '../types/scenarioModeling';
import { defaultModelingConfiguration } from '../calc/comprehensiveScenarioEngine';

export interface ScenarioState {
  // Current workspace
  scenarios: ComprehensiveScenario[];
  activeScenarioId: string | null;
  
  // UI state
  selectedRoundIndex: number | null;
  selectedExitScenarioIndex: number | null;
  activeTab: 'modeling' | 'results' | 'comparison' | 'sensitivity';
  
  // Results cache
  results: Record<string, ComprehensiveScenarioResult>;
  comparisonResults: ScenarioComparison | null;
  sensitivityResults: SensitivityAnalysis | null;
  
  // Loading states
  isCalculating: boolean;
  calculatingScenarioId: string | null;
  isLoadingScenarios: boolean;
  isSaving: boolean;
  
  // Error handling
  errors: Array<{
    id: string;
    type: 'CALCULATION' | 'LOAD' | 'SAVE' | 'VALIDATION';
    message: string;
    scenarioId?: string;
    timestamp: string;
  }>;
  
  // Configuration
  config: ModelingConfiguration;
  
  // Performance tracking
  lastCalculationTime: number;
  calculationHistory: Array<{
    scenarioId: string;
    timestamp: string;
    duration: number;
    success: boolean;
  }>;
}

export interface ScenarioActions {
  // Scenario management
  addScenario: (scenario: ComprehensiveScenario) => void;
  updateScenario: (id: string, updates: Partial<ComprehensiveScenario>) => void;
  removeScenario: (id: string) => void;
  duplicateScenario: (id: string, newName?: string) => void;
  setActiveScenario: (id: string | null) => void;
  
  // Funding rounds
  addFundingRound: (scenarioId: string, round: EnhancedRoundScenario) => void;
  updateFundingRound: (scenarioId: string, index: number, updates: Partial<EnhancedRoundScenario>) => void;
  removeFundingRound: (scenarioId: string, index: number) => void;
  reorderFundingRounds: (scenarioId: string, fromIndex: number, toIndex: number) => void;
  
  // Exit scenarios
  addExitScenario: (scenarioId: string, exitScenario: ExitScenario) => void;
  updateExitScenario: (scenarioId: string, index: number, updates: Partial<ExitScenario>) => void;
  removeExitScenario: (scenarioId: string, index: number) => void;
  
  // UI state
  setSelectedRound: (index: number | null) => void;
  setSelectedExitScenario: (index: number | null) => void;
  setActiveTab: (tab: 'modeling' | 'results' | 'comparison' | 'sensitivity') => void;
  
  // Results management
  setResult: (scenarioId: string, result: ComprehensiveScenarioResult) => void;
  clearResult: (scenarioId: string) => void;
  clearAllResults: () => void;
  setComparisonResults: (results: ScenarioComparison | null) => void;
  setSensitivityResults: (results: SensitivityAnalysis | null) => void;
  
  // Loading states
  setCalculating: (scenarioId: string | null) => void;
  setLoadingScenarios: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  
  // Error handling
  addError: (error: Omit<ScenarioState['errors'][0], 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  
  // Configuration
  updateConfig: (updates: Partial<ModelingConfiguration>) => void;
  resetConfig: () => void;
  
  // Performance tracking
  recordCalculation: (scenarioId: string, duration: number, success: boolean) => void;
  
  // Bulk operations
  importScenarios: (scenarios: ComprehensiveScenario[]) => void;
  resetStore: () => void;
}

const initialState: ScenarioState = {
  scenarios: [],
  activeScenarioId: null,
  selectedRoundIndex: null,
  selectedExitScenarioIndex: null,
  activeTab: 'modeling',
  results: {},
  comparisonResults: null,
  sensitivityResults: null,
  isCalculating: false,
  calculatingScenarioId: null,
  isLoadingScenarios: false,
  isSaving: false,
  errors: [],
  config: defaultModelingConfiguration,
  lastCalculationTime: 0,
  calculationHistory: []
};

export const useScenarioStore = create<ScenarioState & ScenarioActions>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // Scenario management
          addScenario: (scenario) => set((state) => {
            state.scenarios.push(scenario);
            state.activeScenarioId = scenario.id;
          }),

          updateScenario: (id, updates) => set((state) => {
            const scenarioIndex = state.scenarios.findIndex(s => s.id === id);
            if (scenarioIndex !== -1) {
              Object.assign(state.scenarios[scenarioIndex], updates, {
                lastModified: new Date().toISOString()
              });
              
              // Clear cached result when scenario changes
              if (state.results[id]) {
                delete state.results[id];
              }
            }
          }),

          removeScenario: (id) => set((state) => {
            state.scenarios = state.scenarios.filter(s => s.id !== id);
            if (state.activeScenarioId === id) {
              state.activeScenarioId = state.scenarios[0]?.id || null;
            }
            // Clean up related data
            delete state.results[id];
            state.errors = state.errors.filter(e => e.scenarioId !== id);
            state.calculationHistory = state.calculationHistory.filter(c => c.scenarioId !== id);
          }),

          duplicateScenario: (id, newName) => set((state) => {
            const original = state.scenarios.find(s => s.id === id);
            if (original) {
              const duplicate: ComprehensiveScenario = {
                ...original,
                id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: newName || `${original.name} (Copy)`,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
              };
              state.scenarios.push(duplicate);
              state.activeScenarioId = duplicate.id;
            }
          }),

          setActiveScenario: (id) => set((state) => {
            state.activeScenarioId = id;
            // Reset UI state when changing scenarios
            state.selectedRoundIndex = null;
            state.selectedExitScenarioIndex = null;
            state.activeTab = 'modeling';
          }),

          // Funding rounds
          addFundingRound: (scenarioId, round) => set((state) => {
            const scenario = state.scenarios.find(s => s.id === scenarioId);
            if (scenario) {
              scenario.fundingRounds.push(round);
              scenario.lastModified = new Date().toISOString();
              delete state.results[scenarioId];
            }
          }),

          updateFundingRound: (scenarioId, index, updates) => set((state) => {
            const scenario = state.scenarios.find(s => s.id === scenarioId);
            if (scenario && scenario.fundingRounds[index]) {
              Object.assign(scenario.fundingRounds[index], updates);
              scenario.lastModified = new Date().toISOString();
              delete state.results[scenarioId];
            }
          }),

          removeFundingRound: (scenarioId, index) => set((state) => {
            const scenario = state.scenarios.find(s => s.id === scenarioId);
            if (scenario) {
              scenario.fundingRounds.splice(index, 1);
              scenario.lastModified = new Date().toISOString();
              delete state.results[scenarioId];
              // Reset selection if removed round was selected
              if (state.selectedRoundIndex === index) {
                state.selectedRoundIndex = null;
              } else if (state.selectedRoundIndex && state.selectedRoundIndex > index) {
                state.selectedRoundIndex -= 1;
              }
            }
          }),

          reorderFundingRounds: (scenarioId, fromIndex, toIndex) => set((state) => {
            const scenario = state.scenarios.find(s => s.id === scenarioId);
            if (scenario) {
              const [moved] = scenario.fundingRounds.splice(fromIndex, 1);
              scenario.fundingRounds.splice(toIndex, 0, moved);
              scenario.lastModified = new Date().toISOString();
              delete state.results[scenarioId];
            }
          }),

          // Exit scenarios
          addExitScenario: (scenarioId, exitScenario) => set((state) => {
            const scenario = state.scenarios.find(s => s.id === scenarioId);
            if (scenario) {
              scenario.exitScenarios.push(exitScenario);
              scenario.lastModified = new Date().toISOString();
              delete state.results[scenarioId];
            }
          }),

          updateExitScenario: (scenarioId, index, updates) => set((state) => {
            const scenario = state.scenarios.find(s => s.id === scenarioId);
            if (scenario && scenario.exitScenarios[index]) {
              Object.assign(scenario.exitScenarios[index], updates);
              scenario.lastModified = new Date().toISOString();
              delete state.results[scenarioId];
            }
          }),

          removeExitScenario: (scenarioId, index) => set((state) => {
            const scenario = state.scenarios.find(s => s.id === scenarioId);
            if (scenario && scenario.exitScenarios.length > 1) {
              scenario.exitScenarios.splice(index, 1);
              scenario.lastModified = new Date().toISOString();
              delete state.results[scenarioId];
              // Reset selection if removed exit was selected
              if (state.selectedExitScenarioIndex === index) {
                state.selectedExitScenarioIndex = null;
              } else if (state.selectedExitScenarioIndex && state.selectedExitScenarioIndex > index) {
                state.selectedExitScenarioIndex -= 1;
              }
            }
          }),

          // UI state
          setSelectedRound: (index) => set((state) => {
            state.selectedRoundIndex = index;
          }),

          setSelectedExitScenario: (index) => set((state) => {
            state.selectedExitScenarioIndex = index;
          }),

          setActiveTab: (tab) => set((state) => {
            state.activeTab = tab;
          }),

          // Results management
          setResult: (scenarioId, result) => set((state) => {
            state.results[scenarioId] = result;
            state.lastCalculationTime = Date.now();
          }),

          clearResult: (scenarioId) => set((state) => {
            delete state.results[scenarioId];
          }),

          clearAllResults: () => set((state) => {
            state.results = {};
            state.comparisonResults = null;
            state.sensitivityResults = null;
          }),

          setComparisonResults: (results) => set((state) => {
            state.comparisonResults = results;
          }),

          setSensitivityResults: (results) => set((state) => {
            state.sensitivityResults = results;
          }),

          // Loading states
          setCalculating: (scenarioId) => set((state) => {
            state.isCalculating = !!scenarioId;
            state.calculatingScenarioId = scenarioId;
          }),

          setLoadingScenarios: (loading) => set((state) => {
            state.isLoadingScenarios = loading;
          }),

          setSaving: (saving) => set((state) => {
            state.isSaving = saving;
          }),

          // Error handling
          addError: (error) => set((state) => {
            const newError = {
              ...error,
              id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString()
            };
            state.errors.push(newError);
            
            // Keep only last 10 errors to prevent memory leaks
            if (state.errors.length > 10) {
              state.errors = state.errors.slice(-10);
            }
          }),

          removeError: (id) => set((state) => {
            state.errors = state.errors.filter(e => e.id !== id);
          }),

          clearErrors: () => set((state) => {
            state.errors = [];
          }),

          // Configuration
          updateConfig: (updates) => set((state) => {
            Object.assign(state.config, updates);
            // Clear all results when config changes as they may be invalid
            state.results = {};
            state.comparisonResults = null;
            state.sensitivityResults = null;
          }),

          resetConfig: () => set((state) => {
            state.config = { ...defaultModelingConfiguration };
            state.results = {};
            state.comparisonResults = null;
            state.sensitivityResults = null;
          }),

          // Performance tracking
          recordCalculation: (scenarioId, duration, success) => set((state) => {
            const record = {
              scenarioId,
              timestamp: new Date().toISOString(),
              duration,
              success
            };
            state.calculationHistory.push(record);
            
            // Keep only last 100 calculations
            if (state.calculationHistory.length > 100) {
              state.calculationHistory = state.calculationHistory.slice(-100);
            }
          }),

          // Bulk operations
          importScenarios: (scenarios) => set((state) => {
            scenarios.forEach(scenario => {
              // Ensure unique IDs
              const existingIds = new Set(state.scenarios.map(s => s.id));
              if (existingIds.has(scenario.id)) {
                scenario.id = `${scenario.id}-imported-${Date.now()}`;
              }
              state.scenarios.push(scenario);
            });
            
            if (scenarios.length > 0 && !state.activeScenarioId) {
              state.activeScenarioId = scenarios[0].id;
            }
          }),

          resetStore: () => set(() => ({
            ...initialState,
            config: get().config // Preserve config
          }))
        })),
        {
          name: 'scenario-store',
          version: 1,
          partialize: (state) => ({
            scenarios: state.scenarios,
            activeScenarioId: state.activeScenarioId,
            config: state.config,
            // Don't persist UI state, results, or errors
          })
        }
      )
    ),
    { name: 'scenario-store' }
  )
);

// Selectors for optimal performance
export const useActiveScenario = () => 
  useScenarioStore(state => 
    state.scenarios.find(s => s.id === state.activeScenarioId) || null
  );

export const useScenarioResult = (scenarioId: string | null) =>
  useScenarioStore(state => 
    scenarioId ? state.results[scenarioId] || null : null
  );

export const useCalculationProgress = () =>
  useScenarioStore(state => ({
    isCalculating: state.isCalculating,
    calculatingScenarioId: state.calculatingScenarioId,
    lastCalculationTime: state.lastCalculationTime
  }));

export const useScenarioErrors = (scenarioId?: string) =>
  useScenarioStore(state => 
    scenarioId 
      ? state.errors.filter(e => e.scenarioId === scenarioId)
      : state.errors
  );

export const usePerformanceMetrics = () =>
  useScenarioStore(state => {
    const recentCalculations = state.calculationHistory.slice(-10);
    const averageDuration = recentCalculations.reduce((sum, calc) => sum + calc.duration, 0) / Math.max(recentCalculations.length, 1);
    const successRate = recentCalculations.filter(calc => calc.success).length / Math.max(recentCalculations.length, 1);
    
    return {
      averageDuration,
      successRate,
      totalCalculations: state.calculationHistory.length,
      recentCalculations
    };
  });