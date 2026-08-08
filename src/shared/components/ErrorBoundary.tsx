import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to console in all environments
    console.error('[ICDP] Unhandled error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="max-w-lg w-full text-center">
          {/* Error icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Something went wrong
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            An unexpected error occurred. Please try reloading the page or
            return to the home screen.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-primary"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="btn btn-secondary"
            >
              Go Home
            </button>
          </div>

          {/* Dev-only error details */}
          {isDev && this.state.error && (
            <details className="text-left bg-slate-100 rounded-lg p-4 border border-slate-200">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600 select-none">
                Error Details (Development Only)
              </summary>
              <pre className="mt-3 text-xs text-red-700 whitespace-pre-wrap break-words overflow-auto max-h-64">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
