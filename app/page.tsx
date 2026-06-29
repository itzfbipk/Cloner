'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Playground, SiteData } from '@/components/Playground';

type AppState = 'idle' | 'cloning' | 'done' | 'error';

interface ProgressState {
  status: string;
  message: string;
  percent: number;
}

const BACKEND = 'https://akiiiiwa-ai-cloner-backend.hf.space';

export default function HomePage() {
  const [state, setState] = useState<AppState>('idle');
  const [url, setUrl] = useState('');
  const [exportType, setExportType] = useState<'nextjs' | 'html'>('html');
  const [progress, setProgress] = useState<ProgressState>({ status: 'queued', message: '', percent: 0 });
  const [cloneUrl, setCloneUrl] = useState('');
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; filename: string } | null>(null);
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldError, setFieldError] = useState('');
  
  // Advanced options state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sessionInput, setSessionInput] = useState('');

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

    let customHeaders: Record<string, string> | undefined;
    let localStorageData: Record<string, string> | undefined;

    if (sessionInput.trim()) {
      const trimmedInput = sessionInput.trim();
      const headers: Record<string, string> = {};
      const lsData: Record<string, string> = {};
      
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(trimmedInput);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.assign(lsData, parsed);
          // Also inject JSON keys as cookies just to be safe
          const cookieParts = Object.entries(parsed).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`);
          headers['Cookie'] = cookieParts.join('; ');
        } else {
          throw new Error('Not an object');
        }
      } catch {
        // Fallback: Parse line-by-line for HTTP headers or raw cookies
        const lines = trimmedInput.split('\n');
        const cookieParts: string[] = [];
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const colonIdx = line.indexOf(':');
          const potentialKey = colonIdx > 0 ? line.substring(0, colonIdx).trim() : '';
          const isValidHeader = colonIdx > 0 && !potentialKey.includes('=') && !potentialKey.includes(' ');
          
          if (isValidHeader) {
            // It's a standard header (e.g. "Authorization: Bearer ...")
            const key = potentialKey;
            const val = line.substring(colonIdx + 1).trim();
            if (key && val) headers[key] = val;
          } else {
            // It's a raw cookie string or Key=Value pair
            cookieParts.push(line.trim());
            
            // Also blindly extract Key=Value pairs into LocalStorage to cover all bases!
            const pairs = line.split(';');
            for (const pair of pairs) {
              const eqIdx = pair.indexOf('=');
              if (eqIdx > 0) {
                const k = pair.substring(0, eqIdx).trim();
                const v = pair.substring(eqIdx + 1).trim();
                if (k) lsData[k] = v;
              }
            }
          }
        }
        
        if (cookieParts.length > 0) {
          headers['Cookie'] = cookieParts.join('; ');
        }
      }
      
      if (Object.keys(lsData).length > 0) localStorageData = lsData;
      if (Object.keys(headers).length > 0) customHeaders = headers;
    }

    cleanup();
    setCloneUrl(finalUrl);
    setState('cloning');
    setProgress({ status: 'queued', message: 'Starting...', percent: 2 });

    try {
      const res = await fetch(`${BACKEND}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl, exportType, customHeaders, localStorageData }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || `Server error: ${res.status}`);
      }
      const { jobId } = (await res.json()) as { jobId: string };
      const es = new EventSource(`${BACKEND}/clone/${jobId}/stream`);
      esRef.current = es;
      es.addEventListener('progress', (e: MessageEvent) => setProgress(JSON.parse(e.data)));
      es.addEventListener('complete', async (e: MessageEvent) => {
        cleanup(); // Close EventSource immediately so dropped connection doesn't trigger an error event
        const d = JSON.parse(e.data) as { downloadUrl: string; filename: string };
        setDownloadInfo({ url: d.downloadUrl, filename: d.filename });
        
        // Fetch playground data
        try {
          const dataRes = await fetch(`${BACKEND}/clone/${jobId}/data`);
          if (dataRes.ok) {
            const parsedData = await dataRes.json();
            setSiteData(parsedData);
          }
        } catch (e) {
          console.error("Failed to fetch playground data", e);
        }

        setState('done');
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
    setDownloadInfo(null); setSiteData(null); setErrorMsg(''); setFieldError('');
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
                      Clone Site
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                        <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
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

                <div className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                  <span className="advanced-icon">{showAdvanced ? '▼' : '▶'}</span> Advanced Options (Authentication)
                </div>

                {showAdvanced && (
                  <div className="advanced-panel">
                    <p className="advanced-desc">Scrape a private dashboard by pasting your active session tokens below.</p>
                    <label className="advanced-label">
                      Session Data (Paste Cookies, Headers, or LocalStorage JSON)
                      <textarea 
                        className="advanced-textarea"
                        placeholder={'PHPSESSID=123...\nor\n{\n  "auth_token": "abc"\n}'}
                        value={sessionInput}
                        onChange={e => setSessionInput(e.target.value)}
                        spellCheck={false}
                      />
                    </label>
                  </div>
                )}
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
                  <span className="stat-value">25</span>
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
            siteData ? (
              <Playground 
                data={siteData} 
                downloadUrl={fullDownload} 
                filename={downloadInfo.filename} 
                previewUrl={previewUrl} 
                onReset={reset} 
              />
            ) : (
              <div className="done-panel">
                <p className="done-label">Clone complete</p>
                <p className="done-site">{hostname}</p>
                <p className="done-meta">Your project is ready to download.</p>
                <div className="done-actions">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    Preview
                  </a>
                  <a href={fullDownload} download={downloadInfo.filename} className="btn-primary">
                    Download ZIP
                  </a>
                </div>
                <button onClick={reset} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Clone another →
                </button>
              </div>
            )
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
