import React from 'react';
import PublicLayout from './PublicLayout';

export default function PublicCurriculumCoveragePage({ onNavigate, onLaunchApp, currentUser = null }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Neev Curriculum Coverage — NCERT-Aligned Syllabus',
    description: 'Detailed coverage of NCERT-aligned curriculum for Mathematics, Science, English, and Social Studies across Grades 6 to 10.',
    url: 'https://neev-basic-seven.vercel.app/curriculum-coverage',
  };

  return (
    <PublicLayout
      title="Curriculum Coverage — NCERT-Aligned Syllabus (Grades 6 - 10)"
      description="Inspect Neev's multi-subject curriculum coverage: Mathematics, Science, English Language, and Social Studies from Grade 6 to Grade 10 with prerequisite mapping."
      canonicalUrl="https://neev-basic-seven.vercel.app/curriculum-coverage"
      structuredData={structuredData}
      activePath="/curriculum-coverage"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
      currentUser={currentUser}
    >
      <div className="pub-container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="pub-hero-badge">Curriculum &bull; NCERT-Aligned</div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px' }}>
            Multi-Subject Prerequisite Mapping
          </h1>
          <p style={{ color: 'var(--pub-slate)', maxWidth: '720px', margin: '0 auto', fontSize: '17px' }}>
            Neev models the continuous prerequisite knowledge graph across Grades 6 through 10, connecting core foundational concepts to downstream performance in Class 10 Board exams.
          </p>
        </div>

        <div className="pub-grid-2">
          {/* Subject 1: Mathematics */}
          <div className="pub-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="pub-card-icon" style={{ marginBottom: 0 }}>M</div>
              <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Mathematics (Grades 6 - 10)</h3>
            </div>
            <p className="pub-card-text">
              Covers Linear Equations in One &amp; Two Variables, Arithmetic Precedence &amp; Integers, Exponents &amp; Powers, Algebraic Expressions &amp; Identities, Factorisation, Mensuration, Geometry, and Commercial Mathematics.
            </p>
            <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--pub-orange)', fontWeight: '700' }}>
              Key Prerequisite Links: Class 7 Simple Equations &rarr; Class 8 Linear Equations &rarr; Class 10 Quadratic Equations.
            </div>
          </div>

          {/* Subject 2: Science */}
          <div className="pub-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="pub-card-icon" style={{ marginBottom: 0 }}>S</div>
              <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Science / Physics / Biology (Grades 6 - 10)</h3>
            </div>
            <p className="pub-card-text">
              Covers Cell Structure &amp; Functions, Osmosis &amp; Diffusion Transport, Prokaryotic vs Eukaryotic Cells, Scientific Models &amp; Inquiry, Force &amp; Pressure, Motion &amp; Laws, Electric Currents &amp; Chemical Effects.
            </p>
            <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--pub-orange)', fontWeight: '700' }}>
              Key Prerequisite Links: Class 7 Living Processes &rarr; Class 8 Cell Organization &rarr; Class 9 Fundamental Unit of Life.
            </div>
          </div>

          {/* Subject 3: English Language */}
          <div className="pub-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="pub-card-icon" style={{ marginBottom: 0 }}>E</div>
              <h3 className="pub-card-title" style={{ marginBottom: 0 }}>English Language &amp; Grammar (Grades 6 - 10)</h3>
            </div>
            <p className="pub-card-text">
              Covers Reading Comprehension &amp; Textual Inferences, Active &amp; Passive Voice transformations, Verb Tenses &amp; Aspects, Subject-Verb Concord, Subordinate Clauses, and Literary Devices.
            </p>
            <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--pub-orange)', fontWeight: '700' }}>
              Key Prerequisite Links: Class 7 Simple Tenses &rarr; Class 8 Concord &rarr; Class 10 Board Analytical Writing.
            </div>
          </div>

          {/* Subject 4: Social Studies */}
          <div className="pub-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="pub-card-icon" style={{ marginBottom: 0 }}>SS</div>
              <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Social Studies &amp; History / Civics (Grades 6 - 10)</h3>
            </div>
            <p className="pub-card-text">
              Covers The Indian Constitution &amp; Democratic Institutions, Secularism &amp; Fundamental Rights, Natural Resources &amp; Conservation, Historical Inquiry &amp; Colonialism, and Sectors of the Indian Economy.
            </p>
            <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--pub-orange)', fontWeight: '700' }}>
              Key Prerequisite Links: Class 7 Equality &rarr; Class 8 Constitution &rarr; Class 10 Democratic Politics.
            </div>
          </div>
        </div>

        <div className="pub-card" style={{ marginTop: '36px', borderLeft: '4px solid var(--pub-orange)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
            Custom Teacher Curriculum Support
          </h3>
          <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px', lineHeight: 1.6 }}>
            In addition to standard NCERT curriculum, teachers can upload custom textbook chapters or school-specific worksheets (PDF / TXT). Neev automatically parses, chunks, and creates private vector indexes for custom teacher curriculum while keeping private school materials strictly isolated.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

