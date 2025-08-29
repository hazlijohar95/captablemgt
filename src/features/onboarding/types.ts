export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
  isOptional?: boolean;
  estimatedTime?: string;
}

export interface OnboardingStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
  currentStep: number;
  totalSteps: number;
  isLoading?: boolean;
}

export interface OnboardingProgress {
  currentStepId: string;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface CompanySetupData {
  companyName: string;
  incorporationDate: string;
  incorporationState: string;
  totalAuthorizedShares: number;
  parValue: number;
  shareClasses: Array<{
    name: string;
    shares: number;
    pricePerShare: number;
  }>;
}

export interface FounderSetupData {
  founders: Array<{
    name: string;
    email: string;
    role: string;
    shares: number;
    vestingStartDate: string;
    vestingCliff: number; // months
    vestingPeriod: number; // months
  }>;
}

export type UserRole = 'owner' | 'admin' | 'viewer';

export interface UserProfile {
  fullName: string;
  role: UserRole;
  isOnboardingComplete: boolean;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    emailDigest: boolean;
  };
}