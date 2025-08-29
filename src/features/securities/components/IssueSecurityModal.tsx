import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { capTableService } from '@/services/capTableService';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useCSRFForm } from '@/hooks/useCSRFProtection';
import { Button } from '@/components/ui';

interface IIssueSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stakeholderId?: string;
  stakeholderName?: string;
}

type SecurityType = 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE';

interface IShareClass {
  id: string;
  name: string;
  type: 'COMMON' | 'PREFERRED';
  authorized: number;
  par_value: string;
}

interface IFormData {
  stakeholderId: string;
  type: SecurityType;
  classId: string;
  quantity: string;
  strikePrice: string;
  issuedAt: string;
  vestingSchedule: string;
  cliffMonths: string;
  vestingMonths: string;
}

export function IssueSecurityModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  stakeholderId,
  stakeholderName 
}: IIssueSecurityModalProps) {
  const { companyId } = useCompanyContext();
  const { loading, error, execute, reset } = useAsyncOperation();
  const csrf = useCSRFForm();
  const [shareClasses, setShareClasses] = useState<IShareClass[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState<IFormData>({
    stakeholderId: stakeholderId || '',
    type: 'EQUITY' as SecurityType,
    classId: '',
    quantity: '',
    strikePrice: '',
    issuedAt: new Date().toISOString().split('T')[0],
    vestingSchedule: 'none',
    cliffMonths: '12',
    vestingMonths: '48',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Form validation
  const validateField = (field: keyof IFormData, value: string): string | null => {
    switch (field) {
      case 'stakeholderId':
        return !value ? 'Please select a stakeholder' : null;
      case 'type':
        return !value ? 'Please select a security type' : null;
      case 'classId':
        return formData.type === 'EQUITY' && !value ? 'Please select a share class' : null;
      case 'quantity':
        if (!value) return 'Quantity is required';
        const quantity = parseInt(value);
        if (isNaN(quantity) || quantity <= 0) return 'Quantity must be a positive number';
        return null;
      case 'strikePrice':
        if (formData.type === 'OPTION') {
          if (!value) return 'Strike price is required for options';
          const price = parseFloat(value);
          if (isNaN(price) || price <= 0) return 'Strike price must be a positive number';
        }
        return null;
      case 'issuedAt':
        return !value ? 'Issue date is required' : null;
      default:
        return null;
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof IFormData>).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  const handleInputChange = (field: keyof IFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleInputBlur = (field: keyof IFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const error = validateField(field, formData[field]);
    if (error) {
      setFormErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  useEffect(() => {
    if (isOpen && companyId) {
      loadData();
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    if (stakeholderId) {
      setFormData(prev => ({ ...prev, stakeholderId }));
    }
  }, [stakeholderId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        stakeholderId: stakeholderId || '',
        type: 'EQUITY' as SecurityType,
        classId: '',
        quantity: '',
        strikePrice: '',
        issuedAt: new Date().toISOString().split('T')[0],
        vestingSchedule: 'none',
        cliffMonths: '12',
        vestingMonths: '48',
      });
      setFormErrors({});
      setTouched({});
      reset();
    }
  }, [isOpen, stakeholderId, reset]);

  const loadData = async () => {
    if (!companyId) return;
    
    setLoadingData(true);
    try {
      const [classesResult, stakeholdersResult] = await Promise.all([
        capTableService.getShareClassesWithResult(companyId),
        capTableService.getStakeholdersWithResult(companyId)
      ]);

      if (classesResult.success) {
        setShareClasses(classesResult.data || []);
      }
      if (stakeholdersResult.success) {
        setStakeholders(stakeholdersResult.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !companyId) {
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(formData).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      return;
    }

    try {
      await execute(async () => {
        // Prepare form data with CSRF protection
        const secureFormData = await csrf.prepareSubmission(formData, companyId);
        
        // Create vesting schedule if needed
        let vestingScheduleId = null;
        if (formData.vestingSchedule !== 'none' && (formData.type === 'OPTION' || formData.type === 'RSU')) {
          const vestingResult = await capTableService.createVestingSchedule({
            startDate: formData.issuedAt,
            cliffMonths: parseInt(formData.cliffMonths),
            durationMonths: parseInt(formData.vestingMonths),
            frequency: 'MONTHLY'
          });
          
          if (vestingResult.success && vestingResult.data) {
            vestingScheduleId = vestingResult.data.id;
          }
        }

        // Prepare security terms based on type
        const terms: any = {};
        if (formData.type === 'OPTION') {
          terms.strikePrice = formData.strikePrice;
          terms.expirationDate = new Date(
            new Date(formData.issuedAt).getTime() + 10 * 365 * 24 * 60 * 60 * 1000
          ).toISOString(); // 10 years from issue date
        }

        // Issue the security with CSRF protection
        const result = await capTableService.issueSecurityWithResult({
          companyId: companyId,
          stakeholderId: formData.stakeholderId,
          classId: formData.type === 'EQUITY' ? formData.classId : undefined,
          type: formData.type,
          quantity: parseInt(formData.quantity),
          issuedAt: formData.issuedAt,
          terms: Object.keys(terms).length > 0 ? terms : undefined,
          csrfToken: secureFormData.csrfToken,
        });

        if (result.success) {
          // If it's an option with vesting, create a grant record
          if (formData.type === 'OPTION' && vestingScheduleId && terms.strikePrice) {
            await capTableService.createGrant({
              securityId: result.data.id,
              strikePrice: terms.strikePrice,
              vestingScheduleId: vestingScheduleId,
              grantDate: formData.issuedAt,
            });
          }

          // Create transaction record for audit trail with CSRF protection
          await capTableService.createTransaction({
            companyId: companyId,
            kind: 'ISSUE',
            effectiveAt: formData.issuedAt,
            payload: {
              securityId: result.data.id,
              stakeholderId: formData.stakeholderId,
              type: formData.type,
              quantity: parseInt(formData.quantity),
              classId: formData.classId || null,
              terms
            },
            csrfToken: secureFormData.csrfToken
          });

          return result.data;
        } else {
          throw new Error(result.error?.message || 'Failed to issue security');
        }
      });

      // Success - reset form and close modal
      setFormData({
        stakeholderId: stakeholderId || '',
        type: 'EQUITY' as SecurityType,
        classId: '',
        quantity: '',
        strikePrice: '',
        issuedAt: new Date().toISOString().split('T')[0],
        vestingSchedule: 'none',
        cliffMonths: '12',
        vestingMonths: '48',
      });
      setFormErrors({});
      setTouched({});
      onSuccess();
      onClose();
    } catch (err) {
      // Error is already handled by useAsyncOperation
      console.error('Error issuing security:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                Issue Securities
              </h3>
              
              {loadingData ? (
                <div className="mt-4 text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading data...</p>
                </div>
              ) : (
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
                  
                  {/* Stakeholder Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Stakeholder
                    </label>
                    {stakeholderName ? (
                      <p className="mt-1 text-sm text-gray-900 font-medium">{stakeholderName}</p>
                    ) : (
                      <select
                        name="stakeholderId"
                        value={formData.stakeholderId}
                        onChange={(e) => handleInputChange('stakeholderId', e.target.value)}
                        onBlur={() => handleInputBlur('stakeholderId')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      >
                        <option value="">Select a stakeholder</option>
                        {stakeholders.map((stakeholder) => (
                          <option key={stakeholder.id} value={stakeholder.id}>
                            {stakeholder.people?.name || stakeholder.entity_name || 'Unknown'}
                          </option>
                        ))}
                      </select>
                    )}
                    {touched.stakeholderId && formErrors.stakeholderId && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.stakeholderId}</p>
                    )}
                  </div>

                  {/* Security Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Security Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      onBlur={() => handleInputBlur('type')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      required
                    >
                      <option value="EQUITY">Equity (Shares)</option>
                      <option value="OPTION">Stock Options</option>
                      <option value="RSU">Restricted Stock Units (RSUs)</option>
                      <option value="WARRANT">Warrants</option>
                      <option value="SAFE">SAFE</option>
                      <option value="NOTE">Convertible Note</option>
                    </select>
                  </div>

                  {/* Share Class (for Equity) */}
                  {formData.type === 'EQUITY' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Share Class
                      </label>
                      <select
                        name="classId"
                        value={formData.classId}
                        onChange={(e) => handleInputChange('classId', e.target.value)}
                        onBlur={() => handleInputBlur('classId')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      >
                        <option value="">Select share class</option>
                        {shareClasses.map((shareClass) => (
                          <option key={shareClass.id} value={shareClass.id}>
                            {shareClass.name} ({shareClass.type})
                          </option>
                        ))}
                      </select>
                      {touched.classId && formErrors.classId && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.classId}</p>
                      )}
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', e.target.value)}
                      onBlur={() => handleInputBlur('quantity')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Number of shares/units"
                      required
                      min="1"
                    />
                    {touched.quantity && formErrors.quantity && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.quantity}</p>
                    )}
                  </div>

                  {/* Strike Price (for Options) */}
                  {formData.type === 'OPTION' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Strike Price ($)
                      </label>
                      <input
                        type="number"
                        name="strikePrice"
                        value={formData.strikePrice}
                        onChange={(e) => handleInputChange('strikePrice', e.target.value)}
                        onBlur={() => handleInputBlur('strikePrice')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="0.00"
                        required
                        min="0.01"
                        step="0.01"
                      />
                      {touched.strikePrice && formErrors.strikePrice && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.strikePrice}</p>
                      )}
                    </div>
                  )}

                  {/* Issue Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      name="issuedAt"
                      value={formData.issuedAt}
                      onChange={(e) => handleInputChange('issuedAt', e.target.value)}
                      onBlur={() => handleInputBlur('issuedAt')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      required
                    />
                  </div>

                  {/* Vesting Schedule (for Options/RSUs) */}
                  {(formData.type === 'OPTION' || formData.type === 'RSU') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Vesting Schedule
                        </label>
                        <select
                          name="vestingSchedule"
                          value={formData.vestingSchedule}
                          onChange={(e) => handleInputChange('vestingSchedule', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                          <option value="none">No Vesting</option>
                          <option value="standard">Standard (4 years, 1 year cliff)</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      {formData.vestingSchedule !== 'none' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Cliff (months)
                            </label>
                            <input
                              type="number"
                              name="cliffMonths"
                              value={formData.cliffMonths}
                              onChange={(e) => handleInputChange('cliffMonths', e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Total Vesting (months)
                            </label>
                            <input
                              type="number"
                              name="vestingMonths"
                              value={formData.vestingMonths}
                              onChange={(e) => handleInputChange('vestingMonths', e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              min="1"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

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
                      variant="primary"
                      disabled={loading || !csrf.isReady}
                      loading={loading}
                    >
                      Issue Security
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}