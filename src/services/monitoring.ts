import * as Sentry from '@sentry/react';
import React from 'react';

export interface IMonitoringConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

export class MonitoringService {
  private static initialized = false;

  static init(config: IMonitoringConfig): void {
    if (this.initialized) {
      console.warn('MonitoringService already initialized');
      return;
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      
      // Performance monitoring
      tracesSampleRate: config.tracesSampleRate,
      
      // Session replay
      replaysSessionSampleRate: config.replaysSessionSampleRate,
      replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
      
      // Enhanced error context
      beforeSend(event) {
        // Filter out development/test errors
        if (config.environment === 'development' || config.environment === 'test') {
          return null;
        }
        
        // Add financial app context
        if (event.extra) {
          event.extra.appType = 'captable';
          event.extra.timestamp = new Date().toISOString();
        }
        
        return event;
      },
      
      // Custom integrations - simplified for basic error tracking
      integrations: [],
      
      // Custom tags for cap table app
      initialScope: {
        tags: {
          component: 'captable',
        },
      },
    });

    this.initialized = true;
  }

  static captureError(error: Error, context?: Record<string, any>): void {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureException(error);
    });
  }

  static captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): void {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureMessage(message, level);
    });
  }

  static setUserContext(user: { id: string; email?: string; companyId?: string }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      companyId: user.companyId,
    });
  }

  static addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
      timestamp: Date.now() / 1000,
    });
  }

  static startTransaction(name: string, op: string = 'navigation'): any {
    // Simplified transaction tracking
    console.log(`Transaction started: ${name} (${op})`);
    return {
      finish: () => console.log(`Transaction finished: ${name}`),
      setTag: (key: string, value: string) => console.log(`Transaction tag: ${key}=${value}`),
    };
  }

  static setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  static setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  }

  // Financial-specific monitoring methods
  static monitorFinancialOperation(
    operation: string,
    companyId: string,
    additionalData?: Record<string, any>
  ): void {
    this.addBreadcrumb(
      `Financial operation: ${operation}`,
      'finance',
      {
        companyId,
        operation,
        ...additionalData,
      }
    );

    this.setTag('financial_operation', operation);
    this.setContext('financial_context', {
      companyId,
      operation,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }

  static monitorSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: Record<string, any>
  ): void {
    const level = severity === 'critical' ? 'fatal' : 
                  severity === 'high' ? 'error' :
                  severity === 'medium' ? 'warning' : 'info';

    this.captureMessage(
      `Security event: ${event}`,
      level as Sentry.SeverityLevel,
      {
        securityEvent: event,
        severity,
        ...details,
      }
    );
  }
}

// React Error Boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Performance monitoring hook
export function usePerformanceMonitoring(componentName: string) {
  React.useEffect(() => {
    const transaction = MonitoringService.startTransaction(`${componentName} Mount`);
    
    return () => {
      transaction.finish();
    };
  }, [componentName]);
}