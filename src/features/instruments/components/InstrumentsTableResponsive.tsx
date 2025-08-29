import React, { useState, useEffect } from 'react';
import { InstrumentsTable } from './InstrumentsTable';
import { InstrumentsTableMobile } from './InstrumentsTableMobile';
import { SecuritySummary, InstrumentsSort } from '../types';

interface InstrumentsTableResponsiveProps {
  securities: SecuritySummary[];
  loading?: boolean;
  sort?: InstrumentsSort;
  onSortChange?: (sort: InstrumentsSort) => void;
  onEdit?: (security: SecuritySummary) => void;
  onCancel?: (security: SecuritySummary) => void;
  onViewDetails?: (security: SecuritySummary) => void;
}

const useBreakpoint = (breakpoint: number = 768) => {
  const [isMobile, setIsMobile] = useState(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Throttled resize handler for better performance
    let timeoutId: NodeJS.Timeout;
    const throttledResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', throttledResize);
    return () => {
      window.removeEventListener('resize', throttledResize);
      clearTimeout(timeoutId);
    };
  }, [breakpoint]);

  return isMobile;
};

export const InstrumentsTableResponsive = React.memo<InstrumentsTableResponsiveProps>(({ 
  securities, 
  loading, 
  sort,
  onSortChange,
  onEdit, 
  onCancel, 
  onViewDetails 
}) => {
  const isMobile = useBreakpoint(768); // md breakpoint

  if (isMobile) {
    return (
      <div className="lg:hidden">
        <InstrumentsTableMobile
          securities={securities}
          loading={loading}
          onEdit={onEdit}
          onCancel={onCancel}
          onViewDetails={onViewDetails}
        />
      </div>
    );
  }

  return (
    <div className="hidden lg:block">
      <InstrumentsTable
        securities={securities}
        loading={loading}
        sort={sort}
        onSortChange={onSortChange}
        onEdit={onEdit}
        onCancel={onCancel}
        onViewDetails={onViewDetails}
      />
    </div>
  );
});

// Display name for debugging
InstrumentsTableResponsive.displayName = 'InstrumentsTableResponsive';