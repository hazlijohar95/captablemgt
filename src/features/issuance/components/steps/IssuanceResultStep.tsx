import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useIssuanceWizard } from '../../context/IssuanceWizardContext';

export const IssuanceResultStep: React.FC = () => {
  const { state } = useIssuanceWizard();
  const { result, issuing } = state;

  if (issuing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Issuing Security...</h3>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we process the security issuance
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No result available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Result Status */}
      <div className="text-center">
        {result.success ? (
          <>
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
            <h3 className="mt-4 text-xl font-medium text-gray-900">Security Issued Successfully!</h3>
            <p className="mt-2 text-sm text-gray-500">
              The security has been issued and all records have been created.
            </p>
          </>
        ) : (
          <>
            <XCircleIcon className="mx-auto h-16 w-16 text-red-500" />
            <h3 className="mt-4 text-xl font-medium text-gray-900">Issuance Failed</h3>
            <p className="mt-2 text-sm text-gray-500">
              There was an error issuing the security. Please review the details below.
            </p>
          </>
        )}
      </div>

      {/* Success Details */}
      {result.success && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="space-y-4">
              {result.securityId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Security ID</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                    {result.securityId}
                  </dd>
                </div>
              )}
              
              {result.grantId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Grant ID</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                    {result.grantId}
                  </dd>
                </div>
              )}
              
              {result.vestingScheduleId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vesting Schedule ID</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                    {result.vestingScheduleId}
                  </dd>
                </div>
              )}
              
              {result.transactionId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Transaction ID</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                    {result.transactionId}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* Warnings (shown for both success and failure) */}
      {result.warnings.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
              <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Errors (shown only for failures) */}
      {result.errors.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Errors</h4>
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {result.success && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Next Steps</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>The security has been added to the cap table</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Grant documentation can be generated from the Documents section</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>The recipient will be notified about their new grant (if enabled)</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Transaction has been logged for audit purposes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Failure Recovery */}
      {!result.success && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-800">What to do next</h4>
              <ul className="mt-2 text-sm text-gray-700 space-y-1">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Review the error messages above</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Go back to previous steps to correct any issues</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>Contact support if the problem persists</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Transaction Summary</h3>
        </div>
        <div className="px-6 py-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Status:</strong>{' '}
              <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                {result.success ? 'Completed Successfully' : 'Failed'}
              </span>
            </p>
            <p className="mb-2">
              <strong>Timestamp:</strong>{' '}
              {new Date().toLocaleString()}
            </p>
            <p>
              <strong>Operation:</strong> Security Issuance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuanceResultStep;