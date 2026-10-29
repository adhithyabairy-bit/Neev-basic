import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  IconSparkles,
  IconAlertCircle,
  IconCheckCircle,
  IconInfo,
} from '../components/Icons';

export default function AIAnswerAnalysis({
  analysisData = [],
  isTeacherConfirmed = true,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'errors-only'

  if (!isTeacherConfirmed) {
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

  const filteredItems = analysisData.filter((item) => {
    if (filterType === 'errors-only') {
      return item.marksAwarded < item.maxMarks;
    }
    return true;
  });

  return (
    <div className="section-container" aria-label="AI Answer Analysis Section">
      <PageHeader
        title="AI Answer Analysis & Misconception Detection"
        subtitle="Differentiates between directly observed student errors and inferred conceptual misconceptions."
        badgeText="Pedagogical Analysis"
      />

      {/* Disclaimers & Methodology Banner */}
      <div className="alert alert-notice" role="status">
        <IconInfo size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Analysis Distinction: </strong>
          <span>
            <strong>Observed Errors</strong> represent direct mathematical discrepancies in student work. <strong>AI Hypotheses</strong> are prospective conceptual root causes and should be treated as educator hypotheses to investigate, not definitive student labels.
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-5)' }}>
        <button
          type="button"
          className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilterType('all')}
        >
          All Analyzed Questions ({analysisData.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filterType === 'errors-only' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilterType('errors-only')}
        >
          Questions with Learning Gaps ({analysisData.filter((i) => i.marksAwarded < i.maxMarks).length})
        </button>
      </div>

      {/* Analysis Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {analysisData.length === 0 ? (
          <EmptyState
            title="No AI analysis available yet"
            description="Student answer sheets have not yet been evaluated by the AI pedagogical analysis pipeline (Phase 3). Once answer sheets are processed, conceptual misconceptions and observed errors will be detailed here."
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No questions match this filter"
            description="Toggle the filter button above to view all questions."
          />
        ) : (
          filteredItems.map((item) => {
            const hasError = item.marksAwarded < item.maxMarks;

            return (
              <div
                key={item.questionId}
                className="card"
                style={{
                  borderLeft: hasError ? '4px solid var(--primary-orange)' : '4px solid var(--success)',
                  backgroundColor: hasError ? 'var(--card-highlight-bg)' : '#FFFFFF',
                  padding: 'var(--space-5)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--dark-orange)', marginRight: '8px' }}>
                      {item.questionNumber}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)' }}>
                      {item.prompt}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className={`badge ${hasError ? 'badge-warning' : 'badge-success'}`}>
                      Score: {item.marksAwarded} / {item.maxMarks} Marks
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                      Confidence: {item.confidence}
                    </span>
                  </div>
                </div>

                {/* Answers Comparison Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                      {item.studentAnswer}
                    </pre>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--success-dark)', textTransform: 'uppercase' }}>
                      Expected Exemplar Solution
                    </span>
                    <pre style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--main-text)' }}>
                      {item.expectedAnswer}
                    </pre>
                  </div>
                </div>

                {/* Pedagogical Analysis Cards: Fact vs Hypothesis */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
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
                        Observed Fact & Rubric Evidence
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)', lineHeight: 1.5 }}>
                      {item.observedEvidence}
                    </p>
                  </div>

                  {/* AI Hypothesis */}
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
                        AI Conceptual Hypothesis
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--dark-orange)', lineHeight: 1.5 }}>
                      {item.aiHypothesis}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
