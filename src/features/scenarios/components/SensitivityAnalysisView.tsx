/**
 * Sensitivity Analysis View Component
 * Interface for running and viewing sensitivity analysis on scenario parameters
 */

import { useState } from 'react';
import { 
  ComprehensiveScenario, 
  SensitivityAnalysis, 
  SensitivityVariable 
} from '../types/scenarioModeling';
import { ShareholderPosition } from '../calc/dilution';
import { Button } from '@/components/ui/Button';
import { PlusIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface SensitivityAnalysisViewProps {
  baseScenario: ComprehensiveScenario;
  currentPositions: ShareholderPosition[];
  sensitivityResults: SensitivityAnalysis | null;
  onRunSensitivityAnalysis: (variables: SensitivityVariable[]) => void;
}

export function SensitivityAnalysisView({ 
  baseScenario, 
  currentPositions, 
  sensitivityResults,
  onRunSensitivityAnalysis 
}: SensitivityAnalysisViewProps) {
  const [selectedVariables, setSelectedVariables] = useState<SensitivityVariable[]>([]);

  const addVariable = () => {
    const newVariable: SensitivityVariable = {
      name: 'Pre-Money Valuation',
      parameter: 'preMoney',
      baseValue: baseScenario.fundingRounds[0]?.preMoney || 10000000000,
      testRange: {
        min: 5000000000, // $50M
        max: 20000000000, // $200M
        steps: 10
      }
    };
    
    setSelectedVariables([...selectedVariables, newVariable]);
  };

  if (!sensitivityResults && selectedVariables.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <AdjustmentsHorizontalIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sensitivity Analysis
          </h3>
          <p className="text-gray-500 mb-4">
            Analyze how changes in key variables affect ownership and returns
          </p>
          <Button onClick={addVariable}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Variable
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Variable Configuration */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Sensitivity Variables</h3>
          <Button size="sm" onClick={addVariable}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
        </div>

        {selectedVariables.length > 0 ? (
          <div className="space-y-4">
            {selectedVariables.map((variable, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variable Name
                    </label>
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => {
                        const updated = [...selectedVariables];
                        updated[index] = { ...updated[index], name: e.target.value };
                        setSelectedVariables(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parameter
                    </label>
                    <select
                      value={variable.parameter}
                      onChange={(e) => {
                        const updated = [...selectedVariables];
                        updated[index] = { ...updated[index], parameter: e.target.value };
                        setSelectedVariables(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="preMoney">Pre-Money Valuation</option>
                      <option value="investmentAmount">Investment Amount</option>
                      <option value="exitValue">Exit Value</option>
                      <option value="optionPoolSize">Option Pool Size</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Range (Min - Max)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={variable.testRange.min / 100000000}
                        onChange={(e) => {
                          const updated = [...selectedVariables];
                          updated[index].testRange.min = (parseFloat(e.target.value) || 0) * 100000000;
                          setSelectedVariables(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={variable.testRange.max / 100000000}
                        onChange={(e) => {
                          const updated = [...selectedVariables];
                          updated[index].testRange.max = (parseFloat(e.target.value) || 0) * 100000000;
                          setSelectedVariables(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Steps
                    </label>
                    <input
                      type="number"
                      value={variable.testRange.steps}
                      onChange={(e) => {
                        const updated = [...selectedVariables];
                        updated[index].testRange.steps = parseInt(e.target.value) || 10;
                        setSelectedVariables(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="5"
                      max="50"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex justify-end">
              <Button onClick={() => onRunSensitivityAnalysis(selectedVariables)}>
                Run Sensitivity Analysis
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No variables configured for sensitivity analysis
          </p>
        )}
      </div>

      {/* Results */}
      {sensitivityResults && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sensitivity Results</h3>
          <div className="text-center py-12 bg-blue-50 rounded-lg">
            <p className="text-blue-700">
              Sensitivity analysis results visualization will be displayed here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}