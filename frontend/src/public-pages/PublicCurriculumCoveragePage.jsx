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

        <div className="pub-curriculum-grid">
          {/* Subject 1: Mathematics */}
          <div className="pub-card" style={{ borderTop: '4px solid var(--pub-orange)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="pub-card-icon" style={{ marginBottom: 0 }}>M</div>
              <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Mathematics (Grades 6 - 10)</h3>
            </div>
            <p className="pub-card-text">
              Covers Rational Numbers, Linear Equations, Algebraic Identities, Mensuration, Coordinate Geometry, Triangles &amp; Quadrilaterals, Trigonometry, and Statistics.
            </p>
          </div>

          {/* Subject 2: Science */}
          <div className="pub-card" style={{ borderTop: '4px solid #1D4ED8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="pub-card-icon" style={{ marginBottom: 0, backgroundColor: 'rgba(29, 78, 216, 0.1)', color: '#1D4ED8' }}>S</div>
              <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Science / Physics &amp; Chemistry</h3>
            </div>
            <p className="pub-card-text">
              Covers Chemical Reactions &amp; Equations, Acids &amp; Bases, Cell Structure &amp; Cell Division, Motion, Force &amp; Laws of Motion, Light Reflection &amp; Electricity.
            </p>
          </div>

          {/* Subject 3: Social Studies */}
          <div className="pub-card" style={{ borderTop: '4px solid #1E8E5A' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="pub-card-icon" style={{ marginBottom: 0, backgroundColor: 'rgba(30, 142, 90, 0.1)', color: '#1E8E5A' }}>SS</div>
              <h3 className="pub-card-title" style={{ marginBottom: 0 }}>Social Studies &amp; Civics</h3>
            </div>
            <p className="pub-card-text">
              Covers The Indian Constitution &amp; Democratic Institutions, Secularism &amp; Fundamental Rights, Natural Resources &amp; Conservation, and Sectors of the Indian Economy.
            </p>
          </div>

          {/* Subject 4: English */}
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
      </div>
    </PublicLayout>
  );
}

