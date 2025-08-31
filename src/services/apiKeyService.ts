/**
 * API Key Management Service
 * Handles API key creation, validation, and management operations
 */

import { z } from 'zod';
import { BaseService } from './baseService';
import {
  ApiKey,
  ApiKeyDetails,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  RevokeApiKeyRequest,
  ApiKeyUsageStats,
  ApiScope,
  RateLimitInfo,
  ApiPermissions
} from '@/types/api';

// Validation schemas
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  environment: z.enum(['sandbox', 'production']),
  scopes: z.array(z.string()).min(1),
  permissions: z.object({
    companies: z.object({
      read: z.boolean().optional(),
      write: z.boolean().optional(),
      create: z.boolean().optional(),
      delete: z.boolean().optional(),
      company_ids: z.array(z.string().uuid()).optional()
    }).optional(),
    stakeholders: z.object({
      read: z.boolean().optional(),
      write: z.boolean().optional(),
      create: z.boolean().optional(),
      delete: z.boolean().optional(),
      pii_access: z.boolean().optional()
    }).optional(),
    securities: z.object({
      read: z.boolean().optional(),
      issue: z.boolean().optional(),
      transfer: z.boolean().optional(),
      cancel: z.boolean().optional(),
      exercise: z.boolean().optional()
    }).optional(),
    transactions: z.object({
      read: z.boolean().optional(),
      create: z.boolean().optional(),
      modify: z.boolean().optional(),
      delete: z.boolean().optional()
    }).optional(),
    reports: z.object({
      generate: z.boolean().optional(),
      download: z.boolean().optional(),
      share: z.boolean().optional(),
      report_types: z.array(z.string()).optional()
    }).optional(),
    webhooks: z.object({
      create: z.boolean().optional(),
      read: z.boolean().optional(),
      update: z.boolean().optional(),
      delete: z.boolean().optional(),
      test: z.boolean().optional()
    }).optional()
  }).optional(),
  rate_limit_tier: z.enum(['standard', 'premium', 'enterprise']).optional(),
  custom_rate_limit: z.number().min(1).max(100000).optional(),
  expires_at: z.string().datetime().optional()
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  scopes: z.array(z.string()).min(1).optional(),
  permissions: z.object({}).passthrough().optional(),
  rate_limit_tier: z.enum(['standard', 'premium', 'enterprise']).optional(),
  custom_rate_limit: z.number().min(1).max(100000).optional(),
  expires_at: z.string().datetime().optional(),
  status: z.enum(['active', 'revoked', 'expired']).optional()
});

class ApiKeyService extends BaseService {
  /**
   * Create a new API key for a company
   */
  async createApiKey(
    companyId: string, 
    request: CreateApiKeyRequest
  ): Promise<CreateApiKeyResponse> {
    const validatedRequest = createApiKeySchema.parse(request);

    return this.withTransaction(async (client) => {
      // Validate scopes exist
      await this.validateScopes(validatedRequest.scopes);

      // Check if key name already exists for this company
      const existingKey = await client.query(
        'SELECT id FROM api_keys WHERE company_id = $1 AND name = $2 AND status != $3',
        [companyId, validatedRequest.name, 'revoked']
      );

      if (existingKey.rows.length > 0) {
        throw new Error(`API key with name '${validatedRequest.name}' already exists`);
      }

      // Generate key pair using database function
      const keyPairResult = await client.query(
        `SELECT * FROM generate_api_key_pair($1, $2, $3, $4, $5)`,
        [
          companyId,
          validatedRequest.name,
          validatedRequest.environment,
          validatedRequest.scopes,
          validatedRequest.rate_limit_tier || 'standard'
        ]
      );

      const { key_id, secret_key } = keyPairResult.rows[0];

      // Get the created API key details
      const apiKeyResult = await client.query(`
        SELECT 
          ak.*,
          u.email as created_by_email
        FROM api_keys ak
        LEFT JOIN auth.users u ON u.id = ak.created_by
        WHERE ak.key_id = $1
      `, [key_id]);

      const apiKey = this.mapApiKeyFromDb(apiKeyResult.rows[0]);

      // Update permissions if provided
      if (validatedRequest.permissions) {
        await client.query(
          'UPDATE api_keys SET permissions = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(validatedRequest.permissions), apiKey.id]
        );
        apiKey.permissions = validatedRequest.permissions;
      }

      // Update expiration if provided
      if (validatedRequest.expires_at) {
        await client.query(
          'UPDATE api_keys SET expires_at = $1, updated_at = NOW() WHERE id = $2',
          [validatedRequest.expires_at, apiKey.id]
        );
        apiKey.expires_at = validatedRequest.expires_at;
      }

      // Update custom rate limit if provided
      if (validatedRequest.custom_rate_limit) {
        await client.query(
          'UPDATE api_keys SET custom_rate_limit = $1, updated_at = NOW() WHERE id = $2',
          [validatedRequest.custom_rate_limit, apiKey.id]
        );
        apiKey.custom_rate_limit = validatedRequest.custom_rate_limit;
      }

      // Log API key creation
      await this.logAuditEvent(client, {
        action: 'api_key.created',
        resource_type: 'api_key',
        resource_id: apiKey.id,
        company_id: companyId,
        metadata: {
          key_name: validatedRequest.name,
          environment: validatedRequest.environment,
          scopes: validatedRequest.scopes,
          rate_limit_tier: validatedRequest.rate_limit_tier
        }
      });

      return {
        api_key: apiKey,
        key_id,
        secret_key,
        warning: 'Store this secret key securely. It will not be shown again.'
      };
    });
  }

