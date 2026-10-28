import React from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  IconTarget,
  IconChevronRight,
  IconAlertTriangle,
  IconSparkles,
} from '../components/Icons';

export default function PrerequisiteGaps({
  gapsData = [],
  syllabusData,
}) {
  const lessons = syllabusData?.lessons || [];

  return (
    <div className="section-container" aria-label="Trace Prerequisite Gaps Section">
      <PageHeader
        title="Trace Prerequisite Learning Gaps"
        subtitle="Uncovers foundational root causes by tracing examination errors back to earlier grade concepts."
        badgeText="Gap Root Tracing"
      />

      {/* Visual Relationship Flow Ribbon */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-6)',
          backgroundColor: 'var(--surface-bg)',
          padding: '16px 20px',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Root Cause Tracing Architecture
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginTop: '8px',
            flexWrap: 'wrap',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          <span className="badge badge-danger">1. Observed Question Error</span>
          <IconChevronRight size={16} color="var(--secondary-text)" />
          <span className="badge badge-warning">2. Conceptual Misconception</span>
          <IconChevronRight size={16} color="var(--secondary-text)" />
          <span className="badge badge-orange">3. Prerequisite Topic</span>
          <IconChevronRight size={16} color="var(--secondary-text)" />
          <span className="badge badge-success">4. Root Grade Level</span>
        </div>
      </div>

      {/* Gaps List */}
      {gapsData.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={28} />}
          title="No prerequisite gaps identified"
          description="Either all questions were solved without error, or answer analysis has not yielded conceptual gap links."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {gapsData.map((gap, index) => {
            // Find syllabus lesson metadata safely
            const linkedLesson = lessons.find((l) => l.id === gap.lessonId || l.name === gap.lessonName);
            const gradeDisplay = linkedLesson ? linkedLesson.grade : gap.grade || 'Foundational';

            const likelihoodBadge =
              gap.likelihood === 'Likely'
                ? 'badge-orange'
                : gap.likelihood === 'Possible'
                ? 'badge-warning'
                : 'badge-neutral';

            return (
              <div
                key={gap.id || index}
                className="card card-highlight"
                style={{ padding: 'var(--space-5)' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                        GAP ROOT #{index + 1}
                      </span>
                      <span className="badge badge-orange">{gradeDisplay}</span>
                      <span className={`badge ${likelihoodBadge}`}>
                        Likelihood: {gap.likelihood}
                      </span>
                    </div>

                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
                      {gap.topicName}
                    </h2>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '2px' }}>
                      Anchored to Syllabus Topic: <strong>{gap.lessonName}</strong>
                    </p>
                  </div>

                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    {gap.status}
                  </span>
                </div>

                {/* Evidence Callout */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--dark-orange)', textTransform: 'uppercase' }}>
                    Diagnostic Evidence from Answer Sheets
                  </span>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)', marginTop: '4px' }}>
                    {gap.evidence}
                  </p>
                </div>

                {/* Dependent Syllabus Topics affected */}
                {gap.dependentTopics && gap.dependentTopics.length > 0 && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Blocks mastery of: </span>
                    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {gap.dependentTopics.map((topic, tIdx) => (
                        <span key={tIdx} className="badge badge-neutral" style={{ fontSize: '11px' }}>
                          {topic}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
