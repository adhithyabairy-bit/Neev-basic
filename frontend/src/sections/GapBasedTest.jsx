import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  IconTarget,
  IconEdit,
  IconTrash,
  IconPlus,
  IconInfo,
  IconCheck,
} from '../components/Icons';

export default function GapBasedTest({
  testQuestions = [],
  onUpdateQuestions,
  syllabusData,
}) {
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Form state for edit/add question
  const [editPrompt, setEditPrompt] = useState('');
  const [editMarks, setEditMarks] = useState(3);
  const [editType, setEditType] = useState('Problem Solving');
  const [editTargetConcept, setEditTargetConcept] = useState('');
  const [editSyllabusTopic, setEditSyllabusTopic] = useState('');
  const [editModalError, setEditModalError] = useState(null);

  const lessons = syllabusData?.lessons || [];

  // Calculate total marks
  const totalTestMarks = testQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  // Open Edit modal
  const handleStartEdit = (q) => {
    setEditingQuestion(q);
    setEditPrompt(q.prompt);
    setEditMarks(q.marks);
    setEditType(q.type || 'Problem Solving');
    setEditTargetConcept(q.targetConcept || '');
    setEditSyllabusTopic(q.syllabusTopic || (lessons[0]?.name || 'General'));
    setEditModalError(null);
    setIsEditModalOpen(true);
  };

  // Open Add modal
  const handleStartAdd = () => {
    setEditingQuestion(null);
    setEditPrompt('');
    setEditMarks(3);
    setEditType('Problem Solving');
    setEditTargetConcept('Operations with Negative Integers');
    setEditSyllabusTopic(lessons[0]?.name || 'Mathematics');
    setEditModalError(null);
    setIsEditModalOpen(true);
  };

  // Save question (Add or Edit)
  const handleSaveQuestion = () => {
    if (!editPrompt.trim()) {
      setEditModalError('Question text cannot be empty.');
      return;
    }
    const marksNum = Number(editMarks);
    if (isNaN(marksNum) || marksNum <= 0) {
      setEditModalError('Marks must be a positive number.');
      return;
    }

    if (editingQuestion) {
      // Edit existing
      const updated = testQuestions.map((q) =>
        q.id === editingQuestion.id
          ? {
              ...q,
              prompt: editPrompt.trim(),
              marks: marksNum,
              type: editType,
              targetConcept: editTargetConcept.trim(),
              syllabusTopic: editSyllabusTopic,
            }
          : q
      );
      onUpdateQuestions(updated);
      setFeedbackMessage('Question updated successfully.');
    } else {
      // Add new
      const newQ = {
        id: `test-q-${Date.now()}`,
        number: `${testQuestions.length + 1}`,
        prompt: editPrompt.trim(),
        marks: marksNum,
        type: editType,
        targetConcept: editTargetConcept.trim(),
        syllabusTopic: editSyllabusTopic,
      };
      onUpdateQuestions([...testQuestions, newQ]);
      setFeedbackMessage('New diagnostic question added to test paper.');
    }

    setIsEditModalOpen(false);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Delete question
  const handlePromptDelete = (q) => {
    setQuestionToDelete(q);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!questionToDelete) return;
    const updated = testQuestions
      .filter((q) => q.id !== questionToDelete.id)
      .map((q, idx) => ({ ...q, number: `${idx + 1}` }));
    onUpdateQuestions(updated);
    setIsDeleteModalOpen(false);
    setQuestionToDelete(null);
    setFeedbackMessage('Question removed from the test paper.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="section-container" aria-label="Gap-Based Test Section">
      <PageHeader
        title="Diagnostic Gap-Based Test Paper"
        subtitle="Targeted assessment items designed specifically to verify whether identified learning gaps are resolved."
        badgeText="Post-Intervention Test"
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleStartAdd}
          >
            <IconPlus size={14} />
            <span>Add Custom Question</span>
          </button>
        }
      />

      <div className="alert alert-notice" role="status">
        <IconInfo size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Demonstration Test Generator: </strong>
          <span>
            These questions are tailored to target the identified foundational gaps in Grade 7 arithmetic and transposition.
          </span>
        </div>
      </div>

      {feedbackMessage && (
        <div className="alert alert-success" role="status">
          <IconCheck size={18} style={{ flexShrink: 0 }} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Test Paper Summary Card */}
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
              Diagnostic Test Blueprint
            </span>
            <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)', marginTop: '2px' }}>
              {testQuestions.length} Targeted Questions &bull; Total Marks: {totalTestMarks} &bull; Time: ~{testQuestions.length * 8} mins
            </p>
          </div>
          <span className="badge badge-orange">{syllabusData?.selectedSubject || 'Mathematics'} &bull; Retest Paper</span>
        </div>
      </div>

      {/* Questions List */}
      {testQuestions.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={28} />}
          title="No test questions in paper"
          description="Click 'Add Custom Question' to populate diagnostic test items."
          actionButton={
            <button type="button" className="btn btn-primary btn-sm" onClick={handleStartAdd}>
              Add First Question
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {testQuestions.map((q, index) => (
            <div
              key={q.id || index}
              className="card"
              style={{ padding: 'var(--space-5)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span className="badge badge-orange" style={{ fontWeight: 'bold' }}>
                      Question {q.number || index + 1}
                    </span>
                    <span className="badge badge-neutral">{q.type}</span>
                    <span className="badge badge-success">{q.marks} Marks</span>
                  </div>

                  <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)', lineHeight: 1.4 }}>
                    {q.prompt}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn-icon-only"
                    onClick={() => handleStartEdit(q)}
                    aria-label={`Edit question ${q.number}`}
                    title="Edit question"
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon-only danger"
                    onClick={() => handlePromptDelete(q)}
                    aria-label={`Remove question ${q.number}`}
                    title="Remove question"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>

              {/* Target Concept Mapping */}
              <div
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginTop: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--dark-orange)' }}>Measures Concept Gap: </strong>
                  <span style={{ color: 'var(--main-text)' }}>{q.targetConcept}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--secondary-text)' }}>Syllabus Anchor: </strong>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>{q.syllabusTopic}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingQuestion ? 'Edit Diagnostic Question' : 'Add Custom Test Question'}</h2>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {editModalError && (
                <div className="alert alert-danger" style={{ marginBottom: 'var(--space-2)' }}>
                  {editModalError}
                </div>
              )}

              <FormField id="q-prompt" label="Question Text" required>
                <textarea
                  rows={3}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="form-textarea"
                  placeholder="Enter the question problem prompt..."
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <FormField id="q-marks" label="Question Marks" required>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editMarks}
                    onChange={(e) => setEditMarks(e.target.value)}
                    className="form-input"
                  />
                </FormField>

                <FormField id="q-type" label="Question Type">
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="form-select"
                  >
                    <option value="Short Answer">Short Answer</option>
                    <option value="Problem Solving">Problem Solving</option>
                    <option value="Multi-Step Problem">Multi-Step Problem</option>
                    <option value="Multiple Choice">Multiple Choice</option>
                  </select>
                </FormField>
              </div>

              <FormField id="q-target-concept" label="Target Learning Gap Measured" required>
                <input
                  type="text"
                  value={editTargetConcept}
                  onChange={(e) => setEditTargetConcept(e.target.value)}
                  className="form-input"
                  placeholder="E.g. Transposition across equals sign"
                />
              </FormField>

              <FormField id="q-syllabus-topic" label="Anchored Syllabus Topic">
                <select
                  value={editSyllabusTopic}
                  onChange={(e) => setEditSyllabusTopic(e.target.value)}
                  className="form-select"
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name} ({l.grade})
                    </option>
                  ))}
                  {lessons.length === 0 && <option value="General">General Assessment</option>}
                </select>
              </FormField>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveQuestion}
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Question Confirmation */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Remove Question"
        message={`Are you sure you want to remove Question ${questionToDelete?.number} from the test paper?`}
        confirmLabel="Yes, Remove"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setQuestionToDelete(null);
        }}
      />
    </div>
  );
}
