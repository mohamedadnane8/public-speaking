import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center bg-[#FDF6F0] px-6 text-center"
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          <h1 className="mb-2 text-2xl font-semibold text-[#1a1a1a]">
            Something went wrong
          </h1>
          <p className="mb-6 max-w-md text-sm text-[#1a1a1a]/60">
            An unexpected error occurred. Please try again.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mb-6 max-w-lg overflow-auto rounded bg-[#1a1a1a]/5 p-4 text-left text-xs text-[#1a1a1a]/70">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-none border border-[#1a1a1a] bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-[#FDF6F0] transition-colors hover:bg-[#1a1a1a]/90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
