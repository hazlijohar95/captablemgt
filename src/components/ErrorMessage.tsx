import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface IErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className = '' }: IErrorMessageProps) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="bg-red-100 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}