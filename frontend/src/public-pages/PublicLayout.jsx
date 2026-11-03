import React, { useEffect } from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import './publicPages.css';

export default function PublicLayout({
  title,
  description,
  canonicalUrl,
  structuredData,
  activePath,
  onNavigate,
  onLaunchApp,
  children,
}) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Neev`;
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    if (description) {
      metaDesc.content = description;
    }

    // Robots meta tag for public marketing pages
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = 'index, follow';

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl || `https://neev.app${activePath}`;

    // JSON-LD structured data
    let scriptTag = document.getElementById('neev-jsonld-schema');
    if (structuredData) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'neev-jsonld-schema';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [title, description, canonicalUrl, structuredData, activePath]);

  return (
    <div className="pub-site-wrapper">
      <PublicHeader
        activePath={activePath}
        onNavigate={onNavigate}
        onLaunchApp={onLaunchApp}
      />
      <main className="pub-main-content" role="main">
        {children}
      </main>
      <PublicFooter onNavigate={onNavigate} onLaunchApp={onLaunchApp} />
    </div>
  );
}
