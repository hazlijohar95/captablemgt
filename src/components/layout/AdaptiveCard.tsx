/**
 * Adaptive card component that adjusts layout based on screen size
 * Optimized for mobile-first complex interfaces
 */

import React from 'react';
import { Card } from '@/components/ui/Card';

export interface AdaptiveCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'compact' | 'detailed';
  mobileLayout?: 'stack' | 'collapse' | 'scroll';
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export const AdaptiveCard: React.FC<AdaptiveCardProps> = ({
  title,
  subtitle,
  action,
  children,
  variant = 'default',
  mobileLayout = 'stack',
  className = '',
  headerClassName = '',
  contentClassName = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          card: 'p-4 md:p-6',
          header: 'mb-3 md:mb-4',
          title: 'text-lg md:text-xl font-semibold',
          subtitle: 'text-sm text-gray-600 mt-1'
        };
      case 'detailed':
        return {
          card: 'p-6 md:p-8',
          header: 'mb-6 md:mb-8',
          title: 'text-xl md:text-2xl font-bold',
          subtitle: 'text-base text-gray-700 mt-2'
        };
      case 'default':
      default:
        return {
          card: 'p-4 md:p-6',
          header: 'mb-4 md:mb-6',
          title: 'text-lg md:text-xl font-semibold',
          subtitle: 'text-sm md:text-base text-gray-600 mt-1'
        };
    }
  };

  const getMobileLayoutStyles = () => {
    switch (mobileLayout) {
      case 'collapse':
        return 'overflow-hidden';
      case 'scroll':
        return 'overflow-x-auto';
      case 'stack':
      default:
        return '';
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className={`${styles.card} ${getMobileLayoutStyles()} ${className}`}>
      {(title || subtitle || action) && (
        <div className={`${styles.header} ${headerClassName}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`${styles.title} text-gray-900 truncate`}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={`${styles.subtitle} line-clamp-2 sm:line-clamp-none`}>
                  {subtitle}
                </p>
              )}
            </div>
            
            {action && (
              <div className="flex-shrink-0 w-full sm:w-auto">
                <div className="flex justify-end sm:justify-start">
                  {action}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={`${contentClassName}`}>
        {children}
      </div>
    </Card>
  );
};

export interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3 },
  gap = 'md',
  className = ''
}) => {
  const getGridCols = () => {
    const { sm = 1, md = 2, lg = 3, xl } = columns;
    
    let classes = `grid-cols-${sm}`;
    if (md) classes += ` md:grid-cols-${md}`;
    if (lg) classes += ` lg:grid-cols-${lg}`;
    if (xl) classes += ` xl:grid-cols-${xl}`;
    
    return classes;
  };

  const getGap = () => {
    const gapMap = {
      sm: 'gap-3',
      md: 'gap-4 md:gap-6',
      lg: 'gap-6 md:gap-8',
      xl: 'gap-8 md:gap-10'
    };
    return gapMap[gap];
  };

  return (
    <div className={`grid ${getGridCols()} ${getGap()} ${className}`}>
      {children}
    </div>
  );
};

export interface MobileTableProps {
  data: Array<Record<string, any>>;
  columns: Array<{
    key: string;
    label: string;
    mobileLabel?: string;
    render?: (value: any, item: Record<string, any>) => React.ReactNode;
    important?: boolean; // Show on mobile
  }>;
  className?: string;
}

export const MobileTable: React.FC<MobileTableProps> = ({
  data,
  columns,
  className = ''
}) => {
  const importantColumns = columns.filter(col => col.important);
  const allColumns = columns;

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {allColumns.map(column => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {allColumns.map(column => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(item[column.key], item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {data.map((item, index) => (
          <Card key={index} className="p-4">
            {/* Important fields prominently displayed */}
            <div className="space-y-3">
              {importantColumns.map(column => (
                <div key={column.key} className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-900">
                    {column.mobileLabel || column.label}
                  </span>
                  <span className="text-sm text-gray-700 text-right ml-3">
                    {column.render ? column.render(item[column.key], item) : item[column.key]}
                  </span>
                </div>
              ))}
            </div>

            {/* Remaining fields in compact format */}
            {allColumns.length > importantColumns.length && (
              <details className="mt-4">
                <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                  View details
                </summary>
                <div className="mt-3 space-y-2">
                  {allColumns
                    .filter(col => !col.important)
                    .map(column => (
                      <div key={column.key} className="flex justify-between text-xs">
                        <span className="text-gray-500">
                          {column.mobileLabel || column.label}
                        </span>
                        <span className="text-gray-700">
                          {column.render ? column.render(item[column.key], item) : item[column.key]}
                        </span>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

// Hook for responsive behavior
export function useResponsiveLayout() {
  const [screenSize, setScreenSize] = React.useState<'sm' | 'md' | 'lg' | 'xl'>('md');

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width >= 1280) setScreenSize('xl');
      else if (width >= 1024) setScreenSize('lg');
      else if (width >= 768) setScreenSize('md');
      else setScreenSize('sm');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const isMobile = screenSize === 'sm';
  const isTablet = screenSize === 'md';
  const isDesktop = screenSize === 'lg' || screenSize === 'xl';

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop
  };
}