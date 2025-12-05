/**
 * ModuleErrorBoundary
 *
 * Error boundary for card modules to prevent individual module failures
 * from breaking the entire card. Displays a fallback UI when errors occur.
 */

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ModuleErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;

  /** Module ID for error reporting */
  moduleId?: string;

  /** Module type for error reporting */
  moduleType?: string;

  /** Optional custom fallback component */
  fallback?: ReactNode;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error boundary component for individual card modules
 */
export class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error(
      `Error in module ${this.props.moduleId || 'unknown'} (${this.props.moduleType || 'unknown'}):`,
      error,
      errorInfo
    );

    this.setState({ error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          className="module-error-fallback"
          style={{
            padding: '8px',
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: '4px',
            color: '#e74c3c',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            Module Error
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            {this.props.moduleType || 'Unknown'} module failed to render
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: '8px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.75rem' }}>
                Error details
              </summary>
              <pre
                style={{
                  marginTop: '4px',
                  fontSize: '0.7rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModuleErrorBoundary;
