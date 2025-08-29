import { useState, useEffect } from 'react';
import { 
  CalculatorIcon,
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { capTableService } from '@/services/capTableService';
import { calculateMultipleRounds, ShareholderPosition, RoundScenario, DilutionResult } from '@/features/scenarios/calc/dilution';
import { DilutionChart } from '@/features/scenarios/components/DilutionChart';
import { ScenarioResults } from '@/features/scenarios/components/ScenarioResults';
import { RoundEditor } from '@/features/scenarios/components/RoundEditor';

export function ScenariosPage() {
  const { companyId, hasCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [currentPositions, setCurrentPositions] = useState<ShareholderPosition[]>([]);
  const [scenarios, setScenarios] = useState<RoundScenario[]>([]);
  const [results, setResults] = useState<DilutionResult[]>([]);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number | null>(null);

  useEffect(() => {
    if (hasCompany && companyId) {
      loadCurrentPositions();
    }
  }, [companyId, hasCompany]);

  useEffect(() => {
    if (currentPositions.length > 0 && scenarios.length > 0) {
      const dilutionResults = calculateMultipleRounds(currentPositions, scenarios);
      setResults(dilutionResults);
    } else {
      setResults([]);
    }
  }, [currentPositions, scenarios]);

  const loadCurrentPositions = async () => {
    try {
      setLoading(true);
      
      // Load current cap table using the service method
      const capTableData = await capTableService.getCapTable(companyId);
      
      // Convert to ShareholderPosition format
      const positions: ShareholderPosition[] = capTableData.stakeholders.map(stakeholder => {
        const totalShares = stakeholder.asConverted;
        const hasPreferred = (stakeholder.securities.preferred || 0) > 0;
        
        return {
          id: stakeholder.stakeholderId,
          name: stakeholder.name,
          shares: totalShares,
          shareClass: hasPreferred ? 'PREFERRED' : 'COMMON',
          pricePerShare: 100 // Default $1.00 per share, this would need to come from share class data
        };
      });

      setCurrentPositions(positions);
    } catch (err) {
      console.error('Failed to load positions:', err);
    } finally {
      setLoading(false);
    }
  };

  const addScenario = () => {
    const newScenario: RoundScenario = {
      name: `Series ${String.fromCharCode(65 + scenarios.length)}`,
      preMoney: 10000000000, // $100M in cents
      investmentAmount: 2000000000, // $20M in cents
      pricePerShare: 1000, // $10 in cents
      shareClass: 'PREFERRED',
      optionPoolIncrease: 0,
      includeConversion: false
    };
    
    setScenarios([...scenarios, newScenario]);
    setSelectedScenarioIndex(scenarios.length);
  };

  const updateScenario = (index: number, updates: Partial<RoundScenario>) => {
    const updated = [...scenarios];
    updated[index] = { ...updated[index], ...updates };
    setScenarios(updated);
  };

  const removeScenario = (index: number) => {
    const updated = scenarios.filter((_, i) => i !== index);
    setScenarios(updated);
    
    if (selectedScenarioIndex === index) {
      setSelectedScenarioIndex(null);
    } else if (selectedScenarioIndex !== null && selectedScenarioIndex > index) {
      setSelectedScenarioIndex(selectedScenarioIndex - 1);
    }
  };

  if (!hasCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <CalculatorIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No company selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please create or select a company to model scenarios.
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

  const totalShares = currentPositions.reduce((sum, pos) => sum + pos.shares, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Scenario Modeling</h1>
            <p className="mt-1 text-sm text-gray-500">
              Model dilution impact of future funding rounds
            </p>
          </div>
          <Button
            onClick={addScenario}
            disabled={scenarios.length >= 5}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Round
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Current Cap Table */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Current Cap Table</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Total Shares</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalShares.toLocaleString()}
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {currentPositions.map((pos) => {
                const percentage = totalShares > 0 ? (pos.shares / totalShares) * 100 : 0;
                return (
                  <div key={pos.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{pos.name}</div>
                        <div className="text-xs text-gray-500">{pos.shareClass}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {pos.shares.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scenarios List */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Funding Rounds</h2>
            
            {scenarios.length === 0 ? (
              <div className="text-center py-8">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  No funding rounds modeled yet
                </p>
                <Button
                  size="sm"
                  onClick={addScenario}
                  className="mt-4"
                >
                  Add First Round
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {scenarios.map((scenario, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedScenarioIndex === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedScenarioIndex(index)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {scenario.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ${(scenario.investmentAmount / 100000000).toFixed(1)}M at 
                          ${(scenario.preMoney / 100000000).toFixed(1)}M pre
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeScenario(index);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Round Editor & Results */}
        <div className="lg:col-span-2 space-y-6">
          {selectedScenarioIndex !== null && scenarios[selectedScenarioIndex] && (
            <RoundEditor
              scenario={scenarios[selectedScenarioIndex]}
              onChange={(updates) => updateScenario(selectedScenarioIndex, updates)}
            />
          )}

          {results.length > 0 && (
            <>
              <DilutionChart 
                results={results}
                scenarios={scenarios}
              />
              
              <ScenarioResults
                results={results}
                scenarios={scenarios}
                initialPositions={currentPositions}
              />
            </>
          )}

          {scenarios.length > 0 && results.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <ArrowTrendingDownIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Configure Round Details
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a funding round to configure its parameters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}