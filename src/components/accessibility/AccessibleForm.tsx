/**
 * Accessible form components compliant with WCAG 2.1 AA
 * Includes proper ARIA attributes, keyboard navigation, and screen reader support
 */

import React, { useRef, useCallback, useId, useState, useEffect } from 'react';
import { ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/20/solid';

export interface AccessibleFieldProps {
  label: string;
  children: React.ReactElement;
  error?: string;
  helperText?: string;
  required?: boolean;
  description?: string;
  className?: string;
}

export const AccessibleField: React.FC<AccessibleFieldProps> = ({
  label,
  children,
  error,
  helperText,
  required = false,
  description,
  className = ''
}) => {
  const fieldId = useId();
  const errorId = useId();
  const helperId = useId();
  const descriptionId = useId();

  // Build describedBy string
  const describedBy = [
    error ? errorId : null,
    helperText ? helperId : null,
    description ? descriptionId : null
  ].filter(Boolean).join(' ') || undefined;

  // Clone the child element with accessibility props
  const childElement = React.cloneElement(children, {
    id: (children.props as any).id || fieldId,
    'aria-required': required,
    'aria-invalid': error ? 'true' : 'false',
    'aria-describedby': describedBy,
    ...(children.props as any)
  });

  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={(children.props as any).id || fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span 
            className="text-red-500 ml-1" 
            aria-label="required"
            title="This field is required"
          >
            *
          </span>
        )}
      </label>

      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}

      {childElement}

      {error && (
        <div 
          id={errorId}
          className="flex items-start space-x-2 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <ExclamationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {helperText && !error && (
        <div 
          id={helperId}
          className="flex items-start space-x-2 text-sm text-gray-500"
        >
          <InformationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{helperText}</span>
        </div>
      )}
    </div>
  );
};

export interface AccessibleSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  placeholder = 'Select an option',
  required = false,
  className = '',
  ...props
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <AccessibleField
      label={label}
      error={error}
      helperText={helperText}
      required={required}
      className={className}
    >
      <select
        ref={selectRef}
        value={value}
        onChange={handleChange}
        className={`
          block w-full px-3 py-2.5 border rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:border-transparent
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error
            ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
            : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
          }
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </AccessibleField>
  );
};

export interface AccessibleButtonGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  orientation?: 'horizontal' | 'vertical';
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
}

export const AccessibleButtonGroup: React.FC<AccessibleButtonGroupProps> = ({
  label,
  value,
  onChange,
  options,
  orientation = 'horizontal',
  error,
  helperText,
  required = false,
  className = ''
}) => {
  const groupId = useId();

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, optionValue: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(optionValue);
    }
  }, [onChange]);

  return (
    <AccessibleField
      label={label}
      error={error}
      helperText={helperText}
      required={required}
      className={className}
    >
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className={`
          flex gap-2
          ${orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}
        `}
      >
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, option.value)}
            className={`
              px-4 py-2 text-sm font-medium border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
              ${value === option.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }
              ${error ? 'border-red-300' : ''}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </AccessibleField>
  );
};

export interface AccessibleNumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (value: number) => string;
  parseValue?: (text: string) => number;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
}

export const AccessibleNumberStepper: React.FC<AccessibleNumberStepperProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue = (v) => v.toString(),
  parseValue = (text) => parseFloat(text) || 0,
  error,
  helperText,
  required = false,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(() => formatValue(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(formatValue(value));
  }, [value, formatValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const numericValue = parseValue(newValue);
    if (!isNaN(numericValue)) {
      onChange(numericValue);
    }
  }, [onChange, parseValue]);

  const handleBlur = useCallback(() => {
    setInputValue(formatValue(value));
  }, [value, formatValue]);

  const handleIncrement = useCallback(() => {
    const newValue = value + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  }, [value, step, max, onChange]);

  const handleDecrement = useCallback(() => {
    const newValue = value - step;
    if (min === undefined || newValue >= min) {
      onChange(newValue);
    }
  }, [value, step, min, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  }, [handleIncrement, handleDecrement]);

  return (
    <AccessibleField
      label={label}
      error={error}
      helperText={helperText}
      required={required}
      className={className}
    >
      <div className="relative flex">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`
            block w-full px-3 py-2.5 pr-16 border rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:border-transparent
            ${error
              ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
            }
          `}
          aria-label={`${label} value`}
          role="spinbutton"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
        
        <div className="absolute inset-y-0 right-0 flex flex-col">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={max !== undefined && value >= max}
            className="
              flex-1 px-2 text-gray-500 hover:text-gray-700 
              focus:outline-none focus:text-gray-700
              disabled:opacity-50 disabled:cursor-not-allowed
              border-l border-gray-300
            "
            aria-label={`Increase ${label}`}
            tabIndex={-1}
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3l7 7H3l7-7z" clipRule="evenodd" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={handleDecrement}
            disabled={min !== undefined && value <= min}
            className="
              flex-1 px-2 text-gray-500 hover:text-gray-700 
              focus:outline-none focus:text-gray-700
              disabled:opacity-50 disabled:cursor-not-allowed
              border-l border-t border-gray-300
            "
            aria-label={`Decrease ${label}`}
            tabIndex={-1}
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 17L3 10h14l-7 7z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </AccessibleField>
  );
};

// Screen reader utilities
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">
    {children}
  </span>
);

export interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  children, 
  politeness = 'polite', 
  atomic = false,
  className = ''
}) => (
  <div
    aria-live={politeness}
    aria-atomic={atomic}
    className={className || 'sr-only'}
  >
    {children}
  </div>
);