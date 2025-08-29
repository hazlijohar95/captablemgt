import { OnboardingStepProps } from '../../types';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const benefits = [
  {
    title: 'Track Equity',
    description: 'Manage all your equity positions, from common shares to complex preferred structures.',
    icon: '📊'
  },
  {
    title: 'Model Scenarios',
    description: 'Visualize the impact of funding rounds, acquisitions, and option grants.',
    icon: '🎯'
  },
  {
    title: 'Generate Documents',
    description: 'Create professional stock certificates, option agreements, and board resolutions.',
    icon: '📄'
  },
  {
    title: 'Stay Compliant',
    description: 'Maintain accurate records for tax reporting and regulatory compliance.',
    icon: '✅'
  }
];

export function WelcomeStep({ onNext }: OnboardingStepProps) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">👋</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Your Cap Table
        </h2>
        <p className="text-lg text-gray-600">
          Let's set up your equity management system in just a few minutes.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {benefits.map((benefit, index) => (
          <div key={index} className="text-left p-4 rounded-lg border border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="text-xl">{benefit.icon}</div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-8">
        <div className="flex items-start space-x-3">
          <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-left">
            <h4 className="font-medium text-blue-900 mb-1">Your data is secure</h4>
            <p className="text-sm text-blue-700">
              All information is encrypted and stored securely. You maintain full control over your data.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
      >
        Let's Get Started
      </button>
    </div>
  );
}