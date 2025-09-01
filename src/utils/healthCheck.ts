import { supabase } from '@/services/supabase';
import { logger } from './simpleLogger';
import React from 'react';

export interface IHealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: IServiceHealth;
    auth: IServiceHealth;
    storage: IServiceHealth;
  };
  timestamp: string;
  responseTime: number;
}

export interface IServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  lastChecked: string;
}

export class HealthCheckService {
  private static readonly TIMEOUT_MS = 5000;
  private static readonly MAX_RESPONSE_TIME_MS = 1000;

  static async runHealthCheck(): Promise<IHealthCheckResult> {
    const startTime = Date.now();
    
    logger.info('Starting health check', {
      feature: 'monitoring',
      action: 'healthCheck'
    });

    const [database, auth, storage] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkAuth(),
      this.checkStorage(),
    ]);

    const result: IHealthCheckResult = {
      status: this.calculateOverallStatus([database, auth, storage]),
      checks: {
        database: this.getCheckResult(database),
        auth: this.getCheckResult(auth),
        storage: this.getCheckResult(storage),
      },
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };

    logger.info('Health check completed', {
      feature: 'monitoring',
      action: 'healthCheck',
      data: result
    });

    return result;
  }

  private static async checkDatabase(): Promise<IServiceHealth> {
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout')), this.TIMEOUT_MS);
      });

      const healthPromise = supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      await Promise.race([healthPromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime > this.MAX_RESPONSE_TIME_MS ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static async checkAuth(): Promise<IServiceHealth> {
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Auth timeout')), this.TIMEOUT_MS);
      });

      const authPromise = supabase.auth.getSession();

      await Promise.race([authPromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime > this.MAX_RESPONSE_TIME_MS ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown auth error',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static async checkStorage(): Promise<IServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Simple storage check by listing buckets (read-only operation)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Storage timeout')), this.TIMEOUT_MS);
      });

      const storagePromise = supabase.storage.listBuckets();

      await Promise.race([storagePromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime > this.MAX_RESPONSE_TIME_MS ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown storage error',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static calculateOverallStatus(
    results: PromiseSettledResult<IServiceHealth>[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = results.map(result => {
      if (result.status === 'rejected') return 'unhealthy';
      return result.value.status;
    });

    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }

  private static getCheckResult(
    result: PromiseSettledResult<IServiceHealth>
  ): IServiceHealth {
    if (result.status === 'rejected') {
      return {
        status: 'unhealthy',
        responseTime: 0,
        error: result.reason?.message || 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
    return result.value;
  }

  // Periodic health check runner
  static startPeriodicHealthCheck(intervalMs: number = 60000): () => void {
    const interval = setInterval(async () => {
      try {
        const result = await this.runHealthCheck();
        
        // Log unhealthy status
        if (result.status !== 'healthy') {
          logger.error('Health check detected issues', undefined, result, {
            feature: 'monitoring',
            action: 'periodicHealthCheck'
          });
        }
        
        // You could emit to a monitoring service here
        // MonitoringService.captureMessage(`Health check: ${result.status}`, 'info', result);
        
      } catch (error) {
        logger.error('Health check failed', error instanceof Error ? error : undefined, undefined, {
          feature: 'monitoring',
          action: 'periodicHealthCheck'
        });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }
}

// React hook for component-level health monitoring
export function useHealthCheck(checkInterval: number = 30000) {
  const [healthStatus, setHealthStatus] = React.useState<IHealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      try {
        const result = await HealthCheckService.runHealthCheck();
        if (mounted) {
          setHealthStatus(result);
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    runCheck();

    const interval = setInterval(runCheck, checkInterval);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [checkInterval]);

  return { healthStatus, isLoading };
}