import React, { useState } from 'react';
import { DASHBOARD_DEMO_DATA } from '../data/dashboardDemoData';
import EmptyState from '../components/EmptyState';
import {
  IconCheck,
  IconUsers,
  IconAlertTriangle,
  IconCheckCircle,
  IconLogOut,
  IconPlus,
  IconSparkles,
  IconFileText,
  IconTarget,
  IconArrowRight,
  IconRefreshCw,
  IconBookOpen,
} from '../components/Icons';

// Class-specific teaching priorities mapped to each class & section
const CLASS_TEACHING_PRIORITIES = {
  'cls-8a': [
    {
      id: 'tp-8a-1',
      rank: 1,
      topicName: 'Subtractions of Negative Integers: -(-a) = +a',
      grade: 'Grade 7 Foundational',
      reason: 'Root Foundation: Cascading errors across all transposition and algebraic isolation steps.',
      suggestedActivity: '15-minute number line visual simulation paired with opposite-sign chip exercises.',
      estimatedMinutes: 45,
    },
    {
      id: 'tp-8a-2',
      rank: 2,
      topicName: 'Distributive Property across Parentheses: a(b - c)',
      grade: 'Grade 7 Foundational',
      reason: 'Algebra Foundation: Omitted distribution across second term in binomials.',
      suggestedActivity: 'Area model rectangular grid diagrams with colored variable tiles.',
      estimatedMinutes: 40,
    },
    {
      id: 'tp-8a-3',
      rank: 3,
      topicName: 'Transposition & Inverse Operations across Equals Sign',
      grade: 'Grade 7 Foundational',
      reason: 'Equation Balancing: Viewing equals sign as divider rather than a balanced scale.',
      suggestedActivity: 'Physical or interactive balance scale demonstration maintaining equality.',
      estimatedMinutes: 45,
    },
  ],
  'cls-8b': [
    {
      id: 'tp-8b-1',
      rank: 1,
      topicName: 'Fraction Addition & Common Denominators in Equations',
      grade: 'Grade 7 Foundational',
      reason: 'Rational Coefficients: Cross-multiplication errors and failure to multiply all terms by common denominators.',
      suggestedActivity: 'Fraction bar manipulatives and clearing fractions step-by-step drills.',
      estimatedMinutes: 40,
    },
    {
      id: 'tp-8b-2',
      rank: 2,
      topicName: 'Variables on Both Sides: ax + b = cx + d',
      grade: 'Grade 8 Core',
      reason: 'Variable Grouping: Combining unlike terms and missing sign flips when grouping variable terms.',
      suggestedActivity: 'Color-coded variable and constant sorting cards.',
      estimatedMinutes: 45,
    },
    {
      id: 'tp-8b-3',
      rank: 3,
      topicName: 'Algebraic Word Problems on Perimeter and Ages',
      grade: 'Grade 8 Core',
      reason: 'Mathematical Modeling: Misinterpreting verbal constraints into balanced equations.',
      suggestedActivity: 'Sentence-to-equation graphic organizer with guided keywords.',
      estimatedMinutes: 50,
    },
  ],
  'cls-9a': [
    {
      id: 'tp-9a-1',
      rank: 1,
      topicName: 'Middle-Term Splitting for Quadratic Factorisation: x² + bx + c',
      grade: 'Grade 8 Foundational',
      reason: 'Factorisation Gap: Difficulty identifying factor pairs whose sum matches the middle linear coefficient.',
      suggestedActivity: 'Product-Sum grid tables and geometric area factorization puzzles.',
      estimatedMinutes: 50,
    },
    {
      id: 'tp-9a-2',
      rank: 2,
      topicName: 'Laws of Exponents & Negative Powers: a^(-n) = 1/a^n',
      grade: 'Grade 8 Foundational',
      reason: 'Indices Foundation: Confusing negative exponent powers with negative value quantities.',
      suggestedActivity: 'Pattern expansion table tracing powers from 2³ down to 2^(-3).',
      estimatedMinutes: 35,
    },
    {
      id: 'tp-9a-3',
      rank: 3,
      topicName: 'Algebraic Identities: Difference of Two Squares (a² - b²)',
      grade: 'Grade 8 Foundational',
      reason: 'Identity Confusion: Confusing (a - b)² with (a² - b²) in algebraic simplifications.',
      suggestedActivity: 'Geometric cutting-and-rearranging area proof demonstration.',
      estimatedMinutes: 40,
    },
  ],
  'cls-7c': [
    {
      id: 'tp-7c-1',
      rank: 1,
      topicName: 'Number Line Representation & Negative Number Subtraction',
      grade: 'Grade 6 Foundational',
      reason: 'Directional Error: Walking in the wrong direction on the number line when subtracting negative integers.',
      suggestedActivity: 'Interactive integer walking line mat with directional arrows.',
      estimatedMinutes: 40,
    },
    {
      id: 'tp-7c-2',
      rank: 2,
      topicName: 'Order of Operations with Parentheses & Brackets (BODMAS)',
      grade: 'Grade 6 Foundational',
      reason: 'Calculation Sequence: Performing left-to-right operations ignoring operator precedence.',
      suggestedActivity: 'Tiered expression pyramids highlighting bracket resolution order.',
      estimatedMinutes: 45,
    },
    {
      id: 'tp-7c-3',
      rank: 3,
      topicName: 'One-Step Equations with Inverse Operations (x + a = b)',
      grade: 'Grade 6 Foundational',
      reason: 'Equation Balance: Adding to one side instead of maintaining balance across equals sign.',
      suggestedActivity: 'Physical balance scale with weights and mystery cups.',
      estimatedMinutes: 30,
    },
  ],
};

