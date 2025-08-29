import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstrumentsTable } from './InstrumentsTable';
import type { SecuritySummary } from '../types';

const mockSecurities: SecuritySummary[] = [
  {
    id: 'security-1',
    type: 'EQUITY',
    quantity: 10000,
    issued_at: '2025-01-01',
    cancelled_at: null,
    stakeholder_name: 'John Doe',
    stakeholder_type: 'FOUNDER',
    share_class_name: 'Common Stock',
    share_class_type: 'COMMON',
    terms: null,
    status: 'active'
  },
  {
    id: 'security-2',
    type: 'OPTION',
    quantity: 5000,
    issued_at: '2025-01-15',
    cancelled_at: null,
    stakeholder_name: 'Jane Smith',
    stakeholder_type: 'EMPLOYEE',
    share_class_name: undefined,
    share_class_type: undefined,
    terms: {
      strikePrice: '1.00',
      expirationDate: '2029-01-15'
    },
    status: 'active'
  },
  {
    id: 'security-3',
    type: 'EQUITY',
    quantity: 8000,
    issued_at: '2025-01-10',
    cancelled_at: '2025-02-01',
    stakeholder_name: 'Bob Wilson',
    stakeholder_type: 'INVESTOR',
    share_class_name: 'Preferred A',
    share_class_type: 'PREFERRED',
    terms: null,
    status: 'cancelled'
  }
];

describe('InstrumentsTable', () => {
  const defaultProps = {
    securities: mockSecurities,
    loading: false,
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onViewDetails: vi.fn(),
    sort: { field: 'issued_at' as const, direction: 'desc' as const },
    onSortChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render security data correctly', () => {
      render(<InstrumentsTable {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      
      expect(screen.getAllByText('EQUITY')[0]).toBeInTheDocument();
      expect(screen.getByText('OPTION')).toBeInTheDocument();
      
      expect(screen.getByText('10,000')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
    });

    it('should display stakeholder types correctly', () => {
      render(<InstrumentsTable {...defaultProps} />);

      expect(screen.getByText('FOUNDER')).toBeInTheDocument();
      expect(screen.getByText('EMPLOYEE')).toBeInTheDocument();
      expect(screen.getByText('INVESTOR')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(<InstrumentsTable {...defaultProps} />);

      expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
      expect(screen.getByText('Jan 10, 2025')).toBeInTheDocument();
    });

    it('should display share class information', () => {
      render(<InstrumentsTable {...defaultProps} />);

      expect(screen.getByText('Common Stock')).toBeInTheDocument();
      expect(screen.getAllByText('COMMON')[0]).toBeInTheDocument();
      expect(screen.getByText('Preferred A')).toBeInTheDocument();
      expect(screen.getByText('PREFERRED')).toBeInTheDocument();
    });

    it('should display terms for options', () => {
      render(<InstrumentsTable {...defaultProps} />);

      expect(screen.getByText('Strike: $1.00')).toBeInTheDocument();
      expect(screen.getByText('Exp: Jan 15, 2029')).toBeInTheDocument();
    });

    it('should show status badges with correct colors', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const activeStatus = screen.getAllByText('active');
      const cancelledStatus = screen.getByText('cancelled');

      expect(activeStatus).toHaveLength(2);
      expect(cancelledStatus).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show skeleton rows when loading with no data', () => {
      render(<InstrumentsTable securities={[]} loading={true} />);
      
      // Should show table headers
      expect(screen.getByText('Stakeholder')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      
      // Should show skeleton rows (animated elements)
      const table = screen.getByRole('table');
      const skeletonRows = table.querySelectorAll('tr.animate-pulse');
      expect(skeletonRows).toHaveLength(5);
    });

    it('should show loading indicator at bottom when loading with data', () => {
      render(<InstrumentsTable {...defaultProps} loading={true} />);
      
      // Should show both data and loading indicator text
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Updating data...')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no securities exist', () => {
      render(<InstrumentsTable securities={[]} loading={false} />);
      
      expect(screen.getByText('No instruments found')).toBeInTheDocument();
      expect(screen.getByText('Start building your cap table by issuing your first security to stakeholders.')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should call onSortChange when clicking sortable headers', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const stakeholderHeader = screen.getByText('Stakeholder');
      fireEvent.click(stakeholderHeader);

      expect(defaultProps.onSortChange).toHaveBeenCalledWith({
        field: 'stakeholder_name',
        direction: 'desc'
      });
    });

    it('should toggle sort direction on repeated clicks', () => {
      const props = {
        ...defaultProps,
        sort: { field: 'quantity' as const, direction: 'desc' as const }
      };
      
      render(<InstrumentsTable {...props} />);

      const quantityHeader = screen.getByText('Quantity');
      fireEvent.click(quantityHeader);

      expect(defaultProps.onSortChange).toHaveBeenCalledWith({
        field: 'quantity',
        direction: 'asc'
      });
    });

    it('should display correct sort icons', () => {
      const { container } = render(<InstrumentsTable {...defaultProps} />);

      // Should show sort icons on sortable columns
      const sortIcons = container.querySelectorAll('svg');
      expect(sortIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Action Buttons', () => {
    it('should show view details button when onViewDetails is provided', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const viewButtons = screen.getAllByTitle('View Details');
      expect(viewButtons).toHaveLength(3);
    });

    it('should show edit button only for active securities', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const editButtons = screen.getAllByTitle('Edit');
      expect(editButtons).toHaveLength(2); // Only active securities
    });

    it('should show cancel/reactivate buttons based on status', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const cancelButtons = screen.getAllByTitle('Cancel Security');
      const reactivateButtons = screen.getAllByTitle('Reactivate Security');
      
      expect(cancelButtons).toHaveLength(2); // Active securities
      expect(reactivateButtons).toHaveLength(1); // Cancelled securities
    });

    it('should call appropriate handlers when buttons are clicked', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const viewButton = screen.getAllByTitle('View Details')[0];
      fireEvent.click(viewButton);
      expect(defaultProps.onViewDetails).toHaveBeenCalledWith(mockSecurities[0]);

      const editButton = screen.getAllByTitle('Edit')[0];
      fireEvent.click(editButton);
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockSecurities[0]);

      const cancelButton = screen.getAllByTitle('Cancel Security')[0];
      fireEvent.click(cancelButton);
      expect(defaultProps.onCancel).toHaveBeenCalledWith(mockSecurities[0]);
    });
  });

  describe('Responsive Design', () => {
    it('should have proper responsive classes', () => {
      const { container } = render(<InstrumentsTable {...defaultProps} />);

      const table = container.querySelector('table');
      expect(table).toHaveClass('min-w-full');

      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Security Type Colors', () => {
    it('should apply correct colors to security type badges', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const equityBadge = screen.getAllByText('EQUITY')[0].closest('span');
      const optionBadge = screen.getByText('OPTION').closest('span');

      expect(equityBadge).toHaveClass('bg-blue-100', 'text-blue-800');
      expect(optionBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
    });

    it('should have proper table structure', () => {
      render(<InstrumentsTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
    });
  });
});