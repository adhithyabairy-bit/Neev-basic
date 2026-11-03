import React from 'react';
import PublicLayout from './PublicLayout';

export default function PublicHomePage({ onNavigate, onLaunchApp }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalApplication',
    name: 'Neev',
    description: 'Teacher platform diagnosing foundational learning gaps from handwritten student answer sheets and generating NCERT-aligned remediation roadmaps.',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    educationalLevel: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
    provider: {
      '@type': 'Organization',
      name: 'Neev Educational Technologies',
      url: 'https://neev.app',
    },
  };

  return (
    <PublicLayout
      title="Neev — AI-Powered Learning Gap Analysis Platform"
      description="Neev digitizes physical student answer sheets, detects prerequisite conceptual learning gaps from earlier grades, and generates personalized remediation roadmaps grounded in NCERT syllabus."
      canonicalUrl="https://neev.app/"
      structuredData={structuredData}
      activePath="/"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
    >
      <section className="pub-hero">
        <div className="pub-hero-badge">NCERT &amp; State Board Aligned &bull; Grades 6 - 10</div>
        <h1 className="pub-hero-title">
          Diagnose Root Learning Gaps from <span>Handwritten Student Work</span>
        </h1>
        <p className="pub-hero-desc">
          Neev bridges the gap between physical classroom assessments and actionable remediation.
          Digitize handwritten answer sheets, verify extractions with teacher-in-the-loop control,
          and uncover foundational prerequisite gaps from earlier grades.
        </p>
        <div className="pub-hero-cta-group">
          <button type="button" className="pub-btn-primary" onClick={onLaunchApp}>
            Launch Teacher Workspace &rarr;
          </button>
          <button type="button" className="pub-btn-secondary" onClick={() => onNavigate('/how-it-works')}>
            See How It Works
          </button>
        </div>
      </section>

      <div className="pub-container">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Built for the Real Indian Classroom
          </h2>
          <p style={{ color: 'var(--pub-muted)', maxWidth: '640px', margin: '8px auto 0' }}>
            Designed around pen-and-paper examinations, teacher pedagogical authority, and strict curriculum continuity.
          </p>
        </div>

        <div className="pub-grid-3">
          <div className="pub-card">
            <div className="pub-card-icon">1</div>
            <h3 className="pub-card-title">Handwriting Vision OCR</h3>
            <p className="pub-card-text">
              Transcribe physical, handwritten student answer sheets and question papers directly from phone camera photos or scanned PDFs with 100% verbatim fidelity.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-icon">2</div>
            <h3 className="pub-card-title">Teacher-in-the-Loop Control</h3>
            <p className="pub-card-text">
              Side-by-side verification interface allows educators to inspect, edit, and confirm OCR transcriptions before any AI evaluation runs. The teacher retains final authority.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-icon">3</div>
            <h3 className="pub-card-title">Curriculum-Grounded RAG</h3>
            <p className="pub-card-text">
              Evaluates student working steps strictly against the question rubric and official textbook passages. No generic AI hallucinated marks or ungrounded claims.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-icon">4</div>
            <h3 className="pub-card-title">Root Misconception Grouping</h3>
            <p className="pub-card-text">
              Synthesizes student slips into actionable root conceptual gaps, identifying which previous grade lesson (e.g. Class 7 equation balancing) caused the error in Class 8.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-icon">5</div>
            <h3 className="pub-card-title">Class 10 Board Exam Protection</h3>
            <p className="pub-card-text">
              Maps downstream curriculum risk up to Class 10 Board examinations, preventing compounding learning loss across subsequent grades.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-icon">6</div>
            <h3 className="pub-card-title">5 Dedicated Printable Reports</h3>
            <p className="pub-card-text">
              Generates genuine, multi-page PDF documents: Student Gap Analysis, Personalized Roadmap, Syllabus Continuity, 2-Mark Practice Paper, and Teacher Answer Key.
            </p>
          </div>
        </div>

        {/* Section: AEO Direct Answer Block */}
        <div className="pub-card" style={{ marginTop: '48px', backgroundColor: '#FDFBF7', border: '1px solid #E4DEC8' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>
            What is Neev and how does it diagnose student learning gaps?
          </h3>
          <p style={{ color: 'var(--pub-slate)', fontSize: '15px', lineHeight: 1.7 }}>
            Neev is an educational diagnostic platform that identifies foundational prerequisite weaknesses from student examination answer sheets. Unlike traditional grading software that simply records raw percentages, Neev traces incorrect student steps back to prerequisite topics from previous grades (e.g. an incorrect transposition in Class 8 algebra traced to a Class 7 integer sign misconception). Teachers receive an explainable learning roadmap and targeted 2-mark diagnostic practice papers to rebuild core competencies.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

