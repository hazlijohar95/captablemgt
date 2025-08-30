import React, { useState, useEffect } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { format, addYears } from 'date-fns';
import { issuanceService } from '../services/issuanceService';
import { CSRFService } from '@/services/csrfService';
import {
  ISecurityIssuanceForm,
  ISecurityIssuanceValidation,
  IIssuancePreview,
  ISecurityIssuanceResult,
  ISSUANCE_STEPS,
  SECURITY_TYPE_CONFIGS,
  DEFAULT_VESTING_SCHEDULES,
  IIssuanceStep
} from '../types/issuance.types';

interface ISecuritiesIssuanceWizardProps {
  companyId: string;
  onComplete?: (result: ISecurityIssuanceResult) => void;
  onCancel?: () => void;
  initialStakeholderId?: string;
}

export const SecuritiesIssuanceWizard: React.FC<ISecuritiesIssuanceWizardProps> = ({
  companyId,
  onComplete,
  onCancel,
  initialStakeholderId
}) => {
  // State management
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<IIssuanceStep[]>([...ISSUANCE_STEPS]);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');

  // Form data
  const [formData, setFormData] = useState<ISecurityIssuanceForm>({
    type: 'OPTION',
    quantity: 0,
    grantDate: format(new Date(), 'yyyy-MM-dd'),
    vestingStartDate: format(new Date(), 'yyyy-MM-dd'),
    cliffMonths: 12,
    durationMonths: 48,
    frequency: 'MONTHLY',
    stakeholderId: initialStakeholderId || '',
  });

  // Validation and preview
  const [validation, setValidation] = useState<ISecurityIssuanceValidation | null>(null);
  const [preview, setPreview] = useState<IIssuancePreview | null>(null);
  const [result, setResult] = useState<ISecurityIssuanceResult | null>(null);

  // Reference data
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [shareClasses, setShareClasses] = useState<any[]>([]);
  const [recommendedStrikePrice, setRecommendedStrikePrice] = useState<string>('');

  // Initialize CSRF token and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Get CSRF token
        const token = await CSRFService.getToken();
        setCsrfToken(token);

        // Load stakeholders and share classes
        const [stakeholdersData, shareClassesData, strikePriceData] = await Promise.all([
          issuanceService.getStakeholders(companyId),
          issuanceService.getShareClasses(companyId),
          issuanceService.getRecommendedStrikePrice(companyId)
        ]);

        setStakeholders(stakeholdersData);
        setShareClasses(shareClassesData);
        setRecommendedStrikePrice(strikePriceData.recommendedPrice);

        // Set default share class
        if (shareClassesData.length > 0) {
          const commonStock = shareClassesData.find(sc => sc.type === 'COMMON') || shareClassesData[0];
          setFormData(prev => ({ ...prev, shareClassId: commonStock.id }));
        }

        // Set default strike price
        if (strikePriceData.recommendedPrice !== '0') {
          setFormData(prev => ({ ...prev, strikePrice: strikePriceData.recommendedPrice }));
        }

      } catch (error) {
        console.error('Failed to initialize wizard:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [companyId]);

  // Validate current step
  useEffect(() => {
    const validateCurrentStep = async () => {
      if (currentStepIndex >= 4) { // Review step
        try {
          const [validationResult, previewResult] = await Promise.all([
            issuanceService.validateIssuance(companyId, formData),
            issuanceService.generateIssuancePreview(companyId, formData)
          ]);
          
          setValidation(validationResult);
          setPreview(previewResult);
        } catch (error) {
          console.error('Validation failed:', error);
        }
      }
    };

    if (formData.stakeholderId && formData.quantity > 0) {
      validateCurrentStep();
    }
  }, [companyId, formData, currentStepIndex]);

  const updateFormData = (updates: Partial<ISecurityIssuanceForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateStepCompletion = (stepIndex: number, completed: boolean) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, completed } : step
    ));
  };

  const goToStep = (stepIndex: number) => {
    setSteps(prev => prev.map((step, index) => ({
      ...step,
      current: index === stepIndex
    })));
    setCurrentStepIndex(stepIndex);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      updateStepCompletion(currentStepIndex, true);
      goToStep(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validation?.isValid) {
      return;
    }

    try {
      setLoading(true);
      const issuanceResult = await issuanceService.issueSecurity(companyId, formData, csrfToken);
      
      setResult(issuanceResult);
      
      if (issuanceResult.success) {
        updateStepCompletion(currentStepIndex, true);
        onComplete?.(issuanceResult);
      }
    } catch (error) {
      console.error('Issuance failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyVestingTemplate = (template: keyof typeof DEFAULT_VESTING_SCHEDULES) => {
    const vestingTemplate = DEFAULT_VESTING_SCHEDULES[template];
    updateFormData({
      cliffMonths: vestingTemplate.cliffMonths,
      durationMonths: vestingTemplate.durationMonths,
      frequency: vestingTemplate.frequency
    });
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, stepIndex) => (
            <li key={step.id} className={`relative ${stepIndex !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
              <div className="flex items-center">
                <div 
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                    step.completed 
                      ? 'bg-green-600' 
                      : step.current 
                        ? 'border-2 border-blue-600 bg-white' 
                        : 'border-2 border-gray-300 bg-white'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  ) : (
                    <span className={`text-sm font-medium ${
                      step.current ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {stepIndex + 1}
                    </span>
                  )}
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className={`text-sm font-medium ${
                    step.current ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {stepIndex !== steps.length - 1 && (
                <div className="absolute top-4 right-0 hidden h-0.5 w-8 bg-gray-200 sm:block sm:w-20">
                  <div 
                    className={`h-full ${step.completed ? 'bg-green-600' : 'bg-gray-200'}`}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );

  const renderStakeholderSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Select Stakeholder</h3>
        <p className="text-sm text-gray-500">Choose who will receive this security</p>
      </div>

      <div className="space-y-4">
        {stakeholders.map((stakeholder) => (
          <div 
            key={stakeholder.id}
            className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
              formData.stakeholderId === stakeholder.id
                ? 'border-blue-500 ring-2 ring-blue-500'
                : 'border-gray-300'
            }`}
            onClick={() => updateFormData({ stakeholderId: stakeholder.id })}
          >
            <div className="flex-1">
              <div className="flex items-center">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  checked={formData.stakeholderId === stakeholder.id}
                  readOnly
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">
                    {stakeholder.people?.name || stakeholder.entity_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stakeholder.type} {stakeholder.people?.email && `• ${stakeholder.people.email}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecurityDetails = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security Details</h3>
        <p className="text-sm text-gray-500">Configure the type and quantity of security to issue</p>
      </div>

      {/* Security Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Security Type</label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(SECURITY_TYPE_CONFIGS).map(([type, config]) => (
            <div
              key={type}
              className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                formData.type === type
                  ? 'border-blue-500 ring-2 ring-blue-500'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => updateFormData({ type: type as any })}
            >
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    type="radio"
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    checked={formData.type === type}
                    readOnly
                  />
                  <div className="ml-3">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{config.icon}</span>
                      <p className="font-medium text-gray-900">{config.label}</p>
                    </div>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          Quantity
        </label>
        <input
          type="number"
          id="quantity"
          min="1"
          step="1"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={formData.quantity}
          onChange={(e) => updateFormData({ quantity: parseInt(e.target.value) || 0 })}
        />
      </div>

      {/* Share Class */}
      {(formData.type === 'EQUITY' || formData.type === 'OPTION' || formData.type === 'RSU') && (
        <div>
          <label htmlFor="shareClass" className="block text-sm font-medium text-gray-700">
            Share Class
          </label>
          <select
            id="shareClass"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={formData.shareClassId || ''}
            onChange={(e) => updateFormData({ shareClassId: e.target.value })}
          >
            <option value="">Select a share class</option>
            {shareClasses.map((shareClass) => (
              <option key={shareClass.id} value={shareClass.id}>
                {shareClass.name} ({shareClass.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Grant Date */}
      <div>
        <label htmlFor="grantDate" className="block text-sm font-medium text-gray-700">
          Grant Date
        </label>
        <input
          type="date"
          id="grantDate"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={formData.grantDate}
          onChange={(e) => updateFormData({ grantDate: e.target.value })}
        />
      </div>
    </div>
  );

  const renderPricingTerms = () => {
    const securityConfig = SECURITY_TYPE_CONFIGS[formData.type];
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Pricing & Terms</h3>
          <p className="text-sm text-gray-500">Set pricing and key terms for this security</p>
        </div>

        {/* Strike Price (for options and warrants) */}
        {securityConfig.requiresStrikePrice && (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="strikePrice" className="block text-sm font-medium text-gray-700">
                Strike Price (per share)
              </label>
              {recommendedStrikePrice && (
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => updateFormData({ strikePrice: recommendedStrikePrice })}
                >
                  Use 409A Price: ${(parseInt(recommendedStrikePrice) / 100).toFixed(2)}
                </button>
              )}
            </div>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="strikePrice"
                step="0.01"
                min="0"
                className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.strikePrice ? (parseInt(formData.strikePrice) / 100).toFixed(2) : ''}
                onChange={(e) => {
                  const cents = Math.round(parseFloat(e.target.value || '0') * 100);
                  updateFormData({ strikePrice: cents.toString() });
                }}
              />
            </div>
            {validation?.complianceCheck && (
              <div className="mt-2">
                {!validation.complianceCheck.hasValid409A ? (
                  <div className="flex items-center text-sm text-red-600">
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    No valid 409A valuation found
                  </div>
                ) : !validation.complianceCheck.fmvCompliant ? (
                  <div className="flex items-center text-sm text-red-600">
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Strike price below fair market value
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    409A compliant
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expiration Date (for options and warrants) */}
        {securityConfig.requiresExpiration && (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">
                Expiration Date
              </label>
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={() => {
                  const grantDate = new Date(formData.grantDate);
                  const defaultExpiration = addYears(grantDate, 10);
                  updateFormData({ expirationDate: format(defaultExpiration, 'yyyy-MM-dd') });
                }}
              >
                Set 10-year term
              </button>
            </div>
            <input
              type="date"
              id="expirationDate"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.expirationDate || ''}
              onChange={(e) => updateFormData({ expirationDate: e.target.value })}
            />
          </div>
        )}
      </div>
    );
  };

  const renderVestingSchedule = () => {
    const securityConfig = SECURITY_TYPE_CONFIGS[formData.type];
    
    if (!securityConfig.requiresVesting) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Vesting Schedule</h3>
            <p className="text-sm text-gray-500">This security type does not require a vesting schedule</p>
          </div>
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  {SECURITY_TYPE_CONFIGS[formData.type].label} securities vest immediately upon issuance.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Vesting Schedule</h3>
          <p className="text-sm text-gray-500">Configure when the security will vest</p>
        </div>

        {/* Vesting Templates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Quick Templates</label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries({
              STANDARD_EMPLOYEE: 'Standard Employee (4yr/1yr cliff)',
              FOUNDER: 'Founder (4yr/1yr cliff)', 
              ADVISOR: 'Advisor (2yr/1yr cliff)',
              NO_VESTING: 'No Vesting (Immediate)'
            }).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="text-left p-3 border border-gray-300 rounded-lg hover:border-gray-400 text-sm"
                onClick={() => applyVestingTemplate(key as keyof typeof DEFAULT_VESTING_SCHEDULES)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Vesting Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="vestingStartDate" className="block text-sm font-medium text-gray-700">
              Vesting Start Date
            </label>
            <input
              type="date"
              id="vestingStartDate"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.vestingStartDate}
              onChange={(e) => updateFormData({ vestingStartDate: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
              Vesting Frequency
            </label>
            <select
              id="frequency"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.frequency}
              onChange={(e) => updateFormData({ frequency: e.target.value as any })}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUALLY">Annually</option>
            </select>
          </div>

          <div>
            <label htmlFor="cliffMonths" className="block text-sm font-medium text-gray-700">
              Cliff Period (months)
            </label>
            <input
              type="number"
              id="cliffMonths"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.cliffMonths}
              onChange={(e) => updateFormData({ cliffMonths: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label htmlFor="durationMonths" className="block text-sm font-medium text-gray-700">
              Total Duration (months)
            </label>
            <input
              type="number"
              id="durationMonths"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.durationMonths}
              onChange={(e) => updateFormData({ durationMonths: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Vesting Preview */}
        {formData.durationMonths > 0 && (
          <div className="rounded-md bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Vesting Preview</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Immediate vesting:</span>
                <span className="ml-2 font-medium">
                  {formData.cliffMonths === 0 ? formData.quantity.toLocaleString() : 0} shares
                </span>
              </div>
              <div>
                <span className="text-gray-600">After cliff:</span>
                <span className="ml-2 font-medium">
                  {Math.floor((formData.quantity * formData.cliffMonths) / formData.durationMonths).toLocaleString()} shares
                </span>
              </div>
              <div>
                <span className="text-gray-600">Monthly vesting:</span>
                <span className="ml-2 font-medium">
                  {Math.floor(formData.quantity / formData.durationMonths).toLocaleString()} shares
                </span>
              </div>
              <div>
                <span className="text-gray-600">Full vesting date:</span>
                <span className="ml-2 font-medium">
                  {format(
                    new Date(new Date(formData.vestingStartDate).getTime() + formData.durationMonths * 30 * 24 * 60 * 60 * 1000),
                    'MMM dd, yyyy'
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReview = () => {
    if (!preview) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Review & Compliance</h3>
          <p className="text-sm text-gray-500">Review all details before issuing the security</p>
        </div>

        {/* Compliance Status */}
        <div className={`rounded-md p-4 ${
          preview.compliance.status === 'COMPLIANT' ? 'bg-green-50' :
          preview.compliance.status === 'WARNING' ? 'bg-yellow-50' : 'bg-red-50'
        }`}>
          <div className="flex">
            {preview.compliance.status === 'COMPLIANT' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            ) : preview.compliance.status === 'WARNING' ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-400" />
            )}
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                preview.compliance.status === 'COMPLIANT' ? 'text-green-800' :
                preview.compliance.status === 'WARNING' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {preview.compliance.status === 'COMPLIANT' ? '409A Compliant' :
                 preview.compliance.status === 'WARNING' ? 'Compliance Warning' : 'Non-Compliant'}
              </h3>
              {preview.compliance.messages.length > 0 && (
                <div className={`mt-2 text-sm ${
                  preview.compliance.status === 'COMPLIANT' ? 'text-green-700' :
                  preview.compliance.status === 'WARNING' ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  <ul className="list-disc pl-5 space-y-1">
                    {preview.compliance.messages.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Validation Errors/Warnings */}
        {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-3">
            {validation.errors.length > 0 && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <XCircleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Please fix the following errors:
                    </h3>
                    <ul className="mt-2 text-sm text-red-700 list-disc pl-5 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Warnings:
                    </h3>
                    <ul className="mt-2 text-sm text-yellow-700 list-disc pl-5 space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security Summary */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Security Details</h4>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Type</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.security.type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Quantity</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.security.quantity.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Share Class</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.security.shareClass}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Current Value</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.security.value}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Stakeholder Impact</h4>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Recipient</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.stakeholder.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Current Ownership</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.stakeholder.currentOwnership.toFixed(2)}%</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">New Ownership</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.stakeholder.newOwnership.toFixed(2)}%</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Change</dt>
                    <dd className={`text-sm font-medium ${preview.stakeholder.dilutionImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {preview.stakeholder.dilutionImpact >= 0 ? '+' : ''}{preview.stakeholder.dilutionImpact.toFixed(2)}%
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Grant Details */}
            {preview.grant && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Grant Terms</h4>
                <dl className="grid grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm text-gray-500">Strike Price</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.grant.strikePrice}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Fair Market Value</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.grant.fairMarketValue}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Grant Date</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.grant.grantDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Expiration</dt>
                    <dd className="text-sm font-medium text-gray-900">{preview.grant.expirationDate}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Vesting Details */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Vesting Schedule</h4>
              <dl className="grid grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm text-gray-500">Start Date</dt>
                  <dd className="text-sm font-medium text-gray-900">{preview.vesting.startDate}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Cliff Period</dt>
                  <dd className="text-sm font-medium text-gray-900">{preview.vesting.cliffMonths} months</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Duration</dt>
                  <dd className="text-sm font-medium text-gray-900">{preview.vesting.durationMonths} months</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Frequency</dt>
                  <dd className="text-sm font-medium text-gray-900">{preview.vesting.frequency}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Vested Today</dt>
                  <dd className="text-sm font-medium text-gray-900">{preview.vesting.vestedToday.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Vested in 1 Year</dt>
                  <dd className="text-sm font-medium text-gray-900">{preview.vesting.vestedInOneYear.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          {result.success ? (
            <>
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Security Issued Successfully!</h3>
              <p className="mt-1 text-sm text-gray-500">
                The security has been issued and all records have been created.
              </p>
            </>
          ) : (
            <>
              <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Issuance Failed</h3>
              <p className="mt-1 text-sm text-gray-500">
                There was an error issuing the security. Please try again.
              </p>
            </>
          )}
        </div>

        {/* Result Details */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dl className="space-y-4">
              {result.securityId && (
                <div>
                  <dt className="text-sm text-gray-500">Security ID</dt>
                  <dd className="text-sm font-medium text-gray-900 font-mono">{result.securityId}</dd>
                </div>
              )}
              {result.grantId && (
                <div>
                  <dt className="text-sm text-gray-500">Grant ID</dt>
                  <dd className="text-sm font-medium text-gray-900 font-mono">{result.grantId}</dd>
                </div>
              )}
              {result.transactionId && (
                <div>
                  <dt className="text-sm text-gray-500">Transaction ID</dt>
                  <dd className="text-sm font-medium text-gray-900 font-mono">{result.transactionId}</dd>
                </div>
              )}
            </dl>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <h4 className="text-sm font-medium text-red-800">Errors:</h4>
                <ul className="mt-2 text-sm text-red-700 list-disc pl-5 space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-md">
                <h4 className="text-sm font-medium text-yellow-800">Warnings:</h4>
                <ul className="mt-2 text-sm text-yellow-700 list-disc pl-5 space-y-1">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStepIndex) {
      case 0:
        return renderStakeholderSelection();
      case 1:
        return renderSecurityDetails();
      case 2:
        return renderPricingTerms();
      case 3:
        return renderVestingSchedule();
      case 4:
        return renderReview();
      case 5:
        return renderResult();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStepIndex) {
      case 0:
        return !!formData.stakeholderId;
      case 1:
        return formData.quantity > 0 && !!formData.grantDate;
      case 2:
        const securityConfig = SECURITY_TYPE_CONFIGS[formData.type];
        return !securityConfig.requiresStrikePrice || !!formData.strikePrice;
      case 3:
        return true; // Vesting step is always valid
      case 4:
        return validation?.isValid || false;
      case 5:
        return false; // Final step
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Issue Securities</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create new securities with full compliance checking and transaction safety
        </p>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentStepIndex === 0 
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
            onClick={prevStep}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="flex space-x-3">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              onClick={onCancel}
            >
              Cancel
            </button>

            {currentStepIndex === 4 ? (
              <button
                type="button"
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  validation?.isValid && !loading
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                onClick={handleSubmit}
                disabled={!validation?.isValid || loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Issuing...
                  </>
                ) : (
                  'Issue Security'
                )}
              </button>
            ) : currentStepIndex < 5 ? (
              <button
                type="button"
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  canProceed()
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-2" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritiesIssuanceWizard;