import React from 'react';
import { useHealthCheck } from '@/utils/healthCheck';

export interface IHealthStatusBadgeProps {
  showDetails?: boolean;
  className?: string;
}

export const HealthStatusBadge: React.FC<IHealthStatusBadgeProps> = ({ 
  showDetails = false,
  className = ''
}) => {
  const { healthStatus, isLoading } = useHealthCheck(60000); // Check every minute

  if (isLoading) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-1 animate-pulse"></div>
        Checking...
      </div>
    );
  }

  if (!healthStatus) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ${className}`}>
        <div className="w-2 h-2 bg-red-400 rounded-full mr-1"></div>
        Unknown
      </div>
    );
  }

  const statusConfig = {
    healthy: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      dotColor: 'bg-green-400',
      label: 'Healthy'
    },
    degraded: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800', 
      dotColor: 'bg-yellow-400',
      label: 'Degraded'
    },
    unhealthy: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      dotColor: 'bg-red-400',
      label: 'Unhealthy'
    }
  };

  const config = statusConfig[healthStatus.status];

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}>
      <div className={`w-2 h-2 ${config.dotColor} rounded-full mr-1`}></div>
      {config.label}
      {showDetails && healthStatus.responseTime && (
        <span className="ml-1 text-gray-500">
          ({healthStatus.responseTime}ms)
        </span>
      )}
    </div>
  );
};

export interface IDetailedHealthStatusProps {
  className?: string;
}

export const DetailedHealthStatus: React.FC<IDetailedHealthStatusProps> = ({ className = '' }) => {
  const { healthStatus, isLoading } = useHealthCheck(60000);

  if (isLoading || !healthStatus) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <h3 className="text-sm font-medium text-gray-900 mb-2">System Status</h3>
        <div className="space-y-2">
          {['Database', 'Authentication', 'Storage'].map((service) => (
            <div key={service} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{service}</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse mr-2"></div>
                <span className="text-xs text-gray-500">Checking...</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const services = [
    { name: 'Database', status: healthStatus.checks.database },
    { name: 'Authentication', status: healthStatus.checks.auth },
    { name: 'Storage', status: healthStatus.checks.storage },
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">System Status</h3>
        <HealthStatusBadge showDetails />
      </div>
      
      <div className="space-y-2">
        {services.map((service) => {
          const config = {
            healthy: { dot: 'bg-green-400', text: 'text-green-600' },
            degraded: { dot: 'bg-yellow-400', text: 'text-yellow-600' },
            unhealthy: { dot: 'bg-red-400', text: 'text-red-600' }
          }[service.status.status];

          return (
            <div key={service.name} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{service.name}</span>
              <div className="flex items-center">
                <div className={`w-2 h-2 ${config.dot} rounded-full mr-2`}></div>
                <span className={`text-xs ${config.text} capitalize`}>
                  {service.status.status}
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  ({service.status.responseTime}ms)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last checked</span>
          <span>{new Date(healthStatus.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};