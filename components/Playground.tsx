'use client';

import { useState } from 'react';

export interface SiteData {
  baseUrl: string;
  domain: string;
  pages: { path: string; title: string; bodyHtml: string }[];
  screenshotBase64?: string;
  assets: { filename: string; mimeType: string; originalUrl: string }[];
  jsFiles: { filename: string; mimeType: string; originalUrl: string }[];
}

interface PlaygroundProps {
  data: SiteData;
  downloadUrl: string;
  filename: string;
  previewUrl: string;
  onReset: () => void;
}

export function Playground({ data, downloadUrl, filename, previewUrl, onReset }: PlaygroundProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'html' | 'assets'>('overview');

  return (
    <div className="playground-container">
      {/* Header */}
      <div className="playground-header">
        <div className="playground-brand">
          <div className="status-dot" />
          <span>{data.domain}</span>
        </div>
        <div className="playground-actions">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            Preview
          </a>
          <a href={downloadUrl} download={filename} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            Download ZIP
          </a>
          <button onClick={onReset} className="btn-ghost" style={{ padding: '8px 12px' }}>✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="playground-tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={activeTab === 'html' ? 'active' : ''} onClick={() => setActiveTab('html')}>HTML ({data.pages.length})</button>
        <button className={activeTab === 'assets' ? 'active' : ''} onClick={() => setActiveTab('assets')}>Assets ({data.assets.length + data.jsFiles.length})</button>
      </div>

      {/* Content */}
      <div className="playground-content">
        {activeTab === 'overview' && (
          <div className="pg-overview">
            <div className="pg-screenshot">
              {data.screenshotBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.screenshotBase64} alt="Screenshot" />
              ) : (
                <div className="no-screenshot">No screenshot available</div>
              )}
            </div>
            <div className="pg-stats">
              <div className="pg-stat-box">
                <span className="pg-stat-val">{data.pages.length}</span>
                <span className="pg-stat-lbl">Pages Scraped</span>
              </div>
              <div className="pg-stat-box">
                <span className="pg-stat-val">{data.assets.length}</span>
                <span className="pg-stat-lbl">Images / CSS</span>
              </div>
              <div className="pg-stat-box">
                <span className="pg-stat-val">{data.jsFiles.length}</span>
                <span className="pg-stat-lbl">Scripts Extracted</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'html' && (
          <div className="pg-html">
            <pre>
              <code>{data.pages[0]?.bodyHtml}</code>
            </pre>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="pg-assets">
            {data.assets.length === 0 && data.jsFiles.length === 0 && (
              <p>No assets found.</p>
            )}
            {data.jsFiles.map((js, i) => (
              <div key={'js-'+i} className="asset-item js">
                <div className="asset-icon">JS</div>
                <div className="asset-name">{js.filename}</div>
              </div>
            ))}
            {data.assets.map((asset, i) => (
              <div key={'img-'+i} className="asset-item img">
                {asset.mimeType.startsWith('image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.originalUrl} alt={asset.filename} loading="lazy" />
                ) : (
                  <div className="asset-icon">{asset.filename.split('.').pop()?.toUpperCase()}</div>
                )}
                <div className="asset-name" title={asset.filename}>{asset.filename}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
