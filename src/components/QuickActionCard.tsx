import { ReactNode } from 'react';

interface QuickActionCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  className = ''
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center
        hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed transition-all
        ${className}
      `}
    >
      <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
        {icon}
      </div>
      <span className="block text-sm font-medium text-gray-900">
        {title}
      </span>
      {description && (
        <span className="block text-xs text-gray-500 mt-1">
          {description}
        </span>
      )}
    </button>
  );
}