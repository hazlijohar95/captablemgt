import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  UsersIcon, 
  ShareIcon, 
  CalendarIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ChartPieIcon,
  BanknotesIcon,
  ClockIcon,
  SparklesIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { QuickActions } from './components/QuickActions';
import { Card, CardHeader, Badge, Button } from '@/components/ui';

const stats = [
  { 
    name: 'Fully Diluted Shares', 
    value: '14,345,588', 
    change: '+12.5%', 
    changeType: 'increase' as const,
    icon: ChartPieIcon,
    trend: [65, 69, 75, 81, 73, 85, 92, 88, 94, 100]
  },
  { 
    name: 'Option Pool', 
    value: '10.2%', 
    change: '-0.5%', 
    changeType: 'decrease' as const,
    icon: ShareIcon,
    trend: [45, 52, 48, 61, 55, 47, 42, 38, 44, 40]
  },
  { 
    name: 'Total Stakeholders', 
    value: '47', 
    change: '+3', 
    changeType: 'increase' as const,
    icon: UsersIcon,
    trend: [25, 28, 31, 35, 38, 42, 44, 46, 47, 47]
  },
  { 
    name: 'Company Valuation', 
    value: '$125M', 
    change: '+24.5%', 
    changeType: 'increase' as const,
    icon: ArrowTrendingUpIcon,
    trend: [60, 65, 71, 78, 83, 89, 95, 92, 98, 100]
  },
];

const recentActivity = [
  { 
    id: 1, 
    type: 'Grant', 
    description: 'Option grant to Sarah Chen - 5,000 shares', 
    date: '2 hours ago',
    icon: DocumentTextIcon,
    color: 'text-accent-blue bg-accent-blue/10',
    impact: '+0.02%',
    priority: 'high' as const
  },
  { 
    id: 2, 
    type: 'Transfer', 
    description: 'Share transfer from John Doe to Jane Smith - 2,500 shares', 
    date: '5 hours ago',
    icon: ArrowPathIcon,
    color: 'text-success-600 bg-success-50',
    impact: '0%',
    priority: 'medium' as const
  },
  { 
    id: 3, 
    type: 'Round', 
    description: 'Series A round closed - $15M raised', 
    date: '2 days ago',
    icon: BanknotesIcon,
    color: 'text-accent-purple bg-accent-purple/10',
    impact: '+18.7%',
    priority: 'urgent' as const
  },
  { 
    id: 4, 
    type: 'Vesting', 
    description: '12 employees vested this month - 45,000 shares', 
    date: '3 days ago',
    icon: ClockIcon,
    color: 'text-primary-600 bg-primary-50',
    impact: '+0.31%',
    priority: 'low' as const
  },
];

const upcomingEvents = [
  { 
    id: 1, 
    title: 'Q1 Board Meeting', 
    date: 'Mar 15, 2025', 
    type: 'meeting',
    description: 'Quarterly business review and strategic planning',
    attendees: 8,
    urgent: false
  },
  { 
    id: 2, 
    title: 'Option Pool Refresh', 
    date: 'Apr 1, 2025', 
    type: 'deadline',
    description: 'Expand option pool to 15% of fully diluted shares',
    attendees: 0,
    urgent: true
  },
  { 
    id: 3, 
    title: '409A Valuation Due', 
    date: 'Apr 30, 2025', 
    type: 'compliance',
    description: 'Annual independent valuation for tax compliance',
    attendees: 0,
    urgent: true
  },
  { 
    id: 4, 
    title: 'Annual Shareholder Meeting', 
    date: 'May 20, 2025', 
    type: 'meeting',
    description: 'Required annual meeting for all shareholders',
    attendees: 47,
    urgent: false
  },
];

export function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="relative">
        <div className="absolute inset-0 gradient-mesh opacity-30 rounded-3xl" />
        <Card variant="glass" className="relative border-primary-200/40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Good morning! 👋
              </h1>
              <p className="text-lg text-gray-700">
                Your cap table is looking healthy. Here's what's happening today.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <Button variant="outline" leftIcon={<EyeIcon className="w-4 h-4" />}>
                View Full Report
              </Button>
              <Button leftIcon={<PlusIcon className="w-4 h-4" />}>
                Quick Action
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.name} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <Card variant="elevated" interactive className="group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="w-6 h-6 text-primary-600" />
                </div>
                <Badge 
                  variant={stat.changeType === 'increase' ? 'success' : 'error'} 
                  size="sm"
                  leftIcon={stat.changeType === 'increase' ? 
                    <ArrowUpIcon className="w-3 h-3" /> : 
                    <ArrowDownIcon className="w-3 h-3" />
                  }
                >
                  {stat.change}
                </Badge>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {stat.name}
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              
              {/* Mini trend chart */}
              <div className="flex items-center gap-1 h-8">
                {stat.trend.map((point, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all duration-500 ${
                      stat.changeType === 'increase' ? 'bg-success-200' : 'bg-error-200'
                    }`}
                    style={{ 
                      height: `${point}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card padding="none" variant="elevated">
            <CardHeader 
              title="Recent Activity"
              description="Latest transactions and changes to your cap table"
              icon={<SparklesIcon className="h-5 w-5 text-primary-600" />}
              actions={
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              }
            />
            <div className="divide-y divide-gray-200">
              {recentActivity.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="px-6 py-5 hover:bg-gray-50 transition-colors group animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`p-3 rounded-xl ${activity.color} group-hover:scale-110 transition-transform duration-300`}>
                        <activity.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {activity.type}
                          </span>
                          <Badge 
                            variant={activity.priority === 'urgent' ? 'error' : activity.priority === 'high' ? 'warning' : 'default'}
                            size="xs"
                          >
                            {activity.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 truncate">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-xs font-medium text-gray-600">
                          Impact: {activity.impact}
                        </p>
                        <p className="text-xs text-gray-600">
                          {activity.date}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Upcoming Events - Takes 1 column */}
        <div>
          <Card padding="none" variant="elevated">
            <CardHeader 
              title="Upcoming Events"
              description="Important dates and deadlines"
              icon={<CalendarIcon className="h-5 w-5 text-primary-600" />}
              badge={
                <Badge variant="primary" size="sm">
                  {upcomingEvents.length} events
                </Badge>
              }
            />
            <div className="divide-y divide-gray-200">
              {upcomingEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  className="px-6 py-4 hover:bg-gray-50 transition-colors animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {event.title}
                      </h4>
                      {event.urgent && (
                        <Badge variant="error" size="xs">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant={
                        event.type === 'meeting' ? 'info' :
                        event.type === 'deadline' ? 'warning' : 'error'
                      }
                      size="xs"
                    >
                      {event.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-700 mb-2">
                    {event.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{event.date}</span>
                    {event.attendees > 0 && (
                      <span>{event.attendees} attendees</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      
      <QuickActions />
    </div>
  );
}