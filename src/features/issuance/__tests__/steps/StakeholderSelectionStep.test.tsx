import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import StakeholderSelectionStep from '../../components/steps/StakeholderSelectionStep';
import { renderWithProviders, createMockStakeholder } from '../test-utils';

// Mock the issuance service
jest.mock('../../services/issuanceService', () => ({
  issuanceService: {
    getStakeholders: jest.fn(),
    getShareClasses: jest.fn(),
    getRecommendedStrikePrice: jest.fn()
  }
}));

// Mock CSRF service
jest.mock('@/services/csrfService', () => ({
  CSRFService: {
    getToken: jest.fn().mockResolvedValue('mock-token')
  }
}));

describe('StakeholderSelectionStep', () => {
  const mockStakeholders = [
    createMockStakeholder({
      id: 'stakeholder-1',
      people: { name: 'John Doe', email: 'john@example.com', phone: '+1-555-0123' },
      type: 'EMPLOYEE'
    }),
    createMockStakeholder({
      id: 'stakeholder-2',
      people: { name: 'Jane Smith', email: 'jane@example.com' },
      type: 'FOUNDER'
    }),
    createMockStakeholder({
      id: 'stakeholder-3',
      entity_name: 'Acme Ventures',
      type: 'INVESTOR',
      people: null
    })
  ];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    const { issuanceService } = require('../../services/issuanceService');
    issuanceService.getStakeholders.mockResolvedValue(mockStakeholders);
    issuanceService.getShareClasses.mockResolvedValue([]);
    issuanceService.getRecommendedStrikePrice.mockResolvedValue({ recommendedPrice: '100' });
  });

  describe('when loading stakeholders', () => {
    it('should show loading state initially', async () => {
      renderWithProviders(<StakeholderSelectionStep />);
      
      expect(screen.getByText('Loading stakeholders...')).toBeInTheDocument();
    });
  });

  describe('when stakeholders are loaded', () => {
    it('should display all stakeholders', async () => {
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Acme Ventures')).toBeInTheDocument();
      });
    });

    it('should show stakeholder details correctly', async () => {
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        // Check employee stakeholder details
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('📞 +1-555-0123')).toBeInTheDocument();
        expect(screen.getByText('EMPLOYEE')).toBeInTheDocument();
        
        // Check founder stakeholder details
        expect(screen.getByText('FOUNDER')).toBeInTheDocument();
        
        // Check entity stakeholder details
        expect(screen.getByText('INVESTOR')).toBeInTheDocument();
      });
    });

    it('should allow selecting a stakeholder', async () => {
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        const johnOption = screen.getByLabelText(/john doe/i);
        fireEvent.click(johnOption.closest('[role="radio"]') || johnOption);
      });
      
      await waitFor(() => {
        const johnRadio = screen.getByDisplayValue('stakeholder-1') as HTMLInputElement;
        expect(johnRadio.checked).toBe(true);
      });
    });

    it('should highlight selected stakeholder', async () => {
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        const stakeholderOption = screen.getByText('John Doe').closest('div');
        fireEvent.click(stakeholderOption!);
      });
      
      await waitFor(() => {
        const selectedOption = screen.getByText('John Doe').closest('div');
        expect(selectedOption).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-500');
      });
    });
  });

  describe('when no stakeholders exist', () => {
    beforeEach(() => {
      const { issuanceService } = require('../../services/issuanceService');
      issuanceService.getStakeholders.mockResolvedValue([]);
    });

    it('should show empty state message', async () => {
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        expect(screen.getByText('No stakeholders found. Please add stakeholders first.')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper radio group structure', async () => {
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        const radioInputs = screen.getAllByRole('radio');
        expect(radioInputs).toHaveLength(mockStakeholders.length);
        
        radioInputs.forEach(radio => {
          expect(radio).toHaveAttribute('type', 'radio');
        });
      });
    });

    it('should have proper heading structure', async () => {
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: 'Select Stakeholder' })).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle stakeholder with missing contact info gracefully', async () => {
      const stakeholderWithoutContact = createMockStakeholder({
        id: 'stakeholder-minimal',
        people: { name: 'Minimal User', email: null, phone: null },
        type: 'EMPLOYEE'
      });

      const { issuanceService } = require('../../services/issuanceService');
      issuanceService.getStakeholders.mockResolvedValue([stakeholderWithoutContact]);
      
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        expect(screen.getByText('Minimal User')).toBeInTheDocument();
        expect(screen.getByText('EMPLOYEE')).toBeInTheDocument();
        // Should not crash when rendering without email/phone
      });
    });

    it('should handle entity stakeholder without people record', async () => {
      const entityStakeholder = createMockStakeholder({
        id: 'entity-1',
        entity_name: 'Corporate Entity',
        people: null,
        type: 'ENTITY'
      });

      const { issuanceService } = require('../../services/issuanceService');
      issuanceService.getStakeholders.mockResolvedValue([entityStakeholder]);
      
      renderWithProviders(<StakeholderSelectionStep />);
      
      await waitFor(() => {
        expect(screen.getByText('Corporate Entity')).toBeInTheDocument();
        expect(screen.getByText('ENTITY')).toBeInTheDocument();
      });
    });
  });
});