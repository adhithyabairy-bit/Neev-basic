import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  IconSparkles,
  IconAlertCircle,
  IconCheckCircle,
  IconInfo,
  IconCheck,
  IconRefreshCw,
  IconBookOpen,
} from '../components/Icons';
import {
  evaluateAnswerSheet,
  fetchEvaluationsBySheet,
  approveEvaluation,
} from '../services/evaluationService';

export default function AIAnswerAnalysis({
  analysisData = [],
  isTeacherConfirmed = false,
  activeAnswerSheet = null,
  syllabusData = null,
  isDemoMode = false,
  onEvaluationsUpdated = null,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'needs-review' | 'errors-only'
  const [evaluations, setEvaluations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [scoreInput, setScoreInput] = useState('');

  // Determine if the current sheet is verified
  const isSheetVerified =
    isDemoMode ||
    isTeacherConfirmed ||
    activeAnswerSheet?.status === 'verified' ||
    activeAnswerSheet?.verificationStatus?.isVerified === true;

  // Initialize or fetch evaluations
  useEffect(() => {
    if (isDemoMode) {
      // Map initial demo analysis data to standard evaluation structure
      const demoMapped = (analysisData || []).map((item, idx) => ({
        _id: item.questionId || `demo-eval-${idx}`,
        questionNumber: item.questionNumber || `Q${idx + 1}`,
        topic: 'Algebra & Arithmetic',
        prompt: item.prompt || '',
        studentAnswer: item.studentAnswer || '',
        expectedAnswer: item.expectedAnswer || '',
        suggestedMarks: item.marksAwarded ?? 0,
        approvedMarks: item.marksAwarded ?? 0,
        maximumMarks: item.maxMarks ?? 5,
        isTeacherApproved: false,
        reviewStatus: 'review_required',
        explanation: item.observedEvidence || '',
        observedErrors: item.observedEvidence ? [item.observedEvidence] : [],
        misconceptionHypothesis: item.aiHypothesis || 'Concept misconception under review.',
        syllabusEvidence: [
          {
            documentTitle: 'NCERT Class 8 Mathematics',
            pageNumber: 24,
            excerpt: 'When transposing terms across an equals sign, inverse operations must be maintained.',
            relevanceScore: 0.91,
          },
        ],
        isEvidenceSufficient: true,
        confidence: item.confidence || '92%',
      }));
      setEvaluations(demoMapped);
      return;
    }

    if (!activeAnswerSheet?._id) {
      setEvaluations([]);
      return;
    }

    let isMounted = true;
    async function loadEvaluations() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchEvaluationsBySheet(activeAnswerSheet._id);
        if (isMounted) {
          setEvaluations(data || []);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to load existing evaluations.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadEvaluations();
    return () => {
      isMounted = false;
    };
  }, [activeAnswerSheet?._id, isDemoMode, analysisData]);

  // Handler to trigger real AI evaluation
  const handleRunEvaluation = async () => {
    const assessmentId = syllabusData?.assessmentId || activeAnswerSheet?.assessmentId;
    const sheetId = activeAnswerSheet?._id;

    if (!assessmentId || !sheetId) {
      setErrorMessage('Missing assessment or answer sheet identifier. Ensure the assessment is saved.');
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);
    try {
      const results = await evaluateAnswerSheet(assessmentId, sheetId);
      setEvaluations(results);
      setSuccessBanner('AI pedagogical evaluation complete! Suggested marks and misconceptions are ready for review.');
      if (onEvaluationsUpdated) onEvaluationsUpdated(results);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      setErrorMessage(err.message || 'AI evaluation failed. Please verify that the backend AI service is reachable.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handler to approve score
  const handleApproveScore = async (evalId, marksToApprove) => {
    if (isDemoMode) {
      // In demo mode, simulate teacher approval in local state
      setEvaluations((prev) =>
        prev.map((e) =>
          e._id === evalId
            ? {
                ...e,
                isTeacherApproved: true,
                reviewStatus: 'approved',
                approvedMarks: marksToApprove !== null ? Number(marksToApprove) : e.suggestedMarks,
              }
            : e
        )
      );
      setSuccessBanner('Score approved in demo mode.');
      setEditingScoreId(null);
      setTimeout(() => setSuccessBanner(null), 3000);
      return;
    }

    setApprovingId(evalId);
    try {
      const updated = await approveEvaluation(evalId, marksToApprove);
      setEvaluations((prev) =>
        prev.map((e) => (e._id === evalId ? updated : e))
      );
      setSuccessBanner('Teacher score approved successfully.');
      setEditingScoreId(null);
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to approve evaluation score.');
    } finally {
      setApprovingId(null);
    }
  };

  // Render teacher verification gating notice if unverified
  if (!isSheetVerified) {
    return (
      <div className="section-container">
        <PageHeader
          title="AI Answer Analysis"
          subtitle="Deep pedagogical analysis of verified student work."
        />
        <EmptyState
          icon={<IconAlertCircle size={28} />}
          title="Teacher verification pending"
          description="Please return to Step 4 (Teacher Correction) and confirm the ground-truth answers and marks to unlock AI pedagogical analysis."
        />
      </div>
    );
  }

  // Filter evaluation items
  const filteredItems = evaluations.filter((item) => {
    const maxMarks = item.maxMarks ?? item.maximumMarks ?? 5;
    const status = item.reviewStatus || item.status || 'review_required';
    const isApproved = item.isTeacherApproved || status === 'approved';

    if (filterType === 'needs-review') {
      return !isApproved || status === 'review_required';
    }
    if (filterType === 'errors-only') {
      const awarded = isApproved ? item.approvedMarks : item.suggestedMarks;
      return (awarded ?? 0) < maxMarks;
    }
    return true;
  });

  const totalQuestions = evaluations.length;
  const approvedCount = evaluations.filter((e) => e.isTeacherApproved || e.status === 'approved' || e.reviewStatus === 'approved').length;
  const totalSuggestedMarks = evaluations.reduce((sum, e) => sum + (e.suggestedMarks || 0), 0);
  const totalMaxMarks = evaluations.reduce((sum, e) => sum + (e.maxMarks ?? e.maximumMarks ?? 5), 0);

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <div className="section-container" aria-label="AI Answer Analysis Section">
      <PageHeader
        title="AI Answer Analysis & Misconception Detection"
        subtitle="Evaluates verified student answers against syllabus content, extracting conceptual hypotheses and requiring explicit teacher score approval."
        badgeText="Syllabus RAG + AI Evaluator"
      />

      {/* Disclaimers & Methodology Banner */}
      <div className="alert alert-notice" role="status">
        <IconInfo size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Evaluation Integrity Protocol: </strong>
          <span>
            AI suggested marks are preliminary recommendations grounded in syllabus evidence. They <strong>require explicit teacher approval</strong> before results become final student marks.
          </span>
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" role="status">
          <IconCheck size={18} style={{ flexShrink: 0 }} />
          <span>{successBanner}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          <IconAlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action / Evaluation Trigger Banner */}
      {!isDemoMode && activeAnswerSheet && evaluations.length === 0 && !isLoading && (
        <div
          className="card"
          style={{
            border: '2px dashed var(--primary-orange)',
            backgroundColor: 'var(--surface-bg)',
            padding: 'var(--space-5)',
            textAlign: 'center',
            marginBottom: 'var(--space-5)',
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'var(--light-orange-subtle)', marginBottom: 'var(--space-3)' }}>
              <IconSparkles size={28} color="var(--primary-orange)" />
            </div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)', marginBottom: '8px' }}>
              Run Syllabus-Grounded AI Evaluation
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--secondary-text)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
              Evaluate verified student answers for <strong>{activeAnswerSheet.studentProfile?.name || 'Student'}</strong> against the question rubric and syllabus knowledge base using the pedagogical AI model.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
            >
              <IconSparkles size={16} />
              <span>{isEvaluating ? 'Evaluating Answers with AI...' : 'Evaluate Student Answers with AI'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress & Summary Bar */}
      {evaluations.length > 0 && (
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            backgroundColor: 'var(--card-highlight-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                Evaluated Questions
              </span>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
                {totalQuestions} Questions
              </div>
            </div>

            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                Suggested Total
              </span>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--dark-orange)' }}>
                {totalSuggestedMarks} / {totalMaxMarks} Marks
              </div>
            </div>

            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                Teacher Approval Progress
              </span>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: approvedCount === totalQuestions ? 'var(--success-dark)' : 'var(--warning-dark)' }}>
                {approvedCount} of {totalQuestions} Approved
              </div>
            </div>
          </div>

          {!isDemoMode && activeAnswerSheet && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              title="Re-run evaluation using updated answers or syllabus"
            >
              <IconRefreshCw size={14} className={isEvaluating ? 'spin' : ''} />
              <span>{isEvaluating ? 'Re-evaluating...' : 'Re-run AI Evaluation'}</span>
            </button>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      {evaluations.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('all')}
          >
            All Questions ({evaluations.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterType === 'needs-review' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('needs-review')}
          >
            Needs Teacher Review ({evaluations.filter((i) => !i.isTeacherApproved).length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterType === 'errors-only' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('errors-only')}
          >
            Learning Gaps ({evaluations.filter((i) => (i.isTeacherApproved ? i.approvedMarks : i.suggestedMarks) < i.maximumMarks).length})
          </button>
        </div>
      )}

      {/* Evaluation Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {isLoading ? (
          <EmptyState
            icon={<IconRefreshCw size={28} className="spin" />}
            title="Loading AI Evaluations..."
            description="Fetching stored pedagogical analyses and syllabus grounding evidence."
          />
        ) : evaluations.length === 0 ? (
          <EmptyState
            title="No AI analysis available yet"
            description="Click the evaluation button above to evaluate the verified student answers against the curriculum syllabus and question rubric."
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No questions match this filter"
            description="Toggle the filter button above to view all questions."
          />
        ) : (
          filteredItems.map((item) => {
            const maxMarks = item.maxMarks ?? item.maximumMarks ?? 5;
            const suggestedMarks = Number(item.suggestedMarks ?? 0);
            const approvedMarks =
              item.approvedMarks !== null && item.approvedMarks !== undefined
                ? Number(item.approvedMarks)
                : suggestedMarks;

            const status = item.reviewStatus || item.status || 'review_required';
            const isApproved = item.isTeacherApproved || status === 'approved';
            const isStale = status === 'stale';
            const hasError = (isApproved ? approvedMarks : suggestedMarks) < maxMarks;

            return (
              <div
                key={item._id}
                className="card"
                style={{
                  borderLeft: isApproved
                    ? '4px solid var(--success)'
                    : isStale
                    ? '4px solid var(--danger)'
                    : '4px solid var(--primary-orange)',
                  backgroundColor: hasError ? 'var(--card-highlight-bg)' : '#FFFFFF',
                  padding: 'var(--space-5)',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--dark-orange)' }}>
                        {item.questionNumber}
                      </span>
                      {item.topic && (
                        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                          {item.topic}
                        </span>
                      )}
                      {isApproved ? (
                        <span className="badge badge-success" style={{ fontSize: '11px' }}>
                          <IconCheck size={11} />
                          Teacher Approved
                        </span>
                      ) : isStale ? (
                        <span className="badge badge-danger" style={{ fontSize: '11px' }}>
                          Stale (Answer Modified)
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                          Review Required
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)' }}>
                      {item.prompt || 'Question Prompt'}
                    </span>
                  </div>

                  {/* Marks & Teacher Approval Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right', marginRight: '6px' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                        {isApproved ? 'Approved Score' : 'Suggested Score'}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: hasError ? 'var(--danger-dark)' : 'var(--success-dark)' }}>
                        {isApproved ? approvedMarks : suggestedMarks} / {maxMarks} Marks
                      </div>
                    </div>

                    {!isApproved && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApproveScore(item._id, item.suggestedMarks)}
                          disabled={approvingId === item._id}
                        >
                          <IconCheck size={14} />
                          <span>{approvingId === item._id ? 'Approving...' : `Approve (${item.suggestedMarks}M)`}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setEditingScoreId(editingScoreId === item._id ? null : item._id);
                            setScoreInput(String(item.suggestedMarks));
                          }}
                        >
                          Custom
                        </button>
                      </div>
                    )}

                    {isApproved && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setEditingScoreId(editingScoreId === item._id ? null : item._id);
                          setScoreInput(String(item.approvedMarks));
                        }}
                      >
                        Adjust Score
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Custom Score Editor */}
                {editingScoreId === item._id && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--surface-bg)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 'var(--space-3)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--main-text)' }}>
                      Set Teacher Score (0 - {item.maximumMarks}):
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={item.maximumMarks}
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      className="form-input"
                      style={{ width: '70px', padding: '4px 8px' }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApproveScore(item._id, Number(scoreInput))}
                      disabled={approvingId === item._id || isNaN(Number(scoreInput)) || Number(scoreInput) < 0 || Number(scoreInput) > item.maximumMarks}
                    >
                      Save Approval
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingScoreId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Answers Comparison Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-4)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                      Student's Submitted Work
                    </span>
                    <pre style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: hasError ? 'var(--danger-dark)' : 'var(--main-text)' }}>
                      {item.studentAnswer || '(No answer provided)'}
                    </pre>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--success-dark)', textTransform: 'uppercase' }}>
                      Expected Rubric Solution
                    </span>
                    <pre style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--main-text)' }}>
                      {item.expectedAnswer || '(Rubric exemplar solution)'}
                    </pre>
                  </div>
                </div>

                {/* Pedagogical Analysis Cards: Observed Fact vs Conceptual Hypothesis */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  {/* Observed Evidence */}
                  <div
                    style={{
                      backgroundColor: 'var(--surface-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                        Observed Errors & Criteria
                      </span>
                    </div>
                    {Array.isArray(item.observedErrors) ? (
                      item.observedErrors.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: 'var(--font-size-sm)', color: 'var(--main-text)' }}>
                          {item.observedErrors.map((err, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)', lineHeight: 1.5, margin: 0 }}>
                          {item.explanation || 'No errors observed. Answer adheres to expected rubric criteria.'}
                        </p>
                      )
                    ) : (
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)', lineHeight: 1.5, margin: 0 }}>
                        {item.observedErrors && item.observedErrors !== 'None'
                          ? item.observedErrors
                          : item.explanation || 'No errors observed. Answer adheres to expected rubric criteria.'}
                      </p>
                    )}
                  </div>

                  {/* AI Conceptual Hypothesis */}
                  <div
                    style={{
                      backgroundColor: 'var(--light-orange-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span className="badge badge-orange" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                        <IconSparkles size={12} />
                        AI Misconception Hypothesis
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--dark-orange)', lineHeight: 1.5, margin: 0 }}>
                      {item.misconceptionHypothesis || 'No persistent conceptual misconception detected.'}
                    </p>
                  </div>
                </div>

                {/* Syllabus Grounding & RAG Evidence Banner */}
                {item.syllabusEvidence && item.syllabusEvidence.length > 0 ? (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <IconBookOpen size={14} color="var(--secondary-text)" />
                      <strong style={{ color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                        Syllabus Evidence Grounding:
                      </strong>
                      <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                        {item.syllabusEvidence[0].documentTitle || item.syllabusEvidence[0].sourceFileName || 'Syllabus'} &bull; Page {item.syllabusEvidence[0].pageNumber || 1}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--secondary-text)', fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{item.syllabusEvidence[0].excerpt}"
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: 'var(--surface-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--secondary-text)',
                    }}
                  >
                    <em>Syllabus vector reference: Standard curriculum criteria applied.</em>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
}
