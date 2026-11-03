import React from 'react';
import PublicLayout from './PublicLayout';

export default function PublicAboutPage({ onNavigate, onLaunchApp }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Neev Platform',
    description: 'Learn about Neev’s mission to rebuild foundational learning competencies in Indian school classrooms through explainable diagnostic AI.',
    url: 'https://neev.app/about',
  };

  return (
    <PublicLayout
      title="About Us — Neev's Educational Mission & Philosophy"
      description="Learn about Neev: built to help Indian teachers diagnose foundational learning gaps from paper exams, protect Class 10 Board exam outcomes, and restore student confidence."
      canonicalUrl="https://neev.app/about"
      structuredData={structuredData}
      activePath="/about"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
    >
      <div className="pub-container" style={{ maxWidth: '850px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="pub-hero-badge">Our Mission</div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
            Strengthening the Foundation of Every Learner
          </h1>
          <p style={{ color: 'var(--pub-slate)', fontSize: '17px' }}>
            In Hindi and Indian languages, <em>Neev</em> means &ldquo;foundation&rdquo;. Our entire philosophy is anchored in one truth: learning difficulties in higher grades almost always stem from unaddressed foundational gaps in earlier years.
          </p>
        </div>

        <div className="pub-card" style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>
            The Reality of the Indian Classroom
          </h2>
          <p style={{ color: 'var(--pub-slate)', fontSize: '15px', lineHeight: 1.7, marginBottom: '14px' }}>
            Indian school teachers manage classrooms of 35 to 50 students. Examinations are conducted on physical paper with handwritten calculations and descriptive answers. While teachers can quickly calculate total scores, identifying which prerequisite chapter from Class 6 or 7 caused a student to stumble in Class 8 requires hours of individual diagnostic dissection.
          </p>
          <p style={{ color: 'var(--pub-slate)', fontSize: '15px', lineHeight: 1.7 }}>
            When foundational slips go undetected, they compound year after year, culminating in acute anxiety and underperformance during Class 10 Board examinations.
          </p>
        </div>

        <div className="pub-grid-2" style={{ margin: '0 0 28px' }}>
          <div className="pub-card">
            <h3 className="pub-card-title">Teacher as the Decision Maker</h3>
            <p className="pub-card-text">
              We reject black-box automated grading. Neev is an intelligent assistant that handles the mechanical labor of OCR handwriting transcription and curriculum cross-referencing, while leaving pedagogical authority firmly in the hands of the teacher.
            </p>
          </div>

          <div className="pub-card">
            <h3 className="pub-card-title">Explainable Diagnostics</h3>
            <p className="pub-card-text">
              Every diagnosis is backed by concrete student answer quotes and verifiable NCERT chapter references. We never output arbitrary numbers or pretend a rule-based system is a black-box neural net.
            </p>
          </div>
        </div>

        <div className="pub-card" style={{ textAlign: 'center', backgroundColor: '#FDFBF7' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>
            Ready to Empower Your Classroom?
          </h3>
          <p style={{ color: 'var(--pub-slate)', fontSize: '15px', marginBottom: '20px' }}>
            Join educators across India using Neev to diagnose learning gaps and produce actionable student roadmaps.
          </p>
          <button type="button" className="pub-btn-primary" onClick={onLaunchApp}>
            Launch Teacher Workspace &rarr;
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

