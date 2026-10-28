import React from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  IconCompass,
  IconCheckCircle,
  IconBookOpen,
  IconInfo,
} from '../components/Icons';

export default function LearningRoadmap({
  roadmapData = [],
  onUpdateRoadmap,
}) {
  const handleStatusChange = (itemId, newStatus) => {
    const updated = roadmapData.map((item) =>
      item.id === itemId ? { ...item, status: newStatus } : item
    );
    onUpdateRoadmap(updated);
  };

  const totalMinutes = roadmapData.reduce((sum, item) => sum + (item.estimatedMinutes || 0), 0);
  const totalPractice = roadmapData.reduce((sum, item) => sum + (item.practiceQuestions || 0), 0);

  return (
    <div className="section-container" aria-label="Learning Roadmap Section">
      <PageHeader
        title="Personalized Remediation Learning Roadmap"
        subtitle="Ordered study sequence starting from foundational gaps before advancing to dependent syllabus skills."
        badgeText="Study Pathway"
      />

      {/* Summary Metrics Bar */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-6)',
          backgroundColor: 'var(--card-highlight-bg)',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <span style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--muted-text)', fontWeight: 'bold' }}>
              Curated Roadmap Overview
            </span>
            <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)', marginTop: '2px' }}>
              {roadmapData.length} Sequenced Milestones &bull; Estimated Time: ~{totalMinutes} mins &bull; {totalPractice} Practice Problems
            </p>
          </div>
          <span className="badge badge-orange">Prerequisite-First Ordering</span>
        </div>
      </div>

      {roadmapData.length === 0 ? (
        <EmptyState
          icon={<IconCompass size={28} />}
          title="No roadmap items generated"
          description="Identify learning gaps in Step 6 to construct the ordered remediation roadmap."
        />
      ) : (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {roadmapData.map((step, idx) => {
            const isMastered = step.status === 'Mastered';
            const isInProgress = step.status === 'In Progress';

            return (
              <div
                key={step.id || idx}
                className="card"
                style={{
                  borderLeft: isMastered ? '4px solid var(--success)' : '4px solid var(--primary-orange)',
                  padding: 'var(--space-5)',
                  position: 'relative',
                }}
              >
                {/* Step Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                      <span className="badge badge-orange">
                        Step {step.rank || idx + 1}
                      </span>
                      <span className="badge badge-neutral">{step.grade}</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                        Prerequisite: <strong>{step.prereqChain}</strong>
                      </span>
                    </div>

                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
                      {step.topic}
                    </h2>
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor={`status-select-${step.id}`} className="sr-only">
                      Progress status for {step.topic}
                    </label>
                    <select
                      id={`status-select-${step.id}`}
                      value={step.status || 'Not Started'}
                      onChange={(e) => handleStatusChange(step.id, e.target.value)}
                      className="form-select"
                      style={{
                        padding: '6px 10px',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: '600',
                        backgroundColor: isMastered ? 'var(--success-light)' : isInProgress ? 'var(--light-orange)' : '#FFFFFF',
                        borderColor: isMastered ? 'var(--success-border)' : isInProgress ? 'var(--primary-orange)' : 'var(--border-color)',
                        color: isMastered ? 'var(--success-dark)' : isInProgress ? 'var(--dark-orange)' : 'var(--main-text)',
                      }}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Mastered">Mastered</option>
                    </select>
                  </div>
                </div>

                {/* Pedagogical Activities & Worked Examples */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 'var(--space-3)',
                    backgroundColor: 'var(--surface-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-4)',
                    marginTop: 'var(--space-3)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                      Recommended Activity
                    </span>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)', marginTop: '4px' }}>
                      {step.recommendedActivity}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>
                      Worked Examples & Practice
                    </span>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)', marginTop: '4px' }}>
                      {step.workedExamples}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                        {step.practiceQuestions} Guided Problems
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                        ~{step.estimatedMinutes} Minutes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
