/**
 * Webhook Service
 * Comprehensive webhook management including delivery, retries, and health monitoring
 */

import { z } from 'zod';
import crypto from 'crypto';
import { BaseService } from './base/BaseService';
import { supabase } from './supabase';
import {
  WebhookEndpoint,
  WebhookEndpointDetails,
  WebhookDelivery,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  TestWebhookRequest,
  TestWebhookResponse,
  WebhookEvent,
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
  event_filters: z.record(z.string(), z.any()).optional(),
  secret: z.string().min(8).optional(),
  retry_policy: z.object({
    max_retries: z.number().min(0).max(10).optional(),
    retry_delays: z.array(z.number().min(1).max(1440)).optional(),
    retry_on_statuses: z.array(z.number().min(400).max(599)).optional()
  }).optional(),
  timeout_seconds: z.number().min(1).max(300).optional(),
  custom_headers: z.record(z.string(), z.string()).optional(),
  auth_type: z.enum(['signature', 'bearer', 'basic', 'none']).optional(),
  auth_config: z.record(z.string(), z.any()).optional()
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  event_filters: z.record(z.string(), z.any()).optional(),
  active: z.boolean().optional(),
  retry_policy: z.object({
    max_retries: z.number().min(0).max(10).optional(),
    retry_delays: z.array(z.number().min(1).max(1440)).optional(),
    retry_on_statuses: z.array(z.number().min(400).max(599)).optional()
  }).optional(),
  timeout_seconds: z.number().min(1).max(300).optional(),
  custom_headers: z.record(z.string(), z.string()).optional(),
  auth_type: z.enum(['signature', 'bearer', 'basic', 'none']).optional(),
  auth_config: z.record(z.string(), z.any()).optional()
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

    return this.executeWithTransaction(async () => {
      // Validate events exist
      await this.validateEvents(validatedRequest.events);

      // Check for duplicate names within company
      const { data: existingWebhook, error: existingError } = await supabase
        .from('webhook_endpoints')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', validatedRequest.name) as { data: Array<{ id: string }> | null, error: any };

      if (existingError) {
        throw new Error(`Failed to check for existing webhook: ${existingError.message}`);
      }

      if (existingWebhook && existingWebhook.length > 0) {
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
      const { data: result, error: insertError } = await supabase
        .from('webhook_endpoints')
        .insert({
          company_id: companyId,
          api_key_id: apiKeyId,
          name: validatedRequest.name,
          description: validatedRequest.description,
          url: validatedRequest.url,
          secret: secret,
          events: validatedRequest.events,
          event_filters: validatedRequest.event_filters || {},
          retry_policy: retryPolicy,
          timeout_seconds: validatedRequest.timeout_seconds || 30,
          custom_headers: validatedRequest.custom_headers || {},
          auth_type: validatedRequest.auth_type || 'signature',
          auth_config: validatedRequest.auth_config || {}
        })
        .select()
        .single() as { data: any | null, error: any };

      if (insertError) {
        throw new Error(`Failed to create webhook: ${insertError.message}`);
      }

      const webhook = this.mapWebhookFromDb(result);

      // Log webhook creation
      this.logOperation('webhook.created', webhook.id, companyId, {
        webhook_name: webhook.name,
        url: webhook.url,
        events: webhook.events
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

    const { data: countResult, error: countError } = await supabase
      .from('webhook_endpoints')
      .select('*', { count: 'exact', head: true }) as { data: any[] | null, error: any };
    
    if (countError) {
      throw new Error(`Failed to count webhooks: ${countError.message}`);
    }

    const total = countResult?.length || 0;

    let query = supabase
      .from('webhook_endpoints')
      .select('*, api_keys(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (options?.active !== undefined) {
      query = query.eq('active', options.active);
    }
    
    const { data: result, error } = await query as { data: any[] | null, error: any };
    
    if (error) {
      throw new Error(`Failed to list webhooks: ${error.message}`);
    }

    const webhooks = (result || []).map(row => this.mapWebhookFromDb(row));

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
    const { data: result, error } = await supabase
      .from('webhook_endpoints')
      .select('*, api_keys(name)')
      .eq('id', webhookId)
      .eq('company_id', companyId)
      .single() as { data: any | null, error: any };

    if (error || !result) {
      throw new Error('Webhook not found');
    }

    const webhook = this.mapWebhookFromDb(result);

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

    return this.executeWithTransaction(async () => {
      // Check webhook exists and belongs to company
      const { data: existing, error: existingError } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('id', webhookId)
        .eq('company_id', companyId)
        .single() as { data: any | null, error: any };

      if (existingError || !existing) {
        throw new Error('Webhook not found');
      }

      // Validate events if provided
      if (validatedRequest.events) {
        await this.validateEvents(validatedRequest.events);
      }

      // Check for name conflicts if name is being updated
      if (validatedRequest.name && validatedRequest.name !== existing.name) {
        const { data: nameCheck } = await supabase
          .from('webhook_endpoints')
          .select('id')
          .eq('company_id', companyId)
          .eq('name', validatedRequest.name)
          .neq('id', webhookId) as { data: Array<{ id: string }> | null, error: any };

        if (nameCheck && nameCheck.length > 0) {
          throw new Error(`Webhook with name '${validatedRequest.name}' already exists`);
        }
      }

      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (validatedRequest.name !== undefined) {
        updateData.name = validatedRequest.name;
      }

      if (validatedRequest.description !== undefined) {
        updateData.description = validatedRequest.description;
      }

      if (validatedRequest.url !== undefined) {
        updateData.url = validatedRequest.url;
      }

      if (validatedRequest.events !== undefined) {
        updateData.events = validatedRequest.events;
      }

      if (validatedRequest.event_filters !== undefined) {
        updateData.event_filters = validatedRequest.event_filters;
      }

      if (validatedRequest.active !== undefined) {
        updateData.active = validatedRequest.active;
        
        if (!validatedRequest.active) {
          updateData.disabled_at = new Date().toISOString();
          updateData.disabled_reason = 'Manually disabled via API';
        } else if (existing.disabled_at) {
          updateData.disabled_at = null;
          updateData.disabled_reason = null;
        }
      }

      if (validatedRequest.retry_policy !== undefined) {
        const retryPolicy = {
          ...this.defaultRetryPolicy,
          ...validatedRequest.retry_policy
        };
        updateData.retry_policy = retryPolicy;
      }

      if (validatedRequest.timeout_seconds !== undefined) {
        updateData.timeout_seconds = validatedRequest.timeout_seconds;
      }

      if (validatedRequest.custom_headers !== undefined) {
        updateData.custom_headers = validatedRequest.custom_headers;
      }

      if (validatedRequest.auth_type !== undefined) {
        updateData.auth_type = validatedRequest.auth_type;
      }

      if (validatedRequest.auth_config !== undefined) {
        updateData.auth_config = validatedRequest.auth_config;
      }

      if (Object.keys(updateData).length === 1) { // Only has updated_at
        throw new Error('No fields to update');
      }

      const { data: updateResult, error: updateError } = await supabase
        .from('webhook_endpoints')
        .update(updateData)
        .eq('id', webhookId)
        .eq('company_id', companyId)
        .select()
        .single() as { data: any | null, error: any };

      if (updateError) {
        throw new Error(`Failed to update webhook: ${updateError.message}`);
      }

      const updatedWebhook = this.mapWebhookFromDb(updateResult);

      // Log the update
      this.logOperation('webhook.updated', webhookId, companyId, {
        webhook_name: updatedWebhook.name,
        changes: validatedRequest
      });

      return updatedWebhook;
    });
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(companyId: string, webhookId: string): Promise<void> {
    return this.executeWithTransaction(async () => {
      const { data: result, error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', webhookId)
        .eq('company_id', companyId)
        .select('name')
        .single() as { data: any | null, error: any };

      if (error || !result) {
        throw new Error('Webhook not found');
      }

      // Log the deletion
      this.logOperation('webhook.deleted', webhookId, companyId, {
        webhook_name: result.name
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
    const { data: result, error } = await supabase
      .rpc('queue_webhook_delivery', {
        p_company_id: companyId,
        p_event_type: eventType,
        p_event_data: JSON.stringify(eventData),
        p_event_id: eventId
      }) as { data: any, error: any };

    if (error) {
      throw new Error(`Failed to queue webhook delivery: ${error.message}`);
    }

    return result || 0;
  }

  /**
   * Process pending webhook deliveries
   */
  async processPendingDeliveries(limit: number = 100): Promise<number> {
    const { data: result, error } = await supabase
      .from('webhook_deliveries')
      .select('id, webhook_endpoint_id, event_type, event_data, event_id, attempt_number')
      .or('delivery_status.eq.pending,and(delivery_status.eq.retrying,next_retry_at.lte.now())')
      .order('scheduled_at', { ascending: true })
      .limit(limit) as { data: any[] | null, error: any };

    if (error) {
      throw new Error(`Failed to fetch pending deliveries: ${error.message}`);
    }

    let processedCount = 0;

    for (const delivery of result || []) {
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
    return this.executeWithTransaction(async () => {
      // Get delivery details
      const { data: delivery, error } = await supabase
        .from('webhook_deliveries')
        .select(`
          *,
          webhook_endpoints!inner(
            url, secret, retry_policy, timeout_seconds,
            custom_headers, auth_type, auth_config
          )
        `)
        .eq('id', deliveryId)
        .single() as { data: any | null, error: any };

      if (error || !delivery) {
        throw new Error('Delivery not found');
      }
      const webhook = delivery.webhook_endpoints;

      try {
        // Mark as in progress
        await supabase
          .from('webhook_deliveries')
          .update({ 
            delivery_status: 'processing',
            delivered_at: new Date().toISOString()
          } as any)
          .eq('id', deliveryId);

        // Make HTTP request
        const deliveryResult = await this.makeWebhookRequest(
          webhook,
          delivery.request_body,
          delivery.event_id
        );

        // Update delivery record with success
        await supabase
          .from('webhook_deliveries')
          .update({
            delivery_status: 'success',
            response_status: deliveryResult.status,
            response_headers: deliveryResult.headers,
            response_body: deliveryResult.body,
            response_time_ms: deliveryResult.responseTime,
            delivered_at: new Date().toISOString()
          } as any)
          .eq('id', deliveryId);

        // Update webhook endpoint stats
        await this.updateWebhookStats(delivery.webhook_endpoint_id, true);

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
          
          await supabase
            .from('webhook_deliveries')
            .update({
              delivery_status: 'retrying',
              error_message: errorMessage,
              next_retry_at: nextRetryAt.toISOString()
            } as any)
            .eq('id', deliveryId);
        } else {
          await supabase
            .from('webhook_deliveries')
            .update({
              delivery_status: 'failed',
              error_message: errorMessage,
              delivered_at: new Date().toISOString()
            } as any)
            .eq('id', deliveryId);

          // Update webhook endpoint stats
          await this.updateWebhookStats(delivery.webhook_endpoint_id, false);
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
    const { data: result, error } = await supabase
      .from('webhook_events')
      .select('event_type')
      .in('event_type', events) as { data: Array<{ event_type: string }> | null, error: any };

    if (error) {
      throw new Error(`Failed to validate events: ${error.message}`);
    }

    const validEvents = (result || []).map(row => row.event_type);
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
    const { data: result, error } = await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_endpoint_id: webhookEndpointId,
        event_type: eventType,
        event_data: eventData,
        event_id: eventId,
        request_body: {
          event_type: eventType,
          event_id: eventId,
          data: eventData,
          timestamp: new Date().toISOString(),
          test: isTest
        },
        scheduled_at: new Date().toISOString()
      })
      .select('id')
      .single() as { data: { id: string } | null, error: any };

    if (error) {
      throw new Error(`Failed to queue delivery: ${error.message}`);
    }

    return result?.id || '';
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
  private async updateWebhookStats(webhookEndpointId: string, success: boolean) {
    if (success) {
      await supabase.rpc('update_webhook_stats_success', {
        p_webhook_id: webhookEndpointId
      } as any);
    } else {
      await supabase.rpc('update_webhook_stats_failure', {
        p_webhook_id: webhookEndpointId
      } as any);
    }
  }

  /**
   * Get delivery statistics for webhook
   */
  private async getDeliveryStats(webhookEndpointId: string): Promise<WebhookDeliveryStats> {
    const { data: stats, error: statsError } = await (supabase as any)
      .rpc('get_webhook_delivery_stats', {
        p_webhook_id: webhookEndpointId
      });

    if (statsError) {
      throw new Error(`Failed to get delivery stats: ${statsError.message}`);
    }

    const totalDeliveries = parseInt(stats?.total_deliveries) || 0;
    const successfulDeliveries = parseInt(stats?.successful_deliveries) || 0;

    // Get consecutive failures from webhook endpoint
    const { data: endpointResult, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select('consecutive_failures')
      .eq('id', webhookEndpointId)
      .single() as { data: { consecutive_failures: number } | null, error: any };

    if (endpointError) {
      console.error('Failed to get consecutive failures:', endpointError);
    }

    return {
      total_deliveries: totalDeliveries,
      successful_deliveries: successfulDeliveries,
      failed_deliveries: parseInt(stats?.failed_deliveries) || 0,
      success_rate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) : 0,
      avg_response_time_ms: parseInt(stats?.avg_response_time_ms) || 0,
      last_delivery_at: stats?.last_delivery_at,
      last_successful_delivery_at: stats?.last_successful_delivery_at,
      consecutive_failures: endpointResult?.consecutive_failures || 0
    };
  }

  /**
   * Get recent deliveries for webhook
   */
  private async getRecentDeliveries(webhookEndpointId: string, limit: number = 10): Promise<WebhookDelivery[]> {
    const { data: result, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_endpoint_id', webhookEndpointId)
      .order('created_at', { ascending: false })
      .limit(limit) as { data: any[] | null, error: any };

    if (error) {
      throw new Error(`Failed to get recent deliveries: ${error.message}`);
    }

    return (result || []).map(row => this.mapDeliveryFromDb(row));
  }

  /**
   * Get webhook health status
   */
  private async getWebhookHealth(webhookEndpointId: string): Promise<WebhookHealthStatus> {
    const stats = await this.getDeliveryStats(webhookEndpointId);
    
    // Calculate uptime percentage over last 24 hours
    const { data: uptimeResult, error: uptimeError } = await (supabase as any)
      .rpc('get_webhook_uptime_stats', {
        p_webhook_id: webhookEndpointId
      });

    if (uptimeError) {
      console.error('Failed to get uptime stats:', uptimeError);
    }

    const uptimeStats = uptimeResult || { successful_count: 0, total_count: 0 };
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