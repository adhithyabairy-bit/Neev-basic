import React, { useState } from 'react';

export default function PublicHeader({ activePath = '/', onNavigate, onLaunchApp }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'hero', path: '/', label: 'Home' },
    { id: 'features', path: '/features', label: 'Features' },
    { id: 'how-it-works', path: '/how-it-works', label: 'How It Works' },
    { id: 'curriculum', path: '/curriculum-coverage', label: 'Curriculum' },
    { id: 'faq', path: '/faq', label: 'FAQ' },
    { id: 'about', path: '/about', label: 'About Us' },
    { id: 'contact', path: '/contact', label: 'Contact' },
  ];

  const handleNavClick = (item, e) => {
    if (e) e.preventDefault();
    setIsMobileMenuOpen(false);

    const elem = document.getElementById(item.id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `#${item.id}`);
      }
    } else {
      onNavigate(item.path);
    }
  };

  return (
    <header className="pub-header" role="banner">
      <div className="pub-header-inner">
        <a
          href="/"
          className="pub-brand"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick({ id: 'hero', path: '/' });
          }}
          aria-label="Neev Home"
        >
          <div className="pub-logo-mark">N</div>
          <span className="pub-brand-text">NEEV</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="pub-nav" role="navigation" aria-label="Main Navigation">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="pub-nav-link"
              onClick={(e) => handleNavClick(item, e)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Header Actions: Always Login & Create Account */}
        <div className="pub-header-actions">
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
            <span>Create Account</span> &rarr;
          </button>
        </div>

        {/* Mobile 3-Lines (Hamburger) Toggle Button */}
        <button
          type="button"
          className="pub-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="pub-mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div className="pub-mobile-drawer-links">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="pub-mobile-nav-link"
                onClick={(e) => handleNavClick(item, e)}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="pub-mobile-drawer-actions">
            <button
              type="button"
              className="pub-btn-secondary pub-mobile-action-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate('/login');
              }}
            >
              Login
            </button>
            <button
              type="button"
              className="pub-btn-primary pub-mobile-action-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate('/register');
              }}
            >
              <span>Create Account</span> &rarr;
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
