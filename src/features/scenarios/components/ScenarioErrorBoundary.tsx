/**
 * Specialized error boundary for scenario modeling components
 * Provides context-specific error handling and recovery options
 */

import React, { ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import ErrorBoundary, { ErrorFallbackProps } from '@/components/errors/ErrorBoundary';

interface ScenarioErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
  fallbackLevel?: 'page' | 'section' | 'component';
}

const ScenarioErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  retry,
  level = 'section'
}) => {
  const getScenarioErrorMessage = (error: Error): string => {
    // Scenario-specific error messages
    if (error.message.includes('SAFE')) {
      return 'There was an issue processing SAFE note conversions. Please check your SAFE parameters and try again.';
    }
    
    if (error.message.includes('anti-dilution')) {
      return 'Anti-dilution calculations failed. Please verify your preferred share settings and conversion ratios.';
    }
    
    if (error.message.includes('waterfall')) {
      return 'Waterfall analysis encountered an error. Please check your liquidation preferences and participation rights.';
    }
    
    if (error.message.includes('precision') || error.message.includes('cents')) {
      return 'Financial calculation precision error. This may be due to invalid monetary values or rounding issues.';
    }
    
    if (error.message.includes('validation')) {
      return 'Input validation failed. Please check all form fields for valid values within acceptable ranges.';
    }
    
    if (error.message.includes('dilution')) {
      return 'Dilution calculations failed. Please verify your share counts and investment amounts.';
    }
    
    // Generic scenario modeling error
    return 'A scenario modeling error occurred. This may be due to invalid parameters or conflicting settings.';
  };

  const getRecoveryActions = () => {
    const actions = [
      {
        label: 'Retry Calculation',
        onClick: retry,
        primary: true,
        icon: <ArrowPathIcon className="h-4 w-4" />
      }
    ];

    // Add specific recovery actions based on error type
    if (error.message.includes('SAFE') || error.message.includes('conversion')) {
      actions.push({
        label: 'Reset SAFE Settings',
        onClick: () => {
          // This would need to be connected to the scenario state
          console.log('Resetting SAFE settings');
          retry();
        },
        primary: false,
        icon: undefined
      });
    }

    if (error.message.includes('validation') || error.message.includes('input')) {
      actions.push({
        label: 'Reset to Defaults',
        onClick: () => {
          // This would need to be connected to the scenario state
          console.log('Resetting to default values');
          retry();
        },
        primary: false,
        icon: undefined
      });
    }

    actions.push({
      label: 'Go to Dashboard',
      onClick: () => window.location.href = '/dashboard',
      primary: false,
      icon: <HomeIcon className="h-4 w-4" />
    });

    return actions;
  };

  const errorMessage = getScenarioErrorMessage(error);
  const recoveryActions = getRecoveryActions();

  if (level === 'page') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Scenario Modeling Error
            </h2>
            <p className="mt-4 text-sm text-gray-600">
              {errorMessage}
            </p>
            
            <div className="mt-8 space-y-3">
              {recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.primary ? 'primary' : 'outline'}
                  className="w-full"
                  leftIcon={action.icon}
                >
                  {action.label}
                </Button>
              ))}
            </div>

            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical details
              </summary>
              <div className="mt-3 p-4 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                <p><strong>Error ID:</strong> {errorId}</p>
                <p><strong>Message:</strong> {error.message}</p>
                <p><strong>Component:</strong> Scenario Modeling Interface</p>
                <p><strong>Time:</strong> {new Date().toISOString()}</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  if (level === 'section') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Scenario Calculation Error
            </h3>
            <p className="mt-2 text-sm text-red-700">
              {errorMessage}
            </p>
            
            <div className="mt-4 flex flex-wrap gap-3">
              {recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  onClick={action.onClick}
                  variant={action.primary ? 'primary' : 'outline'}
                  leftIcon={action.icon}
                >
                  {action.label}
                </Button>
              ))}
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                Error details (ID: {errorId})
              </summary>
              <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 font-mono">
                <p><strong>Message:</strong> {error.message}</p>
                {error.stack && (
                  <p className="mt-1"><strong>Stack:</strong> {error.stack.split('\n')[0]}</p>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Component level
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
          <div>
            <span className="text-sm font-medium text-yellow-800">
              Component Error
            </span>
            <p className="text-xs text-yellow-700 mt-1">
              {error.message.substring(0, 80)}...
            </p>
          </div>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={retry}
          leftIcon={<ArrowPathIcon className="h-3 w-3" />}
        >
          Retry
        </Button>
      </div>
    </div>
  );
};

export const ScenarioErrorBoundary: React.FC<ScenarioErrorBoundaryProps> = ({
  children,
  onError,
  fallbackLevel = 'section'
}) => (
  <ErrorBoundary
    level={fallbackLevel}
    context={{ type: 'scenario-modeling' }}
    onError={onError}
    fallback={(props) => <ScenarioErrorFallback {...props} level={fallbackLevel} />}
  >
    {children}
  </ErrorBoundary>
);