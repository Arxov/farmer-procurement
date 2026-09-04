import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(
      `Unhandled React component error in ${this.props.sectionName || 'Global Boundary'}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        section: this.props.sectionName,
      }
    );
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isSection = Boolean(this.props.sectionName);

      return (
        <div
          role="alert"
          className={`bg-red-50 border border-red-200 text-red-900 rounded-xl p-5 shadow-xs ${
            isSection ? 'my-4' : 'max-w-md mx-auto my-12 text-center'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl" aria-hidden="true">⚠️</span>
            <h2 className="text-base font-bold text-red-800">
              {isSection
                ? `Failed to load ${this.props.sectionName}`
                : 'Something went wrong'}
            </h2>
          </div>
          <p className="text-xs text-red-700 mb-4 leading-relaxed">
            {this.state.error?.message ||
              'An unexpected client error occurred. Our engineers have been alerted.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Try Again
            </button>
            {!isSection && (
              <a
                href="/"
                className="px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-red-100 text-red-800 border border-red-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Go to Home
              </a>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
