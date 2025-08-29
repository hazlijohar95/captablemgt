import { MonitoringService, IMonitoringConfig } from '@/services/monitoring';
import { HealthCheckService } from '@/utils/healthCheck';

// Monitoring configuration
export const monitoringConfig: IMonitoringConfig = {
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  release: import.meta.env.VITE_APP_VERSION || '1.0.0',
  tracesSampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,
};

export function initializeMonitoring(): void {
  // Only initialize in browser environment
  if (typeof window === 'undefined') return;
  
  // Skip initialization if no DSN is provided
  if (!monitoringConfig.dsn && monitoringConfig.environment === 'production') {
    console.warn('Sentry DSN not provided - monitoring disabled');
    return;
  }
  
  try {
    // Initialize Sentry
    MonitoringService.init(monitoringConfig);
    
    // Start periodic health checks in production
    if (monitoringConfig.environment === 'production') {
      HealthCheckService.startPeriodicHealthCheck(300000); // Every 5 minutes
    }
    
    // Global error handler for unhandled promises
    window.addEventListener('unhandledrejection', (event) => {
      MonitoringService.captureError(
        new Error(`Unhandled promise rejection: ${event.reason}`),
        {
          type: 'unhandledrejection',
          reason: event.reason,
        }
      );
    });
    
    // Monitor performance
    if ('performance' in window && 'getEntriesByType' in window.performance) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 1000) { // Log slow operations
            MonitoringService.addBreadcrumb(
              `Slow operation detected: ${entry.name}`,
              'performance',
              {
                duration: entry.duration,
                startTime: entry.startTime,
                type: entry.entryType,
              }
            );
          }
        });
      });
      
      observer.observe({ entryTypes: ['navigation', 'measure'] });
    }
    
    console.log('Monitoring initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize monitoring:', error);
  }
}

// Monitor financial operations specifically
export function monitorFinancialTransaction(
  operation: string,
  companyId: string,
  amount?: number,
  securityType?: string
): void {
  MonitoringService.monitorFinancialOperation(operation, companyId, {
    amount,
    securityType,
    timestamp: new Date().toISOString(),
  });
  
  // Set context for this session
  MonitoringService.setContext('financial_session', {
    lastOperation: operation,
    companyId,
    timestamp: new Date().toISOString(),
  });
}

// Monitor security events
export function monitorSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  userId?: string,
  companyId?: string
): void {
  MonitoringService.monitorSecurityEvent(event, severity, {
    userId,
    companyId,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });
  
  // Immediate alert for critical security events
  if (severity === 'critical') {
    MonitoringService.captureMessage(
      `CRITICAL SECURITY EVENT: ${event}`,
      'fatal',
      { userId, companyId, event }
    );
  }
}

// Error boundary fallback
export function monitoringErrorFallback(error: Error, errorInfo: any): void {
  MonitoringService.captureError(error, {
    errorInfo,
    type: 'react_error_boundary',
    timestamp: new Date().toISOString(),
  });
}