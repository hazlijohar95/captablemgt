import { WaterfallResult } from '../calc/waterfall';

interface WaterfallChartProps {
  result: WaterfallResult;
}

export function WaterfallChart({ result }: WaterfallChartProps) {
  const maxPayout = Math.max(...result.distributions.map(d => d.total));
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Distribution Breakdown</h2>
      
      <div className="space-y-3">
        {result.distributions
          .filter(d => d.total > 0)
          .slice(0, 10) // Show top 10
          .map((distribution) => (
            <div key={distribution.holderId} className="flex items-center space-x-4">
              <div className="w-32">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {distribution.holderName}
                </div>
                <div className="text-xs text-gray-500">
                  {distribution.securityType}
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex h-6 bg-gray-100 rounded overflow-hidden">
                  {/* Liquidation Preference */}
                  {distribution.liquidationPref > 0 && (
                    <div
                      className="bg-orange-400 h-full flex items-center justify-center"
                      style={{ 
                        width: `${(distribution.liquidationPref / maxPayout) * 100}%`,
                        minWidth: '2px'
                      }}
                      title={`Liquidation Preference: $${(distribution.liquidationPref / 100000000).toFixed(2)}M`}
                    />
                  )}
                  
                  {/* Participation */}
                  {distribution.participation > 0 && (
                    <div
                      className="bg-blue-400 h-full flex items-center justify-center"
                      style={{ 
                        width: `${(distribution.participation / maxPayout) * 100}%`,
                        minWidth: '2px'
                      }}
                      title={`Participation: $${(distribution.participation / 100000000).toFixed(2)}M`}
                    />
                  )}
                  
                  {/* Common */}
                  {distribution.common > 0 && (
                    <div
                      className="bg-green-400 h-full flex items-center justify-center"
                      style={{ 
                        width: `${(distribution.common / maxPayout) * 100}%`,
                        minWidth: '2px'
                      }}
                      title={`Common: $${(distribution.common / 100000000).toFixed(2)}M`}
                    />
                  )}
                </div>
                
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{distribution.percentage.toFixed(1)}% of exit</span>
                  <span>${(distribution.total / 100000000).toFixed(2)}M</span>
                </div>
              </div>
              
              <div className="w-20 text-right">
                <div className="text-sm font-semibold text-gray-900">
                  ${(distribution.total / 100000000).toFixed(2)}M
                </div>
                <div className="text-xs text-gray-500">
                  ${(distribution.impliedSharePrice / 100).toFixed(2)}/share
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-400 rounded" />
            <span>Liquidation Preference</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-400 rounded" />
            <span>Participation Rights</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-400 rounded" />
            <span>Common Distribution</span>
          </div>
        </div>
      </div>
    </div>
  );
}