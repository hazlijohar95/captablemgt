/**
 * Custom hook for paginated securities data
 * Optimized for 1000+ securities with advanced filtering and vesting calculations
 */

import { useMemo } from 'react';
import { ReactPaginationService, FilterParams, UsePaginationOptions } from '@/services/paginationService';

export interface SecurityFilters {
  stakeholderId?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  showVested?: boolean;
  shareClass?: string;
}

export interface SecurityData {
  id: string;
  stakeholder_id: string;
  type: string;
  status: string;
  shares: number;
  issue_date: string;
  strike_price?: number;
  share_class_id?: string;
  created_at: string;
  updated_at: string;
  stakeholder: {
    id: string;
    type: string;
    company_id: string;
    entity_name?: string;
    people?: {
      name: string;
      email: string;
    };
  };
  vesting_schedules?: Array<{
    id: string;
    commencement_date: string;
    cliff_months: number;
    vesting_months: number;
    total_shares: number;
  }>;
  share_class?: {
    id: string;
    name: string;
    seniority_rank: number;
  };
  deleted_at?: string | null;
}

const SECURITIES_SELECT_QUERY = `
  *,
  stakeholder!inner(
    id,
    type,
    company_id,
    people(name, email),
    entity_name
  ),
  vesting_schedules(*),
  share_class(id, name, seniority_rank)
`;

// Create the pagination hook
const useSecuritiesPagination = ReactPaginationService.createPaginationHook<SecurityData>(
  'securities',
  SECURITIES_SELECT_QUERY
);

export function usePaginatedSecurities(
  companyId: string,
  filters: SecurityFilters = {},
  options: UsePaginationOptions = {}
) {
  // Convert securities-specific filters to generic filter params
  const processedFilters: FilterParams = useMemo(() => {
    const baseFilters: FilterParams = {
      'stakeholder.company_id': companyId,
      deleted_at: null
    };

    if (filters.stakeholderId) {
      baseFilters.stakeholder_id = filters.stakeholderId;
    }

    if (filters.type) {
      baseFilters.type = filters.type;
    }

    if (filters.status) {
      baseFilters.status = filters.status;
    }

    if (filters.shareClass) {
      baseFilters.share_class_id = filters.shareClass;
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: any = {};
      if (filters.dateFrom) dateFilter.gte = filters.dateFrom;
      if (filters.dateTo) dateFilter.lte = filters.dateTo;
      baseFilters.issue_date = dateFilter;
    }

    // Search functionality
    if (filters.search && filters.search.length >= 3) {
      baseFilters.search_query = filters.search;
    }

    return baseFilters;
  }, [companyId, filters]);

  const paginationResult = useSecuritiesPagination(processedFilters, {
    initialPageSize: 100,
    initialSortBy: 'issue_date',
    initialSortOrder: 'desc',
    ...options
  });

  // Enhanced methods with securities-specific logic
  const enhancedResult = useMemo(() => ({
    ...paginationResult,
    
    // Helper to filter by security type
    filterByType: (type: string) => {
      paginationResult.setFilters({
        ...processedFilters,
        type
      });
    },

    // Helper to filter by status
    filterByStatus: (status: string) => {
      paginationResult.setFilters({
        ...processedFilters,
        status
      });
    },

    // Helper to filter by stakeholder
    filterByStakeholder: (stakeholderId: string) => {
      paginationResult.setFilters({
        ...processedFilters,
        stakeholder_id: stakeholderId
      });
    },

    // Helper to filter by date range
    filterByDateRange: (dateFrom?: string, dateTo?: string) => {
      const newFilters = { ...processedFilters };
      
      if (dateFrom || dateTo) {
        const dateFilter: any = {};
        if (dateFrom) dateFilter.gte = dateFrom;
        if (dateTo) dateFilter.lte = dateTo;
        newFilters.issue_date = dateFilter;
      } else {
        delete newFilters.issue_date;
      }

      paginationResult.setFilters(newFilters);
    },

    // Helper to search securities
    searchSecurities: (query: string) => {
      if (query.length >= 3 || query.length === 0) {
        paginationResult.setFilters({
          ...processedFilters,
          search_query: query.length > 0 ? query : undefined
        });
      }
    },

    // Calculate vested amounts for current page
    getVestedSecurities: (asOfDate: Date = new Date()) => {
      return paginationResult.data.map(security => {
        if (security.vesting_schedules && security.vesting_schedules.length > 0) {
          const schedule = security.vesting_schedules[0];
          const vestedShares = calculateVestedShares(schedule, asOfDate);
          
          return {
            ...security,
            vestedShares,
            unvestedShares: security.shares - vestedShares,
            percentVested: security.shares > 0 ? (vestedShares / security.shares) * 100 : 0
          };
        }
        
        return {
          ...security,
          vestedShares: security.shares, // Fully vested if no schedule
          unvestedShares: 0,
          percentVested: 100
        };
      });
    },

    // Get summary statistics
    getSummaryStats: () => {
      const { data } = paginationResult;
      
      const stats = {
        total: paginationResult.pagination.totalItems,
        active: 0,
        cancelled: 0,
        totalShares: 0,
        byType: {} as Record<string, { count: number; shares: number }>,
        byStatus: {} as Record<string, { count: number; shares: number }>
      };

      data.forEach(security => {
        // Status counts
        if (security.status === 'ACTIVE') {
          stats.active++;
        } else if (security.status === 'CANCELLED') {
          stats.cancelled++;
        }

        // Total shares
        stats.totalShares += security.shares;

        // By type
        if (!stats.byType[security.type]) {
          stats.byType[security.type] = { count: 0, shares: 0 };
        }
        stats.byType[security.type].count++;
        stats.byType[security.type].shares += security.shares;

        // By status
        if (!stats.byStatus[security.status]) {
          stats.byStatus[security.status] = { count: 0, shares: 0 };
        }
        stats.byStatus[security.status].count++;
        stats.byStatus[security.status].shares += security.shares;
      });

      return stats;
    },

    // Export current page data
    exportCurrentPage: () => {
      return paginationResult.data.map(security => ({
        id: security.id,
        holderName: security.stakeholder.people?.name || security.stakeholder.entity_name || 'Unknown',
        holderEmail: security.stakeholder.people?.email || '',
        type: security.type,
        status: security.status,
        shares: security.shares,
        issueDate: security.issue_date,
        strikePrice: security.strike_price || 0,
        shareClass: security.share_class?.name || '',
        vestingStart: security.vesting_schedules?.[0]?.commencement_date || '',
        cliffMonths: security.vesting_schedules?.[0]?.cliff_months || 0,
        vestingMonths: security.vesting_schedules?.[0]?.vesting_months || 0
      }));
    }
  }), [paginationResult, processedFilters]);

  return enhancedResult;
}

// Helper function for vesting calculations
function calculateVestedShares(
  schedule: {
    commencement_date: string;
    cliff_months: number;
    vesting_months: number;
    total_shares: number;
  },
  asOfDate: Date
): number {
  const startDate = new Date(schedule.commencement_date);
  const monthsElapsed = Math.floor(
    (asOfDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44) // Average days per month
  );

  // Check if cliff period has passed
  if (schedule.cliff_months && monthsElapsed < schedule.cliff_months) {
    return 0;
  }

  // Calculate vested percentage
  const vestingMonths = schedule.vesting_months || 48; // Default 4 years
  const percentVested = Math.min(monthsElapsed / vestingMonths, 1);
  
  return Math.floor(schedule.total_shares * percentVested);
}

export type UsePaginatedSecuritiesResult = ReturnType<typeof usePaginatedSecurities>;