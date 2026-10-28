import React from 'react';
import { IconAlertCircle, IconCheckCircle } from './Icons';

export default function AuthForm({
  onSubmit,
  submitLabel = 'Submit',
  isLoading = false,
  error = null,
  successMessage = null,
  children,
}) {
  return (
    <form onSubmit={onSubmit} className="auth-form" noValidate>
      {error && (
        <div className="auth-alert auth-alert-error" role="alert" aria-live="polite">
          <IconAlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="auth-alert auth-alert-success" role="status" aria-live="polite">
          <IconCheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{successMessage}</span>
        </div>
      )}

      {children}

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={isLoading}
        style={{ width: '100%', marginTop: 'var(--space-2)' }}
      >
        {isLoading ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="animate-spin"
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #FFFFFF',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
            <span>Authenticating...</span>
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
