/**
 * 409A Valuation Service
 * Comprehensive service for managing IRS Section 409A valuations
 * Includes compliance validation, audit trails, and business logic
 */

import { supabase } from './supabase';
import { AuditService } from './auditService';
import { 
  Valuation409A, 
  CreateValuation409ARequest,
  UpdateValuation409ARequest,
  Valuation409AResponse,
  ValuationShareClass,
  ValuationAssumption,
  ValuationScenario,
  ValuationValidationResult,
  ValuationSummaryStats,
  ValuationListFilters,
  PaginatedValuationResponse,
  ValuationStatus
} from '@/types/valuation409a';
import { ValidationService } from './validationService';
import { DocumentService } from './documentService';

export class Valuation409AService {
  private auditService: AuditService;
  private validationService: ValidationService;
  private documentService: DocumentService;

  constructor() {
    this.auditService = new AuditService();
    this.validationService = new ValidationService();
    this.documentService = new DocumentService();
  }

  /**
   * Create a new 409A valuation
   */
  async createValuation(
    data: CreateValuation409ARequest,
    userId: string
  ): Promise<Valuation409AResponse> {
    // Validate input data
    const validationResult = await this.validationService.validateValuationData(data);
    if (!validationResult.is_valid) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Check for overlapping valuations
    await this.validateNoOverlappingValuations(data.company_id, data.effective_period_start, data.effective_period_end);

    const { data: valuation, error } = await supabase
      .from('valuations_409a')
      .insert({
        ...data,
        created_by: userId,
        updated_by: userId,
        status: 'DRAFT',
        version: 1
      })
      .select(`
        *,
        company:companies(id, name),
        created_by_user:users!created_by(id, email, name),
        updated_by_user:users!updated_by(id, email, name)
      `)
      .single();

    if (error) {
      await this.auditService.logError('VALUATION_CREATION_FAILED', error, {
        company_id: data.company_id,
        user_id: userId
      });
      throw new Error(`Failed to create valuation: ${error.message}`);
    }

    // Log creation in audit trail
    await this.auditService.logEvent({
      event_type: 'CREATE',
      entity_type: 'VALUATION_409A',
      entity_id: valuation.id,
      company_id: data.company_id,
      user_id: userId,
      new_value: valuation,
      change_summary: `Created new 409A valuation for ${data.valuation_date}`
    });

    return this.enrichValuationResponse(valuation);
  }

  /**
   * Update an existing 409A valuation
   */
  async updateValuation(
    data: UpdateValuation409ARequest,
    userId: string
  ): Promise<Valuation409AResponse> {
    // Get existing valuation for comparison
    const existing = await this.getValuationById(data.id);
    if (!existing) {
      throw new Error('Valuation not found');
    }

    // Check permissions and business rules
    this.validateUpdatePermissions(existing, userId);
    
    // Validate update data
    if (data.effective_period_start || data.effective_period_end) {
      await this.validateNoOverlappingValuations(
        existing.company_id, 
        data.effective_period_start || existing.effective_period_start,
        data.effective_period_end || existing.effective_period_end,
        data.id
      );
    }

    // Handle version increment for significant changes
    const shouldIncrementVersion = this.shouldIncrementVersion(existing, data);
    const updateData = {
      ...data,
      updated_by: userId,
      version: shouldIncrementVersion ? existing.version + 1 : existing.version,
      updated_at: new Date().toISOString()
    };

    const { data: updated, error } = await supabase
      .from('valuations_409a')
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        company:companies(id, name),
        created_by_user:users!created_by(id, email, name),
        updated_by_user:users!updated_by(id, email, name)
      `)
      .single();

    if (error) {
      await this.auditService.logError('VALUATION_UPDATE_FAILED', error, {
        valuation_id: data.id,
        user_id: userId
      });
      throw new Error(`Failed to update valuation: ${error.message}`);
    }

    // Log update in audit trail
    await this.auditService.logEvent({
      event_type: 'UPDATE',
      entity_type: 'VALUATION_409A',
      entity_id: data.id,
      company_id: updated.company_id,
      user_id: userId,
      old_value: existing,
      new_value: updated,
      change_summary: this.generateChangesSummary(existing, updated)
    });

    return this.enrichValuationResponse(updated);
  }

  /**
   * Get valuation by ID with full details
   */
  async getValuationById(id: string): Promise<Valuation409AResponse | null> {
    const { data, error } = await supabase
      .from('valuations_409a')
      .select(`
        *,
        company:companies(id, name),
        created_by_user:users!created_by(id, email, name),
        updated_by_user:users!updated_by(id, email, name),
        share_class_valuations:valuation_share_classes(*),
        assumptions:valuation_assumptions(*),
        scenarios:valuation_scenarios(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw new Error(`Failed to get valuation: ${error.message}`);
    }

    if (!data) return null;

    // Log access for audit trail
    await this.auditService.logEvent({
      event_type: 'VIEW',
      entity_type: 'VALUATION_409A',
      entity_id: id,
      company_id: data.company_id,
      change_summary: 'Valuation accessed'
    });

    return this.enrichValuationResponse(data);
  }

