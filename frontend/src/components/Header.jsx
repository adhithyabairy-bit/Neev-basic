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
            <span className="brand-subtitle hide-on-mobile">Learning gap analysis for teachers</span>
          </div>
        </a>

        <div className="header-status-group">
          {onNavigateDashboard && (
            <button
              type="button"
              className="btn btn-secondary btn-sm header-dashboard-btn"
              onClick={onNavigateDashboard}
              title="Return to Teacher Dashboard"
            >
              <IconLayers size={14} />
              <span className="hide-on-mobile">Dashboard</span>
            </button>
          )}

          <span className="step-indicator-badge" aria-label={`Current Step: ${currentStep} of ${totalSteps}`}>
            <span className="hide-on-mobile">Step {currentStep} of {totalSteps}</span>
            <span className="show-on-mobile-inline">Step {currentStep}/{totalSteps}</span>
          </span>

          {currentUser ? (
            <div className="header-user-group">
              <div className="header-user-pill" title={currentUser.displayName || currentUser.email}>
                <IconUser size={14} color="var(--primary-orange)" />
                <span className="header-user-email">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm header-logout-btn"
                onClick={onLogout}
                aria-label="Sign out of teacher account"
                title="Sign Out"
              >
                <IconLogOut size={14} />
                <span className="hide-on-mobile">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="header-user-group">
              <span className="badge badge-neutral hide-on-mobile" style={{ fontSize: '11px' }}>
                Guest Demo
              </span>
              {onNavigateAuth && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onNavigateAuth}
                >
                  <IconUser size={14} />
                  <span className="hide-on-mobile">Teacher Sign In</span>
                  <span className="show-on-mobile-inline">Sign In</span>
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
