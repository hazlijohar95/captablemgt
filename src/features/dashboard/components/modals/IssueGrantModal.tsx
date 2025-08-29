import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface IssueGrantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GrantFormData {
  grantType: 'option' | 'restricted' | 'common';
  recipient: {
    name: string;
    email: string;
    role: string;
  };
  shares: number;
  pricePerShare: number;
  vestingSchedule: {
    startDate: string;
    cliffMonths: number;
    vestingPeriodMonths: number;
  };
  notes: string;
}

export function IssueGrantModal({ isOpen, onClose }: IssueGrantModalProps) {
  const [formData, setFormData] = useState<GrantFormData>({
    grantType: 'option',
    recipient: {
      name: '',
      email: '',
      role: ''
    },
    shares: 0,
    pricePerShare: 0.0001,
    vestingSchedule: {
      startDate: new Date().toISOString().split('T')[0],
      cliffMonths: 12,
      vestingPeriodMonths: 48
    },
    notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'details' | 'vesting' | 'review'>('details');

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as object,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would make the actual API call to create the grant
      console.log('Creating grant:', formData);
      
      onClose();
      // Show success message or redirect
    } catch (error) {
      console.error('Error creating grant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grant Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['option', 'restricted', 'common'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleInputChange('grantType', type)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formData.grantType === type
                        ? 'bg-primary-50 border-primary-200 text-primary-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={formData.recipient.name}
                  onChange={(e) => handleInputChange('recipient.name', e.target.value)}
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
                  value={formData.recipient.email}
                  onChange={(e) => handleInputChange('recipient.email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role/Title
              </label>
              <input
                type="text"
                value={formData.recipient.role}
                onChange={(e) => handleInputChange('recipient.role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Software Engineer"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Shares *
                </label>
                <input
                  type="number"
                  value={formData.shares}
                  onChange={(e) => handleInputChange('shares', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                  placeholder="25000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.grantType === 'option' ? 'Exercise Price' : 'Price per Share'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.pricePerShare}
                    onChange={(e) => handleInputChange('pricePerShare', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    step="0.0001"
                    min="0"
                    placeholder="0.0001"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'vesting':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Vesting Schedule</h3>
              <p className="text-sm text-gray-600 mb-4">
                Define when the recipient will earn their shares over time.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vesting Start Date
              </label>
              <input
                type="date"
                value={formData.vestingSchedule.startDate}
                onChange={(e) => handleInputChange('vestingSchedule.startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliff Period (months)
                </label>
                <select
                  value={formData.vestingSchedule.cliffMonths}
                  onChange={(e) => handleInputChange('vestingSchedule.cliffMonths', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={0}>No cliff</option>
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                  <option value={18}>18 months</option>
                  <option value={24}>24 months</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum time before any vesting occurs
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Vesting Period (months)
                </label>
                <select
                  value={formData.vestingSchedule.vestingPeriodMonths}
                  onChange={(e) => handleInputChange('vestingSchedule.vestingPeriodMonths', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={36}>36 months (3 years)</option>
                  <option value={48}>48 months (4 years)</option>
                  <option value={60}>60 months (5 years)</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="mb-1"><strong>Vesting Preview:</strong></p>
                  <ul className="space-y-1 text-xs">
                    <li>• Cliff: {formData.shares.toLocaleString()} shares after {formData.vestingSchedule.cliffMonths} months</li>
                    <li>• Monthly: {Math.floor(formData.shares / formData.vestingSchedule.vestingPeriodMonths).toLocaleString()} shares per month</li>
                    <li>• Full vesting: {formData.vestingSchedule.vestingPeriodMonths} months from start date</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Review Grant Details</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please review all information before creating the grant.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Grant Type:</span>
                <span className="text-sm font-medium">{formData.grantType.charAt(0).toUpperCase() + formData.grantType.slice(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Recipient:</span>
                <span className="text-sm font-medium">{formData.recipient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email:</span>
                <span className="text-sm font-medium">{formData.recipient.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Shares:</span>
                <span className="text-sm font-medium">{formData.shares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Price per Share:</span>
                <span className="text-sm font-medium">${formData.pricePerShare}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Vesting:</span>
                <span className="text-sm font-medium">
                  {formData.vestingSchedule.vestingPeriodMonths}mo, {formData.vestingSchedule.cliffMonths}mo cliff
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Any additional notes about this grant..."
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Issue New Grant
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Progress indicator */}
                <div className="mb-6">
                  <div className="flex items-center">
                    {['details', 'vesting', 'review'].map((step, index) => (
                      <div key={step} className="flex items-center">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                            currentStep === step
                              ? 'border-primary-500 bg-primary-500 text-white'
                              : 'border-gray-300 bg-white text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </div>
                        {index < 2 && (
                          <div className="w-12 h-px bg-gray-300 mx-2" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">Grant Details</span>
                    <span className="text-xs text-gray-500">Vesting</span>
                    <span className="text-xs text-gray-500">Review</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {renderStepContent()}

                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStep === 'vesting') setCurrentStep('details');
                        else if (currentStep === 'review') setCurrentStep('vesting');
                      }}
                      className={`px-4 py-2 text-sm text-gray-600 hover:text-gray-800 ${
                        currentStep === 'details' ? 'invisible' : ''
                      }`}
                    >
                      Back
                    </button>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      
                      {currentStep === 'review' ? (
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {isLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          )}
                          <span>{isLoading ? 'Creating Grant...' : 'Create Grant'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (currentStep === 'details') setCurrentStep('vesting');
                            else if (currentStep === 'vesting') setCurrentStep('review');
                          }}
                          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                        >
                          Continue
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}