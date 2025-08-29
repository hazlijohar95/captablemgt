import React, { Component, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { UnauthorizedCompanyAccessError } from '@/hooks/useCompanyContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CompanyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for monitoring (replace with your logging service)
    console.error('Company access error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isUnauthorizedError = this.state.error instanceof UnauthorizedCompanyAccessError;

      if (isUnauthorizedError) {
        return (
          <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
              <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Company Access Required
              </h2>
              <p className="text-gray-600 mb-6">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh Page
              </button>
            </div>
          </div>
        );
      }

      // Generic error fallback
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh Page
              </button>
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Show error details
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-auto">
                  {this.state.error?.toString()}
                </pre>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}