import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'var(--bg-body)', padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 500 }}>
            <div className="stat-icon danger" style={{ margin: '0 auto 1.5rem', width: 80, height: 80 }}>
              <AlertTriangle className="h-10 w-10" />
            </div>
            <h2 style={{ marginBottom: '1rem' }}>خطایی رخ داد</h2>
            <p style={{ opacity: 0.7, marginBottom: '1.5rem', direction: 'ltr', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              {this.state.error?.message}
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" /> بارگذاری مجدد
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
