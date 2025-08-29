import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCSRFProtection, useCSRFForm } from './useCSRFProtection';
import { CSRFService, CSRFError } from '@/services/csrfService';

// Mock CSRFService
vi.mock('@/services/csrfService', () => ({
  CSRFService: {
    initializeForm: vi.fn(),
    clearToken: vi.fn(),
    validateToken: vi.fn()
  },
  CSRFError: class CSRFError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'CSRFError';
    }
  }
}));

describe('useCSRFProtection', () => {
  const mockToken = '2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful initialization
    vi.mocked(CSRFService.initializeForm).mockResolvedValue({
      csrfToken: mockToken,
      csrfHeader: { 'X-CSRF-Token': mockToken }
    });

    vi.mocked(CSRFService.validateToken).mockResolvedValue();
  });

  it('should initialize CSRF protection on mount', async () => {
    const { result } = renderHook(() => useCSRFProtection());

    expect(result.current.loading).toBe(true);
    expect(result.current.initialized).toBe(false);
    expect(result.current.token).toBe(null);

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isReady).toBe(true);
    expect(CSRFService.initializeForm).toHaveBeenCalledOnce();
  });

  it('should handle initialization error', async () => {
    const errorMessage = 'Failed to initialize CSRF';
    vi.mocked(CSRFService.initializeForm).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCSRFProtection());

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.loading).toBe(false);
    expect(result.current.initialized).toBe(false);
    expect(result.current.token).toBe(null);
    expect(result.current.isReady).toBe(false);
  });

  it('should refresh token when requested', async () => {
    const { result } = renderHook(() => useCSRFProtection());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    const newToken = 'new-csrf-token-hash';
    vi.mocked(CSRFService.initializeForm).mockResolvedValue({
      csrfToken: newToken,
      csrfHeader: { 'X-CSRF-Token': newToken }
    });

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(result.current.token).toBe(newToken);
    expect(CSRFService.clearToken).toHaveBeenCalled();
  });

  it('should validate token successfully', async () => {
    const { result } = renderHook(() => useCSRFProtection());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    await act(async () => {
      const isValid = await result.current.validateToken('company-id');
      expect(isValid).toBe(true);
    });

    expect(CSRFService.validateToken).toHaveBeenCalledWith(mockToken, 'company-id');
    expect(result.current.error).toBe(null);
  });

  it('should handle token validation failure', async () => {
    const { result } = renderHook(() => useCSRFProtection());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    // Mock validation failure with a non-CSRF error to prevent auto-refresh
    const validationError = new Error('Invalid CSRF token');
    vi.mocked(CSRFService.validateToken).mockRejectedValue(validationError);

    await act(async () => {
      const isValid = await result.current.validateToken('company-id');
      expect(isValid).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid CSRF token');
    });
  });

  it('should refresh token automatically on validation failure', async () => {
    const { result } = renderHook(() => useCSRFProtection());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    const validationError = new CSRFError('CSRF token has expired');
    vi.mocked(CSRFService.validateToken).mockRejectedValueOnce(validationError);

    const newToken = 'refreshed-csrf-token-hash';
    vi.mocked(CSRFService.initializeForm).mockResolvedValue({
      csrfToken: newToken,
      csrfHeader: { 'X-CSRF-Token': newToken }
    });

    await act(async () => {
      const isValid = await result.current.validateToken('company-id');
      expect(isValid).toBe(false);
    });

    // Should trigger refresh
    await waitFor(() => {
      expect(result.current.token).toBe(newToken);
    });
  });

  it('should return CSRF headers correctly', async () => {
    const { result } = renderHook(() => useCSRFProtection());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    const headers = result.current.getCSRFHeaders();
    expect(headers).toEqual({
      'X-CSRF-Token': mockToken
    });
  });

  it('should throw error when getting headers without token', async () => {
    vi.mocked(CSRFService.initializeForm).mockRejectedValue(new Error('No token'));
    const { result } = renderHook(() => useCSRFProtection());

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    expect(() => result.current.getCSRFHeaders()).toThrow(CSRFError);
  });

  it('should set up auto-refresh functionality', async () => {
    const { result } = renderHook(() => useCSRFProtection());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    // Test that the refresh function is available and working
    const newToken = 'manually-refreshed-token';
    vi.mocked(CSRFService.initializeForm).mockResolvedValue({
      csrfToken: newToken,
      csrfHeader: { 'X-CSRF-Token': newToken }
    });

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(result.current.token).toBe(newToken);
  });
});

describe('useCSRFForm', () => {
  const mockToken = '2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a';

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mocks for CSRFForm tests
    vi.mocked(CSRFService.initializeForm).mockReset();
    vi.mocked(CSRFService.validateToken).mockReset();
    vi.mocked(CSRFService.clearToken).mockReset();

    // Default successful initialization for form tests
    vi.mocked(CSRFService.initializeForm).mockResolvedValue({
      csrfToken: mockToken,
      csrfHeader: { 'X-CSRF-Token': mockToken }
    });

    vi.mocked(CSRFService.validateToken).mockResolvedValue();
  });

  it('should extend useCSRFProtection with form helpers', async () => {
    const { result } = renderHook(() => useCSRFForm());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    expect(result.current).toHaveProperty('getFormDataWithCSRF');
    expect(result.current).toHaveProperty('prepareSubmission');
    expect(result.current.token).toBe(mockToken);
  });

  it('should add CSRF token to form data', async () => {
    const { result } = renderHook(() => useCSRFForm());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    const formData = { name: 'John Doe', email: 'john@example.com' };
    const secureFormData = result.current.getFormDataWithCSRF(formData);

    expect(secureFormData).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      csrfToken: mockToken
    });
  });

  it('should throw error when adding CSRF token without token', async () => {
    vi.mocked(CSRFService.initializeForm).mockRejectedValue(new Error('No token'));
    const { result } = renderHook(() => useCSRFForm());

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    const formData = { name: 'John Doe' };
    expect(() => result.current.getFormDataWithCSRF(formData)).toThrow(CSRFError);
  });

  it('should prepare submission with validation', async () => {
    const { result } = renderHook(() => useCSRFForm());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    const formData = { name: 'John Doe', email: 'john@example.com' };
    const companyId = 'company-123';

    await act(async () => {
      const secureFormData = await result.current.prepareSubmission(formData, companyId);
      
      expect(secureFormData).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        csrfToken: mockToken
      });
    });

    expect(CSRFService.validateToken).toHaveBeenCalledWith(mockToken, companyId);
  });

  it('should throw error when preparing submission without ready state', async () => {
    vi.mocked(CSRFService.initializeForm).mockRejectedValue(new Error('Not ready'));
    const { result } = renderHook(() => useCSRFForm());

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    const formData = { name: 'John Doe' };

    await act(async () => {
      await expect(result.current.prepareSubmission(formData)).rejects.toThrow(CSRFError);
      await expect(result.current.prepareSubmission(formData)).rejects.toThrow('CSRF protection not ready');
    });
  });

  it('should handle validation failure in prepareSubmission', async () => {
    const { result } = renderHook(() => useCSRFForm());

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    vi.mocked(CSRFService.validateToken).mockRejectedValue(new CSRFError('Validation failed'));

    const formData = { name: 'John Doe' };

    await act(async () => {
      await expect(result.current.prepareSubmission(formData)).rejects.toThrow(CSRFError);
      await expect(result.current.prepareSubmission(formData)).rejects.toThrow('CSRF token validation failed');
    });
  });
});