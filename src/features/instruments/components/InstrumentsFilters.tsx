import React, { useCallback, useMemo } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { InstrumentsFiltersProps } from '../types';

export const InstrumentsFilters = React.memo<InstrumentsFiltersProps>(({ filters, onFiltersChange }) => {
  const handleFilterChange = useCallback((field: keyof typeof filters, value: any) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({
      type: 'ALL',
      status: 'ALL',
      stakeholder_type: 'ALL',
      search: ''
    });
  }, [onFiltersChange]);

  const hasActiveFilters = useMemo(() => {
    return filters.type !== 'ALL' || 
           filters.status !== 'ALL' || 
           filters.stakeholder_type !== 'ALL' ||
           !!filters.search ||
           !!filters.date_from ||
           !!filters.date_to;
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'ALL') count++;
    if (filters.status !== 'ALL') count++;
    if (filters.stakeholder_type !== 'ALL') count++;
    if (filters.search) count++;
    if (filters.date_from) count++;
    if (filters.date_to) count++;
    return count;
  }, [filters]);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                {activeFilterCount}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center text-sm text-primary-600 hover:text-primary-700 transition-colors duration-150"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {/* Search */}
          <div className="lg:col-span-2 xl:col-span-3">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors duration-150"
                placeholder="Search by stakeholder, type, or ID..."
              />
            </div>
          </div>

          {/* Security Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Security Type
            </label>
            <select
              id="type"
              value={filters.type || 'ALL'}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors duration-150"
            >
              <option value="ALL">All Types</option>
              <option value="EQUITY">Equity</option>
              <option value="OPTION">Options</option>
              <option value="RSU">RSUs</option>
              <option value="WARRANT">Warrants</option>
              <option value="SAFE">SAFEs</option>
              <option value="NOTE">Convertible Notes</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={filters.status || 'ALL'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors duration-150"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
          {/* Stakeholder Type */}
          <div>
            <label htmlFor="stakeholder_type" className="block text-sm font-medium text-gray-700 mb-1">
              Stakeholder Type
            </label>
            <select
              id="stakeholder_type"
              value={filters.stakeholder_type || 'ALL'}
              onChange={(e) => handleFilterChange('stakeholder_type', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors duration-150"
            >
              <option value="ALL">All Stakeholders</option>
              <option value="FOUNDER">Founders</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="INVESTOR">Investors</option>
              <option value="ENTITY">Entities</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 mb-1">
              Issue Date From
            </label>
            <input
              type="date"
              id="date_from"
              value={filters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors duration-150"
            />
          </div>

          {/* Date To */}
          <div>
            <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 mb-1">
              Issue Date To
            </label>
            <input
              type="date"
              id="date_to"
              value={filters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors duration-150"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

// Display name for debugging
InstrumentsFilters.displayName = 'InstrumentsFilters';