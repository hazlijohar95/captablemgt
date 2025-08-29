import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { capTableService } from '@/services/capTableService';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useCSRFForm } from '@/hooks/useCSRFProtection';
import { Button } from '@/components/ui';
import { STAKEHOLDER_TYPES } from '@/constants';

interface IAddStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface IStakeholderFormData {
  type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
  name: string;
  email: string;
  phone: string;
  entityName: string;
  taxId: string;
}

const initialFormData: IStakeholderFormData = {
  type: STAKEHOLDER_TYPES.EMPLOYEE,
  name: '',
  email: '',
  phone: '',
  entityName: '',
  taxId: '',
};

export function AddStakeholderModal({ isOpen, onClose, onSuccess }: IAddStakeholderModalProps): React.JSX.Element {
  const { loading, error, execute, reset: resetAsync } = useAsyncOperation();
  const { companyId } = useCompanyContext();
  const csrf = useCSRFForm();
  
  const [data, setData] = useState<IStakeholderFormData>(initialFormData);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const setFieldValue = (field: keyof IStakeholderFormData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when field is changed
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const setFieldTouched = (field: keyof IStakeholderFormData, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  };

  const reset = () => {
    setData(initialFormData);
    setTouched({});
    setValidationErrors({});
  };

  const validateFormData = () => {
    const errors: Record<string, string> = {};
    
    // Type validation
    if (!data.type) {
      errors.type = 'Please select a stakeholder type';
    }

    if (data.type === 'ENTITY') {
      // Entity validation
      if (!data.entityName.trim()) {
        errors.entityName = 'Entity name is required';
      } else if (data.entityName.trim().length < 2) {
        errors.entityName = 'Entity name must be at least 2 characters';
      }
    } else {
      // Individual validation
      if (!data.name.trim()) {
        errors.name = 'Name is required';
      } else if (data.name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters';
      }

      if (!data.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Please enter a valid email address';
      }

      // Phone is optional, but if provided must be valid
      if (data.phone.trim() && !/^[\+]?[1-9][\d]{0,15}$/.test(data.phone.replace(/[\s\-\(\)\.]/g, ''))) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    setValidationErrors(errors);
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateFormData();
    if (Object.keys(errors).length > 0) {
      // Mark all fields as touched to show errors
      Object.keys(data).forEach(field => setFieldTouched(field as keyof IStakeholderFormData));
      return;
    }

    try {
      await execute(async () => {
        // Prepare form data with CSRF protection
        const secureFormData = await csrf.prepareSubmission(data, companyId);
        
        if (data.type === 'ENTITY') {
          // Create entity stakeholder
          return await capTableService.createStakeholder({
            companyId,
            entityName: data.entityName,
            type: data.type,
            taxId: data.taxId || undefined,
            csrfToken: secureFormData.csrfToken,
          });
        } else {
          // Create person first, then stakeholder
          const person = await capTableService.createPerson({
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            csrfToken: secureFormData.csrfToken,
          });

          return await capTableService.createStakeholder({
            companyId,
            personId: person.id,
            type: data.type,
            taxId: data.taxId || undefined,
            csrfToken: secureFormData.csrfToken,
          });
        }
      });

      // Reset form and close modal
      reset();
      resetAsync();
      onSuccess();
      onClose();
    } catch (err) {
      // Error is already handled by useAsyncOperation
    }
  };

  const handleInputChange = (field: keyof IStakeholderFormData, value: string) => {
    setFieldValue(field, value);
  };

  const handleInputBlur = (field: keyof IStakeholderFormData) => {
    setFieldTouched(field);
  };

  const getFieldError = (field: keyof IStakeholderFormData): string | undefined => {
    if (!touched[field as string]) return undefined;
    return validationErrors[field as string];
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset();
      resetAsync();
    }
  }, [isOpen, resetAsync]);

  if (!isOpen) return <></>;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                Add New Stakeholder
              </h3>
              
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type *</label>
                  <select
                    value={data.type}
                    onChange={(e) => handleInputChange('type', e.target.value as any)}
                    onBlur={() => handleInputBlur('type')}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-primary-500 sm:text-sm ${
                      getFieldError('type')
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-300 focus:border-primary-500'
                    }`}
                    required
                  >
                    <option value={STAKEHOLDER_TYPES.EMPLOYEE}>Employee</option>
                    <option value={STAKEHOLDER_TYPES.FOUNDER}>Founder</option>
                    <option value={STAKEHOLDER_TYPES.INVESTOR}>Investor</option>
                    <option value={STAKEHOLDER_TYPES.ENTITY}>Entity</option>
                  </select>
                  {getFieldError('type') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('type')}</p>
                  )}
                </div>

                {/* Conditional Fields */}
                {data.type === 'ENTITY' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Entity Name *</label>
                    <input
                      type="text"
                      value={data.entityName}
                      onChange={(e) => handleInputChange('entityName', e.target.value)}
                      onBlur={() => handleInputBlur('entityName')}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-primary-500 sm:text-sm ${
                        getFieldError('entityName')
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-gray-300 focus:border-primary-500'
                      }`}
                      placeholder="Enter entity name"
                      required
                    />
                    {getFieldError('entityName') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('entityName')}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                      <input
                        type="text"
                        value={data.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        onBlur={() => handleInputBlur('name')}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-primary-500 sm:text-sm ${
                          getFieldError('name')
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-300 focus:border-primary-500'
                        }`}
                        placeholder="Enter full name"
                        required
                      />
                      {getFieldError('name') && (
                        <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email *</label>
                      <input
                        type="email"
                        value={data.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        onBlur={() => handleInputBlur('email')}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-primary-500 sm:text-sm ${
                          getFieldError('email')
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-300 focus:border-primary-500'
                        }`}
                        placeholder="Enter email address"
                        required
                      />
                      {getFieldError('email') && (
                        <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        value={data.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        onBlur={() => handleInputBlur('phone')}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-primary-500 sm:text-sm ${
                          getFieldError('phone')
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-300 focus:border-primary-500'
                        }`}
                        placeholder="Enter phone number (optional)"
                      />
                      {getFieldError('phone') && (
                        <p className="mt-1 text-sm text-red-600">{getFieldError('phone')}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Tax ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                  <input
                    type="text"
                    value={data.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    onBlur={() => handleInputBlur('taxId')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="SSN, EIN, etc. (optional)"
                  />
                </div>

                {/* Error Display */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-800">
                      {error}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    disabled={loading || !csrf.isReady}
                  >
                    Create Stakeholder
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}