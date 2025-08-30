import React, { useState } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import SecuritiesIssuanceWizard from './SecuritiesIssuanceWizard';
import { ComplianceService409A } from '@/features/compliance/services/409aComplianceService';
import { useQuery } from '@tanstack/react-query';
import type { ULID } from '@/types';

interface IIssueSecurityWithComplianceProps {
  companyId: ULID;
  onComplete?: () => void;
  onCancel?: () => void;
  stakeholderId?: string;
}

/**
 * Comprehensive security issuance component with integrated 409A compliance checking.
 * This demonstrates the complete integration between the compliance system and issuance workflow.
 */
export const IssueSecurityWithCompliance: React.FC<IIssueSecurityWithComplianceProps> = ({
  companyId,
  onComplete,
  onCancel,
  stakeholderId
}) => {
  const [showWizard, setShowWizard] = useState(false);
  const [bypassWarnings, setBypassWarnings] = useState(false);

  // Check 409A compliance status before allowing security issuance
  const { data: complianceCheck, isLoading, error } = useQuery({
    queryKey: ['409aCompliance', companyId],
    queryFn: () => ComplianceService409A.performComplianceCheck(companyId),
    refetchOnWindowFocus: false,
  });

  const handleProceedWithIssuance = () => {
    setShowWizard(true);
  };

  const handleIssuanceComplete = () => {
    setShowWizard(false);
    onComplete?.();
  };

  const handleCancel = () => {
    setShowWizard(false);
    onCancel?.();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Checking 409A compliance status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <XCircleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Unable to check compliance status
            </h3>
            <p className="mt-2 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showWizard) {
    return (
      <SecuritiesIssuanceWizard
        companyId={companyId}
        initialStakeholderId={stakeholderId}
        onComplete={handleIssuanceComplete}
        onCancel={handleCancel}
      />
    );
  }

  if (!complianceCheck) {
    return null;
  }

  // Render compliance check results
  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'green';
      case 'WARNING':
        return 'yellow';
      case 'NON_COMPLIANT':
      case 'NO_VALUATION':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'WARNING':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case 'NON_COMPLIANT':
      case 'NO_VALUATION':
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const canProceedWithIssuance = () => {
    return complianceCheck.complianceStatus === 'COMPLIANT' || 
           (complianceCheck.complianceStatus === 'WARNING' && bypassWarnings);
  };

  const shouldShowBypassOption = () => {
    return complianceCheck.complianceStatus === 'WARNING' && !bypassWarnings;
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Issue Securities</h1>
        <p className="mt-1 text-sm text-gray-500">
          First, let's check your 409A compliance status before proceeding
        </p>
      </div>

      {/* Compliance Status Card */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">409A Compliance Status</h2>
        </div>

        <div className="p-6">
          <div className={`rounded-md p-4 bg-${getComplianceStatusColor(complianceCheck.complianceStatus)}-50`}>
            <div className="flex">
              {getComplianceIcon(complianceCheck.complianceStatus)}
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium text-${getComplianceStatusColor(complianceCheck.complianceStatus)}-800`}>
                  {complianceCheck.complianceStatus === 'COMPLIANT' && 'Fully Compliant'}
                  {complianceCheck.complianceStatus === 'WARNING' && 'Compliance Warning'}
                  {complianceCheck.complianceStatus === 'NON_COMPLIANT' && 'Non-Compliant'}
                  {complianceCheck.complianceStatus === 'NO_VALUATION' && 'No 409A Valuation'}
                </h3>
                
                <div className={`mt-2 text-sm text-${getComplianceStatusColor(complianceCheck.complianceStatus)}-700`}>
                  {complianceCheck.complianceStatus === 'COMPLIANT' && (
                    <p>Your company has a valid 409A valuation. You can proceed with option grants.</p>
                  )}
                  {complianceCheck.complianceStatus === 'WARNING' && (
                    <p>Your 409A valuation is valid but requires attention. Review the issues below.</p>
                  )}
                  {complianceCheck.complianceStatus === 'NON_COMPLIANT' && (
                    <p>You cannot issue options until compliance issues are resolved.</p>
                  )}
                  {complianceCheck.complianceStatus === 'NO_VALUATION' && (
                    <p>A 409A valuation is required before you can grant any stock options.</p>
                  )}
                </div>

                {/* Current Valuation Details */}
                {complianceCheck.currentValuation && (
                  <div className="mt-4 bg-white rounded border p-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Current 409A Valuation</h4>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-gray-500">Fair Market Value</dt>
                        <dd className="font-medium text-gray-900">
                          ${(parseInt(complianceCheck.currentValuation.fairMarketValue) / 100).toFixed(2)} per share
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Valuation Date</dt>
                        <dd className="font-medium text-gray-900">
                          {new Date(complianceCheck.currentValuation.valuationDate).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Method</dt>
                        <dd className="font-medium text-gray-900">
                          {complianceCheck.currentValuation.method.replace('_', ' ')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Valid Through</dt>
                        <dd className="font-medium text-gray-900">
                          {new Date(complianceCheck.currentValuation.validThrough).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>
                    
                    {complianceCheck.daysUntilExpiration !== undefined && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Days until expiration:</span>
                        <span className={`ml-1 font-medium ${
                          complianceCheck.daysUntilExpiration < 30 ? 'text-red-600' :
                          complianceCheck.daysUntilExpiration < 60 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {complianceCheck.daysUntilExpiration}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Required Actions */}
                {complianceCheck.requiredActions.length > 0 && (
                  <div className="mt-4">
                    <h4 className={`text-sm font-medium text-${getComplianceStatusColor(complianceCheck.complianceStatus)}-800 mb-2`}>
                      Required Actions:
                    </h4>
                    <ul className={`text-sm text-${getComplianceStatusColor(complianceCheck.complianceStatus)}-700 space-y-1`}>
                      {complianceCheck.requiredActions.map((action, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bypass Warning Option */}
          {shouldShowBypassOption() && (
            <div className="mt-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={bypassWarnings}
                  onChange={(e) => setBypassWarnings(e.target.checked)}
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">
                    I acknowledge the warnings and want to proceed
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    You are proceeding with security issuance despite compliance warnings. 
                    Please ensure you have reviewed all issues with your legal and tax advisors.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          onClick={onCancel}
        >
          Cancel
        </button>

        <div className="space-x-3">
          {complianceCheck.complianceStatus === 'NO_VALUATION' && (
            <button
              type="button"
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // TODO: Navigate to 409A valuation creation
                console.log('Navigate to 409A valuation creation');
              }}
            >
              Get 409A Valuation
            </button>
          )}

          {complianceCheck.complianceStatus !== 'NO_VALUATION' && (
            <button
              type="button"
              className={`px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white ${
                canProceedWithIssuance()
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              onClick={handleProceedWithIssuance}
              disabled={!canProceedWithIssuance()}
            >
              {complianceCheck.complianceStatus === 'COMPLIANT' 
                ? 'Proceed with Security Issuance'
                : complianceCheck.complianceStatus === 'WARNING' && bypassWarnings
                  ? 'Proceed Despite Warnings'
                  : 'Resolve Issues to Proceed'
              }
            </button>
          )}
        </div>
      </div>

      {/* Compliance Information Footer */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-500" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">About 409A Compliance</h3>
            <p className="mt-1 text-sm text-gray-600">
              IRC Section 409A requires that stock options be granted with a strike price at or above 
              the fair market value of the underlying stock. A 409A valuation provides safe harbor 
              protection for strike price determination.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              <strong>Key Requirements:</strong> Options must be priced at fair market value, 
              valuations must be updated annually or after material events, and all grants must 
              comply with IRS regulations to avoid adverse tax consequences for recipients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueSecurityWithCompliance;