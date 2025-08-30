/**
 * Error banner component for displaying scenario calculation errors
 */

import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface CalculationError {
  message: string;
  details?: string;
}

interface ScenarioModelerErrorBannerProps {
  errors: CalculationError[];
  onDismissError: (index: number) => void;
  onDismissAll: () => void;
}

export const ScenarioModelerErrorBanner: React.FC<ScenarioModelerErrorBannerProps> = ({
  errors,
  onDismissError,
  onDismissAll
}) => {
  if (errors.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {errors.length === 1 ? 'Calculation Error' : `${errors.length} Calculation Errors`}
          </h3>
          <div className="mt-2">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">
                  <span className="font-medium">{error.message}</span>
                  {error.details && (
                    <div className="ml-4 mt-1 text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
                      {error.details}
                    </div>
                  )}
                  <button
                    onClick={() => onDismissError(index)}
                    className="ml-2 text-xs text-red-500 hover:text-red-700 underline"
                    aria-label={`Dismiss error: ${error.message}`}
                  >
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {errors.length > 1 && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={onDismissAll}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Dismiss All
              </Button>
            </div>
          )}
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={onDismissAll}
            className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
            aria-label="Dismiss all errors"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};