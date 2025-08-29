import { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ChartBarIcon, 
  ClockIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { StatCard } from '@/components/ui';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { capTableService } from '@/services/capTableService';
import { VestingScheduleList } from '@/features/vesting/components/VestingScheduleList';
import { VestingTimeline } from '@/features/vesting/components/VestingTimeline';
import { UpcomingVestingEvents } from '@/features/vesting/components/UpcomingVestingEvents';
import { VestingProgressChart } from '@/features/vesting/components/VestingProgressChart';
import { computeVested, computeUnvested, getNextVestingDate } from '@/features/cap-table/calc/vesting';
import { isAfter } from 'date-fns';
import { VestingFrequency } from '@/types';

interface VestingData {
  grants: any[];
  schedules: any[];
  totalGranted: number;
  totalVested: number;
  totalUnvested: number;
  upcomingEvents: any[];
}

export function VestingDashboard() {
  const { companyId, hasCompany } = useCompanyContext();
  const [vestingData, setVestingData] = useState<VestingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'schedules' | 'timeline'>('overview');

  useEffect(() => {
    if (hasCompany && companyId) {
      loadVestingData();
    }
  }, [companyId, hasCompany]);

  const loadVestingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all grants and vesting schedules
      // We need to access the Supabase client directly
      const supabase = (capTableService as any).client;
      const { data: grants, error: grantsError } = await supabase
        .from('grants')
        .select(`
          *,
          securities!inner (
            *,
            company_id,
            stakeholders (
              *,
              people (*)
            )
          ),
          vesting_schedules (*)
        `)
        .eq('securities.company_id', companyId);

      if (grantsError) throw grantsError;

      // Calculate vesting statistics
      const today = new Date();
      let totalGranted = 0;
      let totalVested = 0;
      let totalUnvested = 0;
      const upcomingEvents: any[] = [];

      if (grants) {
        grants.forEach((grant: any) => {
          if (!grant.vesting_schedules) return;

          const schedule = {
            start: grant.vesting_schedules.start_date,
            cliffMonths: grant.vesting_schedules.cliff_months,
            durationMonths: grant.vesting_schedules.duration_months,
            frequency: grant.vesting_schedules.frequency as VestingFrequency
          };

          const vested = computeVested(grant.quantity, schedule, today);
          const unvested = computeUnvested(grant.quantity, schedule, today);
          
          totalGranted += grant.quantity;
          totalVested += vested;
          totalUnvested += unvested;

          // Get next vesting date
          const nextDate = getNextVestingDate(schedule, today);
          if (nextDate && isAfter(nextDate, today)) {
            upcomingEvents.push({
              date: nextDate,
              grant,
              quantity: grant.quantity,
              stakeholderName: grant.securities?.stakeholders?.people?.name || 
                             grant.securities?.stakeholders?.entity_name || 
                             'Unknown',
              previousVested: vested,
              schedule
            });
          }
        });
      }

      // Sort upcoming events by date
      upcomingEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

      setVestingData({
        grants: grants || [],
        schedules: [],
        totalGranted,
        totalVested,
        totalUnvested,
        upcomingEvents: upcomingEvents.slice(0, 10) // Next 10 vesting events
      });
    } catch (err) {
      console.error('Failed to load vesting data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vesting data');
    } finally {
      setLoading(false);
    }
  };

  if (!hasCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No company selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please create or select a company to view vesting schedules.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <ErrorMessage 
          message={error}
          onRetry={loadVestingData}
        />
      </div>
    );
  }

  const vestingPercentage = vestingData 
    ? (vestingData.totalGranted > 0 
        ? Math.round((vestingData.totalVested / vestingData.totalGranted) * 100) 
        : 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Vesting Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track vesting schedules, progress, and upcoming events
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setSelectedView('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedView === 'overview' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedView('schedules')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedView === 'schedules' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Schedules
            </button>
            <button
              onClick={() => setSelectedView('timeline')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedView === 'timeline' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Granted"
          value={vestingData?.totalGranted.toLocaleString() || '0'}
          icon={<DocumentTextIcon className="h-5 w-5" />}
          iconBgColor="bg-blue-500"
        />
        <StatCard
          title={`Vested (${vestingPercentage}%)`}
          value={vestingData?.totalVested.toLocaleString() || '0'}
          icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
          iconBgColor="bg-green-500"
        />
        <StatCard
          title={`Unvested (${100 - vestingPercentage}%)`}
          value={vestingData?.totalUnvested.toLocaleString() || '0'}
          icon={<ClockIcon className="h-5 w-5" />}
          iconBgColor="bg-yellow-500"
        />
        <StatCard
          title="Active Schedules"
          value={vestingData?.grants.filter((g: any) => g.vesting_schedules).length || 0}
          icon={<CalendarIcon className="h-5 w-5" />}
          iconBgColor="bg-purple-500"
        />
      </div>

      {/* Main Content Area */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vesting Progress Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Vesting Progress</h2>
            <VestingProgressChart 
              totalGranted={vestingData?.totalGranted || 0}
              totalVested={vestingData?.totalVested || 0}
              totalUnvested={vestingData?.totalUnvested || 0}
            />
          </div>

          {/* Upcoming Vesting Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming Vesting Events</h2>
            <UpcomingVestingEvents events={vestingData?.upcomingEvents || []} />
          </div>
        </div>
      )}

      {selectedView === 'schedules' && (
        <div className="bg-white rounded-lg shadow">
          <VestingScheduleList grants={vestingData?.grants || []} />
        </div>
      )}

      {selectedView === 'timeline' && (
        <div className="bg-white rounded-lg shadow p-6">
          <VestingTimeline grants={vestingData?.grants || []} />
        </div>
      )}

      {/* Empty State */}
      {vestingData && vestingData.grants.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vesting schedules</h3>
          <p className="mt-1 text-sm text-gray-500">
            Issue stock options or RSUs with vesting schedules to see them here.
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.location.href = '/stakeholders'}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Stakeholders
            </button>
          </div>
        </div>
      )}
    </div>
  );
}