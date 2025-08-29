import { useState, useEffect, useCallback } from 'react';
import { capTableService } from '@/services/capTableService';
import { ICapTableResponse, ULID } from '@/types';
import { useAsyncOperation } from './useAsyncOperation';

/**
 * Custom hook for cap table data management
 */
export function useCapTableData(companyId: ULID, asOf?: string) {
  const [capTableData, setCapTableData] = useState<ICapTableResponse | null>(null);
  const { loading, error, execute, reset } = useAsyncOperation<ICapTableResponse>();

  const loadCapTable = useCallback(async () => {
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    
    const data = await execute(() => capTableService.getCapTable(companyId, asOf));
    setCapTableData(data);
    return data;
  }, [companyId, asOf, execute]);

  const refreshCapTable = useCallback(async () => {
    reset();
    return loadCapTable();
  }, [loadCapTable, reset]);

  useEffect(() => {
    loadCapTable().catch(() => {
      // Error is already handled by useAsyncOperation
    });
  }, [loadCapTable]);

  return {
    capTableData,
    loading,
    error,
    loadCapTable,
    refreshCapTable,
    reset,
  };
}