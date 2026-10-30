import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  IconEye,
  IconAlertTriangle,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconInfo,
  IconEdit,
  IconTrash,
  IconPlus,
  IconCheck,
  IconRefreshCw,
} from '../components/Icons';
import {
  processAnswerSheet,
  updateAnswerCorrection,
  deleteAnswerItem,
  addAnswerItem,
} from '../services/answerSheetService';

/**
 * Strips redundant question labels from prompt text so it doesn't duplicate the question badge.
 * E.g., if qNum is "Q1" and prompt is "Question 1 Linear Equations", strips "Question 1" -> "Linear Equations".
 */
function cleanDisplayPrompt(prompt, qNum) {
  if (!prompt) return '';
  let cleaned = prompt.trim();
  if (qNum) {
    const rawNum = qNum.replace(/^Q/i, '').trim();
    const regex = new RegExp(`^(?:Q(?:uestion)?\\s*#?\\.?\\s*${rawNum}[:\\.\\-\\s]*|${qNum}[:\\.\\-\\s]*)`, 'i');
    cleaned = cleaned.replace(regex, '').trim();
  }
  // Strip trailing marks indicator from prompt if already shown in badge (e.g. "3 Marks")
  cleaned = cleaned.replace(/\s*(?:\[|\()?(\d+)\s*(?:Marks?|Pts?|Points?)(?:\]|\))?\s*$/i, '').trim();
  return cleaned || prompt;
}

