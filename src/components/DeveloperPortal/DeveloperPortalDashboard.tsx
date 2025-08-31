import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Key, 
  Webhook, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
// Services will be used for data fetching in the future
import { DeveloperPortalStats, IntegrationHealth } from '@/types/api';

const DeveloperPortalDashboard: React.FC = () => {
  const {
    data: stats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['developerPortalStats'],
    queryFn: () => getDeveloperPortalStats(),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const {
    data: integrationHealth,
    isLoading: healthLoading
  } = useQuery({
    queryKey: ['integrationHealth'],
    queryFn: () => getIntegrationHealth(),
    refetchInterval: 60000 // Refresh every minute
  });

  const {
    data: recentActivity,
    isLoading: activityLoading
  } = useQuery({
    queryKey: ['recentApiActivity'],
    queryFn: () => getRecentActivity(),
    refetchInterval: 30000
  });

  if (statsLoading || healthLoading) {
    return (
      <div className="space-y-6">
        {/* Loading State */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Developer Portal
        </h1>
        <p className="text-gray-600">
          Manage your API integrations, monitor usage, and access documentation
        </p>
      </div>

      {/* Integration Health Status */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Integration Health</h2>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            integrationHealth?.overall_status === 'healthy' 
              ? 'bg-green-100 text-green-800'
              : integrationHealth?.overall_status === 'degraded'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {integrationHealth?.overall_status === 'healthy' && <CheckCircle className="w-4 h-4" />}
            {integrationHealth?.overall_status === 'degraded' && <AlertTriangle className="w-4 h-4" />}
            {integrationHealth?.overall_status === 'unhealthy' && <AlertTriangle className="w-4 h-4" />}
            <span className="capitalize">{integrationHealth?.overall_status || 'Unknown'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API Health */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">API Performance</span>
              <div className={`w-3 h-3 rounded-full ${
                integrationHealth?.api_health.status === 'healthy' ? 'bg-green-400' : 
                integrationHealth?.api_health.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">
                Avg Response: {integrationHealth?.api_health.avg_response_time_ms}ms
              </div>
              <div className="text-xs text-gray-500">
                Error Rate: {((integrationHealth?.api_health.error_rate || 0) * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500">
                Uptime: {((integrationHealth?.api_health.uptime_percentage || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Webhook Health */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Webhook Delivery</span>
              <div className={`w-3 h-3 rounded-full ${
                integrationHealth?.webhook_health.status === 'healthy' ? 'bg-green-400' : 
                integrationHealth?.webhook_health.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">
                Endpoints: {integrationHealth?.webhook_health.healthy_endpoints}/{integrationHealth?.webhook_health.total_endpoints}
              </div>
              <div className="text-xs text-gray-500">
                Avg Delivery: {integrationHealth?.webhook_health.avg_delivery_time_ms}ms
              </div>
              <div className="text-xs text-gray-500">
                Success Rate: {((integrationHealth?.webhook_health.success_rate || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Rate Limiting Health */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Rate Limiting</span>
              <div className={`w-3 h-3 rounded-full ${
                integrationHealth?.rate_limiting_health.status === 'healthy' ? 'bg-green-400' : 
                integrationHealth?.rate_limiting_health.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">
                Keys Near Limit: {integrationHealth?.rate_limiting_health.keys_near_limit}
              </div>
              <div className="text-xs text-gray-500">
                Keys Over Limit: {integrationHealth?.rate_limiting_health.keys_over_limit}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total API Keys */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">API Keys</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.active_api_keys}
                </p>
                <p className="ml-2 text-sm text-gray-500">
                  / {stats?.total_api_keys} total
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Total Webhooks */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Webhook className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Webhooks</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.active_webhooks}
                </p>
                <p className="ml-2 text-sm text-gray-500">
                  / {stats?.total_webhooks} total
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Today */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Requests Today</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.total_requests_today.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.total_requests_this_month.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">API Performance</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Average Response Time</span>
              <span className="text-sm font-bold text-gray-900">
                {stats?.avg_response_time_ms}ms
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Error Rate</span>
              <span className={`text-sm font-bold ${
                stats?.error_rate < 0.01 ? 'text-green-600' :
                stats?.error_rate < 0.05 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {((stats?.error_rate || 0) * 100).toFixed(2)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Webhook Success Rate</span>
              <span className={`text-sm font-bold ${
                stats?.webhook_success_rate > 0.95 ? 'text-green-600' :
                stats?.webhook_success_rate > 0.9 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {((stats?.webhook_success_rate || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>

          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity?.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status_code < 400 ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.method} {activity.endpoint}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.response_time_ms}ms • {activity.ip_address}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}

              {(!recentActivity || recentActivity.length === 0) && (
                <div className="text-center py-4">
                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Key className="w-5 h-5 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Create API Key</span>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Webhook className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Add Webhook</span>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <BarChart3 className="w-5 h-5 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">View Analytics</span>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Activity className="w-5 h-5 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Test API</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeveloperPortalDashboard;

// Mock functions - replace with actual service calls
async function getDeveloperPortalStats(): Promise<DeveloperPortalStats> {
  // This would call your API service
  return {
    total_api_keys: 5,
    active_api_keys: 4,
    total_requests_today: 1247,
    total_requests_this_month: 45623,
    avg_response_time_ms: 245,
    error_rate: 0.0023,
    total_webhooks: 3,
    active_webhooks: 2,
    webhook_success_rate: 0.98
  };
}

async function getIntegrationHealth(): Promise<IntegrationHealth> {
  return {
    overall_status: 'healthy',
    api_health: {
      status: 'healthy',
      avg_response_time_ms: 245,
      error_rate: 0.0023,
      uptime_percentage: 0.999
    },
    webhook_health: {
      status: 'healthy',
      total_endpoints: 3,
      healthy_endpoints: 3,
      avg_delivery_time_ms: 450,
      success_rate: 0.98
    },
    rate_limiting_health: {
      status: 'healthy',
      keys_near_limit: 0,
      keys_over_limit: 0
    },
    last_updated: new Date().toISOString()
  };
}

async function getRecentActivity() {
  return [
    {
      id: '1',
      method: 'GET',
      endpoint: '/companies',
      status_code: 200,
      response_time_ms: 156,
      ip_address: '192.168.1.1',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      method: 'POST',
      endpoint: '/companies/123/stakeholders',
      status_code: 201,
      response_time_ms: 234,
      ip_address: '192.168.1.1',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      method: 'GET',
      endpoint: '/companies/123/cap-table',
      status_code: 200,
      response_time_ms: 445,
      ip_address: '192.168.1.1',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    }
  ];
}