/**
 * Comprehensive error boundary system with user-friendly error handling
 * Provides contextual error messages and recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

export interface ErrorInfo {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  context?: Record<string, any>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: Record<string, any>;
  level?: 'page' | 'section' | 'component';
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retry: () => void;
  context?: Record<string, any>;
  level?: 'page' | 'section' | 'component';
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const enhancedErrorInfo: ErrorInfo = {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: this.props.context
    };

    this.setState({
      errorInfo: enhancedErrorInfo
    });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, enhancedErrorInfo);
    }

    // Log to monitoring service
    this.logError(error, enhancedErrorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      console.error('Error logged to monitoring service:', {
        message: error.message,
        stack: error.stack,
        errorInfo,
        errorId: this.state.errorId
      });
    } else {
      console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }
  };

  private retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId!}
          retry={this.retry}
          context={this.props.context}
          level={this.props.level}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback components for different levels
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  retry,
  level = 'component'
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const getErrorMessage = (error: Error) => {
    // User-friendly error messages based on error type
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'Unable to load application components. This is usually due to a network issue or app update.';
    }
    
    if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (error.message.includes('QuotaExceededError')) {
      return 'Storage quota exceeded. Please clear some browser data and try again.';
    }
    
    if (error.message.includes('Validation') || error.message.includes('validation')) {
      return 'There was an issue with the data provided. Please check your inputs and try again.';
    }
    
    if (error.message.includes('calculation') || error.message.includes('math')) {
      return 'There was an issue with financial calculations. Please verify your inputs and try again.';
    }

    // Generic fallback
    return 'Something went wrong. We\'ve been notified and are working to fix this issue.';
  };

  const getRecoveryActions = () => {
    const actions = [
      {
        label: 'Try Again',
        onClick: retry,
        primary: true,
        icon: <ArrowPathIcon className="h-4 w-4" />
      }
    ];

    if (error.message.includes('ChunkLoadError')) {
      actions.push({
        label: 'Refresh Page',
        onClick: () => window.location.reload(),
        primary: false,
        icon: undefined
      });
    }

    if (error.message.includes('NetworkError')) {
      actions.push({
        label: 'Check Connection',
        onClick: () => window.open('https://www.google.com', '_blank'),
        primary: false,
        icon: undefined
      });
    }

    return actions;
  };

  const errorMessage = getErrorMessage(error);
  const recoveryActions = getRecoveryActions();

  // Different layouts based on error level
  if (level === 'page') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Oops! Something went wrong
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {errorMessage}
            </p>
            
            <div className="mt-6 space-y-3">
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

            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical details
              </summary>
              <div className="mt-3 p-3 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                <p><strong>Error ID:</strong> {errorId}</p>
                <p><strong>Message:</strong> {error.message}</p>
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
          <ExclamationTriangleIcon className="h-6 w-6 text-red-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Section Error
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {errorMessage}
            </p>
            
            <div className="mt-4 flex space-x-3">
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

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-3 text-xs text-red-600 hover:text-red-800 flex items-center"
            >
              <span>Error details</span>
              <ChevronRightIcon 
                className={`ml-1 h-3 w-3 transform transition-transform ${
                  showDetails ? 'rotate-90' : ''
                }`} 
              />
            </button>

            {showDetails && (
              <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 font-mono">
                <p><strong>ID:</strong> {errorId}</p>
                <p><strong>Message:</strong> {error.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Component level (compact)
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 mr-2" />
          <span className="text-sm text-yellow-800">
            Component failed to load
          </span>
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

// Specialized error boundaries for specific contexts
export const CalculationErrorBoundary: React.FC<{
  children: ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, onError }) => (
  <ErrorBoundary
    level="section"
    context={{ type: 'calculation' }}
    onError={onError}
    fallback={(props) => (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-orange-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-800">
              Calculation Error
            </h3>
            <p className="mt-1 text-sm text-orange-700">
              Unable to perform financial calculations. This may be due to invalid inputs or a temporary issue.
            </p>
            <div className="mt-4 space-x-3">
              <Button size="sm" onClick={props.retry} variant="outline">
                Recalculate
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => window.location.href = '/help/calculations'}
              >
                Get Help
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const FormErrorBoundary: React.FC<{
  children: ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, onError }) => (
  <ErrorBoundary
    level="component"
    context={{ type: 'form' }}
    onError={onError}
    fallback={(props) => (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-red-800">Form Error</h3>
          <p className="mt-1 text-xs text-red-600">
            The form encountered an error. Your data may not be saved.
          </p>
          <div className="mt-3 space-x-2">
            <Button size="xs" onClick={props.retry} variant="primary">
              Retry
            </Button>
            <Button 
              size="xs" 
              variant="outline"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;