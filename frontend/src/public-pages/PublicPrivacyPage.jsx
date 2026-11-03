import React from 'react';
import PublicLayout from './PublicLayout';

export default function PublicPrivacyPage({ onNavigate, onLaunchApp, currentUser = null }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Neev Privacy Policy',
    description: 'Privacy policy for Neev educational platform: student data isolation, zero-advertising guarantee, and data retention standards.',
    url: 'https://neev-basic-seven.vercel.app/privacy',
  };

  return (
    <PublicLayout
      title="Privacy Policy — Student Data Safeguards & Institutional Privacy"
      description="Read Neev's privacy policy: strict teacher tenant isolation, zero third-party data monetization, and transparent handling of student work."
      canonicalUrl="https://neev-basic-seven.vercel.app/privacy"
      structuredData={structuredData}
      activePath="/privacy"
      onNavigate={onNavigate}
      onLaunchApp={onLaunchApp}
      currentUser={currentUser}
    >
      <div className="pub-container" style={{ maxWidth: '850px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div className="pub-hero-badge">Student Data Protection</div>
          <h1 style={{ fontSize: '34px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Privacy Policy &amp; Data Safeguards
          </h1>
          <p style={{ color: 'var(--pub-muted)', fontSize: '14px' }}>
            Last Updated: November 2026 &bull; Compliant with Indian Digital Personal Data Protection (DPDP) Act standards.
          </p>
        </div>

        <div className="pub-card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px' }}>
            1. Our Core Commitment: Student Data is Not a Product
          </h2>
          <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px', lineHeight: 1.7 }}>
            Neev is built solely to assist educators in diagnosing learning gaps. We do not sell student data, we do not build behavioral advertising profiles, and we do not use student answer sheets or private classroom work to train public artificial intelligence models.
          </p>
        </div>

        <div className="pub-card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px' }}>
            2. Teacher Tenant Isolation
          </h2>
          <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px', lineHeight: 1.7 }}>
            All classrooms, assessments, student answer sheets, and custom curriculum documents are cryptographically partitioned to the authenticated teacher. A teacher in School A cannot view, query, or retrieve any data belonging to School B or another classroom.
          </p>
        </div>

        <div className="pub-card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px' }}>
            3. Data Collected &amp; Processing Scope
          </h2>
          <ul style={{ color: 'var(--pub-slate)', fontSize: '14.5px', lineHeight: 1.7, paddingLeft: '20px' }}>
            <li><strong>Teacher Account Data:</strong> Name, institutional email, and authentication credentials managed securely via Firebase Authentication.</li>
            <li><strong>Assessment Artifacts:</strong> Scanned answer sheet images and question papers uploaded by the teacher for optical character recognition and evaluation.</li>
            <li><strong>Diagnostic Results:</strong> Teacher-approved scores, misconception classifications, and generated PDF remediation roadmaps.</li>
          </ul>
        </div>

        <div className="pub-card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px' }}>
            4. Data Retention &amp; Deletion
          </h2>
          <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px', lineHeight: 1.7 }}>
            Teachers retain complete ownership of their data. When an assessment or classroom is deleted from the dashboard, all associated student answer sheets, OCR transcriptions, vector chunks, and evaluations are permanently purged from our database and cloud storage buckets.
          </p>
        </div>

        <div className="pub-card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px' }}>
            5. Contact for Privacy Inquiries
          </h2>
          <p style={{ color: 'var(--pub-slate)', fontSize: '14.5px', lineHeight: 1.7 }}>
            If you have questions regarding our data privacy practices or institutional data processing agreements, please email our data protection officer at <a href="mailto:adhithyabairy@gmail.com" style={{ color: 'var(--pub-navy)', fontWeight: 600 }}>adhithyabairy@gmail.com</a>.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

