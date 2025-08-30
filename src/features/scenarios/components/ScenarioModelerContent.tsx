/**
 * Main content area for Scenario Modeler with tab-based navigation
 */

import React from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ScenarioModelerTabs, TabType } from './ScenarioModelerTabs';
import { ScenarioModelerErrorBanner } from './ScenarioModelerErrorBanner';

// Import tab content components
import { EnhancedRoundEditor } from './EnhancedRoundEditor';
import { ExitScenarioBuilder } from './ExitScenarioBuilder';
import { ScenarioResultsViewer } from './ScenarioResultsViewer';
import { ScenarioComparisonView } from './ScenarioComparisonView';
import { SensitivityAnalysisView } from './SensitivityAnalysisView';

import {
  ComprehensiveScenario,
  EnhancedRoundScenario,
  ExitScenario,
  ComprehensiveScenarioResult,
  ScenarioModelingState
} from '../types/scenarioModeling';

interface CalculationError {
  message: string;
  details?: string;
}

interface ScenarioModelerContentProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  state: ScenarioModelingState;
  onStateChange: (updates: Partial<ScenarioModelingState>) => void;
  loading: boolean;
  
  // Scenario operations
  onAddFundingRound: () => void;
  onUpdateFundingRound: (index: number, updates: Partial<EnhancedRoundScenario>) => void;
  onRemoveFundingRound: (index: number) => void;
  onAddExitScenario: () => void;
  onUpdateExitScenario: (index: number, updates: Partial<ExitScenario>) => void;
  onRemoveExitScenario: (index: number) => void;
}

export const ScenarioModelerContent: React.FC<ScenarioModelerContentProps> = ({
  activeTab,
  onTabChange,
  state,
  onStateChange,
  loading,
  onAddFundingRound,
  onUpdateFundingRound,
  onRemoveFundingRound,
  onAddExitScenario,
  onUpdateExitScenario,
  onRemoveExitScenario
}) => {
  const hasActiveScenario = !!state.activeScenario;
  const hasResults = !!state.currentResults;

  // Error handling
  const handleDismissError = (index: number) => {
    const updatedErrors = state.calculationErrors.filter((_, i) => i !== index);
    onStateChange({ calculationErrors: updatedErrors });
  };

  const handleDismissAllErrors = () => {
    onStateChange({ calculationErrors: [] });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-lg text-gray-600">Loading cap table data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      <ScenarioModelerErrorBanner
        errors={state.calculationErrors}
        onDismissError={handleDismissError}
        onDismissAll={handleDismissAllErrors}
      />

      {/* Tab Navigation */}
      <ScenarioModelerTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        hasActiveScenario={hasActiveScenario}
        hasResults={hasResults}
      />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'modeling' && (
          <ScenarioModelingTab
            scenario={state.activeScenario}
            selectedRoundIndex={state.selectedRoundIndex}
            selectedExitScenarioIndex={state.selectedExitScenarioIndex}
            onSelectRound={(index) => onStateChange({ selectedRoundIndex: index })}
            onSelectExitScenario={(index) => onStateChange({ selectedExitScenarioIndex: index })}
            onAddFundingRound={onAddFundingRound}
            onUpdateFundingRound={onUpdateFundingRound}
            onRemoveFundingRound={onRemoveFundingRound}
            onAddExitScenario={onAddExitScenario}
            onUpdateExitScenario={onUpdateExitScenario}
            onRemoveExitScenario={onRemoveExitScenario}
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
            comparisonResults={state.comparisonResults}
            selectedScenarios={state.selectedScenariosForComparison}
            onScenarioSelect={(scenarios) => onStateChange({ selectedScenariosForComparison: scenarios })}
          />
        )}

        {activeTab === 'sensitivity' && state.sensitivityResults && (
          <SensitivityAnalysisView
            sensitivityResults={state.sensitivityResults}
            scenario={state.activeScenario!}
          />
        )}
      </div>
    </div>
  );
};

// Modeling tab content component
interface ScenarioModelingTabProps {
  scenario: ComprehensiveScenario | null;
  selectedRoundIndex: number | null;
  selectedExitScenarioIndex: number | null;
  onSelectRound: (index: number | null) => void;
  onSelectExitScenario: (index: number | null) => void;
  onAddFundingRound: () => void;
  onUpdateFundingRound: (index: number, updates: Partial<EnhancedRoundScenario>) => void;
  onRemoveFundingRound: (index: number) => void;
  onAddExitScenario: () => void;
  onUpdateExitScenario: (index: number, updates: Partial<ExitScenario>) => void;
  onRemoveExitScenario: (index: number) => void;
}

const ScenarioModelingTab: React.FC<ScenarioModelingTabProps> = ({
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
  onRemoveExitScenario
}) => {
  if (!scenario) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-gray-500 mb-4">
          No active scenario
        </div>
        <p className="text-sm text-gray-400">
          Create a new scenario to start modeling
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Funding Rounds Section */}
      <div className="space-y-6">
        <EnhancedRoundEditor
          rounds={scenario.fundingRounds}
          selectedRoundIndex={selectedRoundIndex}
          onSelectRound={onSelectRound}
          onAddRound={onAddFundingRound}
          onUpdateRound={onUpdateFundingRound}
          onRemoveRound={onRemoveFundingRound}
        />
      </div>

      {/* Exit Scenarios Section */}
      <div className="space-y-6">
        <ExitScenarioBuilder
          exitScenarios={scenario.exitScenarios}
          selectedExitIndex={selectedExitScenarioIndex}
          onSelectExit={onSelectExitScenario}
          onAddExit={onAddExitScenario}
          onUpdateExit={onUpdateExitScenario}
          onRemoveExit={onRemoveExitScenario}
        />
      </div>
    </div>
  );
};