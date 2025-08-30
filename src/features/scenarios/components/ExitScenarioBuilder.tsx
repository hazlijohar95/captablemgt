/**
 * Exit Scenario Builder Component
 * Interface for configuring exit scenarios with waterfall analysis parameters
 */

import { useState } from 'react';
import { 
  InformationCircleIcon,
  TrophyIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';
import { ExitScenario } from '../types/scenarioModeling';

interface ExitScenarioBuilderProps {
  exitScenario: ExitScenario;
  onChange: (updates: Partial<ExitScenario>) => void;
}

export function ExitScenarioBuilder({ exitScenario, onChange }: ExitScenarioBuilderProps) {
  const [localExitValue, setLocalExitValue] = useState(
    (exitScenario.exitValue / 100000000).toString()
  );

  const handleExitValueChange = (value: string) => {
    setLocalExitValue(value);
    const numericValue = parseFloat(value) || 0;
    onChange({ exitValue: numericValue * 100000000 }); // Convert to cents
  };

  const getExitTypeIcon = (type: string) => {
    switch (type) {
      case 'IPO': return TrophyIcon;
      case 'ACQUISITION': return BuildingOffice2Icon;
      case 'MERGER': return BuildingOffice2Icon;
      case 'LIQUIDATION': return ExclamationTriangleIcon;
      default: return BanknotesIcon;
    }
  };

  const getExitTypeColor = (type: string) => {
    switch (type) {
      case 'IPO': return 'text-green-600 bg-green-100';
      case 'ACQUISITION': return 'text-blue-600 bg-blue-100';
      case 'MERGER': return 'text-purple-600 bg-purple-100';
      case 'LIQUIDATION': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProbabilityColor = (probability: number | undefined) => {
    if (!probability) return 'text-gray-600';
    if (probability >= 0.7) return 'text-green-600';
    if (probability >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          {(() => {
            const IconComponent = getExitTypeIcon(exitScenario.exitType);
            return (
              <div className={`p-2 rounded-lg ${getExitTypeColor(exitScenario.exitType)}`}>
                <IconComponent className="h-5 w-5" />
              </div>
            );
          })()}
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Configure {exitScenario.name}
            </h3>
            <p className="text-sm text-gray-500">
              Set up exit scenario parameters and liquidity preferences
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 space-y-6">
        {/* Basic Exit Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exit Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scenario Name
            </label>
            <input
              type="text"
              value={exitScenario.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., IPO, Strategic Acquisition"
            />
          </div>

          {/* Exit Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exit Type
            </label>
            <select
              value={exitScenario.exitType}
              onChange={(e) => onChange({ 
                exitType: e.target.value as 'IPO' | 'ACQUISITION' | 'MERGER' | 'LIQUIDATION'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="IPO">Initial Public Offering (IPO)</option>
              <option value="ACQUISITION">Strategic Acquisition</option>
              <option value="MERGER">Merger</option>
              <option value="LIQUIDATION">Liquidation</option>
            </select>
          </div>

          {/* Exit Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exit Value
              <InformationCircleIcon className="h-4 w-4 inline ml-1 text-gray-400" title="Total enterprise value or purchase price" />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={localExitValue}
                onChange={(e) => handleExitValueChange(e.target.value)}
                className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100"
                step="1"
                min="0"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">M</span>
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Timeframe
            </label>
            <input
              type="text"
              value={exitScenario.timeframe || ''}
              onChange={(e) => onChange({ timeframe: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 3-5 years, 18 months"
            />
          </div>

          {/* Probability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Probability Estimate
              <InformationCircleIcon className="h-4 w-4 inline ml-1 text-gray-400" title="Subjective probability of this outcome" />
            </label>
            <div className="relative">
              <input
                type="number"
                value={exitScenario.probability ? (exitScenario.probability * 100).toString() : ''}
                onChange={(e) => onChange({ 
                  probability: parseFloat(e.target.value) ? parseFloat(e.target.value) / 100 : undefined 
                })}
                className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50"
                step="5"
                min="0"
                max="100"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
            </div>
            {exitScenario.probability && (
              <p className={`mt-1 text-xs font-medium ${getProbabilityColor(exitScenario.probability)}`}>
                {exitScenario.probability >= 0.7 ? 'High confidence' :
                 exitScenario.probability >= 0.4 ? 'Moderate confidence' : 'Low confidence'}
              </p>
            )}
          </div>
        </div>

        {/* Quick Value Presets */}
        <div className="pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Value Presets</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '$10M', value: 1000000000, scenario: 'Distressed Sale' },
              { label: '$25M', value: 2500000000, scenario: 'Asset Sale' },
              { label: '$50M', value: 5000000000, scenario: 'Strategic Sale' },
              { label: '$100M', value: 10000000000, scenario: 'Good Outcome' },
              { label: '$250M', value: 25000000000, scenario: 'Great Outcome' },
              { label: '$500M', value: 50000000000, scenario: 'Exceptional' },
              { label: '$1B', value: 100000000000, scenario: 'Unicorn Exit' }
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onChange({ exitValue: preset.value });
                  setLocalExitValue((preset.value / 100000000).toString());
                }}
                className={`px-3 py-2 text-xs rounded-lg border transition-all hover:shadow-sm ${
                  Math.abs(exitScenario.exitValue - preset.value) < 1000000 // Within $0.01M
                    ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
                title={preset.scenario}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-xs opacity-75">{preset.scenario}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Exit-Specific Settings */}
        <div className="pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Exit-Specific Settings</h4>
          
          <div className="space-y-4">
            {/* Convert All to Common */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="convert-to-common"
                checked={exitScenario.convertAllToCommon || false}
                onChange={(e) => onChange({ convertAllToCommon: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <label htmlFor="convert-to-common" className="block text-sm font-medium text-gray-700">
                  Convert all preferred to common
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Analyze as if all preferred shares convert to common (typical for IPO)
                </p>
              </div>
            </div>

            {/* Drag-Along Rights */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="drag-along"
                checked={exitScenario.applyDragAlongRights || false}
                onChange={(e) => onChange({ applyDragAlongRights: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <label htmlFor="drag-along" className="block text-sm font-medium text-gray-700">
                  Apply drag-along rights
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Force all shareholders to participate in the sale
                </p>
              </div>
            </div>

            {/* Tag-Along Rights */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="tag-along"
                checked={exitScenario.tagAlongApplies || false}
                onChange={(e) => onChange({ tagAlongApplies: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <label htmlFor="tag-along" className="block text-sm font-medium text-gray-700">
                  Tag-along rights apply
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Minority shareholders can participate pro-rata in the sale
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario Analysis Preview */}
        <div className="pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Scenario Analysis Preview</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Exit Multiple</div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {/* This would be calculated based on total investment */}
                —x
              </div>
              <div className="text-xs text-gray-500 mt-1">vs. total invested</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Return Type</div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {exitScenario.convertAllToCommon ? 'As Converted' : 'Liquidation Pref'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {exitScenario.convertAllToCommon ? 
                  'All shares convert to common' : 
                  'Liquidation preferences apply'
                }
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Scenario Tags</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant={
                  exitScenario.probability && exitScenario.probability > 0.6 ? 'success' :
                  exitScenario.probability && exitScenario.probability > 0.3 ? 'warning' :
                  'outline'
                }>
                  {exitScenario.probability ? 
                    `${(exitScenario.probability * 100).toFixed(0)}% likely` : 
                    'No probability'
                  }
                </Badge>
                
                <Badge variant={
                  exitScenario.exitType === 'IPO' ? 'success' :
                  exitScenario.exitType === 'ACQUISITION' ? 'primary' :
                  exitScenario.exitType === 'LIQUIDATION' ? 'error' :
                  'info'
                }>
                  {exitScenario.exitType}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Exit Type Specific Guidance */}
        <div className="pt-6 border-t border-gray-200">
          <div className={`rounded-lg p-4 ${
            exitScenario.exitType === 'IPO' ? 'bg-green-50' :
            exitScenario.exitType === 'ACQUISITION' ? 'bg-blue-50' :
            exitScenario.exitType === 'LIQUIDATION' ? 'bg-red-50' :
            'bg-gray-50'
          }`}>
            <h4 className={`text-sm font-medium mb-2 ${
              exitScenario.exitType === 'IPO' ? 'text-green-900' :
              exitScenario.exitType === 'ACQUISITION' ? 'text-blue-900' :
              exitScenario.exitType === 'LIQUIDATION' ? 'text-red-900' :
              'text-gray-900'
            }`}>
              {exitScenario.exitType} Modeling Guidance
            </h4>
            <ul className={`text-xs space-y-1 ${
              exitScenario.exitType === 'IPO' ? 'text-green-800' :
              exitScenario.exitType === 'ACQUISITION' ? 'text-blue-800' :
              exitScenario.exitType === 'LIQUIDATION' ? 'text-red-800' :
              'text-gray-800'
            }`}>
              {exitScenario.exitType === 'IPO' && (
                <>
                  <li>• IPOs typically trigger automatic conversion of preferred to common shares</li>
                  <li>• Liquidation preferences usually don't apply in IPO scenarios</li>
                  <li>• Consider lock-up periods affecting liquidity timing</li>
                  <li>• Valuation often based on revenue multiples and public comps</li>
                </>
              )}
              
              {exitScenario.exitType === 'ACQUISITION' && (
                <>
                  <li>• Acquirer typically pays cash or stock consideration</li>
                  <li>• Liquidation preferences and participation rights fully apply</li>
                  <li>• May include earn-outs or contingent consideration</li>
                  <li>• Strategic vs. financial buyer impacts valuation methodology</li>
                </>
              )}
              
              {exitScenario.exitType === 'MERGER' && (
                <>
                  <li>• Treatment depends on whether cash or stock transaction</li>
                  <li>• Exchange ratios determined by relative valuations</li>
                  <li>• May trigger appraisal rights for dissenting shareholders</li>
                  <li>• Consider regulatory approval timelines and risks</li>
                </>
              )}
              
              {exitScenario.exitType === 'LIQUIDATION' && (
                <>
                  <li>• Liquidation preferences paid in order of seniority</li>
                  <li>• Common shareholders receive remainder after all preferences</li>
                  <li>• Assets sold may realize below book value</li>
                  <li>• Consider liquidation costs and professional fees</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}