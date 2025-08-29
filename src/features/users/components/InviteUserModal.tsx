import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { UserRole, roleDescriptions, rolePermissions } from '../types';
import { useCSRFForm } from '@/hooks/useCSRFProtection';
import { useCompanyContext } from '@/hooks/useCompanyContext';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InviteFormData {
  email: string;
  role: UserRole;
  message: string;
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const { companyId } = useCompanyContext();
  const csrf = useCSRFForm();
  
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    role: 'viewer',
    message: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<InviteFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<InviteFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Prepare form data with CSRF protection
      const secureFormData = await csrf.prepareSubmission(formData, companyId);
      
      // Simulate API call with CSRF protection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Inviting user with CSRF protection:', secureFormData);
      onClose();
      
      // Show success message (in real app, use toast notification)
      alert(`Invitation sent to ${formData.email}!`);
    } catch (error) {
      console.error('Error inviting user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof InviteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const selectedRolePermissions = rolePermissions[formData.role];

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
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Invite Team Member
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    {/* CSRF Protection Status */}
                    {!csrf.isReady && (
                      <div className="rounded-md bg-yellow-50 p-3">
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                          <p className="text-sm text-yellow-800">Initializing security protection...</p>
                        </div>
                      </div>
                    )}
                    
                    {csrf.hasError && (
                      <div className="rounded-md bg-red-50 p-3">
                        <p className="text-sm text-red-800">Security protection error: {csrf.error}</p>
                        <button
                          type="button"
                          onClick={csrf.refreshToken}
                          className="mt-1 text-sm text-red-600 hover:text-red-800 underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="colleague@company.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Role & Permissions *
                      </label>
                      <div className="space-y-3">
                        {(['owner', 'admin', 'editor', 'viewer'] as UserRole[]).map((role) => (
                          <div key={role} className="relative">
                            <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="radio"
                                name="role"
                                value={role}
                                checked={formData.role === role}
                                onChange={(e) => handleInputChange('role', e.target.value)}
                                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 capitalize">
                                    {role}
                                  </span>
                                  {role === 'owner' && (
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                      Full Access
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {roleDescriptions[role]}
                                </p>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Role Permissions Preview */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} Permissions
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className={`flex items-center ${selectedRolePermissions.canViewCapTable ? 'text-green-700' : 'text-gray-400'}`}>
                          <span className="mr-2">{selectedRolePermissions.canViewCapTable ? '✓' : '✗'}</span>
                          View Cap Table
                        </div>
                        <div className={`flex items-center ${selectedRolePermissions.canEditCapTable ? 'text-green-700' : 'text-gray-400'}`}>
                          <span className="mr-2">{selectedRolePermissions.canEditCapTable ? '✓' : '✗'}</span>
                          Edit Cap Table
                        </div>
                        <div className={`flex items-center ${selectedRolePermissions.canIssueGrants ? 'text-green-700' : 'text-gray-400'}`}>
                          <span className="mr-2">{selectedRolePermissions.canIssueGrants ? '✓' : '✗'}</span>
                          Issue Grants
                        </div>
                        <div className={`flex items-center ${selectedRolePermissions.canManageUsers ? 'text-green-700' : 'text-gray-400'}`}>
                          <span className="mr-2">{selectedRolePermissions.canManageUsers ? '✓' : '✗'}</span>
                          Manage Users
                        </div>
                        <div className={`flex items-center ${selectedRolePermissions.canRunScenarios ? 'text-green-700' : 'text-gray-400'}`}>
                          <span className="mr-2">{selectedRolePermissions.canRunScenarios ? '✓' : '✗'}</span>
                          Run Scenarios
                        </div>
                        <div className={`flex items-center ${selectedRolePermissions.canExportData ? 'text-green-700' : 'text-gray-400'}`}>
                          <span className="mr-2">{selectedRolePermissions.canExportData ? '✓' : '✗'}</span>
                          Export Data
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Personal Message (Optional)
                      </label>
                      <textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        rows={3}
                        placeholder="Welcome to the team! Looking forward to working with you."
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-700">
                          <p className="mb-1"><strong>What happens next:</strong></p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>An invitation email will be sent to the recipient</li>
                            <li>They'll have 7 days to accept the invitation</li>
                            <li>Once accepted, they'll have immediate access based on their role</li>
                            <li>You can modify their permissions or remove access anytime</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading || !csrf.isReady}
                      className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                    >
                      {isLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      <span>{isLoading ? 'Sending Invitation...' : 'Send Invitation'}</span>
                    </button>
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