import React, { useState } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactSection({ onNavigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

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
      hp_field: honeypot,
    };

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
        // Attempt next endpoint
      }
    }

    setIsSubmitting(false);

    if (!success) {
      setFormError(errorMessage);
    }
  };

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div className="pub-hero-badge">Get In Touch</div>
        <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
          Contact Our Academic Team
        </h2>
        <p style={{ color: 'var(--pub-slate)', fontSize: '16.5px' }}>
          Whether you are a teacher looking to trial Neev in your classroom or an academic coordinator planning a school-wide deployment, we’d love to connect.
        </p>
      </div>

      <div className="pub-card" style={{ padding: '32px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(30, 142, 90, 0.1)',
                color: 'var(--pub-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 16px',
              }}
            >
              &#10003;
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
              Message Received, {confirmedDetails.name}!
            </h3>
            <p style={{ color: 'var(--pub-slate)', fontSize: '15px', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              Thank you for reaching out. We have sent a confirmation receipt to <strong>{confirmedDetails.email}</strong>. Our team will review your inquiry and follow up within one business day.
            </p>
            <button
              type="button"
              className="pub-btn-secondary"
              onClick={() => setSubmitted(false)}
            >
              Send Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {formError && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FDE8E8',
                  border: '1px solid #F5B8B9',
                  borderRadius: '8px',
                  color: '#A92628',
                  fontSize: '14px',
                  marginBottom: '20px',
                }}
              >
                {formError}
              </div>
            )}

            {/* Honeypot anti-spam trap */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label htmlFor="sec-hp-field">Leave empty</label>
              <input
                id="sec-hp-field"
                type="text"
                tabIndex="-1"
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  Full Name <span style={{ color: 'var(--pub-orange)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.name ? '#D9383A' : 'var(--pub-border)'}`,
                    fontSize: '14.5px',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.name && (
                  <span style={{ fontSize: '12px', color: '#D9383A', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  Work / School Email <span style={{ color: 'var(--pub-orange)' }}>*</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. p.sharma@dpsdelhi.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.email ? '#D9383A' : 'var(--pub-border)'}`,
                    fontSize: '14.5px',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.email && (
                  <span style={{ fontSize: '12px', color: '#D9383A', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  School or Institution Name (Optional)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Delhi Public School, R.K. Puram"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '6px' }}>
                  Your Message or Question <span style={{ color: 'var(--pub-orange)' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Tell us about your school grade levels, current assessment challenges, or questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.message ? '#D9383A' : 'var(--pub-border)'}`,
                    fontSize: '14.5px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.message && (
                  <span style={{ fontSize: '12px', color: '#D9383A', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="pub-btn-primary"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.75 : 1,
                }}
              >
                {isSubmitting ? (
                  <span>Sending Message...</span>
                ) : (
                  <>
                    <span>Send Message to Team</span> &rarr;
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13.5px', color: 'var(--pub-muted)' }}>
        Direct Academic Support Email: <a href="mailto:contact@neev.education" style={{ color: 'var(--pub-orange)', fontWeight: '700' }}>contact@neev.education</a>
      </div>
    </div>
  );
}

