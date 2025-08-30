import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { IIssuanceStep } from '../../types/issuance.types';

interface IStepIndicatorProps {
  steps: IIssuanceStep[];
  onStepClick?: (stepIndex: number) => void;
}

export const StepIndicator: React.FC<IStepIndicatorProps> = ({ steps, onStepClick }) => {
  return (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, stepIndex) => (
            <li key={step.id} className={`relative ${stepIndex !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
              <div className="flex items-center">
                <div 
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full cursor-pointer transition-colors ${
                    step.completed 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : step.current 
                        ? 'border-2 border-blue-600 bg-white hover:border-blue-700' 
                        : 'border-2 border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  onClick={() => onStepClick?.(stepIndex)}
                >
                  {step.completed ? (
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  ) : (
                    <span className={`text-sm font-medium ${
                      step.current ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {stepIndex + 1}
                    </span>
                  )}
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className={`text-sm font-medium ${
                    step.current ? 'text-blue-600' : step.completed ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {stepIndex !== steps.length - 1 && (
                <div className="absolute top-4 right-0 hidden h-0.5 w-8 bg-gray-200 sm:block sm:w-20">
                  <div 
                    className={`h-full transition-colors ${
                      step.completed ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default StepIndicator;