/**
 * Scenario Configuration Component
 * Settings and configuration for scenario modeling calculations
 */

import { useState } from 'react';
import { ModelingConfiguration } from '../types/scenarioModeling';
import { Button } from '@/components/ui/Button';

interface ScenarioConfigurationProps {
  config: ModelingConfiguration;
  onSave: (config: ModelingConfiguration) => void;
  onCancel: () => void;
}

export function ScenarioConfiguration({ config, onSave, onCancel }: ScenarioConfigurationProps) {
  const [localConfig, setLocalConfig] = useState<ModelingConfiguration>(config);

  const handleSave = () => {
    onSave(localConfig);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Scenario Modeling Configuration</h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure calculation settings and default values for scenario modeling
        </p>
      </div>

      <div className="space-y-6">
        {/* Calculation Settings */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Calculation Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decimal Precision
              </label>
              <input
                type="number"
                value={localConfig.decimalPrecision}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  decimalPrecision: parseInt(e.target.value) || 28
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="10"
                max="50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rounding Method
              </label>
              <select
                value={localConfig.roundingMethod}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  roundingMethod: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ROUND_HALF_EVEN">Banker's Rounding (Half Even)</option>
                <option value="ROUND_HALF_UP">Half Up</option>
                <option value="ROUND_DOWN">Down</option>
              </select>
            </div>
          </div>
        </div>

        {/* Default Tax Rates */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Default Tax Rates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordinary Income Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={(localConfig.defaultTaxRates.ordinaryIncomeRate * 100).toString()}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    defaultTaxRates: {
                      ...localConfig.defaultTaxRates,
                      ordinaryIncomeRate: (parseFloat(e.target.value) || 0) / 100
                    }
                  })}
                  className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0"
                  max="60"
                />
                <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capital Gains Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={(localConfig.defaultTaxRates.capitalGainsRate * 100).toString()}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    defaultTaxRates: {
                      ...localConfig.defaultTaxRates,
                      capitalGainsRate: (parseFloat(e.target.value) || 0) / 100
                    }
                  })}
                  className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0"
                  max="40"
                />
                <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AMT Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={(localConfig.defaultTaxRates.amtRate * 100).toString()}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    defaultTaxRates: {
                      ...localConfig.defaultTaxRates,
                      amtRate: (parseFloat(e.target.value) || 0) / 100
                    }
                  })}
                  className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0"
                  max="40"
                />
                <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State Tax Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={(localConfig.defaultTaxRates.stateRate * 100).toString()}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    defaultTaxRates: {
                      ...localConfig.defaultTaxRates,
                      stateRate: (parseFloat(e.target.value) || 0) / 100
                    }
                  })}
                  className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0"
                  max="20"
                />
                <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Default Terms */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Default Terms</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anti-Dilution Type
              </label>
              <select
                value={localConfig.defaultAntiDilutionType}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  defaultAntiDilutionType: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="WEIGHTED_AVERAGE_BROAD">Weighted Average (Broad)</option>
                <option value="WEIGHTED_AVERAGE_NARROW">Weighted Average (Narrow)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Liquidation Multiple
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={localConfig.defaultLiquidationMultiple.toString()}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    defaultLiquidationMultiple: parseFloat(e.target.value) || 1.0
                  })}
                  className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0"
                  max="10"
                />
                <span className="absolute right-3 top-2 text-gray-500 text-sm">x</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participation Rights
              </label>
              <select
                value={localConfig.defaultParticipationRights}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  defaultParticipationRights: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NONE">Non-Participating</option>
                <option value="FULL">Participating</option>
                <option value="CAPPED">Participating with Cap</option>
              </select>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Display Preferences</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={localConfig.defaultCurrency}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  defaultCurrency: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Format
              </label>
              <select
                value={localConfig.displayFormat}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  displayFormat: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MILLIONS">Millions (M)</option>
                <option value="THOUSANDS">Thousands (K)</option>
                <option value="ACTUAL">Actual Values</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
}