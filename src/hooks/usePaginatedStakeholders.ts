/**
 * Custom hook for paginated stakeholder data
 * Optimized for 1000+ stakeholders with search and filtering
 */

import { useMemo } from 'react';
import { ReactPaginationService, FilterParams, UsePaginationOptions } from '@/services/paginationService';

export interface StakeholderFilters {
  type?: string;
  search?: string;
  hasSecurities?: boolean;
  status?: 'active' | 'inactive';
}

export interface StakeholderData {
  id: string;
  type: string;
  entity_name?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  people?: {
    name: string;
    email: string;
  };
  securities?: {
    count: number;
  }[];
  deleted_at?: string | null;
}

const STAKEHOLDER_SELECT_QUERY = `
  *,
  people!inner(name, email),
  securities(count)
`;

// Create the pagination hook
const useStakeholderPagination = ReactPaginationService.createPaginationHook<StakeholderData>(
  'stakeholders',
  STAKEHOLDER_SELECT_QUERY
);

export function usePaginatedStakeholders(
  companyId: string,
  filters: StakeholderFilters = {},
  options: UsePaginationOptions = {}
) {
  // Convert stakeholder-specific filters to generic filter params
  const processedFilters: FilterParams = useMemo(() => {
    const baseFilters: FilterParams = {
      company_id: companyId,
      deleted_at: null
    };

    if (filters.type) {
      baseFilters.type = filters.type;
    }

    if (filters.status === 'active') {
      baseFilters.deleted_at = null;
    } else if (filters.status === 'inactive') {
      // This would need special handling in the service
      baseFilters.deleted_at = { gte: '1900-01-01' }; // Not null
    }

    // Search functionality would need to be implemented in the service
    // For now, we'll handle it as a filter that gets processed server-side
    if (filters.search && filters.search.length >= 3) {
      // This could be handled with full-text search or ILIKE queries
      baseFilters.search_query = filters.search;
    }

    return baseFilters;
  }, [companyId, filters]);

  const paginationResult = useStakeholderPagination(processedFilters, {
    initialPageSize: 50,
    initialSortBy: 'created_at',
    initialSortOrder: 'desc',
    ...options
  });

  // Enhanced methods with stakeholder-specific logic
  const enhancedResult = useMemo(() => ({
    ...paginationResult,
    
    // Helper to filter by stakeholder type
    filterByType: (type: string) => {
      paginationResult.setFilters({
        ...processedFilters,
        type
      });
    },

    // Helper to search stakeholders
    searchStakeholders: (query: string) => {
      if (query.length >= 3 || query.length === 0) {
        paginationResult.setFilters({
          ...processedFilters,
          search_query: query.length > 0 ? query : undefined
        });
      }
    },

    // Helper to toggle securities filter
    filterBySecuritiesStatus: (hasSecurities: boolean) => {
      // This would need special handling in the service
      paginationResult.setFilters({
        ...processedFilters,
        has_securities: hasSecurities
      });
    },

    // Get summary statistics
    getSummaryStats: () => {
      const { data } = paginationResult;
      
      const stats = {
        total: paginationResult.pagination.totalItems,
        individuals: 0,
        entities: 0,
        withSecurities: 0,
        withoutSecurities: 0
      };

      data.forEach(stakeholder => {
        if (stakeholder.type === 'INDIVIDUAL') {
          stats.individuals++;
        } else {
          stats.entities++;
        }

        const hasSecurities = stakeholder.securities && stakeholder.securities.length > 0;
        if (hasSecurities) {
          stats.withSecurities++;
        } else {
          stats.withoutSecurities++;
        }
      });

      return stats;
    }
  }), [paginationResult, processedFilters]);

  return enhancedResult;
}

export type UsePaginatedStakeholdersResult = ReturnType<typeof usePaginatedStakeholders>;