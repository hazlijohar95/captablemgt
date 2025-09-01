import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/simpleLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    const errorId = this.state.errorId || `error_${Date.now()}`;
    
    logger.error('React Error Boundary caught an error', {
      errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    this.setState({
      errorInfo,
      errorId
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-reset after 30 seconds if not in development
    if (process.env.NODE_ENV !== 'development' && !this.resetTimeoutId) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.handleReset();
      }, 30000);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.handleReset();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error || !errorId) return;

    // Create a detailed error report
    const errorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      componentStack: errorInfo?.componentStack,
      additionalInfo: {
        props: Object.keys(this.props),
        state: this.state
      }
    };

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Report - ${errorId}`);
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo?.componentStack);
      console.error('Full Report:', errorReport);
      console.groupEnd();
    }

    // Send to error reporting service
    logger.error('User requested error report', errorReport);
    
    // Show user feedback
    alert('Error report sent. Our team has been notified and will investigate this issue.');
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback, isolate } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className={`error-boundary ${isolate ? 'error-boundary--isolated' : ''}`}>
          <div className="error-boundary__container">
            <div className="error-boundary__icon">
              <svg 
                width="64" 
                height="64" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                className="error-boundary__icon-svg"
              >
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <div className="error-boundary__content">
              <h2 className="error-boundary__title">
                Something went wrong
              </h2>
              
              <p className="error-boundary__message">
                We apologize for the inconvenience. An unexpected error occurred while rendering this component.
              </p>

              {process.env.NODE_ENV === 'development' && error && (
                <details className="error-boundary__details">
                  <summary>Error Details (Development Only)</summary>
                  <div className="error-boundary__error">
                    <p><strong>Error:</strong> {error.message}</p>
                    <p><strong>Error ID:</strong> {errorId}</p>
                    {error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="error-boundary__stack">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="error-boundary__actions">
                <button 
                  onClick={this.handleReset}
                  className="error-boundary__button error-boundary__button--primary"
                >
                  Try Again
                </button>
                
                <button 
                  onClick={() => window.location.reload()}
                  className="error-boundary__button error-boundary__button--secondary"
                >
                  Reload Page
                </button>

                <button 
                  onClick={this.handleReportError}
                  className="error-boundary__button error-boundary__button--tertiary"
                >
                  Report Issue
                </button>
              </div>

              <p className="error-boundary__support">
                If this problem persists, please contact support with error ID: <code>{errorId}</code>
              </p>
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: ${isolate ? '200px' : '50vh'};
              padding: 2rem;
              background: ${isolate ? '#fef2f2' : '#ffffff'};
              border: ${isolate ? '1px solid #fecaca' : 'none'};
              border-radius: ${isolate ? '0.5rem' : '0'};
            }

            .error-boundary--isolated {
              margin: 1rem 0;
            }

            .error-boundary__container {
              text-align: center;
              max-width: 600px;
              width: 100%;
            }

            .error-boundary__icon {
              margin-bottom: 1.5rem;
            }

            .error-boundary__icon-svg {
              width: 64px;
              height: 64px;
              color: #ef4444;
            }

            .error-boundary__title {
              font-size: 1.875rem;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 1rem;
            }

            .error-boundary__message {
              font-size: 1.125rem;
              color: #6b7280;
              margin-bottom: 2rem;
              line-height: 1.6;
            }

            .error-boundary__details {
              text-align: left;
              margin-bottom: 2rem;
              padding: 1rem;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 0.375rem;
            }

            .error-boundary__details summary {
              cursor: pointer;
              font-weight: 600;
              margin-bottom: 0.5rem;
            }

            .error-boundary__error {
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              font-size: 0.875rem;
            }

            .error-boundary__stack {
              background: #1f2937;
              color: #f9fafb;
              padding: 1rem;
              border-radius: 0.25rem;
              overflow-x: auto;
              white-space: pre-wrap;
              margin-top: 0.5rem;
            }

            .error-boundary__actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
              margin-bottom: 2rem;
            }

            .error-boundary__button {
              padding: 0.75rem 1.5rem;
              border-radius: 0.375rem;
              font-weight: 500;
              border: none;
              cursor: pointer;
              transition: all 0.2s;
            }

            .error-boundary__button--primary {
              background: #3b82f6;
              color: white;
            }

            .error-boundary__button--primary:hover {
              background: #2563eb;
            }

            .error-boundary__button--secondary {
              background: #6b7280;
              color: white;
            }

            .error-boundary__button--secondary:hover {
              background: #4b5563;
            }

            .error-boundary__button--tertiary {
              background: #f3f4f6;
              color: #374151;
              border: 1px solid #d1d5db;
            }

            .error-boundary__button--tertiary:hover {
              background: #e5e7eb;
            }

            .error-boundary__support {
              font-size: 0.875rem;
              color: #9ca3af;
            }

            .error-boundary__support code {
              background: #f3f4f6;
              padding: 0.25rem 0.5rem;
              border-radius: 0.25rem;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }
          `}</style>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<T extends {}>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error boundaries in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    // Create a synthetic error boundary-like experience
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.error('Manual error reported via useErrorHandler', {
      errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    // In a real app, you might want to show a toast notification
    // or update some global error state here
    console.error('Error caught by useErrorHandler:', error);
    
    return errorId;
  };
}