'use client';

interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
  statuses: string[];
}

interface ProgressTrackerProps {
  status: string;
  message: string;
  percent: number;
  cloneUrl: string;
}

const steps: Step[] = [
  {
    id: 'scraping',
    label: 'Analyzing Website',
    statuses: ['scraping', 'queued'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'packaging',
    label: 'Generating Project',
    statuses: ['packaging', 'converting'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'done',
    label: 'Building ZIP',
    statuses: ['done'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

function getStepState(step: Step, currentStatus: string): 'pending' | 'active' | 'done' {
  const stepIndex = steps.findIndex((s) => s.id === step.id);
  const currentIndex = steps.findIndex((s) => s.statuses.includes(currentStatus));

  if (currentStatus === 'done') {
    return 'done';
  }
  if (stepIndex < currentIndex) return 'done';
  if (stepIndex === currentIndex || step.statuses.includes(currentStatus)) return 'active';
  return 'pending';
}

export default function ProgressTracker({
  status,
  message,
  percent,
  cloneUrl,
}: ProgressTrackerProps) {
  return (
    <div className="progress-container" role="status" aria-live="polite">
      <div className="progress-header">
        <div className="spinner" />
        <div className="progress-info">
          <h2 className="progress-title">Cloning in progress</h2>
          <p className="progress-url">{cloneUrl}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-wrap" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>

      {/* Message */}
      <p className="progress-message">
        {message}
      </p>
    </div>
  );
}
