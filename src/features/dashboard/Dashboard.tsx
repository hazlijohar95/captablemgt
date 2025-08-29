import { ArrowUpIcon, ArrowDownIcon, ChartBarIcon, UsersIcon, ShareIcon, CalendarIcon } from '@heroicons/react/24/solid';
import { 
  BellIcon, 
  DocumentTextIcon, 
  ArrowPathIcon,
  ChartPieIcon,
  BanknotesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { QuickActions } from './components/QuickActions';
import { PageLayout, Card, CardHeader } from '@/components/ui';

const stats = [
  { 
    name: 'Fully Diluted Shares', 
    value: '14,345,588', 
    change: '+12.5%', 
    changeType: 'increase',
    icon: ChartPieIcon,
    color: 'bg-blue-500'
  },
  { 
    name: 'Option Pool', 
    value: '10.2%', 
    change: '-0.5%', 
    changeType: 'decrease',
    icon: ShareIcon,
    color: 'bg-purple-500'
  },
  { 
    name: 'Total Stakeholders', 
    value: '47', 
    change: '+3', 
    changeType: 'increase',
    icon: UsersIcon,
    color: 'bg-green-500'
  },
  { 
    name: 'Next Vesting', 
    value: 'Mar 1, 2025', 
    change: '15 employees', 
    changeType: 'neutral',
    icon: CalendarIcon,
    color: 'bg-orange-500'
  },
];

const recentActivity = [
  { 
    id: 1, 
    type: 'Grant', 
    description: 'Option grant to Sarah Chen', 
    date: '2 hours ago',
    icon: DocumentTextIcon,
    color: 'text-blue-600 bg-blue-100'
  },
  { 
    id: 2, 
    type: 'Transfer', 
    description: 'Share transfer from John Doe to Jane Smith', 
    date: '5 hours ago',
    icon: ArrowPathIcon,
    color: 'text-green-600 bg-green-100'
  },
  { 
    id: 3, 
    type: 'Round', 
    description: 'Series A round closed', 
    date: '2 days ago',
    icon: BanknotesIcon,
    color: 'text-purple-600 bg-purple-100'
  },
  { 
    id: 4, 
    type: 'Vesting', 
    description: '12 employees vested this month', 
    date: '3 days ago',
    icon: ClockIcon,
    color: 'text-orange-600 bg-orange-100'
  },
];

const upcomingEvents = [
  { id: 1, title: 'Q1 Board Meeting', date: 'Mar 15, 2025', type: 'meeting' },
  { id: 2, title: 'Option Pool Refresh', date: 'Apr 1, 2025', type: 'deadline' },
  { id: 3, title: '409A Valuation Due', date: 'Apr 30, 2025', type: 'compliance' },
  { id: 4, title: 'Annual Shareholder Meeting', date: 'May 20, 2025', type: 'meeting' },
];

export function Dashboard() {
  return (
    <PageLayout>
      <PageLayout.Header
        title="Dashboard"
        description="Overview of your cap table and recent activity"
        actions={
          <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700">
            <BellIcon className="h-4 w-4 mr-2" />
            Set Alerts
          </button>
        }
      />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="overflow-visible">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                <dd className="mt-1">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <span
                      className={`flex items-center font-medium ${
                        stat.changeType === 'increase'
                          ? 'text-green-600'
                          : stat.changeType === 'decrease'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {stat.changeType === 'increase' && (
                        <ArrowUpIcon className="h-3 w-3 mr-1" />
                      )}
                      {stat.changeType === 'decrease' && (
                        <ArrowDownIcon className="h-3 w-3 mr-1" />
                      )}
                      {stat.change}
                    </span>
                  </div>
                </dd>
              </div>
              <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card noPadding>
            <CardHeader 
              title="Recent Activity"
              description="Latest transactions and changes to your cap table"
              icon={<ChartBarIcon className="h-5 w-5 text-gray-400" />}
              actions={
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  View All
                </button>
              }
            />
            <div className="divide-y divide-gray-200">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${activity.color}`}>
                        <activity.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.type}</p>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{activity.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Upcoming Events - Takes 1 column */}
        <div>
          <Card noPadding>
            <CardHeader 
              title="Upcoming Events"
              description="Important dates and deadlines"
              icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}
              badge={
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {upcomingEvents.length} events
                </span>
              }
            />
            <div className="divide-y divide-gray-200">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      event.type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                      event.type === 'deadline' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      
      <QuickActions />
    </PageLayout>
  );
}