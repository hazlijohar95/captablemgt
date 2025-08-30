/**
 * Financial Input Component
 * Handles precise financial inputs with consistent cents-based storage
 * Fixes critical precision violations identified in code review
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -20,
  toExpPos: 20
});

interface FinancialInputProps {
  label: string;
  value: number; // Always in cents
  onChange: (valueInCents: number) => void;
  placeholder?: string;
  helpText?: string;
  unit?: 'M' | 'K' | '$' | '%';
  displayUnit?: 'millions' | 'thousands' | 'dollars' | 'percentage';
  min?: number; // In cents
  max?: number; // In cents
  step?: number; // In display units (not cents)
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  id?: string;
  precision?: number; // Decimal places in display
  prefix?: string;
  suffix?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  'aria-describedby'?: string;
}

export function FinancialInput({
  label,
  value,
  onChange,
  placeholder = '0',
  helpText,
  unit = '$',
  displayUnit = 'dollars',
  min,
  max,
  step = 0.01,
  disabled = false,
  required = false,
  error,
  className = '',
  id,
  precision = 2,
  prefix,
  suffix,
  onBlur,
  onFocus,
  'aria-describedby': ariaDescribedBy,
  ...props
}: FinancialInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Convert cents to display value based on unit
  const centsToDisplay = useCallback((cents: number): string => {
    const decimal = new Decimal(cents);
    
    switch (displayUnit) {
      case 'millions':
        return decimal.dividedBy(100000000).toFixed(precision); // $1M = 100,000,000 cents
      case 'thousands':
        return decimal.dividedBy(100000).toFixed(precision); // $1K = 100,000 cents
      case 'dollars':
        return decimal.dividedBy(100).toFixed(precision); // $1 = 100 cents
      case 'percentage':
        return decimal.toFixed(precision); // Percentage stored as-is
      default:
        return decimal.dividedBy(100).toFixed(precision);
    }
  }, [displayUnit, precision]);

  // Convert display value to cents
  const displayToCents = useCallback((displayStr: string): number => {
    const cleaned = displayStr.replace(/[^0-9.-]/g, '');
    if (!cleaned || isNaN(Number(cleaned))) return 0;
    
    const decimal = new Decimal(cleaned);
    
    switch (displayUnit) {
      case 'millions':
        return decimal.times(100000000).toInteger().toNumber();
      case 'thousands':
        return decimal.times(100000).toInteger().toNumber();
      case 'dollars':
        return decimal.times(100).toInteger().toNumber();
      case 'percentage':
        return decimal.toInteger().toNumber();
      default:
        return decimal.times(100).toInteger().toNumber();
    }
  }, [displayUnit]);

  // Validate input value
  const validateInput = useCallback((valueInCents: number): string => {
    if (required && valueInCents === 0) {
      return `${label} is required`;
    }
    
    if (min !== undefined && valueInCents < min) {
      return `${label} must be at least ${centsToDisplay(min)} ${unit}`;
    }
    
    if (max !== undefined && valueInCents > max) {
      return `${label} cannot exceed ${centsToDisplay(max)} ${unit}`;
    }
    
    // Business logic validations
    if (displayUnit === 'percentage' && (valueInCents < 0 || valueInCents > 10000)) { // 0-100%
      return 'Percentage must be between 0% and 100%';
    }
    
    if (displayUnit === 'millions' && valueInCents < 0) {
      return 'Valuation cannot be negative';
    }
    
    return '';
  }, [label, min, max, unit, displayUnit, centsToDisplay, required]);

  // Update display value when value prop changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(centsToDisplay(value));
    }
  }, [value, centsToDisplay, isFocused]);

  // Initialize display value
  useEffect(() => {
    setDisplayValue(centsToDisplay(value));
  }, []); // Only on mount

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value;
    setDisplayValue(newDisplayValue);
    
    // Convert to cents and validate
    const valueInCents = displayToCents(newDisplayValue);
    const error = validateInput(valueInCents);
    setValidationError(error);
    
    // Only call onChange if valid or empty (for partial typing)
    if (!error || newDisplayValue === '') {
      onChange(valueInCents);
    }
  }, [displayToCents, validateInput, onChange]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    // Format the display value on blur
    const valueInCents = displayToCents(displayValue);
    const formattedDisplay = centsToDisplay(valueInCents);
    setDisplayValue(formattedDisplay);
    
    // Final validation
    const error = validateInput(valueInCents);
    setValidationError(error);
    
    onBlur?.();
  }, [displayValue, displayToCents, centsToDisplay, validateInput, onBlur]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation keys
    if (['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Tab'].includes(e.key)) {
      return;
    }
    
    // Allow numbers and decimal point
    if (/[0-9.]/.test(e.key)) {
      // Prevent multiple decimal points
      if (e.key === '.' && displayValue.includes('.')) {
        e.preventDefault();
      }
      return;
    }
    
    // Prevent other characters
    e.preventDefault();
  }, [displayValue]);

  const inputId = id || `financial-input-${Math.random().toString(36).substr(2, 9)}`;
  const helpTextId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const currentError = error || validationError;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>

      {/* Input with prefix/suffix */}
      <div className="relative">
        {/* Prefix (e.g., $ symbol) */}
        {(prefix || (unit && ['$', '%'].includes(unit))) && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">
              {prefix || (unit === '$' ? '$' : unit === '%' ? '' : unit)}
            </span>
          </div>
        )}

        {/* Input field */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={currentError ? 'true' : 'false'}
          aria-describedby={
            [
              helpText ? helpTextId : '',
              currentError ? errorId : '',
              ariaDescribedBy
            ].filter(Boolean).join(' ') || undefined
          }
          className={`
            block w-full rounded-md shadow-sm sm:text-sm
            ${prefix || (unit && ['$', '%'].includes(unit)) ? 'pl-8' : 'pl-3'}
            ${suffix || (unit && !['$', '%'].includes(unit)) ? 'pr-12' : 'pr-3'}
            py-2 border
            ${currentError
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}
            focus:outline-none focus:ring-2
            transition-colors duration-200
          `}
          {...props}
        />

        {/* Suffix (e.g., M, K) */}
        {(suffix || (unit && !['$', '%'].includes(unit))) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">
              {suffix || (unit === '%' ? '%' : unit)}
            </span>
          </div>
        )}
      </div>

      {/* Help text */}
      {helpText && (
        <div id={helpTextId} className="flex items-start space-x-1">
          <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600">{helpText}</p>
        </div>
      )}

      {/* Error message */}
      {currentError && (
        <div id={errorId} className="flex items-start space-x-1">
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600" role="alert">
            {currentError}
          </p>
        </div>
      )}

      {/* Screen reader only context */}
      <div className="sr-only">
        Value entered in {displayUnit}. 
        {min !== undefined && `Minimum: ${centsToDisplay(min)} ${unit}. `}
        {max !== undefined && `Maximum: ${centsToDisplay(max)} ${unit}. `}
        Current value: {displayValue} {unit}.
      </div>
    </div>
  );
}

