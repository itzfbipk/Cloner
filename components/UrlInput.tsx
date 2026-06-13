'use client';

import { useState, useRef } from 'react';

interface UrlInputProps {
  onClone: (url: string, exportType: 'nextjs' | 'html') => void;
  isLoading: boolean;
}

export default function UrlInput({ onClone, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [exportType, setExportType] = useState<'nextjs' | 'html'>('nextjs');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(value: string): string {
    if (!value.trim()) return 'Please enter a URL';
    try {
      const u = new URL(value.trim());
      if (!['http:', 'https:'].includes(u.protocol)) return 'Only http:// and https:// URLs are supported';
      return '';
    } catch {
      // Try adding https:// prefix
      try {
        new URL('https://' + value.trim());
        return ''; // valid with prefix
      } catch {
        return 'Please enter a valid URL (e.g. https://example.com)';
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    const validationError = validate(trimmed);
    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }
    setError('');
    // Auto-add https:// if missing
    let finalUrl = trimmed;
    try {
      new URL(trimmed);
    } catch {
      finalUrl = 'https://' + trimmed;
    }
    onClone(finalUrl, exportType);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrl(e.target.value);
    if (error) setError('');
  }

  return (
    <form onSubmit={handleSubmit} className="url-form">
      <div className="input-container">
        <div className={`url-input-wrapper ${error ? 'has-error' : ''} ${isLoading ? 'is-loading' : ''}`}>
          {/* Globe icon */}
          <div className="url-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>

          <input
            ref={inputRef}
            id="url-input"
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="https://example.com"
            disabled={isLoading}
            className="url-input"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="clone-button"
            id="clone-btn"
          >
            {isLoading ? (
              <span className="btn-content">
                <span className="spinner" />
                Cloning...
              </span>
            ) : (
              <span className="btn-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Clone
              </span>
            )}
          </button>
        </div>

        <div className="export-toggle" data-active={exportType}>
          <div className="toggle-slider" />
          <button 
            type="button" 
            className={`toggle-btn ${exportType === 'nextjs' ? 'active' : ''}`} 
            onClick={() => setExportType('nextjs')} 
            disabled={isLoading}
          >
            Next.js App
          </button>
          <button 
            type="button" 
            className={`toggle-btn ${exportType === 'html' ? 'active' : ''}`} 
            onClick={() => setExportType('html')} 
            disabled={isLoading}
          >
            Simple HTML
          </button>
        </div>
      </div>

      {error && (
        <p className="url-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
          </svg>
          {error}
        </p>
      )}

      <p className="url-hint">
        Supports any public website — single-page or multi-page
      </p>
    </form>
  );
}
