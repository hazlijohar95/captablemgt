import { useState } from 'react';
import { OnboardingStepProps, FounderSetupData } from '../../types';
import { PlusIcon, TrashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const FOUNDER_ROLES = [
  'CEO', 'CTO', 'COO', 'CFO', 'VP Engineering', 'VP Product', 'VP Sales', 'VP Marketing', 'Other'
];

export function FoundersStep({ onNext, isLoading }: OnboardingStepProps) {
  const [formData, setFormData] = useState<FounderSetupData>({
    founders: [
      {
        name: '',
        email: '',
        role: 'CEO',
        shares: 4000000,
        vestingStartDate: new Date().toISOString().split('T')[0],
        vestingCliff: 12, // 1 year cliff
        vestingPeriod: 48 // 4 year vesting
      }
    ]
  });

  const [errors, setErrors] = useState<string[]>([]);

  const addFounder = () => {
    const totalCurrentShares = formData.founders.reduce((sum, f) => sum + f.shares, 0);
    const remainingShares = Math.max(0, 8000000 - totalCurrentShares); // Assume 8M total founder shares
    
    setFormData(prev => ({
      founders: [
        ...prev.founders,
        {
          name: '',
          email: '',
          role: 'CTO',
          shares: Math.min(remainingShares, 2000000),
          vestingStartDate: new Date().toISOString().split('T')[0],
          vestingCliff: 12,
          vestingPeriod: 48
        }
      ]
    }));
  };

  const removeFounder = (index: number) => {
    if (formData.founders.length > 1) {
      setFormData(prev => ({
        founders: prev.founders.filter((_, i) => i !== index)
      }));
    }
  };

  const updateFounder = (index: number, field: keyof FounderSetupData['founders'][0], value: any) => {
    setFormData(prev => ({
      founders: prev.founders.map((founder, i) => 
        i === index ? { ...founder, [field]: value } : founder
      )
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    formData.founders.forEach((founder, index) => {
      if (!founder.name.trim()) {
        newErrors.push(`Founder ${index + 1}: Name is required`);
      }
      if (!founder.email.trim()) {
        newErrors.push(`Founder ${index + 1}: Email is required`);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(founder.email)) {
        newErrors.push(`Founder ${index + 1}: Invalid email format`);
      }
      if (founder.shares <= 0) {
        newErrors.push(`Founder ${index + 1}: Shares must be greater than 0`);
      }
      if (founder.vestingCliff < 0 || founder.vestingCliff > founder.vestingPeriod) {
        newErrors.push(`Founder ${index + 1}: Invalid vesting cliff`);
      }
      if (founder.vestingPeriod <= 0) {
        newErrors.push(`Founder ${index + 1}: Vesting period must be greater than 0`);
      }
    });

    // Check for duplicate emails
    const emails = formData.founders.map(f => f.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      newErrors.push('Duplicate email addresses are not allowed');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      localStorage.setItem('onboarding_founders_setup', JSON.stringify(formData));
      onNext();
    }
  };

  const totalShares = formData.founders.reduce((sum, founder) => sum + founder.shares, 0);

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Founder Information</h3>
        <p className="text-sm text-gray-600">
          Add all company founders and their initial equity allocation.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {formData.founders.map((founder, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">
                Founder {index + 1}
              </h4>
              {formData.founders.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFounder(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={founder.name}
                  onChange={(e) => updateFounder(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={founder.email}
                  onChange={(e) => updateFounder(index, 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={founder.role}
                  onChange={(e) => updateFounder(index, 'role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {FOUNDER_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shares *
                </label>
                <input
                  type="number"
                  value={founder.shares}
                  onChange={(e) => updateFounder(index, 'shares', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {((founder.shares / 8000000) * 100).toFixed(2)}% of founder pool
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vesting Start Date
                </label>
                <input
                  type="date"
                  value={founder.vestingStartDate}
                  onChange={(e) => updateFounder(index, 'vestingStartDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliff (months)
                  </label>
                  <input
                    type="number"
                    value={founder.vestingCliff}
                    onChange={(e) => updateFounder(index, 'vestingCliff', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    max="48"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period (months)
                  </label>
                  <input
                    type="number"
                    value={founder.vestingPeriod}
                    onChange={(e) => updateFounder(index, 'vestingPeriod', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="1"
                    max="60"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={addFounder}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Another Founder</span>
          </button>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Founders:</span>
              <span className="ml-2 font-medium">{formData.founders.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Shares:</span>
              <span className="ml-2 font-medium">{totalShares.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="mb-1"><strong>Standard vesting terms:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>4-year vesting with 1-year cliff</li>
                <li>Monthly vesting after cliff</li>
                <li>Acceleration provisions for certain events</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}