import React from 'react';
import PublicLayout from './PublicLayout';

export default function PublicFeaturesPage({ onNavigate, onLaunchApp, currentUser = null }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Neev Platform Features',
    description: 'Explore the full capabilities of Neev: handwriting vision OCR, teacher verification, syllabus-grounded AI evaluation, gap synthesis, and 5 distinct PDF reports.',
    url: 'https://neev-basic-seven.vercel.app/features',
  };

  return (
    <PublicLayout
      title="Platform Features — Handwriting OCR, Teacher Verification & RAG Diagnostics"
      description="Explore Neev's features: multimodal handwriting extraction, teacher-in-the-loop verification, syllabus-grounded AI evaluation, root gap synthesis, and 5 PDF reports."
      canonicalUrl="https://neev-basic-seven.vercel.app/features"
      structuredData={structuredData}
      activePath="/features"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
      currentUser={currentUser}
    >
      <div className="pub-container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="pub-hero-badge">Comprehensive Feature Suite</div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
            Built for Rigorous Academic Assessment
          </h1>
          <p style={{ color: 'var(--pub-slate)', maxWidth: '680px', margin: '0 auto', fontSize: '17px' }}>
            Every tool in Neev is engineered to respect the teacher’s domain expertise while automating the heavy lifting of handwriting transcription and prerequisite curriculum mapping.
          </p>
        </div>

        <div className="pub-grid-2">
          <div className="pub-card">
            <h3 className="pub-card-title">1. Multimodal Handwriting Extraction</h3>
            <p className="pub-card-text">
              High-resolution vision processing extracts student handwritten answers from camera snapshots or scanned PDFs. It accurately segments student work question-by-question while preserving raw OCR text alongside teacher edits.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-title">2. Side-by-Side Teacher Verification</div>
            <p className="pub-card-text">
              Guarantees zero AI hallucination by placing the digitized text right next to the original student manuscript. Teachers can edit transcription slips or re-extract questions in seconds with one click.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-title">3. Syllabus-Grounded RAG Engine</div>
            <p className="pub-card-text">
              Vector retrieval matches each question against relevant textbook passages and the teacher's marking criteria. The AI evaluator only scores answers backed by factual curriculum excerpts.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-title">4. Root Misconception Synthesizer</div>
            <p className="pub-card-text">
              Groups repeated student slips into root misconceptions. Identifies previous class delayed chapters (e.g. Class 7 Chapter 2) and calculates downstream affected chapters up to Class 10.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-title">5. 5 Dedicated Printable PDF Reports</div>
            <p className="pub-card-text">
              Export client-side PDF documents formatted with tables, Telugu and Hindi script transliteration, headers, footers, and page numbers:
              Gap Analysis, Remediation Roadmap, Syllabus Continuity, 2-Mark Practice Paper, and Teacher Answer Key.
            </p>
          </div>

          <div className="pub-card">
            <div className="pub-card-title">6. Zero-Trust Teacher Data Isolation</div>
            <p className="pub-card-text">
              Every class, assessment, answer sheet, and private syllabus document is cryptographically partitioned to the authenticated teacher. Complete privacy and adherence to institutional data policies.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button type="button" className="pub-btn-primary" onClick={onLaunchApp}>
            Try Neev Features Now &rarr;
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

