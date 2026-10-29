import React, { useState, useEffect } from 'react';
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
  IconTrash,
  IconUpload,
  IconSparkles,
} from '../components/Icons';
import {
  fetchSyllabusDocuments,
  ingestSyllabusDocument,
  deleteSyllabusDocument,
} from '../services/syllabusService';

const DEMO_SYLLABUS_DOCS = [
  {
    _id: 'demo-doc-1',
    title: 'NCERT Grade 8 Mathematics — Linear Equations in One Variable',
    fileName: 'NCERT-Class8-Maths-Chapter2.pdf',
    fileSize: 2457600,
    chunkCount: 38,
    status: 'indexed',
    grade: 'Grade 8',
    subject: 'Mathematics',
  },
  {
    _id: 'demo-doc-2',
    title: 'NCERT Grade 7 Mathematics — Integers & Foundational Arithmetic',
    fileName: 'NCERT-Class7-Maths-Integers.pdf',
    fileSize: 1843200,
    chunkCount: 29,
    status: 'indexed',
    grade: 'Grade 7',
    subject: 'Mathematics',
  },
];

export default function ClassSyllabus({
  syllabusData,
  onUpdateSyllabus,
  classes = [],
  isDemoMode = false,
  onSaveAssessment,
}) {
  const {
    selectedClass = 'Grade 8',
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
  const [lessonGradeInput, setLessonGradeInput] = useState('Grade 8');

  // Rubric state
  const [qNumInput, setQNumInput] = useState('');
  const [qTopicInput, setQTopicInput] = useState('');
  const [qMaxMarksInput, setQMaxMarksInput] = useState(5);
  const [qExpectedInput, setQExpectedInput] = useState('');
  const [qCriteriaInput, setQCriteriaInput] = useState('');
  const [editingRubricIdx, setEditingRubricIdx] = useState(null);
  const [rubricFormError, setRubricFormError] = useState(null);

  // Syllabus documents state
  const [syllabusDocs, setSyllabusDocs] = useState([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState(null);

  // Validation & alerts
  const [formError, setFormError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);

  // Deletion modal state
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dependentLessonsWarning, setDependentLessonsWarning] = useState(null);

  // Load syllabus documents for RAG
  useEffect(() => {
    if (isDemoMode) {
      setSyllabusDocs(DEMO_SYLLABUS_DOCS);
      return;
    }

    let isMounted = true;
    async function loadDocs() {
      try {
        const docs = await fetchSyllabusDocuments({ subject: selectedSubject });
        if (isMounted) setSyllabusDocs(docs || []);
      } catch (err) {
        // Non-blocking error for documents
      }
    }
    loadDocs();
    return () => {
      isMounted = false;
    };
  }, [isDemoMode, selectedSubject]);

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

  // Rubric Form Handlers
  const handleSaveRubricItem = (e) => {
    e.preventDefault();
    if (!qNumInput.trim()) {
      setRubricFormError('Question number (e.g. Q1) is required.');
      return;
    }
    if (Number(qMaxMarksInput) <= 0) {
      setRubricFormError('Maximum marks must be greater than zero.');
      return;
    }

    const newItem = {
      questionNumber: qNumInput.trim().toUpperCase(),
      topic: qTopicInput.trim() || 'General Mathematics',
      maximumMarks: Number(qMaxMarksInput),
      expectedAnswer: qExpectedInput.trim(),
      scoringCriteria: qCriteriaInput
        ? qCriteriaInput.split('\n').map((s) => s.trim()).filter(Boolean)
        : ['Full correct calculation steps: full marks', 'Minor arithmetic slip: -1 mark'],
    };

    let updatedRubric = [...rubric];
    if (editingRubricIdx !== null) {
      updatedRubric[editingRubricIdx] = newItem;
    } else {
      updatedRubric.push(newItem);
    }

    onUpdateSyllabus({ ...syllabusData, rubric: updatedRubric });
    setQNumInput('');
    setQTopicInput('');
    setQMaxMarksInput(5);
    setQExpectedInput('');
    setQCriteriaInput('');
    setEditingRubricIdx(null);
    setRubricFormError(null);
    setSuccessBanner('Question rubric updated.');
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  const handleDeleteRubricItem = (index) => {
    const updated = rubric.filter((_, idx) => idx !== index);
    onUpdateSyllabus({ ...syllabusData, rubric: updated });
  };

  const handlePopulateDefaultRubric = () => {
    const defaultRubric = [
      {
        questionNumber: 'Q1',
        topic: 'One-Step Linear Equations & Transposition',
        maximumMarks: 3,
        expectedAnswer: '3x - 7 = 14 => 3x = 14 + 7 => 3x = 21 => x = 7',
        scoringCriteria: ['Sign reversal during transposition (+1)', 'Isolation of x (+1)', 'Final calculation (+1)'],
      },
      {
        questionNumber: 'Q2',
        topic: 'Integers & Signed Arithmetic',
        maximumMarks: 2,
        expectedAnswer: '-5 - (-12) + 3 = -5 + 12 + 3 = 7 + 3 = 10',
        scoringCriteria: ['Double negative conversion -(-12) = +12 (+1)', 'Correct integer addition (+1)'],
      },
      {
        questionNumber: 'Q3',
        topic: 'Order of Operations & Parentheses',
        maximumMarks: 4,
        expectedAnswer: '5(y - 2) = 2y + 8 => 5y - 10 = 2y + 8 => 3y = 18 => y = 6',
        scoringCriteria: ['Distributive multiplication over bracket (+1)', 'Grouping like terms (+1)', 'Correct simplification (+2)'],
      },
    ];
    onUpdateSyllabus({ ...syllabusData, rubric: defaultRubric });
    setSuccessBanner('Sample question rubric populated.');
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  // Syllabus Document Ingestion Handler
  const handleUploadSyllabusDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isDemoMode) {
      setSyllabusDocs((prev) => [
        ...prev,
        {
          _id: `demo-doc-${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          fileSize: file.size,
          chunkCount: Math.ceil(file.size / 50000) || 12,
          status: 'indexed',
          grade: selectedClass,
          subject: selectedSubject,
        },
      ]);
      setSuccessBanner(`Ingested "${file.name}" into syllabus vector store (Demo).`);
      e.target.value = '';
      setTimeout(() => setSuccessBanner(null), 4000);
      return;
    }

    setIsUploadingDoc(true);
    setDocUploadError(null);
    try {
      const result = await ingestSyllabusDocument(file, {
        title: file.name.replace(/\.[^/.]+$/, ''),
        subject: selectedSubject,
        grade: selectedClass,
      });
      setSyllabusDocs((prev) => [result.document, ...prev]);
      setSuccessBanner(`Ingested "${file.name}" into vector store (${result.chunkCount} chunks generated).`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      setDocUploadError(err.message || 'Failed to ingest syllabus document.');
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDeleteSyllabusDoc = async (docId) => {
    if (isDemoMode) {
      setSyllabusDocs((prev) => prev.filter((d) => d._id !== docId));
      return;
    }
    try {
      await deleteSyllabusDocument(docId);
      setSyllabusDocs((prev) => prev.filter((d) => d._id !== docId));
      setSuccessBanner('Syllabus document removed from vector store.');
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err) {
      setDocUploadError(err.message || 'Failed to delete syllabus document.');
    }
  };

  const rubricTotalMarks = rubric.reduce((sum, item) => sum + (Number(item.maximumMarks) || 0), 0);

  return (
    <div className="section-container" aria-label="Class and Syllabus Setup Section">
      <PageHeader
        title="Class & Syllabus Setup"
        subtitle="Configure the examination scope, map curriculum topics, define question rubrics, and maintain the syllabus RAG knowledge base."
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

        <div className="form-grid">
          <FormField id="class-select" label="Class / Grade" required>
            {!isDemoMode && classes.length > 0 ? (
              <select
                value={classId || ''}
                onChange={(e) => {
                  const targetClass = classes.find((c) => c._id === e.target.value);
                  if (targetClass) {
                    onUpdateSyllabus({
                      ...syllabusData,
                      classId: targetClass._id,
                      selectedClass: targetClass.grade,
                      selectedSubject: targetClass.subject || selectedSubject,
                    });
                  } else {
                    onUpdateSyllabus({
                      ...syllabusData,
                      classId: '',
                      selectedClass: e.target.value,
                    });
                  }
                }}
                className="form-select"
              >
                <option value="">Select a class...</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} ({cls.grade} &bull; {cls.subject})
                  </option>
                ))}
              </select>
            ) : (
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
            )}
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

      {/* Curriculum Textbooks & RAG Knowledge Store */}
      <section className="card" style={{ marginBottom: 'var(--space-6)' }} aria-labelledby="curriculum-rag-heading">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 id="curriculum-rag-heading" className="card-title">Curriculum Textbooks & RAG Knowledge Store</h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '2px' }}>
              Persistent syllabus documents embedded for AI answer evaluation and evidence retrieval.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className="btn btn-outline btn-sm" style={{ cursor: isUploadingDoc ? 'not-allowed' : 'pointer' }}>
              <IconUpload size={14} />
              <span>{isUploadingDoc ? 'Ingesting Document...' : 'Ingest Syllabus PDF/TXT'}</span>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleUploadSyllabusDoc}
                disabled={isUploadingDoc}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {docUploadError && (
          <div className="alert alert-danger" style={{ margin: 'var(--space-3) 0' }}>
            <IconAlertTriangle size={16} />
            <span>{docUploadError}</span>
          </div>
        )}

        {syllabusDocs.length === 0 ? (
          <EmptyState
            icon={<IconBookOpen size={28} />}
            title="No syllabus documents ingested yet"
            description="Upload textbook chapters or curriculum guides to enable persistent vector-grounded RAG evaluation."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-3)' }}>
            {syllabusDocs.map((doc) => (
              <div
                key={doc._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)', fontSize: 'var(--font-size-sm)' }}>
                    {doc.title || doc.fileName}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '2px' }}>
                    {doc.grade || selectedClass} &bull; {doc.subject || selectedSubject} &bull; {doc.chunkCount || 0} Vector Chunks &bull; {Math.round((doc.fileSize || 0) / 1024)} KB
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>
                    Vector Indexed
                  </span>
                  <button
                    type="button"
                    className="btn-icon-only"
                    onClick={() => handleDeleteSyllabusDoc(doc._id)}
                    title="Remove syllabus document from vector store"
                  >
                    <IconTrash size={14} color="var(--danger-dark)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Question Rubric & Marking Scheme */}
      <section className="card" style={{ marginBottom: 'var(--space-6)' }} aria-labelledby="rubric-heading">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 id="rubric-heading" className="card-title">Question Rubric & Exemplar Solutions</h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '2px' }}>
              Define expected solutions and scoring criteria for accurate AI pedagogical evaluation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-neutral">
              Rubric Total: {rubricTotalMarks} / {totalMarks} Marks
            </span>
            {rubric.length === 0 && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handlePopulateDefaultRubric}
              >
                <IconSparkles size={14} />
                <span>Sample Rubric</span>
              </button>
            )}
          </div>
        </div>

        {rubricFormError && (
          <div className="alert alert-warning" style={{ margin: 'var(--space-3) 0' }}>
            <IconAlertTriangle size={16} />
            <span>{rubricFormError}</span>
          </div>
        )}

        {/* Rubric Item Form */}
        <form
          onSubmit={handleSaveRubricItem}
          style={{
            backgroundColor: 'var(--surface-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)', marginBottom: '8px' }}>
            {editingRubricIdx !== null ? 'Edit Rubric Question' : 'Add Rubric Question'}
          </h3>

          <div className="form-grid">
            <FormField id="q-num-field" label="Question Number" required>
              <input
                type="text"
                placeholder="E.g. Q1"
                value={qNumInput}
                onChange={(e) => setQNumInput(e.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField id="q-topic-field" label="Topic / Concept" required>
              <input
                type="text"
                placeholder="E.g. Transposition & Linear Equations"
                value={qTopicInput}
                onChange={(e) => setQTopicInput(e.target.value)}
                className="form-input"
              />
            </FormField>

            <FormField id="q-max-marks-field" label="Question Marks" required>
              <input
                type="number"
                min="1"
                max="50"
                value={qMaxMarksInput}
                onChange={(e) => setQMaxMarksInput(Number(e.target.value) || 1)}
                className="form-input"
              />
            </FormField>
          </div>

          <div style={{ marginTop: 'var(--space-3)' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)', display: 'block', marginBottom: '4px' }}>
              Expected Exemplar Solution (Steps):
            </label>
            <textarea
              rows={2}
              placeholder="E.g. 3x - 7 = 14 => 3x = 21 => x = 7"
              value={qExpectedInput}
              onChange={(e) => setQExpectedInput(e.target.value)}
              className="form-input"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {editingRubricIdx !== null && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setEditingRubricIdx(null);
                  setQNumInput('');
                  setQTopicInput('');
                  setQExpectedInput('');
                }}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm">
              <IconPlus size={14} />
              <span>{editingRubricIdx !== null ? 'Save Question Rubric' : 'Add Question to Rubric'}</span>
            </button>
          </div>
        </form>

        {/* Existing Rubric Items List */}
        {rubric.length === 0 ? (
          <EmptyState
            title="No rubric items defined"
            description="Add question criteria above or click 'Sample Rubric' to provide answer exemplars for AI scoring."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rubric.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--dark-orange)' }}>
                      {item.questionNumber}
                    </span>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)', fontSize: 'var(--font-size-sm)' }}>
                      {item.topic}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                      {item.maximumMarks} Marks
                    </span>
                  </div>
                  {item.expectedAnswer && (
                    <div style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', color: 'var(--secondary-text)', marginTop: '4px' }}>
                      {item.expectedAnswer}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setEditingRubricIdx(idx);
                      setQNumInput(item.questionNumber);
                      setQTopicInput(item.topic);
                      setQMaxMarksInput(item.maximumMarks);
                      setQExpectedInput(item.expectedAnswer || '');
                      setQCriteriaInput((item.scoringCriteria || []).join('\n'));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-icon-only"
                    onClick={() => handleDeleteRubricItem(idx)}
                    title="Delete rubric item"
                  >
                    <IconTrash size={14} color="var(--danger-dark)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
