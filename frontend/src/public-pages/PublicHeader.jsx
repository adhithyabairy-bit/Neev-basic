import React from 'react';

export default function PublicHeader({ activePath = '/', onNavigate, onLaunchApp }) {
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

        <div className="pub-header-actions">
          <button
            type="button"
            className="pub-btn-launch"
            onClick={onLaunchApp}
            title="Open Neev Teacher Workspace"
          >
            <span>Launch App</span> &rarr;
          </button>
        </div>
      </div>
    </header>
  );
}

