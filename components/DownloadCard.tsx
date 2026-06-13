'use client';

interface DownloadCardProps {
  downloadUrl: string;
  filename: string;
  originalUrl: string;
  onReset: () => void;
}

export default function DownloadCard({ downloadUrl, filename, originalUrl, onReset }: DownloadCardProps) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const fullDownloadUrl = `${backendUrl}${downloadUrl}`;
  const previewUrl = fullDownloadUrl.replace('/download', '/preview/');

  return (
    <div className="download-card">
      {/* Success icon */}
      <div className="success-icon-wrap">
        <div className="success-rings">
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
        </div>
        <div className="success-check">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      <h2 className="download-title">Clone Ready!</h2>
      <p className="download-subtitle">
        Your Next.js project has been generated from{' '}
        <span className="download-source">{new URL(originalUrl).hostname}</span>
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '1rem', width: '100%', marginBottom: '2rem' }}>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="download-btn"
          style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Preview Site
        </a>

        <a
          href={fullDownloadUrl}
          download={filename}
          className="download-btn"
          id="download-zip-btn"
          style={{ flex: 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </a>
      </div>

      {/* Quick start */}
      <div className="quickstart">
        <h3 className="quickstart-title">Quick Start</h3>
        <div className="quickstart-steps">
          <div className="qs-step">
            <span className="qs-num">1</span>
            <div className="qs-content">
              <p className="qs-label">Unzip the file</p>
              <code className="qs-code">unzip {filename}</code>
            </div>
          </div>
          <div className="qs-step">
            <span className="qs-num">2</span>
            <div className="qs-content">
              <p className="qs-label">Install dependencies</p>
              <code className="qs-code">npm install</code>
            </div>
          </div>
          <div className="qs-step">
            <span className="qs-num">3</span>
            <div className="qs-content">
              <p className="qs-label">Run locally</p>
              <code className="qs-code">npm run dev</code>
            </div>
          </div>
        </div>
      </div>

      <button onClick={onReset} className="reset-btn" id="clone-another-btn">
        Clone another website
      </button>
    </div>
  );
}
