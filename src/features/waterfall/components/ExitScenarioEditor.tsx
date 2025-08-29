import { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface ExitScenario {
  name: string;
  value: number; // in cents
}

interface ExitScenarioEditorProps {
  scenario: ExitScenario;
  scenarios: ExitScenario[];
  onUpdate: (updates: Partial<ExitScenario>) => void;
  onDelete: () => void;
}

export function ExitScenarioEditor({ scenario, scenarios, onUpdate, onDelete }: ExitScenarioEditorProps) {
  const [localValue, setLocalValue] = useState((scenario.value / 100000000).toString());

  const handleValueChange = (value: string) => {
    setLocalValue(value);
    const numericValue = parseFloat(value) || 0;
    onUpdate({ value: numericValue * 100000000 }); // Convert to cents
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">
          Edit Exit Scenario
        </h2>
        {scenarios.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scenario Name
          </label>
          <input
            type="text"
            value={scenario.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., IPO, Acquisition"
          />
        </div>

        {/* Exit Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exit Value
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100"
              step="1"
              min="0"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">M</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Total exit value in millions of dollars
          </p>
        </div>
      </div>

      {/* Quick Value Presets */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '$10M', value: 1000000000 },
            { label: '$25M', value: 2500000000 },
            { label: '$50M', value: 5000000000 },
            { label: '$100M', value: 10000000000 },
            { label: '$250M', value: 25000000000 },
            { label: '$500M', value: 50000000000 },
            { label: '$1B', value: 100000000000 }
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                onUpdate({ value: preset.value });
                setLocalValue((preset.value / 100000000).toString());
              }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                Math.abs(scenario.value - preset.value) < 1000000 // Within $0.01M
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Scenario Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Exit Multiple</div>
            <div className="text-lg font-semibold text-gray-900">
              {/* This would need total invested amount from context */}
              —x
            </div>
            <div className="text-xs text-gray-500">vs. total invested</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Pref Coverage</div>
            <div className="text-lg font-semibold text-gray-900">
              {/* This would need total liquidation preference from context */}
              —%
            </div>
            <div className="text-xs text-gray-500">of liquidation pref</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Common Value</div>
            <div className="text-lg font-semibold text-gray-900">
              {/* This would need common distribution calculation */}
              —%
            </div>
            <div className="text-xs text-gray-500">to common holders</div>
          </div>
        </div>
      </div>

      {/* Modeling Tips */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Modeling Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Consider different exit types: IPO typically values at revenue multiples, acquisitions vary widely</li>
            <li>• Model both upside and downside scenarios to understand risk/reward profiles</li>
            <li>• Remember that liquidation preferences create floors for preferred holders</li>
            <li>• Participation rights can significantly impact common holder returns</li>
          </ul>
        </div>
      </div>
    </div>
  );
}