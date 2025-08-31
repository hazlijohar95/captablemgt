import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Bell, Eye, Globe, Save, AlertCircle } from 'lucide-react';
import { employeePortalService } from '@/services/employeePortalService';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { EmployeePortalPreferences, DashboardSection } from '@/types/employeePortal';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'SGD', label: 'Singapore Dollar (S$)' },
  { value: 'MYR', label: 'Malaysian Ringgit (RM)' }
] as const;

const DASHBOARD_SECTION_LABELS: Record<DashboardSection, string> = {
  'equity_summary': 'Equity Summary',
  'vesting_timeline': 'Vesting Timeline',
  'documents': 'Documents',
  'exercise_calculator': 'Exercise Calculator',
  'tax_estimates': 'Tax Estimates',
  'company_updates': 'Company Updates'
};

interface ProfileSettingsProps {
  preferences?: EmployeePortalPreferences;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ preferences }) => {
  const { employee } = useEmployeeAuth();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState({
    email_notifications: preferences?.email_notifications ?? true,
    vesting_reminders: preferences?.vesting_reminders ?? true,
    equity_updates: preferences?.equity_updates ?? true,
    document_notifications: preferences?.document_notifications ?? true,
    preferred_currency: preferences?.preferred_currency ?? 'USD',
    show_tax_estimates: preferences?.show_tax_estimates ?? true,
    show_exercise_costs: preferences?.show_exercise_costs ?? true,
    allow_equity_sharing: preferences?.allow_equity_sharing ?? false,
    dashboard_sections: preferences?.dashboard_layout?.sections ?? [
      'equity_summary',
      'vesting_timeline',
      'documents'
    ] as DashboardSection[]
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (updatedPreferences: Partial<EmployeePortalPreferences>) =>
      employeePortalService.updateEmployeePreferences(employee!.id, updatedPreferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard', employee?.id] });
      setHasChanges(false);
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleDashboardSectionToggle = (section: DashboardSection) => {
    setFormData(prev => ({
      ...prev,
      dashboard_sections: prev.dashboard_sections.includes(section)
        ? prev.dashboard_sections.filter(s => s !== section)
        : [...prev.dashboard_sections, section]
    }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedPreferences = {
      email_notifications: formData.email_notifications,
      vesting_reminders: formData.vesting_reminders,
      equity_updates: formData.equity_updates,
      document_notifications: formData.document_notifications,
      preferred_currency: formData.preferred_currency,
      show_tax_estimates: formData.show_tax_estimates,
      show_exercise_costs: formData.show_exercise_costs,
      allow_equity_sharing: formData.allow_equity_sharing,
      dashboard_layout: {
        sections: formData.dashboard_sections
      }
    };

    await updatePreferencesMutation.mutateAsync(updatedPreferences);
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <User className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Full Name</label>
            <p className="font-medium text-gray-900">{employee?.name}</p>
          </div>
          
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <p className="font-medium text-gray-900">{employee?.email}</p>
          </div>
          
          {employee?.employee_id && (
            <div>
              <label className="text-sm text-gray-600">Employee ID</label>
              <p className="font-medium text-gray-900">{employee.employee_id}</p>
            </div>
          )}
          
          {employee?.job_title && (
            <div>
              <label className="text-sm text-gray-600">Job Title</label>
              <p className="font-medium text-gray-900">{employee.job_title}</p>
            </div>
          )}
          
          {employee?.department && (
            <div>
              <label className="text-sm text-gray-600">Department</label>
              <p className="font-medium text-gray-900">{employee.department}</p>
            </div>
          )}
          
          {employee?.hire_date && (
            <div>
              <label className="text-sm text-gray-600">Hire Date</label>
              <p className="font-medium text-gray-900">
                {new Date(employee.hire_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            To update your personal information, please contact your HR administrator.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notification Preferences */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Email Notifications</label>
                <p className="text-sm text-gray-600">Receive general email notifications</p>
              </div>
              <input
                type="checkbox"
                checked={formData.email_notifications}
                onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Vesting Reminders</label>
                <p className="text-sm text-gray-600">Get notified before vesting milestones</p>
              </div>
              <input
                type="checkbox"
                checked={formData.vesting_reminders}
                onChange={(e) => handleInputChange('vesting_reminders', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Equity Updates</label>
                <p className="text-sm text-gray-600">Updates on equity value and company events</p>
              </div>
              <input
                type="checkbox"
                checked={formData.equity_updates}
                onChange={(e) => handleInputChange('equity_updates', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Document Notifications</label>
                <p className="text-sm text-gray-600">New documents available for download</p>
              </div>
              <input
                type="checkbox"
                checked={formData.document_notifications}
                onChange={(e) => handleInputChange('document_notifications', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Eye className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Display Preferences</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-900 mb-2">Preferred Currency</label>
              <select
                value={formData.preferred_currency}
                onChange={(e) => handleInputChange('preferred_currency', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CURRENCY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Show Tax Estimates</label>
                <p className="text-sm text-gray-600">Display estimated tax information</p>
              </div>
              <input
                type="checkbox"
                checked={formData.show_tax_estimates}
                onChange={(e) => handleInputChange('show_tax_estimates', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Show Exercise Costs</label>
                <p className="text-sm text-gray-600">Display option exercise costs and calculations</p>
              </div>
              <input
                type="checkbox"
                checked={formData.show_exercise_costs}
                onChange={(e) => handleInputChange('show_exercise_costs', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Dashboard Layout */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Dashboard Layout</h3>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-3">
              Choose which sections to display on your dashboard:
            </p>
            
            <div className="space-y-2">
              {Object.entries(DASHBOARD_SECTION_LABELS).map(([section, label]) => (
                <div key={section} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={section}
                    checked={formData.dashboard_sections.includes(section as DashboardSection)}
                    onChange={() => handleDashboardSectionToggle(section as DashboardSection)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={section} className="text-sm font-medium text-gray-900">
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Allow Equity Sharing</label>
                <p className="text-sm text-gray-600">
                  Allow sharing equity information with financial advisors
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.allow_equity_sharing}
                onChange={(e) => handleInputChange('allow_equity_sharing', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                Changes to privacy settings may require approval from your company administrator.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          {updatePreferencesMutation.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Failed to save preferences. Please try again.
              </p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={!hasChanges || updatePreferencesMutation.isPending}
            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
              hasChanges && !updatePreferencesMutation.isPending
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {updatePreferencesMutation.isPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </button>
          
          {updatePreferencesMutation.isSuccess && (
            <p className="text-sm text-green-600 text-center mt-2">
              Preferences saved successfully!
            </p>
          )}
        </div>
      </form>
    </div>
  );
};