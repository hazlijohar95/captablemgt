import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const tableVariants = cva(
  'w-full border-separate border-spacing-0 text-sm',
  {
    variants: {
      variant: {
        default: '',
        striped: '[&_tbody_tr:nth-child(even)]:bg-gray-50',
        bordered: 'border border-gray-200 rounded-xl overflow-hidden',
      },
      size: {
        sm: '[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2',
        md: '[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3',
        lg: '[&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface ITableProps
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  children: React.ReactNode;
}

export const Table = React.memo<ITableProps>(({
  variant,
  size,
  className,
  children,
  ...props
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table
          className={tableVariants({ variant, size, className })}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
});

Table.displayName = 'Table';

// Table Header
interface ITableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
  sticky?: boolean;
}

export const TableHeader = React.memo<ITableHeaderProps>(({
  children,
  sticky = false,
  className = '',
  ...props
}) => {
  return (
    <thead
      className={`
        bg-gray-50
        ${sticky ? 'sticky top-0 z-10' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </thead>
  );
});

TableHeader.displayName = 'TableHeader';

// Table Body
interface ITableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody = React.memo<ITableBodyProps>(({
  children,
  className = '',
  ...props
}) => {
  return (
    <tbody
      className={`divide-y divide-gray-200 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
});

TableBody.displayName = 'TableBody';

// Table Row
interface ITableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const TableRow = React.memo<ITableRowProps>(({
  children,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <tr
      className={`
        transition-colors duration-150
        ${interactive ? 'hover:bg-gray-50 cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  );
});

TableRow.displayName = 'TableRow';

// Table Header Cell
interface ITableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export const TableHead = React.memo<ITableHeadProps>(({
  children,
  sortable = false,
  sortDirection = null,
  onSort,
  className = '',
  ...props
}) => {
  const handleClick = () => {
    if (sortable && onSort) {
      onSort();
    }
  };

  return (
    <th
      className={`
        text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
        border-b border-gray-200
        ${sortable ? 'cursor-pointer select-none hover:text-gray-900' : ''}
        ${className}
      `}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <div className="flex flex-col">
            <svg
              className={`w-3 h-3 ${
                sortDirection === 'asc' ? 'text-primary-500' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            <svg
              className={`w-3 h-3 -mt-1 ${
                sortDirection === 'desc' ? 'text-primary-500' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </th>
  );
});

TableHead.displayName = 'TableHead';

// Table Data Cell
interface ITableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableCell = React.memo<ITableCellProps>(({
  children,
  className = '',
  ...props
}) => {
  return (
    <td
      className={`
        text-gray-900 whitespace-nowrap
        border-b border-gray-200 last:border-b-0
        ${className}
      `}
      {...props}
    >
      {children}
    </td>
  );
});

TableCell.displayName = 'TableCell';

// Empty State for Tables
interface ITableEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  colSpan?: number;
}

export const TableEmptyState = React.memo<ITableEmptyStateProps>(({
  title = 'No data available',
  description = 'There are no items to display at this time.',
  icon,
  action,
  colSpan = 1,
}) => {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-16 text-center">
        <div className="flex flex-col items-center justify-center">
          {icon && (
            <div className="w-12 h-12 mb-4 text-gray-400">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            {description}
          </p>
          {action}
        </div>
      </TableCell>
    </TableRow>
  );
});

TableEmptyState.displayName = 'TableEmptyState';

// Loading State for Tables
interface ITableLoadingStateProps {
  rows?: number;
  columns?: number;
}

export const TableLoadingState = React.memo<ITableLoadingStateProps>(({
  rows = 5,
  columns = 4,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
});

TableLoadingState.displayName = 'TableLoadingState';

// Pagination for Tables
interface ITablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const TablePagination = React.memo<ITablePaginationProps>(({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-900"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        )}
        
        <div className="text-sm text-gray-600">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="px-3 py-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-0 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              // Show first page, last page, current page, and pages around current
              return (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1
              );
            })
            .map((page, index, array) => (
              <React.Fragment key={page}>
                {index > 0 && array[index - 1] !== page - 1 && (
                  <span className="px-2 py-1 text-sm text-neutral-400">...</span>
                )}
                <button
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    page === currentPage
                      ? 'bg-primary-600 text-white'
                      : 'border border-neutral-200 dark:border-neutral-700 bg-neutral-0 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  {page}
                </button>
              </React.Fragment>
            ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="px-3 py-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-0 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
});

TablePagination.displayName = 'TablePagination';