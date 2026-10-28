import React, { useEffect, useRef } from 'react';
import { IconAlertTriangle, IconX } from './Icons';

export default function ConfirmationModal({
  isOpen,
  title = 'Confirm Action',
  message,
  warningText = null,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  // Focus trap / auto-focus confirm button
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      confirmBtnRef.current?.focus();
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {isDanger && (
              <span style={{ color: 'var(--danger)', display: 'flex' }} aria-hidden="true">
                <IconAlertTriangle size={22} />
              </span>
            )}
            <h2 id="modal-title" className="modal-title">{title}</h2>
          </div>
          <button
            type="button"
            className="btn-icon-only"
            onClick={onCancel}
            aria-label="Close modal"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--main-text)', marginBottom: warningText ? 'var(--space-3)' : 0 }}>
            {message}
          </p>
          {warningText && (
            <div className="alert alert-warning" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>
              <IconAlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Warning: </strong>
                <span>{warningText}</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn btn-sm ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
