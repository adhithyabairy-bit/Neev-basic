import React from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  IconTarget,
  IconChevronRight,
  IconAlertTriangle,
  IconBookOpen,
  IconDownload,
  IconSparkles,
  IconCheckCircle,
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
        subtitle="Uncovers foundational root causes by tracing examination errors back to earlier grade concepts and forecasting downstream curriculum impact."
        badgeText="Gap Root Tracing & Textbook Retrieval"
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
          Pedagogical Root-Cause Tracing Pipeline
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
          <span className="badge badge-orange">3. Previous Class Lesson (PDF)</span>
          <IconChevronRight size={16} color="var(--secondary-text)" />
          <span className="badge badge-danger">4. Future Lessons Blocked</span>
        </div>
      </div>

      {/* Gaps List */}
      {gapsData.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={28} />}
          title="No prerequisite gaps identified"
          description="Either all questions were solved without conceptual errors, or answer analysis has validated complete curriculum mastery."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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

            const prereq = gap.prerequisiteLesson;
            const futureLessons = gap.futureLessonsAffected || [];

            return (
              <div
                key={gap.id || index}
                className="card card-highlight"
                style={{ padding: 'var(--space-5)' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                        GAP ROOT #{index + 1}
                      </span>
                      <span className="badge badge-orange">{gradeDisplay}</span>
                      <span className={`badge ${likelihoodBadge}`}>
                        Likelihood: {gap.likelihood}
                      </span>
                      {gap.questionNumber && (
                        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                          Question {gap.questionNumber}
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)', marginTop: '4px' }}>
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

                {/* Diagnostic Evidence Callout */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--dark-orange)', textTransform: 'uppercase' }}>
                    Diagnostic Evidence from Answer Sheets
                  </span>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)', marginTop: '4px' }}>
                    {gap.evidence}
                  </p>
                </div>

                {/* Foundational Prerequisite Chapter to Learn (Previous Grade) */}
                {prereq && (
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      marginBottom: 'var(--space-4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconBookOpen size={18} color="var(--primary-orange)" />
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--main-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Foundational Lesson to Learn (Previous Class Syllabus)
                        </span>
                      </div>
                      <span className="badge badge-orange" style={{ fontSize: '11px' }}>
                        {prereq.grade} NCERT Syllabus
                      </span>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'bold', color: 'var(--main-text)' }}>
                        {prereq.chapterName}
                      </h3>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '4px' }}>
                        <strong>Foundational Concept:</strong> {prereq.concept}
                      </p>
                      {prereq.studyTip && (
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary-orange)', marginTop: '4px' }}>
                          <strong>Recommended Study Focus:</strong> {prereq.studyTip}
                        </p>
                      )}
                    </div>

                    {/* PDF Action Button & Footnote */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                        Source: Database Knowledge Base &bull; <strong>{prereq.fileName}</strong>
                      </span>

                      <a
                        href={prereq.pdfUrl || `/curriculum/${encodeURIComponent(prereq.fileName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: 'var(--font-size-xs)',
                          textDecoration: 'none',
                        }}
                      >
                        <IconDownload size={14} />
                        <span>Open Lesson PDF ({prereq.grade})</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Future Grade Lessons Affected if Not Learned Now */}
                {futureLessons && futureLessons.length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#FFF7ED',
                      border: '1px solid #FED7AA',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <IconAlertTriangle size={16} color="#EA580C" />
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: '#9A3412', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Future Lessons Affected if Not Learned Now
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {futureLessons.map((fut, fIdx) => (
                        <div
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            backgroundColor: '#FFFFFF',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #FFEDD5',
                          }}
                        >
                          <span className="badge badge-warning" style={{ fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {fut.grade}
                          </span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--main-text)' }}>
                              {fut.lessonName}
                            </p>
                            <p style={{ fontSize: '11px', color: '#78350F', marginTop: '2px' }}>
                              <strong>Curriculum Risk:</strong> {fut.risk}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependent Syllabus Topics affected */}
                {gap.dependentTopics && gap.dependentTopics.length > 0 && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '8px' }}>
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
