import React from 'react';
import { IssuanceWizardProvider, useIssuanceWizard } from '../context/IssuanceWizardContext';
import StepIndicator from './shared/StepIndicator';
import WizardNavigation from './shared/WizardNavigation';
import StakeholderSelectionStep from './steps/StakeholderSelectionStep';
import SecurityDetailsStep from './steps/SecurityDetailsStep';
import PricingTermsStep from './steps/PricingTermsStep';
import VestingScheduleStep from './steps/VestingScheduleStep';
import ReviewComplianceStep from './steps/ReviewComplianceStep';
import IssuanceResultStep from './steps/IssuanceResultStep';
import { ISecurityIssuanceResult } from '../types/issuance.types';
import type { ULID } from '@/types';

interface ISecuritiesIssuanceWizardProps {
  companyId: ULID;
  onComplete?: (result: ISecurityIssuanceResult) => void;
  onCancel?: () => void;
  initialStakeholderId?: string;
}

// Internal wizard component that uses the context
const WizardContent: React.FC<{
  onComplete?: (result: ISecurityIssuanceResult) => void;
  onCancel?: () => void;
}> = ({ onComplete, onCancel }) => {
  const {
    state,
    canProceed,
    goToStep,
    nextStep,
    prevStep,
    issueSecurity
  } = useIssuanceWizard();

  const { steps, currentStepIndex, loading, issuing, result } = state;

  // Handle issuance
  const handleIssue = async () => {
    try {
      await issueSecurity();
      nextStep(); // Move to result step
      if (result?.success) {
        onComplete?.(result);
      }
    } catch (error) {
      console.error('Failed to issue security:', error);
    }
  };

  // Render current step content
  const renderCurrentStep = () => {
    switch (currentStepIndex) {
      case 0:
        return <StakeholderSelectionStep />;
      case 1:
        return <SecurityDetailsStep />;
      case 2:
        return <PricingTermsStep />;
      case 3:
        return <VestingScheduleStep />;
      case 4:
        return <ReviewComplianceStep />;
      case 5:
        return <IssuanceResultStep />;
      default:
        return <div>Unknown step</div>;
    }
  };

  // Show loading state during initialization
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading wizard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Issue Securities</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create new securities with full compliance checking and transaction safety
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator 
        steps={steps} 
        onStepClick={(stepIndex) => {
          // Only allow clicking on completed steps or current step
          if (steps[stepIndex].completed || stepIndex === currentStepIndex) {
            goToStep(stepIndex);
          }
        }} 
      />

      {/* Step Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <WizardNavigation
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          canProceed={canProceed}
          isIssuing={issuing}
          onPrevious={prevStep}
          onNext={nextStep}
          onCancel={onCancel || (() => {})}
          onIssue={handleIssue}
          showIssueButton={!!result?.success === false || currentStepIndex === 4} // Show on review step
        />
      </div>
    </div>
  );
};

// Main component that provides the context
export const SecuritiesIssuanceWizardRefactored: React.FC<ISecuritiesIssuanceWizardProps> = ({
  companyId,
  onComplete,
  onCancel,
  initialStakeholderId
}) => {
  return (
    <IssuanceWizardProvider 
      companyId={companyId} 
      initialStakeholderId={initialStakeholderId}
    >
      <WizardContent onComplete={onComplete} onCancel={onCancel} />
    </IssuanceWizardProvider>
  );
};

export default SecuritiesIssuanceWizardRefactored;