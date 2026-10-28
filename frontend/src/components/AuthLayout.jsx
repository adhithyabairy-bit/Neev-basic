import React from 'react';
import { isFirebaseConfigured, getMissingFirebaseConfig } from '../services/authService';
import { IconInfo, IconCheckCircle, IconArrowRight, IconSparkles } from './Icons';

export default function AuthLayout({
  children,
  onBypassToDemo,
}) {
  const isConfigured = isFirebaseConfigured();
  const missingKeys = getMissingFirebaseConfig();

  return (
    <div className="auth-wrapper" role="main">
      <div className="auth-container">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-icon" aria-hidden="true">
            N
          </div>
          <h1 className="auth-brand-name">Neev</h1>
          <p className="auth-brand-tagline">AI-Powered Learning Gap Analysis Platform</p>
        </div>

        {/* Auth Content Card */}
        <div className="auth-card">
          {children}
        </div>

        {/* Firebase Config Notice & Reviewer Exploration Box */}
        <div className="auth-demo-banner" role="region" aria-label="Authentication Configuration Status">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="auth-demo-badge">
              {isConfigured ? (
                <>
                  <IconCheckCircle size={14} color="var(--success)" />
                  <span style={{ color: 'var(--success-dark)' }}>Firebase Connected</span>
                </>
              ) : (
                <>
                  <IconInfo size={14} color="var(--warning)" />
                  <span>Firebase Config Required</span>
                </>
              )}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}>Frontend Auth Gateway</span>
          </div>

          <p className="auth-demo-text">
            {isConfigured ? (
              'Authentication is linked to your configured Firebase project. All logins and registrations are securely authenticated.'
            ) : (
              <>
                Firebase variables (<code>{missingKeys.slice(0, 2).join(', ')}</code>) are currently unset in <code>.env</code>.
                Per project criteria, fake logins are prevented. You may explore all 10 workflow stages in demonstration mode below.
              </>
            )}
          </p>

          {onBypassToDemo && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onBypassToDemo}
              style={{ marginTop: '4px', alignSelf: 'flex-start' }}
            >
              <IconSparkles size={14} />
              <span>Explore Teacher Dashboard & Workflow (Demo Mode)</span>
              <IconArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
