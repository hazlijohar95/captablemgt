/**
 * Enhanced Virtualized Table with Pagination Support
 * Optimized for 1000+ records with server-side pagination and virtual scrolling
 */

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { 
  ChevronUpDownIcon, 
  ChevronUpIcon, 
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { UsePaginationResult } from '@/services/paginationService';

export interface EnhancedColumn<T> {
  key: string;
  header: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  render: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  sticky?: boolean;
}

export interface PaginatedVirtualizedTableProps<T> {
  columns: EnhancedColumn<T>[];
  pagination: UsePaginationResult<T>;
  height: number;
  rowHeight?: number;
  className?: string;
  emptyMessage?: string;
  showPageControls?: boolean;
  pageSizeOptions?: number[];
  enableSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  loadingMessage?: string;
  refreshable?: boolean;
}

interface RowProps<T> {
  index: number;
  style: React.CSSProperties;
  data: {
    items: T[];
    columns: EnhancedColumn<T>[];
    loading?: boolean;
  };
}

function TableRow<T>({ index, style, data }: RowProps<T>) {
  const { items, columns, loading } = data;
  const item = items[index];

  if (loading || !item) {
    return (
      <div style={style} className="flex border-b border-gray-200">
        {columns.map(column => (
          <div
            key={column.key}
            className="flex items-center px-4 py-2 bg-gray-100 animate-pulse"
            style={{ 
              width: column.width, 
              minWidth: column.minWidth, 
              maxWidth: column.maxWidth,
              position: column.sticky ? 'sticky' : 'relative',
              left: column.sticky ? 0 : 'auto',
              zIndex: column.sticky ? 10 : 1
            }}
          >
            <div className="h-4 bg-gray-300 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      style={style} 
      className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors"
    >
      {columns.map(column => (
        <div
          key={column.key}
          className={`flex items-center px-4 py-2 ${
            column.align === 'center' ? 'justify-center' :
            column.align === 'right' ? 'justify-end' : 'justify-start'
          } ${column.className || ''} ${
            column.sticky ? 'bg-white border-r border-gray-200' : ''
          }`}
          style={{ 
            width: column.width, 
            minWidth: column.minWidth, 
            maxWidth: column.maxWidth,
            position: column.sticky ? 'sticky' : 'relative',
            left: column.sticky ? 0 : 'auto',
            zIndex: column.sticky ? 10 : 1
          }}
        >
          {column.render(item, index)}
        </div>
      ))}
    </div>
  );
}

export function PaginatedVirtualizedTable<T>({
  columns,
  pagination,
  height,
  rowHeight = 48,
  className = '',
  emptyMessage = 'No data available',
  showPageControls = true,
  pageSizeOptions = [25, 50, 100, 200],
  enableSearch = false,
  searchPlaceholder = 'Search...',
  onSearch,
  loadingMessage = 'Loading...',
  refreshable = false
}: PaginatedVirtualizedTableProps<T>) {
  const listRef = useRef<List>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    pagination: paginationInfo,
    loading,
    error,
    refetch,
    setPage,
    setPageSize,
    setSort
  } = pagination;

  // Calculate total table width
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + col.width, 0);
  }, [columns]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, []);

  const handleSort = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    // Toggle sort direction or default to ascending
    const newDirection = 'asc'; // Simple ascending sort for now
    setSort(columnKey, newDirection);
  }, [columns, setSort]);

  const getSortIcon = useCallback((columnKey: string) => {
    return <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />;
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  }, [onSearch]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
  }, [setPageSize]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Prepare data for virtualized rendering
  const listData = useMemo(() => ({
    items: data,
    columns,
    loading
  }), [data, columns, loading]);

  const itemCount = data.length;

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const { page, totalPages } = paginationInfo;
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    
    return pages;
  }, [paginationInfo]);

  if (error) {
    return (
      <div className={`bg-white border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center text-red-600">
          <span className="text-sm">{error}</span>
          {refreshable && (
            <button 
              onClick={handleRefresh}
              className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Search and Controls */}
      {(enableSearch || refreshable) && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {enableSearch && (
              <div className="relative">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {refreshable && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <div className="text-sm text-gray-500">
              {loading ? loadingMessage : `${paginationInfo.totalItems} items`}
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="overflow-hidden">
        {/* Header */}
        <div 
          className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-20"
          style={{ minWidth: totalWidth }}
        >
          {columns.map(column => (
            <div
              key={column.key}
              className={`flex items-center px-4 py-3 font-medium text-gray-900 ${
                column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
              } ${
                column.align === 'center' ? 'justify-center' :
                column.align === 'right' ? 'justify-end' : 'justify-start'
              } ${
                column.sticky ? 'bg-gray-50 border-r border-gray-200' : ''
              }`}
              style={{ 
                width: column.width, 
                minWidth: column.minWidth, 
                maxWidth: column.maxWidth,
                position: column.sticky ? 'sticky' : 'relative',
                left: column.sticky ? 0 : 'auto',
                zIndex: column.sticky ? 30 : 20
              }}
              onClick={column.sortable ? () => handleSort(column.key) : undefined}
              role={column.sortable ? "button" : undefined}
              tabIndex={column.sortable ? 0 : undefined}
              onKeyDown={column.sortable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSort(column.key);
                }
              } : undefined}
              aria-label={column.sortable ? `Sort by ${column.header}` : column.header}
            >
              <span>{column.header}</span>
              {column.sortable && (
                <span className="ml-2" aria-hidden="true">
                  {getSortIcon(column.key)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Virtualized body or empty state */}
        {!loading && itemCount === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 bg-gray-50">
            {emptyMessage}
          </div>
        ) : (
          <div style={{ minWidth: totalWidth }}>
            <List
              ref={listRef}
              height={height}
              itemCount={itemCount}
              itemSize={rowHeight}
              itemData={listData}
              width="100%"
            >
              {TableRow}
            </List>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {showPageControls && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Showing {Math.min((paginationInfo.page - 1) * paginationInfo.pageSize + 1, paginationInfo.totalItems)} to{' '}
              {Math.min(paginationInfo.page * paginationInfo.pageSize, paginationInfo.totalItems)} of{' '}
              {paginationInfo.totalItems} results
            </div>
            
            <select
              value={paginationInfo.pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(paginationInfo.page - 1)}
              disabled={!paginationInfo.hasPrevious || loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            {pageNumbers.map((pageNum, index) => (
              <button
                key={index}
                onClick={() => typeof pageNum === 'number' ? setPage(pageNum) : undefined}
                disabled={typeof pageNum !== 'number' || loading}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  pageNum === paginationInfo.page
                    ? 'bg-blue-600 text-white'
                    : typeof pageNum === 'number'
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-400 cursor-default'
                } disabled:cursor-not-allowed`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setPage(paginationInfo.page + 1)}
              disabled={!paginationInfo.hasNext || loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaginatedVirtualizedTable;