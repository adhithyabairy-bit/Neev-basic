import React from 'react';

export default function PublicFooter({ onNavigate, onLaunchApp }) {
  return (
    <footer className="pub-footer" role="contentinfo">
      <div className="pub-footer-inner">
        <div className="pub-footer-col">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div className="pub-logo-mark" style={{ width: '28px', height: '28px', fontSize: '15px' }}>N</div>
            <strong style={{ fontSize: '18px', letterSpacing: '-0.5px' }}>NEEV</strong>
          </div>
          <p style={{ fontSize: '13.5px', color: '#B5B2A8', maxWidth: '340px', lineHeight: 1.6 }}>
            Empowering Indian school teachers to diagnose foundational prerequisite gaps from handwritten student answer sheets and accelerate genuine conceptual mastery.
          </p>
        </div>

        <div className="pub-footer-col">
          <h4>Platform</h4>
          <ul className="pub-footer-links">
            <li><a onClick={() => onNavigate('/features')}>Features</a></li>
            <li><a onClick={() => onNavigate('/how-it-works')}>How It Works</a></li>
            <li><a onClick={() => onNavigate('/curriculum-coverage')}>Curriculum Coverage</a></li>
            <li><a onClick={onLaunchApp}>Teacher Dashboard</a></li>
          </ul>
        </div>

        <div className="pub-footer-col">
          <h4>Resources</h4>
          <ul className="pub-footer-links">
            <li><a onClick={() => onNavigate('/faq')}>Frequently Asked Questions</a></li>
            <li><a onClick={() => onNavigate('/about')}>About Neev</a></li>
            <li><a onClick={() => onNavigate('/contact')}>Contact Support</a></li>
            <li><a href="/llms.txt" target="_blank" rel="noopener noreferrer">AI Transparency (llms.txt)</a></li>
          </ul>
        </div>

        <div className="pub-footer-col">
          <h4>Trust & Legal</h4>
          <ul className="pub-footer-links">
            <li><a onClick={() => onNavigate('/privacy')}>Privacy Policy</a></li>
            <li><a onClick={() => onNavigate('/contact')}>Institutional Onboarding</a></li>
            <li><a onClick={() => onNavigate('/about')}>Pedagogical Methodology</a></li>
          </ul>
        </div>
      </div>

      <div className="pub-footer-bottom">
        <div>&copy; {new Date().getFullYear()} Neev Educational Technologies. All rights reserved.</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>CBSE &amp; State Board Aligned</span>
          <span>&bull;</span>
          <span>Zero Student Data Sharing</span>
        </div>
      </div>
    </footer>
  );
}

