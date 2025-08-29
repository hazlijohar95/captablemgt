import { format, formatDistanceToNow } from 'date-fns';
import { CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { computeVested } from '@/features/cap-table/calc/vesting';

interface VestingEvent {
  date: Date;
  grant: any;
  quantity: number;
  stakeholderName: string;
  previousVested: number;
  schedule: any;
}

interface UpcomingVestingEventsProps {
  events: VestingEvent[];
}

export function UpcomingVestingEvents({ events }: UpcomingVestingEventsProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No upcoming vesting events</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {events.map((event, index) => {
        // Calculate how many shares will vest on this date
        const willVest = computeVested(event.quantity, event.schedule, event.date) - event.previousVested;
        
        return (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">
                    {event.stakeholderName}
                  </p>
                </div>
                <div className="mt-1 flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    {format(event.date, 'MMM d, yyyy')}
                  </p>
                  <span className="text-gray-400">•</span>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(event.date, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-green-600">
                  +{willVest.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">shares vesting</p>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>
                  {event.previousVested.toLocaleString()} / {event.quantity.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(event.previousVested / event.quantity) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}