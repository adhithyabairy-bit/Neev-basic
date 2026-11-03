import React, { useState } from 'react';
import PublicLayout from './PublicLayout';

export default function PublicContactPage({ onNavigate, onLaunchApp }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitted(true);
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Neev Support & Institutional Inquiries',
    description: 'Get in touch with the Neev educational team for technical support, school onboarding, or institutional inquiries.',
    url: 'https://neev.app/contact',
  };

  return (
    <PublicLayout
      title="Contact Us — School Onboarding & Teacher Support"
      description="Connect with the Neev platform team for institutional onboarding, pilot program requests, or technical support."
      canonicalUrl="https://neev.app/contact"
      structuredData={structuredData}
      activePath="/contact"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
    >
      <div className="pub-container" style={{ maxWidth: '750px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="pub-hero-badge">Get In Touch</div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
            We’re Here to Help
          </h1>
          <p style={{ color: 'var(--pub-slate)', fontSize: '16.5px' }}>
            Whether you are a teacher looking to trial Neev in your section, or an academic coordinator planning a school-wide deployment, we’d love to connect.
          </p>
        </div>

        <div className="pub-card">
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#10003;</div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
                Thank You, {name}!
              </h3>
              <p style={{ color: 'var(--pub-slate)', fontSize: '15px', lineHeight: 1.6 }}>
                Your message has been received. Our academic team will respond to <strong>{email}</strong> within one working day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--pub-border)', fontSize: '14.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu.in"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--pub-border)', fontSize: '14.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  School or Institution Name
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="e.g. Delhi Public School, Hyderabad"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--pub-border)', fontSize: '14.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  How can we help your classroom?
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about the grades and subjects you teach, or what challenges you face with diagnostic assessment..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--pub-border)', fontSize: '14.5px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <button type="submit" className="pub-btn-primary" style={{ width: '100%' }}>
                Send Message &rarr;
              </button>
            </form>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '36px', textAlign: 'center' }}>
          <div className="pub-card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>Direct Support</h4>
            <span style={{ fontSize: '13.5px', color: 'var(--pub-orange)' }}>support@neev.app</span>
          </div>
          <div className="pub-card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>Pilot Programs</h4>
            <span style={{ fontSize: '13.5px', color: 'var(--pub-orange)' }}>schools@neev.app</span>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

