/**
 * Comprehensive Audit Service
 * Manages audit trails, compliance logging, and security monitoring
 */

import { supabase } from './supabase';
import { 
  AuditLogEntry, 
  AuditEventType, 
  AuditEntityType,
  AuditCalculation,
  AuditDocument,
  AuditTrailFilters,
  AuditTrailResponse,
  DataClassification,
  CalculationType,
  ValidationStatus
} from '@/types/valuation409a';

export interface CreateAuditLogRequest {
  event_type: AuditEventType;
  entity_type: AuditEntityType;
  entity_id: string;
  company_id?: string;
  user_id?: string;
  field_name?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  change_summary?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  data_classification?: DataClassification;
  metadata?: Record<string, any>;
}

export interface CreateCalculationAuditRequest {
  calculation_type: CalculationType;
  company_id: string;
  triggered_by_entity_type?: string;
  triggered_by_entity_id?: string;
  input_parameters: Record<string, any>;
  output_results: Record<string, any>;
  calculation_method?: string;
  validation_status?: ValidationStatus;
  validation_messages?: string[];
  execution_time_ms?: number;
  memory_usage_mb?: number;
  calculated_by?: string;
  regulatory_framework?: string;
  calculation_version?: string;
}

export interface CreateDocumentAuditRequest {
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_hash: string;
  mime_type?: string;
  company_id: string;
  related_entity_type?: string;
  related_entity_id?: string;
  classification_level?: string;
  access_permissions?: Record<string, any>;
  uploaded_by?: string;
  retention_period_years?: number;
  legal_hold?: boolean;
}

export class AuditService {
  /**
   * Log a general audit event
   */
  async logEvent(event: CreateAuditLogRequest): Promise<AuditLogEntry> {
    const auditEntry = {
      event_id: this.generateEventId(),
      event_type: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      company_id: event.company_id,
      user_id: event.user_id,
      field_name: event.field_name,
      old_value: event.old_value,
      new_value: event.new_value,
      change_summary: event.change_summary,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      session_id: event.session_id,
      request_id: event.request_id,
      data_classification: event.data_classification || 'INTERNAL',
      retention_period_years: this.getRetentionPeriod(event.entity_type, event.data_classification),
      occurred_at: new Date().toISOString(),
      metadata: event.metadata
    };

    const { data, error } = await supabase
      .from('audit_log')
      .insert(auditEntry)
      .select()
      .single();

    if (error) {
      console.error('Failed to create audit log entry:', error);
      // Don't throw here - audit logging should not break business logic
      throw new Error(`Audit logging failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Log a financial calculation for audit trail
   */
  async logCalculation(calculation: CreateCalculationAuditRequest): Promise<AuditCalculation> {
    const calculationAudit = {
      ...calculation,
      input_data_hash: this.hashObject(calculation.input_parameters),
      calculated_at: new Date().toISOString(),
      validation_status: calculation.validation_status || 'VALID'
    };

    const { data, error } = await supabase
      .from('audit_calculations')
      .insert(calculationAudit)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log calculation: ${error.message}`);
    }

    // Also log in general audit trail for major calculations
    if (this.isMajorCalculationType(calculation.calculation_type)) {
      await this.logEvent({
        event_type: 'CALCULATION',
        entity_type: 'WATERFALL_ANALYSIS', // Generic for calculations
        entity_id: data.id,
        company_id: calculation.company_id,
        user_id: calculation.calculated_by,
        change_summary: `${calculation.calculation_type} calculation performed`,
        data_classification: 'CONFIDENTIAL',
        metadata: {
          calculation_type: calculation.calculation_type,
          execution_time_ms: calculation.execution_time_ms,
          validation_status: calculation.validation_status
        }
      });
    }

    return data;
  }