  /**
   * List API keys for a company
   */
  async listApiKeys(
    companyId: string, 
    options?: {
      environment?: 'sandbox' | 'production';
      status?: 'active' | 'revoked' | 'expired';
      page?: number;
      limit?: number;
    }
  ) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE ak.company_id = $1';
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (options?.environment) {
      whereClause += ` AND ak.environment = $${paramIndex}`;
      params.push(options.environment);
      paramIndex++;
    }

    if (options?.status) {
      whereClause += ` AND ak.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    const countResult = await this.executeQuery(
      `SELECT COUNT(*) FROM api_keys ak ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    const result = await this.executeQuery(`
      SELECT 
        ak.*,
        u.email as created_by_email,
        ru.email as revoked_by_email
      FROM api_keys ak
      LEFT JOIN auth.users u ON u.id = ak.created_by
      LEFT JOIN auth.users ru ON ru.id = ak.revoked_by
      ${whereClause}
      ORDER BY ak.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const apiKeys = result.rows.map(row => this.mapApiKeyFromDb(row));

    return {
      data: apiKeys,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get API key details with usage statistics
   */
  async getApiKeyDetails(companyId: string, apiKeyId: string): Promise<ApiKeyDetails> {
    const result = await this.executeQuery(`
      SELECT 
        ak.*,
        u.email as created_by_email,
        ru.email as revoked_by_email
      FROM api_keys ak
      LEFT JOIN auth.users u ON u.id = ak.created_by
      LEFT JOIN auth.users ru ON ru.id = ak.revoked_by
      WHERE ak.id = $1 AND ak.company_id = $2
    `, [apiKeyId, companyId]);

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    const apiKey = this.mapApiKeyFromDb(result.rows[0]);

    // Get usage statistics
    const usageStats = await this.getApiKeyUsageStats(apiKeyId);

    // Get recent requests
    const recentRequests = await this.getRecentRequests(apiKeyId, 10);

    // Get rate limit info
    const rateLimitInfo = await this.getRateLimitInfo(apiKeyId);

    return {
      ...apiKey,
      usage_statistics: usageStats,
      recent_requests: recentRequests,
      rate_limit_info: rateLimitInfo
    };
  }

  /**
   * Update API key
   */
  async updateApiKey(
    companyId: string,
    apiKeyId: string,
    request: UpdateApiKeyRequest
  ): Promise<ApiKey> {
    const validatedRequest = updateApiKeySchema.parse(request);

    return this.withTransaction(async (client) => {
      // Check if API key exists and belongs to company
      const existingResult = await client.query(
        'SELECT * FROM api_keys WHERE id = $1 AND company_id = $2',
        [apiKeyId, companyId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('API key not found');
      }

      const existing = existingResult.rows[0];

      // Check if name conflicts with other keys
      if (validatedRequest.name && validatedRequest.name !== existing.name) {
        const nameCheck = await client.query(
          'SELECT id FROM api_keys WHERE company_id = $1 AND name = $2 AND id != $3 AND status != $4',
          [companyId, validatedRequest.name, apiKeyId, 'revoked']
        );

        if (nameCheck.rows.length > 0) {
          throw new Error(`API key with name '${validatedRequest.name}' already exists`);
        }
      }

      // Validate scopes if provided
      if (validatedRequest.scopes) {
        await this.validateScopes(validatedRequest.scopes);
      }

      // Build update query
      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let paramIndex = 1;

      if (validatedRequest.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateParams.push(validatedRequest.name);
      }

      if (validatedRequest.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateParams.push(validatedRequest.description);
      }

      if (validatedRequest.scopes !== undefined) {
        updateFields.push(`scopes = $${paramIndex++}`);
        updateParams.push(JSON.stringify(validatedRequest.scopes));
      }

      if (validatedRequest.permissions !== undefined) {
        updateFields.push(`permissions = $${paramIndex++}`);
        updateParams.push(JSON.stringify(validatedRequest.permissions));
      }

      if (validatedRequest.rate_limit_tier !== undefined) {
        updateFields.push(`rate_limit_tier = $${paramIndex++}`);
        updateParams.push(validatedRequest.rate_limit_tier);
      }

      if (validatedRequest.custom_rate_limit !== undefined) {
        updateFields.push(`custom_rate_limit = $${paramIndex++}`);
        updateParams.push(validatedRequest.custom_rate_limit);
      }

      if (validatedRequest.expires_at !== undefined) {
        updateFields.push(`expires_at = $${paramIndex++}`);
        updateParams.push(validatedRequest.expires_at);
      }

      if (validatedRequest.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateParams.push(validatedRequest.status);

        // If revoking, set revocation details
        if (validatedRequest.status === 'revoked') {
          updateFields.push(`revoked_at = NOW()`);
          updateFields.push(`revoked_by = $${paramIndex++}`);
          updateParams.push(this.getCurrentUserId());
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push('updated_at = NOW()');
      updateParams.push(apiKeyId, companyId);

      const updateResult = await client.query(`
        UPDATE api_keys 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
        RETURNING *
      `, updateParams);

      const updatedApiKey = this.mapApiKeyFromDb(updateResult.rows[0]);

      // Log the update
      await this.logAuditEvent(client, {
        action: 'api_key.updated',
        resource_type: 'api_key',
        resource_id: apiKeyId,
        company_id: companyId,
        changes: validatedRequest,
        metadata: {
          key_name: updatedApiKey.name
        }
      });

      return updatedApiKey;
    });
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(
    companyId: string,
    apiKeyId: string,
    request: RevokeApiKeyRequest
  ): Promise<void> {
    return this.withTransaction(async (client) => {
      const result = await client.query(`
        UPDATE api_keys 
        SET 
          status = 'revoked',
          revoked_at = NOW(),
          revoked_by = $1,
          revoked_reason = $2,
          updated_at = NOW()
        WHERE id = $3 AND company_id = $4 AND status = 'active'
        RETURNING name
      `, [this.getCurrentUserId(), request.reason, apiKeyId, companyId]);

      if (result.rows.length === 0) {
        throw new Error('API key not found or already revoked');
      }

      // Log the revocation
      await this.logAuditEvent(client, {
        action: 'api_key.revoked',
        resource_type: 'api_key',
        resource_id: apiKeyId,
        company_id: companyId,
        metadata: {
          key_name: result.rows[0].name,
          reason: request.reason
        }
      });
    });
  }

  /**
   * Validate API key and return permissions
   */
  async validateApiKey(keyId: string, secretKey: string) {
    const result = await this.executeQuery(
      'SELECT * FROM validate_api_key($1, $2)',
      [keyId, secretKey]
    );

    if (result.rows.length === 0 || !result.rows[0].is_valid) {
      return null;
    }

    return {
      api_key_id: result.rows[0].api_key_id,
      company_id: result.rows[0].company_id,
      scopes: result.rows[0].scopes,
      rate_limit_tier: result.rows[0].rate_limit_tier
    };
  }

  /**
   * Get API key usage statistics
   */
  private async getApiKeyUsageStats(apiKeyId: string): Promise<ApiKeyUsageStats> {
    const statsResult = await this.executeQuery(`
      SELECT 
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as requests_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as requests_this_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as requests_this_month,
        AVG(response_time_ms)::integer as avg_response_time_ms,
        (COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*))::decimal(5,2) as error_rate
      FROM api_request_logs 
      WHERE api_key_id = $1
    `, [apiKeyId]);

    const endpointUsageResult = await this.executeQuery(`
      SELECT 
        endpoint,
        method,
        COUNT(*) as request_count,
        AVG(response_time_ms)::integer as avg_response_time_ms,
        (COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*))::decimal(5,2) as error_rate
      FROM api_request_logs 
      WHERE api_key_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY endpoint, method
      ORDER BY request_count DESC
      LIMIT 10
    `, [apiKeyId]);

    const geographicUsageResult = await this.executeQuery(`
      SELECT 
        country_code,
        COUNT(*) as request_count,
        (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::decimal(5,2) as percentage
      FROM api_request_logs 
      WHERE api_key_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND country_code IS NOT NULL
      GROUP BY country_code
      ORDER BY request_count DESC
      LIMIT 10
    `, [apiKeyId]);

    const stats = statsResult.rows[0] || {};

    return {
      requests_today: parseInt(stats.requests_today) || 0,
      requests_this_week: parseInt(stats.requests_this_week) || 0,
      requests_this_month: parseInt(stats.requests_this_month) || 0,
      avg_response_time_ms: parseInt(stats.avg_response_time_ms) || 0,
      error_rate: parseFloat(stats.error_rate) || 0,
      most_used_endpoints: endpointUsageResult.rows.map(row => ({
        endpoint: row.endpoint,
        method: row.method,
        request_count: parseInt(row.request_count),
        avg_response_time_ms: parseInt(row.avg_response_time_ms),
        error_rate: parseFloat(row.error_rate)
      })),
      geographic_usage: geographicUsageResult.rows.map(row => ({
        country_code: row.country_code,
        country_name: this.getCountryName(row.country_code),
        request_count: parseInt(row.request_count),
        percentage: parseFloat(row.percentage)
      }))
    };
  }

  /**
   * Get recent API requests for a key
   */
  private async getRecentRequests(apiKeyId: string, limit: number = 10) {
    const result = await this.executeQuery(`
      SELECT 
        id, method, endpoint, status_code, response_time_ms, 
        ip_address, created_at
      FROM api_request_logs 
      WHERE api_key_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [apiKeyId, limit]);

