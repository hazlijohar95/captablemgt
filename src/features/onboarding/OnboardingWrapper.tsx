import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { OnboardingContainer } from './components/OnboardingContainer';

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Check if user has completed onboarding
    const checkOnboardingStatus = () => {
      const onboardingComplete = localStorage.getItem('captable_onboarding_complete');
      const hasCompanyData = localStorage.getItem('onboarding_company_setup');
      
      // Also check if user is joining an existing company vs creating new one
      const isFirstTimeUser = !onboardingComplete && !hasCompanyData;
      
      setNeedsOnboarding(isFirstTimeUser);
      setLoading(false);
    };

    checkOnboardingStatus();
  }, [user]);

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('captable_onboarding_complete', 'true');
    setNeedsOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (needsOnboarding && user) {
    return (
      <OnboardingContainer
        onComplete={handleOnboardingComplete}
        onSkip={handleSkipOnboarding}
      />
    );
  }

  return <>{children}</>;
}