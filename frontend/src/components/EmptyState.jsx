import React from 'react';
import { IconInfo } from './Icons';

export default function EmptyState({
  icon = null,
  title = 'No items found',
  description = 'There is currently no information to display in this section.',
  actionButton = null,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`} role="status">
      <div className="empty-state-icon" aria-hidden="true">
        {icon || <IconInfo size={26} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionButton && <div style={{ marginTop: 'var(--space-2)' }}>{actionButton}</div>}
    </div>
  );
}