  /**
   * Log document access and management
   */
  async logDocumentEvent(document: CreateDocumentAuditRequest): Promise<AuditDocument> {
    const documentAudit = {
      ...document,
      uploaded_at: new Date().toISOString(),
      accessed_count: 0,
      retention_period_years: document.retention_period_years || 7,
      legal_hold: document.legal_hold || false,
      version: 1
    };

    const { data, error } = await supabase
      .from('audit_documents')
      .insert(documentAudit)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log document: ${error.message}`);
    }

    // Log document upload in general audit trail
    await this.logEvent({
      event_type: 'CREATE',
      entity_type: 'REPORT',
      entity_id: data.id,
      company_id: document.company_id,
      user_id: document.uploaded_by,
      change_summary: `Document uploaded: ${document.file_name}`,
      data_classification: (document.classification_level as DataClassification) || 'CONFIDENTIAL',
      metadata: {
        document_type: document.document_type,
        file_size: document.file_size,
        mime_type: document.mime_type
      }
    });

    return data;
  }

  /**
   * Log document access
   */
  async logDocumentAccess(documentId: string, userId?: string): Promise<void> {
    // Update access tracking
    const { error: updateError } = await supabase
      .from('audit_documents')
      .update({
        accessed_count: supabase.raw('accessed_count + 1'),
        last_accessed_at: new Date().toISOString(),
        last_accessed_by: userId
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document access count:', updateError);
    }

    // Get document details for audit logging
    const { data: document, error: fetchError } = await supabase
      .from('audit_documents')
      .select('file_name, company_id, document_type')
      .eq('id', documentId)
      .single();

    if (!fetchError && document) {
      await this.logEvent({
        event_type: 'VIEW',
        entity_type: 'REPORT',
        entity_id: documentId,
        company_id: document.company_id,
        user_id: userId,
        change_summary: `Document accessed: ${document.file_name}`,
        data_classification: 'CONFIDENTIAL'
      });
    }
  }

  /**
   * Get audit trail with filtering and pagination
   */
  async getAuditTrail(
    companyId: string,
    filters: AuditTrailFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<AuditTrailResponse> {
    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);

    // Apply filters
    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }

    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.date_from) {
      query = query.gte('occurred_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('occurred_at', filters.date_to);
    }

    if (filters.data_classification) {
      query = query.eq('data_classification', filters.data_classification);
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query
      .order('occurred_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: entries, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get audit trail: ${error.message}`);
    }

    // Get summary statistics
    const summaryQuery = supabase
      .from('audit_log')
      .select('event_type, entity_type, user_id, entity_id')
      .eq('company_id', companyId);

    if (filters.date_from) {
      summaryQuery.gte('occurred_at', filters.date_from);
    }

    if (filters.date_to) {
      summaryQuery.lte('occurred_at', filters.date_to);
    }

    const { data: summaryData } = await summaryQuery;

    // Calculate summary statistics
    const event_type_breakdown = this.calculateEventTypeBreakdown(summaryData || []);
    const entity_type_breakdown = this.calculateEntityTypeBreakdown(summaryData || []);
    const unique_users = new Set((summaryData || []).map(item => item.user_id).filter(Boolean)).size;
    const unique_entities = new Set((summaryData || []).map(item => item.entity_id)).size;

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      entries: entries || [],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      },
      summary: {
        total_events: totalItems,
        unique_users,
        unique_entities,
        event_type_breakdown,
        entity_type_breakdown
      }
    };
  }

  /**
   * Log error events for debugging and monitoring
   */
  async logError(
    operation: string, 
    error: Error | any, 
    context?: Record<string, any>
  ): Promise<void> {
    const errorEntry = {
      event_type: 'ERROR' as AuditEventType,
      entity_type: 'SYSTEM' as AuditEntityType,
      entity_id: this.generateEventId(),
      company_id: context?.company_id,
      user_id: context?.user_id,
      change_summary: `Error in ${operation}: ${error.message || error}`,
      data_classification: 'INTERNAL' as DataClassification,
      metadata: {
        operation,
        error_message: error.message,
        error_stack: error.stack,
        ...context
      }
    };

    try {
      await this.logEvent(errorEntry);
    } catch (auditError) {
      console.error('Failed to log error to audit trail:', auditError);
      // Continue - don't fail the original operation due to audit logging issues
    }
  }

  /**
   * Export audit data for compliance reporting
   */
  async exportAuditData(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    format: 'CSV' | 'JSON' = 'JSON'
  ): Promise<{ data: any; filename: string }> {
    const { data: auditEntries, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('company_id', companyId)
      .gte('occurred_at', dateFrom)
      .lte('occurred_at', dateTo)
      .order('occurred_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to export audit data: ${error.message}`);
    }

    // Log the export activity
    await this.logEvent({
      event_type: 'EXPORT',
      entity_type: 'REPORT',
      entity_id: this.generateEventId(),
      company_id: companyId,
      change_summary: `Audit data exported from ${dateFrom} to ${dateTo}`,
      data_classification: 'CONFIDENTIAL',
      metadata: {
        export_format: format,
        record_count: auditEntries?.length || 0,
        date_range: { from: dateFrom, to: dateTo }
      }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `audit_export_${companyId}_${timestamp}.${format.toLowerCase()}`;

    return {
      data: auditEntries,
      filename
    };
  }

  /**
   * Get security metrics and alerts
   */
  async getSecurityMetrics(
    companyId: string,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<any> {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('audit_log')
      .select('event_type, user_id, ip_address, occurred_at')
      .eq('company_id', companyId)
      .gte('occurred_at', startDate.toISOString());

    if (error) {
      throw new Error(`Failed to get security metrics: ${error.message}`);
    }

    // Analyze security patterns
    const totalEvents = data?.length || 0;
    const uniqueUsers = new Set(data?.map(item => item.user_id).filter(Boolean)).size;
    const uniqueIPs = new Set(data?.map(item => item.ip_address).filter(Boolean)).size;
    
    const loginEvents = data?.filter(item => item.event_type === 'LOGIN').length || 0;
    const deleteEvents = data?.filter(item => item.event_type === 'DELETE').length || 0;
    const permissionChanges = data?.filter(item => item.event_type === 'PERMISSION_CHANGE').length || 0;

    // Detect suspicious patterns
    const suspiciousActivity = [];
    
    // Multiple IPs for same user
    const userIPMap = new Map<string, Set<string>>();
    data?.forEach(item => {
      if (item.user_id && item.ip_address) {
        if (!userIPMap.has(item.user_id)) {
          userIPMap.set(item.user_id, new Set());
        }
        userIPMap.get(item.user_id)!.add(item.ip_address);
      }
    });

    userIPMap.forEach((ips, userId) => {
      if (ips.size > 3) {
        suspiciousActivity.push({
          type: 'MULTIPLE_IPS',
          description: `User ${userId} accessed from ${ips.size} different IP addresses`,
          severity: 'MEDIUM'
        });
      }
    });

    // High delete activity
    if (deleteEvents > totalEvents * 0.1) {
      suspiciousActivity.push({
        type: 'HIGH_DELETE_ACTIVITY',
        description: `${deleteEvents} delete operations in ${timeframe} (${((deleteEvents/totalEvents)*100).toFixed(1)}% of all activity)`,
        severity: 'HIGH'
      });
    }

    return {
      timeframe,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      metrics: {
        total_events: totalEvents,
        unique_users: uniqueUsers,
        unique_ips: uniqueIPs,
        login_events: loginEvents,
        delete_events: deleteEvents,
        permission_changes: permissionChanges
      },
      suspicious_activity: suspiciousActivity
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashObject(obj: Record<string, any>): string {
    // Simple hash function - in production, use crypto.createHash
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private getRetentionPeriod(entityType: AuditEntityType, classification?: DataClassification): number {
    // Business rules for data retention
    const retentionRules: Record<string, number> = {
      'VALUATION_409A': 10, // 10 years for valuations
      'SECURITY': 7,        // 7 years for securities
      'TRANSACTION': 7,     // 7 years for transactions
      'USER': 3,            // 3 years for user activities
      'DEFAULT': 5          // 5 years default
    };

    // Extend retention for confidential/restricted data
    const baseRetention = retentionRules[entityType] || retentionRules['DEFAULT'];
    
    if (classification === 'RESTRICTED') {
      return Math.max(baseRetention, 10);
    } else if (classification === 'CONFIDENTIAL') {
      return Math.max(baseRetention, 7);
    }

    return baseRetention;
  }

  private isMajorCalculationType(calculationType: CalculationType): boolean {
    return [
      'VALUATION_409A',
      'WATERFALL_DISTRIBUTION',
      'DILUTION_ANALYSIS'
    ].includes(calculationType);
  }

  private calculateEventTypeBreakdown(data: any[]): Record<AuditEventType, number> {
    const breakdown = {} as Record<AuditEventType, number>;
    
    data.forEach(item => {
      breakdown[item.event_type] = (breakdown[item.event_type] || 0) + 1;
    });

    return breakdown;
  }

  private calculateEntityTypeBreakdown(data: any[]): Record<AuditEntityType, number> {
    const breakdown = {} as Record<AuditEntityType, number>;
    
    data.forEach(item => {
      breakdown[item.entity_type] = (breakdown[item.entity_type] || 0) + 1;
    });

    return breakdown;
  }
}

export const auditService = new AuditService();