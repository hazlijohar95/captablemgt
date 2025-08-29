import { useState } from 'react';
import { OnboardingProgress } from '../types';

const ONBOARDING_STORAGE_KEY = 'captable_onboarding_progress';

interface UseOnboardingProgressReturn {
  progress: OnboardingProgress;
  updateProgress: (progress: OnboardingProgress) => void;
  markStepCompleted: (stepId: string) => Promise<void>;
  markStepSkipped: (stepId: string) => Promise<void>;
  resetProgress: () => void;
  isOnboardingComplete: boolean;
}

export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const [progress, setProgress] = useState<OnboardingProgress>(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        currentStepId: '',
        completedSteps: [],
        skippedSteps: [],
        startedAt: new Date()
      };
    } catch {
      return {
        currentStepId: '',
        completedSteps: [],
        skippedSteps: [],
        startedAt: new Date()
      };
    }
  });

  const updateProgress = (newProgress: OnboardingProgress) => {
    setProgress(newProgress);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newProgress));
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  };

  const markStepCompleted = async (stepId: string) => {
    const updatedProgress = {
      ...progress,
      completedSteps: [...progress.completedSteps.filter(id => id !== stepId), stepId],
      skippedSteps: progress.skippedSteps.filter(id => id !== stepId)
    };
    updateProgress(updatedProgress);
    
    // Here you could also sync with backend
    try {
      // await onboardingService.updateProgress(updatedProgress);
    } catch (error) {
      console.error('Error syncing progress with backend:', error);
    }
  };

  const markStepSkipped = async (stepId: string) => {
    const updatedProgress = {
      ...progress,
      skippedSteps: [...progress.skippedSteps.filter(id => id !== stepId), stepId],
      completedSteps: progress.completedSteps.filter(id => id !== stepId)
    };
    updateProgress(updatedProgress);
    
    try {
      // await onboardingService.updateProgress(updatedProgress);
    } catch (error) {
      console.error('Error syncing progress with backend:', error);
    }
  };

  const resetProgress = () => {
    const resetProgress: OnboardingProgress = {
      currentStepId: '',
      completedSteps: [],
      skippedSteps: [],
      startedAt: new Date()
    };
    updateProgress(resetProgress);
  };

  const isOnboardingComplete = Boolean(progress.completedAt);

  return {
    progress,
    updateProgress,
    markStepCompleted,
    markStepSkipped,
    resetProgress,
    isOnboardingComplete
  };
}