import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInstruments } from './useInstruments';
import { InstrumentsService } from '../services/instrumentsService';

// Mock the service
vi.mock('../services/instrumentsService', () => ({
  InstrumentsService: {
    getSecurities: vi.fn(),
    getInstrumentsStats: vi.fn(),
    cancelSecurity: vi.fn(),
    reactivateSecurity: vi.fn()
  }
}));

const mockSecurities = [
  {
    id: 'security-1',
    type: 'EQUITY' as const,
    quantity: 10000,
    issued_at: '2025-01-01',
    cancelled_at: null,
    stakeholder_name: 'John Doe',
    stakeholder_type: 'FOUNDER',
    share_class_name: 'Common Stock',
    share_class_type: 'COMMON',
    terms: null,
    status: 'active' as const
  }
];

const mockStats = {
  total_securities: 1,
  active_securities: 1,
  cancelled_securities: 0,
  total_shares_outstanding: 10000,
  by_type: {
    EQUITY: { count: 1, total_quantity: 10000 },
    OPTION: { count: 0, total_quantity: 0 },
    RSU: { count: 0, total_quantity: 0 },
    WARRANT: { count: 0, total_quantity: 0 },
    SAFE: { count: 0, total_quantity: 0 },
    NOTE: { count: 0, total_quantity: 0 }
  },
  by_stakeholder_type: {
    FOUNDER: { count: 1, total_quantity: 10000 }
  }
};

describe('useInstruments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(InstrumentsService.getSecurities).mockResolvedValue(mockSecurities);
    vi.mocked(InstrumentsService.getInstrumentsStats).mockResolvedValue(mockStats);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useInstruments('company-1'));

    expect(result.current.securities).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.statsLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should load securities and stats on mount', async () => {
    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.securities).toEqual(mockSecurities);
    expect(result.current.stats).toEqual(mockStats);
    expect(InstrumentsService.getSecurities).toHaveBeenCalledWith(
      'company-1', 
      { type: 'ALL', status: 'ALL', stakeholder_type: 'ALL' }, 
      { field: 'issued_at', direction: 'desc' }
    );
    expect(InstrumentsService.getInstrumentsStats).toHaveBeenCalledWith('company-1');
  });

  it('should update filters and reload data', async () => {
    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newFilters = { type: 'EQUITY' as const };
    
    act(() => {
      result.current.updateFilters(newFilters);
    });

    expect(result.current.filters.type).toBe('EQUITY');
    
    await waitFor(() => {
      expect(InstrumentsService.getSecurities).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({ type: 'EQUITY' }),
        expect.any(Object)
      );
    });
  });

  it('should update sort and reload data', async () => {
    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newSort = { field: 'quantity' as const, direction: 'desc' as const };
    
    act(() => {
      result.current.updateSort(newSort);
    });

    expect(result.current.sort).toEqual(newSort);
    
    await waitFor(() => {
      expect(InstrumentsService.getSecurities).toHaveBeenCalledWith(
        'company-1',
        expect.any(Object),
        newSort
      );
    });
  });

  it('should handle cancel security operation', async () => {
    vi.mocked(InstrumentsService.cancelSecurity).mockResolvedValue();
    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.cancelSecurity('security-1');
    });

    expect(InstrumentsService.cancelSecurity).toHaveBeenCalledWith('security-1', 'company-1');
    // Should reload data after cancellation
    expect(InstrumentsService.getSecurities).toHaveBeenCalledTimes(2);
  });

  it('should handle reactivate security operation', async () => {
    vi.mocked(InstrumentsService.reactivateSecurity).mockResolvedValue();
    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.reactivateSecurity('security-1');
    });

    expect(InstrumentsService.reactivateSecurity).toHaveBeenCalledWith('security-1', 'company-1');
    // Should reload data after reactivation
    expect(InstrumentsService.getSecurities).toHaveBeenCalledTimes(2);
  });

  it('should handle service errors gracefully', async () => {
    const error = new Error('Service unavailable');
    vi.mocked(InstrumentsService.getSecurities).mockRejectedValue(error);

    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Service unavailable');
    expect(result.current.securities).toEqual([]);
  });

  it('should handle stats loading errors separately', async () => {
    const statsError = new Error('Stats service error');
    vi.mocked(InstrumentsService.getInstrumentsStats).mockRejectedValue(statsError);

    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.statsLoading).toBe(false);
    });

    expect(result.current.statsError).toBe('Stats service error');
    expect(result.current.stats).toBeNull();
    // Securities should still load successfully
    expect(result.current.securities).toEqual(mockSecurities);
  });

  it('should provide refresh functionality', async () => {
    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the initial calls
    vi.clearAllMocks();
    vi.mocked(InstrumentsService.getSecurities).mockResolvedValue(mockSecurities);
    vi.mocked(InstrumentsService.getInstrumentsStats).mockResolvedValue(mockStats);

    act(() => {
      result.current.refreshData();
    });

    await waitFor(() => {
      expect(InstrumentsService.getSecurities).toHaveBeenCalledTimes(1);
      expect(InstrumentsService.getInstrumentsStats).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle rapid filter changes', async () => {
    const { result } = renderHook(() => useInstruments('company-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear initial service calls
    vi.clearAllMocks();
    vi.mocked(InstrumentsService.getSecurities).mockResolvedValue(mockSecurities);

    // Make filter change
    act(() => {
      result.current.updateFilters({ type: 'EQUITY' });
    });

    // Wait for the service to be called
    await waitFor(() => {
      expect(InstrumentsService.getSecurities).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({ type: 'EQUITY' }),
        expect.any(Object)
      );
    });

    expect(result.current.filters.type).toBe('EQUITY');
  });
});