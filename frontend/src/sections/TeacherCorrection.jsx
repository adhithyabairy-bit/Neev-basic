import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconAlertCircle,
  IconCheckCircle,
  IconEye,
  IconInfo,
} from '../components/Icons';

export default function TeacherCorrection({
  correctionData = [],
  onUpdateCorrections,
  isConfirmed = false,
  onConfirmChange,
}) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showOriginalScan, setShowOriginalScan] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);

  const currentQ = correctionData[activeQuestionIndex];

  // Update a field for the active question
  const handleFieldChange = (field, value) => {
    if (!currentQ) return;

    // Any edit invalidates previous confirmation!
    if (isConfirmed) {
      onConfirmChange(false);
      setStatusMessage('Edits detected. Previous confirmation cleared; please re-confirm when finished.');
    }

    const updated = correctionData.map((q, idx) =>
      idx === activeQuestionIndex ? { ...q, [field]: value } : q
    );
    onUpdateCorrections(updated);

    // Clear field error for this field
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Validate active question
  const validateQuestion = (q) => {
    const errors = {};
    if (!q.extractedAnswer || !q.extractedAnswer.trim()) {
      errors.extractedAnswer = 'Student answer text cannot be empty.';
    }
    const marksNum = Number(q.detectedMarks);
    if (isNaN(marksNum) || q.detectedMarks === '') {
      errors.detectedMarks = 'Please enter a valid numeric mark.';
    } else if (marksNum < 0) {
      errors.detectedMarks = 'Marks cannot be negative.';
    } else if (marksNum > q.maxMarks) {
      errors.detectedMarks = `Marks cannot exceed the maximum of ${q.maxMarks}.`;
    }
    return errors;
  };

  // Validate all questions and toggle confirmation
  const handleToggleConfirmAll = () => {
    // Check all questions for errors
    let allValid = true;
    const errorsMap = {};

    correctionData.forEach((q) => {
      const errs = validateQuestion(q);
      if (Object.keys(errs).length > 0) {
        allValid = false;
        errorsMap[q.id] = errs;
      }
    });

    if (!allValid) {
      setFieldErrors(errorsMap[currentQ?.id] || { general: 'One or more questions have invalid marks or empty answers.' });
      setStatusMessage('Cannot confirm: Please fix validation errors before confirming.');
      return;
    }

    const nextState = !isConfirmed;
    onConfirmChange(nextState);
    if (nextState) {
      setStatusMessage('All questions and awarded marks successfully verified and confirmed.');
    } else {
      setStatusMessage('Confirmation unlocked for further edits.');
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  if (!currentQ || correctionData.length === 0) {
    return (
      <div className="section-container">
        <PageHeader
          title="Teacher Correction & Verification"
          subtitle="Review extracted student work, adjust marks, and confirm ground truth before AI gap analysis."
        />
        <EmptyState
          title="No extracted questions available"
          description="Complete the extraction stage in Step 3 to review and verify student answers."
        />
      </div>
    );
  }

  const activeErrors = validateQuestion(currentQ);
  const totalAwarded = correctionData.reduce((sum, q) => sum + (Number(q.detectedMarks) || 0), 0);
  const totalMax = correctionData.reduce((sum, q) => sum + (Number(q.maxMarks) || 0), 0);

  return (
    <div className="section-container" aria-label="Teacher Correction Section">
      <PageHeader
        title="Teacher Correction & Verification"
        subtitle="Review extracted student work, adjust awarded marks, and confirm ground truth before AI gap analysis."
        badgeText={isConfirmed ? 'Verified Ground Truth' : 'Pending Confirmation'}
        actions={
          <button
            type="button"
            className={`btn btn-sm ${isConfirmed ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggleConfirmAll}
            aria-label={isConfirmed ? 'Unlock confirmation for edits' : 'Confirm answers and marks'}
          >
            <IconCheck size={16} />
            <span>{isConfirmed ? 'Answers Confirmed (Unlock to Edit)' : 'Confirm Answers & Marks'}</span>
          </button>
        }
      />

      {statusMessage && (
        <div className={`alert ${isConfirmed ? 'alert-success' : 'alert-warning'}`} role="status">
          {isConfirmed ? <IconCheckCircle size={18} /> : <IconAlertCircle size={18} />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Confirmation Status Banner */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-4)',
          backgroundColor: isConfirmed ? 'var(--success-light)' : 'var(--light-orange-subtle)',
          borderColor: isConfirmed ? 'var(--success-border)' : 'var(--border-color)',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {isConfirmed ? (
              <span className="badge badge-success">Ground Truth Confirmed</span>
            ) : (
              <span className="badge badge-warning">Needs Teacher Confirmation</span>
            )}
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)' }}>
              Total Score: <strong>{totalAwarded} / {totalMax} Marks</strong> ({Math.round((totalAwarded / (totalMax || 1)) * 100)}%)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowOriginalScan(!showOriginalScan)}
            >
              <IconEye size={14} />
              <span>{showOriginalScan ? 'Hide Scan Reference' : 'Show Scan Reference'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Question Selector Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: 'var(--space-4)',
        }}
        role="tablist"
        aria-label="Question selector"
      >
        {correctionData.map((q, idx) => {
          const isSelected = idx === activeQuestionIndex;
          const hasError = Number(q.detectedMarks) < 0 || Number(q.detectedMarks) > q.maxMarks || !q.extractedAnswer.trim();

          return (
            <button
              key={q.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
              style={{
                borderColor: hasError ? 'var(--danger)' : isSelected ? 'var(--primary-orange)' : 'var(--border-color)',
                padding: '8px 14px',
              }}
              onClick={() => setActiveQuestionIndex(idx)}
            >
              <span>{q.number}</span>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--surface-bg)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {q.detectedMarks}/{q.maxMarks}m
              </span>
            </button>
          );
        })}
      </div>

      {/* Editor & Scan Comparison Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: showOriginalScan ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: 'var(--space-4)' }}>
        {/* Active Question Editor Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <span className="badge badge-orange" style={{ marginBottom: '4px' }}>
                Question {activeQuestionIndex + 1} of {correctionData.length}
              </span>
              <h2 className="card-title" style={{ fontSize: 'var(--font-size-md)' }}>
                {currentQ.prompt}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FormField
              id={`student-answer-${currentQ.id}`}
              label="Student's Answer (Editable Transcription)"
              required
              hint="Correct any OCR misreadings or illegible handwriting."
              error={activeErrors.extractedAnswer}
            >
              <textarea
                rows={5}
                value={currentQ.extractedAnswer}
                onChange={(e) => handleFieldChange('extractedAnswer', e.target.value)}
                className="form-textarea"
                style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: 1.5 }}
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <FormField
                id={`marks-${currentQ.id}`}
                label="Awarded Marks"
                required
                hint={`Max marks: ${currentQ.maxMarks}`}
                error={activeErrors.detectedMarks}
              >
                <input
                  type="number"
                  min="0"
                  max={currentQ.maxMarks}
                  step="0.5"
                  value={currentQ.detectedMarks}
                  onChange={(e) => handleFieldChange('detectedMarks', e.target.value)}
                  className="form-input"
                />
              </FormField>

              <FormField
                id={`max-marks-${currentQ.id}`}
                label="Maximum Marks"
              >
                <input
                  type="number"
                  disabled
                  value={currentQ.maxMarks}
                  className="form-input"
                  style={{ backgroundColor: 'var(--surface-bg)' }}
                />
              </FormField>
            </div>
          </div>

          {/* Question Navigation Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={activeQuestionIndex <= 0}
              onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
            >
              <IconChevronLeft size={16} />
              <span>Previous Question</span>
            </button>

            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
              Question {activeQuestionIndex + 1} of {correctionData.length}
            </span>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={activeQuestionIndex >= correctionData.length - 1}
              onClick={() => setActiveQuestionIndex((prev) => Math.min(correctionData.length - 1, prev + 1))}
            >
              <span>Next Question</span>
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Original Scan Reference Panel */}
        {showOriginalScan && (
          <div className="card" style={{ backgroundColor: 'var(--surface-bg)' }}>
            <div className="card-header">
              <h2 className="card-title" style={{ fontSize: 'var(--font-size-md)' }}>
                Original Scan Snippet &bull; {currentQ.number}
              </h2>
              <span className="badge badge-neutral">Page {currentQ.page}</span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-5)',
                minHeight: '260px',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#231B16',
                boxShadow: 'inset 0 1px 3px rgba(35, 27, 22, 0.05)',
              }}
            >
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', color: 'var(--muted-text)', fontSize: '11px' }}>
                HIGH-RESOLUTION SCAN CROP &bull; {currentQ.prompt}
              </div>

              <div style={{ backgroundColor: '#FFFDF9', border: '1px dashed #D5560B', padding: '14px', borderRadius: '4px' }}>
                <p style={{ fontWeight: 'bold', color: 'var(--dark-orange)', marginBottom: '8px' }}>
                  Student Handwritten Raw Scan:
                </p>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#231B16', lineHeight: 1.6 }}>
                  {currentQ.extractedAnswer}
                </pre>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '12px' }}>
                Tip: If the handwriting shows partial working steps, ensure both the correct parts and the error point are transcribed accurately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
