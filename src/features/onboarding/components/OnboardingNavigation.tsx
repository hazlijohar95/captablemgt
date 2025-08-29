import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface OnboardingNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canSkip?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export function OnboardingNavigation({
  currentStep,
  totalSteps,
  canGoBack,
  canSkip,
  onPrevious,
  onNext,
  onSkip,
  isLoading
}: OnboardingNavigationProps) {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="mt-6 flex items-center justify-between">
      <div>
        {canGoBack && (
          <button
            onClick={onPrevious}
            disabled={isLoading}
            className="flex items-center space-x-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {canSkip && onSkip && (
          <button
            onClick={onSkip}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip this step
          </button>
        )}
        
        <button
          onClick={onNext}
          disabled={isLoading}
          className="flex items-center space-x-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>
              <span>{isLastStep ? 'Complete Setup' : 'Continue'}</span>
              {!isLastStep && <ChevronRightIcon className="h-4 w-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
}