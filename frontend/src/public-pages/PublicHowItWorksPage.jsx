import React from 'react';
import PublicLayout from './PublicLayout';

export default function PublicHowItWorksPage({ onNavigate, onLaunchApp, currentUser = null }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How Neev Diagnoses Student Learning Gaps',
    description: 'A 5-step workflow for teachers to turn handwritten answer sheets into personalized remediation roadmaps.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Set Exam & Syllabus Scope',
        text: 'Specify class grade, subject, and syllabus chapters covered in the assessment.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Upload Answer Sheets & Question Paper',
        text: 'Upload phone camera photos or scanned PDF files of handwritten student answer sheets.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Review & Verify Extractions',
        text: 'Verify the transcribed answers side-by-side with original manuscript and approve transcription.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Curriculum-Grounded AI Evaluation',
        text: 'Neev evaluates student solutions against the teacher rubric and retrieves syllabus excerpts.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: 'Synthesize Gaps & Export PDFs',
        text: 'Download personalized learning roadmaps, 2-mark diagnostic practice questions, and answer keys.',
      },
    ],
  };

  return (
    <PublicLayout
      title="How It Works — 5-Step Diagnostic & Remediation Workflow"
      description="Learn how Neev turns paper answer sheets into personalized learning roadmaps in 5 straightforward teacher-guided steps."
      canonicalUrl="https://neev-basic-seven.vercel.app/how-it-works"
      structuredData={structuredData}
      activePath="/how-it-works"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
      currentUser={currentUser}
    >
      <div className="pub-container" style={{ maxWidth: '850px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="pub-hero-badge">The Neev Workflow</div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
            From Paper Answer Sheets to Targeted Remediation
          </h1>
          <p style={{ color: 'var(--pub-slate)', fontSize: '17px' }}>
            A streamlined 5-step journey built around real school workflows, minimizing teacher administrative time while maximizing diagnostic depth.
          </p>
        </div>

        <div className="pub-step-row">
          <div className="pub-step-num">1</div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
              Step 1: Define Exam Scope &amp; Select Subject
            </h3>
            <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
              Choose your enrolled class (Grade 6 - Grade 10) and subject (Mathematics, Science, English, or Social Studies). Select covered syllabus chapters and define maximum examination marks.
            </p>
          </div>
        </div>

        <div className="pub-step-row">
          <div className="pub-step-num">2</div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
              Step 2: Upload Handwritten Answer Sheets &amp; Question Paper
            </h3>
            <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
              Upload photos or scanned PDFs of student answer sheets and question papers directly from your device or phone. Fast multimodal vision parses each document within seconds.
            </p>
          </div>
        </div>

        <div className="pub-step-row">
          <div className="pub-step-num">3</div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
              Step 3: Side-by-Side Teacher Verification
            </h3>
            <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
              Inspect student handwriting alongside the digital extraction. Correct any handwritten slips or symbols with the inline editor and verify the sheet before evaluation begins.
            </p>
          </div>
        </div>

        <div className="pub-step-row">
          <div className="pub-step-num">4</div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
              Step 4: Syllabus-Grounded AI Analysis
            </h3>
            <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
              Neev retrieves relevant syllabus excerpts using semantic vector search and evaluates student working steps against your rubric. Teachers can approve or adjust suggested marks.
            </p>
          </div>
        </div>

        <div className="pub-step-row">
          <div className="pub-step-num">5</div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
              Step 5: Gap Synthesis &amp; 5 Printable PDF Reports
            </h3>
            <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
              Export 5 dedicated reports: Student Gap Analysis, Sequenced Remediation Roadmap, Syllabus Continuity Report, 2-Mark Practice Retest Paper, and the Teacher Model Solution Key.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button type="button" className="pub-btn-primary" onClick={onLaunchApp}>
            Start Your First Diagnostic Assessment &rarr;
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

