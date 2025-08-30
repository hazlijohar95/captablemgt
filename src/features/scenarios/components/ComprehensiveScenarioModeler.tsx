/**
 * Comprehensive Scenario Modeling Interface
 * Main UI component for advanced scenario modeling with integrated financial calculations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  CompareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { capTableService } from '@/services/capTableService';

// Import our comprehensive scenario engine
import { 
  ComprehensiveScenarioEngine, 
  defaultModelingConfiguration 
} from '../calc/comprehensiveScenarioEngine';
import { ShareholderPosition } from '../calc/dilution';
import {
  ComprehensiveScenario,
  EnhancedRoundScenario,
  ExitScenario,
  ComprehensiveScenarioResult,
  ScenarioModelingState,
  ScenarioComparison,
  SensitivityAnalysis,
  ModelingConfiguration
} from '../types/scenarioModeling';

// Import sub-components
import { EnhancedRoundEditor } from './EnhancedRoundEditor';
import { ExitScenarioBuilder } from './ExitScenarioBuilder';
import { ScenarioResultsViewer } from './ScenarioResultsViewer';
import { ScenarioComparisonView } from './ScenarioComparisonView';
import { SensitivityAnalysisView } from './SensitivityAnalysisView';
import { ScenarioConfiguration } from './ScenarioConfiguration';

interface ComprehensiveScenarioModelerProps {
  onScenarioSave?: (scenario: ComprehensiveScenario) => void;
  onScenarioLoad?: (scenarioId: string) => void;
  initialScenario?: ComprehensiveScenario;
}

export function ComprehensiveScenarioModeler({
  onScenarioSave,
  onScenarioLoad,
  initialScenario
}: ComprehensiveScenarioModelerProps) {
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
  const [engine] = useState(() => new ComprehensiveScenarioEngine(config));
  
  // UI state
  const [activeTab, setActiveTab] = useState<'modeling' | 'results' | 'comparison' | 'sensitivity'>('modeling');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Load current cap table on component mount
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

  const loadCurrentPositions = async () => {
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
          pricePerShare: 100 // Default $1.00 per share
        };
      });

      setCurrentPositions(positions);
    } catch (error) {
      console.error('Failed to load current positions:', error);
      setState(prev => ({
        ...prev,
        calculationErrors: [...prev.calculationErrors, {
          type: 'LOAD_ERROR',
          message: 'Failed to load current cap table positions',
          timestamp: new Date().toISOString()
        }]
      }));
    } finally {
      setLoading(false);
    }
  };

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
          message: error instanceof Error ? error.message : 'Unknown calculation error',
          timestamp: new Date().toISOString()
        }]
      }));
    }
  }, [state.activeScenario, currentPositions, engine]);

  const createNewScenario = () => {
    const newScenario: ComprehensiveScenario = {
      id: `scenario-${Date.now()}`,
      name: 'New Scenario',
      description: '',
      fundingRounds: [],
      exitScenarios: [{
        id: `exit-${Date.now()}`,
        name: 'Base Case Exit',
        exitValue: 10000000000, // $100M
        exitType: 'ACQUISITION',
        timeframe: '3-5 years',
        probability: 0.6
      }],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: []
    };

    setState(prev => ({ ...prev, activeScenario: newScenario }));
  };

  const addFundingRound = () => {
    if (!state.activeScenario) return;

    const newRound: EnhancedRoundScenario = {
      name: `Series ${String.fromCharCode(65 + state.activeScenario.fundingRounds.length)}`,
      preMoney: 10000000000, // $100M
      investmentAmount: 2000000000, // $20M
      pricePerShare: 1000, // $10.00
      shareClass: 'PREFERRED',
      optionPoolIncrease: 10,
      antiDilutionType: 'WEIGHTED_AVERAGE_BROAD',
      liquidationPreferenceMultiple: 1.0,
      participationRights: 'FULL',
      isParticipating: true,
      seniorityRank: state.activeScenario.fundingRounds.length + 1
    };

    const updatedScenario = {
      ...state.activeScenario,
      fundingRounds: [...state.activeScenario.fundingRounds, newRound],
      lastModified: new Date().toISOString()
    };

    setState(prev => ({ 
      ...prev, 
      activeScenario: updatedScenario,
      selectedRoundIndex: updatedScenario.fundingRounds.length - 1
    }));
  };

  const updateFundingRound = (index: number, updates: Partial<EnhancedRoundScenario>) => {
    if (!state.activeScenario) return;

    const updatedRounds = [...state.activeScenario.fundingRounds];
    updatedRounds[index] = { ...updatedRounds[index], ...updates };

    const updatedScenario = {
      ...state.activeScenario,
      fundingRounds: updatedRounds,
      lastModified: new Date().toISOString()
    };

    setState(prev => ({ ...prev, activeScenario: updatedScenario }));
  };

  const removeFundingRound = (index: number) => {
    if (!state.activeScenario) return;

    const updatedRounds = state.activeScenario.fundingRounds.filter((_, i) => i !== index);
    const updatedScenario = {
      ...state.activeScenario,
      fundingRounds: updatedRounds,
      lastModified: new Date().toISOString()
    };

    setState(prev => ({ 
      ...prev, 
      activeScenario: updatedScenario,
      selectedRoundIndex: null
    }));
  };

  const addExitScenario = () => {
    if (!state.activeScenario) return;

    const newExitScenario: ExitScenario = {
      id: `exit-${Date.now()}`,
      name: `Exit Scenario ${state.activeScenario.exitScenarios.length + 1}`,
      exitValue: 25000000000, // $250M
      exitType: 'IPO',
      timeframe: '5+ years',
      probability: 0.3
    };

    const updatedScenario = {
      ...state.activeScenario,
      exitScenarios: [...state.activeScenario.exitScenarios, newExitScenario],
      lastModified: new Date().toISOString()
    };

    setState(prev => ({ 
      ...prev, 
      activeScenario: updatedScenario,
      selectedExitScenarioIndex: updatedScenario.exitScenarios.length - 1
    }));
  };

  const updateExitScenario = (index: number, updates: Partial<ExitScenario>) => {
    if (!state.activeScenario) return;

    const updatedExits = [...state.activeScenario.exitScenarios];
    updatedExits[index] = { ...updatedExits[index], ...updates };

    const updatedScenario = {
      ...state.activeScenario,
      exitScenarios: updatedExits,
      lastModified: new Date().toISOString()
    };

    setState(prev => ({ ...prev, activeScenario: updatedScenario }));
  };

  const removeExitScenario = (index: number) => {
    if (!state.activeScenario || state.activeScenario.exitScenarios.length <= 1) return;

    const updatedExits = state.activeScenario.exitScenarios.filter((_, i) => i !== index);
    const updatedScenario = {
      ...state.activeScenario,
      exitScenarios: updatedExits,
      lastModified: new Date().toISOString()
    };

    setState(prev => ({ 
      ...prev, 
      activeScenario: updatedScenario,
      selectedExitScenarioIndex: null
    }));
  };

  // Error display component
  const ErrorBanner = () => {
    if (state.calculationErrors.length === 0) return null;

    return (
      <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Calculation Errors ({state.calculationErrors.length})
            </h3>
            <div className="mt-2 space-y-1">
              {state.calculationErrors.map((error, index) => (
                <p key={index} className="text-sm text-red-700">
                  {error.message}
                </p>
              ))}
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, calculationErrors: [] }))}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (!hasCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ChartBarSquareIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No company selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please create or select a company to model scenarios.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Comprehensive Scenario Modeling
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Advanced modeling with anti-dilution, SAFE conversions, waterfall analysis, and tax calculations
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowConfigModal(true)}
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Config
            </Button>
            
            <Button
              variant="outline"
              onClick={calculateScenario}
              disabled={!state.activeScenario || state.isCalculating}
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${state.isCalculating ? 'animate-spin' : ''}`} />
              {state.isCalculating ? 'Calculating...' : 'Recalculate'}
            </Button>
            
            {!state.activeScenario ? (
              <Button onClick={createNewScenario}>
                <PlusIcon className="h-5 w-5 mr-2" />
                New Scenario
              </Button>
            ) : (
              <Button
                onClick={() => setShowSaveModal(true)}
                disabled={state.isCalculating}
              >
                Save Scenario
              </Button>
            )}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="mt-6">
          <nav className="flex space-x-8">
            {[
              { key: 'modeling', label: 'Scenario Modeling' },
              { key: 'results', label: 'Results Analysis' },
              { key: 'comparison', label: 'Scenario Comparison' },
              { key: 'sensitivity', label: 'Sensitivity Analysis' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <ErrorBanner />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Scenario Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Current Cap Table Summary */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Cap Table</h3>
              <div className="space-y-2">
                {currentPositions.slice(0, 5).map(pos => {
                  const totalShares = currentPositions.reduce((sum, p) => sum + p.shares, 0);
                  const percentage = totalShares > 0 ? (pos.shares / totalShares) * 100 : 0;
                  
                  return (
                    <div key={pos.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate">{pos.name}</span>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
                {currentPositions.length > 5 && (
                  <div className="text-xs text-gray-500">
                    +{currentPositions.length - 5} more...
                  </div>
                )}
              </div>
            </div>

            {/* Scenario Status */}
            {state.activeScenario && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Scenario Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Funding Rounds</span>
                    <span className="font-medium">{state.activeScenario.fundingRounds.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Exit Scenarios</span>
                    <span className="font-medium">{state.activeScenario.exitScenarios.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <div className="flex items-center">
                      {state.isCalculating ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 text-yellow-500 animate-spin mr-1" />
                          <span className="text-sm text-yellow-600">Calculating</span>
                        </>
                      ) : state.currentResults ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600">Complete</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Ready</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'modeling' && (
            <ScenarioModelingTab
              scenario={state.activeScenario}
              selectedRoundIndex={state.selectedRoundIndex}
              selectedExitScenarioIndex={state.selectedExitScenarioIndex}
              onSelectRound={(index) => setState(prev => ({ ...prev, selectedRoundIndex: index }))}
              onSelectExitScenario={(index) => setState(prev => ({ ...prev, selectedExitScenarioIndex: index }))}
              onAddFundingRound={addFundingRound}
              onUpdateFundingRound={updateFundingRound}
              onRemoveFundingRound={removeFundingRound}
              onAddExitScenario={addExitScenario}
              onUpdateExitScenario={updateExitScenario}
              onRemoveExitScenario={removeExitScenario}
              onUpdateScenario={(updates) => {
                if (state.activeScenario) {
                  setState(prev => ({ 
                    ...prev, 
                    activeScenario: { 
                      ...state.activeScenario!, 
                      ...updates,
                      lastModified: new Date().toISOString()
                    } 
                  }));
                }
              }}
            />
          )}

          {activeTab === 'results' && state.currentResults && (
            <ScenarioResultsViewer
              results={state.currentResults}
              scenario={state.activeScenario!}
            />
          )}

          {activeTab === 'comparison' && (
            <ScenarioComparisonView
              currentScenario={state.activeScenario}
              comparisonResults={state.comparisonResults}
              onCompareScenarios={(scenarios) => {
                // Implementation for scenario comparison
                console.log('Compare scenarios:', scenarios);
              }}
            />
          )}

          {activeTab === 'sensitivity' && state.activeScenario && (
            <SensitivityAnalysisView
              baseScenario={state.activeScenario}
              currentPositions={currentPositions}
              sensitivityResults={state.sensitivityResults}
              onRunSensitivityAnalysis={(variables) => {
                // Implementation for sensitivity analysis
                console.log('Run sensitivity analysis:', variables);
              }}
            />
          )}

          {/* Empty state when no scenario */}
          {!state.activeScenario && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <ChartBarSquareIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No Scenario Selected
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a new scenario to start modeling complex funding and exit scenarios
              </p>
              <Button
                onClick={createNewScenario}
                className="mt-4"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create New Scenario
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <Modal onClose={() => setShowConfigModal(false)} size="large">
          <ScenarioConfiguration
            config={config}
            onSave={(newConfig) => {
              setConfig(newConfig);
              setShowConfigModal(false);
            }}
            onCancel={() => setShowConfigModal(false)}
          />
        </Modal>
      )}

      {/* Save Scenario Modal */}
      {showSaveModal && state.activeScenario && (
        <Modal onClose={() => setShowSaveModal(false)}>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Save Scenario</h3>
            <p className="text-sm text-gray-500 mb-4">
              Save this scenario for future reference and comparison.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scenario Name
                </label>
                <input
                  type="text"
                  value={state.activeScenario.name}
                  onChange={(e) => {
                    if (state.activeScenario) {
                      setState(prev => ({
                        ...prev,
                        activeScenario: { ...state.activeScenario!, name: e.target.value }
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={state.activeScenario.description || ''}
                  onChange={(e) => {
                    if (state.activeScenario) {
                      setState(prev => ({
                        ...prev,
                        activeScenario: { ...state.activeScenario!, description: e.target.value }
                      }));
                    }
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this scenario..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (onScenarioSave && state.activeScenario) {
                    onScenarioSave(state.activeScenario);
                  }
                  setShowSaveModal(false);
                }}
              >
                Save Scenario
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Sub-component for the scenario modeling tab
function ScenarioModelingTab({
  scenario,
  selectedRoundIndex,
  selectedExitScenarioIndex,
  onSelectRound,
  onSelectExitScenario,
  onAddFundingRound,
  onUpdateFundingRound,
  onRemoveFundingRound,
  onAddExitScenario,
  onUpdateExitScenario,
  onRemoveExitScenario,
  onUpdateScenario
}: {
  scenario: ComprehensiveScenario | null;
  selectedRoundIndex: number | null;
  selectedExitScenarioIndex: number | null;
  onSelectRound: (index: number) => void;
  onSelectExitScenario: (index: number) => void;
  onAddFundingRound: () => void;
  onUpdateFundingRound: (index: number, updates: Partial<EnhancedRoundScenario>) => void;
  onRemoveFundingRound: (index: number) => void;
  onAddExitScenario: () => void;
  onUpdateExitScenario: (index: number, updates: Partial<ExitScenario>) => void;
  onRemoveExitScenario: (index: number) => void;
  onUpdateScenario: (updates: Partial<ComprehensiveScenario>) => void;
}) {
  if (!scenario) return null;

  return (
    <div className="space-y-6">
      {/* Scenario Basic Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Scenario Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scenario Name
            </label>
            <input
              type="text"
              value={scenario.name}
              onChange={(e) => onUpdateScenario({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={scenario.tags?.join(', ') || ''}
              onChange={(e) => onUpdateScenario({ 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seed, series-a, optimistic"
            />
          </div>
        </div>
      </div>

      {/* Funding Rounds */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Funding Rounds</h3>
          <Button onClick={onAddFundingRound}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Round
          </Button>
        </div>

        {scenario.fundingRounds.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-4">No funding rounds modeled yet</p>
            <Button size="sm" onClick={onAddFundingRound}>
              Add First Round
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {scenario.fundingRounds.map((round, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedRoundIndex === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onSelectRound(index)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{round.name}</h4>
                    <div className="text-sm text-gray-500 mt-1">
                      ${(round.investmentAmount / 100000000).toFixed(1)}M at ${(round.preMoney / 100000000).toFixed(1)}M pre-money
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                      {round.antiDilutionType && round.antiDilutionType !== 'NONE' && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {round.antiDilutionType}
                        </span>
                      )}
                      {round.participationRights && round.participationRights !== 'NONE' && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {round.participationRights} Participation
                        </span>
                      )}
                      {round.liquidationPreferenceMultiple && round.liquidationPreferenceMultiple > 1 && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          {round.liquidationPreferenceMultiple}x Liquidation
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFundingRound(index);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected round editor */}
        {selectedRoundIndex !== null && scenario.fundingRounds[selectedRoundIndex] && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <EnhancedRoundEditor
              round={scenario.fundingRounds[selectedRoundIndex]}
              onChange={(updates) => onUpdateFundingRound(selectedRoundIndex, updates)}
            />
          </div>
        )}
      </div>

      {/* Exit Scenarios */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Exit Scenarios</h3>
          <Button onClick={onAddExitScenario}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Exit
          </Button>
        </div>

        <div className="space-y-3">
          {scenario.exitScenarios.map((exit, index) => (
            <div
              key={exit.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedExitScenarioIndex === index
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => onSelectExitScenario(index)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{exit.name}</h4>
                  <div className="text-sm text-gray-500 mt-1">
                    ${(exit.exitValue / 100000000).toFixed(0)}M {exit.exitType}
                    {exit.timeframe && ` • ${exit.timeframe}`}
                    {exit.probability && ` • ${(exit.probability * 100).toFixed(0)}% probability`}
                  </div>
                </div>
                {scenario.exitScenarios.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveExitScenario(index);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Selected exit scenario editor */}
        {selectedExitScenarioIndex !== null && scenario.exitScenarios[selectedExitScenarioIndex] && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <ExitScenarioBuilder
              exitScenario={scenario.exitScenarios[selectedExitScenarioIndex]}
              onChange={(updates) => onUpdateExitScenario(selectedExitScenarioIndex, updates)}
            />
          </div>
        )}
      </div>
    </div>
  );
}