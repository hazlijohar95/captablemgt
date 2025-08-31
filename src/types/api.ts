/**
 * TypeScript types for API Infrastructure
 * Comprehensive type definitions for API management, webhooks, and integration
 */

// ============================================
// API Key Management Types
// ============================================

export interface ApiKey {
  id: string;
  company_id: string;
  key_id: string; // Public identifier (e.g., ak_live_abc123...)
  name: string;
  description?: string;
  environment: ApiEnvironment;
  scopes: ApiScope[];
  permissions: ApiPermissions;
  last_used_at?: string;
  last_used_ip?: string;
  usage_count: number;
  rate_limit_tier: RateLimitTier;
  custom_rate_limit?: number;
  status: ApiKeyStatus;
  expires_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  revoked_at?: string;
  revoked_by?: string;
  revoked_reason?: string;
}

export interface ApiKeyDetails extends ApiKey {
  usage_statistics: ApiKeyUsageStats;
  recent_requests: ApiRequestSummary[];
  rate_limit_info: RateLimitInfo;
}

export interface ApiKeyUsageStats {
  requests_today: number;
  requests_this_week: number;
  requests_this_month: number;
  avg_response_time_ms: number;
  error_rate: number;
  most_used_endpoints: EndpointUsage[];
  geographic_usage: GeographicUsage[];
}

export interface EndpointUsage {
  endpoint: string;
  method: string;
  request_count: number;
  avg_response_time_ms: number;
  error_rate: number;
}

export interface GeographicUsage {
  country_code: string;
  country_name: string;
  request_count: number;
  percentage: number;
}

export type ApiEnvironment = 'sandbox' | 'production';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export type RateLimitTier = 'standard' | 'premium' | 'enterprise';

export type ApiScope = 
  | 'companies:read' | 'companies:write'
  | 'stakeholders:read' | 'stakeholders:write'
  | 'securities:read' | 'securities:write'
  | 'transactions:read' | 'transactions:write'
  | 'reports:read' | 'reports:write'
  | 'valuations:read' | 'valuations:write'
  | 'api_keys:manage'
  | 'webhooks:manage' | 'webhooks:receive';

export interface ApiPermissions {
  companies?: CompanyPermissions;
  stakeholders?: StakeholderPermissions;
  securities?: SecurityPermissions;
  transactions?: TransactionPermissions;
  reports?: ReportPermissions;
  webhooks?: WebhookPermissions;
}

export interface CompanyPermissions {
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  company_ids?: string[]; // Restrict to specific companies
}

export interface StakeholderPermissions {
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  pii_access: boolean; // Access to personally identifiable information
}

export interface SecurityPermissions {
  read: boolean;
  issue: boolean;
  transfer: boolean;
  cancel: boolean;
  exercise: boolean;
}

export interface TransactionPermissions {
  read: boolean;
  create: boolean;
  modify: boolean;
  delete: boolean;
}

export interface ReportPermissions {
  generate: boolean;
  download: boolean;
  share: boolean;
  report_types: ReportType[];
}

export interface WebhookPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  test: boolean;
}

// ============================================
// Rate Limiting Types
// ============================================

