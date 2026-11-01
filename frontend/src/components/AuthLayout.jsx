import React from 'react';

export default function AuthLayout({ children }) {
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
      </div>
    </div>
  );
}
