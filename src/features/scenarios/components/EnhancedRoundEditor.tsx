/**
 * Enhanced Round Editor Component
 * Advanced interface for configuring funding rounds with anti-dilution, SAFE conversions, and complex terms
 */

import { useState } from 'react';
import { 
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EnhancedRoundScenario } from '../types/scenarioModeling';
import { ISAFENote, SAFEType } from '@/features/cap-table/calc/enhancedSAFE';

interface EnhancedRoundEditorProps {
  round: EnhancedRoundScenario;
  onChange: (updates: Partial<EnhancedRoundScenario>) => void;
}

export function EnhancedRoundEditor({ round, onChange }: EnhancedRoundEditorProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'terms' | 'safes' | 'advanced'>('basic');
  const [localValues, setLocalValues] = useState({
    preMoney: (round.preMoney / 100000000).toString(), // Convert to millions
    investment: (round.investmentAmount / 100000000).toString(),
    pricePerShare: (round.pricePerShare / 100).toString(), // Convert to dollars
    optionPool: round.optionPoolIncrease?.toString() || '0',
    liquidationMultiple: round.liquidationPreferenceMultiple?.toString() || '1.0',
    participationCap: round.participationCap?.toString() || '3.0',
    dividendRate: round.dividendRate?.toString() || '8.0',
    seniorityRank: round.seniorityRank?.toString() || '100'
  });

  const handleValueChange = (field: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
    
    // Convert back to appropriate units and update parent
    const updates: Partial<EnhancedRoundScenario> = {};
    
    switch (field) {
      case 'preMoney':
        updates.preMoney = (parseFloat(value) || 0) * 100000000; // Convert to cents
        break;
      case 'investment':
        updates.investmentAmount = (parseFloat(value) || 0) * 100000000; // Convert to cents
        break;
      case 'pricePerShare':
        updates.pricePerShare = (parseFloat(value) || 0) * 100; // Convert to cents
        break;
      case 'optionPool':
        updates.optionPoolIncrease = parseFloat(value) || 0;
        break;
      case 'liquidationMultiple':
        updates.liquidationPreferenceMultiple = parseFloat(value) || 1.0;
        break;
      case 'participationCap':
        updates.participationCap = parseFloat(value) || 3.0;
        break;
      case 'dividendRate':
        updates.dividendRate = parseFloat(value) || 0;
        break;
      case 'seniorityRank':
        updates.seniorityRank = parseInt(value) || 100;
        break;
    }
    
    onChange(updates);
  };

  const addSAFENote = () => {
    const newSAFE: ISAFENote = {
      id: `safe-${Date.now()}`,
      investmentAmount: 50000000, // $500K
      safeType: SAFEType.POST_MONEY_VALUATION_CAP,
      valuationCap: 1000000000, // $10M
      discountRate: 0.20,
      hasMFN: true,
      hasProRata: false,
      investorName: 'SAFE Investor',
      investmentDate: new Date().toISOString().split('T')[0]
    };

    const currentSAFEs = round.convertingSAFEs || [];
    onChange({ convertingSAFEs: [...currentSAFEs, newSAFE] });
  };

  const updateSAFENote = (index: number, updates: Partial<ISAFENote>) => {
    if (!round.convertingSAFEs) return;
    
    const updatedSAFEs = [...round.convertingSAFEs];
    updatedSAFEs[index] = { ...updatedSAFEs[index], ...updates };
    onChange({ convertingSAFEs: updatedSAFEs });
  };

  const removeSAFENote = (index: number) => {
    if (!round.convertingSAFEs) return;
    
    const updatedSAFEs = round.convertingSAFEs.filter((_, i) => i !== index);
    onChange({ convertingSAFEs: updatedSAFEs });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configure {round.name}
        </h3>
        <p className="text-sm text-gray-500">
          Set up advanced terms including anti-dilution protection, liquidation preferences, and SAFE conversions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'basic', label: 'Basic Terms', icon: CurrencyDollarIcon },
            { key: 'terms', label: 'Advanced Terms', icon: ShieldCheckIcon },
            { key: 'safes', label: 'SAFE Conversions', icon: DocumentTextIcon },
            { key: 'advanced', label: 'Advanced', icon: InformationCircleIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900">Basic Round Terms</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Round Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Round Name
                </label>
                <input
                  type="text"
                  value={round.name}
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
                  value={round.shareClass}
                  onChange={(e) => onChange({ shareClass: e.target.value as 'COMMON' | 'PREFERRED' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PREFERRED">Preferred Stock</option>
                  <option value="COMMON">Common Stock</option>
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
                    onChange={(e) => handleValueChange('preMoney', e.target.value)}
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
                    onChange={(e) => handleValueChange('investment', e.target.value)}
                    className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="20"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-2 text-gray-500 text-sm">M</span>
                </div>
              </div>

              {/* Price Per Share */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Per Share
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={localValues.pricePerShare}
                    onChange={(e) => handleValueChange('pricePerShare', e.target.value)}
                    className="w-full pl-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10.00"
                    step="0.01"
                  />
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
                    onChange={(e) => handleValueChange('optionPool', e.target.value)}
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
            </div>

            {/* Calculated Values */}
            <div className="pt-6 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Calculated Values</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Post-Money Valuation</div>
                  <div className="text-lg font-semibold text-gray-900">
                    ${((round.preMoney + round.investmentAmount) / 100000000).toFixed(1)}M
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">New Shares (Est.)</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {round.pricePerShare > 0 
                      ? Math.floor(round.investmentAmount / round.pricePerShare).toLocaleString()
                      : '—'
                    }
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Investor %</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {((round.investmentAmount / (round.preMoney + round.investmentAmount)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900">Advanced Terms & Rights</h4>
            
            {/* Anti-Dilution Protection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anti-Dilution Protection
                  <InformationCircleIcon className="h-4 w-4 inline ml-1 text-gray-400" title="Protection against future down rounds" />
                </label>
                <select
                  value={round.antiDilutionType || 'NONE'}
                  onChange={(e) => onChange({ 
                    antiDilutionType: e.target.value as any
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NONE">None</option>
                  <option value="WEIGHTED_AVERAGE_BROAD">Weighted Average (Broad-Based)</option>
                  <option value="WEIGHTED_AVERAGE_NARROW">Weighted Average (Narrow-Based)</option>
                  <option value="FULL_RATCHET">Full Ratchet</option>
                </select>
                {round.antiDilutionType && round.antiDilutionType !== 'NONE' && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Protection against down rounds enabled
                  </p>
                )}
              </div>

              {/* Liquidation Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Liquidation Preference Multiple
                  <InformationCircleIcon className="h-4 w-4 inline ml-1 text-gray-400" title="Multiple of original investment returned first" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={localValues.liquidationMultiple}
                    onChange={(e) => handleValueChange('liquidationMultiple', e.target.value)}
                    className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                  <span className="absolute right-3 top-2 text-gray-500 text-sm">x</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {(round.liquidationPreferenceMultiple || 1) > 1 ? 
                    `${round.liquidationPreferenceMultiple}x preference = $${((round.investmentAmount * (round.liquidationPreferenceMultiple || 1)) / 100000000).toFixed(1)}M minimum return` :
                    'Standard 1x liquidation preference'
                  }
                </p>
              </div>

              {/* Participation Rights */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participation Rights
                  <InformationCircleIcon className="h-4 w-4 inline ml-1 text-gray-400" title="Right to participate in common distribution after preferences" />
                </label>
                <select
                  value={round.participationRights || 'NONE'}
                  onChange={(e) => onChange({ 
                    participationRights: e.target.value as any
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NONE">Non-Participating</option>
                  <option value="FULL">Participating</option>
                  <option value="CAPPED">Participating with Cap</option>
                </select>
              </div>

              {/* Participation Cap */}
              {round.participationRights === 'CAPPED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participation Cap
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localValues.participationCap}
                      onChange={(e) => handleValueChange('participationCap', e.target.value)}
                      className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="3.0"
                      step="0.1"
                      min="1"
                      max="10"
                    />
                    <span className="absolute right-3 top-2 text-gray-500 text-sm">x</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum total return as multiple of investment
                  </p>
                </div>
              )}

              {/* Dividend Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dividend Rate (Annual)
                  <InformationCircleIcon className="h-4 w-4 inline ml-1 text-gray-400" title="Annual dividend rate for preferred shares" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={localValues.dividendRate}
                    onChange={(e) => handleValueChange('dividendRate', e.target.value)}
                    className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8.0"
                    step="0.1"
                    min="0"
                    max="20"
                  />
                  <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                </div>
              </div>

              {/* Seniority Rank */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seniority Rank
                  <InformationCircleIcon className="h-4 w-4 inline ml-1 text-gray-400" title="Higher numbers get paid first in liquidation" />
                </label>
                <input
                  type="number"
                  value={localValues.seniorityRank}
                  onChange={(e) => handleValueChange('seniorityRank', e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                  min="1"
                  max="999"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Higher numbers are more senior (paid first)
                </p>
              </div>
            </div>

            {/* Rights Summary */}
            <div className="pt-6 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Rights Summary</h5>
              <div className="flex flex-wrap gap-2">
                {round.antiDilutionType && round.antiDilutionType !== 'NONE' && (
                  <Badge variant="primary">
                    Anti-Dilution: {round.antiDilutionType.replace('_', ' ')}
                  </Badge>
                )}
                
                {round.liquidationPreferenceMultiple && round.liquidationPreferenceMultiple > 1 && (
                  <Badge variant="warning">
                    {round.liquidationPreferenceMultiple}x Liquidation Preference
                  </Badge>
                )}
                
                {round.participationRights && round.participationRights !== 'NONE' && (
                  <Badge variant="success">
                    {round.participationRights} Participation
                  </Badge>
                )}
                
                {round.dividendRate && round.dividendRate > 0 && (
                  <Badge variant="info">
                    {round.dividendRate}% Dividend
                  </Badge>
                )}
                
                {(!round.antiDilutionType || round.antiDilutionType === 'NONE') && 
                 (!round.participationRights || round.participationRights === 'NONE') &&
                 (!round.liquidationPreferenceMultiple || round.liquidationPreferenceMultiple <= 1) && (
                  <Badge variant="outline">
                    Standard Terms
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'safes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">SAFE Note Conversions</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Configure SAFE notes that will convert in this funding round
                </p>
              </div>
              <Button onClick={addSAFENote} size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add SAFE
              </Button>
            </div>

            {(!round.convertingSAFEs || round.convertingSAFEs.length === 0) ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-4">No SAFE notes to convert</p>
                <Button size="sm" onClick={addSAFENote}>
                  Add First SAFE
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {round.convertingSAFEs.map((safe, index) => (
                  <div key={safe.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium text-gray-900">
                        SAFE #{index + 1} - {safe.investorName}
                      </h5>
                      <button
                        onClick={() => removeSAFENote(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Investment Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Investment Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={(safe.investmentAmount / 100000000).toString()}
                            onChange={(e) => updateSAFENote(index, { 
                              investmentAmount: (parseFloat(e.target.value) || 0) * 100000000 
                            })}
                            className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.5"
                            step="0.1"
                          />
                          <span className="absolute right-3 top-2 text-gray-500 text-sm">M</span>
                        </div>
                      </div>

                      {/* SAFE Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SAFE Type
                        </label>
                        <select
                          value={safe.safeType}
                          onChange={(e) => updateSAFENote(index, { safeType: e.target.value as SAFEType })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={SAFEType.POST_MONEY_VALUATION_CAP}>Post-Money Valuation Cap</option>
                          <option value={SAFEType.PRE_MONEY_VALUATION_CAP}>Pre-Money Valuation Cap</option>
                          <option value={SAFEType.DISCOUNT_ONLY}>Discount Only</option>
                          <option value={SAFEType.MFN_ONLY}>Most Favored Nation Only</option>
                        </select>
                      </div>

                      {/* Valuation Cap */}
                      {(safe.safeType === SAFEType.POST_MONEY_VALUATION_CAP || 
                        safe.safeType === SAFEType.PRE_MONEY_VALUATION_CAP) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valuation Cap
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={safe.valuationCap ? (safe.valuationCap / 100000000).toString() : ''}
                              onChange={(e) => updateSAFENote(index, { 
                                valuationCap: (parseFloat(e.target.value) || 0) * 100000000 
                              })}
                              className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="10"
                              step="1"
                            />
                            <span className="absolute right-3 top-2 text-gray-500 text-sm">M</span>
                          </div>
                        </div>
                      )}

                      {/* Discount Rate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount Rate
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={((safe.discountRate || 0) * 100).toString()}
                            onChange={(e) => updateSAFENote(index, { 
                              discountRate: (parseFloat(e.target.value) || 0) / 100 
                            })}
                            className="w-full pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="20"
                            step="5"
                            min="0"
                            max="50"
                          />
                          <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                    </div>

                    {/* SAFE Rights */}
                    <div className="mt-4 flex items-center space-x-6">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`mfn-${index}`}
                          checked={safe.hasMFN || false}
                          onChange={(e) => updateSAFENote(index, { hasMFN: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`mfn-${index}`} className="ml-2 block text-sm text-gray-700">
                          Most Favored Nation
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`pro-rata-${index}`}
                          checked={safe.hasProRata || false}
                          onChange={(e) => updateSAFENote(index, { hasProRata: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`pro-rata-${index}`} className="ml-2 block text-sm text-gray-700">
                          Pro Rata Rights
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900">Advanced Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Include Conversion */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="include-conversion"
                  checked={round.includeConversion || false}
                  onChange={(e) => onChange({ includeConversion: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="include-conversion" className="ml-2 block text-sm text-gray-700">
                  Include preferred conversion analysis
                </label>
              </div>

              {/* Is Participating */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is-participating"
                  checked={round.isParticipating || false}
                  onChange={(e) => onChange({ isParticipating: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is-participating" className="ml-2 block text-sm text-gray-700">
                  Participating preferred shares
                </label>
              </div>
            </div>

            {/* Advanced Modeling Notes */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Advanced Modeling Notes</h5>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Anti-dilution protection only applies to down rounds (lower valuation than this round)</li>
                <li>• Liquidation preferences are paid in seniority order before common distribution</li>
                <li>• Participating preferred gets both liquidation preference AND pro-rata common distribution</li>
                <li>• SAFE conversions are processed before new equity issuance in this round</li>
                <li>• Most Favored Nation provisions apply retroactively to improve terms</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}