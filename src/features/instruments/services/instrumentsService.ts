import { supabase } from '@/services/supabase';
import { AuthorizationService } from '@/services/authorizationService';
import { ULID } from '@/types';
import { logger } from '@/utils/simpleLogger';
import {
  SecurityWithDetails,
  SecuritySummary,
  InstrumentsFilter,
  InstrumentsSort,
  InstrumentsStats,
  SecurityType
} from '../types';

export class InstrumentsService {
  /**
   * Get all securities for a company with filtering and sorting
   */
  static async getSecurities(
    companyId: ULID,
    filters: InstrumentsFilter = {},
    sort: InstrumentsSort = { field: 'issued_at', direction: 'desc' }
  ): Promise<SecuritySummary[]> {
    const serviceLogger = logger.child({ 
      feature: 'instruments', 
      action: 'getSecurities', 
      companyId 
    });

    return withTiming('InstrumentsService.getSecurities', async () => {
      serviceLogger.info('Fetching securities', { filters, sort });

      // SECURITY: Verify user has access to this company
      await AuthorizationService.validateCompanyAccess(companyId);
      await AuthorizationService.verifyFinancialDataAccess(companyId, 'read');

    let query = supabase
      .from('securities')
      .select(`
        *,
        stakeholder:stakeholder_id (
          id,
          type,
          people:person_id (
            name,
            email
          ),
          entity_name
        ),
        share_classes:class_id (
          id,
          name,
          type
        )
      `)
      .eq('company_id', companyId);

    // Apply filters
    if (filters.type && filters.type !== 'ALL') {
      query = query.eq('type', filters.type);
    }

    if (filters.status && filters.status !== 'ALL') {
      if (filters.status === 'active') {
        query = query.is('cancelled_at', null);
      } else if (filters.status === 'cancelled') {
        query = query.not('cancelled_at', 'is', null);
      }
    }

    if (filters.date_from) {
      query = query.gte('issued_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('issued_at', filters.date_to);
    }

    // Apply stakeholder type filter at database level
    if (filters.stakeholder_type && filters.stakeholder_type !== 'ALL') {
      query = query.eq('stakeholder.type', filters.stakeholder_type);
    }

    // Apply basic search filter at database level (partial implementation)
    if (filters.search && filters.search.length >= 3) {
      // For better performance, only search when query is 3+ characters
      const searchTerm = `%${filters.search}%`;
      query = query.or(`
        stakeholder.people.name.ilike.${searchTerm},
        stakeholder.entity_name.ilike.${searchTerm},
        type.ilike.${searchTerm}
      `);
    }

    // Apply sorting - handle stakeholder_name separately since it requires join sorting
    if (sort.field === 'stakeholder_name') {
      // For stakeholder name sorting, we'll sort client-side after data transform
      // This avoids complex nested join sorting issues with Supabase
      query = query.order('created_at', { ascending: sort.direction === 'asc' });
    } else {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    }

    const { data, error } = await query;

      if (error) {
        serviceLogger.error('Failed to fetch securities from database', error);
        throw new Error(`Failed to fetch securities: ${error.message}`);
      }

      serviceLogger.info('Successfully fetched securities from database', { 
        count: data?.length || 0 
      });

    // Transform to SecuritySummary format
    const securities: SecuritySummary[] = (data as SecurityWithDetails[]).map(security => {
      const stakeholder = security.stakeholder;
      const shareClass = security.share_classes;
      
      const stakeholder_name = stakeholder?.people?.name || stakeholder?.entity_name || 'Unknown';
      
      return {
        id: security.id,
        type: security.type as SecurityType,
        quantity: security.quantity,
        issued_at: security.issued_at,
        cancelled_at: security.cancelled_at,
        stakeholder_name,
        stakeholder_type: stakeholder?.type || 'UNKNOWN',
        share_class_name: shareClass?.name,
        share_class_type: shareClass?.type,
        terms: security.terms,
        status: security.cancelled_at ? 'cancelled' : 'active'
      };
    });

    // Apply client-side sorting for stakeholder names
    if (sort.field === 'stakeholder_name') {
      securities.sort((a, b) => {
        const comparison = a.stakeholder_name.localeCompare(b.stakeholder_name);
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    // Apply remaining client-side filtering for cases not handled at database level
    let filteredSecurities = securities;
    
    // Client-side search fallback for short queries or additional fields
    if (filters.search && filters.search.length < 3) {
      // For short queries, apply client-side filtering
      const searchLower = filters.search.toLowerCase();
      filteredSecurities = securities.filter(security => 
        security.stakeholder_name.toLowerCase().includes(searchLower) ||
        security.type.toLowerCase().includes(searchLower) ||
        (security.share_class_name?.toLowerCase().includes(searchLower)) ||
        security.id.toLowerCase().includes(searchLower)
      );
    } else if (filters.search && filters.search.length >= 3) {
      // For longer queries, also check share class and ID client-side 
      // (these weren't included in database query)
      const searchLower = filters.search.toLowerCase();
      filteredSecurities = securities.filter(security => 
        (security.share_class_name?.toLowerCase().includes(searchLower)) ||
        security.id.toLowerCase().includes(searchLower)
      );
    }

      serviceLogger.info('Securities processing completed', {
        totalFetched: securities.length,
        afterFiltering: filteredSecurities.length,
        appliedFilters: Object.keys(filters).filter(key => filters[key as keyof InstrumentsFilter])
      });

      return filteredSecurities;
    });
  }

  /**
   * Get statistics for instruments overview
   */
  static async getInstrumentsStats(companyId: ULID): Promise<InstrumentsStats> {
    // SECURITY: Verify user has access to this company
    await AuthorizationService.validateCompanyAccess(companyId);
    await AuthorizationService.verifyFinancialDataAccess(companyId, 'read');

    const { data, error } = await supabase
      .from('securities')
      .select(`
        *,
        stakeholder:stakeholder_id (
          type
        )
      `)
      .eq('company_id', companyId);

    if (error) {
      throw new Error(`Failed to fetch securities stats: ${error.message}`);
    }

    const securities = data as (SecurityWithDetails & { 
      stakeholder: { type: string } 
    })[];

    // Calculate statistics
    const total_securities = securities.length;
    const active_securities = securities.filter(s => !s.cancelled_at).length;
    const cancelled_securities = total_securities - active_securities;
    
    // Total shares outstanding (only for EQUITY type)
    const total_shares_outstanding = securities
      .filter(s => s.type === 'EQUITY' && !s.cancelled_at)
      .reduce((sum, s) => sum + s.quantity, 0);

    // By security type
    const by_type: Record<SecurityType, { count: number; total_quantity: number }> = {
      EQUITY: { count: 0, total_quantity: 0 },
      OPTION: { count: 0, total_quantity: 0 },
      RSU: { count: 0, total_quantity: 0 },
      WARRANT: { count: 0, total_quantity: 0 },
      SAFE: { count: 0, total_quantity: 0 },
      NOTE: { count: 0, total_quantity: 0 }
    };

    // By stakeholder type
    const by_stakeholder_type: Record<string, { count: number; total_quantity: number }> = {};

    securities.forEach(security => {
      // By security type
      by_type[security.type as SecurityType].count++;
      by_type[security.type as SecurityType].total_quantity += security.quantity;

      // By stakeholder type
      const stakeholderType = security.stakeholder?.type || 'UNKNOWN';
      if (!by_stakeholder_type[stakeholderType]) {
        by_stakeholder_type[stakeholderType] = { count: 0, total_quantity: 0 };
      }
      by_stakeholder_type[stakeholderType].count++;
      by_stakeholder_type[stakeholderType].total_quantity += security.quantity;
    });

    return {
      total_securities,
      active_securities,
      cancelled_securities,
      total_shares_outstanding,
      by_type,
      by_stakeholder_type
    };
  }

  /**
   * Cancel a security (soft delete)
   */
  static async cancelSecurity(securityId: string, companyId: ULID): Promise<void> {
    const serviceLogger = logger.child({ 
      feature: 'instruments', 
      action: 'cancelSecurity', 
      companyId,
      securityId 
    });

    serviceLogger.info('Attempting to cancel security');

    // SECURITY: Verify user has admin access to this company
    await AuthorizationService.validateCompanyAccess(companyId);
    await AuthorizationService.verifyFinancialDataAccess(companyId, 'admin');
    
    // Log security event
    await AuthorizationService.logSecurityEvent(companyId, 'CANCEL_SECURITY', 'securities', {
      securityId
    });

    // Log audit trail
    logAudit('CANCEL_SECURITY', { securityId }, { companyId, feature: 'instruments' });

    // NOTE: Using type assertion due to Supabase generated types issue 
    // This is consistent with other update operations in the codebase
    const { error } = await (supabase as any)
      .from('securities')
      .update({
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', securityId)
      .eq('company_id', companyId);

    if (error) {
      serviceLogger.error('Failed to cancel security in database', error);
      throw new Error(`Failed to cancel security: ${error.message}`);
    }

    serviceLogger.info('Security successfully cancelled');
  }

  /**
   * Reactivate a cancelled security
   */
  static async reactivateSecurity(securityId: string, companyId: ULID): Promise<void> {
    // SECURITY: Verify user has admin access to this company
    await AuthorizationService.validateCompanyAccess(companyId);
    await AuthorizationService.verifyFinancialDataAccess(companyId, 'admin');
    
    // Log security event
    await AuthorizationService.logSecurityEvent(companyId, 'REACTIVATE_SECURITY', 'securities', {
      securityId
    });

    // NOTE: Using type assertion due to Supabase generated types issue 
    // This is consistent with other update operations in the codebase
    const { error } = await (supabase as any)
      .from('securities')
      .update({
        cancelled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', securityId)
      .eq('company_id', companyId);

    if (error) {
      throw new Error(`Failed to reactivate security: ${error.message}`);
    }
  }
}