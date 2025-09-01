import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SecurityDetailsStep from '../../components/steps/SecurityDetailsStep';
import { renderWithProviders, createMockShareClass } from '../test-utils';
import { SECURITY_TYPE_CONFIGS } from '../../types/issuance.types';

// Mock the services
vi.mock('../../services/issuanceService');
vi.mock('@/services/csrfService');

describe('SecurityDetailsStep', () => {
  const mockShareClasses = [
    createMockShareClass({
      id: 'common-1',
      name: 'Common Stock',
      type: 'COMMON'
    }),
    createMockShareClass({
      id: 'preferred-1',
      name: 'Series A Preferred',
      type: 'PREFERRED'
    })
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { issuanceService } = require('../../services/issuanceService');
    issuanceService.getStakeholders.mockResolvedValue([]);
    issuanceService.getShareClasses.mockResolvedValue(mockShareClasses);
    issuanceService.getRecommendedStrikePrice.mockResolvedValue({ recommendedPrice: '100' });

    const { CSRFService } = require('@/services/csrfService');
    CSRFService.getToken.mockResolvedValue('mock-token');
  });

  describe('security type selection', () => {
    it('should display all security types', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        Object.entries(SECURITY_TYPE_CONFIGS).forEach(([type, config]) => {
          expect(screen.getByText(config.label)).toBeInTheDocument();
          expect(screen.getByText(config.description)).toBeInTheDocument();
        });
      });
    });

    it('should allow selecting different security types', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        // Initially OPTION should be selected (default)
        const optionRadio = screen.getByLabelText(/Stock Options/i) as HTMLInputElement;
        expect(optionRadio.checked).toBe(true);
        
        // Click on Equity
        const equityOption = screen.getByText('Equity (Shares)').closest('div');
        fireEvent.click(equityOption!);
        
        // Verify equity is now selected
        const equityRadio = screen.getByLabelText(/Equity/i) as HTMLInputElement;
        expect(equityRadio.checked).toBe(true);
      });
    });

    it('should show security type icons', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        Object.values(SECURITY_TYPE_CONFIGS).forEach(config => {
          expect(screen.getByText(config.icon)).toBeInTheDocument();
        });
      });
    });
  });

  describe('quantity input', () => {
    it('should allow entering quantity', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        const quantityInput = screen.getByLabelText('Quantity') as HTMLInputElement;
        fireEvent.change(quantityInput, { target: { value: '1000' } });
        
        expect(quantityInput.value).toBe('1000');
        expect(screen.getByText('1,000 stock options')).toBeInTheDocument();
      });
    });

    it('should handle invalid quantity input', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        const quantityInput = screen.getByLabelText('Quantity') as HTMLInputElement;
        fireEvent.change(quantityInput, { target: { value: 'invalid' } });
        
        expect(quantityInput.value).toBe('');
      });
    });

    it('should show formatted quantity display', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        const quantityInput = screen.getByLabelText('Quantity') as HTMLInputElement;
        fireEvent.change(quantityInput, { target: { value: '1500' } });
        
        expect(screen.getByText('1,500 stock options')).toBeInTheDocument();
      });
    });
  });

  describe('share class selection', () => {
    it('should show share class dropdown for applicable security types', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        // Should show for OPTION (default)
        expect(screen.getByLabelText('Share Class')).toBeInTheDocument();
        
        // Should show all share classes
        expect(screen.getByText('Common Stock (COMMON)')).toBeInTheDocument();
        expect(screen.getByText('Series A Preferred (PREFERRED)')).toBeInTheDocument();
      });
    });

    it('should hide share class dropdown for non-applicable security types', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        // Click on SAFE
        const safeOption = screen.getByText('SAFE Agreement').closest('div');
        fireEvent.click(safeOption!);
        
        // Share class dropdown should not be present
        expect(screen.queryByLabelText('Share Class')).not.toBeInTheDocument();
      });
    });

    it('should allow selecting share class', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        const shareClassSelect = screen.getByLabelText('Share Class') as HTMLSelectElement;
        fireEvent.change(shareClassSelect, { target: { value: 'preferred-1' } });
        
        expect(shareClassSelect.value).toBe('preferred-1');
      });
    });
  });

  describe('grant date', () => {
    it('should have default grant date', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        const grantDateInput = screen.getByLabelText('Grant Date') as HTMLInputElement;
        expect(grantDateInput.value).toBeTruthy(); // Should have today's date by default
      });
    });

    it('should allow changing grant date', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        const grantDateInput = screen.getByLabelText('Grant Date') as HTMLInputElement;
        fireEvent.change(grantDateInput, { target: { value: '2024-06-15' } });
        
        expect(grantDateInput.value).toBe('2024-06-15');
      });
    });
  });

  describe('security type information', () => {
    it('should show security type requirements', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        // For OPTIONS (default selection)
        expect(screen.getByText('Strike Price:')).toBeInTheDocument();
        expect(screen.getByText('Required')).toBeInTheDocument(); // Strike price required
        
        expect(screen.getByText('Vesting:')).toBeInTheDocument();
        expect(screen.getByText('Required')).toBeInTheDocument(); // Vesting required
        
        expect(screen.getByText('Expiration:')).toBeInTheDocument();
        expect(screen.getByText('Required')).toBeInTheDocument(); // Expiration required
      });
    });

    it('should update requirements when security type changes', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        // Switch to EQUITY
        const equityOption = screen.getByText('Equity (Shares)').closest('div');
        fireEvent.click(equityOption!);
      });
      
      await waitFor(() => {
        const requirements = screen.getAllByText('Not applicable');
        expect(requirements.length).toBeGreaterThan(0); // Some requirements should be "Not applicable" for equity
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper form labels', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
        expect(screen.getByLabelText('Share Class')).toBeInTheDocument();
        expect(screen.getByLabelText('Grant Date')).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: 'Security Details' })).toBeInTheDocument();
      });
    });

    it('should have proper radio group for security types', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        const radioButtons = screen.getAllByRole('radio');
        expect(radioButtons.length).toBe(Object.keys(SECURITY_TYPE_CONFIGS).length);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty share classes list', async () => {
      const { issuanceService } = require('../../services/issuanceService');
      issuanceService.getShareClasses.mockResolvedValue([]);
      
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        expect(screen.getByText('No share classes found. Please set up share classes first.')).toBeInTheDocument();
      });
    });

    it('should handle very large quantities', async () => {
      renderWithProviders(<SecurityDetailsStep />);
      
      await waitFor(() => {
        const quantityInput = screen.getByLabelText('Quantity') as HTMLInputElement;
        fireEvent.change(quantityInput, { target: { value: '1000000' } });
        
        expect(screen.getByText('1,000,000 stock options')).toBeInTheDocument();
      });
    });
  });
});