  /**
   * List valuations with filtering and pagination
   */
  async listValuations(
    companyId: string,
    filters: ValuationListFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedValuationResponse> {
    let query = supabase
      .from('valuations_409a')
      .select(`
        *,
        company:companies(id, name),
        created_by_user:users!created_by(id, email, name),
        updated_by_user:users!updated_by(id, email, name)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.date_from) {
      query = query.gte('valuation_date', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('valuation_date', filters.date_to);
    }

    if (filters.appraiser_firm) {
      query = query.ilike('appraiser_firm', `%${filters.appraiser_firm}%`);
    }

    if (filters.valuation_method) {
      query = query.eq('valuation_method', filters.valuation_method);
    }

    if (filters.safe_harbor_only) {
      query = query.eq('safe_harbor_qualified', true);
    }

    // Apply pagination and sorting
    const offset = (page - 1) * pageSize;
    query = query
      .order('valuation_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list valuations: ${error.message}`);
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: data.map(v => this.enrichValuationResponse(v)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      },
      filters,
      sort: { field: 'valuation_date', direction: 'desc' }
    };
  }

  /**
   * Get current effective valuation for a company
   */
  async getCurrentValuation(companyId: string): Promise<Valuation409AResponse | null> {
    const currentDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('valuations_409a')
      .select(`
        *,
        company:companies(id, name),
        share_class_valuations:valuation_share_classes(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'FINAL')
      .lte('effective_period_start', currentDate)
      .or(`effective_period_end.is.null,effective_period_end.gte.${currentDate}`)
      .is('deleted_at', null)
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get current valuation: ${error.message}`);
    }

