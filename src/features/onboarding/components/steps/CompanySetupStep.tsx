import { useState } from 'react';
import { OnboardingStepProps, CompanySetupData } from '../../types';
import { capTableService } from '@/services/capTableService';
import { useAuth } from '@/features/auth/AuthContext';

export function CompanySetupStep({ onNext }: OnboardingStepProps) {
  const { user, userProfile } = useAuth();
  const [formData, setFormData] = useState<CompanySetupData>({
    companyName: '',
    incorporationDate: new Date().toISOString().split('T')[0], // Today's date
    incorporationState: 'Delaware',
    totalAuthorizedShares: 10000000,
    parValue: 0.0001,
    shareClasses: [
      {
        name: 'Common Stock',
        shares: 10000000,
        pricePerShare: 0.0001
      }
    ]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user || !userProfile) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the company using the service
      const company = await capTableService.createCompany({
        name: formData.companyName.trim(),
        incorporationDate: formData.incorporationDate,
        jurisdiction: formData.incorporationState,
        userId: user.id,
        userEmail: userProfile.email,
        userName: userProfile.name,
      });

      // Save company info for completion step
      localStorage.setItem('onboarding_company_created', JSON.stringify({
        id: company.id,
        name: company.name
      }));

      onNext();
    } catch (error) {
      console.error('Failed to create company:', error);
      setErrors({ 
        companyName: error instanceof Error ? error.message : 'Failed to create company'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your Company</h3>
          <p className="text-gray-600">We'll set up the rest with smart defaults. You can customize everything later.</p>
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            id="companyName"
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
            placeholder="Enter your company name"
            autoFocus
          />
          {errors.companyName && (
            <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">We'll set up for you:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Delaware incorporation (industry standard)</li>
            <li>• 10M authorized shares at $0.0001 par value</li>
            <li>• Common stock structure</li>
            <li>• You as the founder with full ownership</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">You can customize all these settings later in your dashboard.</p>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting || !formData.companyName.trim()}
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSubmitting ? 'Creating Company...' : 'Create Company'}
        </button>
      </div>
    </form>
  );
}