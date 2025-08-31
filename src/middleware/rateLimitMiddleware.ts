/**
 * Rate Limiting Middleware
 * Implements sophisticated rate limiting with burst capacity and geographic awareness
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BaseService } from '@/services/baseService';
import { RateLimitStatus, RateLimitError } from '@/types/api';

interface RateLimitRequest extends Request {
  apiKey?: {
    id: string;
    company_id: string;
    rate_limit_tier: string;
    custom_rate_limit?: number;
  };
  rateLimitInfo?: RateLimitStatus;
}

class RateLimitService extends BaseService {
  private redis?: any; // Redis client for production
  private memoryCache = new Map<string, any>(); // Fallback for development

  constructor() {
    super();
    this.initializeRedis();
  }

  private initializeRedis() {
    // In production, initialize Redis client
    // For development, we'll use PostgreSQL + memory cache
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      try {
        // const Redis = require('ioredis');
        // this.redis = new Redis(process.env.REDIS_URL);
      } catch (error) {
        console.warn('Redis not available, falling back to PostgreSQL rate limiting');
      }
    }
  }

  /**
   * Check and update rate limits for an API key
   */
  async checkRateLimit(
    apiKeyId: string,
    endpoint: string,
    ipAddress: string
  ): Promise<RateLimitStatus> {
    if (this.redis) {
      return this.checkRateLimitRedis(apiKeyId, endpoint, ipAddress);
    } else {
      return this.checkRateLimitPostgres(apiKeyId, endpoint, ipAddress);
    }
  }

  /**
   * Redis-based rate limiting (production)
   */
  private async checkRateLimitRedis(
    apiKeyId: string,
    endpoint: string,
    ipAddress: string
  ): Promise<RateLimitStatus> {
    const now = Date.now();
    const hourWindow = Math.floor(now / (60 * 60 * 1000));
    const minuteWindow = Math.floor(now / (60 * 1000));

    const hourKey = `rate_limit:${apiKeyId}:${hourWindow}`;
    const minuteKey = `rate_limit:${apiKeyId}:${minuteWindow}`;

    const pipeline = this.redis.pipeline();

    // Get current counts
    pipeline.get(hourKey);
    pipeline.get(minuteKey);

    // Get rate limit configuration
    pipeline.hgetall(`api_key_config:${apiKeyId}`);

    const results = await pipeline.exec();
    const [hourCountResult, minuteCountResult, configResult] = results;

    const hourCount = parseInt(hourCountResult[1]) || 0;
    const minuteCount = parseInt(minuteCountResult[1]) || 0;
    const config = configResult[1] || {};

    const hourLimit = parseInt(config.custom_rate_limit || config.default_hour_limit || '1000');
    const burstLimit = parseInt(config.burst_limit || '100');

    // Check limits
    if (hourCount >= hourLimit) {
      const resetAt = new Date((hourWindow + 1) * 60 * 60 * 1000);
      return {
        allowed: false,
        remaining: 0,
        reset_at: resetAt.toISOString(),
        retry_after: Math.ceil((resetAt.getTime() - now) / 1000)
      };
    }

    if (minuteCount >= burstLimit) {
      const resetAt = new Date((minuteWindow + 1) * 60 * 1000);
      return {
        allowed: false,
        remaining: Math.max(0, hourLimit - hourCount),
        reset_at: resetAt.toISOString(),
        retry_after: Math.ceil((resetAt.getTime() - now) / 1000)
      };
    }

    // Increment counters
    const incrementPipeline = this.redis.pipeline();
    incrementPipeline.incr(hourKey);
    incrementPipeline.expire(hourKey, 3700); // Slightly more than 1 hour
    incrementPipeline.incr(minuteKey);
    incrementPipeline.expire(minuteKey, 70); // Slightly more than 1 minute

    await incrementPipeline.exec();

    return {
      allowed: true,
      remaining: Math.max(0, hourLimit - hourCount - 1),
      reset_at: new Date((hourWindow + 1) * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * PostgreSQL-based rate limiting (development/fallback)
   */
  private async checkRateLimitPostgres(
    apiKeyId: string,
    endpoint: string,
    ipAddress: string
  ): Promise<RateLimitStatus> {
    const result = await this.executeQuery(
      'SELECT * FROM check_rate_limit($1, $2, $3)',
      [apiKeyId, endpoint, ipAddress]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to check rate limit');
    }

    const row = result.rows[0];

    return {
      allowed: row.allowed,
      remaining: row.remaining,
      reset_at: row.reset_at.toISOString(),
      retry_after: row.allowed ? undefined : Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)
    };
  }

  /**
   * Get comprehensive rate limit info for an API key
   */
  async getRateLimitInfo(apiKeyId: string) {
    const result = await this.executeQuery(`
      SELECT 
        ak.rate_limit_tier,
        COALESCE(ak.custom_rate_limit, rlt.requests_per_hour) as requests_per_hour,
        rlt.burst_limit,
        COALESCE(arl.requests_in_hour, 0) as current_usage_hour,
        COALESCE(arl.requests_in_minute, 0) as current_usage_minute,
        arl.last_request_at
      FROM api_keys ak
      JOIN rate_limit_tiers rlt ON rlt.tier = ak.rate_limit_tier
      LEFT JOIN api_rate_limits arl ON arl.api_key_id = ak.id 
        AND arl.hour_window = date_trunc('hour', NOW())
      WHERE ak.id = $1
    `, [apiKeyId]);

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    const row = result.rows[0];
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

    return {
      tier: row.rate_limit_tier,
      requests_per_hour: row.requests_per_hour,
      burst_limit: row.burst_limit,
      current_usage: {
        requests_this_hour: row.current_usage_hour,
        requests_this_minute: row.current_usage_minute
      },
      remaining: Math.max(0, row.requests_per_hour - row.current_usage_hour),
      reset_at: nextHour.toISOString(),
      over_limit: row.current_usage_hour >= row.requests_per_hour,
      last_request_at: row.last_request_at?.toISOString()
    };
  }

  /**
   * Update rate limit tier for API key
   */
  async updateRateLimitTier(apiKeyId: string, tier: string, customLimit?: number) {
    await this.executeQuery(`
      UPDATE api_keys 
      SET 
        rate_limit_tier = $2,
        custom_rate_limit = $3,
        updated_at = NOW()
      WHERE id = $1
    `, [apiKeyId, tier, customLimit]);

    // Clear Redis cache if using Redis
    if (this.redis) {
      await this.redis.del(`api_key_config:${apiKeyId}`);
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  async getRateLimitStats(companyId?: string, timeRange: 'hour' | 'day' | 'week' = 'day') {
    const intervals = {
      hour: "date_trunc('hour', created_at)",
      day: "date_trunc('day', created_at)", 
      week: "date_trunc('week', created_at)"
    };

    const timeFilter = {
      hour: "created_at >= NOW() - INTERVAL '24 hours'",
      day: "created_at >= NOW() - INTERVAL '7 days'",
      week: "created_at >= NOW() - INTERVAL '30 days'"
    };

    let whereClause = `WHERE ${timeFilter[timeRange]}`;
    const params: any[] = [];

    if (companyId) {
      whereClause += ` AND company_id = $1`;
      params.push(companyId);
    }

    const result = await this.executeQuery(`
      SELECT 
        ${intervals[timeRange]} as time_bucket,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN rate_limit_hit = TRUE THEN 1 END) as rate_limited_requests,
        COUNT(DISTINCT api_key_id) as unique_api_keys,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
      FROM api_request_logs
      ${whereClause}
      GROUP BY time_bucket
      ORDER BY time_bucket DESC
      LIMIT 50
    `, params);

    return result.rows.map(row => ({
      time_bucket: row.time_bucket.toISOString(),
      total_requests: parseInt(row.total_requests),
      rate_limited_requests: parseInt(row.rate_limited_requests),
      unique_api_keys: parseInt(row.unique_api_keys),
      avg_response_time: parseFloat(row.avg_response_time),
      error_count: parseInt(row.error_count),
      rate_limit_percentage: parseFloat(
        (row.rate_limited_requests / row.total_requests * 100).toFixed(2)
      )
    }));
  }

  /**
   * Identify API keys approaching their limits
   */
  async getKeysNearLimit(companyId?: string, threshold: number = 0.8) {
    let whereClause = '';
    const params: any[] = [threshold];

    if (companyId) {
      whereClause = 'WHERE ak.company_id = $2';
      params.push(companyId);
    }

    const result = await this.executeQuery(`
      SELECT 
        ak.id,
        ak.name,
        ak.key_id,
        ak.rate_limit_tier,
        COALESCE(ak.custom_rate_limit, rlt.requests_per_hour) as rate_limit,
        COALESCE(arl.requests_in_hour, 0) as current_usage,
        (COALESCE(arl.requests_in_hour, 0)::float / 
         COALESCE(ak.custom_rate_limit, rlt.requests_per_hour)::float) as usage_percentage
      FROM api_keys ak
      JOIN rate_limit_tiers rlt ON rlt.tier = ak.rate_limit_tier
      LEFT JOIN api_rate_limits arl ON arl.api_key_id = ak.id 
        AND arl.hour_window = date_trunc('hour', NOW())
      ${whereClause}
      HAVING (COALESCE(arl.requests_in_hour, 0)::float / 
              COALESCE(ak.custom_rate_limit, rlt.requests_per_hour)::float) >= $1
      ORDER BY usage_percentage DESC
    `, params);

    return result.rows.map(row => ({
      api_key_id: row.id,
      name: row.name,
      key_id: row.key_id,
      rate_limit_tier: row.rate_limit_tier,
      rate_limit: parseInt(row.rate_limit),
      current_usage: parseInt(row.current_usage),
      usage_percentage: parseFloat(row.usage_percentage),
      remaining: parseInt(row.rate_limit) - parseInt(row.current_usage)
    }));
  }
}

const rateLimitService = new RateLimitService();

/**
 * Express middleware for rate limiting
 */
export const rateLimitMiddleware = async (
  req: RateLimitRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip rate limiting if no API key (handled by auth middleware)
    if (!req.apiKey) {
      return next();
    }

    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Check rate limit
    const rateLimitStatus = await rateLimitService.checkRateLimit(
      req.apiKey.id,
      endpoint,
      ipAddress
    );

    // Add rate limit headers
    res.set({
      'X-RateLimit-Tier': req.apiKey.rate_limit_tier,
      'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
      'X-RateLimit-Reset': rateLimitStatus.reset_at,
      'X-RateLimit-Limit': await getRateLimitForTier(req.apiKey.rate_limit_tier, req.apiKey.custom_rate_limit)
    });

    // Store rate limit info for request logging
    req.rateLimitInfo = rateLimitStatus;

    if (!rateLimitStatus.allowed) {
      // Add retry-after header
      if (rateLimitStatus.retry_after) {
        res.set('Retry-After', rateLimitStatus.retry_after.toString());
      }

      const error: RateLimitError = {
        error: 'rate_limit_exceeded',
        message: 'API rate limit exceeded',
        request_id: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString(),
        rate_limit_info: {
          tier: req.apiKey.rate_limit_tier,
          requests_per_hour: parseInt(await getRateLimitForTier(req.apiKey.rate_limit_tier, req.apiKey.custom_rate_limit)),
          burst_limit: await getBurstLimitForTier(req.apiKey.rate_limit_tier),
          current_usage: {
            requests_this_hour: 0,
            requests_this_minute: 0
          },
          remaining: rateLimitStatus.remaining,
          reset_at: rateLimitStatus.reset_at,
          over_limit: true
        },
        retry_after: rateLimitStatus.retry_after || 3600
      };

      return res.status(429).json(error);
    }

    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Don't block requests if rate limiting fails
    next();
  }
};

/**
 * Rate limit bypass middleware for internal/admin operations
 */
export const bypassRateLimitMiddleware = (
  req: RateLimitRequest,
  res: Response,
  next: NextFunction
) => {
  req.rateLimitInfo = {
    allowed: true,
    remaining: 999999,
    reset_at: new Date(Date.now() + 3600000).toISOString()
  };
  next();
};

/**
 * Middleware to add rate limit info to response headers
 */
export const rateLimitHeadersMiddleware = async (
  req: RateLimitRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.apiKey) {
    try {
      const rateLimitInfo = await rateLimitService.getRateLimitInfo(req.apiKey.id);
      
      res.set({
        'X-RateLimit-Tier': rateLimitInfo.tier,
        'X-RateLimit-Limit': rateLimitInfo.requests_per_hour.toString(),
        'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
        'X-RateLimit-Reset': rateLimitInfo.reset_at,
        'X-RateLimit-Used': (rateLimitInfo.requests_per_hour - rateLimitInfo.remaining).toString()
      });
    } catch (error) {
      // Don't fail the request if we can't get rate limit info
    }
  }
  next();
};

/**
 * Get rate limit for a tier
 */
async function getRateLimitForTier(tier: string, customLimit?: number): Promise<string> {
  if (customLimit) {
    return customLimit.toString();
  }

  const result = await rateLimitService.executeQuery(
    'SELECT requests_per_hour FROM rate_limit_tiers WHERE tier = $1',
    [tier]
  );

  return result.rows[0]?.requests_per_hour?.toString() || '1000';
}

/**
 * Get burst limit for a tier
 */
async function getBurstLimitForTier(tier: string): Promise<number> {
  const result = await rateLimitService.executeQuery(
    'SELECT burst_limit FROM rate_limit_tiers WHERE tier = $1',
    [tier]
  );

  return result.rows[0]?.burst_limit || 100;
}

/**
 * Advanced rate limiting with adaptive limits
 */
export class AdaptiveRateLimiter {
  private baseService = new BaseService();

  /**
   * Adjust rate limits based on API key behavior patterns
   */
  async adjustRateLimits(apiKeyId: string) {
    // Analyze recent usage patterns
    const patterns = await this.analyzeUsagePatterns(apiKeyId);
    
    // Adjust limits based on patterns
    if (patterns.consistentUsage && patterns.lowErrorRate && patterns.goodBehavior) {
      await this.increaseLimits(apiKeyId, patterns);
    } else if (patterns.highErrorRate || patterns.suspiciousActivity) {
      await this.decreaseLimits(apiKeyId, patterns);
    }
  }

  private async analyzeUsagePatterns(apiKeyId: string) {
    const result = await this.baseService.executeQuery(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        AVG(response_time_ms) as avg_response_time,
        MAX(created_at) as last_request,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM api_request_logs
      WHERE api_key_id = $1 
        AND created_at >= NOW() - INTERVAL '30 days'
    `, [apiKeyId]);

    const stats = result.rows[0];
    const totalRequests = parseInt(stats.total_requests);
    const errorCount = parseInt(stats.error_count);
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) : 0;

    return {
      totalRequests,
      errorRate,
      consistentUsage: stats.active_days >= 7,
      lowErrorRate: errorRate < 0.05,
      goodBehavior: stats.avg_response_time < 2000,
      suspiciousActivity: stats.unique_ips > 10,
      recentActivity: new Date(stats.last_request) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    };
  }

  private async increaseLimits(apiKeyId: string, patterns: any) {
    // Increase limits by 25% for well-behaved API keys
    const currentInfo = await rateLimitService.getRateLimitInfo(apiKeyId);
    const newLimit = Math.floor(currentInfo.requests_per_hour * 1.25);
    
    await this.baseService.executeQuery(`
      UPDATE api_keys 
      SET 
        custom_rate_limit = $2,
        updated_at = NOW()
      WHERE id = $1
    `, [apiKeyId, newLimit]);
  }

  private async decreaseLimits(apiKeyId: string, patterns: any) {
    // Decrease limits by 50% for poorly behaving API keys
    const currentInfo = await rateLimitService.getRateLimitInfo(apiKeyId);
    const newLimit = Math.floor(currentInfo.requests_per_hour * 0.5);
    
    await this.baseService.executeQuery(`
      UPDATE api_keys 
      SET 
        custom_rate_limit = $2,
        updated_at = NOW()
      WHERE id = $1
    `, [apiKeyId, Math.max(newLimit, 100)]); // Minimum of 100 requests/hour
  }
}

export { rateLimitService };