import { useState, useEffect } from 'react';
import { OnboardingStepProps } from '../../types';
import { CheckCircleIcon, DocumentTextIcon, UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/features/auth/AuthContext';

const nextSteps = [
  {
    icon: UsersIcon,
    title: 'Invite Your Team',
    description: 'Add stakeholders and assign appropriate access levels.',
    action: 'Go to Stakeholders'
  },
  {
    icon: DocumentTextIcon,
    title: 'Generate Documents',
    description: 'Create stock certificates and option agreements.',
    action: 'View Templates'
  },
  {
    icon: ChartBarIcon,
    title: 'Model Scenarios',
    description: 'Explore funding rounds and exit scenarios.',
    action: 'Run Models'
  }
];

export function CompletionStep({ onNext }: OnboardingStepProps) {
  const { setCurrentCompanyId } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<{id: string; name: string} | null>(null);

  useEffect(() => {
    // Get the company info from localStorage
    const savedCompany = localStorage.getItem('onboarding_company_created');
    if (savedCompany) {
      setCompanyInfo(JSON.parse(savedCompany));
    }
  }, []);

  const handleGetStarted = () => {
    // Mark onboarding as complete
    const completedProgress = {
      currentStepId: 'completed',
      completedSteps: ['company-setup', 'completion'],
      skippedSteps: [],
      startedAt: new Date(localStorage.getItem('onboarding_started') || Date.now()),
      completedAt: new Date()
    };
    
    localStorage.setItem('captable_onboarding_progress', JSON.stringify(completedProgress));
    localStorage.setItem('captable_onboarding_complete', 'true');
    
    // Set the current company ID and complete onboarding
    if (companyInfo) {
      setCurrentCompanyId(companyInfo.id);
    }
    
    // Clean up onboarding localStorage
    localStorage.removeItem('onboarding_company_created');
    
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircleIcon className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎉 {companyInfo?.name || 'Your Company'} is Ready!
        </h2>
        <p className="text-lg text-gray-600">
          Your cap table has been created with smart defaults. Here's what you can do next.
        </p>
      </div>

      <div className="grid gap-4 mb-8">
        {nextSteps.map((step, index) => (
          <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg text-left">
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center mr-4">
              <step.icon className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              {step.action}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-primary-50 rounded-lg p-6 mb-8">
        <h3 className="font-medium text-primary-900 mb-2">Need Help Getting Started?</h3>
        <p className="text-sm text-primary-700 mb-4">
          Our team is here to help you make the most of your cap table management.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button className="px-4 py-2 bg-white text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
            📚 View Documentation
          </button>
          <button className="px-4 py-2 bg-white text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
            💬 Schedule Demo
          </button>
          <button className="px-4 py-2 bg-white text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
            ✉️ Contact Support
          </button>
        </div>
      </div>

      <button
        onClick={handleGetStarted}
        className="w-full px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );
}