import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  badgeText = null,
  actions = null,
}) {
  return (
    <div className="section-page-header">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <h1 className="section-title">{title}</h1>
            {badgeText && (
              <span className="badge badge-orange">{badgeText}</span>
            )}
          </div>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
