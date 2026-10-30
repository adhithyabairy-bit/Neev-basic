import React from 'react';
import { IconAlertTriangle, IconRefreshCw } from './Icons';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="card"
          style={{
            padding: 'var(--space-6)',
            margin: 'var(--space-4) 0',
            border: '1.5px solid var(--danger-border)',
            backgroundColor: '#FFF9F9',
            textAlign: 'center',
          }}
          role="alert"
        >
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', marginBottom: 'var(--space-3)' }}>
            <IconAlertTriangle size={32} color="var(--danger)" />
          </div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--main-text)', marginBottom: '8px' }}>
            Section Display Error
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--secondary-text)', maxWidth: '500px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={this.handleReset}
          >
            <IconRefreshCw size={14} />
            <span>Reload Section</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
