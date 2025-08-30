import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'bg-white border border-gray-200 transition-colors duration-150',
  {
    variants: {
      variant: {
        default: 'shadow-sm',
        elevated: 'shadow',
        outlined: 'border-2 shadow-none',
        glass: 'bg-white/80 backdrop-blur-sm shadow-lg border border-white/20',
      },
      size: {
        sm: 'rounded-lg',
        md: 'rounded-xl',
        lg: 'rounded-xl',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-lg hover:border-gray-300',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      padding: 'md',
      interactive: false,
    },
  }
);

interface ICardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode;
  hover?: boolean; // Deprecated: use interactive instead
  noPadding?: boolean; // Deprecated: use padding="none" instead
}

export const Card = React.memo<ICardProps>(({
  children,
  className,
  variant,
  size,
  padding,
  interactive,
  hover, // Deprecated
  noPadding, // Deprecated
  onClick,
  ...props
}) => {
  // Handle deprecated props
  const isInteractive = interactive ?? (hover || !!onClick);
  const cardPadding = padding ?? (noPadding ? 'none' : 'md');

  return (
    <div
      className={cardVariants({ variant, size, padding: cardPadding, interactive: isInteractive, className })}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

interface ICardContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const CardContent = React.memo<ICardContentProps>(({ 
  children, 
  className = '',
  padding = 'md'
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

interface ICardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
}

export const CardHeader = React.memo<ICardHeaderProps>(({
  title,
  description,
  actions,
  icon,
  badge,
  className = '',
  variant = 'default'
}) => {
  const isCompact = variant === 'compact';

  return (
    <div className={`px-6 ${isCompact ? 'py-3' : 'py-5'} border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0 flex-1 gap-3">
          {icon && (
            <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-gray-900 truncate ${
                isCompact ? 'text-base' : 'text-lg'
              }`}>
                {title}
              </h3>
              {badge}
            </div>
            {description && (
              <p className={`text-gray-700 ${
                isCompact ? 'text-xs mt-0.5' : 'text-sm mt-1'
              }`}>
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

interface ICardFooterProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'actions';
}

export const CardFooter = React.memo<ICardFooterProps>(({ 
  children, 
  className = '',
  variant = 'default'
}) => {
  const isActions = variant === 'actions';

  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl ${
      isActions ? 'flex items-center justify-end gap-3' : ''
    } ${className}`}>
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

// Utility component for stat cards
interface IStatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export const StatCard = React.memo<IStatCardProps>(({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  color = 'primary',
  className = ''
}) => {
  const changeColors = {
    increase: 'text-success-700 bg-success-100',
    decrease: 'text-error-700 bg-error-100',
    neutral: 'text-gray-600 bg-gray-100',
  };

  const iconColors = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    error: 'bg-error-100 text-error-600',
    warning: 'bg-warning-100 text-warning-600',
  };

  return (
    <Card className={className} variant="default">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <dt className="text-sm font-medium text-gray-700 truncate">
            {title}
          </dt>
          <dd className="mt-2">
            <div className="text-3xl font-bold text-gray-900">
              {value}
            </div>
            {change && (
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${changeColors[changeType]}`}>
                  {change}
                </span>
              </div>
            )}
          </dd>
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${iconColors[color as keyof typeof iconColors] || iconColors.primary}`}>
            <div className="w-6 h-6">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';