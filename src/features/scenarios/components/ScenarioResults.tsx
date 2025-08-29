import { ScenarioResultsProps } from '@/types/scenarios';

export function ScenarioResults({ results, scenarios, initialPositions }: ScenarioResultsProps) {
  if (results.length === 0) return null;

  // Create a comprehensive view of all dilution effects
  const finalResult = results[results.length - 1];
  
  // Calculate total dilution from start to finish
  const dilutionSummary = initialPositions.map(initialPos => {
    const finalPos = finalResult.postRound.shareholderPositions.find(
      p => p.name === initialPos.name
    );
    
    const initialPercentage = initialPositions.reduce((sum, p) => sum + p.shares, 0) > 0
      ? (initialPos.shares / initialPositions.reduce((sum, p) => sum + p.shares, 0)) * 100
      : 0;
    
    const finalPercentage = finalPos?.percentage || 0;
    const totalDilution = initialPercentage - finalPercentage;
    
    return {
      name: initialPos.name,
      initialShares: initialPos.shares,
      finalShares: finalPos?.shares || initialPos.shares,
      initialPercentage,
      finalPercentage,
      totalDilution
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Total Shares</div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-bold text-gray-900">
              {finalResult.postRound.totalShares.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              (+{finalResult.postRound.newSharesIssued.toLocaleString()})
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Post-Money Valuation</div>
          <div className="text-2xl font-bold text-gray-900">
            ${(finalResult.postRound.postMoney / 100000000).toFixed(1)}M
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Total Investment</div>
          <div className="text-2xl font-bold text-gray-900">
            ${scenarios.reduce((sum, s) => sum + s.investmentAmount, 0) / 100000000}M
          </div>
        </div>
      </div>

      {/* Detailed Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Dilution Analysis Summary
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stakeholder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Initial Shares
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Shares
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Initial %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Dilution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dilutionSummary
                .sort((a, b) => b.finalPercentage - a.finalPercentage)
                .map((position, index) => {
                  const estimatedValue = (position.finalPercentage / 100) * 
                    (finalResult.postRound.postMoney / 100000000);
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {position.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.initialShares.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.finalShares.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.initialPercentage.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.finalPercentage.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          position.totalDilution > 0 
                            ? 'text-red-600' 
                            : position.totalDilution < 0 
                              ? 'text-green-600' 
                              : 'text-gray-900'
                        }`}>
                          {position.totalDilution > 0 ? '-' : '+'}
                          {Math.abs(position.totalDilution).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${estimatedValue.toFixed(1)}M
                      </td>
                    </tr>
                  );
                })}

              {/* Add new investors */}
              {finalResult.postRound.shareholderPositions
                .filter(pos => pos.id === 'new-investor' || pos.id === 'option-pool')
                .map((pos, index: number) => (
                  <tr key={`new-${index}`} className="hover:bg-gray-50 bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {pos.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pos.shares.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pos.percentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      New
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${((pos.percentage / 100) * (finalResult.postRound.postMoney / 100000000)).toFixed(1)}M
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Round-by-Round Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Round-by-Round Impact
        </h2>
        
        <div className="space-y-4">
          {scenarios.map((scenario, index) => {
            const result = results[index];
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-md font-medium text-gray-900">
                    {scenario.name}
                  </h3>
                  <div className="text-sm text-gray-500">
                    ${(scenario.investmentAmount / 100000000).toFixed(1)}M at 
                    ${(scenario.preMoney / 100000000).toFixed(1)}M pre-money
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">New Shares</div>
                    <div className="font-medium">
                      {result.postRound.newSharesIssued.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Post-Money</div>
                    <div className="font-medium">
                      ${(result.postRound.postMoney / 100000000).toFixed(1)}M
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Investor %</div>
                    <div className="font-medium">
                      {((scenario.investmentAmount / result.postRound.postMoney) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total Shares</div>
                    <div className="font-medium">
                      {result.postRound.totalShares.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}