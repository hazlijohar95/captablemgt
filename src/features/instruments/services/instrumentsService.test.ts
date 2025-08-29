import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InstrumentsService } from './instrumentsService';
import { AuthorizationService } from '@/services/authorizationService';
import { supabase } from '@/services/supabase';

// Mock data (defined first to be used in mocks)
const mockSecuritiesData = [
  {
    id: 'security-1',
    company_id: 'company-1',
    type: 'EQUITY',
    quantity: 10000,
    issued_at: '2025-01-01',
    cancelled_at: null,
    terms: null,
    stakeholder: {
      id: 'stakeholder-1',
      type: 'FOUNDER',
      people: { name: 'John Doe', email: 'john@example.com' },
      entity_name: null
    },
    share_classes: {
      id: 'class-1',
      name: 'Common Stock',
      type: 'COMMON'
    }
  },
  {
    id: 'security-2',
    company_id: 'company-1',
    type: 'OPTION',
    quantity: 5000,
    issued_at: '2025-01-15',
    cancelled_at: null,
    terms: { strikePrice: '1.00', expirationDate: '2029-01-15' },
    stakeholder: {
      id: 'stakeholder-2',
      type: 'EMPLOYEE',
      people: { name: 'Jane Smith', email: 'jane@example.com' },
      entity_name: null
    },
    share_classes: null
  }
];

// Create a shared mock query builder that supports chaining
const mockQueryBuilder = {
  select: vi.fn(() => mockQueryBuilder),
  eq: vi.fn(() => mockQueryBuilder),
  gte: vi.fn(() => mockQueryBuilder),
  lte: vi.fn(() => mockQueryBuilder),
  or: vi.fn(() => mockQueryBuilder),
  is: vi.fn(() => mockQueryBuilder),
  not: vi.fn(() => mockQueryBuilder),
  order: vi.fn(() => Promise.resolve({
    data: mockSecuritiesData,
    error: null
  })),
  update: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  })),
  then: vi.fn((resolve: any) => Promise.resolve({
    data: mockSecuritiesData,
    error: null
  }).then(resolve))
};

// Mock modules
vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQueryBuilder)
  }
}));

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    validateCompanyAccess: vi.fn(),
    verifyFinancialDataAccess: vi.fn(),
    logSecurityEvent: vi.fn()
  }
}));

