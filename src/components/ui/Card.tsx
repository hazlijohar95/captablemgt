import React from 'react';

interface ICardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  noPadding?: boolean;
}

export const Card = React.memo<ICardProps>(({ 
  children, 
  className = '', 
  hover = false, 
  onClick,
  noPadding = false 
}) => {
  const baseClasses = 'bg-white rounded-lg border border-gray-200';
  const hoverClasses = hover ? 'hover:border-primary-300 hover:shadow-sm transition-all duration-200' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';
  const paddingClasses = noPadding ? '' : 'p-6';

  return (
    <div 
      className={`${baseClasses} ${hoverClasses} ${clickableClasses} ${paddingClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

interface ICardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent = React.memo<ICardContentProps>(({ children, className = '' }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
});

interface ICardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const CardHeader = React.memo<ICardHeaderProps>(({ 
  title, 
  description, 
  actions, 
  icon, 
  badge,
  className = '' 
}) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              {badge}
            </div>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

interface ICardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter = React.memo<ICardFooterProps>(({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg ${className}`}>
      {children}
    </div>
  );
});