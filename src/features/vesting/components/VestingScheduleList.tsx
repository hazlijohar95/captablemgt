import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { computeVested, computeUnvested, getNextVestingDate } from '@/features/cap-table/calc/vesting';
import { VestingFrequency } from '@/types';

interface Grant {
  id: string;
  quantity: number;
  issued_at: string;
  securities?: {
    type: string;
    stakeholders?: {
      type: string;
      entity_name?: string;
      people?: {
        name: string;
        email: string;
      };
    };
  };
  vesting_schedules?: {
    id: string;
    start_date: string;
    cliff_months: number;
    duration_months: number;
    frequency: string;
  };
}

interface VestingScheduleListProps {
  grants: Grant[];
}

export function VestingScheduleList({ grants }: VestingScheduleListProps) {
  const [expandedGrants, setExpandedGrants] = useState<Set<string>>(new Set());

  const toggleExpanded = (grantId: string) => {
    const newExpanded = new Set(expandedGrants);
    if (newExpanded.has(grantId)) {
      newExpanded.delete(grantId);
    } else {
      newExpanded.add(grantId);
    }
    setExpandedGrants(newExpanded);
  };

  const getStakeholderName = (grant: Grant) => {
    return grant.securities?.stakeholders?.people?.name || 
           grant.securities?.stakeholders?.entity_name || 
           'Unknown Stakeholder';
  };

  const getStakeholderEmail = (grant: Grant) => {
    return grant.securities?.stakeholders?.people?.email || '';
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'MONTHLY':
        return 'Monthly';
      case 'QUARTERLY':
        return 'Quarterly';
      case 'ANNUALLY':
        return 'Annually';
      default:
        return frequency;
    }
  };

  const activeGrants = grants.filter(g => g.vesting_schedules);

  if (activeGrants.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No active vesting schedules
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stakeholder
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Grant Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Granted
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vested
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unvested
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Progress
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Next Vesting
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {activeGrants.map((grant) => {
            if (!grant.vesting_schedules) return null;

            const schedule = {
              start: grant.vesting_schedules.start_date,
              cliffMonths: grant.vesting_schedules.cliff_months,
              durationMonths: grant.vesting_schedules.duration_months,
              frequency: grant.vesting_schedules.frequency as VestingFrequency
            };

            const today = new Date();
            const vested = computeVested(grant.quantity, schedule, today);
            const unvested = computeUnvested(grant.quantity, schedule, today);
            const nextVestingDate = getNextVestingDate(schedule, today);
            const vestedPercentage = (vested / grant.quantity) * 100;
            const isExpanded = expandedGrants.has(grant.id);

            return (
              <React.Fragment key={grant.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleExpanded(grant.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getStakeholderName(grant)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getStakeholderEmail(grant)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {grant.securities?.type || 'OPTION'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {grant.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {vested.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                    {unvested.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${vestedPercentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="ml-2 text-xs text-gray-600">
                        {Math.round(vestedPercentage)}%
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {nextVestingDate ? (
                      <div>
                        <div>{format(nextVestingDate, 'MMM d, yyyy')}</div>
                        <div className="text-xs text-gray-400">
                          {Math.ceil((nextVestingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </div>
                    ) : (
                      <span className="text-green-600">Fully vested</span>
                    )}
                  </td>
                </tr>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase">Start Date</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {format(new Date(grant.vesting_schedules.start_date), 'MMM d, yyyy')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase">Cliff</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {grant.vesting_schedules.cliff_months} months
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase">Duration</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {grant.vesting_schedules.duration_months} months
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase">Frequency</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {getFrequencyLabel(grant.vesting_schedules.frequency)}
                          </dd>
                        </div>
                      </div>
                      
                      {/* Vesting Schedule Details */}
                      <div className="mt-4">
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Vesting Schedule</h4>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="text-sm text-gray-600">
                            {grant.vesting_schedules.cliff_months > 0 && (
                              <p>• {Math.round((grant.vesting_schedules.cliff_months / grant.vesting_schedules.duration_months) * grant.quantity).toLocaleString()} shares vest after {grant.vesting_schedules.cliff_months} month cliff</p>
                            )}
                            <p>• Remaining shares vest {getFrequencyLabel(grant.vesting_schedules.frequency).toLowerCase()} over {grant.vesting_schedules.duration_months} months</p>
                            <p>• Grant issued on {format(new Date(grant.issued_at), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}