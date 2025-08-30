/**
 * Custom hook for managing 409A valuations
 * Provides state management, API integration, and business logic
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Valuation409A, 
  Valuation409AResponse,
  ValuationListFilters,
  ValuationSummaryStats,
  PaginatedValuationResponse
} from '@/types/valuation409a';
import { valuation409AService } from '@/services/valuation409aService';

export interface Use409AValuationsOptions {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  appraiserFirm?: string;
  safeHarborOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface Use409AValuationsResult {
  // Data
  valuations: Valuation409A[];
  currentValuation: Valuation409AResponse | null;
  summaryStats: ValuationSummaryStats | null;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  
  // Filters
  filters: ValuationListFilters;
  
  // Actions
  setFilters: (filters: ValuationListFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => Promise<void>;
  
  // Business actions
  createValuation: (data: any) => Promise<Valuation409AResponse>;
  updateValuation: (id: string, data: any) => Promise<Valuation409AResponse>;
  deleteValuation: (id: string) => Promise<void>;
  updateStatus: (id: string, status: string, comment?: string) => Promise<Valuation409AResponse>;
  validateValuation: (id: string) => Promise<any>;
}

export function use409AValuations(
  companyId: string,
  options: Use409AValuationsOptions = {}
): Use409AValuationsResult {
  // State
  const [valuations, setValuations] = useState<Valuation409A[]>([]);
  const [currentValuation, setCurrentValuation] = useState<Valuation409AResponse | null>(null);
  const [summaryStats, setSummaryStats] = useState<ValuationSummaryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filters state
  const [filters, setFilters] = useState<ValuationListFilters>({
    company_id: companyId,
    status: options.status,
    date_from: options.dateFrom,
    date_to: options.dateTo,
    appraiser_firm: options.appraiserFirm,
    safe_harbor_only: options.safeHarborOnly
  });

  // Fetch valuations list
  const fetchValuations = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await valuation409AService.listValuations(
        companyId,
        filters,
        page,
        pageSize
      );
      
      setValuations(response.data);
      setTotalItems(response.pagination.totalItems);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch valuations';
      setError(errorMessage);
      console.error('Error fetching valuations:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, filters, page, pageSize]);

  // Fetch current valuation
  const fetchCurrentValuation = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const current = await valuation409AService.getCurrentValuation(companyId);
      setCurrentValuation(current);
    } catch (err) {
      console.error('Error fetching current valuation:', err);
      // Don't set error state for this - it's optional data
    }
  }, [companyId]);

  // Fetch summary stats
  const fetchSummaryStats = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const stats = await valuation409AService.getValuationSummaryStats(companyId);
      setSummaryStats(stats);
    } catch (err) {
      console.error('Error fetching summary stats:', err);
      // Don't set error state for this - it's optional data
    }
  }, [companyId]);

  // Main fetch function
  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchValuations(),
      fetchCurrentValuation(),
      fetchSummaryStats()
    ]);
  }, [fetchValuations, fetchCurrentValuation, fetchSummaryStats]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh setup
  useEffect(() => {
    if (options.autoRefresh) {
      const interval = setInterval(() => {
        fetchAll();
      }, options.refreshInterval || 60000); // Default 1 minute
      
      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, options.refreshInterval, fetchAll]);

  // Update filters effect
  useEffect(() => {
    setPage(1); // Reset to first page when filters change
  }, [filters]);

  // Business action functions
  const createValuation = useCallback(async (data: any): Promise<Valuation409AResponse> => {
    setLoading(true);
    try {
      const userId = 'current-user-id'; // Would get from auth context
      const newValuation = await valuation409AService.createValuation(data, userId);
      
      // Refresh data after creation
      await fetchAll();
      
      return newValuation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create valuation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  const updateValuation = useCallback(async (
    id: string, 
    data: any
  ): Promise<Valuation409AResponse> => {
    setLoading(true);
    try {
      const userId = 'current-user-id'; // Would get from auth context
      const updatedValuation = await valuation409AService.updateValuation(
        { ...data, id },
        userId
      );
      
      // Update local state
      setValuations(prev => 
        prev.map(v => v.id === id ? updatedValuation : v)
      );
      
      // Refresh summary data
      await Promise.all([fetchCurrentValuation(), fetchSummaryStats()]);
      
      return updatedValuation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update valuation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentValuation, fetchSummaryStats]);

  const deleteValuation = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const userId = 'current-user-id'; // Would get from auth context
      await valuation409AService.deleteValuation(id, userId);
      
      // Remove from local state
      setValuations(prev => prev.filter(v => v.id !== id));
      setTotalItems(prev => prev - 1);
      
      // Refresh summary data
      await Promise.all([fetchCurrentValuation(), fetchSummaryStats()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete valuation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentValuation, fetchSummaryStats]);

  const updateStatus = useCallback(async (
    id: string, 
    status: string, 
    comment?: string
  ): Promise<Valuation409AResponse> => {
    setLoading(true);
    try {
      const userId = 'current-user-id'; // Would get from auth context
      const updatedValuation = await valuation409AService.updateValuationStatus(
        id,
        status as any,
        userId,
        comment
      );
      
      // Update local state
      setValuations(prev => 
        prev.map(v => v.id === id ? updatedValuation : v)
      );
      
      // If status changed to FINAL, refresh current valuation
      if (status === 'FINAL') {
        await fetchCurrentValuation();
      }
      
      await fetchSummaryStats();
      
      return updatedValuation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentValuation, fetchSummaryStats]);

  const validateValuation = useCallback(async (id: string) => {
    try {
      return await valuation409AService.validateValuation(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate valuation';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Pagination helpers
  const pagination = useMemo(() => ({
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1
  }), [page, pageSize, totalItems, totalPages]);

  // Filter helpers
  const updateFilters = useCallback((newFilters: ValuationListFilters) => {
    setFilters({ ...filters, ...newFilters });
  }, [filters]);

  const updatePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const updatePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
  }, []);

  return {
    // Data
    valuations,
    currentValuation,
    summaryStats,
    
    // State
    loading,
    error,
    
    // Pagination
    pagination,
    
    // Filters
    filters,
    
    // Actions
    setFilters: updateFilters,
    setPage: updatePage,
    setPageSize: updatePageSize,
    refetch: fetchAll,
    
    // Business actions
    createValuation,
    updateValuation,
    deleteValuation,
    updateStatus,
    validateValuation
  };
}