import { XMarkIcon } from '@heroicons/react/24/outline';

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
  onSkipAll: () => void;
}

export function OnboardingHeader({ currentStep, totalSteps, onSkipAll }: OnboardingHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">CT</span>
              </div>
              <h1 className="text-lg font-semibold text-gray-900">Cap Table Setup</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Getting started ({currentStep}/{totalSteps})
            </span>
            <button
              onClick={onSkipAll}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Skip setup</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}