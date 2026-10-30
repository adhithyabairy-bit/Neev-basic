import React, { useState, useRef, useEffect } from 'react';
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
import {
  uploadAnswerSheets,
  processAnswerSheet,
  fetchAnswerSheets,
  deleteAnswerSheet,
} from '../services/answerSheetService';

export default function UploadAnswerSheets({
  syllabusData,
  uploadedFiles = [],
  onUpdateFiles,
  studentProfile = { name: '', rollNumber: '', section: 'Section A' },
  onUpdateStudentProfile,
  onStartNewStudentAssessment,
  isDemoMode = false,
  onSaveAssessment,
  onAnswerSheetLoaded,
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('answer-sheet');
  const [validationError, setValidationError] = useState(null);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [studentNameTouched, setStudentNameTouched] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png'];

  // Format file size nicely
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to detect document category based on file name keywords or active tab
  const detectCategory = (fileName, fallbackCategory = 'answer-sheet') => {
    if (!fileName) return fallbackCategory;
    const lower = String(fileName).toLowerCase();
    if (lower.includes('marking') || lower.includes('rubric') || lower.includes('scheme')) {
      return 'marking-scheme';
    }
    if (lower.includes('question') || lower.includes('qp') || (lower.includes('paper') && !lower.includes('answer'))) {
      return 'question-paper';
    }
    return fallbackCategory || 'answer-sheet';
  };

  // Fetch real answer sheets from backend on load/refresh if not demo mode
  useEffect(() => {
    if (!isDemoMode && syllabusData?.assessmentId) {
      setIsLoadingExisting(true);
      fetchAnswerSheets(syllabusData.assessmentId)
        .then((sheets) => {
          if (Array.isArray(sheets) && sheets.length > 0) {
            const mapped = sheets.map((sheet) => {
              const category = detectCategory(sheet.originalFileName, 'answer-sheet');
              const hasAnswers = Array.isArray(sheet.answers) && sheet.answers.length > 0;
              return {
                id: sheet._id,
                _id: sheet._id,
                name: sheet.originalFileName,
                type: sheet.mimeType,
                size: sheet.fileSize,
                category,
                status: sheet.status === 'verified'
                  ? 'Verified Ground Truth'
                  : (sheet.status === 'review_required' || hasAnswers)
                    ? 'Ready for Review'
                    : sheet.status === 'processing'
                      ? 'Processing OCR'
                      : sheet.status === 'processing_failed'
                        ? 'Processing Failed'
                        : category === 'answer-sheet' ? 'Uploaded' : 'Ready for Review',
                pages: sheet.pageCount || 1,
                studentName: sheet.studentName,
                rawSheet: sheet,
              };
            });
            onUpdateFiles(mapped);

            // Populate studentProfile and extractionData from latest sheet if student name empty
            const latest = sheets[0];
            if (latest) {
              if (onUpdateStudentProfile && !studentProfile?.name) {
                onUpdateStudentProfile({
                  ...studentProfile,
                  name: latest.studentName || '',
                  rollNumber: latest.rollNumber || '',
                });
              }
              if (onAnswerSheetLoaded) {
                onAnswerSheetLoaded(latest);
              }
            }
          }
        })
        .catch((err) => {
          console.error('[UploadAnswerSheets] Failed to fetch existing answer sheets:', err);
        })
        .finally(() => {
          setIsLoadingExisting(false);
        });
    }
  }, [syllabusData?.assessmentId, isDemoMode]);

  // Process incoming files from input or drag-drop
  const handleProcessFiles = async (fileList) => {
    setValidationError(null);
    setUploadNotice(null);

    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) {
      setValidationError('No files were selected.');
      return;
    }

    // Client-side quick checks
    const filesToUpload = [];
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

      filesToUpload.push(file);
    });

    if (errors.length > 0) {
      setValidationError(errors.join(' | '));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (filesToUpload.length === 0) {
      setValidationError('No valid files to upload.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // In Demo Mode: stage files in browser memory
    if (isDemoMode) {
      const newValidFiles = filesToUpload.map((file) => {
        const cat = detectCategory(file.name, selectedCategory);
        return {
          id: `f-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          type: file.type || ('.' + file.name.split('.').pop().toLowerCase()),
          size: file.size,
          category: cat,
          status: 'Ready for Review',
          pages: file.type.includes('pdf') ? Math.floor(Math.random() * 3) + 1 : 1,
          studentName: studentProfile?.name?.trim() || 'Student 1',
        };
      });
      onUpdateFiles([...uploadedFiles.filter((f) => !filesToUpload.some((u) => u.name === f.name)), ...newValidFiles]);
      setUploadNotice(`Staged ${newValidFiles.length} file(s) locally for demonstration preview.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadNotice(null), 4000);
      return;
    }

    // Real Authenticated Upload: Ensure student name exists
    const activeStudentName = studentProfile?.name?.trim() || '';
    if (!activeStudentName) {
      setValidationError("Please enter the student's full name before uploading.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Ensure Assessment is saved in MongoDB
    let currentAssessmentId = syllabusData?.assessmentId;
    if (!currentAssessmentId && typeof onSaveAssessment === 'function') {
      try {
        const saved = await onSaveAssessment(syllabusData);
        currentAssessmentId = saved?._id;
      } catch (saveErr) {
        setValidationError(`Assessment setup required: ${saveErr.message}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    if (!currentAssessmentId) {
      setValidationError('Please save the assessment in Step 1 before uploading real answer sheets.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadNotice(`Uploading ${filesToUpload.length} file(s) to secure storage...`);

    try {
      const formData = new FormData();
      formData.append('studentName', activeStudentName);
      formData.append('rollNumber', studentProfile.rollNumber ? studentProfile.rollNumber.trim() : '');

      filesToUpload.forEach((file) => {
        formData.append('files', file);
      });

      // 1. Upload files swiftly to storage (~1-2 seconds)
      const result = await uploadAnswerSheets(currentAssessmentId, formData);

      // Immediately unlock dropzone for the next upload
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (Array.isArray(result) && result.length > 0) {
        const newlyMapped = result.map((sheet) => {
          const category = detectCategory(sheet.originalFileName, selectedCategory);
          const isAnswerSheet = category === 'answer-sheet';
          return {
            id: sheet._id,
            _id: sheet._id,
            name: sheet.originalFileName,
            type: sheet.mimeType,
            size: sheet.fileSize,
            category,
            status: sheet.status === 'verified'
              ? 'Verified Ground Truth'
              : sheet.status === 'review_required' || (sheet.answers && sheet.answers.length > 0)
                ? 'Ready for Review'
                : isAnswerSheet
                  ? 'Processing OCR'
                  : 'Ready for Review',
            pages: sheet.pageCount || 1,
            studentName: sheet.studentName || activeStudentName,
            rawSheet: sheet,
          };
        });

        // Merge with existing, replacing any duplicates by name
        onUpdateFiles((prev) => {
          const prevList = Array.isArray(prev) ? prev : [];
          const filteredOld = prevList.filter(
            (old) => !newlyMapped.some((n) => n.name === old.name)
          );
          return [...filteredOld, ...newlyMapped];
        });

        const firstAnswerSheet = newlyMapped.find((m) => m.category === 'answer-sheet') || newlyMapped[0];
        if (onAnswerSheetLoaded && firstAnswerSheet?.rawSheet) {
          onAnswerSheetLoaded(firstAnswerSheet.rawSheet);
        }

        setUploadNotice(
          `✓ ${result.length} file(s) uploaded successfully! Drop zone is ready for more files.`
        );
        setTimeout(() => setUploadNotice(null), 5000);

        // 2. Launch background OCR text extraction asynchronously for answer sheets only
        const answerSheetsToProcess = newlyMapped.filter(
          (m) => m.category === 'answer-sheet' && (!m.rawSheet?.answers || m.rawSheet.answers.length === 0)
        );

        answerSheetsToProcess.forEach((sheetItem) => {
          processAnswerSheet(sheetItem._id)
            .then((processedSheet) => {
              if (processedSheet) {
                if (onAnswerSheetLoaded) {
                  onAnswerSheetLoaded(processedSheet);
                }
                const count = processedSheet.answers?.length || 0;
                onUpdateFiles((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  return list.map((f) =>
                    f._id === processedSheet._id || f.id === processedSheet._id
                      ? {
                          ...f,
                          status: 'Ready for Review',
                          pages: processedSheet.pageCount || f.pages,
                          rawSheet: processedSheet,
                        }
                      : f
                  );
                });
                setUploadNotice(
                  `✓ OCR extraction complete for "${sheetItem.name}" (${count} question(s) identified)! Ready for review in Step 3.`
                );
                setTimeout(() => setUploadNotice(null), 5000);
              }
            })
            .catch((extractErr) => {
              console.warn('[UploadAnswerSheets] Background extraction notice:', extractErr.message);
              onUpdateFiles((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                return list.map((f) =>
                  f._id === sheetItem._id || f.id === sheetItem._id
                    ? {
                        ...f,
                        status: 'Ready for Review',
                      }
                    : f
                );
              });
            });
        });
      } else {
        setUploadNotice('Files uploaded successfully.');
        setTimeout(() => setUploadNotice(null), 4000);
      }
    } catch (err) {
      console.error('[UploadAnswerSheets] Upload failed:', err);
      setValidationError(err.message || 'Upload failed. Please check your connection and try again.');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleRemoveFile = async (file) => {
    const fileId = file._id || file.id;

    if (!isDemoMode && file._id) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${file.name}"? This will permanently delete the file and its extracted data.`
      );
      if (!confirmed) return;

      try {
        await deleteAnswerSheet(file._id);
        const updated = uploadedFiles.filter((f) => (f._id || f.id) !== fileId);
        onUpdateFiles(updated);
        setUploadNotice(`Deleted "${file.name}" successfully.`);
        setTimeout(() => setUploadNotice(null), 3000);
      } catch (err) {
        console.error('[UploadAnswerSheets] Delete failed:', err);
        setValidationError(err.message || 'Failed to delete file from backend.');
      }
    } else {
      const updated = uploadedFiles.filter((f) => (f._id || f.id) !== fileId);
      onUpdateFiles(updated);
      setValidationError(null);
    }
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

      {/* Mode Notice */}
      {isDemoMode ? (
        <div className="alert alert-notice" role="status">
          <IconInfo size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Frontend Demonstration Mode: </strong>
            <span>
              Selected files are stored in browser memory only. No data is transmitted to an external server or stored in a database.
            </span>
          </div>
        </div>
      ) : (
        <div className="alert alert-notice" role="status">
          <IconInfo size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Secure Teacher Upload: </strong>
            <span>
              Files are verified, saved in private server storage, and processed with real OCR. Metadata and extracted answers persist in MongoDB.
            </span>
          </div>
        </div>
      )}

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

      {/* Exam Summary Header Card */}
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
            cursor: isUploading ? 'wait' : 'pointer',
            transition: 'all var(--transition-fast)',
            opacity: isUploading ? 0.7 : 1,
          }}
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
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
            disabled={isUploading}
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
            {isUploading ? (
              <span>Uploading document to secure storage...</span>
            ) : (
              <>
                Drag & drop {selectedCategory.replace('-', ' ')} files here, or <span style={{ color: 'var(--primary-orange)' }}>Browse</span>
              </>
            )}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '4px' }}>
            Supported formats: PDF, JPG, PNG &bull; Max 15 MB per file
          </p>
        </div>
      </div>

      {/* Selected Files List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            Staged Files ({uploadedFiles.length})
            {isLoadingExisting && <span style={{ fontSize: '12px', color: 'var(--secondary-text)', marginLeft: '8px' }}>Loading saved files...</span>}
          </h2>
          {uploadedFiles.length > 0 && isDemoMode && (
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

              const statusBadge =
                file.status?.includes('Verified')
                  ? 'badge-success'
                  : file.status?.includes('Ready')
                    ? 'badge-warning'
                    : file.status?.includes('Failed')
                      ? 'badge-danger'
                      : 'badge-neutral';

              return (
                <div
                  key={file.id || file._id}
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
                          {formatSize(file.size)} &bull; {file.pages || 1} {(file.pages || 1) === 1 ? 'page' : 'pages'}
                        </span>
                        {file.studentName && (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                            &bull; Student: {file.studentName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                    <span className={`badge ${statusBadge}`} style={{ fontSize: '11px' }}>
                      {file.status}
                    </span>
                    <button
                      type="button"
                      className="btn-icon-only danger"
                      onClick={() => handleRemoveFile(file)}
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
