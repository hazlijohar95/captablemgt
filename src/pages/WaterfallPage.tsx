import { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { capTableService } from '@/services/capTableService';
import { calculateWaterfall, calculateWaterfallScenarios, SecurityHolder, WaterfallResult } from '@/features/waterfall/calc/waterfall';
import { WaterfallChart } from '@/features/waterfall/components/WaterfallChart';
import { WaterfallTable } from '@/features/waterfall/components/WaterfallTable';
import { ExitScenarioEditor } from '@/features/waterfall/components/ExitScenarioEditor';

interface ExitScenario {
  name: string;
  value: number; // in cents
}

export function WaterfallPage() {
  const { companyId, hasCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [securityHolders, setSecurityHolders] = useState<SecurityHolder[]>([]);
  const [exitScenarios, setExitScenarios] = useState<ExitScenario[]>([
    { name: '1x Liquidation Pref', value: 5000000000 }, // $50M
    { name: '2x Return', value: 10000000000 }, // $100M
    { name: '5x Return', value: 25000000000 }, // $250M
    { name: '10x Return', value: 50000000000 }, // $500M
  ]);
  const [selectedScenario, setSelectedScenario] = useState<ExitScenario>(exitScenarios[1]);
  const [convertToCommon, setConvertToCommon] = useState(false);
  const [waterfallResult, setWaterfallResult] = useState<WaterfallResult | null>(null);
  const [allResults, setAllResults] = useState<WaterfallResult[]>([]);

  useEffect(() => {
    if (hasCompany && companyId) {
      loadSecurityHolders();
    }
  }, [companyId, hasCompany]);

  useEffect(() => {
    if (securityHolders.length > 0) {
      // Calculate waterfall for selected scenario
      const result = calculateWaterfall(securityHolders, selectedScenario.value, convertToCommon);
      setWaterfallResult(result);

      // Calculate all scenarios for comparison
      const allResults = calculateWaterfallScenarios(
        securityHolders, 
        exitScenarios.map(s => s.value), 
        convertToCommon
      );
      setAllResults(allResults);
    }
  }, [securityHolders, selectedScenario, convertToCommon, exitScenarios]);

  const loadSecurityHolders = async () => {
    try {
      setLoading(true);
      
      // Load current cap table using the service method
      const capTableData = await capTableService.getCapTable(companyId);
      
      // Transform to SecurityHolder format
      const holders: SecurityHolder[] = [];
      
      capTableData.stakeholders.forEach(stakeholder => {
        // Create holders for each security type they own
        const securities = stakeholder.securities;
        
        // Common shares
        const commonShares = securities.common || 0;
        if (commonShares > 0) {
          holders.push({
            id: `${stakeholder.stakeholderId}-COMMON`,
            name: stakeholder.name,
            securityType: 'COMMON',
            shares: commonShares,
          });
        }
        
        // Preferred shares (simplified - assume Series A)
        const preferredShares = securities.preferred || 0;
        if (preferredShares > 0) {
          holders.push({
            id: `${stakeholder.stakeholderId}-PREFERRED_A`,
            name: stakeholder.name,
            securityType: 'PREFERRED_A',
            shares: preferredShares,
            liquidationPreference: 1, // 1x preference
            liquidationAmount: preferredShares * 100, // Estimate $1.00 per share
            participation: 'FULL',
            seniority: 100
          });
        }
        
        // Options
        const optionShares = securities.options || 0;
        if (optionShares > 0) {
          holders.push({
            id: `${stakeholder.stakeholderId}-OPTION`,
            name: stakeholder.name,
            securityType: 'OPTION',
            shares: optionShares,
            strikePrice: 50 // Default $0.50 strike price
          });
        }
        
        // Warrants
        const warrantShares = securities.warrants || 0;
        if (warrantShares > 0) {
          holders.push({
            id: `${stakeholder.stakeholderId}-WARRANT`,
            name: stakeholder.name,
            securityType: 'WARRANT',
            shares: warrantShares,
            strikePrice: 100 // Default $1.00 strike price
          });
        }
      });

      setSecurityHolders(holders);
    } catch (err) {
      console.error('Failed to load security holders:', err);
    } finally {
      setLoading(false);
    }
  };

  const addExitScenario = () => {
    const newScenario: ExitScenario = {
      name: `Scenario ${exitScenarios.length + 1}`,
      value: 10000000000 // $100M default
    };
    setExitScenarios([...exitScenarios, newScenario]);
  };

  const updateExitScenario = (index: number, updates: Partial<ExitScenario>) => {
    const updated = [...exitScenarios];
    updated[index] = { ...updated[index], ...updates };
    setExitScenarios(updated);
  };

  const removeExitScenario = (index: number) => {
    if (exitScenarios.length <= 1) return; // Keep at least one
    
    const updated = exitScenarios.filter((_, i) => i !== index);
    setExitScenarios(updated);
    
    // Update selected scenario if it was removed
    if (selectedScenario === exitScenarios[index]) {
      setSelectedScenario(updated[0]);
    }
  };

  if (!hasCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No company selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please create or select a company to analyze waterfall distributions.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Waterfall Analysis</h1>
            <p className="mt-1 text-sm text-gray-500">
              Model liquidity distributions with liquidation preferences and participation rights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="convert-to-common"
                checked={convertToCommon}
                onChange={(e) => setConvertToCommon(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="convert-to-common" className="ml-2 text-sm text-gray-700">
                Convert all to common
              </label>
            </div>
            <Button onClick={addExitScenario}>
              Add Scenario
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel: Exit Scenarios & Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Exit Scenarios */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Exit Scenarios</h2>
            
            <div className="space-y-2">
              {exitScenarios.map((scenario, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedScenario === scenario
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedScenario(scenario)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {scenario.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ${(scenario.value / 100000000).toFixed(0)}M
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedScenario === scenario && (
                        <TrophyIcon className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Holders Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Securities</h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {securityHolders.map((holder) => (
                <div key={holder.id} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-900">{holder.name}</span>
                    <span className="text-gray-500">{holder.shares.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {holder.securityType}
                    {holder.liquidationPreference && 
                      ` • ${holder.liquidationPreference}x pref`
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-3 space-y-6">
          {/* Selected Scenario Editor */}
          <ExitScenarioEditor
            scenario={selectedScenario}
            scenarios={exitScenarios}
            onUpdate={(updates) => {
              const index = exitScenarios.indexOf(selectedScenario);
              updateExitScenario(index, updates);
            }}
            onDelete={() => {
              const index = exitScenarios.indexOf(selectedScenario);
              removeExitScenario(index);
            }}
          />

          {/* Summary Cards */}
          {waterfallResult && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Exit Value</div>
                <div className="text-xl font-bold text-gray-900">
                  ${(waterfallResult.exitValue / 100000000).toFixed(0)}M
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Liquidation Pref</div>
                <div className="text-xl font-bold text-orange-600">
                  ${(waterfallResult.summary.totalLiquidationPreference / 100000000).toFixed(1)}M
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Participation</div>
                <div className="text-xl font-bold text-blue-600">
                  ${(waterfallResult.summary.totalParticipation / 100000000).toFixed(1)}M
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Common</div>
                <div className="text-xl font-bold text-green-600">
                  ${(waterfallResult.summary.totalCommon / 100000000).toFixed(1)}M
                </div>
              </div>
            </div>
          )}

          {/* Waterfall Chart */}
          {waterfallResult && (
            <WaterfallChart result={waterfallResult} />
          )}

          {/* Detailed Results Table */}
          {waterfallResult && (
            <WaterfallTable 
              result={waterfallResult}
              allResults={allResults}
              scenarios={exitScenarios}
            />
          )}

          {/* Empty State */}
          {securityHolders.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No securities found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Issue securities to stakeholders to see waterfall analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}