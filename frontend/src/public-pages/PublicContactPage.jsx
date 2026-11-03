import React, { useState } from 'react';
import PublicLayout from './PublicLayout';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PublicContactPage({ onNavigate, onLaunchApp, currentUser = null }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Spam honeypot trap

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState({ name: '', email: '' });

  const validate = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      errors.name = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!trimmedMessage) {
      errors.message = 'Please provide a brief message.';
    } else if (trimmedMessage.length < 5) {
      errors.message = 'Message must be at least 5 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      school: school.trim(),
      message: message.trim(),
      hp_field: honeypot, // Honeypot field
    };

    // Try relative endpoint first (works in production Vercel & proxy), fallback to port 5000 in dev
    const endpoints = ['/api/contact', 'http://localhost:5000/api/contact'];
    let success = false;
    let errorMessage = 'Unable to send message. Please check your internet connection or email us directly.';

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          success = true;
          setConfirmedDetails({ name: payload.name, email: payload.email });
          setSubmitted(true);
          // Clear inputs after successful submission
          setName('');
          setEmail('');
          setSchool('');
          setMessage('');
          setHoneypot('');
          setFieldErrors({});
          break;
        } else {
          errorMessage = data.error || `Server responded with status ${response.status}`;
        }
      } catch (err) {
        // Attempt next endpoint if network fails
      }
    }

    setIsSubmitting(false);

    if (!success) {
      setFormError(errorMessage);
    }
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Neev Support & Institutional Inquiries',
    description: 'Get in touch with the Neev educational team for technical support, school onboarding, or institutional inquiries.',
    url: 'https://neev-basic-seven.vercel.app/contact',
  };

  return (
    <PublicLayout
      title="Contact Us — School Onboarding & Teacher Support"
      description="Connect with the Neev platform team for institutional onboarding, pilot program requests, or technical support."
      canonicalUrl="https://neev-basic-seven.vercel.app/contact"
      structuredData={structuredData}
      activePath="/contact"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
      currentUser={currentUser}
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
              <div style={{ fontSize: '40px', marginBottom: '12px', color: '#16a34a' }}>&#10003;</div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
                Thank You, {confirmedDetails.name}!
              </h3>
              <p style={{ color: 'var(--pub-slate)', fontSize: '15px', lineHeight: 1.6 }}>
                Your message has been received and securely stored. Our team will review your inquiry and follow up at <strong>{confirmedDetails.email}</strong> shortly.
              </p>
              <button
                type="button"
                className="pub-btn-secondary"
                onClick={() => setSubmitted(false)}
                style={{ marginTop: '20px' }}
              >
                Send Another Inquiry &rarr;
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {formError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#991b1b',
                    fontSize: '14px',
                    marginBottom: '18px',
                  }}
                  role="alert"
                >
                  <strong>Submission Error:</strong> {formError}
                </div>
              )}

              {/* Spam Honeypot Trap (Hidden from users) */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <label htmlFor="contact-hp">Leave this field blank</label>
                <input
                  id="contact-hp"
                  type="text"
                  name="hp_field"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex="-1"
                  autoComplete="off"
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  Your Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: null }));
                  }}
                  placeholder="e.g. Priya Sharma"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.name ? '#dc2626' : 'var(--pub-border)'}`,
                    fontSize: '14.5px',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.name && (
                  <p style={{ color: '#dc2626', fontSize: '12.5px', marginTop: '4px' }}>{fieldErrors.name}</p>
                )}
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  Email Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
                  }}
                  placeholder="teacher@school.edu.in"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.email ? '#dc2626' : 'var(--pub-border)'}`,
                    fontSize: '14.5px',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.email && (
                  <p style={{ color: '#dc2626', fontSize: '12.5px', marginTop: '4px' }}>{fieldErrors.email}</p>
                )}
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  School or Institution Name (Optional)
                </label>
                <input
                  type="text"
                  value={school}
                  disabled={isSubmitting}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="e.g. Delhi Public School, Hyderabad"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--pub-border)',
                    fontSize: '14.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  How can we help your classroom? <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (fieldErrors.message) setFieldErrors((prev) => ({ ...prev, message: null }));
                  }}
                  placeholder="Tell us about the grades and subjects you teach, or what challenges you face with diagnostic assessment..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.message ? '#dc2626' : 'var(--pub-border)'}`,
                    fontSize: '14.5px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                {fieldErrors.message && (
                  <p style={{ color: '#dc2626', fontSize: '12.5px', marginTop: '4px' }}>{fieldErrors.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="pub-btn-primary"
                disabled={isSubmitting}
                style={{ width: '100%', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'Sending Message...' : 'Send Message →'}
              </button>
            </form>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '36px', textAlign: 'center' }}>
          <div className="pub-card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>Direct Support</h4>
            <a
              href="mailto:adhithyabairy@gmail.com"
              style={{ fontSize: '13.5px', color: 'var(--pub-orange)', textDecoration: 'none', fontWeight: 600 }}
            >
              adhithyabairy@gmail.com
            </a>
          </div>
          <div className="pub-card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>Pilot Programs</h4>
            <a
              href="mailto:adhithyabairy@gmail.com"
              style={{ fontSize: '13.5px', color: 'var(--pub-orange)', textDecoration: 'none', fontWeight: 600 }}
            >
              adhithyabairy@gmail.com
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
