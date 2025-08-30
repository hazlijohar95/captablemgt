import React, { forwardRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const inputVariants = cva(
  'block w-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 peer placeholder:text-transparent disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: [
          'bg-white border border-gray-300 focus:border-primary-500 focus:ring-primary-200',
        ],
        filled: [
          'bg-gray-50 border border-transparent focus:bg-white focus:border-primary-500 focus:ring-primary-200',
        ],
      },
      size: {
        sm: 'px-3 py-2 text-sm rounded',
        md: 'px-4 py-3 text-sm rounded-lg',
        lg: 'px-5 py-4 text-base rounded-lg',
      },
      hasError: {
        true: '!border-error-500 !focus:border-error-500 !focus:ring-error-200',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hasError: false,
    },
  }
);

const labelVariants = cva(
  'absolute left-4 transition-all duration-200 pointer-events-none origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6',
  {
    variants: {
      variant: {
        default: 'text-gray-500 peer-focus:text-primary-600',
        filled: 'text-gray-600 peer-focus:text-primary-600',
      },
      size: {
        sm: 'text-sm top-2 peer-focus:top-0',
        md: 'text-sm top-3 peer-focus:top-0',
        lg: 'text-base top-4 peer-focus:top-0',
      },
      hasError: {
        true: '!text-error-500 peer-focus:!text-error-500',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hasError: false,
    },
  }
);

interface IInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, IInputProps>(({
  variant,
  size,
  hasError,
  label,
  error,
  helpText,
  leftIcon,
  rightIcon,
  containerClassName = '',
  className = '',
  type = 'text',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isError = hasError || !!error;
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`relative ${containerClassName}`}>
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          placeholder=" " // Required for floating label
          className={inputVariants({ 
            variant, 
            size, 
            hasError: isError, 
            className: `
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon || type === 'password' ? 'pr-10' : ''}
              ${className}
            `
          })}
          {...props}
        />
        
        {label && (
          <label className={labelVariants({ 
            variant, 
            size, 
            hasError: isError,
            className: leftIcon ? 'left-10' : undefined
          })}>
            {label}
          </label>
        )}
        
        {(rightIcon || type === 'password') && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {type === 'password' ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            ) : (
              <div className="text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
        )}
      </div>
      
      {(error || helpText) && (
        <div className="mt-2 px-1">
          {error && (
            <p className="text-sm text-error-600">
              {error}
            </p>
          )}
          {helpText && !error && (
            <p className="text-sm text-gray-600">
              {helpText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Textarea component
interface ITextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helpText?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, ITextareaProps>(({
  variant,
  size,
  hasError,
  label,
  error,
  helpText,
  containerClassName = '',
  className = '',
  rows = 4,
  ...props
}, ref) => {
  const isError = hasError || !!error;

  return (
    <div className={`relative ${containerClassName}`}>
      <div className="relative">
        <textarea
          ref={ref}
          rows={rows}
          placeholder=" " // Required for floating label
          className={inputVariants({ 
            variant, 
            size, 
            hasError: isError, 
            className: `resize-none ${className}`
          })}
          {...props}
        />
        
        {label && (
          <label className={labelVariants({ variant, size, hasError: isError })}>
            {label}
          </label>
        )}
      </div>
      
      {(error || helpText) && (
        <div className="mt-2 px-1">
          {error && (
            <p className="text-sm text-error-600">
              {error}
            </p>
          )}
          {helpText && !error && (
            <p className="text-sm text-gray-600">
              {helpText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Select component
interface ISelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helpText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, ISelectProps>(({
  variant,
  size,
  hasError,
  label,
  error,
  helpText,
  options,
  placeholder,
  containerClassName = '',
  className = '',
  ...props
}, ref) => {
  const isError = hasError || !!error;

  return (
    <div className={`relative ${containerClassName}`}>
      <div className="relative">
        <select
          ref={ref}
          className={inputVariants({ 
            variant, 
            size, 
            hasError: isError, 
            className: `pr-8 ${className}`
          })}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {label && (
          <label className={labelVariants({ variant, size, hasError: isError })}>
            {label}
          </label>
        )}
        
        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {(error || helpText) && (
        <div className="mt-2 px-1">
          {error && (
            <p className="text-sm text-error-600">
              {error}
            </p>
          )}
          {helpText && !error && (
            <p className="text-sm text-gray-600">
              {helpText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';