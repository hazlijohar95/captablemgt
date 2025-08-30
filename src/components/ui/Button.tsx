import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-500 text-white',
          'hover:bg-primary-600 focus:ring-primary-200'
        ],
        secondary: [
          'bg-white text-gray-700 border border-gray-200',
          'hover:bg-gray-50 hover:border-gray-300 focus:ring-primary-200'
        ],
        outline: [
          'bg-transparent text-primary-600 border border-primary-200',
          'hover:bg-primary-50 hover:border-primary-300 focus:ring-primary-200'
        ],
        ghost: [
          'bg-transparent text-gray-700',
          'hover:bg-gray-100 focus:ring-primary-200'
        ],
        danger: [
          'bg-error-500 text-white',
          'hover:bg-error-600 focus:ring-error-200'
        ],
        success: [
          'bg-success-500 text-white',
          'hover:bg-success-600 focus:ring-success-200'
        ],
      },
      size: {
        xs: 'px-2.5 py-1.5 text-xs rounded gap-1.5',
        sm: 'px-3 py-2 text-sm rounded gap-2',
        md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
        lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
        xl: 'px-8 py-4 text-lg rounded-xl gap-3',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface IButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.memo<IButtonProps>(({
  variant,
  size,
  fullWidth,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={buttonVariants({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      {...props}
    >
      <div className="flex items-center gap-inherit">
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : leftIcon && (
          <span className="flex-shrink-0">
            {leftIcon}
          </span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">
            {rightIcon}
          </span>
        )}
      </div>
    </button>
  );
});

Button.displayName = 'Button';

// Export variant types for external use
export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;