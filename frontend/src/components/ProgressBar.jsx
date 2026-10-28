import React from 'react';

export default function ProgressBar({
  value = 1,
  max = 9,
  min = 1,
  showLabel = false,
  className = '',
}) {
  const percentage = Math.min(100, Math.max(0, Math.round(((value - min) / (max - min || 1)) * 100)));

  return (
    <div className={`progress-bar-wrapper ${className}`} style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
          <span>Step {value} of {max}</span>
          <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--dark-orange)' }}>{percentage}% Complete</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={`Workflow progress: Step ${value} of ${max}`}
        style={{
          height: '6px',
          backgroundColor: 'var(--border-color)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, var(--primary-orange) 0%, var(--dark-orange) 100%)',
            transition: 'width var(--transition-slow)',
            borderRadius: 'var(--radius-full)',
          }}
        />
      </div>
    </div>
  );
}
