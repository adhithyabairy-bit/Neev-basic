import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  IconEye,
  IconAlertTriangle,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconInfo,
} from '../components/Icons';
import { processAnswerSheet, getAnswerSheetFileUrl } from '../services/answerSheetService';

export default function ExtractPreview({
  extractionData = [],
  onUpdateExtraction,
  uploadedFiles = [],
  studentProfile = { name: '' },
  activeAnswerSheet = null,
  isDemoMode = false,
  onAnswerSheetUpdated,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'needs-review'
  const [isProcessing, setIsProcessing] = useState(false);
  const [processNotice, setProcessNotice] = useState(null);
  const [processError, setProcessError] = useState(null);

  // Derive active sheet from prop or first uploaded file with a backend _id
  const targetSheet = activeAnswerSheet || uploadedFiles.find((f) => f.rawSheet)?.rawSheet || (uploadedFiles[0]?._id ? uploadedFiles[0] : null);

  // Compute total pages from extraction items or active sheet metadata
  const totalPages = Math.max(
    1,
    targetSheet?.pageCount || 1,
    ...extractionData.map((q) => q.pageNumber || q.page || 1)
  );

  const handleTriggerOcr = async () => {
    if (isDemoMode || !targetSheet?._id) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessNotice('Simulated OCR re-scan completed.');
        setTimeout(() => setProcessNotice(null), 3000);
      }, 800);
      return;
    }

    setIsProcessing(true);
    setProcessNotice('Running real OCR extraction engine on answer sheet...');
    setProcessError(null);

    try {
      const updatedSheet = await processAnswerSheet(targetSheet._id);
      if (updatedSheet?.answers) {
        onUpdateExtraction(updatedSheet.answers);
        if (onAnswerSheetUpdated) {
          onAnswerSheetUpdated(updatedSheet);
        }
        setProcessNotice('Real OCR extraction complete. Organized into reviewable entries.');
      }
    } catch (err) {
      console.error('[ExtractPreview] Extraction error:', err);
      setProcessError(err.message || 'Failed to extract text from answer sheet.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessNotice(null), 5000);
    }
  };

  const handleToggleVerify = (questionId) => {
    const updated = extractionData.map((q) => {
      const qId = q._id || q.id;
      if (qId === questionId) {
        return {
          ...q,
          status: q.status === 'Verified' ? 'Needs Review' : 'Verified',
        };
      }
      return q;
    });
    onUpdateExtraction(updated);
  };

  // Filter questions for the current page and filterMode
  const pageQuestions = extractionData.filter((q) => {
    const qPage = q.pageNumber || q.page || 1;
    const matchesPage = qPage === currentPage;
    if (filterMode === 'needs-review') {
      return matchesPage && q.status === 'Needs Review';
    }
    return matchesPage;
  });

  const totalNeedsReview = extractionData.filter((q) => q.status === 'Needs Review').length;

  return (
    <div className="section-container" aria-label="Extract and Preview Section">
      <PageHeader
        title="Extract & Preview OCR Answers"
        subtitle="Inspect automated handwritten answer transcription, confidence scores, and uncertain steps."
        badgeText="Inspection Phase"
      />

      <div className="alert alert-notice" role="status">
        <IconInfo size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>AI OCR Pipeline: </strong>
          <span>
            {isDemoMode
              ? 'Displaying high-fidelity demonstration extraction data. In production, Neev uses computer vision and OCR to parse handwriting.'
              : 'Real OCR pipeline running. Text-based PDFs use direct native extraction; image scans and handwriting use Tesseract OCR.'}
          </span>
        </div>
      </div>

      {processNotice && (
        <div className="alert alert-success" role="status">
          <IconCheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{processNotice}</span>
        </div>
      )}

      {processError && (
        <div className="alert alert-danger" role="alert">
          <IconAlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{processError}</span>
        </div>
      )}

      {uploadedFiles.length === 0 ? (
        <EmptyState
          icon={<IconEye size={28} />}
          title="No uploaded documents to extract"
          description="Go back to Step 2 and upload at least one student answer sheet to preview extracted questions and answers."
        />
      ) : extractionData.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <EmptyState
            icon={<IconEye size={28} />}
            title="Extraction Ready to Process"
            description="Answer sheet is stored and ready for text extraction. Click below to initiate OCR."
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={handleTriggerOcr}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing Document...' : 'Run OCR Extraction'}
          </button>
        </div>
      ) : (
        <>
          {/* Controls & Pagination Toolbar */}
          <div
            className="card"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterMode('all')}
              >
                All Questions ({extractionData.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterMode === 'needs-review' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterMode('needs-review')}
              >
                Needs Review ({totalNeedsReview})
              </button>
              <span className="badge badge-orange" style={{ alignSelf: 'center' }}>
                Student: {studentProfile?.name || targetSheet?.studentName || 'Unassigned'}
              </span>
            </div>

            {/* Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous scanned page"
              >
                <IconChevronLeft size={16} />
                <span>Prev Page</span>
              </button>

              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next scanned page"
              >
                <span>Next Page</span>
                <IconChevronRight size={16} />
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleTriggerOcr}
                disabled={isProcessing}
                title="Re-run extraction on this answer sheet"
              >
                {isProcessing ? 'Extracting...' : 'Re-process OCR'}
              </button>
            </div>
          </div>

          {/* Document & Question Preview Split Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {/* Scanned Document View Panel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h2 className="card-title" style={{ fontSize: 'var(--font-size-md)' }}>
                  Scanned Document View &bull; Page {currentPage}
                </h2>
                <span className="badge badge-neutral">
                  {targetSheet?.originalFileName || studentProfile?.name ? `${studentProfile.name || targetSheet.studentName} - Copy` : 'Document View'}
                </span>
              </div>

              {/* Styled Document / Scan Sheet Preview */}
              <div
                style={{
                  flex: 1,
                  minHeight: '420px',
                  backgroundColor: '#FFFDF9',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-5)',
                  boxShadow: 'inset 0 1px 3px rgba(35, 27, 22, 0.05)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.7',
                  position: 'relative',
                  overflowY: 'auto',
                }}
              >
                <div style={{ borderBottom: '1px dashed #E2C7B5', paddingBottom: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', color: '#6F6259' }}>
                  <span>{targetSheet?.originalFileName || 'EXAMINATION ANSWER SHEET'}</span>
                  <span>PAGE {currentPage} OF {totalPages}</span>
                </div>

                {/* Show Page Questions or Raw Text */}
                {pageQuestions.length > 0 ? (
                  pageQuestions.map((q, idx) => (
                    <div
                      key={q._id || q.id || idx}
                      style={{
                        border: '2px dashed var(--primary-orange)',
                        backgroundColor: 'rgba(242, 107, 29, 0.06)',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="badge badge-orange">
                          OCR Box: {q.questionNumber || q.number || `Q${idx + 1}`}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                          Confidence: {q.confidence !== null && q.confidence !== undefined ? `${q.confidence}%` : 'Direct Text'}
                        </span>
                      </div>
                      <p style={{ color: '#231B16', fontWeight: 'bold' }}>
                        {q.prompt || `Question ${q.questionNumber || idx + 1}`}
                      </p>
                      <p style={{ color: '#8C5B14', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                        {q.correctedText || q.rawExtractedText || q.extractedAnswer || '(No text detected)'}
                      </p>
                      {q.uncertainParts && q.uncertainParts.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <span style={{ backgroundColor: '#FDE8E8', color: '#D9383A', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                            &larr; {q.uncertainParts.join('; ')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--secondary-text)', textAlign: 'center', padding: 'var(--space-8)' }}>
                    No extracted questions found on Page {currentPage}.
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Answer Details Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)' }}>
                Extracted Answers on Page {currentPage} ({pageQuestions.length})
              </h2>

              {pageQuestions.length === 0 ? (
                <EmptyState
                  title="No questions match filter"
                  description="All questions on this page are either verified or on another page."
                />
              ) : (
                pageQuestions.map((q) => {
                  const isNeedsReview = q.status === 'Needs Review';
                  const qId = q._id || q.id;

                  return (
                    <div
                      key={qId}
                      className="card"
                      style={{
                        padding: 'var(--space-4)',
                        borderColor: isNeedsReview ? 'var(--primary-orange)' : 'var(--border-color)',
                        backgroundColor: isNeedsReview ? 'var(--card-highlight-bg)' : '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--dark-orange)', marginRight: '6px' }}>
                            {q.questionNumber || q.number}
                          </span>
                          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)' }}>
                            {q.prompt || `Question ${q.questionNumber || ''}`}
                          </span>
                        </div>
                        <span
                          className={`badge ${isNeedsReview ? 'badge-warning' : 'badge-success'}`}
                          style={{ flexShrink: 0 }}
                        >
                          {isNeedsReview ? (
                            <>
                              <IconAlertTriangle size={12} />
                              <span>Needs Review</span>
                            </>
                          ) : (
                            <>
                              <IconCheckCircle size={12} />
                              <span>Verified</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Transcribed Text Box */}
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          fontSize: 'var(--font-size-sm)',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          marginBottom: 'var(--space-3)',
                          color: 'var(--main-text)',
                        }}
                      >
                        {q.correctedText || q.rawExtractedText || q.extractedAnswer || '(No text)'}
                      </div>

                      {/* Uncertainties if any */}
                      {q.uncertainParts && q.uncertainParts.length > 0 && (
                        <div
                          style={{
                            backgroundColor: 'var(--danger-light)',
                            border: '1px solid var(--danger-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 10px',
                            marginBottom: 'var(--space-3)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--danger-dark)',
                          }}
                        >
                          <strong>Uncertain Area: </strong>
                          {q.uncertainParts.join(', ')}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="badge badge-neutral">
                            OCR Confidence: {q.confidence !== null && q.confidence !== undefined ? `${q.confidence}%` : 'Direct Text'}
                          </span>
                          <span className="badge badge-neutral">
                            Marks: {q.awardedMarks !== undefined ? q.awardedMarks : q.detectedMarks || 0}/{q.maxMarks || 5}
                          </span>
                        </div>

                        <button
                          type="button"
                          className={`btn btn-sm ${isNeedsReview ? 'btn-secondary' : 'btn-outline'}`}
                          onClick={() => handleToggleVerify(qId)}
                        >
                          {isNeedsReview ? 'Mark as Verified' : 'Flag for Review'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
