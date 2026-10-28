import React, { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import AuthForm from '../components/AuthForm';
import FormField from '../components/FormField';
import { registerWithEmail } from '../services/authService';
import { IconEye, IconEyeOff } from '../components/Icons';

export default function Register({
  onAuthSuccess,
  onNavigateLogin,
  onBypassToDemo,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    const nameTrimmed = name.trim();
    const emailTrimmed = email.trim();

    if (!nameTrimmed) {
      errors.name = 'Teacher full name is required.';
    }

    if (!emailTrimmed) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
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

    setIsLoading(true);

    const result = await registerWithEmail(name, email, password);
    setIsLoading(false);

    if (result.success) {
      if (onAuthSuccess) {
        onAuthSuccess(result.user);
      }
    } else {
      setFormError(result.error);
    }
  };

  return (
    <AuthLayout onBypassToDemo={onBypassToDemo}>
      <div className="auth-card-header">
        <h2 className="auth-title">Create Teacher Account</h2>
        <p className="auth-subtitle">
          Start diagnosing student learning gaps with AI-powered root-cause analysis.
        </p>
      </div>

      <AuthForm
        onSubmit={handleSubmit}
        submitLabel="Create Account"
        isLoading={isLoading}
        error={formError}
      >
        <FormField
          id="reg-name"
          label="Teacher full name"
          required
          error={fieldErrors.name}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: null }));
            }}
            placeholder="e.g. Mrs. Priya Sharma"
            className="form-input"
            autoComplete="name"
            required
          />
        </FormField>

        <FormField
          id="reg-email"
          label="Email address"
          required
          error={fieldErrors.email}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
            }}
            placeholder="teacher@school.edu"
            className="form-input"
            autoComplete="email"
            required
          />
        </FormField>

        <FormField
          id="reg-password"
          label="Password"
          required
          hint="Minimum 6 characters"
          error={fieldErrors.password}
        >
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
              }}
              placeholder="Create a strong password"
              className="form-input"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </FormField>

        <FormField
          id="reg-confirm-password"
          label="Confirm password"
          required
          error={fieldErrors.confirmPassword}
        >
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: null }));
              }}
              placeholder="Confirm your password"
              className="form-input"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </FormField>
      </AuthForm>

      <div className="auth-footer-prompt">
        <span>Already have an account? </span>
        <button
          type="button"
          className="auth-link"
          onClick={onNavigateLogin}
          style={{ fontSize: 'inherit' }}
        >
          Sign in
        </button>
      </div>
    </AuthLayout>
  );
}
