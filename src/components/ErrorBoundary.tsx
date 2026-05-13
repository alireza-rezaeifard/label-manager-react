import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'var(--bg-body)', padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 500 }}>
            <div className="stat-icon danger" style={{ margin: '0 auto 1.5rem', width: 80, height: 80, fontSize: '2.5rem' }}>
              <i className="ti ti-alert-triangle"></i>
            </div>
            <h2 style={{ marginBottom: '1rem' }}>خطایی رخ داد</h2>
            <p style={{ opacity: 0.7, marginBottom: '1.5rem', direction: 'ltr', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              {this.state.error?.message}
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              <i className="ti ti-refresh"></i> بارگذاری مجدد
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
