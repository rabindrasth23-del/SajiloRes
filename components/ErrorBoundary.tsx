"use client";

import { Component, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-cloud rounded-lg border border-mist m-4">
          <AlertCircle className="w-10 h-10 text-immediate mb-3" />
          <h2 className="text-lg font-bold text-ink mb-1">Something went wrong</h2>
          <p className="text-sm text-ink/70 mb-4 max-w-md text-center">
            The application encountered an unexpected error. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-navy text-white rounded-md text-sm font-semibold hover:bg-navy/90 transition-colors focus-ring"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
