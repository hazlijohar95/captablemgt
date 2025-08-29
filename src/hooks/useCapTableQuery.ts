// React Query integration for Cap Table data
// This is an example implementation for future React Query integration

// This file requires @tanstack/react-query to be installed
// npm install @tanstack/react-query

// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { capTableService } from '@/services/capTableService';
// import { ICapTableResponse, ULID } from '@/types';

// Uncomment the imports above when React Query is installed

// Query keys for consistent caching
export const capTableKeys = {
  all: ['capTable'] as const,
  company: (companyId: string) => [...capTableKeys.all, companyId] as const,
  stakeholders: (companyId: string) => [...capTableKeys.company(companyId), 'stakeholders'] as const,
  shareClasses: (companyId: string) => [...capTableKeys.company(companyId), 'shareClasses'] as const,
} as const;

/**
 * React Query hook for cap table data with caching and background updates
 */
/* Example React Query implementation - requires @tanstack/react-query
export function useCapTableQuery(companyId: ULID, asOf?: string) {
  return useQuery({
    queryKey: [...capTableKeys.company(companyId), { asOf }],
    queryFn: async (): Promise<ICapTableResponse> => {
      const result = await capTableService.getCapTable(companyId, asOf);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on authorization errors
      if (error.message.includes('Access denied')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
*/

/**
 * React Query hook for stakeholders data
 */
/* Example React Query implementation
export function useStakeholdersQuery(companyId: ULID) {
  return useQuery({
    queryKey: capTableKeys.stakeholders(companyId),
    queryFn: async () => {
      const result = await capTableService.getStakeholders(companyId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
*/

/**
 * Mutation hook for creating stakeholders with optimistic updates
 */
/* Example Mutation hook
export function useCreateStakeholderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      companyId: ULID;
      personId?: ULID;
      entityName?: string;
      type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
      taxId?: string;
    }) => {
      const result = await capTableService.createStakeholder(data);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: capTableKeys.stakeholders(variables.companyId)
      });
      queryClient.invalidateQueries({
        queryKey: capTableKeys.company(variables.companyId)
      });
    },
    onError: (error) => {
      console.error('Failed to create stakeholder:', error);
    },
  });
}
*/

/**
 * Mutation hook for creating people
 */
/* Example Person Mutation
export function useCreatePersonMutation() {
  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      phone?: string;
    }) => {
      const result = await capTableService.createPerson(data);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
*/

/**
 * Hook for prefetching related data
 */
/* Example Prefetching
export function usePrefetchCapTableData(companyId: ULID) {
  const queryClient = useQueryClient();

  const prefetchStakeholders = () => {
    queryClient.prefetchQuery({
      queryKey: capTableKeys.stakeholders(companyId),
      queryFn: async () => {
        const result = await capTableService.getStakeholders(companyId);
        if (!result.success) throw new Error(result.error.message);
        return result.data;
      },
      staleTime: 2 * 60 * 1000,
    });
  };

  const prefetchShareClasses = () => {
    queryClient.prefetchQuery({
      queryKey: capTableKeys.shareClasses(companyId),
      queryFn: async () => {
        const result = await capTableService.getShareClasses(companyId);
        if (!result.success) throw new Error(result.error.message);
        return result.data;
      },
      staleTime: 10 * 60 * 1000, // Share classes change less frequently
    });
  };

  return {
    prefetchStakeholders,
    prefetchShareClasses,
  };
}
*/

/**
 * Real-time subscription hook (example implementation)
 * This would work with Supabase real-time subscriptions
 */
/* Example Real-time subscription
export function useCapTableRealtime(companyId: ULID) {
  const queryClient = useQueryClient();

  // This is a placeholder for real-time subscription logic
  // In practice, you'd use Supabase's real-time features here
  useEffect(() => {
    if (!companyId) return;

    const subscription = supabase
      .channel(`company:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'securities',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          // Invalidate cap table queries when securities change
          queryClient.invalidateQueries({
            queryKey: capTableKeys.company(companyId)
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stakeholders',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          // Invalidate stakeholders queries
          queryClient.invalidateQueries({
            queryKey: capTableKeys.stakeholders(companyId)
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [companyId, queryClient]);

  return {
    // Placeholder for real-time status
    isConnected: false,
    isSubscribed: false,
  };
}
*/

// Placeholder function for TypeScript compatibility
export function useCapTableRealtime() {
  return {
    isConnected: false,
    isSubscribed: false,
  };
}