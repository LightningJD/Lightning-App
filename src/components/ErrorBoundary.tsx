import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  nightMode?: boolean;
  message?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

/**
 * Main Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 * Prevents white screen of death
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1
    });

    // Report to Sentry if configured
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { fallback, showDetails = false, nightMode = false } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          nightMode ? 'bg-[#0a0a0a]' : 'bg-gradient-to-br from-blue-50 to-white'
        }`}>
          <div className={`max-w-md w-full rounded-2xl shadow-xl p-8 ${
            nightMode ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white'
          }`}>
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                nightMode ? 'bg-red-500/20' : 'bg-red-100'
              }`}>
                <AlertTriangle className={`w-10 h-10 ${
                  nightMode ? 'text-red-400' : 'text-red-600'
                }`} />
              </div>
            </div>

            {/* Error Message */}
            <h1 className={`text-2xl font-bold text-center mb-2 ${
              nightMode ? 'text-white' : 'text-slate-900'
            }`}>
              Oops! Something went wrong
            </h1>

            <p className={`text-center mb-6 ${
              nightMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {this.props.message || "We're sorry, but something unexpected happened. Please try refreshing the page."}
            </p>

            {/* Error Details (Development Only) */}
            {showDetails && this.state.error && (
              <div className={`mb-6 p-4 rounded-lg text-sm font-mono overflow-auto max-h-40 ${
                nightMode ? 'bg-black/50 text-red-400' : 'bg-red-50 text-red-800'
              }`}>
                <p className="font-semibold mb-2">Error Details:</p>
                <p>{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer hover:underline">Component Stack</summary>
                    <pre className="mt-2 text-xs whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  nightMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  nightMode
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              <button
                onClick={this.handleGoHome}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  nightMode
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Home className="w-4 h-4" />
                Go to Home
              </button>
            </div>

            {/* Report Bug Link */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  // This will be handled by the BugReportDialog
                  window.dispatchEvent(new CustomEvent('openBugReport', {
                    detail: {
                      error: this.state.error?.toString(),
                      errorInfo: this.state.errorInfo
                    }
                  }));
                }}
                className={`text-sm flex items-center justify-center gap-2 mx-auto ${
                  nightMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bug className="w-4 h-4" />
                Report this issue
              </button>
            </div>

            {/* Error Count (if multiple errors) */}
            {this.state.errorCount > 1 && (
              <p className={`text-xs text-center mt-4 ${
                nightMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                This error has occurred {this.state.errorCount} times
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Component-specific Error Boundary
 * Use this for individual components that might fail
 */
interface ComponentErrorBoundaryProps {
  children: ReactNode;
  name?: string;
  nightMode?: boolean;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
}

export class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, ComponentErrorBoundaryState> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.name || 'Component'}:`, error, errorInfo);

    // Report to Sentry with component context
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          component: this.props.name || 'Unknown'
        },
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const { name = 'This component', nightMode = false } = this.props;

      return (
        <div className={`p-6 rounded-xl border ${
          nightMode
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className={`w-5 h-5 ${
              nightMode ? 'text-red-400' : 'text-red-600'
            }`} />
            <h3 className={`font-semibold ${
              nightMode ? 'text-red-400' : 'text-red-800'
            }`}>
              {name} failed to load
            </h3>
          </div>
          <p className={`text-sm ${
            nightMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Please try refreshing the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              nightMode
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white hover:bg-red-50 text-red-700'
            }`}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Async Error Boundary Hook
 * Use this to catch errors in async operations
 */
export const useAsyncError = () => {
  const [, setError] = React.useState();
  return React.useCallback(
    (error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
};

/**
 * withErrorBoundary HOC
 * Wrap any component to add error boundary protection
 */
export const withErrorBoundary = (Component, errorBoundaryProps) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ErrorBoundary;