import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import LessonCard from '../components/LessonCard';
import EmptyState from '../components/EmptyState';
import ConfirmationModal from '../components/ConfirmationModal';
import { IconPlus, IconCheck, IconAlertTriangle, IconBookOpen } from '../components/Icons';

export default function ClassSyllabus({
  syllabusData,
  onUpdateSyllabus,
}) {
  const {
    selectedClass = 'Grade 8',
    selectedSubject = 'Mathematics',
    examName = '',
    academicTerm = '',
    totalMarks = 50,
    lessons = [],
  } = syllabusData;

  // Local form state for Add/Edit lesson
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonNameInput, setLessonNameInput] = useState('');
  const [lessonGradeInput, setLessonGradeInput] = useState('Grade 8');

  // Validation & alerts
  const [formError, setFormError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

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
      // Update existing lesson
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
      // Create new lesson
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

    // Find any lessons that have this lesson as a prerequisite
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

    // Remove the target lesson AND clean up any dependent references
    const updatedLessons = lessons
      .filter((l) => l.id !== targetId)
      .map((l) => ({
        ...l,
        prerequisites: (l.prerequisites || []).filter((pid) => pid !== targetId),
      }));

    onUpdateSyllabus({ ...syllabusData, lessons: updatedLessons });

    // If currently editing this lesson, reset form
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
        subtitle="Configure the examination scope and map curriculum topics, including earlier foundational concepts."
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
        <div className="card-header">
          <h2 id="exam-details-heading" className="card-title">Examination Details</h2>
        </div>

        <div className="form-grid">
          <FormField id="class-select" label="Class / Grade" required>
            <select
              value={selectedClass}
              onChange={(e) => handleConfigChange('selectedClass', e.target.value)}
              className="form-select"
            >
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
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

            <FormField id="lesson-grade-field" label="Grade / Level" required>
              <select
                value={lessonGradeInput}
                onChange={(e) => setLessonGradeInput(e.target.value)}
                className="form-select"
              >
                <option value="Grade 6">Grade 6 (Foundational)</option>
                <option value="Grade 7">Grade 7 (Foundational)</option>
                <option value="Grade 8">Grade 8 (Target Syllabus)</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 'var(--space-3)' }}>
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
