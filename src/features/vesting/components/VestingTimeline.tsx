import { useMemo } from 'react';
import { format, addMonths, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { generateVestingSchedule } from '@/features/cap-table/calc/vesting';
import { VestingFrequency } from '@/types';

interface Grant {
  id: string;
  quantity: number;
  securities?: {
    stakeholders?: {
      people?: {
        name: string;
      };
      entity_name?: string;
    };
  };
  vesting_schedules?: {
    start_date: string;
    cliff_months: number;
    duration_months: number;
    frequency: string;
  };
}

interface VestingTimelineProps {
  grants: Grant[];
}

export function VestingTimeline({ grants }: VestingTimelineProps) {
  const timelineData = useMemo(() => {
    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = addMonths(startDate, 24); // Show next 24 months
    
    // Generate month labels
    const months: Date[] = [];
    let currentMonth = startDate;
    while (currentMonth <= endDate) {
      months.push(currentMonth);
      currentMonth = addMonths(currentMonth, 1);
    }

    // Calculate vesting events for each month
    const monthlyData = months.map(month => {
      let totalVesting = 0;
      const events: any[] = [];

      grants.forEach(grant => {
        if (!grant.vesting_schedules) return;

        const schedule = {
          start: grant.vesting_schedules.start_date,
          cliffMonths: grant.vesting_schedules.cliff_months,
          durationMonths: grant.vesting_schedules.duration_months,
          frequency: grant.vesting_schedules.frequency as VestingFrequency
        };

        const vestingEvents = generateVestingSchedule(grant.quantity, schedule);
        
        vestingEvents.forEach(event => {
          if (isWithinInterval(event.date, { 
            start: startOfMonth(month), 
            end: endOfMonth(month) 
          })) {
            totalVesting += event.vestedUnits;
            events.push({
              ...event,
              grantId: grant.id,
              stakeholderName: grant.securities?.stakeholders?.people?.name || 
                             grant.securities?.stakeholders?.entity_name || 
                             'Unknown'
            });
          }
        });
      });

      return {
        month,
        totalVesting,
        events
      };
    });

    return monthlyData;
  }, [grants]);

  const maxVesting = Math.max(...timelineData.map(d => d.totalVesting));

  if (grants.filter(g => g.vesting_schedules).length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No vesting schedules to display
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">24-Month Vesting Timeline</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Vesting Events</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Chart Bars */}
          <div className="relative h-64 mb-4">
            <div className="absolute inset-0 flex items-end space-x-1">
              {timelineData.map((data, index) => {
                const isCurrentMonth = index === 0;
                const barHeight = maxVesting > 0 ? (data.totalVesting / maxVesting) * 100 : 0;
                
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center justify-end group relative"
                  >
                    {/* Tooltip */}
                    {data.totalVesting > 0 && (
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                          <div className="font-semibold">
                            {data.totalVesting.toLocaleString()} shares
                          </div>
                          <div className="text-gray-300">
                            {format(data.month, 'MMM yyyy')}
                          </div>
                          {data.events.slice(0, 3).map((event: any, i: number) => (
                            <div key={i} className="text-gray-300 mt-1">
                              • {event.stakeholderName}: {event.vestedUnits.toLocaleString()}
                            </div>
                          ))}
                          {data.events.length > 3 && (
                            <div className="text-gray-400 mt-1">
                              +{data.events.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isCurrentMonth 
                          ? 'bg-gray-400' 
                          : data.totalVesting > 0 
                            ? 'bg-blue-500 hover:bg-blue-600' 
                            : 'bg-gray-200'
                      }`}
                      style={{ height: `${barHeight}%`, minHeight: data.totalVesting > 0 ? '4px' : '0' }}
                    />
                    
                    {/* Value label */}
                    {data.totalVesting > 0 && (
                      <div className="absolute -top-6 text-xs text-gray-600 font-medium">
                        {data.totalVesting > 1000 
                          ? `${(data.totalVesting / 1000).toFixed(1)}k`
                          : data.totalVesting
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="border-t border-gray-200 opacity-50" />
              ))}
            </div>
          </div>

          {/* Month labels */}
          <div className="flex space-x-1">
            {timelineData.map((data, index) => (
              <div
                key={index}
                className="flex-1 text-center"
              >
                <div className="text-xs text-gray-500">
                  {format(data.month, 'MMM')}
                </div>
                {index % 3 === 0 && (
                  <div className="text-xs text-gray-400">
                    {format(data.month, 'yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">Next 3 Months</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {timelineData.slice(0, 3).reduce((sum, d) => sum + d.totalVesting, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">shares vesting</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">Next 12 Months</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {timelineData.slice(0, 12).reduce((sum, d) => sum + d.totalVesting, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">shares vesting</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">Peak Month</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {maxVesting.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            {timelineData.find(d => d.totalVesting === maxVesting) && 
              format(timelineData.find(d => d.totalVesting === maxVesting)!.month, 'MMM yyyy')
            }
          </div>
        </div>
      </div>
    </div>
  );
}