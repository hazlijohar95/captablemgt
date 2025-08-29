import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface IButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border-transparent',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500 border-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent',
  outline: 'bg-transparent text-primary-600 hover:bg-primary-50 focus:ring-primary-500 border-primary-600',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = React.memo<IButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center border font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const disabledClasses = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${disabledClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && leftIcon && <span className="-ml-1 mr-2">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="ml-2 -mr-1">{rightIcon}</span>}
    </button>
  );
});