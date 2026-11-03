import React from 'react';

export default function PublicHeader({ activePath = '/', onNavigate, onLaunchApp, currentUser = null }) {
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/features', label: 'Features' },
    { path: '/how-it-works', label: 'How It Works' },
    { path: '/curriculum-coverage', label: 'Curriculum' },
    { path: '/faq', label: 'FAQ' },
    { path: '/about', label: 'About Us' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <header className="pub-header" role="banner">
      <div className="pub-header-inner">
        <a
          href="/"
          className="pub-brand"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          aria-label="Neev Home"
        >
          <div className="pub-logo-mark">N</div>
          <span className="pub-brand-text">NEEV</span>
        </a>

        <nav className="pub-nav" role="navigation" aria-label="Main Navigation">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`pub-nav-link ${activePath === item.path ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.path);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="pub-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentUser ? (
            <button
              type="button"
              className="pub-btn-launch"
              onClick={() => onNavigate('/app')}
              title="Go to Teacher Dashboard"
            >
              <span>Go to Dashboard</span> &rarr;
            </button>
          ) : (
            <>
              <button
                type="button"
                className="pub-btn-text"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--pub-slate)',
                  fontWeight: '600',
                  fontSize: '14.5px',
                  cursor: 'pointer',
                  padding: '8px 14px',
                }}
                onClick={() => onNavigate('/login')}
                title="Log in to your account"
              >
                Login
              </button>
              <button
                type="button"
                className="pub-btn-launch"
                onClick={() => onNavigate('/register')}
                title="Create a free teacher account"
              >
                <span>Get Started</span> &rarr;
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

