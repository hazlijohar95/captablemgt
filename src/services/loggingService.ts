/**
 * Production Logging Service
 * Replaces console.log with structured logging for production use
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface ILogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  companyId?: string;
  requestId?: string;
  module?: string;
}

export interface ILoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
}

class LoggingService {
  private config: ILoggerConfig;
  private buffer: ILogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  
  constructor() {
    this.config = {
      level: this.getLogLevelFromEnv(),
      enableConsole: import.meta.env.DEV || false,
      enableRemote: import.meta.env.PROD || false,
      remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
      bufferSize: 100,
      flushInterval: 10000 // 10 seconds
    };
    
    if (this.config.enableRemote) {
      this.startFlushTimer();
    }
  }
  
  private getLogLevelFromEnv(): LogLevel {
    const level = import.meta.env.VITE_LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'CRITICAL': return LogLevel.CRITICAL;
      default: return LogLevel.INFO;
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }
  
  private createLogEntry(
    level: LogLevel, 
    message: string, 
    context?: Record<string, any>, 
    error?: Error
  ): ILogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      userId: this.getCurrentUserId(),
      companyId: this.getCurrentCompanyId(),
      requestId: this.getCurrentRequestId(),
      module: this.getCallingModule()
    };
  }
  
  private getCurrentUserId(): string | undefined {
    // Get from auth context or localStorage
    try {
      return localStorage.getItem('user_id') || undefined;
    } catch {
      return undefined;
    }
  }
  
  private getCurrentCompanyId(): string | undefined {
    // Get from URL or context
    try {
      const path = window.location.pathname;
      const match = path.match(/\/companies\/([^\/]+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }
  
  private getCurrentRequestId(): string | undefined {
    // Generate or retrieve request ID for tracing
    return (window as any).__requestId || undefined;
  }
  
  private getCallingModule(): string | undefined {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Find the first line that's not in this logging service
        for (let i = 3; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('/src/') && !line.includes('loggingService')) {
            const match = line.match(/\/src\/([^)]+)/);
            return match ? match[1].split(':')[0] : undefined;
          }
        }
      }
    } catch {
      // Ignore stack trace errors
    }
    return undefined;
  }
  
  private formatConsoleMessage(entry: ILogEntry): string {
    const prefix = `[${entry.level === LogLevel.DEBUG ? 'DEBUG' :
                      entry.level === LogLevel.INFO ? 'INFO' :
                      entry.level === LogLevel.WARN ? 'WARN' :
                      entry.level === LogLevel.ERROR ? 'ERROR' :
                      'CRITICAL'}]`;
    
    const module = entry.module ? `[${entry.module}]` : '';
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    
    return `${prefix}${module} ${entry.message}${context}`;
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;
    
    const entry = this.createLogEntry(level, message, context, error);
    
    // Console logging (development only)
    if (this.config.enableConsole) {
      const formattedMessage = this.formatConsoleMessage(entry);
      
      if (level >= LogLevel.ERROR) {
        console.error(formattedMessage, error || '');
      } else if (level >= LogLevel.WARN) {
        console.warn(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    }
    
    // Remote logging (production)
    if (this.config.enableRemote) {
      this.buffer.push(entry);
      
      // Immediate flush for critical errors
      if (level >= LogLevel.CRITICAL || this.buffer.length >= this.config.bufferSize) {
        this.flush();
      }
    }
  }
  
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    if (this.config.remoteEndpoint) {
      try {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ logs: entries })
        });
      } catch (error) {
        // If remote logging fails, fallback to console in production
        if (this.config.enableConsole) {
          console.error('Failed to send logs to remote endpoint:', error);
        }
        // Re-add entries to buffer for retry (keep only the most recent)
        this.buffer = entries.slice(-50).concat(this.buffer);
      }
    }
  }
  
  // Public API
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
  
  critical(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, message, context, error);
  }
  
  // Performance logging
  performance(name: string, value: number, unit: string = 'ms'): void {
    this.info(`Performance metric: ${name}`, { 
      metric: name, 
      value, 
      unit,
      type: 'performance'
    });
  }
  
  // Transaction logging  
  transaction(companyId: string, transactionId: string, event: string, details?: Record<string, any>): void {
    this.info(`Transaction: ${event}`, {
      companyId,
      transactionId,
      event,
      details,
      type: 'transaction'
    });
  }
  
  // Audit logging
  audit(action: string, resource: string, details?: Record<string, any>): void {
    this.info(`Audit: ${action} on ${resource}`, {
      action,
      resource,
      details,
      type: 'audit'
    });
  }
  
  // Security logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: Record<string, any>): void {
    const level = severity === 'critical' ? LogLevel.CRITICAL :
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN :
                  LogLevel.INFO;
                  
    this.log(level, `Security: ${event}`, {
      ...details,
      severity,
      type: 'security'
    });
  }
  
  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

// Export singleton instance
export const logger = new LoggingService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.destroy();
  });
}

// Development helper - expose logger globally in dev mode
if (import.meta.env.DEV) {
  (window as any).logger = logger;
}