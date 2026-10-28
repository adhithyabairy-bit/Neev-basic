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
  studentProfile = { name: 'Aarav Sharma', rollNumber: '2025-08-42', section: 'Section A' },
}) {
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  const activeStudentName = studentProfile?.name?.trim() || 'student';

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
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
    </div>
  );
}
