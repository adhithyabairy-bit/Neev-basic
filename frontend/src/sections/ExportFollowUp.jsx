import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import {
  IconDownload,
  IconCheckCircle,
  IconFileText,
  IconUser,
} from '../components/Icons';
import { generatePdfFilename, sanitizeStudentName } from '../utils/filename';
import { generateGapReportPdfBlob, generateQuestionsPdfBlob } from '../utils/pdfGenerator';

export default function ExportFollowUp({
  syllabusData,
  gapsData = [],
  roadmapData = [],
  testQuestions = [],
  studentProfile = { name: '', rollNumber: '', section: 'Section A' },
}) {
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  const activeStudentName = studentProfile?.name?.trim() || 'Student';

  // Client-side real PDF blob document exporter
  const triggerDownload = (filename, blobOrContent, mimeType = 'application/pdf') => {
    const blob =
      blobOrContent instanceof Blob
        ? blobOrContent
        : new Blob([blobOrContent], { type: mimeType });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Downloaded "${filename}" successfully.`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  // Generate genuine PDF gap analysis report named `studentname_gap.pdf`
  const handleDownloadStudentReport = () => {
    const filename = generatePdfFilename(activeStudentName, 'gap');
    const pdfBlob = generateGapReportPdfBlob({
      studentName: activeStudentName,
      examName: syllabusData.examName || 'Assessment',
      className: syllabusData.selectedClass || 'Grade 8',
      subject: syllabusData.selectedSubject || 'Mathematics',
      gapsData,
      roadmapData,
    });
    triggerDownload(filename, pdfBlob);
  };

  // Generate genuine PDF practice questions paper named `studentname_questions.pdf`
  const handleDownloadPracticeTest = () => {
    const filename = generatePdfFilename(activeStudentName, 'questions');
    const pdfBlob = generateQuestionsPdfBlob({
      studentName: activeStudentName,
      examName: syllabusData.examName || 'Diagnostic Retest',
      className: syllabusData.selectedClass || 'Grade 8',
      subject: syllabusData.selectedSubject || 'Mathematics',
      testQuestions,
    });
    triggerDownload(filename, pdfBlob);
  };

  // Download personalized roadmap PDF
  const handleDownloadRoadmap = () => {
    const slug = sanitizeStudentName(activeStudentName, 'student');
    const filename = `${slug}_roadmap.pdf`;
    const pdfBlob = generateGapReportPdfBlob({
      studentName: activeStudentName,
      examName: syllabusData.examName || 'Assessment',
      className: syllabusData.selectedClass || 'Grade 8',
      subject: syllabusData.selectedSubject || 'Mathematics',
      gapsData,
      roadmapData,
    });
    triggerDownload(filename, pdfBlob);
  };

  // Download teacher marking key PDF
  const handleDownloadAnswerKey = () => {
    const filename = 'teacher_marking_key.pdf';
    const pdfBlob = generateQuestionsPdfBlob({
      studentName: `Teacher Reference Key (${activeStudentName})`,
      examName: syllabusData.examName || 'Diagnostic Retest',
      className: syllabusData.selectedClass || 'Grade 8',
      subject: syllabusData.selectedSubject || 'Mathematics',
      testQuestions,
    });
    triggerDownload(filename, pdfBlob);
  };

  const gapReportFilename = generatePdfFilename(activeStudentName, 'gap');
  const questionsFilename = generatePdfFilename(activeStudentName, 'questions');

  const materialCards = [
    {
      id: 'mat-1',
      title: 'Student Gap Analysis Report',
      description: 'Prerequisite gaps, rubric evidence, and pedagogical recommendations.',
      format: 'PDF Document',
      filenameHint: gapReportFilename,
      action: handleDownloadStudentReport,
    },
    {
      id: 'mat-2',
      title: 'Personalized Learning Roadmap',
      description: 'Sequenced step-by-step remediation guide with worked examples.',
      format: 'PDF Document',
      filenameHint: `${sanitizeStudentName(activeStudentName)}_roadmap.pdf`,
      action: handleDownloadRoadmap,
    },
    {
      id: 'mat-3',
      title: 'Diagnostic Practice Questions',
      description: 'Targeted assessment questions built specifically to test resolution of prerequisite gaps.',
      format: 'PDF Document',
      filenameHint: questionsFilename,
      action: handleDownloadPracticeTest,
    },
    {
      id: 'mat-4',
      title: 'Teacher Answer Key & Marking Guide',
      description: 'Step-by-step solutions with mark allocations and common misconception warnings.',
      format: 'PDF Document',
      filenameHint: 'teacher_marking_key.pdf',
      action: handleDownloadAnswerKey,
    },
  ];

  return (
    <div className="section-container" aria-label="Export Section">
      <PageHeader
        title="Export"
        subtitle="Download personalized learning deliverables formatted with student-specific filenames."
        badgeText="Deliverables"
      />

      {downloadSuccess && (
        <div className="alert alert-success" role="status">
          <IconCheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Downloadable Educational Deliverables Section */}
      <section className="card" aria-labelledby="downloads-heading">
        <div className="card-header">
          <div>
            <h2 id="downloads-heading" className="card-title">Downloadable Educational Deliverables</h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
              Client-side genuine PDF documents formatted for student <strong>{activeStudentName}</strong>
              {studentProfile?.rollNumber ? ` (${studentProfile.rollNumber})` : ''}.
            </p>
          </div>
          <span className="badge badge-orange">
            <IconUser size={12} />
            <span>{activeStudentName}</span>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'var(--space-4)' }}>
          {materialCards.map((card) => (
            <div
              key={card.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge badge-orange">{card.format}</span>
                  <IconFileText size={18} color="var(--primary-orange)" />
                </div>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)', marginBottom: '4px' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', lineHeight: 1.4, marginBottom: 'var(--space-3)' }}>
                  {card.description}
                </p>
                {card.filenameHint && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}>Filename: </span>
                    <code style={{ fontSize: '11.5px', color: 'var(--dark-orange)', backgroundColor: 'var(--light-orange-subtle)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      {card.filenameHint}
                    </code>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={card.action}
                style={{ width: '100%', justifyContent: 'center' }}
                aria-label={`Download ${card.title} as ${card.filenameHint}`}
              >
                <IconDownload size={14} />
                <span>Download PDF</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Foundational Textbook Chapters to Study Section */}
      {gapsData.some((g) => g.prerequisiteLesson) && (
        <section className="card" style={{ marginTop: 'var(--space-6)' }} aria-labelledby="prereq-chapters-heading">
          <div className="card-header">
            <div>
              <h2 id="prereq-chapters-heading" className="card-title">Foundational Curriculum Chapters (Previous Grades)</h2>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)' }}>
                Targeted previous class chapters retrieved from database knowledge base to remediate identified gaps.
              </p>
            </div>
            <span className="badge badge-orange">NCERT Textbook Chapters</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {gapsData
              .filter((gap) => gap.prerequisiteLesson)
              .map((gap, idx) => {
                const prereq = gap.prerequisiteLesson;
                const futureLessons = gap.futureLessonsAffected || [];
                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className="badge badge-orange">{prereq.grade}</span>
                          <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}>Grounded in database retrieval</span>
                        </div>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'bold', color: 'var(--main-text)' }}>
                          {prereq.chapterName}
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', marginTop: '2px' }}>
                          <strong>Core Concept:</strong> {prereq.concept}
                        </p>
                      </div>

                      <a
                        href={prereq.pdfUrl || `/curriculum/${encodeURIComponent(prereq.fileName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      >
                        <IconDownload size={14} />
                        <span>Download Chapter PDF</span>
                      </a>
                    </div>

                    {futureLessons.length > 0 && (
                      <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9A3412' }}>
                          Downstream Future Grade Lessons Protected:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {futureLessons.map((fut, fIdx) => (
                            <span key={fIdx} className="badge badge-warning" style={{ fontSize: '10px' }}>
                              {fut.grade}: {fut.lessonName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
