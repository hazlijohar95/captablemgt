import React from 'react';
import { useIssuanceWizard } from '../../context/IssuanceWizardContext';

export const StakeholderSelectionStep: React.FC = () => {
  const { state, updateFormData } = useIssuanceWizard();
  const { stakeholders, formData, loading } = state;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading stakeholders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Select Stakeholder</h3>
        <p className="text-sm text-gray-500">Choose who will receive this security</p>
      </div>

      <div className="space-y-4">
        {stakeholders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No stakeholders found. Please add stakeholders first.</p>
          </div>
        ) : (
          stakeholders.map((stakeholder) => (
            <div 
              key={stakeholder.id}
              className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                formData.stakeholderId === stakeholder.id
                  ? 'border-blue-500 ring-2 ring-blue-500'
                  : 'border-gray-300 hover:border-gray-400'
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
                      {stakeholder.people?.name || stakeholder.entity_name || 'Unknown'}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {stakeholder.type}
                      </span>
                      {stakeholder.people?.email && (
                        <>
                          <span>•</span>
                          <span>{stakeholder.people.email}</span>
                        </>
                      )}
                    </div>
                    {stakeholder.people?.phone && (
                      <p className="text-sm text-gray-500 mt-1">
                        📞 {stakeholder.people.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {stakeholders.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Need to add a new stakeholder?
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                You can add new stakeholders from the Stakeholders page before issuing securities.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakeholderSelectionStep;