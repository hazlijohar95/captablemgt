import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { InstrumentsService } from '../services/instrumentsService';
import { 
  SecuritySummary, 
  InstrumentsFilter, 
  InstrumentsSort, 
  InstrumentsStats 
} from '../types';
import { ULID } from '@/types';

export function useInstruments(companyId: ULID) {
  const [securities, setSecurities] = useState<SecuritySummary[]>([]);
  const [stats, setStats] = useState<InstrumentsStats | null>(null);
  // Memoize initial filter and sort states to prevent unnecessary re-renders
  const initialFilters = useMemo((): InstrumentsFilter => ({
    type: 'ALL',
    status: 'ALL',
    stakeholder_type: 'ALL'
  }), []);

  const initialSort = useMemo((): InstrumentsSort => ({
    field: 'issued_at',
    direction: 'desc'
  }), []);

  const [filters, setFilters] = useState<InstrumentsFilter>(initialFilters);
  const [sort, setSort] = useState<InstrumentsSort>(initialSort);

  const { loading, error, execute, reset } = useAsyncOperation<SecuritySummary[]>();
  const { 
    loading: statsLoading, 
    error: statsError, 
    execute: executeStats,
    reset: resetStats 
  } = useAsyncOperation<InstrumentsStats>();

  const loadSecurities = useCallback(async () => {
    if (!companyId) {
      setSecurities([]);
      return;
    }

    try {
      const data = await execute(() => 
        InstrumentsService.getSecurities(companyId, filters, sort)
      );
      setSecurities(data || []);
      return data;
    } catch (error) {
      console.error('Failed to load securities:', error);
      setSecurities([]);
      return [];
    }
  }, [companyId, filters, sort, execute]);

  const loadStats = useCallback(async () => {
    if (!companyId) {
      setStats(null);
      return;
    }

    try {
      const data = await executeStats(() => 
        InstrumentsService.getInstrumentsStats(companyId)
      );
      setStats(data || null);
      return data;
    } catch (error) {
      console.error('Failed to load instruments stats:', error);
      setStats(null);
      return null;
    }
  }, [companyId, executeStats]);

  const refreshData = useCallback(async () => {
    reset();
    resetStats();
    await Promise.all([
      loadSecurities(),
      loadStats()
    ]);
  }, [loadSecurities, loadStats, reset, resetStats]);

  const updateFilters = useCallback((newFilters: InstrumentsFilter) => {
    // Only update if filters actually changed
    setFilters(prev => {
      const hasChanged = JSON.stringify(prev) !== JSON.stringify(newFilters);
      return hasChanged ? newFilters : prev;
    });
  }, []);

  const updateSort = useCallback((newSort: InstrumentsSort) => {
    // Only update if sort actually changed
    setSort(prev => {
      const hasChanged = prev.field !== newSort.field || prev.direction !== newSort.direction;
      return hasChanged ? newSort : prev;
    });
  }, []);

  // Memoize filter and sort equality checks to prevent unnecessary API calls
  const filtersString = useMemo(() => JSON.stringify(filters), [filters]);
  const sortString = useMemo(() => JSON.stringify(sort), [sort]);

  const cancelSecurity = useCallback(async (securityId: string) => {
    if (!companyId) return;

    try {
      await InstrumentsService.cancelSecurity(securityId, companyId);
      await refreshData(); // Reload data after cancellation
    } catch (error) {
      console.error('Failed to cancel security:', error);
      throw error;
    }
  }, [companyId, refreshData]);

  const reactivateSecurity = useCallback(async (securityId: string) => {
    if (!companyId) return;

    try {
      await InstrumentsService.reactivateSecurity(securityId, companyId);
      await refreshData(); // Reload data after reactivation
    } catch (error) {
      console.error('Failed to reactivate security:', error);
      throw error;
    }
  }, [companyId, refreshData]);

  // Load data when component mounts or dependencies change
  useEffect(() => {
    loadSecurities();
  }, [companyId, filtersString, sortString]); // Use memoized strings instead of objects

  useEffect(() => {
    loadStats();
  }, [companyId]); // Stats only depend on companyId

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    // Data
    securities,
    stats,
    
    // Loading states
    loading,
    statsLoading,
    
    // Error states
    error,
    statsError,
    
    // Filters and sorting
    filters,
    sort,
    updateFilters,
    updateSort,
    
    // Actions
    refreshData,
    cancelSecurity,
    reactivateSecurity,
    
    // Loading functions
    loadSecurities,
    loadStats,
  }), [
    securities,
    stats,
    loading,
    statsLoading,
    error,
    statsError,
    filters,
    sort,
    updateFilters,
    updateSort,
    refreshData,
    cancelSecurity,
    reactivateSecurity,
    loadSecurities,
    loadStats,
  ]);

  return returnValue;
}