import { useState, useEffect } from 'react';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingNavigation } from './OnboardingNavigation';
import { getOnboardingSteps } from '../config/steps';
import { useOnboardingProgress } from '../hooks/useOnboardingProgress';

interface OnboardingContainerProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingContainer({ onComplete, onSkip }: OnboardingContainerProps) {
  const steps = getOnboardingSteps();
  const { progress, updateProgress, markStepCompleted, markStepSkipped } = useOnboardingProgress();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    // Initialize progress if not exists
    if (!progress.currentStepId && steps.length > 0) {
      updateProgress({
        currentStepId: steps[0].id,
        completedSteps: [],
        skippedSteps: [],
        startedAt: new Date()
      });
    }
  }, [steps, progress, updateProgress]);

  const handleNext = async () => {
    setIsLoading(true);
    try {
      // Mark current step as completed
      await markStepCompleted(currentStep.id);
      
      if (currentStepIndex < steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        updateProgress({
          ...progress,
          currentStepId: steps[nextIndex].id
        });
      } else {
        // All steps completed
        updateProgress({
          ...progress,
          completedAt: new Date()
        });
        onComplete();
      }
    } catch (error) {
      console.error('Error progressing to next step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      updateProgress({
        ...progress,
        currentStepId: steps[prevIndex].id
      });
    }
  };

  const handleSkipStep = async () => {
    if (!currentStep.isOptional) return;
    
    setIsLoading(true);
    try {
      await markStepSkipped(currentStep.id);
      handleNext();
    } catch (error) {
      console.error('Error skipping step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipOnboarding = () => {
    onSkip();
  };

  if (!currentStep) {
    return null;
  }

  const StepComponent = currentStep.component;

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingHeader
        currentStep={currentStepIndex + 1}
        totalSteps={steps.length}
        onSkipAll={handleSkipOnboarding}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Progress indicator */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-xl font-semibold text-gray-900">{currentStep.title}</h1>
              {currentStep.estimatedTime && (
                <span className="text-sm text-gray-500">~{currentStep.estimatedTime}</span>
              )}
            </div>
            <p className="text-gray-600">{currentStep.description}</p>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Step {currentStepIndex + 1} of {steps.length}</span>
                <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Step content */}
          <div className="px-6 py-8">
            <StepComponent
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSkip={currentStep.isOptional ? handleSkipStep : undefined}
              currentStep={currentStepIndex + 1}
              totalSteps={steps.length}
              isLoading={isLoading}
            />
          </div>
        </div>
        
        <OnboardingNavigation
          currentStep={currentStepIndex + 1}
          totalSteps={steps.length}
          canGoBack={currentStepIndex > 0}
          canSkip={currentStep.isOptional}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSkip={handleSkipStep}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}