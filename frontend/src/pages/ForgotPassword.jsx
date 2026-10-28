import React, { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import AuthForm from '../components/AuthForm';
import FormField from '../components/FormField';
import { sendPasswordReset } from '../services/authService';

export default function ForgotPassword({
  onNavigateLogin,
  onBypassToDemo,
}) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [fieldError, setFieldError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setFieldError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setFieldError('Please enter a valid email address.');
      return;
    }

    setFieldError(null);
    setIsLoading(true);

    const result = await sendPasswordReset(emailTrimmed);
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage(result.message || 'Password reset link sent! Please check your email inbox.');
    } else {
      setFormError(result.error);
    }
  };

  return (
    <AuthLayout onBypassToDemo={onBypassToDemo}>
      <div className="auth-card-header">
        <h2 className="auth-title">Reset Password</h2>
        <p className="auth-subtitle">
          Enter your registered teacher email to receive instructions for resetting your password.
        </p>
      </div>

      <AuthForm
        onSubmit={handleSubmit}
        submitLabel="Send Reset Link"
        isLoading={isLoading}
        error={formError}
        successMessage={successMessage}
      >
        <FormField
          id="reset-email"
          label="Registered email address"
          required
          error={fieldError}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            placeholder="teacher@school.edu"
            className="form-input"
            autoComplete="email"
            required
          />
        </FormField>
      </AuthForm>

      <div className="auth-footer-prompt">
        <span>Remembered your password? </span>
        <button
          type="button"
          className="auth-link"
          onClick={onNavigateLogin}
          style={{ fontSize: 'inherit' }}
        >
          Back to sign in
        </button>
      </div>
    </AuthLayout>
  );
}
