import React, { useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { useIssuanceWizard } from '../../context/IssuanceWizardContext';

export const ReviewComplianceStep: React.FC = () => {
  const { 
    state, 
    validateForm, 
    generatePreview 
  } = useIssuanceWizard();
  
  const { validation, preview, validating, previewing, formData, stakeholders } = state;

  // Auto-validate and generate preview when step loads
  useEffect(() => {
    if (formData.stakeholderId && formData.quantity > 0) {
      validateForm();
      generatePreview();
    }
  }, [formData.stakeholderId, formData.quantity, validateForm, generatePreview]);

  const stakeholder = stakeholders.find(s => s.id === formData.stakeholderId);

  if (validating || previewing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">
            {validating ? 'Validating compliance...' : 'Generating preview...'}
          </p>
        </div>
      </div>
    );
  }

  if (!preview || !validation) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">Unable to generate preview. Please check your inputs.</p>
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

      {/* Security Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Issuance Summary</h4>
          
          {/* Basic Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-3">Security Details</h5>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Type:</dt>
                  <dd className="font-medium text-gray-900">{preview.security.type}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Quantity:</dt>
                  <dd className="font-medium text-gray-900">{preview.security.quantity.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Share Class:</dt>
                  <dd className="font-medium text-gray-900">{preview.security.shareClass}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Current Value:</dt>
                  <dd className="font-medium text-gray-900">{preview.security.value}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-3">Recipient</h5>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Name:</dt>
                  <dd className="font-medium text-gray-900">{preview.stakeholder.name}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Type:</dt>
                  <dd className="font-medium text-gray-900">
                    {stakeholder?.type || 'Unknown'}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Current Ownership:</dt>
                  <dd className="font-medium text-gray-900">{preview.stakeholder.currentOwnership.toFixed(2)}%</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">New Ownership:</dt>
                  <dd className="font-medium text-gray-900">{preview.stakeholder.newOwnership.toFixed(2)}%</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Change:</dt>
                  <dd className={`font-medium ${
                    preview.stakeholder.dilutionImpact >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {preview.stakeholder.dilutionImpact >= 0 ? '+' : ''}
                    {preview.stakeholder.dilutionImpact.toFixed(2)}%
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Grant Terms */}
          {preview.grant && (
            <>
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h5 className="text-sm font-medium text-gray-900 mb-3">Grant Terms</h5>
                <div className="grid grid-cols-2 gap-6">
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Strike Price:</dt>
                      <dd className="font-medium text-gray-900">{preview.grant.strikePrice}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Fair Market Value:</dt>
                      <dd className="font-medium text-gray-900">{preview.grant.fairMarketValue}</dd>
                    </div>
                  </dl>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Grant Date:</dt>
                      <dd className="font-medium text-gray-900">{preview.grant.grantDate}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Expiration:</dt>
                      <dd className="font-medium text-gray-900">{preview.grant.expirationDate}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </>
          )}

          {/* Vesting Schedule */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Vesting Schedule</h5>
            <div className="grid grid-cols-2 gap-6">
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Start Date:</dt>
                  <dd className="font-medium text-gray-900">{preview.vesting.startDate}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Cliff Period:</dt>
                  <dd className="font-medium text-gray-900">{preview.vesting.cliffMonths} months</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Duration:</dt>
                  <dd className="font-medium text-gray-900">{preview.vesting.durationMonths} months</dd>
                </div>
              </dl>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Frequency:</dt>
                  <dd className="font-medium text-gray-900">{preview.vesting.frequency}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Vested Today:</dt>
                  <dd className="font-medium text-gray-900">{preview.vesting.vestedToday.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Vested in 1 Year:</dt>
                  <dd className="font-medium text-gray-900">{preview.vesting.vestedInOneYear.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Value Estimation */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Value Estimation</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{preview.estimatedValue.currentValue}</div>
            <div className="text-gray-500">Current Value</div>
            <div className="text-xs text-gray-400 mt-1">At today's FMV</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{preview.estimatedValue.potentialValue}</div>
            <div className="text-gray-500">Potential Value</div>
            <div className="text-xs text-gray-400 mt-1">At 2x growth scenario</div>
          </div>
          {preview.estimatedValue.breakeven && (
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">{preview.estimatedValue.breakeven}</div>
              <div className="text-gray-500">Exercise Cost</div>
              <div className="text-xs text-gray-400 mt-1">Total strike price</div>
            </div>
          )}
        </div>
      </div>

      {/* Final Confirmation */}
      {validation.isValid && (
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">Ready to Issue</h4>
              <p className="mt-1 text-sm text-green-700">
                All validations have passed. You can proceed to issue this security.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewComplianceStep;