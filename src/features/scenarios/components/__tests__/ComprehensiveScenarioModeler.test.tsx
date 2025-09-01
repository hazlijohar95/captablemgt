/**
 * Integration tests for Comprehensive Scenario Modeler
 * Tests the complete scenario modeling UI workflow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ComprehensiveScenarioModeler } from '../ComprehensiveScenarioModeler';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { capTableService } from '@/services/capTableService';

// Mock dependencies
vi.mock('@/hooks/useCompanyContext');
vi.mock('@/services/capTableService');

const mockUseCompanyContext = useCompanyContext as Mock;
const mockCapTableService = capTableService as any;

describe('ComprehensiveScenarioModeler', () => {
  const mockOnScenarioSave = vi.fn();
  const mockOnScenarioLoad = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseCompanyContext.mockReturnValue({
      companyId: 'test-company-123',
      hasCompany: true
    });

    mockCapTableService.getCapTable.mockResolvedValue({
      stakeholders: [
        {
          stakeholderId: 'founder-1',
          name: 'John Founder',
          asConverted: 4000000,
          securities: {
            common: 4000000,
            preferred: 0,
            options: 0,
            warrants: 0
          }
        },
        {
          stakeholderId: 'founder-2',
          name: 'Jane Founder',
          asConverted: 3000000,
          securities: {
            common: 3000000,
            preferred: 0,
            options: 0,
            warrants: 0
          }
        }
      ]
    });
  });

  it('should render the main interface', async () => {
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Comprehensive Scenario Modeling')).toBeInTheDocument();
    });

    expect(screen.getByText('Advanced modeling with anti-dilution, SAFE conversions, waterfall analysis, and tax calculations')).toBeInTheDocument();
    expect(screen.getByText('New Scenario')).toBeInTheDocument();
  });

  it('should create a new scenario when button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('New Scenario')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New Scenario'));

    await waitFor(() => {
      expect(screen.getByText('Scenario Modeling')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New Scenario')).toBeInTheDocument();
    });
  });

  it('should display current cap table information', async () => {
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Current Cap Table')).toBeInTheDocument();
      expect(screen.getByText('John Founder')).toBeInTheDocument();
      expect(screen.getByText('Jane Founder')).toBeInTheDocument();
    });
  });

  it('should allow adding funding rounds', async () => {
    const user = userEvent.setup();
    
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    // Create new scenario first
    await waitFor(() => {
      expect(screen.getByText('New Scenario')).toBeInTheDocument();
    });
    await user.click(screen.getByText('New Scenario'));

    // Add funding round
    await waitFor(() => {
      expect(screen.getByText('Add Round')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Add Round'));

    await waitFor(() => {
      expect(screen.getByText('Series A')).toBeInTheDocument();
    });
  });

  it('should allow adding exit scenarios', async () => {
    const user = userEvent.setup();
    
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    // Create new scenario first
    await waitFor(() => {
      expect(screen.getByText('New Scenario')).toBeInTheDocument();
    });
    await user.click(screen.getByText('New Scenario'));

    // Add exit scenario
    await waitFor(() => {
      expect(screen.getByText('Add Exit')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Add Exit'));

    await waitFor(() => {
      expect(screen.getAllByText(/Exit Scenario/)).toHaveLength(2); // Base Case + new one
    });
  });

  it('should navigate between tabs', async () => {
    const user = userEvent.setup();
    
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    // Create new scenario first
    await waitFor(() => {
      expect(screen.getByText('New Scenario')).toBeInTheDocument();
    });
    await user.click(screen.getByText('New Scenario'));

    // Check tab navigation
    await waitFor(() => {
      expect(screen.getByText('Results Analysis')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Results Analysis'));
    // Results tab should be active but might show empty state initially
  });

  it('should handle configuration modal', async () => {
    const user = userEvent.setup();
    
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Config')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Config'));

    await waitFor(() => {
      expect(screen.getByText('Scenario Modeling Configuration')).toBeInTheDocument();
    });
  });

  it('should handle save scenario workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    // Create new scenario
    await waitFor(() => {
      expect(screen.getByText('New Scenario')).toBeInTheDocument();
    });
    await user.click(screen.getByText('New Scenario'));

    // Open save modal
    await waitFor(() => {
      expect(screen.getByText('Save Scenario')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Save Scenario'));

    await waitFor(() => {
      expect(screen.getByText('Save this scenario for future reference and comparison.')).toBeInTheDocument();
    });

    // Save the scenario
    const saveButton = screen.getAllByText('Save Scenario').find(
      button => button.closest('div')?.classList.contains('p-6')
    );
    if (saveButton) {
      await user.click(saveButton);
      expect(mockOnScenarioSave).toHaveBeenCalled();
    }
  });

  it('should handle errors gracefully', async () => {
    // Mock service to throw error
    mockCapTableService.getCapTable.mockRejectedValue(new Error('Failed to load cap table'));
    
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    // Should still render but might show error state
    await waitFor(() => {
      expect(screen.getByText('Comprehensive Scenario Modeling')).toBeInTheDocument();
    });
  });

  it('should show appropriate empty states', async () => {
    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No Scenario Selected')).toBeInTheDocument();
      expect(screen.getByText('Create a new scenario to start modeling complex funding and exit scenarios')).toBeInTheDocument();
    });
  });

  it('should handle company context properly', () => {
    // Test without company
    mockUseCompanyContext.mockReturnValue({
      companyId: null,
      hasCompany: false
    });

    render(
      <ComprehensiveScenarioModeler
        onScenarioSave={mockOnScenarioSave}
        onScenarioLoad={mockOnScenarioLoad}
      />
    );

    expect(screen.getByText('No company selected')).toBeInTheDocument();
    expect(screen.getByText('Please create or select a company to model scenarios.')).toBeInTheDocument();
  });
});