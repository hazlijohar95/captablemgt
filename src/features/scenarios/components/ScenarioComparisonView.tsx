/**
 * Scenario Comparison View Component
 * Side-by-side comparison of multiple scenarios
 */

import { useState } from 'react';
import { ComprehensiveScenario, ScenarioComparison } from '../types/scenarioModeling';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@heroicons/react/24/outline';

interface ScenarioComparisonViewProps {
  currentScenario: ComprehensiveScenario | null;
  comparisonResults: ScenarioComparison | null;
  onCompareScenarios: (scenarios: ComprehensiveScenario[]) => void;
}

export function ScenarioComparisonView({ 
  currentScenario, 
  comparisonResults, 
  onCompareScenarios 
}: ScenarioComparisonViewProps) {
  const [selectedScenarios, setSelectedScenarios] = useState<ComprehensiveScenario[]>([]);

  if (!currentScenario) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Create a scenario first to enable comparisons</p>
      </div>
    );
  }

  if (!comparisonResults) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Compare Scenarios
          </h3>
          <p className="text-gray-500 mb-4">
            Create additional scenarios to enable side-by-side comparison
          </p>
          <Button onClick={() => onCompareScenarios([currentScenario])}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Start Comparison
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-12 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          Scenario Comparison (Coming Soon)
        </h3>
        <p className="text-blue-700">
          Advanced scenario comparison and analysis tools will be available here
        </p>
      </div>
    </div>
  );
}