export interface RateLimitTierConfig {
  tier: RateLimitTier;
  requests_per_hour: number;
  burst_limit: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface RateLimitInfo {
  tier: RateLimitTier;
  requests_per_hour: number;
  burst_limit: number;
  current_usage: {
    requests_this_hour: number;
    requests_this_minute: number;
  };
  remaining: number;
  reset_at: string;
  over_limit: boolean;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  reset_at: string;
  retry_after?: number; // Seconds to wait before retrying
}

// ============================================
// API Request Logging Types
// ============================================

export interface ApiRequestLog {
  id: string;
  api_key_id?: string;
  company_id?: string;
  request_id: string;
  method: string;
  endpoint: string;
  path_params: Record<string, any>;
  query_params: Record<string, any>;
  headers: Record<string, string>;
  request_body?: any;
  request_size_bytes: number;
  status_code: number;
  response_body?: any;
  response_size_bytes: number;
  response_time_ms: number;
  ip_address: string;
  user_agent?: string;
  referer?: string;
  country_code?: string;
  region?: string;
  city?: string;
  isp?: string;
  error_code?: string;
  error_message?: string;
  error_details?: any;
  rate_limit_hit: boolean;
  rate_limit_remaining?: number;
  rate_limit_reset_at?: string;
  created_at: string;
}

export interface ApiRequestSummary {
  id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  created_at: string;
}

export interface ApiMetrics {
  time_period: {
    start_date: string;
    end_date: string;
  };
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  error_rate: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  top_endpoints: EndpointMetric[];
  top_errors: ErrorMetric[];
  request_volume_timeline: VolumeDataPoint[];
  geographic_distribution: GeographicUsage[];
}

export interface EndpointMetric {
  endpoint: string;
  method: string;
  request_count: number;
  avg_response_time_ms: number;
  error_rate: number;
  success_rate: number;
}

export interface ErrorMetric {
  error_code: string;
  error_message: string;
  count: number;
  percentage: number;
  first_seen: string;
  last_seen: string;
}

export interface VolumeDataPoint {
  timestamp: string;
  request_count: number;
  avg_response_time_ms: number;
  error_count: number;
}

// ============================================
// Webhook Types
// ============================================

export interface WebhookEndpoint {
  id: string;
  company_id: string;
  api_key_id: string;
  name: string;
  description?: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  event_filters: Record<string, any>;
  active: boolean;
  retry_policy: WebhookRetryPolicy;
  timeout_seconds: number;
  custom_headers: Record<string, string>;
  auth_type: WebhookAuthType;
  auth_config: Record<string, any>;
  last_delivery_at?: string;
  last_successful_delivery_at?: string;
  consecutive_failures: number;
  total_deliveries: number;
  successful_deliveries: number;
  created_at: string;
  updated_at: string;
  disabled_at?: string;
  disabled_reason?: string;
}

export interface WebhookEndpointDetails extends WebhookEndpoint {
  delivery_stats: WebhookDeliveryStats;
  recent_deliveries: WebhookDelivery[];
  health_status: WebhookHealthStatus;
}

export interface WebhookRetryPolicy {
  max_retries: number;
  retry_delays: number[]; // Delays in minutes for each retry attempt
  retry_on_statuses: number[]; // HTTP status codes that should trigger retries
}

export type WebhookAuthType = 'signature' | 'bearer' | 'basic' | 'none';

export type WebhookEvent = 
  | 'company.created' | 'company.updated'
  | 'stakeholder.created' | 'stakeholder.updated'
  | 'security.issued' | 'security.exercised' | 'security.transferred'
  | 'transaction.created'
  | 'valuation.created'
  | 'report.generated';

export interface WebhookEventDefinition {
  event_type: WebhookEvent;
  name: string;
  description: string;
  category: WebhookEventCategory;
  payload_schema: any; // JSON Schema
  created_at: string;
  updated_at: string;
}

export type WebhookEventCategory = 'company' | 'stakeholder' | 'security' | 'transaction' | 'valuation' | 'report';

export interface WebhookDelivery {
  id: string;
  webhook_endpoint_id: string;
  event_type: WebhookEvent;
  event_data: any;
  event_id: string;
  attempt_number: number;
  delivery_status: WebhookDeliveryStatus;
  request_headers: Record<string, string>;
  request_body: any;
  response_status?: number;
  response_headers?: Record<string, string>;
  response_body?: string;
  response_time_ms?: number;
  error_message?: string;
  error_code?: string;
  scheduled_at: string;
  delivered_at?: string;
  next_retry_at?: string;
  created_at: string;
}

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface WebhookDeliveryStats {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  avg_response_time_ms: number;
  last_delivery_at?: string;
  last_successful_delivery_at?: string;
  consecutive_failures: number;
}

export interface WebhookHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_success_at?: string;
  consecutive_failures: number;
  avg_response_time_ms: number;
  uptime_percentage: number; // Over the last 24 hours
  issues: WebhookIssue[];
}

export interface WebhookIssue {
  type: 'high_latency' | 'high_failure_rate' | 'timeout' | 'authentication_failed';
  severity: 'low' | 'medium' | 'high';
  message: string;
  first_detected: string;
  last_detected: string;
  occurrences: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  environment: ApiEnvironment;
  scopes: ApiScope[];
  permissions?: Partial<ApiPermissions>;
  rate_limit_tier?: RateLimitTier;
  custom_rate_limit?: number;
  expires_at?: string;
}

export interface CreateApiKeyResponse {
  api_key: ApiKey;
  key_id: string;
  secret_key: string; // Only returned once!
  warning: string; // Security warning about storing the secret
}

export interface UpdateApiKeyRequest {
  name?: string;
  description?: string;
  scopes?: ApiScope[];
  permissions?: Partial<ApiPermissions>;
  rate_limit_tier?: RateLimitTier;
  custom_rate_limit?: number;
  expires_at?: string;
  status?: ApiKeyStatus;
}

export interface RevokeApiKeyRequest {
  reason: string;
}

export interface CreateWebhookRequest {
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  event_filters?: Record<string, any>;
  secret?: string; // If not provided, will be generated
  retry_policy?: Partial<WebhookRetryPolicy>;
  timeout_seconds?: number;
  custom_headers?: Record<string, string>;
  auth_type?: WebhookAuthType;
  auth_config?: Record<string, any>;
}

export interface UpdateWebhookRequest {
  name?: string;
  description?: string;
  url?: string;
  events?: WebhookEvent[];
  event_filters?: Record<string, any>;
  active?: boolean;
  retry_policy?: Partial<WebhookRetryPolicy>;
  timeout_seconds?: number;
  custom_headers?: Record<string, string>;
  auth_type?: WebhookAuthType;
  auth_config?: Record<string, any>;
}

export interface TestWebhookRequest {
  event_type: WebhookEvent;
  test_data?: any; // Optional test payload
}

