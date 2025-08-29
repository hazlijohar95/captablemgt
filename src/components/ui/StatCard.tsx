import React from 'react';

interface IStatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBgColor?: string;
  className?: string;
}

export const StatCard = React.memo<IStatCardProps>(({
  title,
  value,
  icon,
  iconBgColor = 'bg-gray-500',
  className = '',
}) => {
  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 ${iconBgColor} rounded-full flex items-center justify-center`}>
                {typeof icon === 'string' ? (
                  <span className="text-xs font-medium text-white">{icon}</span>
                ) : (
                  <div className="text-white">{icon}</div>
                )}
              </div>
            </div>
          )}
          <div className={`${icon ? 'ml-5' : ''} w-0 flex-1`}>
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-semibold text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
});