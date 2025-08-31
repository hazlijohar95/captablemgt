/**
 * Webhook Service
 * Comprehensive webhook management including delivery, retries, and health monitoring
 */

import { z } from 'zod';
import crypto from 'crypto';
import { BaseService } from './baseService';
import {
  WebhookEndpoint,
  WebhookEndpointDetails,
  WebhookDelivery,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  TestWebhookRequest,
  TestWebhookResponse,
  WebhookEvent,
  WebhookDeliveryStatus,
  WebhookRetryPolicy,
  WebhookDeliveryStats,
  WebhookHealthStatus,
  WebhookIssue
} from '@/types/api';

// Validation schemas
const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  event_filters: z.record(z.any()).optional(),
  secret: z.string().min(8).optional(),
  retry_policy: z.object({
    max_retries: z.number().min(0).max(10).optional(),
    retry_delays: z.array(z.number().min(1).max(1440)).optional(),
    retry_on_statuses: z.array(z.number().min(400).max(599)).optional()
  }).optional(),
  timeout_seconds: z.number().min(1).max(300).optional(),
  custom_headers: z.record(z.string()).optional(),
  auth_type: z.enum(['signature', 'bearer', 'basic', 'none']).optional(),
  auth_config: z.record(z.any()).optional()
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  event_filters: z.record(z.any()).optional(),
  active: z.boolean().optional(),
  retry_policy: z.object({
    max_retries: z.number().min(0).max(10).optional(),
    retry_delays: z.array(z.number().min(1).max(1440)).optional(),
    retry_on_statuses: z.array(z.number().min(400).max(599)).optional()
  }).optional(),
  timeout_seconds: z.number().min(1).max(300).optional(),
  custom_headers: z.record(z.string()).optional(),
  auth_type: z.enum(['signature', 'bearer', 'basic', 'none']).optional(),
  auth_config: z.record(z.any()).optional()
});

class WebhookService extends BaseService {
  private readonly defaultRetryPolicy: WebhookRetryPolicy = {
    max_retries: 3,
    retry_delays: [1, 5, 15], // minutes
    retry_on_statuses: [500, 502, 503, 504, 408, 429]
  };

  /**
   * Create a new webhook endpoint
   */
  async createWebhook(
    companyId: string,
    apiKeyId: string,
    request: CreateWebhookRequest
  ): Promise<WebhookEndpoint> {
    const validatedRequest = createWebhookSchema.parse(request);

    return this.withTransaction(async (client) => {
      // Validate events exist
      await this.validateEvents(validatedRequest.events);

      // Check for duplicate names within company
      const existingWebhook = await client.query(
        'SELECT id FROM webhook_endpoints WHERE company_id = $1 AND name = $2',
        [companyId, validatedRequest.name]
      );

      if (existingWebhook.rows.length > 0) {
        throw new Error(`Webhook with name '${validatedRequest.name}' already exists`);
      }

      // Generate secret if not provided
      const secret = validatedRequest.secret || this.generateWebhookSecret();

      // Set default retry policy
      const retryPolicy = {
        ...this.defaultRetryPolicy,
        ...validatedRequest.retry_policy
      };

      // Insert webhook endpoint
      const result = await client.query(`
        INSERT INTO webhook_endpoints (
          company_id, api_key_id, name, description, url, secret, 
          events, event_filters, retry_policy, timeout_seconds,
          custom_headers, auth_type, auth_config
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *
      `, [
        companyId,
        apiKeyId,
        validatedRequest.name,
        validatedRequest.description,
        validatedRequest.url,
        secret,
        validatedRequest.events,
        JSON.stringify(validatedRequest.event_filters || {}),
        JSON.stringify(retryPolicy),
        validatedRequest.timeout_seconds || 30,
        JSON.stringify(validatedRequest.custom_headers || {}),
        validatedRequest.auth_type || 'signature',
        JSON.stringify(validatedRequest.auth_config || {})
      ]);

      const webhook = this.mapWebhookFromDb(result.rows[0]);

      // Log webhook creation
      await this.logAuditEvent(client, {
        action: 'webhook.created',
        resource_type: 'webhook',
        resource_id: webhook.id,
        company_id: companyId,
        metadata: {
          webhook_name: webhook.name,
          url: webhook.url,
          events: webhook.events
        }
      });

      return webhook;
    });
  }

