'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import UrlInput from '@/components/UrlInput';
import ProgressTracker from '@/components/ProgressTracker';
import DownloadCard from '@/components/DownloadCard';

type AppState = 'idle' | 'cloning' | 'done' | 'error';

interface ProgressState {
  status: string;
  message: string;
  percent: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [cloneUrl, setCloneUrl] = useState('');
  const [jobId, setJobId] = useState('');
  const [progress, setProgress] = useState<ProgressState>({
    status: 'queued',
    message: 'Starting...',
    percent: 0,
  });
  const [downloadInfo, setDownloadInfo] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  async function handleClone(url: string, exportType: 'nextjs' | 'html') {
    cleanup();
    setCloneUrl(url);
    setAppState('cloning');
    setErrorMsg('');
    setDownloadInfo(null);
    setProgress({ status: 'queued', message: 'Starting clone...', percent: 2 });

    try {
      // POST to start the job
      const response = await fetch(`${BACKEND_URL}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, exportType }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Server error: ${response.status}`);
      }

      const { jobId: newJobId } = (await response.json()) as { jobId: string };
      setJobId(newJobId);

      // Connect to SSE stream
      const es = new EventSource(`${BACKEND_URL}/clone/${newJobId}/stream`);
      esRef.current = es;

      es.addEventListener('progress', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as ProgressState;
        setProgress(data);
      });

      es.addEventListener('complete', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as { downloadUrl: string; filename: string };
        setDownloadInfo({ url: data.downloadUrl, filename: data.filename });
        setAppState('done');
        cleanup();
      });

      es.addEventListener('error', (e: MessageEvent | Event) => {
        let msg = 'An unexpected error occurred';
        if (e instanceof MessageEvent) {
          try {
            msg = (JSON.parse(e.data) as { message: string }).message;
          } catch { /* ignore */ }
        }
        setErrorMsg(msg);
        setAppState('error');
        cleanup();
      });

      es.onerror = (e) => {
        // Only treat as error if we're still cloning (not already done/errored)
        setAppState((prev) => {
          if (prev === 'cloning') {
            setErrorMsg('Lost connection to server. Please try again.');
            cleanup();
            return 'error';
          }
          return prev;
        });
      };
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start clone job');
      setAppState('error');
    }
  }

  function handleReset() {
    cleanup();
    setAppState('idle');
    setCloneUrl('');
    setJobId('');
    setDownloadInfo(null);
    setErrorMsg('');
    setProgress({ status: 'queued', message: '', percent: 0 });
  }

  return (
    <>
      {/* Animated background particles */}
      <div className="bg-particles" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* Gradient orbs */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <main className="main-layout">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="logo-text">WebCloner</span>
          </div>
          <div className="header-badge">
            <span className="badge-dot" />
            AI-Powered
          </div>
        </header>

        {/* Hero */}
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Zero API keys required
          </div>
          <h1 id="hero-heading" className="hero-title">
            Clone Any Website
            <span className="hero-title-gradient"> Instantly</span>
          </h1>
          <p className="hero-subtitle">
            Paste a URL, get a fully functional Next.js + TypeScript + Tailwind project.
            No signup. No API key. Just paste and clone.
          </p>
        </section>

        {/* Content area */}
        <section className="content-area">
          {appState === 'idle' && (
            <div className="card glass-card">
              <UrlInput onClone={handleClone} isLoading={false} />
              <div className="features-row">
                {[
                  { icon: '🎨', label: 'Full CSS & Styles' },
                  { icon: '🖼️', label: 'Images & Assets' },
                  { icon: '📄', label: 'Multi-page' },
                  { icon: '📦', label: 'ZIP Export' },
                ].map((f) => (
                  <div key={f.label} className="feature-chip">
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {appState === 'cloning' && (
            <div className="card glass-card">
              <UrlInput onClone={handleClone} isLoading={true} />
              <ProgressTracker
                status={progress.status}
                message={progress.message}
                percent={progress.percent}
                cloneUrl={cloneUrl}
              />
            </div>
          )}

          {appState === 'done' && downloadInfo && (
            <DownloadCard
              downloadUrl={downloadInfo.url}
              filename={downloadInfo.filename}
              originalUrl={cloneUrl}
              onReset={handleReset}
            />
          )}

          {appState === 'error' && (
            <div className="card glass-card error-card">
              <div className="error-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="error-title">Clone Failed</h2>
              <p className="error-message">{errorMsg}</p>
              <div className="error-tips">
                <p>Common causes:</p>
                <ul>
                  <li>Website blocks automated access</li>
                  <li>Invalid or unreachable URL</li>
                  <li>Backend server not running</li>
                </ul>
              </div>
              <button onClick={handleReset} className="retry-btn" id="retry-btn">
                Try Again
              </button>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="footer">
          <p>
            Built with Playwright + Next.js · Visual cloning only ·{' '}
            <span className="footer-note">Not affiliated with any cloned site</span>
          </p>
        </footer>
      </main>
    </>
  );
}