    return result.rows.map(row => ({
      id: row.id,
      method: row.method,
      endpoint: row.endpoint,
      status_code: row.status_code,
      response_time_ms: row.response_time_ms,
      ip_address: row.ip_address,
      created_at: row.created_at.toISOString()
    }));
  }

  /**
   * Get current rate limit info for API key
   */
  private async getRateLimitInfo(apiKeyId: string): Promise<RateLimitInfo> {
    const result = await this.executeQuery(`
      SELECT 
        ak.rate_limit_tier,
        COALESCE(ak.custom_rate_limit, rlt.requests_per_hour) as requests_per_hour,
        rlt.burst_limit,
        COALESCE(arl.requests_in_hour, 0) as current_usage_hour,
        COALESCE(arl.requests_in_minute, 0) as current_usage_minute
      FROM api_keys ak
      JOIN rate_limit_tiers rlt ON rlt.tier = ak.rate_limit_tier
      LEFT JOIN api_rate_limits arl ON arl.api_key_id = ak.id 
        AND arl.hour_window = date_trunc('hour', NOW())
        AND arl.minute_window = date_trunc('minute', NOW())
      WHERE ak.id = $1
    `, [apiKeyId]);

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    const row = result.rows[0];

    return {
      tier: row.rate_limit_tier,
      requests_per_hour: row.requests_per_hour,
      burst_limit: row.burst_limit,
      current_usage: {
        requests_this_hour: row.current_usage_hour,
        requests_this_minute: row.current_usage_minute
      },
      remaining: Math.max(0, row.requests_per_hour - row.current_usage_hour),
      reset_at: new Date(Math.ceil(Date.now() / 3600000) * 3600000).toISOString(),
      over_limit: row.current_usage_hour >= row.requests_per_hour
    };
  }

  /**
   * Validate that all requested scopes exist
   */
  private async validateScopes(scopes: string[]) {
    const result = await this.executeQuery(
      'SELECT scope FROM api_scopes WHERE scope = ANY($1)',
      [scopes]
    );

    const validScopes = result.rows.map(row => row.scope);
    const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));

    if (invalidScopes.length > 0) {
      throw new Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }
  }

  /**
   * Map database row to ApiKey object
   */
  private mapApiKeyFromDb(row: any): ApiKey {
    return {
      id: row.id,
      company_id: row.company_id,
      key_id: row.key_id,
      name: row.name,
      description: row.description,
      environment: row.environment,
      scopes: Array.isArray(row.scopes) ? row.scopes : JSON.parse(row.scopes || '[]'),
      permissions: typeof row.permissions === 'object' ? row.permissions : JSON.parse(row.permissions || '{}'),
      last_used_at: row.last_used_at?.toISOString(),
      last_used_ip: row.last_used_ip,
      usage_count: parseInt(row.usage_count) || 0,
      rate_limit_tier: row.rate_limit_tier,
      custom_rate_limit: row.custom_rate_limit,
      status: row.status,
      expires_at: row.expires_at?.toISOString(),
      created_by: row.created_by,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      revoked_at: row.revoked_at?.toISOString(),
      revoked_by: row.revoked_by,
      revoked_reason: row.revoked_reason
    };
  }

  /**
   * Get country name from country code
   */
  private getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'CA': 'Canada',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'AU': 'Australia',
      'JP': 'Japan',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'IN': 'India'
      // Add more as needed
    };

    return countryNames[countryCode] || countryCode;
  }
}

export const apiKeyService = new ApiKeyService();