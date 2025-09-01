/**
 * Error tracking and monitoring for cap table management platform
 * Centralized error handling, reporting, and monitoring
 */

import { logger } from './simpleLogger';

export interface ErrorContext {
  userId?: string;
  companyId?: string;
  feature?: string;
  action?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  sessionId?: string;
  stackTrace?: string;
  [key: string]: any;
}

export interface ErrorReport {
  id: string;
  type: 'javascript' | 'api' | 'business' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  error: Error;
  context: ErrorContext;
  timestamp: string;
  fingerprint: string; // For error deduplication
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxStoredErrors = 100;
  private reportingEnabled = true;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * Set up global error handlers for unhandled errors
   */
  private setupGlobalErrorHandlers(): void {
    // Handle JavaScript runtime errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        type: 'javascript',
        severity: 'high',
        context: {
          url: event.filename,
          line: event.lineno,
          column: event.colno,
          source: 'global-error-handler'
        }
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        type: 'javascript',
        severity: 'high',
        context: {
          reason: event.reason,
          source: 'unhandled-promise-rejection'
        }
      });
    });

    // Handle React error boundaries (if using a global error boundary)
    // This would be integrated with a React Error Boundary component
  }

  /**
   * Generate a fingerprint for error deduplication
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    const key = `${error.name}-${error.message}-${context.feature || 'unknown'}-${context.action || 'unknown'}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Capture and report an error
   */
  captureError(
    error: Error,
    options: {
      type?: ErrorReport['type'];
      severity?: ErrorReport['severity'];
      context?: ErrorContext;
      tags?: Record<string, string>;
    } = {}
  ): string {
    const {
      type = 'javascript',
      severity = 'medium',
      context = {},
      tags = {}
    } = options;

    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const enrichedContext: ErrorContext = {
      ...context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp,
      stackTrace: error.stack,
      ...tags
    };

    const fingerprint = this.generateFingerprint(error, enrichedContext);

    const errorReport: ErrorReport = {
      id: errorId,
      type,
      severity,
      message: error.message,
      error,
      context: enrichedContext,
      timestamp,
      fingerprint
    };

    // Store error locally
    this.storeError(errorReport);

    // Log error using our logging system
    logError(`${type.toUpperCase()} ERROR: ${error.message}`, error, enrichedContext);

    // Report to external services in production
    if (this.reportingEnabled && import.meta.env.MODE === 'production') {
      this.reportToExternalServices(errorReport);
    }

    // Log security events if applicable
    if (type === 'security' || error.message.toLowerCase().includes('unauthorized')) {
      logSecurity('ERROR_SECURITY_RELATED', {
        errorId,
        message: error.message
      }, enrichedContext);
    }

    return errorId;
  }

  /**
   * Store error locally for debugging
   */
  private storeError(errorReport: ErrorReport): void {
    this.errors.unshift(errorReport);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(0, this.maxStoredErrors);
    }
  }

  /**
   * Report error to external monitoring services
   */
  private async reportToExternalServices(errorReport: ErrorReport): Promise<void> {
    try {
      // Example integrations:
      // - Sentry: Sentry.captureException(errorReport.error, { contexts: errorReport.context });
      // - LogRocket: LogRocket.captureException(errorReport.error);
      // - DataDog: DD_RUM.captureError(errorReport.error, errorReport.context);
      
      // For now, we'll just log to console in a structured way
      console.error('[ERROR_TRACKING]', {
        id: errorReport.id,
        type: errorReport.type,
        severity: errorReport.severity,
        message: errorReport.message,
        context: errorReport.context,
        fingerprint: errorReport.fingerprint
      });

      // TODO: Implement actual external service integration
      // await this.sendToSentry(errorReport);
      // await this.sendToDataDog(errorReport);
      
    } catch (reportingError) {
      logger.error('Failed to report error to external services', reportingError instanceof Error ? reportingError : new Error(String(reportingError)));
    }
  }

  /**
   * Get stored errors for debugging
   */
  getStoredErrors(limit?: number): ErrorReport[] {
    return limit ? this.errors.slice(0, limit) : this.errors;
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: number; // Errors in the last hour
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const stats = {
      total: this.errors.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recent: 0
    };

    this.errors.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count recent errors
      if (new Date(error.timestamp).getTime() > oneHourAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  /**
   * Enable/disable error reporting
   */
  setReportingEnabled(enabled: boolean): void {
    this.reportingEnabled = enabled;
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// Convenience functions for different types of errors
export const captureAPIError = (error: Error, context?: ErrorContext) => {
  return errorTracker.captureError(error, {
    type: 'api',
    severity: 'high',
    context
  });
};

export const captureBusinessError = (error: Error, context?: ErrorContext) => {
  return errorTracker.captureError(error, {
    type: 'business',
    severity: 'medium',
    context
  });
};

export const captureSecurityError = (error: Error, context?: ErrorContext) => {
  return errorTracker.captureError(error, {
    type: 'security',
    severity: 'critical',
    context
  });
};

export const capturePerformanceError = (error: Error, context?: ErrorContext) => {
  return errorTracker.captureError(error, {
    type: 'performance',
    severity: 'low',
    context
  });
};

// Helper for async operations
export const withErrorTracking = async <T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    captureAPIError(error as Error, context);
    throw error;
  }
};

// React Hook for component-level error tracking
export const useErrorTracking = (componentName: string) => {
  return {
    captureError: (error: Error, additionalContext?: ErrorContext) => {
      return errorTracker.captureError(error, {
        type: 'javascript',
        severity: 'medium',
        context: {
          component: componentName,
          ...additionalContext
        }
      });
    },
    captureBusinessError: (error: Error, additionalContext?: ErrorContext) => {
      return captureBusinessError(error, {
        component: componentName,
        ...additionalContext
      });
    }
  };
};

export default errorTracker;