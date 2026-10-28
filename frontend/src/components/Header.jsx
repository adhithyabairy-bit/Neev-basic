import React from 'react';
import { IconUser, IconLogOut, IconLayers } from './Icons';

export default function Header({
  currentStep = 1,
  totalSteps = 9,
  currentUser = null,
  onLogout,
  onNavigateAuth,
  onNavigateDashboard,
}) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <header className="app-header" role="banner">
      <div className="header-inner">
        <a href="#main-content" className="brand-section" aria-label="Neev Home">
          <div className="brand-logo-icon" aria-hidden="true">
            N
          </div>
          <div className="brand-text-group">
            <span className="brand-name">Neev</span>
            <span className="brand-subtitle">Learning gap analysis for teachers</span>
          </div>
        </a>

        <div className="header-status-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {onNavigateDashboard && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onNavigateDashboard}
              title="Return to Teacher Dashboard"
              style={{ padding: '5px 12px' }}
            >
              <IconLayers size={14} />
              <span>Dashboard</span>
            </button>
          )}

          <span className="step-indicator-badge" aria-label={`Current Step: ${currentStep} of ${totalSteps}`}>
            <span>Step {currentStep} of {totalSteps}</span>
          </span>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--light-orange-subtle)',
                  border: '1px solid var(--border-color)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--main-text)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                <IconUser size={14} color="var(--primary-orange)" />
                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onLogout}
                aria-label="Sign out of teacher account"
                title="Sign Out"
                style={{ padding: '6px 10px' }}
              >
                <IconLogOut size={14} />
                <span className="hide-on-mobile">Sign Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                Guest Demo
              </span>
              {onNavigateAuth && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onNavigateAuth}
                  style={{ padding: '6px 12px' }}
                >
                  <IconUser size={14} />
                  <span>Teacher Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-progress-track" aria-hidden="true">
        <div
          className="header-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </header>
  );
}