// Specialized components for common use cases
export function ValuationInput(props: Omit<FinancialInputProps, 'displayUnit' | 'unit' | 'precision'>) {
  return (
    <FinancialInput
      {...props}
      displayUnit="millions"
      unit="M"
      precision={1}
      min={100000000} // $1M minimum
      helpText={props.helpText || "Company valuation in millions of dollars"}
    />
  );
}

export function InvestmentInput(props: Omit<FinancialInputProps, 'displayUnit' | 'unit' | 'precision'>) {
  return (
    <FinancialInput
      {...props}
      displayUnit="millions"
      unit="M"
      precision={1}
      min={10000000} // $100K minimum
      helpText={props.helpText || "Investment amount in millions of dollars"}
    />
  );
}

export function PricePerShareInput(props: Omit<FinancialInputProps, 'displayUnit' | 'unit' | 'precision'>) {
  return (
    <FinancialInput
      {...props}
      displayUnit="dollars"
      unit="$"
      precision={2}
      min={1} // $0.01 minimum
      helpText={props.helpText || "Price per share in dollars"}
    />
  );
}

export function PercentageInput(props: Omit<FinancialInputProps, 'displayUnit' | 'unit' | 'precision'>) {
  return (
    <FinancialInput
      {...props}
      displayUnit="percentage"
      unit="%"
      precision={1}
      min={0}
      max={10000} // 100%
      helpText={props.helpText || "Percentage value"}
    />
  );
}