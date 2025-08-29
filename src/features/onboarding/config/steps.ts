import { OnboardingStep } from '../types';
import { CompanySetupStep } from '../components/steps/CompanySetupStep';
import { CompletionStep } from '../components/steps/CompletionStep';

export function getOnboardingSteps(): OnboardingStep[] {
  return [
    {
      id: 'company-setup',
      title: 'Create Your Company',
      description: 'Just the basics to get you started.',
      component: CompanySetupStep,
      estimatedTime: '2 min'
    },
    {
      id: 'completion',
      title: 'You\'re All Set!',
      description: 'Your cap table is ready. Here are some next steps.',
      component: CompletionStep,
      estimatedTime: '1 min'
    }
  ];
}