    return data ? this.enrichValuationResponse(data) : null;
  }

  /**
   * Update valuation status (e.g., submit for review, approve, finalize)
   */
  async updateValuationStatus(
    valuationId: string,
    newStatus: ValuationStatus,
    userId: string,
    comment?: string
  ): Promise<Valuation409AResponse> {
    const existing = await this.getValuationById(valuationId);
    if (!existing) {
      throw new Error('Valuation not found');
    }

    // Validate status transition
    this.validateStatusTransition(existing.status, newStatus);

    // Special handling for finalizing valuations
    if (newStatus === 'FINAL') {
      await this.validateFinalizationRequirements(existing);
      
      // Supersede any overlapping final valuations
      await this.supersedePreviousValuations(existing);
    }

    const { data: updated, error } = await supabase
      .from('valuations_409a')
      .update({
        status: newStatus,
        updated_by: userId,
        updated_at: new Date().toISOString(),
        internal_comments: comment ? 
          (existing.internal_comments ? `${existing.internal_comments}\n---\n${comment}` : comment) : 
          existing.internal_comments
      })
      .eq('id', valuationId)
      .select(`
        *,
        company:companies(id, name),
        created_by_user:users!created_by(id, email, name),
        updated_by_user:users!updated_by(id, email, name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update valuation status: ${error.message}`);
    }

    // Log status change
    await this.auditService.logEvent({
      event_type: 'UPDATE',
      entity_type: 'VALUATION_409A',
      entity_id: valuationId,
      company_id: existing.company_id,
      user_id: userId,
      old_value: { status: existing.status },
      new_value: { status: newStatus },
      change_summary: `Status changed from ${existing.status} to ${newStatus}${comment ? `: ${comment}` : ''}`
    });

    return this.enrichValuationResponse(updated);
  }

  /**
   * Add or update share class valuations
   */
  async updateShareClassValuations(
    valuationId: string,
    shareClassValuations: Omit<ValuationShareClass, 'id' | 'created_at' | 'updated_at'>[],
    userId: string
  ): Promise<ValuationShareClass[]> {
    const valuation = await this.getValuationById(valuationId);
    if (!valuation) {
      throw new Error('Valuation not found');
    }

    // Delete existing share class valuations
    const { error: deleteError } = await supabase
      .from('valuation_share_classes')
      .delete()
      .eq('valuation_409a_id', valuationId);

    if (deleteError) {
      throw new Error(`Failed to delete existing share class valuations: ${deleteError.message}`);
    }

    // Insert new share class valuations
    const { data: created, error: insertError } = await supabase
      .from('valuation_share_classes')
      .insert(shareClassValuations.map(scv => ({
        ...scv,
        valuation_409a_id: valuationId
      })))
      .select('*');

    if (insertError) {
      throw new Error(`Failed to create share class valuations: ${insertError.message}`);
    }

    // Log the update
    await this.auditService.logEvent({
      event_type: 'UPDATE',
      entity_type: 'VALUATION_409A',
      entity_id: valuationId,
      company_id: valuation.company_id,
      user_id: userId,
      new_value: created,
      change_summary: `Updated share class valuations (${created.length} classes)`
    });

    return created;
  }

  /**
   * Get valuation summary statistics for a company
   */
  async getValuationSummaryStats(companyId: string): Promise<ValuationSummaryStats> {
    // Get basic counts and stats
    const { data: valuations, error } = await supabase
      .from('valuations_409a')
      .select('id, status, valuation_date, effective_period_end, fair_market_value_per_share, safe_harbor_qualified, presumption_of_reasonableness')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('valuation_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to get valuation stats: ${error.message}`);
    }

    const total_valuations = valuations.length;
    const active_valuations = valuations.filter(v => v.status === 'FINAL').length;
    const draft_valuations = valuations.filter(v => v.status === 'DRAFT').length;

    // Calculate average FMV
    const finalValuations = valuations.filter(v => v.status === 'FINAL');
    const average_fmv_per_share = finalValuations.length > 0 
      ? Math.round(finalValuations.reduce((sum, v) => sum + v.fair_market_value_per_share, 0) / finalValuations.length)
      : 0;

    // Find latest and next expiring
    const latest_valuation_date = valuations.length > 0 ? valuations[0].valuation_date : undefined;
    
    const currentDate = new Date().toISOString().split('T')[0];
    const expiringValuations = finalValuations
      .filter(v => v.effective_period_end && v.effective_period_end > currentDate)
      .sort((a, b) => (a.effective_period_end || '').localeCompare(b.effective_period_end || ''));
    
    const next_expiring_valuation = expiringValuations.length > 0 
      ? expiringValuations[0].effective_period_end 
      : undefined;

    // Calculate compliance percentage
    const compliantValuations = finalValuations.filter(v => 
      v.safe_harbor_qualified || v.presumption_of_reasonableness
    ).length;
    const compliance_percentage = finalValuations.length > 0 
      ? Math.round((compliantValuations / finalValuations.length) * 100)
      : 100;

    return {
      total_valuations,
      active_valuations,
      draft_valuations,
      average_fmv_per_share,
      latest_valuation_date,
      next_expiring_valuation,
      compliance_percentage
    };
  }

  /**
   * Validate valuation data for compliance
   */
  async validateValuation(valuationId: string): Promise<ValuationValidationResult> {
    const valuation = await this.getValuationById(valuationId);
    if (!valuation) {
      throw new Error('Valuation not found');
    }

    return this.validationService.validateValuation(valuation);
  }

  /**
   * Delete (soft delete) a valuation
   */
  async deleteValuation(valuationId: string, userId: string): Promise<void> {
    const existing = await this.getValuationById(valuationId);
    if (!existing) {
      throw new Error('Valuation not found');
    }

    // Validate deletion permissions
    if (existing.status === 'FINAL') {
      throw new Error('Cannot delete finalized valuations');
    }

    const { error } = await supabase
      .from('valuations_409a')
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', valuationId);

    if (error) {
      throw new Error(`Failed to delete valuation: ${error.message}`);
    }

    // Log deletion
    await this.auditService.logEvent({
      event_type: 'DELETE',
      entity_type: 'VALUATION_409A',
      entity_id: valuationId,
      company_id: existing.company_id,
      user_id: userId,
      old_value: existing,
      change_summary: 'Valuation deleted (soft delete)'
    });
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async validateNoOverlappingValuations(
    companyId: string, 
    startDate: string, 
    endDate?: string | null,
    excludeId?: string
  ): Promise<void> {
    let query = supabase
      .from('valuations_409a')
      .select('id, effective_period_start, effective_period_end')
      .eq('company_id', companyId)
      .eq('status', 'FINAL')
      .is('deleted_at', null);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: existingValuations, error } = await query;

    if (error) {
      throw new Error(`Failed to check for overlapping valuations: ${error.message}`);
    }

    // Check for overlaps
    const hasOverlap = existingValuations.some(existing => {
      const existingStart = existing.effective_period_start;
      const existingEnd = existing.effective_period_end;

      // Check if periods overlap
      if (endDate) {
        // Both have end dates
        if (existingEnd) {
          return startDate <= existingEnd && endDate >= existingStart;
        } else {
          // Existing is open-ended
          return startDate <= existingStart || endDate >= existingStart;
        }
      } else {
        // New valuation is open-ended
        if (existingEnd) {
          return existingEnd >= startDate;
        } else {
          // Both are open-ended - always overlaps
          return true;
        }
      }
    });

    if (hasOverlap) {
      throw new Error('Valuation period overlaps with existing final valuation');
    }
  }

  private validateUpdatePermissions(valuation: Valuation409A, userId: string): void {
    if (valuation.status === 'FINAL') {
      throw new Error('Cannot update finalized valuations');
    }
    
    // Add additional permission checks here based on your business rules
  }

  private shouldIncrementVersion(existing: Valuation409A, updates: UpdateValuation409ARequest): boolean {
    // Increment version for significant changes
    const significantFields = [
      'fair_market_value_per_share',
      'valuation_method',
      'effective_period_start',
      'effective_period_end',
      'enterprise_value',
      'equity_value'
    ];

    return significantFields.some(field => 
      updates[field as keyof UpdateValuation409ARequest] !== undefined &&
      updates[field as keyof UpdateValuation409ARequest] !== existing[field as keyof Valuation409A]
    );
  }

  private validateStatusTransition(currentStatus: ValuationStatus, newStatus: ValuationStatus): void {
    const validTransitions: Record<ValuationStatus, ValuationStatus[]> = {
      'DRAFT': ['UNDER_REVIEW', 'REJECTED'],
      'UNDER_REVIEW': ['BOARD_APPROVED', 'DRAFT', 'REJECTED'],
      'BOARD_APPROVED': ['FINAL', 'DRAFT'],
      'FINAL': ['SUPERSEDED'],
      'SUPERSEDED': [], // Cannot change from superseded
      'REJECTED': ['DRAFT']
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private async validateFinalizationRequirements(valuation: Valuation409A): Promise<void> {
    const validation = await this.validationService.validateValuation(valuation);
    
    if (!validation.is_valid) {
      throw new Error(`Cannot finalize valuation with validation errors: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Additional business rules for finalization
    if (!valuation.board_resolution_date) {
      throw new Error('Board resolution date is required for finalization');
    }

    if (!valuation.report_file_path) {
      throw new Error('Valuation report must be uploaded before finalization');
    }
  }

  private async supersedePreviousValuations(newValuation: Valuation409A): Promise<void> {
    // Find overlapping final valuations and mark them as superseded
    const { error } = await supabase
      .from('valuations_409a')
      .update({ status: 'SUPERSEDED' })
      .eq('company_id', newValuation.company_id)
      .eq('status', 'FINAL')
      .neq('id', newValuation.id)
      .or(`effective_period_end.is.null,effective_period_end.gte.${newValuation.effective_period_start}`);

    if (error) {
      throw new Error(`Failed to supersede previous valuations: ${error.message}`);
    }
  }

  private generateChangesSummary(oldVal: Valuation409A, newVal: Valuation409A): string {
    const changes: string[] = [];

    if (oldVal.fair_market_value_per_share !== newVal.fair_market_value_per_share) {
      changes.push(`FMV changed from $${(oldVal.fair_market_value_per_share / 100).toFixed(2)} to $${(newVal.fair_market_value_per_share / 100).toFixed(2)}`);
    }

    if (oldVal.status !== newVal.status) {
      changes.push(`Status: ${oldVal.status} → ${newVal.status}`);
    }

    if (oldVal.valuation_method !== newVal.valuation_method) {
      changes.push(`Method: ${oldVal.valuation_method} → ${newVal.valuation_method}`);
    }

    return changes.length > 0 ? changes.join('; ') : 'Minor updates';
  }

  private enrichValuationResponse(data: any): Valuation409AResponse {
    // Add any computed fields or additional data enrichment
    return {
      ...data,
      // Add computed fields as needed
    };
  }
}

export const valuation409AService = new Valuation409AService();