import React, { useState, useEffect, useCallback } from 'react';
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
  IconTrash,
} from '../components/Icons';
import { fetchClasses, createClass, deleteClass } from '../services/classService';
import { fetchAssessments } from '../services/assessmentService';
import { getSectionDisplay, getTeachingPrioritiesForClass } from '../utils/teachingPriorities';

export default function TeacherDashboard({
  currentUser,
  onLogout,
  onStartNewAssessment,
  onOpenClassPriorities,
  isDemoMode = false,
}) {
  // Live backend data state for authenticated teacher
  const [realClasses, setRealClasses] = useState([]);
  const [realAssessments, setRealAssessments] = useState([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(!isDemoMode);
  const [backendError, setBackendError] = useState(null);

  // Filter controls
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState(null);

  // Modal & class creation state
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('Grade 8');
  const [newClassSection, setNewClassSection] = useState('Section A');
  const [newClassSubject, setNewClassSubject] = useState('Mathematics');
  const [newClassBoard, setNewClassBoard] = useState('CBSE');
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Retest status tracking (in-memory session state)
  const [retestState, setRetestState] = useState({});

  // Completed priority topics tracking (one-way completion Set)
  const [completedPriorities, setCompletedPriorities] = useState(new Set());

  const teacherName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Teacher';

  // Load real data from Express backend + MongoDB
  const loadLiveDashboardData = useCallback(async () => {
    if (isDemoMode) {
      setIsLoadingBackend(false);
      return;
    }

    setIsLoadingBackend(true);
    setBackendError(null);

    try {
      const [classesData, assessmentsData] = await Promise.all([
        fetchClasses(),
        fetchAssessments(),
      ]);

      setRealClasses(classesData || []);
      setRealAssessments(assessmentsData || []);

      if (classesData && classesData.length > 0) {
        setSelectedClassId((prev) => {
          const exists = classesData.some((c) => c._id === prev);
          return exists ? prev : classesData[0]._id;
        });
      } else {
        setSelectedClassId(null);
      }
    } catch (err) {
      console.error('[Dashboard Data Load Error]:', err);
      setBackendError(err.message || 'Failed to load teacher records from backend.');
    } finally {
      setIsLoadingBackend(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    loadLiveDashboardData();
  }, [loadLiveDashboardData, currentUser]);

  // Handle creating a new real class in MongoDB
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setModalError('Please enter a class name (e.g. Class 8-A).');
      return;
    }

    setIsSubmittingClass(true);
    setModalError(null);

    try {
      const created = await createClass({
        name: newClassName.trim(),
        grade: newClassGrade,
        section: newClassSection,
        subject: newClassSubject.trim() || 'Mathematics',
        board: newClassBoard.trim() || 'CBSE',
      });

      setRealClasses((prev) => [created, ...prev]);
      setSelectedClassId(created._id);
      setIsAddClassModalOpen(false);
      setNewClassName('');
      setNewClassSection('Section A');
      setActionNotice({ type: 'success', message: `Class '${created.name}' created successfully in MongoDB.` });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setModalError(err.message || 'Failed to create class.');
    } finally {
      setIsSubmittingClass(false);
    }
  };

  // Handle deleting a real class in MongoDB (protected with 409 dependent assessment policy)
  const handleDeleteClass = async (classId, className, e) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete '${className}'?`);
    if (!confirmed) return;

    try {
      await deleteClass(classId);
      setRealClasses((prev) => prev.filter((c) => c._id !== classId));
      if (selectedClassId === classId) {
        setSelectedClassId(null);
      }
      setActionNotice({ type: 'success', message: `Class '${className}' deleted successfully.` });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.message || `Cannot delete '${className}'.`,
      });
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  // Mark priority topic as completed permanently
  const handleMarkPriorityCompleted = (id) => {
    setCompletedPriorities((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Mark retest as conducted permanently
  const handleMarkRetestConducted = (classId, e) => {
    e.stopPropagation();
    setRetestState((prev) => {
      if (prev[classId]) return prev;
      return { ...prev, [classId]: true };
    });
  };

  // Source of classes: strictly real classes if authenticated, or demo fixtures if in demo mode
  const rawClasses = isDemoMode ? DASHBOARD_DEMO_DATA.classes : realClasses;

  // Filter classes according to selected controls
  const filteredClasses = rawClasses.filter((cls) => {
    if (gradeFilter !== 'all' && cls.grade !== gradeFilter) return false;
    if (sectionFilter !== 'all' && getSectionDisplay(cls) !== sectionFilter) return false;
    if (subjectFilter !== 'all' && cls.subject !== subjectFilter) return false;
    return true;
  });

  // Currently active selected class for Teaching Priorities
  const selectedClass =
    filteredClasses.find((c) => (c._id || c.id) === selectedClassId) ||
    filteredClasses[0] ||
    null;

  const selectedSection = selectedClass ? getSectionDisplay(selectedClass) : 'Section A';

  // Derived Summary Metrics
  const totalCompletedPriorities = completedPriorities.size;

  const totalClassesCount = isDemoMode ? DASHBOARD_DEMO_DATA.classes.length : realClasses.length;
  const totalCompletedTeachings = isDemoMode
    ? 14 + totalCompletedPriorities
    : realAssessments.filter((a) => a.status === 'completed').length + totalCompletedPriorities;
  const totalPendingTeachings = isDemoMode
    ? Math.max(0, 8 - totalCompletedPriorities)
    : realAssessments.filter((a) => a.status === 'draft' || a.status === 'processing').length;
  const totalPendingTests = isDemoMode
    ? Object.keys(DASHBOARD_DEMO_DATA.classes).length - Object.keys(retestState).length
    : realAssessments.filter((a) => a.status !== 'completed').length;

  // Teaching priorities items: tailored specifically to selectedClass (grade + section)
  const currentClassPriorities = selectedClass
    ? getTeachingPrioritiesForClass(selectedClass, realAssessments)
    : [];

  const classCompletedCount = currentClassPriorities.filter((p) =>
    completedPriorities.has(p.id)
  ).length;

  // Recent activities: strictly limited to the top 10 most recent entries
  const top10RealActivities = [...realAssessments]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 10);

  const top10DemoActivities = (DASHBOARD_DEMO_DATA.recentActivity || []).slice(0, 10);

  const resetFilters = () => {
    setGradeFilter('all');
    setSectionFilter('all');
    setSubjectFilter('all');
  };

  const handleGoToTeachingPriorities = () => {
    const el = document.getElementById('teaching-priorities-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('section-highlight-pulse');
      setTimeout(() => {
        el.classList.remove('section-highlight-pulse');
      }, 2000);
    } else if (onOpenClassPriorities && selectedClass) {
      onOpenClassPriorities(selectedClass);
    }
  };

  const handleSelectClass = (cls) => {
    setSelectedClassId(cls._id || cls.id);
  };

  return (
    <div className="dashboard-layout" role="region" aria-label="Teacher Dashboard">
      {/* Static / Fixed Header */}
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
              {isDemoMode ? (
                <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  Demo
                </span>
              ) : (
                <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  Live Atlas
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
                {isDemoMode
                  ? 'Exploring Neev in interactive demo mode. You can test workflow steps, diagnose gaps, and simulate teacher actions.'
                  : 'Connected to MongoDB Atlas. Manage your classroom sections, assess student work, and sequence foundational learning gap remediation.'}
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

          {/* Action Notice / Feedback Banner */}
          {actionNotice && (
            <div
              className={`badge ${actionNotice.type === 'error' ? 'badge-danger' : 'badge-success'}`}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {actionNotice.type === 'error' ? <IconAlertTriangle size={16} /> : <IconCheckCircle size={16} />}
              <span>{actionNotice.message}</span>
            </div>
          )}

          {/* Backend Error Banner with Retry */}
          {backendError && (
            <div
              className="badge badge-danger"
              style={{
                padding: '12px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                width: '100%',
                maxWidth: '100%',
                borderRadius: 'var(--radius-md)',
                wordBreak: 'break-word',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 200px' }}>
                <IconAlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span style={{ wordBreak: 'break-word' }}>{backendError}</span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadLiveDashboardData}
                style={{ backgroundColor: '#FFFFFF', color: 'var(--danger-dark)', padding: '5px 12px', flexShrink: 0 }}
              >
                <IconRefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Summary Metrics Section (4 Blocks) */}
          <section className="dashboard-summary-metrics" aria-label="Key Teaching Metrics">
            <div className="dashboard-metrics-grid">
              {/* Card 1: Total Classes */}
              <div className="dash-metric-card">
                <div className="dash-metric-top">
                  <span className="dash-metric-label">Total Classes</span>
                  <IconUsers size={18} color="var(--secondary-text)" />
                </div>
                <div className="dash-metric-number" style={{ color: 'var(--main-text)' }}>
                  {totalClassesCount}
                </div>
                <div className="dash-metric-subtext">
                  {isDemoMode ? 'Sample demonstration cohorts' : 'Active classes in your account'}
                </div>
              </div>

              {/* Card 2: Assessments / Teachings */}
              <div className="dash-metric-card">
                <div className="dash-metric-top">
                  <span className="dash-metric-label">
                    {isDemoMode ? 'Teachings Completed' : 'Assessments Recorded'}
                  </span>
                  <IconCheckCircle size={18} color="var(--success)" />
                </div>
                <div className="dash-metric-number" style={{ color: 'var(--success)' }}>
                  {isDemoMode ? totalCompletedTeachings : realAssessments.length}
                </div>
                <div className="dash-metric-subtext">
                  {isDemoMode ? `Foundational topics revised • ${totalCompletedPriorities} this session` : 'Persisted in MongoDB database'}
                </div>
              </div>

              {/* Card 3: Teaching Priorities */}
              <div className="dash-metric-card">
                <div className="dash-metric-top">
                  <span className="dash-metric-label">
                    {isDemoMode ? 'Teachings Pending' : 'Teaching Priorities'}
                  </span>
                  <IconBookOpen size={18} color="var(--warning-dark)" />
                </div>
                <div className="dash-metric-number" style={{ color: 'var(--warning-dark)' }}>
                  {isDemoMode ? totalPendingTeachings : '—'}
                </div>
                <div className="dash-metric-subtext">
                  {isDemoMode ? 'Class revision topics requiring teacher session' : 'Requires student answer sheet evaluation (Phase 3)'}
                </div>
              </div>

              {/* Card 4: Diagnostic Retests */}
              <div className="dash-metric-card">
                <div className="dash-metric-top">
                  <span className="dash-metric-label">
                    {isDemoMode ? 'Pending Tests' : 'Diagnostic Retests'}
                  </span>
                  <IconRefreshCw size={18} color="var(--primary-orange)" />
                </div>
                <div className="dash-metric-number" style={{ color: 'var(--primary-orange)' }}>
                  {isDemoMode ? totalPendingTests : '—'}
                </div>
                <div className="dash-metric-subtext">
                  {isDemoMode ? 'Diagnostic tests scheduled across classes' : 'Scheduled after gap diagnosis (Phase 3)'}
                </div>
              </div>
            </div>
          </section>

          {/* Section: My Classes */}
          <section id="my-classes-section" className="card" aria-labelledby="my-classes-heading">
            <div className="classes-section-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 id="my-classes-heading" className="card-title">My Classes</h3>
                  {!isDemoMode && (
                    <span className="badge badge-success" style={{ fontSize: '11px' }}>
                      MongoDB Live Data
                    </span>
                  )}
                  {isDemoMode && (
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                      Demo Mode (Sample Fixtures)
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                  {isDemoMode
                    ? 'Sample class records for exploratory review.'
                    : 'Manage your active classroom sections, inspect gap evaluations, and record conducted retests.'}
                </p>
              </div>

              {/* Filters Bar & Add Class Action */}
              <div className="classes-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                  aria-label="Filter by Grade"
                >
                  <option value="all">All Grades</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
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
                  <option value="Section D">Section D</option>
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
                  <option value="English">English</option>
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

                {!isDemoMode && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsAddClassModalOpen(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
                  >
                    <IconPlus size={14} />
                    <span>Add Class</span>
                  </button>
                )}
              </div>
            </div>

            {/* Classes Grid / Loading / Empty State */}
            {isLoadingBackend ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div className="animate-spin" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-orange)', borderRadius: '50%' }} />
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--secondary-text)', marginTop: 'var(--space-3)' }}>
                  Loading your classes from MongoDB Atlas...
                </p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <EmptyState
                icon={<IconUsers size={32} color="var(--primary-orange)" />}
                title={rawClasses.length === 0 ? 'No classes created yet' : 'No classes match current filters'}
                description={
                  rawClasses.length === 0
                    ? "No classes are registered for this teacher account."
                    : 'Adjust your grade or subject filter to view individual class records.'
                }
              />
            ) : (
              <div className="classes-cards-grid">
                {filteredClasses.map((cls) => {
                  const classKey = cls._id || cls.id;
                  const isRetestDone = Boolean(retestState[classKey]);
                  const isCurrentSelected = selectedClass && (selectedClass._id || selectedClass.id) === classKey;

                  // Find assessments associated with this class
                  const classAssessments = realAssessments.filter(
                    (a) => (a.classId?._id || a.classId) === classKey
                  );

                  return (
                    <div
                      key={classKey}
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
                            <span className="badge badge-primary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                              {getSectionDisplay(cls)}
                            </span>
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
                            {cls.grade} &bull; {getSectionDisplay(cls)} {cls.board ? `• ${cls.board}` : ''} {cls.academicYear ? `• ${cls.academicYear}` : ''}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {isRetestDone ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                              <IconCheckCircle size={12} />
                              <span>Test Completed</span>
                            </span>
                          ) : cls.topicsNeedingRevision ? (
                            <span className="badge badge-neutral" style={{ whiteSpace: 'nowrap' }}>
                              {cls.topicsNeedingRevision} Gaps Flagged
                            </span>
                          ) : (
                            <span className="badge badge-neutral" style={{ whiteSpace: 'nowrap' }}>
                              {classAssessments.length} Assessment(s)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="class-card-stats">
                        <div className="class-stat-item">
                          <span className="class-stat-label">Assessments</span>
                          <span className="class-stat-val" style={{ color: 'var(--success-dark)' }}>
                            {isDemoMode ? `${cls.assessmentsCount || 3} Completed` : `${classAssessments.length} Recorded`}
                          </span>
                        </div>
                        <div className="class-stat-item">
                          <span className="class-stat-label">Status</span>
                          <span className="class-stat-val" style={{ color: 'var(--main-text)' }}>
                            {isDemoMode ? `${cls.studentsAssessed || 28} Students` : 'Active Cohort'}
                          </span>
                        </div>
                      </div>

                      {/* Gaps Preview (if present in demo mode) */}
                      {isDemoMode && cls.topGaps && cls.topGaps.length > 0 && (
                        <div className="class-card-gaps">
                          <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
                            Identified Gaps:
                          </span>{' '}
                          <span>{cls.topGaps.join(', ')}</span>
                        </div>
                      )}

                      {!isDemoMode && (
                        <div className="class-card-gaps" style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                          <span>Phase 3 Diagnostics: Awaiting answer sheet processing</span>
                        </div>
                      )}

                      {/* Below Identified Gaps: Retest Action */}
                      <div className="class-card-retest-action" style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--divider-color)', marginTop: '2px' }}>
                        {isDemoMode ? (
                          <button
                            type="button"
                            className={`btn btn-sm ${isRetestDone ? 'btn-retest-completed' : 'btn-retest-pending'}`}
                            onClick={(e) => handleMarkRetestConducted(classKey, e)}
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
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled
                            title="Diagnostic retests will be generated automatically once student answer sheets are processed in Phase 3."
                            style={{ width: '100%', justifyContent: 'center', opacity: 0.65, cursor: 'not-allowed', fontSize: '11px' }}
                          >
                            <span>Retest Scheduled in Phase 3</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Two-Column Grid: Teaching Priorities + Recent Activity */}
          <div className="dashboard-columns-grid">
            {/* Column 1: Teaching Priorities */}
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
                    {selectedClass && (
                      <>
                        <span className="badge badge-orange" style={{ fontWeight: '600' }}>
                          {selectedClass.name} &bull; {selectedSection}
                        </span>
                        <span className="badge badge-neutral">
                          {selectedClass.grade}
                        </span>
                        <span className="badge badge-neutral">
                          {selectedClass.subject}
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                    {selectedClass
                      ? `Foundational learning gaps prioritized for ${selectedClass.name} (${selectedSection}) based on diagnostic evidence.`
                      : 'Select a class above to inspect foundational revision priorities.'}
                  </p>
                </div>

                {currentClassPriorities.length > 0 && (
                  <div className="priorities-summary-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                      {classCompletedCount}/{currentClassPriorities.length} Completed
                    </span>
                  </div>
                )}
              </div>

              {currentClassPriorities.length === 0 ? (
                <EmptyState
                  icon={<IconTarget size={30} color="var(--secondary-text)" />}
                  title={selectedClass ? `No learning gap diagnostics for ${selectedClass.name} yet` : 'No class selected'}
                  description={
                    selectedClass
                      ? `To diagnose student learning gaps for ${selectedClass.name}, begin a new assessment using student answer sheets.`
                      : 'Add or select a class in the My Classes section above.'
                  }
                  action={
                    selectedClass ? (
                      <button type="button" className="btn btn-primary btn-sm" onClick={onStartNewAssessment}>
                        <IconPlus size={14} /> <span>Start Assessment for {selectedClass.name}</span>
                      </button>
                    ) : null
                  }
                />
              ) : (
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
                                overflowWrap: 'anywhere',
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

                          {item.chapterName && (
                            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary-orange)' }}>
                                Prerequisite Chapter:
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--main-text)' }}>
                                {item.chapterName} {item.pdfFileName ? `(${item.pdfFileName})` : ''}
                              </span>
                            </div>
                          )}

                          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '4px', lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                            {item.reason}
                          </p>

                          {item.suggestedActivity && (
                            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--main-text)', background: 'rgba(235, 94, 40, 0.05)', borderLeft: '3px solid var(--primary-orange)', padding: '6px 10px', borderRadius: '4px', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                              <strong>Suggested Activity:</strong> {item.suggestedActivity}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                                Est. Revision: {item.estimatedMinutes || 30} mins
                              </span>
                            </div>

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
              )}
            </section>

            {/* Column 2: Recent Activity Feed (Strictly Top 10) */}
            <section className="card" aria-labelledby="activity-heading" style={{ minWidth: 0 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 id="activity-heading" className="card-title">Recent Activity</h3>
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                      Top 10 Recent
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '2px' }}>
                    {isDemoMode
                      ? 'Displaying the 10 most recent evaluations and reports.'
                      : 'Displaying the 10 most recent classroom evaluations from MongoDB.'}
                  </p>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                  {isDemoMode ? 'Demo feed' : 'Live feed'}
                </span>
              </div>

              <div className="activity-feed-list" style={{ minWidth: 0 }}>
                {isDemoMode ? (
                  top10DemoActivities.map((act) => (
                    <div key={act.id} className="activity-feed-item" style={{ minWidth: 0 }}>
                      <div className="activity-icon-badge" aria-hidden="true">
                        {act.type === 'review' && <IconFileText size={16} />}
                        {act.type === 'assessment' && <IconCheckCircle size={16} />}
                        {act.type === 'gap' && <IconTarget size={16} />}
                        {act.type === 'priority' && <IconSparkles size={16} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)', fontSize: '13px' }}>
                            {act.title}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted-text)', whiteSpace: 'nowrap' }}>
                            {act.timestamp}
                          </span>
                        </div>
                        <p style={{ color: 'var(--secondary-text)', marginTop: '2px', lineHeight: 1.35, fontSize: '12px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {act.description}
                        </p>
                        <span className="badge badge-neutral" style={{ fontSize: '10px', marginTop: '4px' }}>
                          {act.relatedClass}
                        </span>
                      </div>
                    </div>
                  ))
                ) : top10RealActivities.length === 0 ? (
                  <EmptyState
                    icon={<IconFileText size={24} color="var(--secondary-text)" />}
                    title="No recent evaluations"
                    description="When you create assessments and analyze student answer sheets, your activity history will appear here."
                  />
                ) : (
                  top10RealActivities.map((a) => (
                    <div key={a._id} className="activity-feed-item" style={{ minWidth: 0 }}>
                      <div className="activity-icon-badge" aria-hidden="true">
                        <IconCheckCircle size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)', fontSize: '13px' }}>
                            {a.title}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted-text)', whiteSpace: 'nowrap' }}>
                            {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                        <p style={{ color: 'var(--secondary-text)', marginTop: '2px', lineHeight: 1.35, fontSize: '12px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          Subject: {a.subject} &bull; Max Marks: {a.maximumMarks} &bull; Status: <span style={{ textTransform: 'capitalize' }}>{a.status}</span>
                        </p>
                        {a.classId?.name && (
                          <span className="badge badge-neutral" style={{ fontSize: '10px', marginTop: '4px' }}>
                            {a.classId.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!isDemoMode && realAssessments.length > 10 && (
                <div style={{ marginTop: 'var(--space-3)', textAlign: 'center', padding: '8px', borderTop: '1px solid var(--divider-color)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                    Showing 10 most recent activities ({realAssessments.length} total assessments recorded).
                  </span>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Add Class Modal (Glassmorphic) */}
      {isAddClassModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-class-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(35, 27, 22, 0.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 id="modal-add-class-title" style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>
                Add New Class
              </h3>
              <button
                type="button"
                className="btn-icon-only"
                onClick={() => {
                  setIsAddClassModalOpen(false);
                  setModalError(null);
                }}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div
                className="badge badge-danger"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <IconAlertTriangle size={14} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  Class Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Class 8-A, Grade 9-B"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Grade Level *
                  </label>
                  <select
                    className="form-select"
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value)}
                  >
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Section *
                  </label>
                  <select
                    className="form-select"
                    value={newClassSection}
                    onChange={(e) => setNewClassSection(e.target.value)}
                  >
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                    <option value="Section C">Section C</option>
                    <option value="Section D">Section D</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    Educational Board (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClassBoard}
                    onChange={(e) => setNewClassBoard(e.target.value)}
                    placeholder="e.g. CBSE, ICSE, State"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsAddClassModalOpen(false);
                    setModalError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingClass}
                >
                  {isSubmittingClass ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
