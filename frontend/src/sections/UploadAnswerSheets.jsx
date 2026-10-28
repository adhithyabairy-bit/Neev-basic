import React, { useState, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import {
  IconUpload,
  IconFileText,
  IconTrash,
  IconAlertCircle,
  IconCheckCircle,
  IconInfo,
  IconUser,
} from '../components/Icons';

export default function UploadAnswerSheets({
  syllabusData,
  uploadedFiles = [],
  onUpdateFiles,
  studentProfile = { name: '', rollNumber: '', section: 'Section A' },
  onUpdateStudentProfile,
  onStartNewStudentAssessment,
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('answer-sheet');
  const [validationError, setValidationError] = useState(null);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [studentNameTouched, setStudentNameTouched] = useState(false);

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png'];

  // Format file size nicely
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Process incoming files from input or drag-drop
  const handleProcessFiles = (fileList) => {
    setValidationError(null);
    setUploadNotice(null);

    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) {
      setValidationError('No files were selected.');
      return;
    }

    const newValidFiles = [];
    const errors = [];

    filesArray.forEach((file) => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();

      // Check format
      const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTS.includes(ext);
      if (!isValidType) {
        errors.push(`"${file.name}": Unsupported format. Allowed types are PDF, JPG, and PNG.`);
        return;
      }

      // Check empty
      if (file.size === 0) {
        errors.push(`"${file.name}": File is empty (0 bytes).`);
        return;
      }

      // Check size limit
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}": File exceeds the 15 MB size limit.`);
        return;
      }

      // Check duplicate
      const isDuplicate = uploadedFiles.some(
        (existing) => existing.name === file.name && existing.size === file.size
      );
      if (isDuplicate) {
        errors.push(`"${file.name}": Already added to staged files.`);
        return;
      }

      newValidFiles.push({
        id: `f-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: file.name,
        type: file.type || ext,
        size: file.size,
        category: selectedCategory,
        status: 'Staged Locally',
        pages: file.type.includes('pdf') ? Math.floor(Math.random() * 3) + 1 : 1,
        studentName: studentProfile?.name?.trim() || 'Student',
      });
    });

    if (errors.length > 0) {
      setValidationError(errors.join(' '));
    }

    if (newValidFiles.length > 0) {
      onUpdateFiles([...uploadedFiles, ...newValidFiles]);
      setUploadNotice(`Staged ${newValidFiles.length} file(s) locally for analysis preview.`);
      setTimeout(() => setUploadNotice(null), 4000);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (fileId) => {
    const updated = uploadedFiles.filter((f) => f.id !== fileId);
    onUpdateFiles(updated);
    setValidationError(null);
  };

  // Group counts
  const answerSheetsCount = uploadedFiles.filter((f) => f.category === 'answer-sheet').length;
  const questionPapersCount = uploadedFiles.filter((f) => f.category === 'question-paper').length;
  const markingSchemeCount = uploadedFiles.filter((f) => f.category === 'marking-scheme').length;

  return (
    <div className="section-container" aria-label="Upload Answer Sheets Section">
      <PageHeader
        title="Upload Answer Sheets & Reference Material"
        subtitle="Staged document collection for student answer sheets, question papers, and marking keys."
        badgeText="Collection Phase"
      />

      {/* Demonstration Notice */}
      <div className="alert alert-notice" role="status">
        <IconInfo size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Frontend Demonstration Mode: </strong>
          <span>
            Selected files are stored in browser memory only. No data is transmitted to an external server or stored in a database.
          </span>
        </div>
      </div>

      {uploadNotice && (
        <div className="alert alert-success" role="status">
          <IconCheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{uploadNotice}</span>
        </div>
      )}

      {validationError && (
        <div className="alert alert-danger" role="alert">
          <IconAlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Exam Summary Header Card: Neutral badge styling across all categories */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', backgroundColor: 'var(--card-highlight-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <span style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--muted-text)', fontWeight: 'var(--font-weight-bold)' }}>
              Target Examination
            </span>
            <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--main-text)', fontWeight: 'var(--font-weight-bold)' }}>
              {syllabusData.examName || 'Mid-Term Assessment'}
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--secondary-text)' }}>
              {syllabusData.selectedClass} &bull; {syllabusData.selectedSubject} &bull; Total Marks: {syllabusData.totalMarks}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span className="badge badge-neutral">{answerSheetsCount} Answer Sheets</span>
            <span className="badge badge-neutral">{questionPapersCount} Question Paper</span>
            <span className="badge badge-neutral">{markingSchemeCount} Marking Scheme</span>
          </div>
        </div>
      </div>

      {/* Student Assessment Profile Card */}
      <section className="card card-highlight" style={{ marginBottom: 'var(--space-6)' }} aria-labelledby="student-entry-heading">
        <div className="card-header">
          <div>
            <h2 id="student-entry-heading" className="card-title">Student Information & Assessment Context</h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
              Identify the student whose answer sheets and learning gaps are being evaluated.
            </p>
          </div>
          {onStartNewStudentAssessment && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onStartNewStudentAssessment}
              title="Clear current student files and begin a new student assessment"
            >
              <IconUser size={14} />
              <span>New Student Assessment</span>
            </button>
          )}
        </div>

        <div className="form-grid">
          {/* Student Full Name (Required) */}
          <FormField
            id="student-full-name"
            label="Student full name"
            required
            hint="Full name as written on the student answer sheet"
            error={studentNameTouched && !studentProfile?.name?.trim() ? "Student full name is required." : null}
          >
            <input
              type="text"
              id="student-full-name"
              value={studentProfile?.name || ''}
              onChange={(e) => {
                setStudentNameTouched(true);
                onUpdateStudentProfile?.({
                  ...studentProfile,
                  name: e.target.value,
                });
              }}
              onBlur={() => setStudentNameTouched(true)}
              placeholder="Enter student's full name"
              className="form-input"
              required
            />
          </FormField>

          {/* Roll Number / Student ID (Optional) */}
          <FormField
            id="student-roll-number"
            label="Student identifier / Roll number"
            hint="Optional student ID or roll number"
          >
            <input
              type="text"
              id="student-roll-number"
              value={studentProfile?.rollNumber || ''}
              onChange={(e) => {
                onUpdateStudentProfile?.({
                  ...studentProfile,
                  rollNumber: e.target.value,
                });
              }}
              placeholder="e.g. ROLL-2025-042"
              className="form-input"
            />
          </FormField>

          {/* Class and Section */}
          <FormField
            id="student-class-section"
            label="Class & Section"
            hint="Class from Step 1 with section selection"
          >
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                id="student-class-display"
                value={syllabusData.selectedClass || 'Grade 8'}
                readOnly
                className="form-input"
                style={{ backgroundColor: 'var(--surface-bg)', width: '50%' }}
                title="Class configured in Step 1"
              />
              <select
                id="student-section-select"
                value={studentProfile?.section || 'Section A'}
                onChange={(e) => {
                  onUpdateStudentProfile?.({
                    ...studentProfile,
                    section: e.target.value,
                  });
                }}
                className="form-select"
                style={{ width: '50%' }}
                aria-label="Student Section"
              >
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
                <option value="Section D">Section D</option>
              </select>
            </div>
          </FormField>

          {/* Subject & Exam Details */}
          <FormField
            id="student-exam-summary"
            label="Subject & Total Marks"
            hint="Configured in Syllabus Setup"
          >
            <input
              type="text"
              id="student-exam-summary"
              value={`${syllabusData.selectedSubject || 'Mathematics'} • Total Marks: ${syllabusData.totalMarks || 50}`}
              readOnly
              className="form-input"
              style={{ backgroundColor: 'var(--surface-bg)' }}
              title="Subject and marks"
            />
          </FormField>
        </div>
      </section>

      {/* Drag & Drop Upload Zone */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Document Staging Zone</h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
              Choose file category before dragging or browsing.
            </p>
          </div>

          {/* Category Selector */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${selectedCategory === 'answer-sheet' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('answer-sheet')}
            >
              Answer Sheet
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedCategory === 'question-paper' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('question-paper')}
            >
              Question Paper
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedCategory === 'marking-scheme' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('marking-scheme')}
            >
              Marking Scheme
            </button>
          </div>
        </div>

        {/* Drop Target */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary-orange)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-lg)',
            backgroundColor: dragActive ? 'var(--light-orange-subtle)' : 'var(--surface-bg)',
            padding: 'var(--space-8) var(--space-4)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label={`Drop files here or click to browse for ${selectedCategory.replace('-', ' ')}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) handleProcessFiles(e.target.files);
            }}
          />

          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--light-orange)',
              color: 'var(--primary-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-3)',
            }}
          >
            <IconUpload size={28} />
          </div>

          <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
            Drag & drop {selectedCategory.replace('-', ' ')} files here, or <span style={{ color: 'var(--primary-orange)' }}>Browse</span>
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '4px' }}>
            Supported formats: PDF, JPG, PNG &bull; Max 15 MB per file
          </p>
        </div>
      </div>

      {/* Selected Files List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Staged Files ({uploadedFiles.length})</h2>
          {uploadedFiles.length > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onUpdateFiles([])}
            >
              Clear All Files
            </button>
          )}
        </div>

        {uploadedFiles.length === 0 ? (
          <EmptyState
            icon={<IconFileText size={26} />}
            title="No files staged yet"
            description="Upload at least one student answer sheet to proceed with extraction and gap analysis."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {uploadedFiles.map((file) => {
              const categoryBadge =
                file.category === 'answer-sheet'
                  ? 'badge-orange'
                  : file.category === 'question-paper'
                  ? 'badge-neutral'
                  : 'badge-success';

              return (
                <div
                  key={file.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#FFFFFF',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--light-orange-subtle)',
                        color: 'var(--primary-orange)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconFileText size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--main-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {file.name}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '2px' }}>
                        <span className={`badge ${categoryBadge}`} style={{ fontSize: '11px' }}>
                          {file.category.replace('-', ' ')}
                        </span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                          {formatSize(file.size)} &bull; {file.pages} {file.pages === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                    <span className="badge badge-success" style={{ fontSize: '11px' }}>
                      {file.status}
                    </span>
                    <button
                      type="button"
                      className="btn-icon-only danger"
                      onClick={() => handleRemoveFile(file.id)}
                      aria-label={`Remove file ${file.name}`}
                      title="Remove file"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
