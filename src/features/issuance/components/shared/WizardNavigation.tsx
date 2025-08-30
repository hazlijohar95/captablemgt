import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface IWizardNavigationProps {
  currentStepIndex: number;
  totalSteps: number;
  canProceed: boolean;
  isIssuing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onIssue: () => void;
  showIssueButton: boolean;
}

export const WizardNavigation: React.FC<IWizardNavigationProps> = ({
  currentStepIndex,
  totalSteps,
  canProceed,
  isIssuing,
  onPrevious,
  onNext,
  onCancel,
  onIssue,
  showIssueButton
}) => {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isReviewStep = currentStepIndex === totalSteps - 2; // Second to last step

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
      {/* Previous Button */}
      <button
        type="button"
        className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
          isFirstStep || isLastStep
            ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
            : 'text-gray-700 bg-white hover:bg-gray-50'
        }`}
        onClick={onPrevious}
        disabled={isFirstStep || isLastStep}
      >
        <ChevronLeftIcon className="h-4 w-4 mr-2" />
        Previous
      </button>

      {/* Right Side Buttons */}
      <div className="flex space-x-3">
        {/* Cancel Button */}
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          onClick={onCancel}
          disabled={isIssuing}
        >
          Cancel
        </button>

        {/* Action Button */}
        {showIssueButton && isReviewStep ? (
          /* Issue Security Button */
          <button
            type="button"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              canProceed && !isIssuing
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={onIssue}
            disabled={!canProceed || isIssuing}
          >
            {isIssuing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Issuing...
              </>
            ) : (
              'Issue Security'
            )}
          </button>
        ) : !isLastStep ? (
          /* Next Button */
          <button
            type="button"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              canProceed
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={onNext}
            disabled={!canProceed}
          >
            Next
            <ChevronRightIcon className="h-4 w-4 ml-2" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default WizardNavigation;