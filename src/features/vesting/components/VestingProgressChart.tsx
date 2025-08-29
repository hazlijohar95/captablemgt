interface VestingProgressChartProps {
  totalGranted: number;
  totalVested: number;
  totalUnvested: number;
}

export function VestingProgressChart({ 
  totalGranted, 
  totalVested, 
  totalUnvested 
}: VestingProgressChartProps) {
  const vestedPercentage = totalGranted > 0 ? (totalVested / totalGranted) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
              Vested
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-green-600">
              {vestedPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200">
          <div 
            style={{ width: `${vestedPercentage}%` }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {totalGranted.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 uppercase">Total Granted</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {totalVested.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 uppercase">Vested</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-600">
            {totalUnvested.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 uppercase">Unvested</div>
        </div>
      </div>

      {/* Pie Chart Visualization */}
      <div className="flex justify-center">
        <div className="relative w-48 h-48">
          <svg className="w-48 h-48 transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke="currentColor"
              strokeWidth="24"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke="currentColor"
              strokeWidth="24"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 80}`}
              strokeDashoffset={`${2 * Math.PI * 80 * (1 - vestedPercentage / 100)}`}
              className="text-green-500 transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {Math.round(vestedPercentage)}%
              </div>
              <div className="text-xs text-gray-500 uppercase">Vested</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}