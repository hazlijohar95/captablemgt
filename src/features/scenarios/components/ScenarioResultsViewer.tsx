/**
 * Scenario Results Viewer Component
 * Comprehensive display of scenario modeling results with integrated financial analysis
 */

import { useState } from 'react';
import {
  ChartBarIcon,
  TableCellsIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  InformationCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';
import { ComprehensiveScenarioResult, ComprehensiveScenario } from '../types/scenarioModeling';

interface ScenarioResultsViewerProps {
  results: ComprehensiveScenarioResult;
  scenario: ComprehensiveScenario;
}

export function ScenarioResultsViewer({ results, scenario }: ScenarioResultsViewerProps) {
  const [activeView, setActiveView] = useState<'overview' | 'dilution' | 'waterfall' | 'tax'>('overview');

  // Calculate key metrics
  const totalRoundsModeled = results.dilutionResults.length;
  const finalPostMoney = results.summary.finalPostMoneyValuation;
  const totalFunding = results.summary.totalFundingRaised;
  const exitScenarioCount = scenario.exitScenarios.length;

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{scenario.name} - Results</h2>
            <p className="text-sm text-gray-500 mt-1">
              Comprehensive analysis across {totalRoundsModeled} funding rounds and {exitScenarioCount} exit scenarios
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success">Analysis Complete</Badge>
            <Badge variant="info">{totalRoundsModeled} Rounds</Badge>
            <Badge variant="info">{exitScenarioCount} Exits</Badge>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="text-sm text-blue-600 font-medium">Total Funding</div>
                <div className="text-xl font-bold text-blue-900">
                  ${(totalFunding / 100000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <DocumentChartBarIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-sm text-green-600 font-medium">Post-Money Val.</div>
                <div className="text-xl font-bold text-green-900">
                  ${(finalPostMoney / 100000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <div className="text-sm text-purple-600 font-medium">Total Shares</div>
                <div className="text-xl font-bold text-purple-900">
                  {results.summary.totalShares.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <TableCellsIcon className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <div className="text-sm text-orange-600 font-medium">Stakeholders</div>
                <div className="text-xl font-bold text-orange-900">
                  {results.summary.finalOwnershipDistribution.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Navigation */}
      <div className="bg-white rounded-lg shadow">
        <nav className="flex space-x-8 px-6 pt-4">
          {[
            { key: 'overview', label: 'Overview', icon: DocumentChartBarIcon },
            { key: 'dilution', label: 'Dilution Analysis', icon: ChartBarIcon },
            { key: 'waterfall', label: 'Waterfall Results', icon: CurrencyDollarIcon },
            { key: 'tax', label: 'Tax Analysis', icon: TableCellsIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          {activeView === 'overview' && (
            <OwnershipOverview results={results} scenario={scenario} />
          )}
          
          {activeView === 'dilution' && (
            <DilutionAnalysis results={results} scenario={scenario} />
          )}
          
          {activeView === 'waterfall' && (
            <WaterfallAnalysis results={results} scenario={scenario} />
          )}
          
          {activeView === 'tax' && (
            <TaxAnalysis results={results} scenario={scenario} />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview sub-component
function OwnershipOverview({ results, scenario }: { results: ComprehensiveScenarioResult; scenario: ComprehensiveScenario }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Final Ownership Distribution</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          {/* Ownership Chart Visual */}
          <div className="flex h-8 bg-gray-200 rounded mb-4">
            {results.summary.finalOwnershipDistribution
              .sort((a, b) => b.finalOwnershipPercentage - a.finalOwnershipPercentage)
              .map((holder, index) => {
                const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];
                const color = colors[index % colors.length];
                return (
                  <div
                    key={holder.stakeholderId}
                    style={{ 
                      width: `${holder.finalOwnershipPercentage}%`, 
                      backgroundColor: color 
                    }}
                    className="h-full flex items-center justify-center text-xs text-white font-medium first:rounded-l last:rounded-r"
                    title={`${holder.stakeholderName}: ${holder.finalOwnershipPercentage.toFixed(1)}%`}
                  >
                    {holder.finalOwnershipPercentage > 8 && 
                      holder.finalOwnershipPercentage.toFixed(1) + '%'
                    }
                  </div>
                );
              })}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {results.summary.finalOwnershipDistribution
              .sort((a, b) => b.finalOwnershipPercentage - a.finalOwnershipPercentage)
              .slice(0, 6)
              .map((holder, index) => {
                const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];
                const color = colors[index % colors.length];
                return (
                  <div key={holder.stakeholderId} className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-gray-700">{holder.stakeholderName}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Ownership Table */}
      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stakeholder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Final Ownership
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Dilution
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Est. Value @ Exit
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.summary.finalOwnershipDistribution
              .sort((a, b) => b.finalOwnershipPercentage - a.finalOwnershipPercentage)
              .map((holder) => (
                <tr key={holder.stakeholderId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {holder.stakeholderName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {holder.finalOwnershipPercentage.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center text-sm font-medium ${
                      holder.totalDilution > 0 ? 'text-red-600' : 
                      holder.totalDilution < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {holder.totalDilution > 0 ? (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      ) : holder.totalDilution < 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : null}
                      {Math.abs(holder.totalDilution).toFixed(2)}pp
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(holder.estimatedValue / 100000000).toFixed(1)}M
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Dilution Analysis sub-component
function DilutionAnalysis({ results, scenario }: { results: ComprehensiveScenarioResult; scenario: ComprehensiveScenario }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Round-by-Round Dilution Impact</h3>
        
        {results.dilutionResults.map((result, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">{scenario.fundingRounds[index]?.name || `Round ${index + 1}`}</h4>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>${(scenario.fundingRounds[index]?.investmentAmount / 100000000).toFixed(1)}M raised</span>
                <span>{result.postRound.newSharesIssued.toLocaleString()} new shares</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 font-medium">Pre-Round Shares</div>
                <div className="text-lg font-semibold text-blue-900">
                  {result.preRound.totalShares.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 font-medium">Post-Round Shares</div>
                <div className="text-lg font-semibold text-green-900">
                  {result.postRound.totalShares.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xs text-purple-600 font-medium">Post-Money Value</div>
                <div className="text-lg font-semibold text-purple-900">
                  ${(result.postRound.postMoney / 100000000).toFixed(1)}M
                </div>
              </div>
            </div>

            {/* Anti-dilution adjustments if any */}
            {results.antiDilutionResults[index] && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <div className="text-sm text-yellow-800">
                    <strong>Anti-dilution adjustment applied:</strong> {(results.antiDilutionResults[index].adjustmentFactor * 100 - 100).toFixed(1)}% protection
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Waterfall Analysis sub-component  
function WaterfallAnalysis({ results, scenario }: { results: ComprehensiveScenarioResult; scenario: ComprehensiveScenario }) {
  const [selectedExitIndex, setSelectedExitIndex] = useState(0);
  
  if (results.waterfallResults.length === 0) {
    return <div className="text-center text-gray-500 py-8">No waterfall results available</div>;
  }

  const selectedResult = results.waterfallResults[selectedExitIndex];
  const selectedExit = scenario.exitScenarios[selectedExitIndex];

  return (
    <div className="space-y-6">
      {/* Exit Scenario Selector */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Exit Scenario Analysis</h3>
        <div className="flex space-x-2 mb-6">
          {scenario.exitScenarios.map((exit, index) => (
            <button
              key={exit.id}
              onClick={() => setSelectedExitIndex(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedExitIndex === index
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {exit.name}
              <div className="text-xs opacity-75">
                ${(exit.exitValue / 100000000).toFixed(0)}M
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Waterfall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Exit Value</div>
          <div className="text-xl font-bold text-gray-900">
            ${(selectedResult.exitValue / 100000000).toFixed(0)}M
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-xs text-orange-600 uppercase tracking-wide">Liquidation Pref</div>
          <div className="text-xl font-bold text-orange-900">
            ${(selectedResult.summary.totalLiquidationPreference / 100000000).toFixed(1)}M
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase tracking-wide">Participation</div>
          <div className="text-xl font-bold text-blue-900">
            ${(selectedResult.summary.totalParticipation / 100000000).toFixed(1)}M
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase tracking-wide">Common</div>
          <div className="text-xl font-bold text-green-900">
            ${(selectedResult.summary.totalCommon / 100000000).toFixed(1)}M
          </div>
        </div>
      </div>

      {/* Waterfall Distribution */}
      <div className="overflow-hidden">
        <h4 className="font-medium text-gray-900 mb-3">Distribution Details</h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Holder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Liquidation Pref
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Common
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Payout
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                % of Exit
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {selectedResult.distributions
              .filter(d => d.total > 0)
              .slice(0, 10)
              .map((distribution) => (
                <tr key={distribution.holderId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {distribution.holderName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {distribution.securityType}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(distribution.liquidationPref / 100000000).toFixed(2)}M
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(distribution.participation / 100000000).toFixed(2)}M
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(distribution.common / 100000000).toFixed(2)}M
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${(distribution.total / 100000000).toFixed(2)}M
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {distribution.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Tax Analysis sub-component
function TaxAnalysis({ results }: { results: ComprehensiveScenarioResult; scenario: ComprehensiveScenario }) {
  if (results.taxAnalysis.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="text-lg font-medium mb-2">Tax Analysis Not Available</div>
        <p className="text-sm">
          Tax analysis requires detailed grant information for stakeholders with equity compensation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Impact Analysis</h3>
        <p className="text-sm text-gray-500 mb-6">
          Estimated tax implications for stakeholders with equity compensation
        </p>
      </div>

      <div className="space-y-4">
        {results.taxAnalysis.map((analysis) => (
          <div key={analysis.stakeholderId} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">{analysis.stakeholderName}</h4>
              <Badge variant={
                analysis.effectiveRate > 0.5 ? 'error' :
                analysis.effectiveRate > 0.3 ? 'warning' :
                'success'
              }>
                {(analysis.effectiveRate * 100).toFixed(1)}% effective rate
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-600 font-medium">Total Tax Liability</div>
                <div className="text-lg font-semibold text-red-900">
                  ${(analysis.totalTaxLiability / 100000000).toFixed(2)}M
                </div>
              </div>
              
              {analysis.amtExposure && (
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="text-xs text-yellow-600 font-medium">AMT Exposure</div>
                  <div className="text-lg font-semibold text-yellow-900">
                    ${(analysis.amtExposure / 100000000).toFixed(2)}M
                  </div>
                </div>
              )}
            </div>

            {/* Tax Optimization Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-900 mb-2">
                  Tax Optimization Recommendations
                </h5>
                <ul className="text-xs text-blue-800 space-y-1">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}