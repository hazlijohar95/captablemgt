import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import SecuritiesIssuanceWizardRefactored from '../../components/SecuritiesIssuanceWizardRefactored';
import { 
  renderWithProviders, 
  createMockStakeholder, 
  createMockShareClass,
  createMockValidation,
  createMockPreview,
  createMockResult,
  mockServerResponses
} from '../test-utils';

// Mock all services
jest.mock('../../services/issuanceService');
jest.mock('@/services/csrfService');

describe('SecuritiesIssuanceWizard Integration', () => {
  const mockStakeholders = [
    createMockStakeholder({
      id: 'stakeholder-1',
      people: { name: 'John Doe', email: 'john@example.com' },
      type: 'EMPLOYEE'
    })
  ];

  const mockShareClasses = [
    createMockShareClass({
      id: 'common-1',
      name: 'Common Stock',
      type: 'COMMON'
    })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    const { issuanceService } = require('../../services/issuanceService');
    issuanceService.getStakeholders.mockResolvedValue(mockStakeholders);
    issuanceService.getShareClasses.mockResolvedValue(mockShareClasses);
    issuanceService.getRecommendedStrikePrice.mockResolvedValue({ 
      recommendedPrice: '100',
      currentFMV: '100',
      isCompliant: true 
    });
    issuanceService.validateIssuance.mockResolvedValue(createMockValidation());
    issuanceService.generateIssuancePreview.mockResolvedValue(createMockPreview());
    issuanceService.issueSecurity.mockResolvedValue(createMockResult());

    const { CSRFService } = require('@/services/csrfService');
    CSRFService.getToken.mockResolvedValue('mock-token');
  });

  describe('complete workflow - happy path', () => {
    it('should complete full security issuance workflow', async () => {
      const mockOnComplete = jest.fn();
      
      renderWithProviders(
        <SecuritiesIssuanceWizardRefactored 
          companyId="test-company"
          onComplete={mockOnComplete}
        />
      );

      // Wait for wizard to load
      await waitFor(() => {
        expect(screen.getByText('Issue Securities')).toBeInTheDocument();
      });

      // Step 1: Select Stakeholder
      await waitFor(() => {
        expect(screen.getByText('Select Stakeholder')).toBeInTheDocument();
      });

      const stakeholderOption = await waitFor(() => 
        screen.getByText('John Doe').closest('div')
      );
      fireEvent.click(stakeholderOption!);

      // Proceed to next step
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
      fireEvent.click(nextButton);

      // Step 2: Security Details
      await waitFor(() => {
        expect(screen.getByText('Security Details')).toBeInTheDocument();
      });

      // Fill in quantity
      const quantityInput = screen.getByLabelText('Quantity');
      fireEvent.change(quantityInput, { target: { value: '1000' } });

      // Select share class
      const shareClassSelect = screen.getByLabelText('Share Class');
      fireEvent.change(shareClassSelect, { target: { value: 'common-1' } });

      // Proceed to next step
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      // Step 3: Pricing & Terms
      await waitFor(() => {
        expect(screen.getByText('Pricing & Terms')).toBeInTheDocument();
      });

      // Use recommended strike price
      const useRecommendedButton = screen.getByText(/Use 409A FMV/);
      fireEvent.click(useRecommendedButton);

      // Set expiration date
      const setExpirationButton = screen.getByText('10 years');
      fireEvent.click(setExpirationButton);

      // Proceed to next step
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      // Step 4: Vesting Schedule
      await waitFor(() => {
        expect(screen.getByText('Vesting Schedule')).toBeInTheDocument();
      });

      // Use standard template
      const standardTemplate = screen.getByText('Standard Employee (4yr/1yr cliff)').closest('button');
      fireEvent.click(standardTemplate!);

      // Proceed to next step
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      // Step 5: Review & Compliance
      await waitFor(() => {
        expect(screen.getByText('Review & Compliance')).toBeInTheDocument();
      });

      // Wait for validation and preview to load
      await waitFor(() => {
        expect(screen.getByText('409A Compliant')).toBeInTheDocument();
        expect(screen.getByText('Ready to Issue')).toBeInTheDocument();
      });

      // Issue the security
      const issueButton = screen.getByRole('button', { name: /issue security/i });
      expect(issueButton).not.toBeDisabled();
      fireEvent.click(issueButton);

      // Step 6: Result
      await waitFor(() => {
        expect(screen.getByText('Security Issued Successfully!')).toBeInTheDocument();
        expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
          securityId: 'security-123'
        }));
      });
    });

    it('should navigate between completed steps', async () => {
      renderWithProviders(
        <SecuritiesIssuanceWizardRefactored companyId="test-company" />
      );

      await waitFor(() => {
        expect(screen.getByText('Select Stakeholder')).toBeInTheDocument();
      });

      // Complete step 1
      const stakeholderOption = await waitFor(() => 
        screen.getByText('John Doe').closest('div')
      );
      fireEvent.click(stakeholderOption!);
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      // Complete step 2
      await waitFor(() => {
        const quantityInput = screen.getByLabelText('Quantity');
        fireEvent.change(quantityInput, { target: { value: '1000' } });
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
      });

      // Now on step 3, should be able to click back to step 1
      await waitFor(() => {
        const stepIndicator = screen.getByText('Select Stakeholder').closest('li');
        const stepButton = within(stepIndicator!).getByRole('button');
        fireEvent.click(stepButton);
      });

      // Should be back on step 1
      await waitFor(() => {
        expect(screen.getByText('Choose who will receive this security')).toBeInTheDocument();
      });
    });
  });

  describe('validation and error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock validation failure
      const { issuanceService } = require('../../services/issuanceService');
      issuanceService.validateIssuance.mockResolvedValue(mockServerResponses.validationError);
      
      renderWithProviders(
        <SecuritiesIssuanceWizardRefactored companyId="test-company" />
      );

      // Complete steps to get to review
      await completeStepsToReview();

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
        expect(screen.getByText('Strike price below fair market value')).toBeInTheDocument();
      });

      // Issue button should be disabled
      const issueButton = screen.getByRole('button', { name: /issue security/i });
      expect(issueButton).toBeDisabled();
    });

    it('should handle issuance failure', async () => {
      // Mock issuance failure
      const { issuanceService } = require('../../services/issuanceService');
      issuanceService.issueSecurity.mockResolvedValue(mockServerResponses.failure);
      
      renderWithProviders(
        <SecuritiesIssuanceWizardRefactored companyId="test-company" />
      );

      await completeStepsToReview();
      
      // Issue the security
      const issueButton = await waitFor(() => 
        screen.getByRole('button', { name: /issue security/i })
      );
      fireEvent.click(issueButton);

      // Should show failure message
      await waitFor(() => {
        expect(screen.getByText('Issuance Failed')).toBeInTheDocument();
        expect(screen.getByText('Insufficient authorized shares')).toBeInTheDocument();
      });
    });

    it('should prevent proceeding with incomplete data', async () => {
      renderWithProviders(
        <SecuritiesIssuanceWizardRefactored companyId="test-company" />
      );

      await waitFor(() => {
        expect(screen.getByText('Select Stakeholder')).toBeInTheDocument();
      });

      // Next button should be disabled without stakeholder selection
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('compliance checking', () => {
    it('should show compliance warnings', async () => {
      const { issuanceService } = require('../../services/issuanceService');
      issuanceService.generateIssuancePreview.mockResolvedValue(
        createMockPreview({
          compliance: {
            status: 'WARNING',
            messages: ['409A valuation expires in 30 days']
          }
        })
      );
      
      renderWithProviders(
        <SecuritiesIssuanceWizardRefactored companyId="test-company" />
      );

      await completeStepsToReview();

      await waitFor(() => {
        expect(screen.getByText('Compliance Warning')).toBeInTheDocument();
        expect(screen.getByText('409A valuation expires in 30 days')).toBeInTheDocument();
      });
    });
  });

  // Helper function to complete steps up to review
  const completeStepsToReview = async () => {
    // Step 1: Select stakeholder
    await waitFor(() => {
      const stakeholderOption = screen.getByText('John Doe').closest('div');
      fireEvent.click(stakeholderOption!);
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    // Step 2: Security details
    await waitFor(() => {
      const quantityInput = screen.getByLabelText('Quantity');
      fireEvent.change(quantityInput, { target: { value: '1000' } });
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    // Step 3: Pricing terms
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    // Step 4: Vesting schedule
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    // Now on Step 5: Review
    await waitFor(() => {
      expect(screen.getByText('Review & Compliance')).toBeInTheDocument();
    });
  };
});