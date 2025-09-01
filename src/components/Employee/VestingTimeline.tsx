import React, { useMemo } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { EmployeeVestingSchedule } from '@/types/employeePortal';

interface VestingTimelineProps {
  vestingSchedules: EmployeeVestingSchedule[];
  isLoading?: boolean;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: 'cliff' | 'vesting' | 'milestone' | 'completion';
  title: string;
  description: string;
  shares: number;
  status: 'completed' | 'upcoming' | 'current' | 'overdue';
  scheduleId: string;
}

export const VestingTimeline: React.FC<VestingTimelineProps> = ({
  vestingSchedules,
  isLoading = false
}) => {
  const formatShares = (shares: number): string => {
    return new Intl.NumberFormat('en-US').format(shares);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate timeline events from vesting schedules
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const today = new Date();

    vestingSchedules.forEach(schedule => {
      // Add cliff date if exists
      if (schedule.cliff_date) {
        const cliffDate = new Date(schedule.cliff_date);
        events.push({
          id: `${schedule.id}-cliff`,
          date: schedule.cliff_date,
          type: 'cliff',
          title: 'Cliff Reached',
          description: 'Initial vesting cliff completed',
          shares: 0, // Calculate cliff shares if needed
          status: cliffDate <= today ? 'completed' : 'upcoming',
          scheduleId: schedule.id
        });
      }

      // Add milestone events for milestone-based vesting
      if (schedule.vesting_type === 'MILESTONE_BASED' && schedule.milestones) {
        schedule.milestones.forEach(milestone => {
          const milestoneDate = milestone.completion_date || milestone.target_date;
          if (milestoneDate) {
            let status: TimelineEvent['status'] = 'upcoming';
            
            if (milestone.status === 'COMPLETED') {
              status = 'completed';
            } else if (milestone.status === 'OVERDUE') {
              status = 'overdue';
            } else if (milestone.target_date && new Date(milestone.target_date) <= today) {
              status = 'current';
            }

            events.push({
              id: milestone.id,
              date: milestoneDate,
              type: 'milestone',
              title: milestone.description,
              description: `Milestone: ${milestone.shares_to_vest} shares`,
              shares: milestone.shares_to_vest,
              status,
              scheduleId: schedule.id
            });
          }
        });
      }

      // Add next vesting date for time-based vesting
      if (schedule.vesting_type === 'TIME_BASED' && schedule.next_vesting_date && schedule.next_vesting_amount) {
        const nextVestingDate = new Date(schedule.next_vesting_date);
        events.push({
          id: `${schedule.id}-next`,
          date: schedule.next_vesting_date,
          type: 'vesting',
          title: 'Next Vesting',
          description: `${formatShares(schedule.next_vesting_amount)} shares vest`,
          shares: schedule.next_vesting_amount,
          status: nextVestingDate <= today ? 'current' : 'upcoming',
          scheduleId: schedule.id
        });
      }

      // Add completion date if schedule is near completion
      if (schedule.vesting_end_date && schedule.completion_percentage > 80) {
        events.push({
          id: `${schedule.id}-completion`,
          date: schedule.vesting_end_date,
          type: 'completion',
          title: 'Vesting Complete',
          description: 'All shares fully vested',
          shares: schedule.unvested_shares,
          status: schedule.status === 'COMPLETED' ? 'completed' : 'upcoming',
          scheduleId: schedule.id
        });
      }
    });

    // Sort events by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [vestingSchedules]);

  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'current':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'current':
        return 'border-blue-200 bg-blue-50';
      case 'overdue':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="animate-pulse">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/2 ml-8"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 shadow-sm text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Vesting Events
        </h3>
        <p className="text-gray-600">
          Your vesting schedule is not yet available or you don't have any active vesting grants.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Active Schedules</p>
          <p className="text-xl font-bold text-blue-600">
            {vestingSchedules.filter(s => s.status === 'ACTIVE').length}
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Progress</p>
          <p className="text-xl font-bold text-green-600">
            {Math.round(
              vestingSchedules.reduce((sum, s) => sum + s.completion_percentage, 0) / 
              vestingSchedules.length
            )}%
          </p>
        </div>
      </div>

      {/* Timeline Events */}
      <div className="space-y-3">
        {timelineEvents.map((event, index) => (
          <div
            key={event.id}
            className={`rounded-lg p-4 border ${getStatusColor(event.status)} relative`}
          >
            {/* Timeline connector line */}
            {index < timelineEvents.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-6 bg-gray-200"></div>
            )}
            
            <div className="flex items-start space-x-3">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(event.status)}
              </div>
              
              {/* Event Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {event.title}
                  </h4>
                  <span className="text-sm text-gray-500 flex-shrink-0 ml-2">
                    {formatDate(event.date)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  {event.description}
                </p>
                
                {event.shares > 0 && (
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>
                      {formatShares(event.shares)} shares
                    </span>
                    {event.status === 'current' && (
                      <span className="text-blue-600 font-medium">
                        Action Required
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vesting Schedule Details */}
      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-900">Vesting Schedules</h3>
        
        {vestingSchedules.map(schedule => (
          <div key={schedule.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">
                {schedule.vesting_type.replace('_', ' ')} Vesting
              </h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                schedule.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800'
                  : schedule.status === 'COMPLETED'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {schedule.status}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{schedule.completion_percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${schedule.completion_percentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* Schedule Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Shares</span>
                <p className="font-medium">{formatShares(schedule.total_shares)}</p>
              </div>
              <div>
                <span className="text-gray-600">Vested</span>
                <p className="font-medium text-green-600">{formatShares(schedule.vested_shares)}</p>
              </div>
              <div>
                <span className="text-gray-600">Unvested</span>
                <p className="font-medium text-orange-600">{formatShares(schedule.unvested_shares)}</p>
              </div>
              <div>
                <span className="text-gray-600">Frequency</span>
                <p className="font-medium">{schedule.vesting_frequency}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};