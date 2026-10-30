import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import LessonCard from '../components/LessonCard';
import EmptyState from '../components/EmptyState';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  IconPlus,
  IconCheck,
  IconAlertTriangle,
  IconBookOpen,
} from '../components/Icons';

export default function ClassSyllabus({
  syllabusData,
  onUpdateSyllabus,
  classes = [],
  isDemoMode = false,
  onSaveAssessment,
}) {
  const {
    selectedClass = 'Class 8',
    classId = '',
    selectedSubject = 'Mathematics',
    examName = '',
    academicTerm = '',
    totalMarks = 50,
    examDate = new Date().toISOString().split('T')[0],
    lessons = [],
    rubric = [],
    assessmentId = null,
  } = syllabusData;

  // Local form state for Add/Edit lesson
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonNameInput, setLessonNameInput] = useState('');
  const [lessonGradeInput, setLessonGradeInput] = useState('Class 8');

  // Validation & alerts
  const [formError, setFormError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);

  // Deletion modal state
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dependentLessonsWarning, setDependentLessonsWarning] = useState(null);

  // Handle general field change
  const handleConfigChange = (field, value) => {
    onUpdateSyllabus({
      ...syllabusData,
      [field]: value,
    });
  };

  const handleManualSave = async () => {
    if (!onSaveAssessment) return;
    setIsSavingAssessment(true);
    setSaveError(null);
    try {
      const saved = await onSaveAssessment(syllabusData);
      setSuccessBanner(`Assessment '${saved.title}' saved successfully in MongoDB Atlas.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save assessment.');
    } finally {
      setIsSavingAssessment(false);
    }
  };

  // Reset lesson form
  const resetLessonForm = () => {
    setEditingLessonId(null);
    setLessonNameInput('');
    setLessonGradeInput(selectedClass || 'Grade 8');
    setFormError(null);
  };

  // Start editing a lesson
  const handleStartEdit = (lesson) => {
    setEditingLessonId(lesson.id);
    setLessonNameInput(lesson.name);
    setLessonGradeInput(lesson.grade || selectedClass);
    setFormError(null);
    setSuccessBanner(null);
  };

  // Save (Add or Update) lesson
  const handleSaveLesson = (e) => {
    e.preventDefault();
    const trimmedName = lessonNameInput.trim();

    if (!trimmedName) {
      setFormError('Please enter a lesson name.');
      return;
    }

    // Check for duplicate name (excluding currently edited item)
    const isDuplicate = lessons.some(
      (l) => l.name.toLowerCase() === trimmedName.toLowerCase() && l.id !== editingLessonId
    );
    if (isDuplicate) {
      setFormError(`A lesson named "${trimmedName}" already exists in the syllabus.`);
      return;
    }

    if (editingLessonId) {
      const updatedLessons = lessons.map((l) =>
        l.id === editingLessonId
          ? {
              ...l,
              name: trimmedName,
              grade: lessonGradeInput,
            }
          : l
      );
      onUpdateSyllabus({ ...syllabusData, lessons: updatedLessons });
      setSuccessBanner(`Updated lesson "${trimmedName}" successfully.`);
    } else {
      const newLesson = {
        id: `les-${Date.now()}`,
        name: trimmedName,
        grade: lessonGradeInput,
        prerequisites: [],
        isFoundational: false,
      };
      onUpdateSyllabus({ ...syllabusData, lessons: [...lessons, newLesson] });
      setSuccessBanner(`Added lesson "${trimmedName}" to the syllabus.`);
    }

    resetLessonForm();
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Trigger deletion prompt with dependency check
  const handlePromptDelete = (lesson) => {
    setLessonToDelete(lesson);

    const dependents = lessons.filter(
      (l) => l.prerequisites && l.prerequisites.includes(lesson.id)
    );

    if (dependents.length > 0) {
      const dependentNames = dependents.map((d) => `"${d.name}"`).join(', ');
      setDependentLessonsWarning(
        `This lesson is currently referenced as a prerequisite by: ${dependentNames}. Deleting it will safely remove it from their prerequisite list.`
      );
    } else {
      setDependentLessonsWarning(null);
    }

    setIsDeleteModalOpen(true);
  };

  // Confirm delete lesson
  const handleConfirmDelete = () => {
    if (!lessonToDelete) return;

    const targetId = lessonToDelete.id;
    const targetName = lessonToDelete.name;

    const updatedLessons = lessons
      .filter((l) => l.id !== targetId)
      .map((l) => ({
        ...l,
        prerequisites: (l.prerequisites || []).filter((pid) => pid !== targetId),
      }));

    onUpdateSyllabus({ ...syllabusData, lessons: updatedLessons });

    if (editingLessonId === targetId) {
      resetLessonForm();
    }

    setIsDeleteModalOpen(false);
    setLessonToDelete(null);
    setDependentLessonsWarning(null);
    setSuccessBanner(`Deleted lesson "${targetName}" and cleaned up prerequisite mappings.`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="section-container" aria-label="Class and Syllabus Setup Section">
      <PageHeader
        title="Class & Syllabus Setup"
        subtitle="Configure the examination scope and map curriculum topics for this assessment."
        badgeText="Setup Phase"
      />

      {successBanner && (
        <div className="alert alert-success" role="status" aria-live="polite">
          <IconCheck size={18} style={{ flexShrink: 0 }} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Examination Configuration Card */}
      <section className="card" style={{ marginBottom: 'var(--space-6)' }} aria-labelledby="exam-details-heading">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 id="exam-details-heading" className="card-title">Examination Details</h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '2px' }}>
              Configure scope, maximum marks, and link to one of your classroom sections.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {assessmentId && (
              <span className="badge badge-success" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconCheck size={12} />
                <span>Persisted in MongoDB</span>
              </span>
            )}
            {!isDemoMode && onSaveAssessment && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleManualSave}
                disabled={isSavingAssessment}
                title="Persist this assessment in your MongoDB database"
              >
                <IconCheck size={14} />
                <span>{isSavingAssessment ? 'Saving...' : assessmentId ? 'Update Assessment' : 'Save Assessment'}</span>
              </button>
            )}
          </div>
        </div>

        {saveError && (
          <div className="alert alert-warning" style={{ margin: 'var(--space-4) var(--space-4) 0' }} role="alert">
            <IconAlertTriangle size={16} />
            <span>{saveError}</span>
          </div>
        )}

        <div className="form-grid" style={{ padding: 'var(--space-4)' }}>
          {/* Class Selection */}
          <FormField id="class-select" label="Class" required>
            <select
              value={
                selectedClass
                  ? (selectedClass.startsWith('Grade')
                      ? selectedClass.replace('Grade', 'Class')
                      : selectedClass)
                  : 'Class 8'
              }
              onChange={(e) => {
                const val = e.target.value;
                const matched = classes.find(
                  (c) =>
                    c.grade === val ||
                    c.grade === val.replace('Class', 'Grade') ||
                    c.name === val ||
                    c.name.startsWith(val)
                );
                onUpdateSyllabus({
                  ...syllabusData,
                  selectedClass: val,
                  classId: matched?._id || '',
                });
              }}
              className="form-select"
            >
              <option value="">— Select a Class —</option>
              <option value="Class 6">Class 6</option>
              <option value="Class 7">Class 7</option>
              <option value="Class 8">Class 8</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 10">Class 10</option>
            </select>
          </FormField>

          <FormField id="subject-select" label="Subject" required>
            <select
              value={selectedSubject}
              onChange={(e) => handleConfigChange('selectedSubject', e.target.value)}
              className="form-select"
            >
              <option value="Mathematics">Mathematics</option>
              <option value="Science / Physics">Science / Physics</option>
              <option value="English Language">English Language</option>
              <option value="Social Studies">Social Studies</option>
            </select>
          </FormField>

          <FormField
            id="exam-name-input"
            label="Examination Name"
            required
            hint="E.g. Mid-Term Assessment 2026"
            error={!examName.trim() ? 'Exam name is required.' : null}
          >
            <input
              type="text"
              value={examName}
              onChange={(e) => handleConfigChange('examName', e.target.value)}
              placeholder="E.g. Mid-Term Algebra & Geometry Assessment"
              className="form-input"
            />
          </FormField>

          <FormField id="academic-term-input" label="Academic Term / Year">
            <input
              type="text"
              value={academicTerm}
              onChange={(e) => handleConfigChange('academicTerm', e.target.value)}
              placeholder="E.g. Term 1 (2025-2026)"
              className="form-input"
            />
          </FormField>

          <FormField
            id="total-marks-input"
            label="Total Exam Marks"
            required
            error={Number(totalMarks) <= 0 ? 'Total marks must be greater than 0.' : null}
          >
            <input
              type="number"
              min="1"
              max="500"
              value={totalMarks}
              onChange={(e) => handleConfigChange('totalMarks', Number(e.target.value) || 0)}
              className="form-input"
            />
          </FormField>

          <FormField id="exam-date-input" label="Examination Date">
            <input
              type="date"
              value={examDate}
              onChange={(e) => handleConfigChange('examDate', e.target.value)}
              className="form-input"
            />
          </FormField>
        </div>
      </section>

      {/* Lesson & Prerequisites Builder */}
      <section className="card" aria-labelledby="lessons-heading">
        <div className="card-header">
          <div>
            <h2 id="lessons-heading" className="card-title">Syllabus Lessons & Prerequisite Concepts</h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '2px' }}>
              Map out target syllabus chapters and foundational concepts taught in prior grades.
            </p>
          </div>
          <span className="badge badge-neutral">
            {lessons.length} {lessons.length === 1 ? 'Topic' : 'Topics'} Configured
          </span>
        </div>

        {/* Add / Edit Lesson Form */}
        <form
          onSubmit={handleSaveLesson}
          style={{
            backgroundColor: 'var(--surface-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
          aria-label={editingLessonId ? 'Edit Lesson Form' : 'Add Lesson Form'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
              {editingLessonId ? 'Edit Lesson / Concept' : 'Add New Lesson or Foundational Concept'}
            </h3>
            {editingLessonId && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={resetLessonForm}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="form-grid">
            <FormField
              id="lesson-name-field"
              label="Topic / Lesson Name"
              required
              error={formError}
            >
              <input
                type="text"
                value={lessonNameInput}
                onChange={(e) => {
                  setLessonNameInput(e.target.value);
                  setFormError(null);
                }}
                placeholder="E.g. One-Step Linear Equations"
                className="form-input"
              />
            </FormField>

            <FormField id="lesson-grade-field" label="Class / Level" required>
              <select
                value={
                  lessonGradeInput.startsWith('Grade')
                    ? lessonGradeInput.replace('Grade', 'Class')
                    : lessonGradeInput
                }
                onChange={(e) => setLessonGradeInput(e.target.value)}
                className="form-select"
              >
                <option value="Class 8">Class 8 (Target Syllabus)</option>
                <option value="Class 7">Class 7 (Foundational)</option>
                <option value="Class 6">Class 6 (Foundational)</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
              </select>
            </FormField>
          </div>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button type="submit" className="btn btn-primary btn-sm">
              <IconPlus size={16} />
              <span>{editingLessonId ? 'Save Changes' : 'Add Lesson to Syllabus'}</span>
            </button>
          </div>
        </form>

        {/* Existing Lessons List */}
        {lessons.length === 0 ? (
          <EmptyState
            icon={<IconBookOpen size={28} />}
            title="No syllabus topics configured yet"
            description="Add lessons using the form above to build the topic progression and trace prerequisite gaps."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 'var(--space-3)' }}>
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                allLessons={lessons}
                onEdit={handleStartEdit}
                onDelete={handlePromptDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Lesson Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Lesson"
        message={`Are you sure you want to remove "${lessonToDelete?.name}" from the syllabus?`}
        warningText={dependentLessonsWarning}
        confirmLabel="Yes, Delete Lesson"
        cancelLabel="Keep Lesson"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setLessonToDelete(null);
          setDependentLessonsWarning(null);
        }}
      />
    </div>
  );
}