export default function ExtractPreview({
  extractionData = [],
  onUpdateExtraction,
  uploadedFiles = [],
  studentProfile = { name: '' },
  activeAnswerSheet = null,
  isDemoMode = false,
  onAnswerSheetUpdated,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'needs-review'
  const [isProcessing, setIsProcessing] = useState(false);
  const [processNotice, setProcessNotice] = useState(null);
  const [processError, setProcessError] = useState(null);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    questionNumber: '',
    prompt: '',
    maxMarks: 5,
    correctedText: '',
  });

  // Inline new question state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    questionNumber: '',
    prompt: '',
    maxMarks: 5,
    correctedText: '',
  });

  // Derive active sheet from prop or first uploaded file with a backend _id
  const targetSheet =
    activeAnswerSheet ||
    uploadedFiles.find((f) => f.rawSheet)?.rawSheet ||
    (uploadedFiles[0]?._id ? uploadedFiles[0] : null);

  // Compute total pages from extraction items or active sheet metadata
  const totalPages = Math.max(
    1,
    targetSheet?.pageCount || 1,
    ...extractionData.map((q) => q.pageNumber || q.page || 1)
  );

  const handleTriggerOcr = async () => {
    if (isDemoMode || !targetSheet?._id) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessNotice('Simulated OCR re-scan completed.');
        setTimeout(() => setProcessNotice(null), 3000);
      }, 800);
      return;
    }

    setIsProcessing(true);
    setProcessNotice('Running smart OCR extraction on answer sheet...');
    setProcessError(null);

    try {
      const updatedSheet = await processAnswerSheet(targetSheet._id);
      if (updatedSheet?.answers) {
        onUpdateExtraction(updatedSheet.answers);
        if (onAnswerSheetUpdated) {
          onAnswerSheetUpdated(updatedSheet);
        }
        setProcessNotice(
          `Smart OCR complete! Extracted ${updatedSheet.answers.length} question(s) cleanly.`
        );
      }
    } catch (err) {
      console.error('[ExtractPreview] Extraction error:', err);
      setProcessError(err.message || 'Failed to extract text from answer sheet.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessNotice(null), 5000);
    }
  };

  const handleToggleVerify = async (questionId) => {
    const item = extractionData.find((q) => (q._id || q.id) === questionId);
    if (!item) return;

    const nextStatus = item.status === 'Verified' ? 'Needs Review' : 'Verified';
    const updated = extractionData.map((q) => {
      const qId = q._id || q.id;
      if (qId === questionId) {
        return { ...q, status: nextStatus };
      }
      return q;
    });
    onUpdateExtraction(updated);

    if (targetSheet?._id && item._id) {
      try {
        await updateAnswerCorrection(targetSheet._id, item._id, { status: nextStatus });
      } catch (err) {
        console.error('[ExtractPreview] Error updating status:', err);
      }
    }
  };

  const startEditing = (q) => {
    setEditingId(q._id || q.id);
    setEditForm({
      questionNumber: q.questionNumber || 'Q1',
      prompt: q.prompt || '',
      maxMarks: q.maxMarks || 5,
      correctedText: q.correctedText || q.rawExtractedText || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = async (questionId) => {
    const updated = extractionData.map((q) => {
      const qId = q._id || q.id;
      if (qId === questionId) {
        return {
          ...q,
          questionNumber: editForm.questionNumber,
          prompt: editForm.prompt,
          maxMarks: Number(editForm.maxMarks) || 5,
          correctedText: editForm.correctedText,
        };
      }
      return q;
    });

    onUpdateExtraction(updated);
    setEditingId(null);

    if (targetSheet?._id && questionId) {
      try {
        await updateAnswerCorrection(targetSheet._id, questionId, {
          questionNumber: editForm.questionNumber,
          prompt: editForm.prompt,
          maxMarks: Number(editForm.maxMarks) || 5,
          correctedText: editForm.correctedText,
        });
      } catch (err) {
        console.error('[ExtractPreview] Error persisting question edit:', err);
      }
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this extracted question item?'
    );
    if (!confirmed) return;

    const updated = extractionData.filter((q) => (q._id || q.id) !== questionId);
    onUpdateExtraction(updated);

    if (targetSheet?._id && questionId) {
      try {
        await deleteAnswerItem(targetSheet._id, questionId);
      } catch (err) {
        console.error('[ExtractPreview] Error deleting question item:', err);
      }
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    const nextQNum =
      newQuestionForm.questionNumber.trim() || `Q${extractionData.length + 1}`;
    const nextPrompt =
      newQuestionForm.prompt.trim() || `Question ${extractionData.length + 1}`;
    const nextMarks = Number(newQuestionForm.maxMarks) || 5;

    const newEntry = {
      _id: `temp_${Date.now()}`,
      questionNumber: nextQNum,
      prompt: nextPrompt,
      rawExtractedText: newQuestionForm.correctedText,
      correctedText: newQuestionForm.correctedText,
      pageNumber: currentPage,
      maxMarks: nextMarks,
      awardedMarks: 0,
      confidence: 100,
      status: 'Needs Review',
      uncertainParts: [],
    };

    const updated = [...extractionData, newEntry];
    onUpdateExtraction(updated);
    setShowAddForm(false);
    setNewQuestionForm({ questionNumber: '', prompt: '', maxMarks: 5, correctedText: '' });

    if (targetSheet?._id) {
      try {
        const res = await addAnswerItem(targetSheet._id, {
          questionNumber: nextQNum,
          prompt: nextPrompt,
          maxMarks: nextMarks,
          pageNumber: currentPage,
          correctedText: newQuestionForm.correctedText,
        });
        if (res?.data?.answers) {
          onUpdateExtraction(res.data.answers);
        }
      } catch (err) {
        console.error('[ExtractPreview] Error creating question item:', err);
      }
    }
  };

  // Filter questions for the current page and filterMode
  const pageQuestions = extractionData.filter((q) => {
    const qPage = q.pageNumber || q.page || 1;
    const matchesPage = qPage === currentPage;
    if (filterMode === 'needs-review') {
      return matchesPage && q.status === 'Needs Review';
    }
    return matchesPage;
  });

  const totalNeedsReview = extractionData.filter((q) => q.status === 'Needs Review').length;

  return (
    <div className="section-container" aria-label="Extract and Preview Section">
      <PageHeader
        title="Extract & Preview OCR Answers"
        subtitle="Inspect automated handwritten answer transcription, confidence scores, and uncertain steps."
        badgeText="Inspection Phase"
      />

      <div className="alert alert-notice" role="status">
        <IconInfo size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>AI OCR Pipeline: </strong>
          <span>
            {isDemoMode
              ? 'Displaying high-fidelity demonstration extraction data. In production, Neev uses computer vision and OCR to parse handwriting.'
              : 'Smart OCR pipeline active. Filters examiner rubrics and guidelines, preserves questions and marking schemes.'}
          </span>
        </div>
      </div>

      {processNotice && (
        <div className="alert alert-success" role="status">
          <IconCheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{processNotice}</span>
        </div>
      )}

      {processError && (
        <div className="alert alert-danger" role="alert">
          <IconAlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{processError}</span>
        </div>
      )}

      {uploadedFiles.length === 0 ? (
        <EmptyState
          icon={<IconEye size={28} />}
          title="No uploaded documents to extract"
          description="Go back to Step 2 and upload at least one student answer sheet to preview extracted questions and answers."
        />
      ) : extractionData.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <EmptyState
            icon={<IconEye size={28} />}
            title="Extraction Ready to Process"
            description="Answer sheet is stored and ready for text extraction. Click below to initiate OCR."
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={handleTriggerOcr}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing Document...' : 'Run OCR Extraction'}
          </button>
        </div>
      ) : (
        <>
          {/* Controls & Pagination Toolbar */}
          <div
            className="card"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterMode('all')}
              >
                All Questions ({extractionData.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterMode === 'needs-review' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterMode('needs-review')}
              >
                Needs Review ({totalNeedsReview})
              </button>
              <span className="badge badge-orange" style={{ alignSelf: 'center' }}>
                Student: {studentProfile?.name || targetSheet?.studentName || 'Unassigned'}
              </span>
            </div>

            {/* Page Navigation & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous scanned page"
              >
                <IconChevronLeft size={16} />
                <span>Prev Page</span>
              </button>

              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--main-text)',
                  padding: '0 4px',
                }}
              >
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next scanned page"
              >
                <span>Next Page</span>
                <IconChevronRight size={16} />
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowAddForm(!showAddForm)}
                title="Add a question manually"
              >
                <IconPlus size={15} />
                <span>Add Question</span>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleTriggerOcr}
                disabled={isProcessing}
                title="Re-run extraction on this answer sheet"
              >
                <IconRefreshCw size={15} />
                <span>{isProcessing ? 'Extracting...' : 'Re-process OCR'}</span>
              </button>
            </div>
          </div>

          {/* Add Question Inline Card */}
          {showAddForm && (
            <div
              className="card"
              style={{
                marginBottom: 'var(--space-4)',
                border: '1.5px solid var(--primary-orange)',
                backgroundColor: '#FFFDF9',
                padding: 'var(--space-4)',
              }}
            >
              <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-3)', color: 'var(--dark-orange)' }}>
                Add New Question to Page {currentPage}
              </h3>
              <form onSubmit={handleAddQuestion}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Q#</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Q${extractionData.length + 1}`}
                      value={newQuestionForm.questionNumber}
                      onChange={(e) =>
                        setNewQuestionForm({ ...newQuestionForm, questionNumber: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Question Title / Topic</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Linear Equations (Solve and Verify)"
                      value={newQuestionForm.prompt}
                      onChange={(e) =>
                        setNewQuestionForm({ ...newQuestionForm, prompt: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Max Marks</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="100"
                      value={newQuestionForm.maxMarks}
                      onChange={(e) =>
                        setNewQuestionForm({ ...newQuestionForm, maxMarks: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Expected Solution / Student Answer Steps</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter mathematical steps or model answer..."
                    style={{ resize: 'none', width: '100%', boxSizing: 'border-box' }}
                    value={newQuestionForm.correctedText}
                    onChange={(e) =>
                      setNewQuestionForm({ ...newQuestionForm, correctedText: e.target.value })
                    }
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <IconPlus size={15} />
                    <span>Save Question</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Document & Question Preview Split Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {/* Scanned Document View Panel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h2 className="card-title" style={{ fontSize: 'var(--font-size-md)' }}>
                  Scanned Document View &bull; Page {currentPage}
                </h2>
                <span className="badge badge-neutral">
                  {targetSheet?.originalFileName || studentProfile?.name
                    ? `${studentProfile.name || targetSheet.studentName || 'Document'} - Copy`
                    : 'Document View'}
                </span>
              </div>

              {/* Styled Document / Scan Sheet Preview */}
              <div
                style={{
                  flex: 1,
                  minHeight: '420px',
                  backgroundColor: '#FFFDF9',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  boxShadow: 'inset 0 1px 3px rgba(35, 27, 22, 0.05)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.7',
                  position: 'relative',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    borderBottom: '1px dashed #E2C7B5',
                    paddingBottom: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#6F6259',
                  }}
                >
                  <span>{targetSheet?.originalFileName || 'EXAMINATION ANSWER SHEET'}</span>
                  <span>PAGE {currentPage} OF {totalPages}</span>
                </div>

                {/* Show Page Questions */}
                {pageQuestions.length > 0 ? (
                  pageQuestions.map((q, idx) => {
                    const qNum = q.questionNumber || `Q${idx + 1}`;
                    const displayPrompt = cleanDisplayPrompt(q.prompt, qNum);

                    return (
                      <div
                        key={q._id || q.id || idx}
                        style={{
                          border: '1.5px dashed var(--primary-orange)',
                          backgroundColor: 'rgba(242, 107, 29, 0.05)',
                          padding: '12px',
                          borderRadius: '6px',
                          marginBottom: '14px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                          }}
                        >
                          <span className="badge badge-orange">
                            OCR Box: {qNum}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                            Confidence: {q.confidence !== null && q.confidence !== undefined ? `${q.confidence}%` : 'Direct Text'}
                          </span>
                        </div>
                        {displayPrompt && (
                          <p style={{ color: '#231B16', fontWeight: 'bold', marginBottom: '6px' }}>
                            {displayPrompt}
                          </p>
                        )}
                        <p style={{ color: '#8C5B14', whiteSpace: 'pre-wrap', margin: 0 }}>
                          {q.correctedText || q.rawExtractedText || '(No text detected)'}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: 'var(--secondary-text)', textAlign: 'center', padding: 'var(--space-8)' }}>
                    No extracted questions found on Page {currentPage}.
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Answer Details Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2
                  style={{
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--main-text)',
                    margin: 0,
                  }}
                >
                  Extracted Answers on Page {currentPage} ({pageQuestions.length})
                </h2>
              </div>

              {pageQuestions.length === 0 ? (
                <EmptyState
                  title="No questions match filter"
                  description="All questions on this page are either filtered or on another page."
                />
              ) : (
                pageQuestions.map((q, idx) => {
                  const isNeedsReview = q.status === 'Needs Review';
                  const qId = q._id || q.id || `q_${idx}`;
                  const isEditing = editingId === qId;
                  const qNum = q.questionNumber || `Q${idx + 1}`;
                  const displayPrompt = cleanDisplayPrompt(q.prompt, qNum);

                  return (
                    <div
                      key={qId}
                      className="card"
                      style={{
                        padding: 'var(--space-4)',
                        borderColor: isNeedsReview ? 'var(--primary-orange)' : 'var(--border-color)',
                        backgroundColor: isNeedsReview ? 'var(--card-highlight-bg)' : '#FFFFFF',
                      }}
                    >
                      {/* Editing View */}
                      {isEditing ? (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: '8px', marginBottom: '10px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Q#</label>
                              <input
                                type="text"
                                className="form-control"
                                value={editForm.questionNumber}
                                onChange={(e) => setEditForm({ ...editForm, questionNumber: e.target.value })}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Question Title / Prompt</label>
                              <input
                                type="text"
                                className="form-control"
                                value={editForm.prompt}
                                onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Max Marks</label>
                              <input
                                type="number"
                                className="form-control"
                                min="1"
                                max="100"
                                value={editForm.maxMarks}
                                onChange={(e) => setEditForm({ ...editForm, maxMarks: e.target.value })}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Extracted / Solution Text</label>
                            <textarea
                              className="form-control"
                              rows="6"
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                lineHeight: 1.5,
                                resize: 'none',
                                width: '100%',
                                minHeight: '140px',
                                boxSizing: 'border-box',
                              }}
                              value={editForm.correctedText}
                              onChange={(e) => setEditForm({ ...editForm, correctedText: e.target.value })}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => saveEditing(qId)}
                            >
                              <IconCheck size={14} />
                              <span>Apply Changes</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal View */
                        <>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: 'var(--space-2)',
                              marginBottom: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  backgroundColor: 'var(--primary-orange)',
                                  color: '#FFFFFF',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                }}
                              >
                                {qNum}
                              </span>
                              <span
                                style={{
                                  fontSize: 'var(--font-size-sm)',
                                  fontWeight: 'var(--font-weight-semibold)',
                                  color: 'var(--main-text)',
                                }}
                              >
                                {displayPrompt || `Question ${qNum}`}
                              </span>
                            </div>

                            <span
                              className={`badge ${isNeedsReview ? 'badge-warning' : 'badge-success'}`}
                              style={{ flexShrink: 0 }}
                            >
                              {isNeedsReview ? (
                                <>
                                  <IconAlertTriangle size={12} />
                                  <span>Needs Review</span>
                                </>
                              ) : (
                                <>
                                  <IconCheckCircle size={12} />
                                  <span>Verified</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Transcribed Text Box */}
                          <div
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 12px',
                              fontSize: 'var(--font-size-sm)',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              marginBottom: 'var(--space-3)',
                              color: 'var(--main-text)',
                            }}
                          >
                            {q.correctedText || q.rawExtractedText || '(No text)'}
                          </div>

                          {/* Uncertainties if any */}
                          {q.uncertainParts && q.uncertainParts.length > 0 && (
                            <div
                              style={{
                                backgroundColor: 'var(--danger-light)',
                                border: '1px solid var(--danger-border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '6px 10px',
                                marginBottom: 'var(--space-3)',
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--danger-dark)',
                              }}
                            >
                              <strong>Uncertain Area: </strong>
                              {q.uncertainParts.join(', ')}
                            </div>
                          )}

                          {/* Metadata & Actions Row */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 'var(--space-2)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                              <span className="badge badge-neutral">
                                OCR: {q.confidence !== null && q.confidence !== undefined ? `${q.confidence}%` : 'Direct Text'}
                              </span>
                              <span className="badge badge-neutral">
                                Marks: {q.awardedMarks !== undefined ? q.awardedMarks : 0}/{q.maxMarks || 5}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => startEditing(q)}
                                title="Edit Question title, marks, or extracted text"
                              >
                                <IconEdit size={14} />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ color: '#D9383A', borderColor: '#F5C2C7' }}
                                onClick={() => handleDeleteQuestion(qId)}
                                title="Delete non-question or rubric guideline"
                              >
                                <IconTrash size={14} />
                              </button>

                              <button
                                type="button"
                                className={`btn btn-sm ${isNeedsReview ? 'btn-secondary' : 'btn-outline'}`}
                                onClick={() => handleToggleVerify(qId)}
                              >
                                {isNeedsReview ? 'Mark as Verified' : 'Flag for Review'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
