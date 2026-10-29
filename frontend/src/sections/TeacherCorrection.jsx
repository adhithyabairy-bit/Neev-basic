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
} from '../components/Icons';
import { updateAnswerCorrection, verifyAnswerSheet } from '../services/answerSheetService';

export default function TeacherCorrection({
  correctionData = [],
  onUpdateCorrections,
  isConfirmed = false,
  onConfirmChange,
  activeAnswerSheet = null,
  isDemoMode = false,
  onAnswerSheetUpdated,
}) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showOriginalScan, setShowOriginalScan] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentQ = correctionData[activeQuestionIndex];

  // Helper to extract fields cleanly supporting both demo data and Mongoose AnswerSheet documents
  const getAnswerText = (q) => q?.correctedText !== undefined ? q.correctedText : q?.extractedAnswer || q?.rawExtractedText || '';
  const getAwardedMarks = (q) => q?.awardedMarks !== undefined ? q.awardedMarks : q?.detectedMarks !== undefined ? q.detectedMarks : 0;
  const getMaxMarks = (q) => q?.maxMarks || 5;

  // Update a field for the active question
  const handleFieldChange = async (field, value) => {
    if (!currentQ) return;

    // Any edit invalidates previous confirmation!
    if (isConfirmed) {
      onConfirmChange(false);
      setStatusMessage('Edits detected. Previous verification invalidated; please re-confirm when finished.');
    }

    const updated = correctionData.map((q, idx) => {
      if (idx === activeQuestionIndex) {
        const item = { ...q };
        if (field === 'extractedAnswer' || field === 'correctedText') {
          item.correctedText = value;
          item.extractedAnswer = value;
        } else if (field === 'detectedMarks' || field === 'awardedMarks') {
          item.awardedMarks = value;
          item.detectedMarks = value;
        } else {
          item[field] = value;
        }
        return item;
      }
      return q;
    });

    onUpdateCorrections(updated);

    // Clear field error for this field
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }

    // If backed by real AnswerSheet in database, save to backend
    if (!isDemoMode && activeAnswerSheet?._id && currentQ?._id) {
      try {
        const payload = {};
        if (field === 'extractedAnswer' || field === 'correctedText') {
          payload.correctedText = value;
        } else if (field === 'detectedMarks' || field === 'awardedMarks') {
          const num = Number(value);
          if (!isNaN(num) && num >= 0) {
            payload.awardedMarks = num;
          }
        }
        if (Object.keys(payload).length > 0) {
          updateAnswerCorrection(activeAnswerSheet._id, currentQ._id, payload).catch((err) => {
            console.warn('[TeacherCorrection] Background save failed:', err.message);
          });
        }
      } catch (err) {
        console.warn('[TeacherCorrection] Save error:', err);
      }
    }
  };

  // Validate active question
  const validateQuestion = (q) => {
    const errors = {};
    const text = getAnswerText(q);
    if (!text || !text.trim()) {
      errors.extractedAnswer = 'Student answer text cannot be empty.';
    }
    const marksNum = Number(getAwardedMarks(q));
    const max = getMaxMarks(q);
    if (isNaN(marksNum) || getAwardedMarks(q) === '') {
      errors.detectedMarks = 'Please enter a valid numeric mark.';
    } else if (marksNum < 0) {
      errors.detectedMarks = 'Marks cannot be negative.';
    } else if (marksNum > max) {
      errors.detectedMarks = `Marks cannot exceed the maximum of ${max}.`;
    }
    return errors;
  };

  // Validate all questions and toggle confirmation / verification
  const handleToggleConfirmAll = async () => {
    // Check all questions for errors
    let allValid = true;
    const errorsMap = {};

    correctionData.forEach((q, idx) => {
      const errs = validateQuestion(q);
      if (Object.keys(errs).length > 0) {
        allValid = false;
        errorsMap[q._id || q.id || idx] = errs;
      }
    });

    if (!allValid) {
      const currentId = currentQ?._id || currentQ?.id || activeQuestionIndex;
      setFieldErrors(errorsMap[currentId] || { general: 'One or more questions have invalid marks or empty answers.' });
      setStatusMessage('Cannot confirm: Please fix validation errors before confirming.');
      return;
    }

    const nextState = !isConfirmed;

    // Real backend verification if not in demo mode
    if (nextState && !isDemoMode && activeAnswerSheet?._id) {
      setIsSaving(true);
      try {
        const updated = await verifyAnswerSheet(activeAnswerSheet._id);
        onConfirmChange(true);
        if (onAnswerSheetUpdated) {
          onAnswerSheetUpdated(updated);
        }
        setStatusMessage('Answer sheet verified and persisted as ground truth in MongoDB.');
      } catch (err) {
        console.error('[TeacherCorrection] Verification failed:', err);
        setStatusMessage(`Verification failed: ${err.message}`);
        return;
      } finally {
        setIsSaving(false);
      }
    } else {
      onConfirmChange(nextState);
      if (nextState) {
        setStatusMessage('All questions and awarded marks successfully verified and confirmed.');
      } else {
        setStatusMessage('Confirmation unlocked for further edits.');
      }
    }

    setTimeout(() => setStatusMessage(null), 5000);
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
  const totalAwarded = correctionData.reduce((sum, q) => sum + (Number(getAwardedMarks(q)) || 0), 0);
  const totalMax = correctionData.reduce((sum, q) => sum + (Number(getMaxMarks(q)) || 0), 0);

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
            disabled={isSaving}
            aria-label={isConfirmed ? 'Unlock confirmation for edits' : 'Confirm answers and marks'}
          >
            <IconCheck size={16} />
            <span>
              {isSaving
                ? 'Verifying...'
                : isConfirmed
                ? 'Answers Confirmed (Unlock to Edit)'
                : 'Confirm Answers & Marks'}
            </span>
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
          const awarded = Number(getAwardedMarks(q));
          const max = Number(getMaxMarks(q));
          const text = getAnswerText(q);
          const hasError = awarded < 0 || awarded > max || !text.trim();

          return (
            <button
              key={q._id || q.id || idx}
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
              <span>{q.questionNumber || q.number || `Q${idx + 1}`}</span>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--surface-bg)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {awarded}/{max}m
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
                {currentQ.prompt || `Question ${currentQ.questionNumber || activeQuestionIndex + 1}`}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FormField
              id={`student-answer-${currentQ._id || currentQ.id || activeQuestionIndex}`}
              label="Student's Answer (Editable Transcription)"
              required
              hint="Correct any OCR misreadings or illegible handwriting."
              error={activeErrors.extractedAnswer}
            >
              <textarea
                rows={5}
                value={getAnswerText(currentQ)}
                onChange={(e) => handleFieldChange('correctedText', e.target.value)}
                className="form-textarea"
                style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: 1.5 }}
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <FormField
                id={`marks-${currentQ._id || currentQ.id || activeQuestionIndex}`}
                label="Awarded Marks"
                required
                hint={`Max marks: ${getMaxMarks(currentQ)}`}
                error={activeErrors.detectedMarks}
              >
                <input
                  type="number"
                  min="0"
                  max={getMaxMarks(currentQ)}
                  step="0.5"
                  value={getAwardedMarks(currentQ)}
                  onChange={(e) => handleFieldChange('awardedMarks', e.target.value)}
                  className="form-input"
                />
              </FormField>

              <FormField
                id={`max-marks-${currentQ._id || currentQ.id || activeQuestionIndex}`}
                label="Maximum Marks"
              >
                <input
                  type="number"
                  disabled
                  value={getMaxMarks(currentQ)}
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
                Original Raw OCR &bull; {currentQ.questionNumber || currentQ.number || `Q${activeQuestionIndex + 1}`}
              </h2>
              <span className="badge badge-neutral">Page {currentQ.pageNumber || currentQ.page || 1}</span>
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
                RAW UNEDITED OCR OUTPUT &bull; IMMUTABLE GROUND TRUTH
              </div>

              <div style={{ backgroundColor: '#FFFDF9', border: '1px dashed #D5560B', padding: '14px', borderRadius: '4px' }}>
                <p style={{ fontWeight: 'bold', color: 'var(--dark-orange)', marginBottom: '8px' }}>
                  Original Extracted Text:
                </p>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#231B16', lineHeight: 1.6 }}>
                  {currentQ.rawExtractedText || currentQ.extractedAnswer || '(No raw text available)'}
                </pre>
              </div>

              {currentQ.uncertainParts && currentQ.uncertainParts.length > 0 && (
                <div style={{ marginTop: '12px', backgroundColor: '#FDE8E8', color: '#D9383A', padding: '6px 10px', borderRadius: '4px', fontSize: '11px' }}>
                  <strong>Flagged for Review: </strong>
                  {currentQ.uncertainParts.join(', ')}
                </div>
              )}

              <p style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '12px' }}>
                Note: Editing the student's answer above saves your correction while preserving this original raw OCR text unchanged.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