  /**
   * List webhooks for a company
   */
  async listWebhooks(
    companyId: string,
    options?: {
      active?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE we.company_id = $1';
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (options?.active !== undefined) {
      whereClause += ` AND we.active = $${paramIndex}`;
      params.push(options.active);
      paramIndex++;
    }

    const countResult = await this.executeQuery(
      `SELECT COUNT(*) FROM webhook_endpoints we ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    const result = await this.executeQuery(`
      SELECT we.*, ak.name as api_key_name
      FROM webhook_endpoints we
      LEFT JOIN api_keys ak ON ak.id = we.api_key_id
      ${whereClause}
      ORDER BY we.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const webhooks = result.rows.map(row => this.mapWebhookFromDb(row));

    return {
      data: webhooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get webhook details with delivery statistics
   */
  async getWebhookDetails(companyId: string, webhookId: string): Promise<WebhookEndpointDetails> {
    const result = await this.executeQuery(`
      SELECT we.*, ak.name as api_key_name
      FROM webhook_endpoints we
      LEFT JOIN api_keys ak ON ak.id = we.api_key_id
      WHERE we.id = $1 AND we.company_id = $2
    `, [webhookId, companyId]);

    if (result.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    const webhook = this.mapWebhookFromDb(result.rows[0]);

    // Get delivery statistics
    const deliveryStats = await this.getDeliveryStats(webhookId);

    // Get recent deliveries
    const recentDeliveries = await this.getRecentDeliveries(webhookId, 10);

    // Get health status
    const healthStatus = await this.getWebhookHealth(webhookId);

    return {
      ...webhook,
      delivery_stats: deliveryStats,
      recent_deliveries: recentDeliveries,
      health_status: healthStatus
    };
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhook(
    companyId: string,
    webhookId: string,
    request: UpdateWebhookRequest
  ): Promise<WebhookEndpoint> {
    const validatedRequest = updateWebhookSchema.parse(request);

    return this.withTransaction(async (client) => {
      // Check webhook exists and belongs to company
      const existingResult = await client.query(
        'SELECT * FROM webhook_endpoints WHERE id = $1 AND company_id = $2',
        [webhookId, companyId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Webhook not found');
      }

      const existing = existingResult.rows[0];

      // Validate events if provided
      if (validatedRequest.events) {
        await this.validateEvents(validatedRequest.events);
      }

      // Check for name conflicts if name is being updated
      if (validatedRequest.name && validatedRequest.name !== existing.name) {
        const nameCheck = await client.query(
          'SELECT id FROM webhook_endpoints WHERE company_id = $1 AND name = $2 AND id != $3',
          [companyId, validatedRequest.name, webhookId]
        );

        if (nameCheck.rows.length > 0) {
          throw new Error(`Webhook with name '${validatedRequest.name}' already exists`);
        }
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

      if (validatedRequest.url !== undefined) {
        updateFields.push(`url = $${paramIndex++}`);
        updateParams.push(validatedRequest.url);
      }

      if (validatedRequest.events !== undefined) {
        updateFields.push(`events = $${paramIndex++}`);
        updateParams.push(validatedRequest.events);
      }

      if (validatedRequest.event_filters !== undefined) {
        updateFields.push(`event_filters = $${paramIndex++}`);
        updateParams.push(JSON.stringify(validatedRequest.event_filters));
      }

      if (validatedRequest.active !== undefined) {
        updateFields.push(`active = $${paramIndex++}`);
        updateParams.push(validatedRequest.active);
        
        if (!validatedRequest.active) {
          updateFields.push(`disabled_at = NOW()`);
          updateFields.push(`disabled_reason = $${paramIndex++}`);
          updateParams.push('Manually disabled via API');
        } else if (existing.disabled_at) {
          updateFields.push(`disabled_at = NULL`);
          updateFields.push(`disabled_reason = NULL`);
        }
      }

      if (validatedRequest.retry_policy !== undefined) {
        const retryPolicy = {
          ...this.defaultRetryPolicy,
          ...validatedRequest.retry_policy
        };
        updateFields.push(`retry_policy = $${paramIndex++}`);
        updateParams.push(JSON.stringify(retryPolicy));
      }

      if (validatedRequest.timeout_seconds !== undefined) {
        updateFields.push(`timeout_seconds = $${paramIndex++}`);
        updateParams.push(validatedRequest.timeout_seconds);
      }

      if (validatedRequest.custom_headers !== undefined) {
        updateFields.push(`custom_headers = $${paramIndex++}`);
        updateParams.push(JSON.stringify(validatedRequest.custom_headers));
      }

      if (validatedRequest.auth_type !== undefined) {
        updateFields.push(`auth_type = $${paramIndex++}`);
        updateParams.push(validatedRequest.auth_type);
      }

      if (validatedRequest.auth_config !== undefined) {
        updateFields.push(`auth_config = $${paramIndex++}`);
        updateParams.push(JSON.stringify(validatedRequest.auth_config));
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push('updated_at = NOW()');
      updateParams.push(webhookId, companyId);

      const updateResult = await client.query(`
        UPDATE webhook_endpoints 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
        RETURNING *
      `, updateParams);

      const updatedWebhook = this.mapWebhookFromDb(updateResult.rows[0]);

      // Log the update
      await this.logAuditEvent(client, {
        action: 'webhook.updated',
        resource_type: 'webhook',
        resource_id: webhookId,
        company_id: companyId,
        changes: validatedRequest,
        metadata: {
          webhook_name: updatedWebhook.name
        }
      });

      return updatedWebhook;
    });
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(companyId: string, webhookId: string): Promise<void> {
    return this.withTransaction(async (client) => {
      const result = await client.query(`
        DELETE FROM webhook_endpoints 
        WHERE id = $1 AND company_id = $2
        RETURNING name
      `, [webhookId, companyId]);

      if (result.rows.length === 0) {
        throw new Error('Webhook not found');
      }

      // Log the deletion
      await this.logAuditEvent(client, {
        action: 'webhook.deleted',
        resource_type: 'webhook',
        resource_id: webhookId,
        company_id: companyId,
        metadata: {
          webhook_name: result.rows[0].name
        }
      });
    });
  }

  /**
   * Test webhook endpoint with sample data
   */
  async testWebhook(
    companyId: string,
    webhookId: string,
    request: TestWebhookRequest
  ): Promise<TestWebhookResponse> {
    const webhook = await this.getWebhookDetails(companyId, webhookId);

    // Generate test event data
    const testEventData = request.test_data || this.generateTestEventData(request.event_type);
    const eventId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Queue test delivery
    const deliveryId = await this.queueDelivery(
      webhook.id,
      request.event_type,
      testEventData,
      eventId,
      true // isTest flag
    );

    // Process the delivery immediately for testing
    const deliveryResult = await this.processDelivery(deliveryId);

    return {
      delivery_id: deliveryId,
      status: deliveryResult.delivery_status,
      response_status: deliveryResult.response_status,
      response_time_ms: deliveryResult.response_time_ms,
      error_message: deliveryResult.error_message
    };
  }

  /**
   * Queue webhook delivery
   */
  async queueWebhookDelivery(
    companyId: string,
    eventType: WebhookEvent,
    eventData: any,
    eventId?: string
  ): Promise<number> {
    const result = await this.executeQuery(
      'SELECT queue_webhook_delivery($1, $2, $3, $4) as queued_count',
      [companyId, eventType, JSON.stringify(eventData), eventId]
    );

    return result.rows[0].queued_count;
  }

  /**
   * Process pending webhook deliveries
   */
  async processPendingDeliveries(limit: number = 100): Promise<number> {
    const result = await this.executeQuery(`
      SELECT id, webhook_endpoint_id, event_type, event_data, event_id, attempt_number
      FROM webhook_deliveries
      WHERE delivery_status = 'pending'
        OR (delivery_status = 'retrying' AND next_retry_at <= NOW())
      ORDER BY scheduled_at ASC
      LIMIT $1
    `, [limit]);

    let processedCount = 0;

    for (const delivery of result.rows) {
      try {
        await this.processDelivery(delivery.id);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process delivery ${delivery.id}:`, error);
      }
    }

    return processedCount;
  }

  /**
   * Process a specific webhook delivery
   */
  private async processDelivery(deliveryId: string): Promise<WebhookDelivery> {
    return this.withTransaction(async (client) => {
      // Get delivery details
      const deliveryResult = await client.query(`
        SELECT 
          wd.*,
          we.url, we.secret, we.retry_policy, we.timeout_seconds,
          we.custom_headers, we.auth_type, we.auth_config
        FROM webhook_deliveries wd
        JOIN webhook_endpoints we ON we.id = wd.webhook_endpoint_id
        WHERE wd.id = $1
      `, [deliveryId]);

      if (deliveryResult.rows.length === 0) {
        throw new Error('Delivery not found');
      }

      const delivery = deliveryResult.rows[0];
      const webhook = {
        url: delivery.url,
        secret: delivery.secret,
        retry_policy: typeof delivery.retry_policy === 'string' 
          ? JSON.parse(delivery.retry_policy) 
          : delivery.retry_policy,
        timeout_seconds: delivery.timeout_seconds,
        custom_headers: typeof delivery.custom_headers === 'string'
          ? JSON.parse(delivery.custom_headers)
          : delivery.custom_headers,
        auth_type: delivery.auth_type,
        auth_config: typeof delivery.auth_config === 'string'
          ? JSON.parse(delivery.auth_config)
          : delivery.auth_config
      };

      try {
        // Mark as in progress
        await client.query(
          'UPDATE webhook_deliveries SET delivery_status = $1, delivered_at = NOW() WHERE id = $2',
          ['processing', deliveryId]
        );

        // Make HTTP request
        const deliveryResult = await this.makeWebhookRequest(
          webhook,
          delivery.request_body,
          delivery.event_id
        );

        // Update delivery record with success
        await client.query(`
          UPDATE webhook_deliveries SET 
            delivery_status = 'success',
            response_status = $1,
            response_headers = $2,
            response_body = $3,
            response_time_ms = $4,
            delivered_at = NOW()
          WHERE id = $5
        `, [
          deliveryResult.status,
          JSON.stringify(deliveryResult.headers),
          deliveryResult.body,
          deliveryResult.responseTime,
          deliveryId
        ]);

        // Update webhook endpoint stats
        await this.updateWebhookStats(client, delivery.webhook_endpoint_id, true);

        return this.mapDeliveryFromDb({
          ...delivery,
          delivery_status: 'success',
          response_status: deliveryResult.status,
          response_time_ms: deliveryResult.responseTime
        });

      } catch (error) {
        // Handle delivery failure
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const shouldRetry = this.shouldRetryDelivery(delivery, webhook.retry_policy);

        if (shouldRetry) {
          const nextRetryAt = this.calculateNextRetry(delivery, webhook.retry_policy);
          
          await client.query(`
            UPDATE webhook_deliveries SET 
              delivery_status = 'retrying',
              error_message = $1,
              next_retry_at = $2
            WHERE id = $3
          `, [errorMessage, nextRetryAt, deliveryId]);
        } else {
          await client.query(`
            UPDATE webhook_deliveries SET 
              delivery_status = 'failed',
              error_message = $1,
              delivered_at = NOW()
            WHERE id = $2
          `, [errorMessage, deliveryId]);

          // Update webhook endpoint stats
          await this.updateWebhookStats(client, delivery.webhook_endpoint_id, false);
        }

        return this.mapDeliveryFromDb({
          ...delivery,
          delivery_status: shouldRetry ? 'retrying' : 'failed',
          error_message: errorMessage
        });
      }
    });
  }

  /**
   * Make HTTP request to webhook endpoint
   */
  private async makeWebhookRequest(
    webhook: any,
    requestBody: any,
    eventId: string
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CapTable-Webhook/1.0',
      'X-Event-ID': eventId,
      'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
      ...webhook.custom_headers
    };

    // Add signature for verification
    if (webhook.auth_type === 'signature') {
      const signature = this.generateSignature(
        JSON.stringify(requestBody),
        webhook.secret,
        headers['X-Timestamp']
      );
      headers['X-Signature'] = signature;
    }

    // Add authentication headers
    if (webhook.auth_type === 'bearer' && webhook.auth_config.token) {
      headers['Authorization'] = `Bearer ${webhook.auth_config.token}`;
    } else if (webhook.auth_type === 'basic' && webhook.auth_config.username && webhook.auth_config.password) {
      const credentials = Buffer.from(
        `${webhook.auth_config.username}:${webhook.auth_config.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Make the request (using fetch or axios in real implementation)
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
      });

      const responseBody = await response.text();
      const responseTime = Date.now() - startTime;

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error instanceof Error) {
        throw new Error(`HTTP request failed: ${error.message} (${responseTime}ms)`);
      }
      
      throw new Error(`HTTP request failed: Unknown error (${responseTime}ms)`);
    }
  }

  /**
   * Generate webhook signature for verification
   */
  private generateSignature(payload: string, secret: string, timestamp: string): string {
    const signaturePayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');
    return `sha256=${signature}`;
  }

  /**
   * Generate webhook secret
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate webhook events exist
   */
  private async validateEvents(events: string[]) {
    const result = await this.executeQuery(
      'SELECT event_type FROM webhook_events WHERE event_type = ANY($1)',
      [events]
    );

    const validEvents = result.rows.map(row => row.event_type);
    const invalidEvents = events.filter(event => !validEvents.includes(event));

    if (invalidEvents.length > 0) {
      throw new Error(`Invalid webhook events: ${invalidEvents.join(', ')}`);
    }
  }

  /**
   * Queue delivery helper
   */
  private async queueDelivery(
    webhookEndpointId: string,
    eventType: string,
    eventData: any,
    eventId: string,
    isTest: boolean = false
  ): Promise<string> {
    const result = await this.executeQuery(`
      INSERT INTO webhook_deliveries (
        webhook_endpoint_id, event_type, event_data, event_id,
        request_body, scheduled_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, [
      webhookEndpointId,
      eventType,
      JSON.stringify(eventData),
      eventId,
      JSON.stringify({
        event_type: eventType,
        event_id: eventId,
        data: eventData,
        timestamp: new Date().toISOString(),
        test: isTest
      })
    ]);

    return result.rows[0].id;
  }

  /**
   * Generate test event data
   */
  private generateTestEventData(eventType: string): any {
    const testData: Record<string, any> = {
      'company.created': {
        company_id: 'test-company-id',
        name: 'Test Company Inc.',
        jurisdiction: 'Delaware',
        created_at: new Date().toISOString()
      },
      'stakeholder.created': {
        company_id: 'test-company-id',
        stakeholder_id: 'test-stakeholder-id',
        name: 'John Doe',
        type: 'EMPLOYEE',
        created_at: new Date().toISOString()
      },
      'security.issued': {
        company_id: 'test-company-id',
        security_id: 'test-security-id',
        stakeholder_id: 'test-stakeholder-id',
        type: 'STOCK_OPTION',
        quantity: 1000,
        issued_at: new Date().toISOString()
      }
    };

    return testData[eventType] || { test: true, event_type: eventType };
  }

  /**
   * Check if delivery should be retried
   */
  private shouldRetryDelivery(delivery: any, retryPolicy: WebhookRetryPolicy): boolean {
    if (delivery.attempt_number >= retryPolicy.max_retries) {
      return false;
    }

    // Don't retry on certain error codes (4xx client errors)
    if (delivery.response_status && delivery.response_status >= 400 && delivery.response_status < 500) {
      return false;
    }

    return true;
  }

  /**
   * Calculate next retry time
   */
  private calculateNextRetry(delivery: any, retryPolicy: WebhookRetryPolicy): Date {
    const attemptIndex = Math.min(delivery.attempt_number, retryPolicy.retry_delays.length - 1);
    const delayMinutes = retryPolicy.retry_delays[attemptIndex];
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  /**
   * Update webhook endpoint statistics
   */
  private async updateWebhookStats(client: any, webhookEndpointId: string, success: boolean) {
    if (success) {
      await client.query(`
        UPDATE webhook_endpoints SET 
          last_delivery_at = NOW(),
          last_successful_delivery_at = NOW(),
          total_deliveries = total_deliveries + 1,
          successful_deliveries = successful_deliveries + 1,
          consecutive_failures = 0,
          updated_at = NOW()
        WHERE id = $1
      `, [webhookEndpointId]);
    } else {
      await client.query(`
        UPDATE webhook_endpoints SET 
          last_delivery_at = NOW(),
          total_deliveries = total_deliveries + 1,
          consecutive_failures = consecutive_failures + 1,
          updated_at = NOW()
        WHERE id = $1
      `, [webhookEndpointId]);
    }
  }

  /**
   * Get delivery statistics for webhook
   */
  private async getDeliveryStats(webhookEndpointId: string): Promise<WebhookDeliveryStats> {
    const result = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN delivery_status = 'success' THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed_deliveries,
        AVG(response_time_ms)::integer as avg_response_time_ms,
        MAX(delivered_at) as last_delivery_at,
        MAX(CASE WHEN delivery_status = 'success' THEN delivered_at END) as last_successful_delivery_at
      FROM webhook_deliveries
      WHERE webhook_endpoint_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
    `, [webhookEndpointId]);

    const stats = result.rows[0];
    const totalDeliveries = parseInt(stats.total_deliveries) || 0;
    const successfulDeliveries = parseInt(stats.successful_deliveries) || 0;

    // Get consecutive failures from webhook endpoint
    const endpointResult = await this.executeQuery(
      'SELECT consecutive_failures FROM webhook_endpoints WHERE id = $1',
      [webhookEndpointId]
    );

    return {
      total_deliveries: totalDeliveries,
      successful_deliveries: successfulDeliveries,
      failed_deliveries: parseInt(stats.failed_deliveries) || 0,
      success_rate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) : 0,
      avg_response_time_ms: parseInt(stats.avg_response_time_ms) || 0,
      last_delivery_at: stats.last_delivery_at?.toISOString(),
      last_successful_delivery_at: stats.last_successful_delivery_at?.toISOString(),
      consecutive_failures: endpointResult.rows[0]?.consecutive_failures || 0
    };
  }

  /**
   * Get recent deliveries for webhook
   */
  private async getRecentDeliveries(webhookEndpointId: string, limit: number = 10): Promise<WebhookDelivery[]> {
    const result = await this.executeQuery(`
      SELECT * FROM webhook_deliveries
      WHERE webhook_endpoint_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [webhookEndpointId, limit]);

    return result.rows.map(row => this.mapDeliveryFromDb(row));
  }

  /**
   * Get webhook health status
   */
  private async getWebhookHealth(webhookEndpointId: string): Promise<WebhookHealthStatus> {
    const stats = await this.getDeliveryStats(webhookEndpointId);
    
    // Calculate uptime percentage over last 24 hours
    const uptimeResult = await this.executeQuery(`
      SELECT 
        COUNT(CASE WHEN delivery_status = 'success' THEN 1 END) as successful_count,
        COUNT(*) as total_count
      FROM webhook_deliveries
      WHERE webhook_endpoint_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
    `, [webhookEndpointId]);

    const uptimeStats = uptimeResult.rows[0];
    const uptimePercentage = uptimeStats.total_count > 0 
      ? (uptimeStats.successful_count / uptimeStats.total_count)
      : 1;

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: WebhookIssue[] = [];

    if (stats.consecutive_failures >= 5) {
      status = 'unhealthy';
      issues.push({
        type: 'high_failure_rate',
        severity: 'high',
        message: `${stats.consecutive_failures} consecutive failures`,
        first_detected: new Date().toISOString(),
        last_detected: new Date().toISOString(),
        occurrences: stats.consecutive_failures
      });
    } else if (stats.success_rate < 0.9) {
      status = 'degraded';
      issues.push({
        type: 'high_failure_rate',
        severity: 'medium',
        message: `Success rate: ${(stats.success_rate * 100).toFixed(1)}%`,
        first_detected: new Date().toISOString(),
        last_detected: new Date().toISOString(),
        occurrences: stats.failed_deliveries
      });
    }

    if (stats.avg_response_time_ms > 10000) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push({
        type: 'high_latency',
        severity: 'medium',
        message: `Average response time: ${stats.avg_response_time_ms}ms`,
        first_detected: new Date().toISOString(),
        last_detected: new Date().toISOString(),
        occurrences: 1
      });
    }

    return {
      status,
      last_success_at: stats.last_successful_delivery_at,
      consecutive_failures: stats.consecutive_failures,
      avg_response_time_ms: stats.avg_response_time_ms,
      uptime_percentage: uptimePercentage,
      issues
    };
  }

  /**
   * Map database row to WebhookEndpoint
   */
  private mapWebhookFromDb(row: any): WebhookEndpoint {
    return {
      id: row.id,
      company_id: row.company_id,
      api_key_id: row.api_key_id,
      name: row.name,
      description: row.description,
      url: row.url,
      secret: row.secret,
      events: Array.isArray(row.events) ? row.events : JSON.parse(row.events || '[]'),
      event_filters: typeof row.event_filters === 'object' ? row.event_filters : JSON.parse(row.event_filters || '{}'),
      active: row.active,
      retry_policy: typeof row.retry_policy === 'object' ? row.retry_policy : JSON.parse(row.retry_policy || '{}'),
      timeout_seconds: row.timeout_seconds,
      custom_headers: typeof row.custom_headers === 'object' ? row.custom_headers : JSON.parse(row.custom_headers || '{}'),
      auth_type: row.auth_type,
      auth_config: typeof row.auth_config === 'object' ? row.auth_config : JSON.parse(row.auth_config || '{}'),
      last_delivery_at: row.last_delivery_at?.toISOString(),
      last_successful_delivery_at: row.last_successful_delivery_at?.toISOString(),
      consecutive_failures: row.consecutive_failures || 0,
      total_deliveries: row.total_deliveries || 0,
      successful_deliveries: row.successful_deliveries || 0,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      disabled_at: row.disabled_at?.toISOString(),
      disabled_reason: row.disabled_reason
    };
  }

  /**
   * Map database row to WebhookDelivery
   */
  private mapDeliveryFromDb(row: any): WebhookDelivery {
    return {
      id: row.id,
      webhook_endpoint_id: row.webhook_endpoint_id,
      event_type: row.event_type,
      event_data: typeof row.event_data === 'object' ? row.event_data : JSON.parse(row.event_data || '{}'),
      event_id: row.event_id,
      attempt_number: row.attempt_number,
      delivery_status: row.delivery_status,
      request_headers: typeof row.request_headers === 'object' ? row.request_headers : JSON.parse(row.request_headers || '{}'),
      request_body: typeof row.request_body === 'object' ? row.request_body : JSON.parse(row.request_body || '{}'),
      response_status: row.response_status,
      response_headers: typeof row.response_headers === 'object' ? row.response_headers : JSON.parse(row.response_headers || '{}'),
      response_body: row.response_body,
      response_time_ms: row.response_time_ms,
      error_message: row.error_message,
      error_code: row.error_code,
      scheduled_at: row.scheduled_at.toISOString(),
      delivered_at: row.delivered_at?.toISOString(),
      next_retry_at: row.next_retry_at?.toISOString(),
      created_at: row.created_at.toISOString()
    };
  }
}

export const webhookService = new WebhookService();