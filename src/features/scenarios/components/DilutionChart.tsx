import { DilutionChartProps } from '@/types/scenarios';

export function DilutionChart({ results, scenarios }: DilutionChartProps) {
  if (results.length === 0) return null;

  // Get all unique stakeholders across all rounds
  const allStakeholders = new Set<string>();
  results.forEach(result => {
    result.postRound.shareholderPositions.forEach(pos => {
      allStakeholders.add(pos.id);
    });
  });

  // Color palette for stakeholders
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ];

  const stakeholderColors = new Map(
    Array.from(allStakeholders).map((id, index) => [
      id, colors[index % colors.length]
    ])
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Ownership Dilution</h2>
      
      <div className="space-y-4">
        {/* Chart Header */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="w-32">Round</div>
          <div className="flex-1">Ownership Distribution</div>
          <div className="w-24 text-right">Total Shares</div>
        </div>

        {/* Pre-round */}
        <div className="flex items-center space-x-4">
          <div className="w-32 text-sm font-medium text-gray-700">
            Current
          </div>
          <div className="flex-1">
            <div className="flex h-8 bg-gray-200 rounded">
              {results[0].preRound.shareholderPositions.map(pos => {
                const width = pos.percentage;
                const color = stakeholderColors.get(pos.id);
                return (
                  <div
                    key={pos.id}
                    className="h-full flex items-center justify-center text-xs text-white font-medium first:rounded-l last:rounded-r"
                    style={{ 
                      width: `${width}%`, 
                      backgroundColor: color,
                      minWidth: width > 5 ? 'auto' : '2px'
                    }}
                    title={`${pos.name}: ${pos.percentage.toFixed(1)}%`}
                  >
                    {width > 10 && pos.percentage.toFixed(1)}%
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-24 text-sm text-right">
            {results[0].preRound.totalShares.toLocaleString()}
          </div>
        </div>

        {/* Post-round for each scenario */}
        {results.map((result, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className="w-32 text-sm font-medium text-gray-700">
              After {scenarios[index].name}
            </div>
            <div className="flex-1">
              <div className="flex h-8 bg-gray-200 rounded">
                {result.postRound.shareholderPositions.map(pos => {
                  const width = pos.percentage;
                  const color = stakeholderColors.get(pos.id);
                  return (
                    <div
                      key={pos.id}
                      className="h-full flex items-center justify-center text-xs text-white font-medium first:rounded-l last:rounded-r"
                      style={{ 
                        width: `${width}%`, 
                        backgroundColor: color,
                        minWidth: width > 5 ? 'auto' : '2px'
                      }}
                      title={`${pos.name}: ${pos.percentage.toFixed(1)}% (${pos.dilution > 0 ? '-' : '+'}${Math.abs(pos.dilution).toFixed(1)}%)`}
                    >
                      {width > 10 && pos.percentage.toFixed(1)}%
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="w-24 text-sm text-right">
              {result.postRound.totalShares.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-3">
          {Array.from(allStakeholders).map(stakeholderId => {
            // Get the name from the latest result
            const latestResult = results[results.length - 1];
            const position = latestResult.postRound.shareholderPositions.find(
              p => p.id === stakeholderId
            );
            const name = position?.name || stakeholderId;
            const color = stakeholderColors.get(stakeholderId);
            
            return (
              <div key={stakeholderId} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-700">{name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}