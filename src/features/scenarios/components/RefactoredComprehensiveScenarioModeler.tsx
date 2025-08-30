/**
 * Refactored Comprehensive Scenario Modeling Interface
 * Main UI component broken down into focused, maintainable pieces
 */

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Import focused components
import { ScenarioModelerHeader } from './ScenarioModelerHeader';
import { ScenarioModelerContent } from './ScenarioModelerContent';
import { TabType } from './ScenarioModelerTabs';
import { ScenarioConfiguration } from './ScenarioConfiguration';

// Import custom hook
import { useScenarioModeler } from '../hooks/useScenarioModeler';

// Import types
import { ComprehensiveScenario } from '../types/scenarioModeling';

interface RefactoredComprehensiveScenarioModelerProps {
  onScenarioSave?: (scenario: ComprehensiveScenario) => void;
  onScenarioLoad?: (scenarioId: string) => void;
  initialScenario?: ComprehensiveScenario;
}

export function RefactoredComprehensiveScenarioModeler({
  onScenarioSave,
  onScenarioLoad,
  initialScenario
}: RefactoredComprehensiveScenarioModelerProps) {
  // Use custom hook for state management
  const {
    state,
    setState,
    loading,
    config,
    setConfig,
    calculateScenario,
    createNewScenario,
    addFundingRound,
    updateFundingRound,
    removeFundingRound,
    addExitScenario,
    updateExitScenario,
    removeExitScenario
  } = useScenarioModeler(initialScenario);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('modeling');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Save scenario handler
  const handleSaveScenario = () => {
    if (state.activeScenario && onScenarioSave) {
      onScenarioSave(state.activeScenario);
      setShowSaveModal(false);
    }
  };

  // Loading state for the entire component
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-lg text-gray-600">
          Loading scenario modeling interface...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <ScenarioModelerHeader
        activeScenario={state.activeScenario}
        isCalculating={state.isCalculating}
        onCreateScenario={createNewScenario}
        onRecalculate={calculateScenario}
        onShowConfig={() => setShowConfigModal(true)}
        onShowSave={() => setShowSaveModal(true)}
      />

      {/* Main content area */}
      <ScenarioModelerContent
        activeTab={activeTab}
        onTabChange={setActiveTab}
        state={state}
        onStateChange={(updates) => setState(prev => ({ ...prev, ...updates }))}
        loading={loading}
        onAddFundingRound={addFundingRound}
        onUpdateFundingRound={updateFundingRound}
        onRemoveFundingRound={removeFundingRound}
        onAddExitScenario={addExitScenario}
        onUpdateExitScenario={updateExitScenario}
        onRemoveExitScenario={removeExitScenario}
      />

      {/* Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Scenario Modeling Configuration"
        size="lg"
      >
        <div className="p-6">
          <ScenarioConfiguration
            config={config}
            onConfigChange={setConfig}
            onSave={() => {
              setShowConfigModal(false);
              // Force recalculation with new config
              if (state.activeScenario) {
                setTimeout(calculateScenario, 100);
              }
            }}
            onCancel={() => setShowConfigModal(false)}
          />
        </div>
      </Modal>

      {/* Save Scenario Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Scenario"
        size="md"
      >
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="scenario-name" className="block text-sm font-medium text-gray-700">
                Scenario Name
              </label>
              <input
                type="text"
                id="scenario-name"
                value={state.activeScenario?.name || ''}
                onChange={(e) => {
                  if (state.activeScenario) {
                    setState(prev => ({
                      ...prev,
                      activeScenario: {
                        ...prev.activeScenario!,
                        name: e.target.value,
                        lastModified: new Date().toISOString()
                      }
                    }));
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter scenario name"
              />
            </div>
            
            <div>
              <label htmlFor="scenario-description" className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                id="scenario-description"
                rows={3}
                value={state.activeScenario?.description || ''}
                onChange={(e) => {
                  if (state.activeScenario) {
                    setState(prev => ({
                      ...prev,
                      activeScenario: {
                        ...prev.activeScenario!,
                        description: e.target.value,
                        lastModified: new Date().toISOString()
                      }
                    }));
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Describe this scenario..."
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveScenario}
              disabled={!state.activeScenario?.name?.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Save Scenario
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}