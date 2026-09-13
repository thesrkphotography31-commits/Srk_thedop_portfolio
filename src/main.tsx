import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function ErrorScreen({ error }: { error: unknown }) {
  const message = error instanceof Error ? `${error.name}: ${error.message}\n\n${error.stack || ''}` : String(error);
  return (
    <main style={{ minHeight: '100vh', background: '#0d0c0a', color: '#f2ede4', padding: '48px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <p style={{ color: '#e6ca85', letterSpacing: '.18em', fontSize: 12 }}>SRIRAM KARTHICK — PORTFOLIO</p>
        <h1 style={{ fontSize: 34, margin: '18px 0 12px' }}>The portfolio app hit a runtime error.</h1>
        <p style={{ color: '#aaa', lineHeight: 1.6 }}>The deployment itself loaded, but the React application failed while starting. The exact error is shown below so it can be fixed without touching your AI Studio project.</p>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 28, padding: 20, background: '#171512', border: '1px solid #3b3428', borderRadius: 8, color: '#f0ede8', overflow: 'auto' }}>{message}</pre>
      </div>
    </main>
  );
}

function AppLoader() {
  const [App, setApp] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    import('./App.tsx')
      .then((module) => setApp(() => module.default))
      .catch((err) => setError(err));
  }, []);

  if (error) return <ErrorScreen error={error} />;
  if (!App) return null;
  return <App />;
}

if (typeof window !== 'undefined') {
  (window as any).__BUILD_VERSION__ = '2026.09.14.2-runtime-guard';
  window.addEventListener('error', (event) => {
    if (event.error) console.error('[SRK runtime error]', event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[SRK unhandled rejection]', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppLoader />
  </StrictMode>,
);
