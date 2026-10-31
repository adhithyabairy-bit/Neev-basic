import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ErrorBoundary from '../components/ErrorBoundary';
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

  // Identify distinct document roles from uploadedFiles
  const questionPaperFile =
    uploadedFiles.find((f) => f.category === 'question-paper' || /question|qp|paper/i.test(f.name || f.originalFileName));

  const answerSheetFile =
    uploadedFiles.find((f) => f.category === 'answer-sheet' || /answer|ans/i.test(f.name || f.originalFileName)) ||
    uploadedFiles.find((f) => f.rawSheet && f.category !== 'question-paper' && f.category !== 'marking-scheme') ||
    uploadedFiles[0];

  const markingSchemeFile =
    uploadedFiles.find((f) => f.category === 'marking-scheme' || /marking|rubric|scheme/i.test(f.name || f.originalFileName));

  // Default target answer sheet for OCR and persistence: strictly the student's answer sheet
  const targetSheet =
    (activeAnswerSheet && activeAnswerSheet.category === 'answer-sheet' ? activeAnswerSheet : null) ||
    (answerSheetFile?.rawSheet && answerSheetFile.rawSheet.category === 'answer-sheet' ? answerSheetFile.rawSheet : null) ||
    (answerSheetFile?._id && answerSheetFile.category === 'answer-sheet' ? answerSheetFile : null) ||
    uploadedFiles.find((f) => f.category === 'answer-sheet')?.rawSheet ||
    uploadedFiles.find((f) => f.rawSheet && f.category !== 'question-paper' && f.category !== 'marking-scheme')?.rawSheet ||
    activeAnswerSheet;

  // Question paper questions from uploadedFiles or local state
  const questionPaperQuestions =
    (questionPaperFile?.rawSheet?.answers && questionPaperFile.rawSheet.answers.length > 0)
      ? questionPaperFile.rawSheet.answers
      : (uploadedFiles.find((f) => f.category === 'question-paper')?.rawSheet?.answers || []);

  // Marking scheme questions from uploadedFiles or local state
  const markingSchemeQuestions =
    (markingSchemeFile?.rawSheet?.answers && markingSchemeFile.rawSheet.answers.length > 0)
      ? markingSchemeFile.rawSheet.answers
      : (uploadedFiles.find((f) => f.category === 'marking-scheme')?.rawSheet?.answers || []);

  const [localQpQuestions, setLocalQpQuestions] = useState(
    () => (questionPaperQuestions.length > 0 ? questionPaperQuestions : [])
  );
  const [localMsQuestions, setLocalMsQuestions] = useState(
    () => (markingSchemeQuestions.length > 0 ? markingSchemeQuestions : [])
  );

  // Synchronize local questions if uploadedFiles updates
  useEffect(() => {
    if (questionPaperQuestions.length > 0 && localQpQuestions.length === 0) {
      setLocalQpQuestions(questionPaperQuestions);
    }
  }, [questionPaperQuestions]);

  useEffect(() => {
    if (markingSchemeQuestions.length > 0 && localMsQuestions.length === 0) {
      setLocalMsQuestions(markingSchemeQuestions);
    }
  }, [markingSchemeQuestions]);

  // Active view tab for left panel: default to Question Paper if available
  const [activeDocType, setActiveDocType] = useState(() => (questionPaperFile ? 'question-paper' : 'answer-sheet'));

  const hasDummyAnswer = (arr) =>
    !Array.isArray(arr) ||
    arr.length === 0 ||
    arr.some(
      (a) =>
        a.prompt === 'Unreadable or blank answer sheet' ||
        a.prompt === 'Extraction Incomplete' ||
        a.rawExtractedText === 'Unreadable or blank answer sheet' ||
        (!a.prompt && !a.rawExtractedText && !a.correctedText)
    );

  const displayedQpQuestions = (
    localQpQuestions.length > 0 && !hasDummyAnswer(localQpQuestions)
      ? localQpQuestions
      : questionPaperQuestions.length > 0 && !hasDummyAnswer(questionPaperQuestions)
      ? questionPaperQuestions
      : (activeAnswerSheet?.category === 'question-paper' && activeAnswerSheet.answers?.length > 0 && !hasDummyAnswer(activeAnswerSheet.answers)
          ? activeAnswerSheet.answers
          : [])
  ).filter((q) => q.prompt !== 'Unreadable or blank answer sheet' && q.prompt !== 'Extraction Incomplete');

  const displayedMsQuestions = (
    localMsQuestions.length > 0 && !hasDummyAnswer(localMsQuestions)
      ? localMsQuestions
      : markingSchemeQuestions.length > 0 && !hasDummyAnswer(markingSchemeQuestions)
      ? markingSchemeQuestions
      : (activeAnswerSheet?.category === 'marking-scheme' && activeAnswerSheet.answers?.length > 0 && !hasDummyAnswer(activeAnswerSheet.answers)
          ? activeAnswerSheet.answers
          : [])
  ).filter((q) => q.prompt !== 'Unreadable or blank answer sheet' && q.prompt !== 'Extraction Incomplete');

  // Compute total pages from extraction items or active sheet metadata
  const totalPages = Math.max(
    1,
    targetSheet?.pageCount || 1,
    ...extractionData.map((q) => q.pageNumber || q.page || 1)
  );

  const handleTriggerOcr = async (force = false) => {
    if (isDemoMode || (!targetSheet?._id && !questionPaperFile?._id)) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessNotice('Simulated OCR re-scan completed.');
        setTimeout(() => setProcessNotice(null), 3000);
      }, 800);
      return;
    }

    setIsProcessing(true);
    setProcessNotice('Running fast multimodal AI extraction on exam documents...');
    setProcessError(null);

    try {
      // 1. If question paper exists and needs extraction, extract it first
      if (questionPaperFile?._id) {
        const qpNeedsRun =
          force ||
          !Array.isArray(questionPaperFile.rawSheet?.answers) ||
          questionPaperFile.rawSheet.answers.length === 0 ||
          hasDummyAnswer(questionPaperFile.rawSheet.answers) ||
          localQpQuestions.length === 0 ||
          hasDummyAnswer(localQpQuestions);

        if (qpNeedsRun) {
          try {
            const updatedQp = await processAnswerSheet(questionPaperFile._id);
            if (updatedQp?.answers) {
              questionPaperFile.rawSheet = updatedQp;
              setLocalQpQuestions(updatedQp.answers);
            }
          } catch (qpErr) {
            console.warn('[ExtractPreview] Auto-extract QP notice:', qpErr.message);
          }
        }
      }

      // 2. If marking scheme exists and needs extraction, extract it
      if (markingSchemeFile?._id) {
        const msNeedsRun =
          force ||
          !Array.isArray(markingSchemeFile.rawSheet?.answers) ||
          markingSchemeFile.rawSheet.answers.length === 0 ||
          hasDummyAnswer(markingSchemeFile.rawSheet.answers) ||
          localMsQuestions.length === 0 ||
          hasDummyAnswer(localMsQuestions);

        if (msNeedsRun) {
          try {
            const updatedMs = await processAnswerSheet(markingSchemeFile._id);
            if (updatedMs?.answers) {
              markingSchemeFile.rawSheet = updatedMs;
              setLocalMsQuestions(updatedMs.answers);
            }
          } catch (msErr) {
            console.warn('[ExtractPreview] Auto-extract MS notice:', msErr.message);
          }
        }
      }

      // 3. Extract the student answer sheet
      if (targetSheet?._id) {
        const updatedSheet = await processAnswerSheet(targetSheet._id);
        if (updatedSheet?.answers) {
          onUpdateExtraction(updatedSheet.answers);
          if (onAnswerSheetUpdated) {
            onAnswerSheetUpdated(updatedSheet);
          }
          setProcessNotice(
            `Smart AI extraction complete! Extracted ${updatedSheet.answers.length} question(s) cleanly.`
          );
        }
      }
    } catch (err) {
      console.error('[ExtractPreview] Extraction error:', err);
      setProcessError(err.message || 'Failed to extract text from answer sheet.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessNotice(null), 5000);
    }
  };

  const hasTriggeredRef = useRef(false);

  const isDummyError =
    !extractionData ||
    extractionData.length === 0 ||
    hasDummyAnswer(extractionData) ||
    extractionData.every((q) => !q.correctedText && !q.rawExtractedText);

  const qpNeedsExtraction =
    Boolean(questionPaperFile?._id) &&
    (localQpQuestions.length === 0 || hasDummyAnswer(localQpQuestions)) &&
    (!questionPaperQuestions || questionPaperQuestions.length === 0 || hasDummyAnswer(questionPaperQuestions));

  // Auto-trigger OCR extraction if document has not been extracted yet or has a blank error
  useEffect(() => {
    if (
      !isDemoMode &&
      (targetSheet?._id || questionPaperFile?._id) &&
      (isDummyError || qpNeedsExtraction) &&
      !isProcessing &&
      !hasTriggeredRef.current
    ) {
      hasTriggeredRef.current = true;
      handleTriggerOcr(false);
    }
  }, [targetSheet?._id, questionPaperFile?._id, isDummyError, qpNeedsExtraction, isDemoMode]);

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
    <ErrorBoundary onReset={() => window.location.reload()}>
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
                onClick={() => {
                  hasTriggeredRef.current = false;
                  handleTriggerOcr(true);
                }}
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
                <div>
                  <h2 className="card-title" style={{ fontSize: 'var(--font-size-md)' }}>
                    Scanned Document View &bull; Page {currentPage}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--secondary-text)', margin: '2px 0 0 0' }}>
                    Viewing {activeDocType === 'question-paper' ? 'Question Paper (Questions & Max Marks)' : activeDocType === 'marking-scheme' ? 'Marking Scheme (Official Rubric)' : 'Student Answer Sheet'}
                  </p>
                </div>
                <span className="badge badge-neutral">
                  {activeDocType === 'question-paper'
                    ? (questionPaperFile?.name || 'Question Paper')
                    : activeDocType === 'marking-scheme'
                    ? (markingSchemeFile?.name || 'Marking Scheme')
                    : (targetSheet?.originalFileName || answerSheetFile?.name || 'Answer Sheet')}
                </span>
              </div>

              {/* Document Type Switcher Tabs */}
              <div style={{ display: 'flex', gap: '6px', padding: '0 16px 12px 16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${activeDocType === 'question-paper' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveDocType('question-paper')}
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  📄 Question Paper
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeDocType === 'answer-sheet' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveDocType('answer-sheet')}
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  📝 Student Answer Sheet
                </button>
                {markingSchemeFile && (
                  <button
                    type="button"
                    className={`btn btn-sm ${activeDocType === 'marking-scheme' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveDocType('marking-scheme')}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    📋 Marking Scheme
                  </button>
                )}
              </div>

              {/* Styled Document / Scan Sheet Preview */}
              <div
                style={{
                  flex: 1,
                  minHeight: '420px',
                  backgroundColor: '#FFFDF9',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '0 0 var(--radius-md) var(--radius-md)',
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
                  <span>
                    {activeDocType === 'question-paper'
                      ? (questionPaperFile?.name || 'EXAMINATION QUESTION PAPER')
                      : activeDocType === 'marking-scheme'
                      ? (markingSchemeFile?.name || 'OFFICIAL MARKING SCHEME')
                      : (targetSheet?.originalFileName || answerSheetFile?.name || 'STUDENT ANSWER SHEET')}
                  </span>
                  <span>PAGE {currentPage} OF {totalPages}</span>
                </div>

                {/* Show Document Questions / Scanned Content */}
                {activeDocType === 'question-paper' ? (
                  displayedQpQuestions.length > 0 ? (
                    displayedQpQuestions.map((q, idx) => {
                      const qNum = q.questionNumber || `Q${idx + 1}`;
                      const promptText = q.prompt || q.rawExtractedText || '';
                      return (
                        <div
                          key={q._id || q.id || idx}
                          style={{
                            border: '1.5px solid var(--primary-orange)',
                            backgroundColor: 'rgba(242, 107, 29, 0.04)',
                            padding: '14px',
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
                            <span className="badge badge-orange" style={{ fontWeight: 'bold' }}>
                              {qNum} &bull; [{q.maxMarks || 3} Marks]
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                              Question Paper Scan &bull; Direct Text
                            </span>
                          </div>
                          <p style={{ color: '#231B16', fontWeight: 'bold', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>
                            {promptText}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: 'var(--secondary-text)', textAlign: 'center', padding: 'var(--space-8)' }}>
                      No question paper questions found.
                    </div>
                  )
                ) : activeDocType === 'marking-scheme' ? (
                  displayedMsQuestions.length > 0 ? (
                    displayedMsQuestions.map((q, idx) => {
                      const qNum = q.questionNumber || `Q${idx + 1}`;
                      const modelAnswer =
                        q.referenceAnswer ||
                        q.expectedAnswer ||
                        q.rawExtractedText ||
                        q.correctedText ||
                        q.prompt ||
                        'Expected step-wise scoring criteria and final answer.';

                      return (
                        <div
                          key={q._id || q.id || idx}
                          style={{
                            border: '1.5px solid #2B8A3E',
                            backgroundColor: 'rgba(43, 138, 62, 0.04)',
                            padding: '14px',
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
                            <span className="badge" style={{ backgroundColor: '#2B8A3E', color: '#FFF', fontWeight: 'bold' }}>
                              {qNum} &bull; Model Answer [{q.maxMarks || 3} Marks]
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                              Marking Scheme Reference
                            </span>
                          </div>
                          {/* Never duplicate: only display prompt if it's a distinct question statement, not model answer */}
                          {q.prompt &&
                            !q.prompt.toLowerCase().startsWith('model answer') &&
                            q.prompt.trim().toLowerCase() !== modelAnswer.trim().toLowerCase() && (
                              <p style={{ color: '#231B16', fontSize: '12px', fontStyle: 'italic', marginBottom: '6px' }}>
                                {q.prompt}
                              </p>
                          )}
                          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3F9D8', padding: '8px 10px', borderRadius: '4px', color: '#2B8A3E', whiteSpace: 'pre-wrap' }}>
                            {modelAnswer}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: 'var(--secondary-text)', textAlign: 'center', padding: 'var(--space-8)' }}>
                      No marking scheme items found.
                    </div>
                  )
                ) : (
                  /* Student Answer Sheet */
                  pageQuestions.length > 0 ? (
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
                      No extracted answers on Page {currentPage}.
                    </div>
                  )
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

              {isProcessing ? (
                <div
                  className="card"
                  style={{
                    padding: 'var(--space-8)',
                    textAlign: 'center',
                    backgroundColor: '#FFFDF9',
                    border: '1.5px solid var(--primary-orange)',
                  }}
                >
                  <IconRefreshCw
                    size={32}
                    className="spin"
                    style={{ color: 'var(--primary-orange)', margin: '0 auto 12px auto' }}
                  />
                  <h3 style={{ fontSize: '15px', color: 'var(--dark-orange)', margin: '0 0 6px 0' }}>
                    Extracting Student Answers...
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--secondary-text)', margin: 0 }}>
                    Segmenting student handwritten answers question-by-question with verbatim fidelity.
                  </p>
                </div>
              ) : pageQuestions.length === 0 ? (
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
                              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span>Max Marks:</span>
                                <input
                                  type="number"
                                  min="0.5"
                                  step="0.5"
                                  value={q.maxMarks || 3}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val > 0) {
                                      const updated = extractionData.map((item) =>
                                        (item._id || item.id) === qId ? { ...item, maxMarks: val } : item
                                      );
                                      onUpdateExtraction(updated);
                                      if (targetSheet?._id && qId) {
                                        updateAnswerCorrection(targetSheet._id, qId, { maxMarks: val }).catch(console.warn);
                                      }
                                    }
                                  }}
                                  style={{
                                    width: '45px',
                                    padding: '1px 4px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '3px',
                                    textAlign: 'center',
                                  }}
                                  title="Click to edit maximum marks for this question"
                                />
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
    </ErrorBoundary>
  );
}
