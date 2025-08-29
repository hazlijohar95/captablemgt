import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CSRFService, CSRFError } from './csrfService';
import { supabase } from './supabase';
import { AuthorizationService } from './authorizationService';

// Mock dependencies
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}));

vi.mock('./authorizationService', () => ({
  AuthorizationService: {
    logSecurityEvent: vi.fn(),
    checkRateLimit: vi.fn(),
    verifyFinancialDataAccess: vi.fn()
  }
}));

// Mock crypto for consistent testing
const mockCryptoValues = new Uint8Array(32).fill(42); // Fixed values for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn().mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = mockCryptoValues[i % mockCryptoValues.length];
      }
      return array;
    }),
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
});

// Mock sessionStorage
const mockSessionStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockSessionStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockSessionStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store = {};
  })
};

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage
});

describe('CSRFService', () => {
  const mockUser = {
    id: '12345678-1234-1234-1234-123456789012',
    email: 'test@example.com'
  };

  const mockCompanyId = '87654321-4321-4321-4321-210987654321';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    
    // Default mock implementations
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'audit-event-id' }],
          error: null
        })
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          })
        })
      })
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('generateToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = CSRFService.generateToken();
      
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different tokens on multiple calls', () => {
      // Mock different random values for each call
      let callCount = 0;
      vi.mocked(global.crypto.getRandomValues).mockImplementation((array) => {
        const typedArray = array as Uint8Array;
        for (let i = 0; i < typedArray.length; i++) {
          typedArray[i] = (mockCryptoValues[i] + callCount) % 256;
        }
        callCount++;
        return array;
      });

      const token1 = CSRFService.generateToken();
      const token2 = CSRFService.generateToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('getToken', () => {
    it('should generate and store a new token when none exists', async () => {
      const token = await CSRFService.getToken();
      
      expect(token).toHaveLength(64);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('csrf_token');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('csrf_token', token);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('csrf_token_timestamp', expect.any(String));
    });

    it('should return existing valid token', async () => {
      const existingToken = 'existing-token-hash';
      const currentTime = Date.now();
      
      mockSessionStorage.store['csrf_token'] = existingToken;
      mockSessionStorage.store['csrf_token_timestamp'] = currentTime.toString();
      
      const token = await CSRFService.getToken();
      
      expect(token).toBe(existingToken);
    });

    it('should generate new token when existing token is expired', async () => {
      const existingToken = 'expired-token-hash';
      const expiredTime = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      
      mockSessionStorage.store['csrf_token'] = existingToken;
      mockSessionStorage.store['csrf_token_timestamp'] = expiredTime.toString();
      
      const token = await CSRFService.getToken();
      
      expect(token).not.toBe(existingToken);
      expect(token).toHaveLength(64);
    });

    it('should throw CSRFError when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(CSRFService.getToken()).rejects.toThrow(CSRFError);
      await expect(CSRFService.getToken()).rejects.toThrow('Failed to generate CSRF token');
    });
  });

  describe('validateToken', () => {
    const validToken = '2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a';
    
    beforeEach(() => {
      const currentTime = Date.now();
      mockSessionStorage.store['csrf_token'] = validToken;
      mockSessionStorage.store['csrf_token_timestamp'] = currentTime.toString();

      // Reset the getItem mock to use the store
      vi.mocked(mockSessionStorage.getItem).mockImplementation((key: string) => {
        return mockSessionStorage.store[key] || null;
      });
    });

    it('should validate a correct token successfully', async () => {
      // Mock the hash token calculation to return expected hash
      vi.spyOn(CSRFService as any, 'hashToken').mockResolvedValue('expected-hash');
      
      // Mock database validation to return valid token with expected hash
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [{
                        after: {
                          type: 'csrf_token',
                          token_hash: 'expected-hash',
                          expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString()
                        }
                      }],
                      error: null
                    })
                  })
                })
              })
            })
          })
        })
      });

      await expect(CSRFService.validateToken(validToken, mockCompanyId)).resolves.toBeUndefined();
      expect(AuthorizationService.logSecurityEvent).toHaveBeenCalledWith(
        mockCompanyId,
        'csrf_validation_success',
        'financial_transaction',
        expect.objectContaining({
          token_hash: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid-token';
      
      await expect(CSRFService.validateToken(invalidToken, mockCompanyId)).rejects.toThrow(CSRFError);
      await expect(CSRFService.validateToken(invalidToken, mockCompanyId)).rejects.toThrow('Invalid CSRF token');
    });

    it('should reject expired token', async () => {
      const expiredTime = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      
      // Set up expired token in session storage after clearing
      vi.mocked(mockSessionStorage.getItem).mockImplementation((key: string) => {
        if (key === 'csrf_token') return validToken;
        if (key === 'csrf_token_timestamp') return expiredTime.toString();
        return null;
      });
      
      await expect(CSRFService.validateToken(validToken)).rejects.toThrow(CSRFError);
      await expect(CSRFService.validateToken(validToken)).rejects.toThrow('CSRF token has expired');
    });

    it('should reject when no token in session', async () => {
      // Reset the getItem mock to return null for all keys (simulating cleared storage)
      vi.mocked(mockSessionStorage.getItem).mockImplementation(() => null);
      
      await expect(CSRFService.validateToken(validToken)).rejects.toThrow(CSRFError);
      await expect(CSRFService.validateToken(validToken)).rejects.toThrow('No CSRF token found in session');
    });

    it('should reject when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null
      });
      
      await expect(CSRFService.validateToken(validToken)).rejects.toThrow(CSRFError);
      await expect(CSRFService.validateToken(validToken)).rejects.toThrow('User not authenticated');
    });
  });

  describe('validateFinancialTransaction', () => {
    const validToken = '2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a';
    const transactionPayload = {
      stakeholderId: 'stakeholder-id',
      type: 'EQUITY',
      quantity: 1000
    };

    beforeEach(() => {
      const currentTime = Date.now();
      mockSessionStorage.store['csrf_token'] = validToken;
      mockSessionStorage.store['csrf_token_timestamp'] = currentTime.toString();

      // Reset the getItem mock to use the store
      vi.mocked(mockSessionStorage.getItem).mockImplementation((key: string) => {
        return mockSessionStorage.store[key] || null;
      });

      // Mock the hash token calculation to return expected hash
      vi.spyOn(CSRFService as any, 'hashToken').mockResolvedValue('expected-hash');

      // Mock successful database validation
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [{
                        after: {
                          type: 'csrf_token',
                          token_hash: 'expected-hash',
                          expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString()
                        }
                      }],
                      error: null
                    })
                  })
                })
              })
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'audit-event-id' }],
            error: null
          })
        })
      });
    });

    it('should validate successful financial transaction', async () => {
      await expect(
        CSRFService.validateFinancialTransaction(
          validToken,
          'ISSUE',
          mockCompanyId,
          transactionPayload
        )
      ).resolves.toBeUndefined();

      expect(AuthorizationService.checkRateLimit).toHaveBeenCalledWith('financial_issue', 60, 10);
      expect(AuthorizationService.verifyFinancialDataAccess).toHaveBeenCalledWith(mockCompanyId, 'write');
      expect(AuthorizationService.logSecurityEvent).toHaveBeenCalledWith(
        mockCompanyId,
        'financial_transaction_issue',
        'transaction_validation',
        expect.objectContaining({
          transaction_type: 'ISSUE',
          csrf_validated: true,
          payload_hash: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('should log security event on failed validation', async () => {
      const invalidToken = 'invalid-token';

      await expect(
        CSRFService.validateFinancialTransaction(
          invalidToken,
          'ISSUE',
          mockCompanyId,
          transactionPayload
        )
      ).rejects.toThrow();

      expect(AuthorizationService.logSecurityEvent).toHaveBeenCalledWith(
        mockCompanyId,
        'financial_transaction_failed',
        'security_violation',
        expect.objectContaining({
          transaction_type: 'ISSUE',
          error: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle different transaction types', async () => {
      const transactionTypes = ['ISSUE', 'TRANSFER', 'CANCEL', 'CONVERT', 'EXERCISE'] as const;

      for (const transactionType of transactionTypes) {
        await CSRFService.validateFinancialTransaction(
          validToken,
          transactionType,
          mockCompanyId,
          transactionPayload
        );

        expect(AuthorizationService.checkRateLimit).toHaveBeenCalledWith(
          `financial_${transactionType.toLowerCase()}`,
          60,
          10
        );
      }
    });
  });

  describe('clearToken', () => {
    it('should remove token and timestamp from session storage', () => {
      mockSessionStorage.store['csrf_token'] = 'some-token';
      mockSessionStorage.store['csrf_token_timestamp'] = '12345';

      CSRFService.clearToken();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('csrf_token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('csrf_token_timestamp');
    });
  });

  describe('initializeForm', () => {
    it('should return token and header for form initialization', async () => {
      const result = await CSRFService.initializeForm();

      expect(result).toHaveProperty('csrfToken');
      expect(result).toHaveProperty('csrfHeader');
      expect(result.csrfToken).toHaveLength(64);
      expect(result.csrfHeader).toEqual({
        'X-CSRF-Token': result.csrfToken
      });
    });
  });
});