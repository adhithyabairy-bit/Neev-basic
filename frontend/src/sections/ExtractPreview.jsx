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

export default function ExtractPreview({
  extractionData = [],
  onUpdateExtraction,
  uploadedFiles = [],
  studentProfile = { name: 'Aarav Sharma' },
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'needs-review'
  const [isSimulatingOCR, setIsSimulatingOCR] = useState(false);

  const totalPages = 3;

  const handleSimulateRefresh = () => {
    setIsSimulatingOCR(true);
    setTimeout(() => {
      setIsSimulatingOCR(false);
    }, 800);
  };

  const handleToggleVerify = (questionId) => {
    const updated = extractionData.map((q) => {
      if (q.id === questionId) {
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
    const matchesPage = q.page === currentPage;
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
          <strong>AI OCR Simulation: </strong>
          <span>
            Displaying high-fidelity demonstration extraction data. In production, Neev uses computer vision to parse bounding boxes and handwriting.
          </span>
        </div>
      </div>

      {uploadedFiles.length === 0 ? (
        <EmptyState
          icon={<IconEye size={28} />}
          title="No uploaded documents to extract"
          description="Go back to Step 2 and stage at least one student answer sheet to preview extracted questions and answers."
        />
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
                Student: {studentProfile?.name || 'Aarav Sharma'}
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
                onClick={handleSimulateRefresh}
                title="Re-run extraction demonstration"
              >
                {isSimulatingOCR ? 'Extracting...' : 'Re-scan Page'}
              </button>
            </div>
          </div>

          {/* Document & Question Preview Split Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {/* Scanned Document Simulation Panel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h2 className="card-title" style={{ fontSize: 'var(--font-size-md)' }}>
                  Scanned Document View &bull; Page {currentPage}
                </h2>
                <span className="badge badge-neutral">Aarav Sharma - Student Copy</span>
              </div>

              {/* Styled Mock Scan Sheet */}
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
                  <span>EXAMINATION ANSWER SHEET</span>
                  <span>PAGE {currentPage}</span>
                </div>

                {currentPage === 1 && (
                  <div>
                    <div style={{ border: '2px dashed var(--primary-orange)', backgroundColor: 'rgba(242, 107, 29, 0.06)', padding: '10px', borderRadius: '6px', marginBottom: '18px' }}>
                      <span className="badge badge-orange" style={{ marginBottom: '6px' }}>OCR Bounding Box: Q1</span>
                      <p style={{ color: '#231B16', fontWeight: 'bold' }}>Q1. Solve for x: 3x - 7 = 14</p>
                      <p style={{ color: '#8C5B14', marginTop: '4px' }}>
                        3x = 14 - 7  <span style={{ backgroundColor: '#FDE8E8', color: '#D9383A', padding: '1px 4px', borderRadius: '3px' }}>&larr; Uncertain Sign Detected</span><br />
                        3x = 7<br />
                        x = 7/3
                      </p>
                    </div>

                    <div style={{ border: '2px dashed #B7791F', backgroundColor: 'rgba(183, 121, 31, 0.06)', padding: '10px', borderRadius: '6px' }}>
                      <span className="badge badge-warning" style={{ marginBottom: '6px' }}>OCR Bounding Box: Q2</span>
                      <p style={{ color: '#231B16', fontWeight: 'bold' }}>Q2. Simplify: -5 - (-12) + 3</p>
                      <p style={{ color: '#8C5B14', marginTop: '4px' }}>
                        = -5 - 12 + 3<br />
                        = -17 + 3<br />
                        = -14
                      </p>
                    </div>
                  </div>
                )}

                {currentPage === 2 && (
                  <div>
                    <div style={{ border: '2px dashed var(--primary-orange)', backgroundColor: 'rgba(242, 107, 29, 0.06)', padding: '10px', borderRadius: '6px', marginBottom: '18px' }}>
                      <span className="badge badge-orange" style={{ marginBottom: '6px' }}>OCR Bounding Box: Q3</span>
                      <p style={{ color: '#231B16', fontWeight: 'bold' }}>Q3. Solve: 5(y - 2) = 2y + 8</p>
                      <p style={{ color: '#8C5B14', marginTop: '4px' }}>
                        5y - 2 = 2y + 8  <span style={{ backgroundColor: '#FDE8E8', color: '#D9383A', padding: '1px 4px', borderRadius: '3px' }}>&larr; Bracket Error</span><br />
                        3y = 10<br />
                        y = 10/3
                      </p>
                    </div>

                    <div style={{ border: '2px solid #B7E4C7', backgroundColor: 'rgba(30, 142, 90, 0.05)', padding: '10px', borderRadius: '6px' }}>
                      <span className="badge badge-success" style={{ marginBottom: '6px' }}>Verified OCR Box: Q4</span>
                      <p style={{ color: '#231B16', fontWeight: 'bold' }}>Q4. Perimeter word problem</p>
                      <p style={{ color: '#156B43', marginTop: '4px' }}>
                        2(2w + 4) = 48 &rarr; 4w = 40 &rarr; w = 10, l = 14
                      </p>
                    </div>
                  </div>
                )}

                {currentPage === 3 && (
                  <div>
                    <div style={{ border: '2px solid #B7E4C7', backgroundColor: 'rgba(30, 142, 90, 0.05)', padding: '10px', borderRadius: '6px' }}>
                      <span className="badge badge-success" style={{ marginBottom: '6px' }}>Verified OCR Box: Q5</span>
                      <p style={{ color: '#231B16', fontWeight: 'bold' }}>Q5. Evaluate: -4 * (6 - 9) / -2</p>
                      <p style={{ color: '#156B43', marginTop: '4px' }}>
                        -4 * (-3) / -2 = 12 / -2 = -6
                      </p>
                    </div>
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

                  return (
                    <div
                      key={q.id}
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
                            {q.number}
                          </span>
                          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--main-text)' }}>
                            {q.prompt}
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
                        {q.extractedAnswer}
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
                          <span className="badge badge-neutral">OCR Confidence: {q.confidence}%</span>
                          <span className="badge badge-neutral">Detected Marks: {q.detectedMarks}/{q.maxMarks}</span>
                        </div>

                        <button
                          type="button"
                          className={`btn btn-sm ${isNeedsReview ? 'btn-secondary' : 'btn-outline'}`}
                          onClick={() => handleToggleVerify(q.id)}
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
