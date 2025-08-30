/**
 * Header component for Scenario Modeler with actions and configuration
 */

import React from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { ComprehensiveScenario } from '../types/scenarioModeling';

interface ScenarioModelerHeaderProps {
  activeScenario: ComprehensiveScenario | null;
  isCalculating: boolean;
  onCreateScenario: () => void;
  onRecalculate: () => void;
  onShowConfig: () => void;
  onShowSave: () => void;
}

export const ScenarioModelerHeader: React.FC<ScenarioModelerHeaderProps> = ({
  activeScenario,
  isCalculating,
  onCreateScenario,
  onRecalculate,
  onShowConfig,
  onShowSave
}) => {
  return (
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
            onClick={onShowConfig}
            disabled={isCalculating}
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            Config
          </Button>
          
          <Button
            variant="outline"
            onClick={onRecalculate}
            disabled={!activeScenario || isCalculating}
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Calculating...' : 'Recalculate'}
          </Button>
          
          {!activeScenario ? (
            <Button onClick={onCreateScenario}>
              <PlusIcon className="h-5 w-5 mr-2" />
              New Scenario
            </Button>
          ) : (
            <Button
              onClick={onShowSave}
              disabled={isCalculating}
            >
              Save Scenario
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};