export interface TestWebhookResponse {
  delivery_id: string;
  status: WebhookDeliveryStatus;
  response_status?: number;
  response_time_ms?: number;
  error_message?: string;
}

// ============================================
// API Error Types
// ============================================

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
  request_id: string;
  timestamp: string;
}

export interface ValidationError extends ApiError {
  error: 'validation_error';
  validation_errors: FieldError[];
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface RateLimitError extends ApiError {
  error: 'rate_limit_exceeded';
  rate_limit_info: RateLimitInfo;
  retry_after: number; // Seconds
}

export interface AuthenticationError extends ApiError {
  error: 'authentication_failed' | 'invalid_api_key' | 'api_key_revoked' | 'api_key_expired';
}

export interface AuthorizationError extends ApiError {
  error: 'authorization_failed' | 'insufficient_scope' | 'access_denied';
  required_scope?: ApiScope;
  required_permission?: string;
}

// ============================================
// Pagination and Query Types
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  pagination: PaginationResponse;
  meta?: Record<string, any>;
}

export interface ApiMetricsQuery {
  start_date: string;
  end_date: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  endpoint_pattern?: string;
  method?: string;
  status_code?: number;
  api_key_id?: string;
  company_id?: string;
}

export interface WebhookDeliveryQuery extends PaginationParams {
  webhook_endpoint_id?: string;
  event_type?: WebhookEvent;
  delivery_status?: WebhookDeliveryStatus;
  start_date?: string;
  end_date?: string;
}

// ============================================
// Developer Portal Types
// ============================================

export interface ApiKeyListView {
  id: string;
  name: string;
  environment: ApiEnvironment;
  key_id: string;
  scopes: ApiScope[];
  rate_limit_tier: RateLimitTier;
  status: ApiKeyStatus;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
}

export interface DeveloperPortalStats {
  total_api_keys: number;
  active_api_keys: number;
  total_requests_today: number;
  total_requests_this_month: number;
  avg_response_time_ms: number;
  error_rate: number;
  total_webhooks: number;
  active_webhooks: number;
  webhook_success_rate: number;
}

export interface SandboxInfo {
  environment: 'sandbox';
  base_url: string;
  test_data_available: boolean;
  reset_schedule: string; // When test data is reset
  limitations: string[];
  sample_requests: SampleApiRequest[];
}

export interface SampleApiRequest {
  name: string;
  description: string;
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  body?: any;
  expected_response: any;
}

// ============================================
// Integration Health Types
// ============================================

export interface IntegrationHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  api_health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    avg_response_time_ms: number;
    error_rate: number;
    uptime_percentage: number;
  };
  webhook_health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    total_endpoints: number;
    healthy_endpoints: number;
    avg_delivery_time_ms: number;
    success_rate: number;
  };
  rate_limiting_health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    keys_near_limit: number;
    keys_over_limit: number;
  };
  last_updated: string;
}

// ============================================
// Audit and Compliance Types
// ============================================

export interface ApiAuditLog {
  id: string;
  action: ApiAuditAction;
  resource_type: string;
  resource_id: string;
  api_key_id?: string;
  company_id: string;
  user_id?: string;
  ip_address: string;
  user_agent?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

export type ApiAuditAction = 
  | 'api_key.created' | 'api_key.updated' | 'api_key.revoked'
  | 'webhook.created' | 'webhook.updated' | 'webhook.deleted'
  | 'data.accessed' | 'data.modified' | 'data.exported'
  | 'integration.enabled' | 'integration.disabled';

export interface ComplianceReport {
  company_id: string;
  report_period: {
    start_date: string;
    end_date: string;
  };
  api_usage_summary: {
    total_requests: number;
    unique_api_keys: number;
    data_accessed: string[];
    data_modified: string[];
  };
  webhook_activity: {
    total_deliveries: number;
    unique_endpoints: number;
    events_sent: WebhookEvent[];
  };
  security_events: {
    failed_authentications: number;
    rate_limit_violations: number;
    suspicious_activities: SecurityEvent[];
  };
  generated_at: string;
}

export interface SecurityEvent {
  type: 'rate_limit_exceeded' | 'invalid_api_key' | 'unusual_access_pattern' | 'geographic_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  api_key_id?: string;
  ip_address?: string;
  detected_at: string;
  resolved_at?: string;
}

// ============================================
// SDK and Integration Types
// ============================================

export interface SdkConfiguration {
  language: 'javascript' | 'python' | 'php' | 'ruby' | 'java' | 'go' | 'csharp';
  version: string;
  base_url: string;
  api_key: string;
  timeout_ms: number;
  retry_config: {
    max_retries: number;
    retry_delays: number[];
  };
  webhook_config?: {
    secret: string;
    tolerance_ms: number; // For timestamp verification
  };
}

export type ReportType = 'CAP_TABLE' | 'OWNERSHIP_SUMMARY' | 'TRANSACTION_HISTORY' | 'DILUTION_ANALYSIS' | 'BOARD_PACKAGE';