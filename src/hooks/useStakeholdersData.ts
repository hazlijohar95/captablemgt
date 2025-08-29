import { useState, useEffect, useCallback } from 'react';
import { capTableService } from '@/services/capTableService';
import { ULID } from '@/types';
import { useAsyncOperation } from './useAsyncOperation';

// Type for stakeholder with relations from the service
type StakeholderWithRelations = {
  id: string;
  type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
  entity_name: string | null;
  tax_id: string | null;
  created_at: string;
  people?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  securities: {
    id: string;
    type: string;
    quantity: number;
    issued_at: string;
    cancelled_at: string | null;
  }[];
};

/**
 * Custom hook for stakeholders data management
 */
export function useStakeholdersData(companyId: ULID) {
  const [stakeholders, setStakeholders] = useState<StakeholderWithRelations[]>([]);
  const { loading, error, execute, reset } = useAsyncOperation<StakeholderWithRelations[]>();

  const loadStakeholders = useCallback(async () => {
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    
    const data = await execute(() => capTableService.getStakeholders(companyId));
    setStakeholders(data);
    return data;
  }, [companyId, execute]);

  const refreshStakeholders = useCallback(async () => {
    reset();
    return loadStakeholders();
  }, [loadStakeholders, reset]);

  useEffect(() => {
    loadStakeholders().catch(() => {
      // Error is already handled by useAsyncOperation
    });
  }, [loadStakeholders]);

  return {
    stakeholders,
    loading,
    error,
    loadStakeholders,
    refreshStakeholders,
    reset,
  };
}