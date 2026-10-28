import React, { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import AuthForm from '../components/AuthForm';
import FormField from '../components/FormField';
import { loginWithEmail } from '../services/authService';
import { IconEye, IconEyeOff } from '../components/Icons';

export default function Login({
  onAuthSuccess,
  onNavigateRegister,
  onNavigateForgotPassword,
  onBypassToDemo,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    const emailTrimmed = email.trim();

    if (!emailTrimmed) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
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

    const result = await loginWithEmail(email, password, rememberMe);
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
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue your learning gap analysis.</p>
      </div>

      <AuthForm
        onSubmit={handleSubmit}
        submitLabel="Sign In"
        isLoading={isLoading}
        error={formError}
      >
        <FormField
          id="login-email"
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
          id="login-password"
          label="Password"
          required
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
              placeholder="Enter your password"
              className="form-input"
              autoComplete="current-password"
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

        {/* Options Row */}
        <div className="auth-options-row">
          <label className="checkbox-label" htmlFor="remember-me">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            className="auth-link"
            onClick={onNavigateForgotPassword}
          >
            Forgot password?
          </button>
        </div>
      </AuthForm>

      <div className="auth-footer-prompt">
        <span>Don't have a teacher account? </span>
        <button
          type="button"
          className="auth-link"
          onClick={onNavigateRegister}
          style={{ fontSize: 'inherit' }}
        >
          Create teacher account
        </button>
      </div>
    </AuthLayout>
  );
}
