export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: string;
  url?: string;
  userAgent?: string;
  userId?: string;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    data?: any
  ): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };
  }

  private log(level: LogEntry['level'], message: string, data?: any) {
    const entry = this.createLogEntry(level, message, data);
    
    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Console logging
    if (!this.isProduction) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${entry.timestamp}] ${message}`, data || '');
    }

    // In production, you would send to logging service
    if (this.isProduction && (level === 'error' || level === 'warn')) {
      this.sendToLoggingService(entry);
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  private async sendToLoggingService(entry: LogEntry) {
    // Placeholder for real logging service integration
    // In production, you would send to services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - Custom logging endpoint
    console.warn('Production logging not implemented:', entry);
  }

  // Get recent logs (useful for debugging)
  getRecentLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Clear log buffer
  clearLogs() {
    this.logBuffer = [];
  }
}

export const logger = new Logger();