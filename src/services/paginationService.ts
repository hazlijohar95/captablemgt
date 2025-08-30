/**
 * Pagination Service for Large Data Sets
 * Handles efficient pagination for 1000+ records with cursor-based and offset pagination
 */

import React from 'react';
import { supabase } from './supabase';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
  performance?: {
    queryTime: number;
    cached: boolean;
  };
}

export interface FilterParams {
  [key: string]: any;
}

/**
 * Generic pagination service for any table
 */
export class PaginationService {
  private static readonly DEFAULT_PAGE_SIZE = 50;
  private static readonly MAX_PAGE_SIZE = 200;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  private static cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Paginate any Supabase query with offset-based pagination
   */
  static async paginateQuery<T>(
    tableName: string,
    params: PaginationParams = {},
    filters: FilterParams = {},
    selectQuery: string = '*'
  ): Promise<PaginatedResponse<T>> {
    const startTime = performance.now();
    
    // Pagination parameters
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(
      params.pageSize || this.DEFAULT_PAGE_SIZE,
      this.MAX_PAGE_SIZE
    );
    const offset = (page - 1) * pageSize;
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';

    // Check cache
    const cacheKey = this.getCacheKey(tableName, params, filters);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance: {
          queryTime: performance.now() - startTime,
          cached: true
        }
      };
    }

    try {
      // Build base query
      let query = supabase
        .from(tableName)
        .select(selectQuery, { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && value.gte !== undefined) {
            query = query.gte(key, value.gte);
            if (value.lte !== undefined) {
              query = query.lte(key, value.lte);
            }
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + pageSize - 1);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Pagination query failed: ${error.message}`);
      }

      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / pageSize);

      const response: PaginatedResponse<T> = {
        data: data || [],
        pagination: {
          page,
          pageSize,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        },
        performance: {
          queryTime: performance.now() - startTime,
          cached: false
        }
      };

      // Cache the response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('Pagination error:', error);
      throw error;
    }
  }

  /**
   * Cursor-based pagination for extremely large datasets
   */
  static async paginateWithCursor<T>(
    tableName: string,
    params: PaginationParams = {},
    filters: FilterParams = {},
    selectQuery: string = '*',
    cursorField: string = 'id'
  ): Promise<PaginatedResponse<T>> {
    const startTime = performance.now();
    
    const pageSize = Math.min(
      params.pageSize || this.DEFAULT_PAGE_SIZE,
      this.MAX_PAGE_SIZE
    );
    const sortOrder = params.sortOrder || 'desc';

    try {
      // Build base query
      let query = supabase
        .from(tableName)
        .select(selectQuery);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Apply cursor
      if (params.cursor) {
        if (sortOrder === 'desc') {
          query = query.lt(cursorField, params.cursor);
        } else {
          query = query.gt(cursorField, params.cursor);
        }
      }

      // Apply sorting and limit
      query = query
        .order(cursorField, { ascending: sortOrder === 'asc' })
        .limit(pageSize + 1); // Fetch one extra to check if there's a next page

      // Execute query
      const { data, error } = await query;

      if (error) {
        throw new Error(`Cursor pagination query failed: ${error.message}`);
      }

      const items = data || [];
      const hasNext = items.length > pageSize;
      
      // Remove the extra item if it exists
      if (hasNext) {
        items.pop();
      }

      const nextCursor = hasNext && items.length > 0 
        ? items[items.length - 1][cursorField] 
        : undefined;

      return {
        data: items,
        pagination: {
          page: 1, // Cursor pagination doesn't use page numbers
          pageSize,
          totalPages: -1, // Not available in cursor pagination
          totalItems: -1, // Not available in cursor pagination
          hasNext,
          hasPrevious: !!params.cursor,
          nextCursor,
          previousCursor: params.cursor
        },
        performance: {
          queryTime: performance.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      console.error('Cursor pagination error:', error);
      throw error;
    }
  }

  /**
   * Batch fetch multiple pages for export or processing
   */
  static async fetchAllPages<T>(
    tableName: string,
    filters: FilterParams = {},
    selectQuery: string = '*',
    batchSize: number = 100
  ): AsyncGenerator<T[], void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.paginateQuery<T>(
        tableName,
        { page, pageSize: batchSize },
        filters,
        selectQuery
      );

      yield response.data;

      hasMore = response.pagination.hasNext;
      page++;

      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Optimized count query for large tables
   */
  static async getCount(
    tableName: string,
    filters: FilterParams = {}
  ): Promise<number> {
    const cacheKey = `count_${tableName}_${JSON.stringify(filters)}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    let query = supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });

    const { count, error } = await query;

    if (error) {
      throw new Error(`Count query failed: ${error.message}`);
    }

    const totalCount = count || 0;
    this.setCache(cacheKey, totalCount);
    
    return totalCount;
  }

  // Cache management
  private static getCacheKey(
    tableName: string,
    params: PaginationParams,
    filters: FilterParams
  ): string {
    return `${tableName}_${JSON.stringify(params)}_${JSON.stringify(filters)}`;
  }

  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache(key: string, data: any): void {
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Specialized pagination for stakeholders
 */
export class StakeholderPaginationService {
  static async getStakeholders(
    companyId: string,
    params: PaginationParams = {},
    filters: {
      type?: string;
      search?: string;
      hasSecurities?: boolean;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    const selectQuery = `
      *,
      people!inner(name, email),
      securities(count)
    `;

    const processedFilters: FilterParams = {
      company_id: companyId,
      deleted_at: null
    };

    if (filters.type) {
      processedFilters.type = filters.type;
    }

    // For search, we'll need to handle it differently
    if (filters.search && filters.search.length >= 3) {
      // This would require a more complex query with text search
      // For now, we'll handle it in post-processing
    }

    return PaginationService.paginateQuery(
      'stakeholders',
      params,
      processedFilters,
      selectQuery
    );
  }
}

/**
 * Specialized pagination for securities
 */
export class SecurityPaginationService {
  static async getSecurities(
    companyId: string,
    params: PaginationParams = {},
    filters: {
      stakeholderId?: string;
      type?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    const selectQuery = `
      *,
      stakeholder!inner(
        id,
        type,
        company_id,
        people(name, email),
        entity_name
      ),
      vesting_schedules(*)
    `;

    const processedFilters: FilterParams = {
      'stakeholder.company_id': companyId,
      deleted_at: null
    };

    if (filters.stakeholderId) {
      processedFilters.stakeholder_id = filters.stakeholderId;
    }

    if (filters.type) {
      processedFilters.type = filters.type;
    }

    if (filters.status) {
      processedFilters.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      processedFilters.issue_date = {
        gte: filters.dateFrom,
        lte: filters.dateTo
      };
    }

    // Use cursor pagination for very large result sets
    if (params.cursor) {
      return PaginationService.paginateWithCursor(
        'securities',
        params,
        processedFilters,
        selectQuery,
        'id'
      );
    }

    return PaginationService.paginateQuery(
      'securities',
      params,
      processedFilters,
      selectQuery
    );
  }

  /**
   * Get securities with vesting calculations
   */
  static async getVestedSecurities(
    companyId: string,
    asOfDate: Date = new Date(),
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<any>> {
    // This would include vesting calculations
    const securities = await this.getSecurities(
      companyId,
      params,
      { status: 'ACTIVE' }
    );

    // Post-process to calculate vested amounts
    securities.data = securities.data.map(security => {
      if (security.vesting_schedules && security.vesting_schedules.length > 0) {
        const schedule = security.vesting_schedules[0];
        // Calculate vested amount based on schedule
        // This is simplified - real calculation would be more complex
        const vestedShares = this.calculateVestedShares(schedule, asOfDate);
        return {
          ...security,
          vestedShares,
          unvestedShares: security.shares - vestedShares
        };
      }
      return security;
    });

    return securities;
  }

  private static calculateVestedShares(
    schedule: any,
    asOfDate: Date
  ): number {
    // Simplified vesting calculation
    // Real implementation would handle cliff, linear vesting, etc.
    const startDate = new Date(schedule.commencement_date);
    const monthsVested = Math.floor(
      (asOfDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    
    if (schedule.cliff_months && monthsVested < schedule.cliff_months) {
      return 0;
    }

    const vestingMonths = schedule.vesting_months || 48;
    const percentVested = Math.min(monthsVested / vestingMonths, 1);
    
    return Math.floor(schedule.total_shares * percentVested);
  }
}

/**
 * Export service for large datasets
 */
export class BulkExportService {
  static async *exportStakeholders(
    companyId: string,
    filters: FilterParams = {}
  ): AsyncGenerator<any[], void, unknown> {
    const batchSize = 100;
    
    yield* PaginationService.fetchAllPages(
      'stakeholders',
      { ...filters, company_id: companyId, deleted_at: null },
      '*',
      batchSize
    );
  }

  static async *exportSecurities(
    companyId: string,
    filters: FilterParams = {}
  ): AsyncGenerator<any[], void, unknown> {
    const batchSize = 200;
    
    yield* PaginationService.fetchAllPages(
      'securities',
      { ...filters, 'stakeholder.company_id': companyId, deleted_at: null },
      '*, stakeholder!inner(*)',
      batchSize
    );
  }
}

/**
 * React hooks for pagination integration
 */
export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export interface UsePaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setFilters: (filters: FilterParams) => void;
}

/**
 * Enhanced pagination service with React integration
 */
export class ReactPaginationService {
  /**
   * Create a custom hook for table pagination
   */
  static createPaginationHook<T>(
    tableName: string,
    selectQuery: string = '*'
  ) {
    return function usePagination(
      filters: FilterParams = {},
      options: UsePaginationOptions = {}
    ): UsePaginationResult<T> {
      const [page, setPageState] = React.useState(options.initialPage || 1);
      const [pageSize, setPageSizeState] = React.useState(options.initialPageSize || 50);
      const [sortBy, setSortBy] = React.useState(options.initialSortBy);
      const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>(options.initialSortOrder || 'desc');
      const [currentFilters, setCurrentFilters] = React.useState(filters);
      const [data, setData] = React.useState<T[]>([]);
      const [pagination, setPagination] = React.useState({
        page: 1,
        pageSize: 50,
        totalPages: 0,
        totalItems: 0,
        hasNext: false,
        hasPrevious: false
      });
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState<string | null>(null);

      const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
          const params: PaginationParams = {
            page,
            pageSize,
            sortBy,
            sortOrder
          };

          const response = await PaginationService.paginateQuery<T>(
            tableName,
            params,
            currentFilters,
            selectQuery
          );

          setData(response.data);
          setPagination(response.pagination);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
          setData([]);
        } finally {
          setLoading(false);
        }
      }, [page, pageSize, sortBy, sortOrder, currentFilters]);

      // Auto-fetch on parameter changes
      React.useEffect(() => {
        fetchData();
      }, [fetchData]);

      const setPage = React.useCallback((newPage: number) => {
        setPageState(newPage);
      }, []);

      const setPageSize = React.useCallback((newSize: number) => {
        setPageSizeState(newSize);
        setPageState(1); // Reset to first page when changing page size
      }, []);

      const setSort = React.useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        setPageState(1); // Reset to first page when changing sort
      }, []);

      const setFilters = React.useCallback((newFilters: FilterParams) => {
        setCurrentFilters(newFilters);
        setPageState(1); // Reset to first page when changing filters
      }, []);

      return {
        data,
        pagination,
        loading,
        error,
        refetch: fetchData,
        setPage,
        setPageSize,
        setSort,
        setFilters
      };
    };
  }
}