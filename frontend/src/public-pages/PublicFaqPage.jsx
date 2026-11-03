import React from 'react';
import PublicLayout from './PublicLayout';

export default function PublicFaqPage({ onNavigate, onLaunchApp }) {
  const faqs = [
    {
      q: 'How does handwriting vision OCR work on student answer sheets?',
      a: 'Neev uses state-of-the-art multimodal vision AI to transcribe handwritten student work directly from photos or scanned PDFs. It preserves exact student working steps, fractions, equations, and diagrams question-by-question.',
    },
    {
      q: 'Can the teacher review or correct AI extractions?',
      a: 'Yes. Neev requires teacher-in-the-loop verification. A side-by-side verification interface allows you to view the student’s original handwritten image next to the extracted text, make any manual corrections, and formally verify the document before AI grading or gap analysis can run.',
    },
    {
      q: 'How does Neev prevent AI hallucinations and fake marks?',
      a: 'Unlike generic chatbots, Neev employs Curriculum-Grounded RAG (Retrieval-Augmented Generation). The AI evaluator is constrained strictly to the exam question prompt, the teacher’s marking rubric, and retrieved textbook passages. If evidence is insufficient, it explicitly flags the evaluation for teacher review.',
    },
    {
      q: 'What is root misconception grouping?',
      a: 'When students make calculation or reasoning mistakes across multiple questions, Neev groups related slips into a single root misconception (e.g. sign drops across an equals sign grouped under algebraic transposition). It traces this back to the prerequisite grade level (e.g. Class 7 Chapter 2) where the concept was first introduced.',
    },
    {
      q: 'What PDF reports are generated?',
      a: 'Neev produces 5 distinct, printable PDF documents: 1) Student Learning Gap Analysis Report, 2) Personalized Remediation Roadmap, 3) Syllabus Continuity & Prerequisite Impact Report, 4) 2-Mark Diagnostic Practice Paper for Student, and 5) Teacher Model Solution Key.',
    },
    {
      q: 'Is student assessment data safe and private?',
      a: 'Yes. Student answer sheets and assessment records are cryptographically isolated to the authenticated teacher account. Neev never sells student data or uses private student work to train public AI models.',
    },
    {
      q: 'What curriculum and grades are supported?',
      a: 'Neev supports CBSE and State Board curriculum for Mathematics, Science, English Language, and Social Studies across Grades 6 through 10, with downstream risk mapping up to Class 10 Board exams.',
    },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };

  return (
    <PublicLayout
      title="Frequently Asked Questions — Neev Platform & Teacher Diagnostics"
      description="Answers to common questions about Neev: handwriting OCR accuracy, teacher verification, curriculum grounding, student data privacy, and supported subjects."
      canonicalUrl="https://neev.app/faq"
      structuredData={structuredData}
      activePath="/faq"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
    >
      <div className="pub-container" style={{ maxWidth: '850px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="pub-hero-badge">Got Questions?</div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
            Frequently Asked Questions
          </h1>
          <p style={{ color: 'var(--pub-slate)', fontSize: '17px' }}>
            Everything you need to know about Neev’s diagnostic methodology, handwriting OCR, teacher verification, and privacy safeguards.
          </p>
        </div>

        <div>
          {faqs.map((f, idx) => (
            <div key={idx} className="pub-faq-item">
              <h3 className="pub-faq-q">{f.q}</h3>
              <p className="pub-faq-a">{f.a}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '15px', color: 'var(--pub-slate)', marginBottom: '16px' }}>
            Have a question that is not covered here?
          </p>
          <button type="button" className="pub-btn-secondary" onClick={() => onNavigate('/contact')}>
            Contact Support &rarr;
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