export default function TeacherDashboard({
  currentUser,
  onLogout,
  onStartNewAssessment,
  onOpenClassPriorities,
  isDemoMode = false,
}) {
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('cls-8a');

  // Track class-level progress and retest status (One-way completion)
  const [classState, setClassState] = useState({
    'cls-8a': { teachingsCompleted: 4, teachingsPending: 3, retestConducted: false },
    'cls-8b': { teachingsCompleted: 3, teachingsPending: 2, retestConducted: false },
    'cls-9a': { teachingsCompleted: 5, teachingsPending: 2, retestConducted: false },
    'cls-7c': { teachingsCompleted: 2, teachingsPending: 1, retestConducted: false },
  });

  // Track completed priority topics across all classes (One-way completion - cannot be undone once clicked)
  const [completedPriorities, setCompletedPriorities] = useState(new Set());

  const teacherName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Teacher';

  // Mark a priority as completed permanently (turns green, one-way action)
  const handleMarkPriorityCompleted = (id) => {
    setCompletedPriorities((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Mark retest as conducted permanently (turns green, one-way action)
  const handleMarkRetestConducted = (classId, e) => {
    e.stopPropagation();
    setClassState((prev) => {
      const current = prev[classId] || { teachingsCompleted: 3, teachingsPending: 2, retestConducted: false };
      if (current.retestConducted) return prev; // Do not toggle back
      return {
        ...prev,
        [classId]: {
          ...current,
          retestConducted: true,
        },
      };
    });
  };

  // Dynamic calculations connected to interactive actions
  const totalCompletedPriorities = completedPriorities.size;

  const baseTeachingsCompleted = Object.values(classState).reduce((acc, c) => acc + c.teachingsCompleted, 0);
  const totalTeachingsCompleted = baseTeachingsCompleted + totalCompletedPriorities;

  const baseTeachingsPending = Object.values(classState).reduce((acc, c) => acc + c.teachingsPending, 0);
  const totalTeachingsPending = Math.max(0, baseTeachingsPending - totalCompletedPriorities);

  const totalPendingTests = Object.values(classState).filter((c) => !c.retestConducted).length;

  // Filter classes according to selected controls
  const filteredClasses = DASHBOARD_DEMO_DATA.classes.filter((cls) => {
    if (gradeFilter !== 'all' && cls.grade !== gradeFilter) return false;
    if (sectionFilter !== 'all' && cls.section !== sectionFilter) return false;
    if (subjectFilter !== 'all' && cls.subject !== subjectFilter) return false;
    return true;
  });

  // Currently active selected class for Teaching Priorities
  const selectedClass =
    filteredClasses.find((c) => c.id === selectedClassId) ||
    filteredClasses[0] ||
    DASHBOARD_DEMO_DATA.classes[0];

  // Specific priorities for the selected class & section
  const currentClassPriorities =
    CLASS_TEACHING_PRIORITIES[selectedClass.id] ||
    CLASS_TEACHING_PRIORITIES['cls-8a'];

  const classCompletedCount = currentClassPriorities.filter((p) =>
    completedPriorities.has(p.id)
  ).length;

  const resetFilters = () => {
    setGradeFilter('all');
    setSectionFilter('all');
    setSubjectFilter('all');
  };

  // Smoothly scroll and highlight the Teaching Priorities section
  const handleGoToTeachingPriorities = () => {
    const el = document.getElementById('teaching-priorities-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('section-highlight-pulse');
      setTimeout(() => {
        el.classList.remove('section-highlight-pulse');
      }, 2000);
    } else if (onOpenClassPriorities) {
      onOpenClassPriorities(selectedClass);
    }
  };

  const handleSelectClass = (cls) => {
    setSelectedClassId(cls.id);
  };

  return (
    <div className="dashboard-layout" role="region" aria-label="Teacher Dashboard">
      {/* Static / Fixed Header (Remains pinned at top while scrolling) */}
      <header className="dashboard-header" role="banner">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-left">
            <a href="#dashboard-main" className="brand-section" aria-label="Neev Home">
              <div className="brand-logo-icon" aria-hidden="true">
                N
              </div>
              <div className="brand-text-group">
                <span className="brand-name">Neev</span>
                <span className="brand-subtitle hide-on-mobile">Learning gap analysis for teachers</span>
              </div>
            </a>
            <span className="dashboard-header-title">Teacher Dashboard</span>
          </div>

          <div className="dashboard-header-right">
            <div className="teacher-profile-pill">
              <div className="teacher-avatar-circle" aria-hidden="true">
                {teacherName.charAt(0).toUpperCase()}
              </div>
              <span className="hide-on-mobile">{teacherName}</span>
              {isDemoMode && (
                <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  Demo
                </span>
              )}
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onLogout}
              title="Sign out of teacher account"
              aria-label="Sign out"
            >
              <IconLogOut size={16} />
              <span className="hide-on-mobile">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Full-Width Clean Shell */}
      <div className="dashboard-shell">
        <main id="dashboard-main" className="dashboard-main">
          {/* Welcome Banner */}
          <section className="dashboard-welcome-banner" aria-label="Welcome Section">
            <div className="welcome-title-group">
              <h2>Welcome back, {teacherName}</h2>
              <p className="welcome-subtitle">
                Diagnose student misconceptions across your individual classes, trace prerequisite gaps to foundational
                years, and sequence class-wide revision before teaching new topics.
              </p>
            </div>

            <div className="welcome-actions-group">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onStartNewAssessment}
              >
                <IconPlus size={16} />
                <span>New Assessment</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGoToTeachingPriorities}
                title="Jump directly to the Teaching Priorities section"
              >
                <IconSparkles size={16} />
                <span>View Class Priorities</span>
              </button>
            </div>
          </section>

          {/* 4 Summary Metrics Cards: Total Classes (Neutral), Teachings Completed, Teachings Pending, Pending Tests */}
          <section aria-label="Summary Metrics">
            <div className="dashboard-metrics-grid">
              {/* Card 1: Total Classes (Neutral styling without orange accent highlight) */}
              <div className="dash-metric-card">
                <div className="dash-metric-top">
                  <span className="dash-metric-label">Total Classes</span>
                  <IconUsers size={18} color="var(--secondary-text)" />
                </div>
                <div className="dash-metric-number">
                  {DASHBOARD_DEMO_DATA.summaryMetrics.totalClasses}
                </div>
                <div className="dash-metric-subtext">Across Grades 7, 8 &amp; 9 &bull; <span className="badge badge-neutral" style={{ fontSize: '10px' }}>Active</span></div>
              </div>

              {/* Card 2: Teachings Completed (Dynamic) */}
              <div className="dash-metric-card">
                <div className="dash-metric-top">
                  <span className="dash-metric-label">Teachings Completed</span>
                  <IconCheckCircle size={18} color="var(--success)" />
                </div>
                <div className="dash-metric-number" style={{ color: 'var(--success)' }}>
                  {totalTeachingsCompleted}
                </div>
                <div className="dash-metric-subtext">Foundational topics revised &bull; {totalCompletedPriorities} this session</div>
              </div>

              {/* Card 3: Teachings Pending (Dynamic) */}
              <div className="dash-metric-card">
                <div className="dash-metric-top">
                  <span className="dash-metric-label">Teachings Pending</span>
                  <IconBookOpen size={18} color="var(--warning-dark)" />
                </div>
                <div className="dash-metric-number" style={{ color: 'var(--warning-dark)' }}>
                  {totalTeachingsPending}
                </div>
                <div className="dash-metric-subtext">Class revision topics requiring teacher session</div>
              </div>

              {/* Card 4: Pending Tests (Dynamic) */}
              <div className="dash-metric-card">
                <div className="dash-metric-top">
                  <span className="dash-metric-label">Pending Tests</span>
                  <IconRefreshCw size={18} color="var(--primary-orange)" />
                </div>
                <div className="dash-metric-number" style={{ color: 'var(--primary-orange)' }}>
                  {totalPendingTests}
                </div>
                <div className="dash-metric-subtext">Diagnostic retests scheduled across classes</div>
              </div>
            </div>
          </section>

          {/* Section: My Classes (Hover-only highlight, Teachings Completed & Pending, Retest toggle) */}
          <section id="my-classes-section" className="card" aria-labelledby="my-classes-heading">
            <div className="classes-section-header">
              <div>
                <h3 id="my-classes-heading" className="card-title">My Classes</h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                  Hover over any class to inspect details, track teachings, and record conducted retests.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="classes-filter-bar">
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                  aria-label="Filter by Grade"
                >
                  <option value="all">All Grades</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                </select>

                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                  aria-label="Filter by Section"
                >
                  <option value="all">All Sections</option>
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                  <option value="Section C">Section C</option>
                </select>

                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                  aria-label="Filter by Subject"
                >
                  <option value="all">All Subjects</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                </select>

                {(gradeFilter !== 'all' || sectionFilter !== 'all' || subjectFilter !== 'all') && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={resetFilters}
                    title="Reset all filters"
                  >
                    <IconRefreshCw size={14} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {filteredClasses.length === 0 ? (
              <EmptyState
                icon={<IconUsers size={28} color="var(--secondary-text)" />}
                title="No classes match current filters"
                description="Adjust your grade, section, or subject filter to view individual class records."
              />
            ) : (
              <div className="classes-cards-grid">
                {filteredClasses.map((cls) => {
                  const currentClass = classState[cls.id] || { teachingsCompleted: 3, teachingsPending: 2, retestConducted: false };
                  const isRetestDone = currentClass.retestConducted;
                  const isCurrentSelected = selectedClass.id === cls.id;

                  // Specific completed count for this class
                  const clsPriorities = CLASS_TEACHING_PRIORITIES[cls.id] || [];
                  const clsCompleted = clsPriorities.filter((p) => completedPriorities.has(p.id)).length;
                  const displayCompleted = currentClass.teachingsCompleted + clsCompleted;
                  const displayPending = Math.max(0, currentClass.teachingsPending - clsCompleted);

                  return (
                    <div
                      key={cls.id}
                      className="class-card"
                      onClick={() => handleSelectClass(cls)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectClass(cls);
                        }
                      }}
                      title={`Click to view priorities for ${cls.name}`}
                      style={{
                        cursor: 'pointer',
                        borderColor: isCurrentSelected ? 'var(--primary-orange)' : undefined,
                      }}
                    >
                      <div className="class-card-top">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                            <h4 className="class-card-name" style={{ marginRight: '2px' }}>{cls.name}</h4>
                            <span className="badge badge-neutral" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                              {cls.subject}
                            </span>
                            {isCurrentSelected && (
                              <span className="badge badge-orange" style={{ fontSize: '10px', padding: '1px 6px', whiteSpace: 'nowrap' }}>
                                Active
                              </span>
                            )}
                          </div>
                          <p className="class-card-meta">
                            {cls.grade} &bull; {cls.section} &bull; Academic Year {cls.academicYear}
                          </p>
                        </div>

                        <div style={{ flexShrink: 0 }}>
                          {isRetestDone ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                              <IconCheckCircle size={12} />
                              <span>Test Completed</span>
                            </span>
                          ) : (
                            <span className="badge badge-neutral" style={{ whiteSpace: 'nowrap' }}>
                              {cls.topicsNeedingRevision} Gaps Flagged
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid: Replaced Coverage and Assessments with Teachings Completed and Teachings Pending */}
                      <div className="class-card-stats">
                        <div className="class-stat-item">
                          <span className="class-stat-label">Teachings Completed</span>
                          <span className="class-stat-val" style={{ color: 'var(--success-dark)' }}>
                            {displayCompleted} Topics
                          </span>
                        </div>
                        <div className="class-stat-item">
                          <span className="class-stat-label">Teachings Pending</span>
                          <span className="class-stat-val" style={{ color: displayPending > 0 ? 'var(--warning-dark)' : 'var(--main-text)' }}>
                            {displayPending} Topics
                          </span>
                        </div>
                      </div>

                      {/* Gaps Preview */}
                      <div className="class-card-gaps">
                        <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
                          Identified Gaps:
                        </span>{' '}
                        <span>{cls.topGaps.join(', ')}</span>
                      </div>

                      {/* Below Identified Gaps: Mark Retest as Conducted Button (Tick symbol, one-way green Test Completed) */}
                      <div className="class-card-retest-action" style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--divider-color)', marginTop: '2px' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${isRetestDone ? 'btn-retest-completed' : 'btn-retest-pending'}`}
                          onClick={(e) => handleMarkRetestConducted(cls.id, e)}
                          disabled={isRetestDone}
                          title={isRetestDone ? 'Test Completed' : 'Record diagnostic retest as conducted'}
                          style={{ width: '100%', justifyContent: 'center', cursor: isRetestDone ? 'default' : 'pointer' }}
                        >
                          {isRetestDone ? (
                            <>
                              <IconCheckCircle size={14} color="var(--success)" />
                              <span>Test Completed</span>
                            </>
                          ) : (
                            <>
                              <IconCheck size={14} />
                              <span>Mark Retest as Conducted</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Two-Column Grid: Teaching Priorities + Recent Activity */}
          <div className="dashboard-columns-grid">
            {/* Column 1: Teaching Priorities (Specific to selected class & section, one-way completion) */}
            <section
              id="teaching-priorities-section"
              className="card teaching-priorities-card"
              aria-labelledby="dash-priorities-heading"
            >
              <div className="card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h3 id="dash-priorities-heading" className="card-title">
                      Teaching Priorities
                    </h3>
                    <span className="badge badge-orange">
                      {selectedClass.name} &bull; {selectedClass.grade} ({selectedClass.section})
                    </span>
                    <span className="badge badge-neutral">
                      {selectedClass.subject}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                    Top foundational concepts requiring teacher intervention for {selectedClass.name} before advancing syllabus.
                  </p>
                </div>

                <div className="priorities-summary-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    {classCompletedCount}/{currentClassPriorities.length} Completed
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {currentClassPriorities.map((item) => {
                  const isItemCompleted = completedPriorities.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`priority-item-card ${isItemCompleted ? 'priority-completed' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-3)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isItemCompleted ? 'rgba(30, 142, 90, 0.07)' : 'var(--surface-bg)',
                        border: isItemCompleted ? '1px solid var(--success-border)' : '1px solid var(--border-color)',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: isItemCompleted ? 'var(--success)' : 'var(--primary-orange)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          flexShrink: 0,
                          transition: 'background-color var(--transition-fast)',
                        }}
                      >
                        {isItemCompleted ? <IconCheck size={15} /> : item.rank}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                          <h4
                            style={{
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 'bold',
                              color: isItemCompleted ? 'var(--success-dark)' : 'var(--main-text)',
                              textDecoration: isItemCompleted ? 'line-through' : 'none',
                            }}
                          >
                            {item.topicName}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                              {item.grade}
                            </span>
                            {isItemCompleted && (
                              <span className="badge badge-success" style={{ fontSize: '10px' }}>
                                Taught
                              </span>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '4px', lineHeight: 1.4 }}>
                          {item.reason}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                              Est. Revision: {item.estimatedMinutes} mins
                            </span>
                          </div>

                          {/* Mark as Completed Button (Tick symbol, one-way green permanent completed) */}
                          <button
                            type="button"
                            className={`btn btn-sm ${isItemCompleted ? 'btn-priority-done' : 'btn-priority-mark'}`}
                            onClick={() => handleMarkPriorityCompleted(item.id)}
                            disabled={isItemCompleted}
                            title={isItemCompleted ? 'Topic revision completed' : 'Mark topic revision as completed'}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              cursor: isItemCompleted ? 'default' : 'pointer',
                            }}
                          >
                            {isItemCompleted ? (
                              <>
                                <IconCheckCircle size={13} color="var(--success)" />
                                <span>Completed</span>
                              </>
                            ) : (
                              <>
                                <IconCheck size={13} />
                                <span>Mark as Completed</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Column 2: Recent Activity Feed */}
            <section className="card" aria-labelledby="activity-heading">
              <div className="card-header">
                <div>
                  <h3 id="activity-heading" className="card-title">Recent Activity</h3>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                    Sample timeline of answer sheet evaluations &amp; reports.
                  </p>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                  Demo activity
                </span>
              </div>

              <div className="activity-feed-list">
                {DASHBOARD_DEMO_DATA.recentActivity.map((act) => (
                  <div key={act.id} className="activity-feed-item">
                    <div className="activity-icon-badge" aria-hidden="true">
                      {act.type === 'review' && <IconFileText size={16} />}
                      {act.type === 'assessment' && <IconCheckCircle size={16} />}
                      {act.type === 'gap' && <IconTarget size={16} />}
                      {act.type === 'priority' && <IconSparkles size={16} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)' }}>
                          {act.title}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted-text)', whiteSpace: 'nowrap' }}>
                          {act.timestamp}
                        </span>
                      </div>
                      <p style={{ color: 'var(--secondary-text)', marginTop: '2px', lineHeight: 1.35 }}>
                        {act.description}
                      </p>
                      <span className="badge badge-neutral" style={{ fontSize: '10px', marginTop: '4px' }}>
                        {act.relatedClass}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
