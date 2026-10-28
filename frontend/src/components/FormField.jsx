import React from 'react';

export default function FormField({
  id,
  label,
  required = false,
  error = null,
  hint = null,
  children,
  className = '',
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
      )}

      {React.isValidElement(children)
        ? React.cloneElement(children, {
            id,
            'aria-invalid': !!error,
            'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
            className: `${children.props.className || ''} ${error ? 'is-invalid' : ''}`.trim(),
          })
        : children}

      {hint && !error && (
        <span id={hintId} className="form-hint">
          {hint}
        </span>
      )}

      {error && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
