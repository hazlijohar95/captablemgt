/**
 * Virtualized table component for large datasets
 * Implements efficient rendering for 1000+ rows
 */

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export interface Column<T> {
  key: string;
  header: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  render: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  height: number;
  rowHeight?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingRows?: number;
}

interface RowProps<T> {
  index: number;
  style: React.CSSProperties;
  data: {
    items: T[];
    columns: Column<T>[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  };
}

function TableRow<T>({ index, style, data }: RowProps<T>) {
  const { items, columns } = data;
  const item = items[index];

  if (!item) {
    return (
      <div style={style} className="flex border-b border-gray-200">
        {columns.map(column => (
          <div
            key={column.key}
            className="flex items-center px-4 py-2 bg-gray-100 animate-pulse"
            style={{ width: column.width, minWidth: column.minWidth, maxWidth: column.maxWidth }}
          >
            <div className="h-4 bg-gray-300 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={style} className="flex border-b border-gray-200 hover:bg-gray-50">
      {columns.map(column => (
        <div
          key={column.key}
          className={`flex items-center px-4 py-2 ${
            column.align === 'center' ? 'justify-center' :
            column.align === 'right' ? 'justify-end' : 'justify-start'
          } ${column.className || ''}`}
          style={{ width: column.width, minWidth: column.minWidth, maxWidth: column.maxWidth }}
        >
          {column.render(item, index)}
        </div>
      ))}
    </div>
  );
}

export function VirtualizedTable<T>({
  data,
  columns,
  height,
  rowHeight = 48,
  sortBy,
  sortDirection,
  onSort,
  className = '',
  emptyMessage = 'No data available',
  loading = false,
  loadingRows = 10
}: VirtualizedTableProps<T>) {
  const listRef = useRef<List>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!onSort) return;

    const newDirection = sortBy === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newDirection);
  }, [sortBy, sortDirection, onSort]);

  const getSortIcon = useCallback((columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-blue-600" />
      : <ChevronDownIcon className="h-4 w-4 text-blue-600" />;
  }, [sortBy, sortDirection]);

  // Prepare data for virtualized rendering
  const listData = useMemo(() => {
    if (loading) {
      return {
        items: new Array(loadingRows).fill(null),
        columns,
        sortBy,
        sortDirection
      };
    }
    
    return {
      items: data,
      columns,
      sortBy,
      sortDirection
    };
  }, [data, columns, sortBy, sortDirection, loading, loadingRows]);

  const itemCount = loading ? loadingRows : data.length;

  if (!loading && data.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
        {/* Header */}
        <div 
          className="flex border-b border-gray-200 bg-gray-50"
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
              }`}
              style={{ width: column.width, minWidth: column.minWidth, maxWidth: column.maxWidth }}
              onClick={column.sortable ? () => handleSort(column.key) : undefined}
            >
              <span>{column.header}</span>
              {column.sortable && (
                <span className="ml-2">
                  {getSortIcon(column.key)}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* Empty state */}
        <div className="flex items-center justify-center h-32 text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10"
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
            }`}
            style={{ width: column.width, minWidth: column.minWidth, maxWidth: column.maxWidth }}
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

      {/* Virtualized body */}
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
    </div>
  );
}

export default VirtualizedTable;