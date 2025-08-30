import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-primary-100 text-primary-800',
        success: 'bg-success-100 text-success-800',
        warning: 'bg-warning-100 text-warning-800',
        error: 'bg-error-100 text-error-800',
        info: 'bg-blue-100 text-blue-800',
        purple: 'bg-purple-100 text-purple-800',
        pink: 'bg-pink-100 text-pink-800',
        outline: 'border border-gray-200 text-gray-700',
      },
      size: {
        xs: 'px-2 py-0.5 text-xs rounded-md gap-1',
        sm: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
        md: 'px-3 py-1.5 text-sm rounded-lg gap-2',
        lg: 'px-4 py-2 text-sm rounded-xl gap-2',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-105 active:scale-95',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      interactive: false,
    },
  }
);

interface IBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRemove?: () => void;
}

export const Badge = React.memo<IBadgeProps>(({
  variant,
  size,
  interactive,
  children,
  leftIcon,
  rightIcon,
  onRemove,
  className,
  onClick,
  ...props
}) => {
  const isInteractive = interactive || !!onClick || !!onRemove;

  return (
    <span
      className={badgeVariants({ variant, size, interactive: isInteractive, className })}
      onClick={onClick}
      {...props}
    >
      {leftIcon && (
        <span className="flex-shrink-0">
          {leftIcon}
        </span>
      )}
      
      {children}
      
      {rightIcon && (
        <span className="flex-shrink-0">
          {rightIcon}
        </span>
      )}
      
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 flex-shrink-0 rounded-full p-0.5 hover:bg-black/10 transition-colors"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

// Status Badge - Common pattern for status indicators
interface IStatusBadgeProps extends Omit<IBadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'draft';
}

export const StatusBadge = React.memo<IStatusBadgeProps>(({
  status,
  ...props
}) => {
  const statusConfig = {
    active: { variant: 'success' as const, children: 'Active' },
    inactive: { variant: 'default' as const, children: 'Inactive' },
    pending: { variant: 'warning' as const, children: 'Pending' },
    completed: { variant: 'success' as const, children: 'Completed' },
    failed: { variant: 'error' as const, children: 'Failed' },
    draft: { variant: 'outline' as const, children: 'Draft' },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      {...props}
    >
      {props.children || config.children}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Notification Badge - For showing counts
interface INotificationBadgeProps {
  count: number;
  max?: number;
  variant?: 'error' | 'primary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const NotificationBadge = React.memo<INotificationBadgeProps>(({
  count,
  max = 99,
  variant = 'error',
  size = 'sm',
  className = '',
}) => {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-2xs',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm',
  };

  return (
    <span
      className={`
        absolute -top-1 -right-1 inline-flex items-center justify-center
        ${sizeClasses[size]} min-w-fit px-1 rounded-full font-bold text-white
        ${variant === 'error' ? 'bg-error-500' : 
          variant === 'primary' ? 'bg-primary-500' : 'bg-success-500'}
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
});

NotificationBadge.displayName = 'NotificationBadge';

// Priority Badge - For showing priority levels
interface IPriorityBadgeProps extends Omit<IBadgeProps, 'variant' | 'children'> {
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const PriorityBadge = React.memo<IPriorityBadgeProps>(({
  priority,
  ...props
}) => {
  const priorityConfig = {
    low: { variant: 'default' as const, children: 'Low', dot: '🟢' },
    medium: { variant: 'warning' as const, children: 'Medium', dot: '🟡' },
    high: { variant: 'error' as const, children: 'High', dot: '🟠' },
    urgent: { variant: 'error' as const, children: 'Urgent', dot: '🔴' },
  };

  const config = priorityConfig[priority];

  return (
    <Badge
      variant={config.variant}
      leftIcon={<span className="text-xs">{config.dot}</span>}
      {...props}
    >
      {config.children}
    </Badge>
  );
});

PriorityBadge.displayName = 'PriorityBadge';