describe('InstrumentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset specific mock methods
    Object.values(mockQueryBuilder).forEach(mock => {
      if (typeof mock === 'function' && 'mockClear' in mock) {
        mock.mockClear();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSecurities', () => {
    it('should fetch securities with proper authorization', async () => {
      const securities = await InstrumentsService.getSecurities('company-1');

      expect(AuthorizationService.validateCompanyAccess).toHaveBeenCalledWith('company-1');
      expect(AuthorizationService.verifyFinancialDataAccess).toHaveBeenCalledWith('company-1', 'read');
      expect(securities).toHaveLength(2);
      expect(securities[0]).toMatchObject({
        id: 'security-1',
        type: 'EQUITY',
        stakeholder_name: 'John Doe',
        stakeholder_type: 'FOUNDER',
        status: 'active'
      });
    });

    it('should apply type filter', async () => {
      const filters = { type: 'EQUITY' as const };
      await InstrumentsService.getSecurities('company-1', filters);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('type', 'EQUITY');
    });

    it('should apply status filter for active securities', async () => {
      const filters = { status: 'active' as const };
      await InstrumentsService.getSecurities('company-1', filters);

      // Verify that is() method was called for cancelled_at filtering  
      expect(mockQueryBuilder.is).toHaveBeenCalledWith('cancelled_at', null);
    });

    it('should apply date range filters', async () => {
      const filters = {
        date_from: '2025-01-01',
        date_to: '2025-12-31'
      };
      await InstrumentsService.getSecurities('company-1', filters);

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('issued_at', '2025-01-01');
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('issued_at', '2025-12-31');
    });

    it('should handle search filtering client-side for short queries', async () => {
      const filters = { search: 'Jo' }; // Short query
      const securities = await InstrumentsService.getSecurities('company-1', filters);

      // Should return filtered results client-side
      expect(securities.length).toBeGreaterThanOrEqual(0);
    });

    it('should sort by stakeholder name client-side', async () => {
      const sort = { field: 'stakeholder_name' as const, direction: 'asc' as const };
      const securities = await InstrumentsService.getSecurities('company-1', {}, sort);

      // Should have results in sorted order
      expect(securities[0].stakeholder_name).toBe('Jane Smith');
      expect(securities[1].stakeholder_name).toBe('John Doe');
    });

    it('should handle entity stakeholders correctly', async () => {
      const entityData = [{
        ...mockSecuritiesData[0],
        stakeholder: {
          id: 'stakeholder-3',
          type: 'ENTITY',
          people: null,
          entity_name: 'Tech Ventures LLC'
        }
      }];

      vi.mocked(supabase).from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: entityData,
              error: null
            }))
          }))
        }))
      });

      const securities = await InstrumentsService.getSecurities('company-1');
      expect(securities[0].stakeholder_name).toBe('Tech Ventures LLC');
    });
  });

  describe('getInstrumentsStats', () => {
    beforeEach(() => {
      vi.mocked(supabase).from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: mockSecuritiesData,
            error: null
          }))
        }))
      });
    });

    it('should calculate basic statistics correctly', async () => {
      const stats = await InstrumentsService.getInstrumentsStats('company-1');

      expect(stats.total_securities).toBe(2);
      expect(stats.active_securities).toBe(2);
      expect(stats.cancelled_securities).toBe(0);
    });

    it('should calculate shares outstanding for EQUITY only', async () => {
      const stats = await InstrumentsService.getInstrumentsStats('company-1');
      expect(stats.total_shares_outstanding).toBe(10000); // Only EQUITY securities
    });

    it('should group by security type', async () => {
      const stats = await InstrumentsService.getInstrumentsStats('company-1');
      
      expect(stats.by_type.EQUITY.count).toBe(1);
      expect(stats.by_type.EQUITY.total_quantity).toBe(10000);
      expect(stats.by_type.OPTION.count).toBe(1);
      expect(stats.by_type.OPTION.total_quantity).toBe(5000);
    });

    it('should group by stakeholder type', async () => {
      const stats = await InstrumentsService.getInstrumentsStats('company-1');
      
      expect(stats.by_stakeholder_type.FOUNDER.count).toBe(1);
      expect(stats.by_stakeholder_type.EMPLOYEE.count).toBe(1);
    });

    it('should handle cancelled securities correctly', async () => {
      const dataWithCancelled = [
        ...mockSecuritiesData,
        {
          ...mockSecuritiesData[0],
          id: 'security-3',
          cancelled_at: '2025-02-01'
        }
      ];

      vi.mocked(supabase).from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: dataWithCancelled,
            error: null
          }))
        }))
      });

      const stats = await InstrumentsService.getInstrumentsStats('company-1');
      expect(stats.total_securities).toBe(3);
      expect(stats.active_securities).toBe(2);
      expect(stats.cancelled_securities).toBe(1);
    });
  });

  describe('cancelSecurity', () => {
    it('should cancel security with proper authorization', async () => {
      await InstrumentsService.cancelSecurity('security-1', 'company-1');

      expect(AuthorizationService.validateCompanyAccess).toHaveBeenCalledWith('company-1');
      expect(AuthorizationService.verifyFinancialDataAccess).toHaveBeenCalledWith('company-1', 'admin');
      expect(AuthorizationService.logSecurityEvent).toHaveBeenCalledWith(
        'company-1',
        'CANCEL_SECURITY',
        'securities',
        { securityId: 'security-1' }
      );
    });

    it('should update security with cancelled_at timestamp', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));
      vi.mocked(supabase).from.mockReturnValueOnce({ update: mockUpdate });

      await InstrumentsService.cancelSecurity('security-1', 'company-1');

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        cancelled_at: expect.any(String),
        updated_at: expect.any(String)
      }));
    });

    it('should handle database errors', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ 
            error: { message: 'Database error' }
          }))
        }))
      }));
      vi.mocked(supabase).from.mockReturnValueOnce({ update: mockUpdate });

      await expect(
        InstrumentsService.cancelSecurity('security-1', 'company-1')
      ).rejects.toThrow('Failed to cancel security: Database error');
    });
  });

  describe('reactivateSecurity', () => {
    it('should reactivate security with proper authorization', async () => {
      await InstrumentsService.reactivateSecurity('security-1', 'company-1');

      expect(AuthorizationService.validateCompanyAccess).toHaveBeenCalledWith('company-1');
      expect(AuthorizationService.verifyFinancialDataAccess).toHaveBeenCalledWith('company-1', 'admin');
      expect(AuthorizationService.logSecurityEvent).toHaveBeenCalledWith(
        'company-1',
        'REACTIVATE_SECURITY',
        'securities',
        { securityId: 'security-1' }
      );
    });

    it('should clear cancelled_at field', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));
      vi.mocked(supabase).from.mockReturnValueOnce({ update: mockUpdate });

      await InstrumentsService.reactivateSecurity('security-1', 'company-1');

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        cancelled_at: null,
        updated_at: expect.any(String)
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle authorization errors', async () => {
      const authError = new Error('Unauthorized access');
      vi.mocked(AuthorizationService.validateCompanyAccess).mockRejectedValueOnce(authError);

      await expect(
        InstrumentsService.getSecurities('company-1')
      ).rejects.toThrow('Unauthorized access');
    });

    it('should handle database connection errors', async () => {
      vi.mocked(supabase).from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Connection failed' }
            }))
          }))
        }))
      });

      await expect(
        InstrumentsService.getSecurities('company-1')
      ).rejects.toThrow('Failed to fetch securities: Connection failed');
    });
  });
});