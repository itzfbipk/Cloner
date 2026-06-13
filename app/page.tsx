'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type AppState = 'idle' | 'cloning' | 'done' | 'error';

interface ProgressState {
  status: string;
  message: string;
  percent: number;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function HomePage() {
  const [state, setState] = useState<AppState>('idle');
  const [url, setUrl] = useState('');
  const [exportType, setExportType] = useState<'nextjs' | 'html'>('nextjs');
  const [progress, setProgress] = useState<ProgressState>({ status: 'queued', message: '', percent: 0 });
  const [cloneUrl, setCloneUrl] = useState('');
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; filename: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldError, setFieldError] = useState('');
  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  function validate(v: string) {
    if (!v.trim()) return 'Enter a URL to clone';
    try { new URL(v.trim()); return ''; } catch {
      try { new URL('https://' + v.trim()); return ''; } catch {
        return 'Invalid URL format';
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    const err = validate(trimmed);
    if (err) { setFieldError(err); return; }
    setFieldError('');
    const finalUrl = trimmed.startsWith('http') ? trimmed : 'https://' + trimmed;

    cleanup();
    setCloneUrl(finalUrl);
    setState('cloning');
    setProgress({ status: 'queued', message: 'Starting...', percent: 2 });

    try {
      const res = await fetch(`${BACKEND}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl, exportType }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || `Server error: ${res.status}`);
      }
      const { jobId } = (await res.json()) as { jobId: string };
      const es = new EventSource(`${BACKEND}/clone/${jobId}/stream`);
      esRef.current = es;
      es.addEventListener('progress', (e: MessageEvent) => setProgress(JSON.parse(e.data)));
      es.addEventListener('complete', (e: MessageEvent) => {
        const d = JSON.parse(e.data) as { downloadUrl: string; filename: string };
        setDownloadInfo({ url: d.downloadUrl, filename: d.filename });
        setState('done'); cleanup();
      });
      es.addEventListener('error', (e: MessageEvent | Event) => {
        let msg = 'Unexpected error';
        if (e instanceof MessageEvent) try { msg = JSON.parse(e.data).message; } catch { }
        setErrorMsg(msg); setState('error'); cleanup();
      });
      es.onerror = () => setState(prev => {
        if (prev === 'cloning') { setErrorMsg('Lost connection. Try again.'); cleanup(); return 'error'; }
        return prev;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start');
      setState('error');
    }
  }

  function reset() {
    cleanup(); setState('idle'); setUrl(''); setCloneUrl('');
    setDownloadInfo(null); setErrorMsg(''); setFieldError('');
    setProgress({ status: 'queued', message: '', percent: 0 });
  }

  const hostname = (() => { try { return new URL(cloneUrl).hostname; } catch { return cloneUrl; } })();
  const fullDownload = downloadInfo ? `${BACKEND}${downloadInfo.url}` : '';
  const previewUrl = fullDownload.replace('/download', '/preview/');

  return (
    <>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />

      <div className="page">
        {/* Nav */}
        <nav className="nav">
          <div className="nav-brand">
            <span className="brand-dot" />
            WebCloner
          </div>
          <span className="nav-status">v1.0</span>
        </nav>

        {/* Hero / Main */}
        <main className="hero">
          {state === 'idle' && (
            <>
              <h1 className="hero-title">
                Clone any<br /><em>website.</em>
              </h1>
              <p className="hero-sub">
                Paste a URL. Get a fully structured, downloadable codebase in seconds.
              </p>

              <div className="input-panel">
                <form onSubmit={handleSubmit}>
                  <div className="url-row">
                    <span className="url-prefix">https://</span>
                    <input
                      id="url-input"
                      className="url-field"
                      type="text"
                      placeholder="example.com"
                      value={url}
                      onChange={e => { setUrl(e.target.value); setFieldError(''); }}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button type="submit" className="go-btn" id="clone-btn">
                      Clone
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  {fieldError && <p className="field-error">{fieldError}</p>}
                </form>

                <div className="format-row">
                  <span className="format-label">Export as</span>
                  <button className={`fmt-btn ${exportType === 'nextjs' ? 'active' : ''}`} onClick={() => setExportType('nextjs')}>
                    Next.js
                  </button>
                  <button className={`fmt-btn ${exportType === 'html' ? 'active' : ''}`} onClick={() => setExportType('html')}>
                    HTML
                  </button>
                </div>
              </div>

              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">CSS</span>
                  <span className="stat-label">Preserved</span>
                </div>
                <div className="stat-div" />
                <div className="stat">
                  <span className="stat-value">JS</span>
                  <span className="stat-label">Included</span>
                </div>
                <div className="stat-div" />
                <div className="stat">
                  <span className="stat-value">8</span>
                  <span className="stat-label">Max Pages</span>
                </div>
                <div className="stat-div" />
                <div className="stat">
                  <span className="stat-value">ZIP</span>
                  <span className="stat-label">Output</span>
                </div>
              </div>
            </>
          )}

          {state === 'cloning' && (
            <div className="prog-panel">
              <p className="hero-eyebrow" style={{ marginBottom: 40 }}>Cloning</p>
              <p className="prog-url">{cloneUrl}</p>
              <div className="prog-track">
                <div className="prog-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="prog-status">
                <span className="prog-spinner" />
                <span>{progress.message}</span>
              </div>
            </div>
          )}

          {state === 'done' && downloadInfo && (
            <div className="done-panel">
              <p className="done-label">Clone complete</p>
              <p className="done-site">{hostname}</p>
              <p className="done-meta">Your project is ready to download.</p>
              <div className="done-actions">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  Preview
                </a>
                <a href={fullDownload} download={downloadInfo.filename} className="btn-primary" id="download-zip-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download ZIP
                </a>
              </div>
              <button onClick={reset} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Clone another →
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="err-panel">
              <p className="err-code">Error</p>
              <p className="err-msg">Clone failed</p>
              <p className="err-sub">{errorMsg}</p>
              <button onClick={reset} className="btn-retry" id="retry-btn">Try again</button>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="footer">
          <span className="footer-link">Visual clone only</span>
          <span className="footer-sep">·</span>
          <span className="footer-link">No affiliation with cloned sites</span>
          <span className="footer-sep">·</span>
          <span className="footer-link">Playwright powered</span>
        </footer>
      </div>
    </>
  );
}
