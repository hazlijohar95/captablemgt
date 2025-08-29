/**
 * Structured logging system for cap table management platform
 * Provides consistent logging with appropriate levels and context
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogContext {
  userId?: string;
  companyId?: string;
  feature?: string;
  action?: string;
  requestId?: string;
  sessionId?: string;
  timestamp?: string;
  environment?: string;
  version?: string;
  [key: string]: any;
}

interface LogEntry extends LogContext {
  level: LogLevel;
  message: string;
  error?: Error;
  data?: any;
}

class Logger {
  private level: LogLevel;
  private context: LogContext;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.context = {
      environment: import.meta.env.MODE || 'development',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set global context that will be included in all log entries
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Update specific context fields
   */
  updateContext(key: keyof LogContext, value: any): void {
    this.context[key] = value;
  }

  /**
   * Clear context (useful for tests)
   */
  clearContext(): void {
    this.context = {
      environment: import.meta.env.MODE || 'development',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatLogEntry(entry: LogEntry): string {
    const { level, message, error, data, ...context } = entry;
    
    const logObj = {
      level: LogLevel[level],
      message,
      timestamp: new Date().toISOString(),
      ...context
    };

    if (error) {
      (logObj as any).error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    if (data) {
      (logObj as any).data = data;
    }

    return JSON.stringify(logObj, null, this.context.environment === 'development' ? 2 : 0);
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formatted = this.formatLogEntry(entry);

    // In development, use console methods for better formatting
    if (this.context.environment === 'development') {
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formatted);
          break;
      }
    } else {
      // In production, send to logging service
      console.log(formatted);
      // TODO: Integrate with external logging service (e.g., DataDog, LogRocket, Sentry)
    }
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, data?: any, context?: Partial<LogContext>): void {
    this.writeLog({
      level: LogLevel.DEBUG,
      message,
      data,
      ...this.context,
      ...context
    });
  }

  /**
   * Log general information
   */
  info(message: string, data?: any, context?: Partial<LogContext>): void {
    this.writeLog({
      level: LogLevel.INFO,
      message,
      data,
      ...this.context,
      ...context
    });
  }

  /**
   * Log warning conditions
   */
  warn(message: string, data?: any, context?: Partial<LogContext>): void {
    this.writeLog({
      level: LogLevel.WARN,
      message,
      data,
      ...this.context,
      ...context
    });
  }

  /**
   * Log error conditions
   */
  error(message: string, error?: Error, data?: any, context?: Partial<LogContext>): void {
    this.writeLog({
      level: LogLevel.ERROR,
      message,
      error,
      data,
      ...this.context,
      ...context
    });
  }

  /**
   * Log fatal errors that require immediate attention
   */
  fatal(message: string, error?: Error, data?: any, context?: Partial<LogContext>): void {
    this.writeLog({
      level: LogLevel.FATAL,
      message,
      error,
      data,
      ...this.context,
      ...context
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>): Logger {
    const childLogger = new Logger(this.level);
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  /**
   * Log business events for audit trail
   */
  audit(action: string, data?: any, context?: Partial<LogContext>): void {
    this.info(`AUDIT: ${action}`, data, {
      ...context,
      audit: true,
      action
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, data?: any, context?: Partial<LogContext>): void {
    this.info(`PERFORMANCE: ${operation} took ${duration}ms`, {
      ...data,
      duration,
      operation
    }, {
      ...context,
      performance: true
    });
  }

  /**
   * Log security events
   */
  security(event: string, data?: any, context?: Partial<LogContext>): void {
    this.warn(`SECURITY: ${event}`, data, {
      ...context,
      security: true,
      securityEvent: event
    });
  }
}

// Create default logger instance
export const logger = new Logger(
  import.meta.env.MODE === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

// Convenience functions for common logging patterns
export const logError = (message: string, error?: Error, context?: Partial<LogContext>) => {
  logger.error(message, error, undefined, context);
};

export const logInfo = (message: string, data?: any, context?: Partial<LogContext>) => {
  logger.info(message, data, context);
};

export const logWarning = (message: string, data?: any, context?: Partial<LogContext>) => {
  logger.warn(message, data, context);
};

export const logDebug = (message: string, data?: any, context?: Partial<LogContext>) => {
  logger.debug(message, data, context);
};

export const logAudit = (action: string, data?: any, context?: Partial<LogContext>) => {
  logger.audit(action, data, context);
};

export const logPerformance = (operation: string, duration: number, data?: any, context?: Partial<LogContext>) => {
  logger.performance(operation, duration, data, context);
};

export const logSecurity = (event: string, data?: any, context?: Partial<LogContext>) => {
  logger.security(event, data, context);
};

// Helper for timing operations
export const withTiming = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Partial<LogContext>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logPerformance(operation, duration, undefined, context);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logError(`${operation} failed after ${duration}ms`, error as Error, context);
    throw error;
  }
};

export default logger;