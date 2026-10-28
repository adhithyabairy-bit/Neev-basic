import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  IconUsers,
  IconInfo,
  IconCheckCircle,
  IconCheck,
  IconArrowUp,
  IconArrowDown,
  IconTarget,
  IconRefreshCw,
  IconAlertTriangle,
  IconBookOpen,
} from '../components/Icons';
import { INITIAL_CLASS_GAP_DATA } from '../data/initialData';

export default function ClassGapOverview({
  syllabusData,
  classGapData = INITIAL_CLASS_GAP_DATA,
}) {
  // Filter state
  const [selectedClass, setSelectedClass] = useState(
    syllabusData?.selectedClass || classGapData.classSummary.selectedClass
  );
  const [selectedSection, setSelectedSection] = useState(classGapData.classSummary.selectedSection);
  const [selectedSubject, setSelectedSubject] = useState(
    syllabusData?.selectedSubject || classGapData.classSummary.selectedSubject
  );
  const [selectedAssessment, setSelectedAssessment] = useState(
    syllabusData?.examName || classGapData.classSummary.assessmentPeriod
  );

  // Teaching priority order state (allows teacher to reorder & mark covered)
  const [teachingOrder, setTeachingOrder] = useState(classGapData.recommendedTeachingOrder);
  const [coveredNotice, setCoveredNotice] = useState(null);

  // Simulated empty state check: only Grade 8 Section A has demo data
  const hasAssessmentData =
    selectedClass === 'Grade 8' && (selectedSection === 'Section A' || selectedSection === 'All Sections');

  // Toggle covered state for a topic
  const handleToggleCovered = (topicId) => {
    setTeachingOrder((prev) =>
      prev.map((item) => {
        if (item.id === topicId) {
          const nextState = !item.covered;
          setCoveredNotice(
            nextState
              ? `Marked "${item.topicName}" as covered in class.`
              : `Marked "${item.topicName}" as pending revision.`
          );
          setTimeout(() => setCoveredNotice(null), 3500);
          return { ...item, covered: nextState };
        }
        return item;
      })
    );
  };

  // Reorder topics in teaching sequence (Move Up / Down)
  const handleMoveTopic = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= teachingOrder.length) return;

    setTeachingOrder((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[newIndex];
      updated[newIndex] = temp;
      return updated.map((item, idx) => ({ ...item, rank: idx + 1 }));
    });
  };

  // Calculate live teaching plan metrics
  const totalRevisionMinutes = teachingOrder
    .filter((t) => !t.covered)
    .reduce((sum, t) => sum + (Number(t.estimatedMinutes) || 0), 0);
  const coveredCount = teachingOrder.filter((t) => t.covered).length;
  const totalTopicsCount = teachingOrder.length;

  const resetFilters = () => {
    setSelectedClass('Grade 8');
    setSelectedSection('Section A');
    setSelectedSubject('Mathematics');
    setSelectedAssessment(syllabusData?.examName || 'Mid-Term Algebra & Geometry Assessment');
  };

  return (
    <div className="section-container class-overview-container" aria-label="Class Gap Overview Section">
      <PageHeader
        title="Class Gap Overview & Teaching Priorities"
        subtitle="Identify shared learning gaps across your class and plan targeted revision before moving to new syllabus concepts."
        badgeText="Class Diagnostic"
      />

      {/* Demonstration Data Banner */}
      <div className="alert alert-notice" role="status">
        <IconInfo size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Sample data &bull; Demonstration only: </strong>
          <span>
            Class-wide priorities shown below illustrate how Neev sequences revision based on prerequisite relationships.
            Actual class priorities will calculate automatically once live multi-student batch scoring is loaded.
          </span>
        </div>
      </div>

      {coveredNotice && (
        <div className="alert alert-success" role="status">
          <IconCheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{coveredNotice}</span>
        </div>
      )}

      {/* Class & Assessment Filters Toolbar */}
      <section className="class-filters-card" aria-labelledby="filter-heading">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="overview-class" className="filter-label">
              Class Grade
            </label>
            <select
              id="overview-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="form-select"
            >
              <option value="Grade 8">Grade 8 (Active Assessment)</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 9">Grade 9 (No Data)</option>
              <option value="Grade 10">Grade 10 (No Data)</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="overview-section" className="filter-label">
              Section
            </label>
            <select
              id="overview-section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="form-select"
            >
              <option value="Section A">Section A (Assessed)</option>
              <option value="Section B">Section B (Pending)</option>
              <option value="All Sections">All Sections</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="overview-subject" className="filter-label">
              Subject
            </label>
            <select
              id="overview-subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="form-select"
            >
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="overview-assessment" className="filter-label">
              Assessment Filter
            </label>
            <select
              id="overview-assessment"
              value={selectedAssessment}
              onChange={(e) => setSelectedAssessment(e.target.value)}
              className="form-select"
            >
              <option value={syllabusData?.examName || 'Mid-Term Algebra & Geometry Assessment'}>
                {syllabusData?.examName || 'Mid-Term Assessment'}
              </option>
              <option value="Unit Diagnostic 1">Unit Diagnostic 1</option>
            </select>
          </div>
        </div>
      </section>

      {!hasAssessmentData ? (
        /* Empty / Insufficient Data State */
        <div className="card">
          <EmptyState
            icon={<IconAlertTriangle size={32} color="var(--warning)" />}
            title={`No assessment data found for ${selectedClass} - ${selectedSection}`}
            description="Upload answer sheets for at least 5 students in this class to generate class-wide learning gap trends and priority recommendations."
          />
          <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
            <div className="alert alert-notice" style={{ maxWidth: '600px', margin: '0 auto var(--space-4)' }}>
              <IconInfo size={16} />
              <span>
                <strong>Methodology Note: </strong>
                Neev never treats an unassessed student as a student without a learning gap. Only completed student evaluations contribute to class-wide priorities.
              </span>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={resetFilters}>
              <IconRefreshCw size={14} />
              <span>Reset to Sample Class (Grade 8 Section A)</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="metrics-grid">
            <div className="metric-card accent">
              <div className="metric-header">
                <span className="metric-label">Students Assessed</span>
                <IconUsers size={18} color="var(--primary-orange)" />
              </div>
              <div className="metric-value-row">
                <span className="metric-number orange">
                  {classGapData.classSummary.totalAssessed}
                </span>
                <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--secondary-text)' }}>
                  / {classGapData.classSummary.totalEnrolled}
                </span>
              </div>
              <span className="metric-subtext">
                {classGapData.classSummary.coveragePercent}% Assessment Coverage
              </span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Topics Analyzed</span>
                <IconBookOpen size={18} color="var(--secondary-text)" />
              </div>
              <div className="metric-value-row">
                <span className="metric-number">
                  {classGapData.classSummary.topicsAnalyzed}
                </span>
              </div>
              <span className="metric-subtext">Across Grades 7 &amp; 8 Standards</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Topics Needing Revision</span>
                <IconAlertTriangle size={18} color="var(--danger)" />
              </div>
              <div className="metric-value-row">
                <span className="metric-number danger">
                  {classGapData.classSummary.topicsNeedingRevision}
                </span>
              </div>
              <span className="metric-subtext">Prerequisite Foundation Gaps</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Individual Support</span>
                <IconTarget size={18} color="var(--warning-dark)" />
              </div>
              <div className="metric-value-row">
                <span className="metric-number" style={{ color: 'var(--warning-dark)' }}>
                  {classGapData.classSummary.studentsFlaggedSupport}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                  Students
                </span>
              </div>
              <span className="metric-subtext">Flagged for 1-on-1 Remediation</span>
            </div>
          </div>

          {/* Teaching Plan Tracker Banner */}
          <section className="teaching-plan-summary" aria-label="Teaching Plan Tracker">
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--dark-orange)' }}>
                Active Revision Roadmap
              </span>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)', marginTop: '2px' }}>
                Class Teaching Priority Tracker
              </h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                Sequenced logically: foundational prerequisite gaps must be resolved before advancing to multi-step equations.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                  Topics Addressed:
                </div>
                <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--success-dark)' }}>
                  {coveredCount} of {totalTopicsCount} Completed
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                  Est. Revision Time:
                </div>
                <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
                  {totalRevisionMinutes > 0
                    ? `${Math.floor(totalRevisionMinutes / 60)}h ${totalRevisionMinutes % 60}m`
                    : 'All Topics Covered'}
                </div>
              </div>
            </div>
          </section>

          {/* Section 1: Recommended Teaching Order */}
          <section className="card" aria-labelledby="teaching-order-heading">
            <div className="card-header">
              <div>
                <h2 id="teaching-order-heading" className="card-title">
                  Recommended Teaching Order
                </h2>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                  Pedagogical sequence ordered by prerequisite dependency and concept criticality.
                </p>
              </div>
              <span className="badge badge-orange">Prerequisite-First Sequence</span>
            </div>

            <div className="priority-list">
              {teachingOrder.map((topic, index) => {
                const isFirst = index === 0;
                const isLast = index === teachingOrder.length - 1;

                return (
                  <article
                    key={topic.id}
                    className={`priority-item-card ${topic.covered ? 'is-covered' : ''}`}
                    aria-label={`Priority ${topic.rank}: ${topic.topicName}`}
                  >
                    <div className="priority-header-row">
                      <div className="priority-badge-title">
                        <div
                          className={`priority-rank-circle ${topic.covered ? 'covered' : ''}`}
                          aria-label={`Rank ${topic.rank}`}
                        >
                          {topic.covered ? <IconCheck size={16} /> : topic.rank}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <h3 className="priority-topic-name">{topic.topicName}</h3>
                            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                              {topic.grade}
                            </span>
                            {topic.covered && (
                              <span className="badge badge-success" style={{ fontSize: '11px' }}>
                                Covered in Class
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--danger-dark)', fontWeight: 'var(--font-weight-semibold)' }}>
                            {topic.strugglingCount} of {classGapData.classSummary.totalAssessed} students affected ({topic.percentage}%)
                          </span>
                        </div>
                      </div>

                      {/* Action buttons: Move Up, Move Down, Mark as Covered */}
                      <div className="priority-actions-group">
                        <button
                          type="button"
                          className="btn-icon-only"
                          onClick={() => handleMoveTopic(index, -1)}
                          disabled={isFirst}
                          title="Move earlier in teaching sequence"
                          aria-label={`Move ${topic.topicName} up`}
                        >
                          <IconArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-only"
                          onClick={() => handleMoveTopic(index, 1)}
                          disabled={isLast}
                          title="Move later in teaching sequence"
                          aria-label={`Move ${topic.topicName} down`}
                        >
                          <IconArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${topic.covered ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleToggleCovered(topic.id)}
                        >
                          {topic.covered ? (
                            <>
                              <IconRefreshCw size={14} />
                              <span>Mark Pending</span>
                            </>
                          ) : (
                            <>
                              <IconCheck size={14} />
                              <span>Mark Covered</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detailed Rationale & Suggested Activity */}
                    <div className="priority-detail-grid">
                      <div className="priority-detail-item">
                        <span className="priority-detail-label">Why This Priority?</span>
                        <p className="priority-detail-value">{topic.priorityReason}</p>
                      </div>

                      <div className="priority-detail-item">
                        <span className="priority-detail-label">Prerequisites</span>
                        <p className="priority-detail-value">{topic.prerequisites}</p>
                      </div>

                      <div className="priority-detail-item">
                        <span className="priority-detail-label">Suggested Classroom Activity</span>
                        <p className="priority-detail-value">{topic.suggestedActivity}</p>
                      </div>

                      <div className="priority-detail-item">
                        <span className="priority-detail-label">Estimated Revision Time</span>
                        <p className="priority-detail-value" style={{ fontWeight: 'var(--font-weight-bold)' }}>
                          {topic.estimatedMinutes} Minutes
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Section 2: Topic-wise Gap Analysis Table */}
          <section className="card" aria-labelledby="topic-gaps-heading">
            <div className="card-header">
              <div>
                <h2 id="topic-gaps-heading" className="card-title">
                  Topic-Wise Learning Gap Breakdown
                </h2>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                  Detailed breakdown of assessed syllabus topics, distinguishing foundational vs current grade standards.
                </p>
              </div>
              <span className="badge badge-neutral">
                {classGapData.topicWiseGaps.length} Topics Assessed
              </span>
            </div>

            <div className="gap-table-wrapper">
              <table className="gap-table">
                <thead>
                  <tr>
                    <th>Curriculum Topic</th>
                    <th>Standard Level</th>
                    <th>Category</th>
                    <th>Students Struggling</th>
                    <th>Severity</th>
                    <th>Prerequisite Relationships</th>
                  </tr>
                </thead>
                <tbody>
                  {classGapData.topicWiseGaps.map((item) => {
                    const fillClass =
                      item.percentage >= 70 ? 'high' : item.percentage >= 45 ? 'medium' : 'normal';

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.topicName}</strong>
                        </td>
                        <td>
                          <span className="badge badge-neutral">{item.grade}</span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              item.category.includes('Foundational')
                                ? 'badge-orange'
                                : 'badge-neutral'
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <div className="gap-progress-container">
                            <div className="gap-progress-track">
                              <div
                                className={`gap-progress-fill ${fillClass}`}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                            <span className="gap-progress-label">
                              {item.strugglingCount}/{item.totalAssessed} ({item.percentage}%)
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              item.priority === 'High'
                                ? 'badge-danger'
                                : item.priority === 'Medium'
                                ? 'badge-orange'
                                : 'badge-success'
                            }`}
                          >
                            {item.priority} Priority
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                          <div>
                            <strong>Blocks: </strong>
                            <span>{item.dependentConcepts}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Students Needing Individual Support */}
          <section className="card" aria-labelledby="individual-support-heading">
            <div className="card-header">
              <div>
                <h2 id="individual-support-heading" className="card-title">
                  Students Needing Individual Support
                </h2>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                  Students with specific isolated prerequisite gaps who benefit from targeted 1-on-1 remediation.
                </p>
              </div>
              <span className="badge badge-orange">
                {classGapData.studentsNeedingSupport.length} Students Flagged
              </span>
            </div>

            <div className="individual-support-list">
              {classGapData.studentsNeedingSupport.map((student) => {
                const initials = student.studentName
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2);

                return (
                  <div key={student.id} className="support-student-row">
                    <div className="support-student-info">
                      <div className="support-student-avatar" aria-hidden="true">
                        {initials}
                      </div>
                      <div>
                        <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--main-text)' }}>
                          {student.studentName}
                        </strong>
                        <div style={{ color: 'var(--danger-dark)', fontSize: '11px', marginTop: '2px' }}>
                          Topic: {student.topic}
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        Prerequisite Gap
                      </span>
                      <p style={{ color: 'var(--main-text)', fontSize: 'var(--font-size-xs)' }}>
                        {student.prerequisiteGap}
                      </p>
                    </div>

                    <div style={{ flex: 1.2, minWidth: '240px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--dark-orange)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        Suggested Follow-up Action
                      </span>
                      <p style={{ color: 'var(--secondary-text)', fontSize: 'var(--font-size-xs)' }}>
                        {student.followUpAction}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
