import { useState } from 'react';
import { RoundScenario } from '../calc/dilution';

interface RoundEditorProps {
  scenario: RoundScenario;
  onChange: (updates: Partial<RoundScenario>) => void;
}

export function RoundEditor({ scenario, onChange }: RoundEditorProps) {
  const [localValues, setLocalValues] = useState({
    preMoney: (scenario.preMoney / 100000000).toString(), // Convert to millions
    investment: (scenario.investmentAmount / 100000000).toString(),
    optionPool: scenario.optionPoolIncrease?.toString() || '0'
  });

  const handleChange = (field: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
    
    // Convert back to cents and update parent
    const updates: Partial<RoundScenario> = {};
    
    switch (field) {
      case 'preMoney':
        const preMoneyValue = parseFloat(value) || 0;
        updates.preMoney = preMoneyValue * 100000000; // Convert to cents
        // Recalculate price per share based on existing shares
        // This is a simplification - in reality, this would be more complex
        break;
      case 'investment':
        const investmentValue = parseFloat(value) || 0;
        updates.investmentAmount = investmentValue * 100000000; // Convert to cents
        break;
      case 'optionPool':
        updates.optionPoolIncrease = parseFloat(value) || 0;
        break;
    }
    
    onChange(updates);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">
        Configure {scenario.name}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Round Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Round Name
          </label>
          <input
            type="text"
            value={scenario.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Series A"
          />
        </div>

        {/* Share Class */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share Class
          </label>
          <select
            value={scenario.shareClass}
            onChange={(e) => onChange({ shareClass: e.target.value as 'COMMON' | 'PREFERRED' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PREFERRED">Preferred</option>
            <option value="COMMON">Common</option>
          </select>
        </div>

        {/* Pre-Money Valuation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pre-Money Valuation
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={localValues.preMoney}
              onChange={(e) => handleChange('preMoney', e.target.value)}
              className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100"
              step="0.1"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">M</span>
          </div>
        </div>

        {/* Investment Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Investment Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={localValues.investment}
              onChange={(e) => handleChange('investment', e.target.value)}
              className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="20"
              step="0.1"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">M</span>
          </div>
        </div>

        {/* Option Pool Increase */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Option Pool Increase
          </label>
          <div className="relative">
            <input
              type="number"
              value={localValues.optionPool}
              onChange={(e) => handleChange('optionPool', e.target.value)}
              className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10"
              step="1"
              min="0"
              max="50"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Percentage points to add to option pool
          </p>
        </div>

        {/* Include Conversion */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id={`conversion-${scenario.name}`}
            checked={scenario.includeConversion || false}
            onChange={(e) => onChange({ includeConversion: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor={`conversion-${scenario.name}`} className="ml-2 block text-sm text-gray-700">
            Include preferred conversion
          </label>
        </div>
      </div>

      {/* Calculated Values */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Calculated Values</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Post-Money Valuation</div>
            <div className="text-lg font-semibold text-gray-900">
              ${((scenario.preMoney + scenario.investmentAmount) / 100000000).toFixed(1)}M
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">New Shares (Est.)</div>
            <div className="text-lg font-semibold text-gray-900">
              {scenario.pricePerShare > 0 
                ? Math.floor(scenario.investmentAmount / scenario.pricePerShare).toLocaleString()
                : '—'
              }
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Investor %</div>
            <div className="text-lg font-semibold text-gray-900">
              {((scenario.investmentAmount / (scenario.preMoney + scenario.investmentAmount)) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}