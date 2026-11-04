import React, { useEffect } from 'react';
import PublicLayout from './PublicLayout';
import ContactSection from './ContactSection';

export default function PublicHomePage({ onNavigate, onLaunchApp, activeSection = '/' }) {
  useEffect(() => {
    let targetId = '';
    if (typeof window !== 'undefined' && window.location.hash) {
      targetId = window.location.hash.replace('#', '');
    } else if (activeSection === '/features') {
      targetId = 'features';
    } else if (activeSection === '/how-it-works') {
      targetId = 'how-it-works';
    } else if (activeSection === '/curriculum-coverage') {
      targetId = 'curriculum';
    } else if (activeSection === '/faq') {
      targetId = 'faq';
    } else if (activeSection === '/about') {
      targetId = 'about';
    } else if (activeSection === '/contact') {
      targetId = 'contact';
    }

    if (targetId) {
      const timer = setTimeout(() => {
        const elem = document.getElementById(targetId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

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
      a: 'Neev is NCERT-aligned across Mathematics, Science, English Language, and Social Studies for Grades 6 through 10, with downstream risk mapping up to Class 10 Board exams.',
    },
  ];

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
      url: 'https://neev-basic-seven.vercel.app',
    },
  };

  return (
    <PublicLayout
      title="Neev — AI-Powered Learning Gap Analysis Platform"
      description="Neev digitizes physical student answer sheets, detects prerequisite conceptual learning gaps from earlier grades, and generates personalized remediation roadmaps grounded in NCERT syllabus."
      canonicalUrl="https://neev-basic-seven.vercel.app/"
      structuredData={structuredData}
      activePath={activeSection}
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
    >
      {/* 1. HERO SECTION */}
      <section id="hero" className="pub-hero" style={{ scrollMarginTop: '85px' }}>
        <div className="pub-hero-badge">NCERT-Aligned &bull; Grades 6 - 10</div>
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
          <button
            type="button"
            className="pub-btn-secondary"
            onClick={() => {
              const elem = document.getElementById('how-it-works');
              if (elem) elem.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            See How It Works
          </button>
        </div>
      </section>

      <div className="pub-container">
        {/* 2. OVERVIEW SECTION */}
        <section id="overview" className="pub-section">
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

          {/* Direct Answer Block */}
          <div className="pub-card" style={{ marginTop: '36px', backgroundColor: '#FDFBF7', border: '1px solid #E4DEC8' }}>
            <h3 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '10px' }}>
              What is Neev and how does it diagnose student learning gaps?
            </h3>
            <p style={{ color: 'var(--pub-slate)', fontSize: '15px', lineHeight: 1.7 }}>
              Neev is an educational diagnostic platform that identifies foundational prerequisite weaknesses from student examination answer sheets. Unlike traditional grading software that simply records raw percentages, Neev traces incorrect student steps back to prerequisite topics from previous grades (e.g. an incorrect transposition in Class 8 algebra traced to a Class 7 integer sign misconception). Teachers receive an explainable learning roadmap and targeted 2-mark diagnostic practice papers to rebuild core competencies.
            </p>
          </div>
        </section>

        {/* 3. FEATURES SECTION */}
        <section id="features" className="pub-section">
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="pub-hero-badge">Comprehensive Feature Suite</div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
              Built for Rigorous Academic Assessment
            </h2>
            <p style={{ color: 'var(--pub-slate)', maxWidth: '680px', margin: '0 auto', fontSize: '16.5px' }}>
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
              <h3 className="pub-card-title">2. Side-by-Side Teacher Verification</h3>
              <p className="pub-card-text">
                Guarantees zero AI hallucination by placing the digitized text right next to the original student manuscript. Teachers can edit transcription slips or re-extract questions in seconds with one click.
              </p>
            </div>

            <div className="pub-card">
              <h3 className="pub-card-title">3. Syllabus-Grounded RAG Engine</h3>
              <p className="pub-card-text">
                Vector retrieval matches each question against relevant textbook passages and the teacher's marking criteria. The AI evaluator only scores answers backed by factual curriculum excerpts.
              </p>
            </div>

            <div className="pub-card">
              <h3 className="pub-card-title">4. Root Misconception Synthesizer</h3>
              <p className="pub-card-text">
                Groups repeated student slips into root misconceptions. Identifies previous class delayed chapters (e.g. Class 7 Chapter 2) and calculates downstream affected chapters up to Class 10.
              </p>
            </div>

            <div className="pub-card">
              <h3 className="pub-card-title">5. NCERT Continuity &amp; Class 10 Board Protection</h3>
              <p className="pub-card-text">
                Flags prerequisite dependencies across school years. If a Class 8 student struggles with algebra, Neev maps whether the foundational break occurred in Class 6 or 7, alerting teachers before Class 10.
              </p>
            </div>

            <div className="pub-card">
              <h3 className="pub-card-title">6. Five Distinct Multi-Page PDF Reports</h3>
              <p className="pub-card-text">
                Produces 5 genuine printable PDF reports: Student Gap Analysis, Personalized Roadmap, Syllabus Continuity, 2-Mark Practice Paper (solutions omitted), and Teacher Answer Key.
              </p>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS SECTION */}
        <section id="how-it-works" className="pub-section">
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="pub-hero-badge">The Neev Workflow</div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
              From Paper Answer Sheets to Targeted Remediation
            </h2>
            <p style={{ color: 'var(--pub-slate)', fontSize: '16.5px' }}>
              A streamlined 5-step journey built around real school workflows, minimizing teacher administrative time while maximizing diagnostic depth.
            </p>
          </div>

          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
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
                  Step 2: Upload Answer Sheets &amp; Question Paper
                </h3>
                <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
                  Take photos with any smartphone or upload scanned multi-page PDF documents. Neev extracts student metadata and segments handwritten answers question-by-question.
                </p>
              </div>
            </div>

            <div className="pub-step-row">
              <div className="pub-step-num">3</div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
                  Step 3: Review Extractions with Side-by-Side Verification
                </h3>
                <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
                  Inspect original handwriting images next to transcribed text. The teacher corrects any OCR misreadings, adjusts awarded marks, and signs off with full pedagogical authority.
                </p>
              </div>
            </div>

            <div className="pub-step-row">
              <div className="pub-step-num">4</div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
                  Step 4: Curriculum-Grounded AI Evaluation
                </h3>
                <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
                  Neev cross-checks student working steps against textbook excerpts and official marking schemes. It identifies conceptual slips without guessing or hallucinating marks.
                </p>
              </div>
            </div>

            <div className="pub-step-row">
              <div className="pub-step-num">5</div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
                  Step 5: Synthesize Gaps &amp; Export 5 PDF Reports
                </h3>
                <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px' }}>
                  Review synthesized root misconceptions, previous grade prerequisite chapters, and downstream risk warnings. Export 5 formatted PDF documents for students, parents, and teachers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. CURRICULUM COVERAGE SECTION */}
        <section id="curriculum" className="pub-section">
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="pub-hero-badge">Official Curriculum Coverage</div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
              NCERT-Grounded Subject Syllabi (Grades 6 - 10)
            </h2>
            <p style={{ color: 'var(--pub-slate)', maxWidth: '720px', margin: '0 auto', fontSize: '16.5px' }}>
              Neev indexes standard NCERT textbooks, chapter sequences, and prerequisite continuity mappings for CBSE and State Board classrooms.
            </p>
          </div>

          <div className="pub-curriculum-grid">
            <div className="pub-card" style={{ borderTop: '4px solid var(--pub-orange)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div className="pub-card-icon" style={{ marginBottom: 0 }}>M</div>
                <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Mathematics (Grades 6 - 10)</h3>
              </div>
              <p className="pub-card-text">
                Covers Rational Numbers, Linear Equations, Algebraic Identities, Mensuration, Coordinate Geometry, Triangles &amp; Quadrilaterals, Trigonometry, and Statistics.
              </p>
            </div>

            <div className="pub-card" style={{ borderTop: '4px solid #1D4ED8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div className="pub-card-icon" style={{ marginBottom: 0, backgroundColor: 'rgba(29, 78, 216, 0.1)', color: '#1D4ED8' }}>S</div>
                <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Science / Physics &amp; Chemistry</h3>
              </div>
              <p className="pub-card-text">
                Covers Chemical Reactions &amp; Equations, Acids &amp; Bases, Cell Structure &amp; Cell Division, Motion, Force &amp; Laws of Motion, Light Reflection &amp; Electricity.
              </p>
            </div>

            <div className="pub-card" style={{ borderTop: '4px solid #1E8E5A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div className="pub-card-icon" style={{ marginBottom: 0, backgroundColor: 'rgba(30, 142, 90, 0.1)', color: '#1E8E5A' }}>SS</div>
                <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Social Studies &amp; Civics</h3>
              </div>
              <p className="pub-card-text">
                Covers The Indian Constitution &amp; Democratic Institutions, Secularism &amp; Fundamental Rights, Natural Resources &amp; Conservation, and Sectors of the Indian Economy.
              </p>
            </div>

            <div className="pub-card" style={{ borderTop: '4px solid #7C3AED' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div className="pub-card-icon" style={{ marginBottom: 0, backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED' }}>E</div>
                <h3 className="pub-card-title" style={{ marginBottom: 0 }}>English (Grades 6 - 10)</h3>
              </div>
              <p className="pub-card-text">
                Covers reading comprehension, grammar, vocabulary, prose, poetry, writing skills, and literary understanding.
              </p>
            </div>
          </div>
        </section>

        {/* 6. FAQ SECTION */}
        <section id="faq" className="pub-section">
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="pub-hero-badge">Got Questions?</div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: 'var(--pub-slate)', fontSize: '16.5px' }}>
              Everything you need to know about Neev’s diagnostic methodology, handwriting OCR, teacher verification, and privacy safeguards.
            </p>
          </div>

          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            {faqs.map((f, idx) => (
              <div key={idx} className="pub-faq-item">
                <h3 className="pub-faq-q">{f.q}</h3>
                <p className="pub-faq-a">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. ABOUT SECTION */}
        <section id="about" className="pub-section">
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="pub-hero-badge">Our Mission</div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
              Strengthening the Foundation of Every Learner
            </h2>
            <p style={{ color: 'var(--pub-slate)', fontSize: '16.5px', maxWidth: '780px', margin: '0 auto' }}>
              In Hindi and Indian languages, <em>Neev</em> means &ldquo;foundation&rdquo;. Our entire philosophy is anchored in one truth: learning difficulties in higher grades almost always stem from unaddressed foundational gaps in earlier years.
            </p>
          </div>

          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div className="pub-card" style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>
                The Reality of the Indian Classroom
              </h3>
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
          </div>
        </section>

        {/* 8. CONTACT SECTION */}
        <section id="contact" className="pub-section">
          <ContactSection onNavigate={onNavigate} />
        </section>
      </div>
    </PublicLayout>
  );
}
