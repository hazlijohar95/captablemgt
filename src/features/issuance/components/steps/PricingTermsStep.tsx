import React from 'react';
import { addYears, format } from 'date-fns';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useIssuanceWizard } from '../../context/IssuanceWizardContext';
import { SECURITY_TYPE_CONFIGS } from '../../types/issuance.types';

export const PricingTermsStep: React.FC = () => {
  const { state, updateFormData } = useIssuanceWizard();
  const { formData, recommendedStrikePrice, validation } = state;
  
  const securityConfig = SECURITY_TYPE_CONFIGS[formData.type];

  // Helper function to set default expiration
  const setDefaultExpiration = (years: number = 10) => {
    const grantDate = new Date(formData.grantDate);
    const defaultExpiration = addYears(grantDate, years);
    updateFormData({ expirationDate: format(defaultExpiration, 'yyyy-MM-dd') });
  };

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
            {recommendedStrikePrice && recommendedStrikePrice !== '0' && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => updateFormData({ strikePrice: recommendedStrikePrice })}
              >
                Use 409A FMV: ${(parseInt(recommendedStrikePrice) / 100).toFixed(2)}
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
              placeholder="0.00"
            />
          </div>

          {/* 409A Compliance Status */}
          {validation?.complianceCheck && (
            <div className="mt-2">
              {!validation.complianceCheck.hasValid409A ? (
                <div className="flex items-center text-sm text-red-600">
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  <span>No valid 409A valuation found</span>
                </div>
              ) : !validation.complianceCheck.fmvCompliant ? (
                <div className="flex items-center text-sm text-red-600">
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  <span>Strike price below fair market value (${(parseInt(validation.complianceCheck.recommendedStrikePrice || '0') / 100).toFixed(2)})</span>
                </div>
              ) : (
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  <span>409A compliant</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-2 text-sm text-gray-500">
            <p>The price at which the option holder can purchase shares</p>
            {recommendedStrikePrice && recommendedStrikePrice !== '0' && (
              <p className="mt-1">
                <strong>Recommended:</strong> ${(parseInt(recommendedStrikePrice) / 100).toFixed(2)} per share (current 409A FMV)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expiration Date (for options and warrants) */}
      {securityConfig.requiresExpiration && (
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">
              Expiration Date
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => setDefaultExpiration(5)}
              >
                5 years
              </button>
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => setDefaultExpiration(10)}
              >
                10 years
              </button>
            </div>
          </div>
          
          <input
            type="date"
            id="expirationDate"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={formData.expirationDate || ''}
            onChange={(e) => updateFormData({ expirationDate: e.target.value })}
          />
          
          <p className="mt-1 text-sm text-gray-500">
            The date when this {formData.type.toLowerCase()} expires if not exercised
          </p>

          {formData.expirationDate && (
            <div className="mt-2 text-sm">
              <span className="text-gray-500">Term length:</span>
              <span className="ml-1 font-medium text-gray-900">
                {(() => {
                  const grantDate = new Date(formData.grantDate);
                  const expirationDate = new Date(formData.expirationDate);
                  const years = Math.round((expirationDate.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
                  return `${years} year${years !== 1 ? 's' : ''}`;
                })()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* No Pricing Required */}
      {!securityConfig.requiresStrikePrice && !securityConfig.requiresExpiration && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                No Pricing Required
              </h4>
              <p className="mt-1 text-sm text-blue-700">
                {SECURITY_TYPE_CONFIGS[formData.type].label} securities don't require strike price or expiration date settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Summary */}
      {(formData.strikePrice || formData.expirationDate) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Pricing Summary</h4>
          <div className="space-y-2 text-sm">
            {formData.strikePrice && (
              <div className="flex justify-between">
                <span className="text-gray-600">Strike Price per Share:</span>
                <span className="font-medium">${(parseInt(formData.strikePrice) / 100).toFixed(2)}</span>
              </div>
            )}
            
            {formData.strikePrice && formData.quantity > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Total Exercise Cost:</span>
                <span className="font-medium">
                  ${((parseInt(formData.strikePrice) / 100) * formData.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            
            {formData.expirationDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Expiration Date:</span>
                <span className="font-medium">
                  {format(new Date(formData.expirationDate), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 409A Compliance Information */}
      {securityConfig.requiresStrikePrice && (
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">
                409A Compliance Requirement
              </h4>
              <p className="mt-1 text-sm text-yellow-700">
                IRC Section 409A requires that stock options be granted with a strike price at or above 
                the fair market value of the underlying stock as of the grant date. This prevents 
                immediate taxable income for the recipient.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingTermsStep;