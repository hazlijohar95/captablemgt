import { WaterfallResult } from '../calc/waterfall';

interface ExitScenario {
  name: string;
  value: number;
}

interface WaterfallTableProps {
  result: WaterfallResult;
  allResults: WaterfallResult[];
  scenarios: ExitScenario[];
}

export function WaterfallTable({ result, allResults, scenarios }: WaterfallTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          Detailed Distribution Analysis
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Holder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Security Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shares
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
            {result.distributions
              .filter(d => d.total > 0)
              .sort((a, b) => b.total - a.total)
              .map((distribution) => (
                <tr key={distribution.holderId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {distribution.holderName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {distribution.securityType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {distribution.shares?.toLocaleString() || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {distribution.liquidationPref > 0 
                      ? `$${(distribution.liquidationPref / 100000000).toFixed(2)}M`
                      : '—'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {distribution.participation > 0 
                      ? `$${(distribution.participation / 100000000).toFixed(2)}M`
                      : '—'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {distribution.common > 0 
                      ? `$${(distribution.common / 100000000).toFixed(2)}M`
                      : '—'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      ${(distribution.total / 100000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-gray-500">
                      ${(distribution.impliedSharePrice / 100).toFixed(2)}/share
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {distribution.percentage.toFixed(2)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Multi-scenario comparison if available */}
      {allResults.length > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Scenario Comparison
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Holder
                  </th>
                  {scenarios.map((scenario, index) => (
                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {scenario.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.distributions
                  .filter(d => d.total > 0)
                  .slice(0, 10) // Top 10 for comparison
                  .map(distribution => (
                    <tr key={`comparison-${distribution.holderId}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {distribution.holderName}
                      </td>
                      {allResults.map((scenarioResult, scenarioIndex) => {
                        const scenarioDistribution = scenarioResult.distributions.find(
                          d => d.holderId === distribution.holderId
                        );
                        return (
                          <td key={scenarioIndex} className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ${scenarioDistribution ? (scenarioDistribution.total / 100000000).toFixed(2) : '0.00'}M
                            </div>
                            <div className="text-xs text-gray-500">
                              {scenarioDistribution ? scenarioDistribution.percentage.toFixed(1) : '0.0'}%
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}