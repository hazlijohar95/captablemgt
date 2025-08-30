import React from 'react';
import { useIssuanceWizard } from '../../context/IssuanceWizardContext';
import { SECURITY_TYPE_CONFIGS } from '../../types/issuance.types';

export const SecurityDetailsStep: React.FC = () => {
  const { state, updateFormData } = useIssuanceWizard();
  const { shareClasses, formData, loading } = state;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
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
                    <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quantity Input */}
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          Quantity
        </label>
        <div className="mt-1">
          <input
            type="number"
            id="quantity"
            min="1"
            step="1"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={formData.quantity || ''}
            onChange={(e) => updateFormData({ quantity: parseInt(e.target.value) || 0 })}
            placeholder="Enter number of shares/units"
          />
        </div>
        {formData.quantity > 0 && (
          <p className="mt-1 text-sm text-gray-500">
            {formData.quantity.toLocaleString()} {SECURITY_TYPE_CONFIGS[formData.type].label.toLowerCase()}
          </p>
        )}
      </div>

      {/* Share Class Selection */}
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
          {shareClasses.length === 0 && (
            <p className="mt-1 text-sm text-red-600">
              No share classes found. Please set up share classes first.
            </p>
          )}
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
        <p className="mt-1 text-sm text-gray-500">
          The date when this security will be granted
        </p>
      </div>

      {/* Security Type Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          About {SECURITY_TYPE_CONFIGS[formData.type].label}
        </h4>
        <p className="text-sm text-gray-600">
          {SECURITY_TYPE_CONFIGS[formData.type].description}
        </p>
        
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Strike Price:</span>
            <span className={`ml-1 ${
              SECURITY_TYPE_CONFIGS[formData.type].requiresStrikePrice ? 'text-green-600' : 'text-gray-400'
            }`}>
              {SECURITY_TYPE_CONFIGS[formData.type].requiresStrikePrice ? 'Required' : 'Not applicable'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Vesting:</span>
            <span className={`ml-1 ${
              SECURITY_TYPE_CONFIGS[formData.type].requiresVesting ? 'text-green-600' : 'text-gray-400'
            }`}>
              {SECURITY_TYPE_CONFIGS[formData.type].requiresVesting ? 'Required' : 'Optional'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Expiration:</span>
            <span className={`ml-1 ${
              SECURITY_TYPE_CONFIGS[formData.type].requiresExpiration ? 'text-green-600' : 'text-gray-400'
            }`}>
              {SECURITY_TYPE_CONFIGS[formData.type].requiresExpiration ? 'Required' : 'Not applicable'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDetailsStep;