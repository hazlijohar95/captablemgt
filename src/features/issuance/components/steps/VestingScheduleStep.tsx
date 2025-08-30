import React from 'react';
import { format } from 'date-fns';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useIssuanceWizard } from '../../context/IssuanceWizardContext';
import { SECURITY_TYPE_CONFIGS, DEFAULT_VESTING_SCHEDULES } from '../../types/issuance.types';

export const VestingScheduleStep: React.FC = () => {
  const { state, updateFormData } = useIssuanceWizard();
  const { formData } = state;
  
  const securityConfig = SECURITY_TYPE_CONFIGS[formData.type];

  // Apply vesting template
  const applyVestingTemplate = (templateKey: keyof typeof DEFAULT_VESTING_SCHEDULES) => {
    const template = DEFAULT_VESTING_SCHEDULES[templateKey];
    updateFormData({
      cliffMonths: template.cliffMonths,
      durationMonths: template.durationMonths,
      frequency: template.frequency
    });
  };

  // Calculate vesting preview
  const calculateVestingPreview = () => {
    if (formData.durationMonths === 0) {
      return {
        immediateVesting: formData.quantity,
        afterCliff: 0,
        monthlyVesting: 0,
        fullVestingDate: 'Immediate'
      };
    }

    const immediateVesting = formData.cliffMonths === 0 ? formData.quantity : 0;
    const afterCliff = Math.floor((formData.quantity * formData.cliffMonths) / formData.durationMonths);
    const monthlyVesting = Math.floor(formData.quantity / formData.durationMonths);
    const fullVestingDate = new Date(new Date(formData.vestingStartDate).getTime() + formData.durationMonths * 30 * 24 * 60 * 60 * 1000);

    return {
      immediateVesting,
      afterCliff,
      monthlyVesting,
      fullVestingDate: format(fullVestingDate, 'MMM dd, yyyy')
    };
  };

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
              <h4 className="text-sm font-medium text-blue-800">No Vesting Required</h4>
              <p className="mt-1 text-sm text-blue-700">
                {SECURITY_TYPE_CONFIGS[formData.type].label} securities vest immediately upon issuance.
                The recipient will have full rights to these securities from the grant date.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vestingPreview = calculateVestingPreview();

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
          }).map(([key, label]) => {
            const template = DEFAULT_VESTING_SCHEDULES[key as keyof typeof DEFAULT_VESTING_SCHEDULES];
            const isActive = formData.cliffMonths === template.cliffMonths && 
                           formData.durationMonths === template.durationMonths && 
                           formData.frequency === template.frequency;
            
            return (
              <button
                key={key}
                type="button"
                className={`text-left p-3 border rounded-lg text-sm transition-colors ${
                  isActive 
                    ? 'border-blue-500 bg-blue-50 text-blue-900' 
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                }`}
                onClick={() => applyVestingTemplate(key as keyof typeof DEFAULT_VESTING_SCHEDULES)}
              >
                <div className="font-medium">{label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {template.durationMonths === 0 
                    ? 'Immediate vesting' 
                    : `${template.durationMonths}mo total, ${template.cliffMonths}mo cliff`
                  }
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Vesting Settings */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Custom Vesting Schedule</h4>
        
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
            <p className="mt-1 text-xs text-gray-500">When vesting begins</p>
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
            <p className="mt-1 text-xs text-gray-500">How often shares vest</p>
          </div>

          <div>
            <label htmlFor="cliffMonths" className="block text-sm font-medium text-gray-700">
              Cliff Period (months)
            </label>
            <input
              type="number"
              id="cliffMonths"
              min="0"
              max={formData.durationMonths}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.cliffMonths}
              onChange={(e) => updateFormData({ cliffMonths: parseInt(e.target.value) || 0 })}
            />
            <p className="mt-1 text-xs text-gray-500">Initial waiting period before any vesting</p>
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
            <p className="mt-1 text-xs text-gray-500">Total time to fully vest (0 = immediate)</p>
          </div>
        </div>

        {/* Validation */}
        {formData.cliffMonths > formData.durationMonths && formData.durationMonths > 0 && (
          <div className="mt-2 text-sm text-red-600">
            Cliff period cannot be longer than total duration
          </div>
        )}
      </div>

      {/* Vesting Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Vesting Preview</h4>
        
        {formData.durationMonths === 0 ? (
          <div className="text-center py-2">
            <div className="text-lg font-semibold text-green-600">
              {formData.quantity.toLocaleString()} shares
            </div>
            <div className="text-sm text-gray-600">vest immediately</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Immediate vesting:</span>
              <div className="font-medium text-gray-900">
                {vestingPreview.immediateVesting.toLocaleString()} shares
              </div>
            </div>
            
            <div>
              <span className="text-gray-600">After {formData.cliffMonths}mo cliff:</span>
              <div className="font-medium text-gray-900">
                {vestingPreview.afterCliff.toLocaleString()} shares
              </div>
            </div>
            
            <div>
              <span className="text-gray-600">{formData.frequency.toLowerCase()} vesting:</span>
              <div className="font-medium text-gray-900">
                {vestingPreview.monthlyVesting.toLocaleString()} shares
              </div>
            </div>
            
            <div>
              <span className="text-gray-600">Full vesting date:</span>
              <div className="font-medium text-gray-900">
                {vestingPreview.fullVestingDate}
              </div>
            </div>
          </div>
        )}

        {/* Vesting Timeline Visualization */}
        {formData.durationMonths > 0 && (
          <div className="mt-4">
            <div className="flex items-center text-xs text-gray-500 mb-2">
              <span>Vesting Timeline</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full relative"
                style={{ width: `${Math.min(100, (formData.cliffMonths / formData.durationMonths) * 100)}%` }}
              >
                {formData.cliffMonths > 0 && (
                  <div className="absolute right-0 top-0 h-2 w-1 bg-yellow-400 rounded-r"></div>
                )}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Grant</span>
              {formData.cliffMonths > 0 && (
                <span>Cliff ({formData.cliffMonths}mo)</span>
              )}
              <span>Full Vesting ({formData.durationMonths}mo)</span>
            </div>
          </div>
        )}
      </div>

      {/* Vesting Information */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">About Vesting</h4>
            <p className="mt-1 text-sm text-blue-700">
              Vesting protects the company by ensuring recipients earn their equity over time. 
              A cliff period requires recipients to stay for a minimum time before any shares vest.
            </p>
            {formData.type === 'OPTION' && (
              <p className="mt-2 text-sm text-blue-700">
                <strong>Note for Options:</strong> Recipients can only exercise vested options. 
                Unvested options are typically forfeited if employment ends.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VestingScheduleStep;