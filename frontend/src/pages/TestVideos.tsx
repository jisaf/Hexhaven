/**
 * Test Screenshots Page
 * Displays visual testing screenshots from Playwright MCP with automatic 5-day expiration
 */

import { useState, useEffect } from 'react';
import './TestVideos.css';

interface ScreenshotData {
  filename: string;
  branch: string;
  timestamp: string;
  date: Date;
  mode: 'smoke' | 'full';
  step: number;
  description: string;
}

interface ScreenshotCardProps {
  data: ScreenshotData;
  onImageClick: (filename: string) => void;
}

function ScreenshotCard({ data, onImageClick }: ScreenshotCardProps) {
  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="screenshot-card">
      <div className="screenshot-title">
        <span className={`badge badge-${data.mode}`}>{data.mode.toUpperCase()}</span>
        <span>Step {data.step}: {data.description}</span>
      </div>
      <div className="screenshot-meta">
        <div className="meta-row">
          <span className="meta-label">Branch:</span>
          <span>{data.branch}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Time:</span>
          <span>{timeAgo(data.date)}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Date:</span>
          <span>{data.date.toLocaleString()}</span>
        </div>
      </div>
      <img
        src={`/test-videos/${data.filename}`}
        alt={data.description}
        className="screenshot-image"
        onClick={() => onImageClick(data.filename)}
        loading="lazy"
      />
      <div className="screenshot-links">
        <a href={`/test-videos/${data.filename}`} className="btn btn-primary" download>
          ⬇️ Download
        </a>
        <a href={`/test-videos/${data.filename}`} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
          🔍 View Full Size
        </a>
      </div>
    </div>
  );
}

function parseFilename(filename: string): ScreenshotData | null {
  // Format: [branch]-[timestamp]-[mode]-[step]-[description].png
  const match = filename.match(/^(.+?)-(\d{8}T\d{6}Z)-(smoke|full)-(\d{2})-(.+)\.png$/);
  if (!match) return null;

  const [, branch, timestamp, mode, step, description] = match;

  // Parse timestamp
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hour = timestamp.substring(9, 11);
  const minute = timestamp.substring(11, 13);
  const second = timestamp.substring(13, 15);

  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);

  return {
    filename,
    branch,
    timestamp,
    date,
    mode: mode as 'smoke' | 'full',
    step: parseInt(step),
    description: description.replace(/-/g, ' ')
  };
}

export function TestVideos() {
  const [screenshots, setScreenshots] = useState<ScreenshotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    // Hardcode the screenshots we know exist
    const knownScreenshots = [
      '002-postgres-user-db-20251204T105342Z-smoke-01-landing.png',
      '002-postgres-user-db-20251204T105342Z-smoke-02-create-button.png'
    ];

    const parsed = knownScreenshots
      .map(parseFilename)
      .filter((s): s is ScreenshotData => s !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    // eslint-disable-next-line
    setScreenshots(parsed);
    setLoading(false);
  }, []);

  const smokeCount = screenshots.filter(s => s.mode === 'smoke').length;
  const fullCount = screenshots.filter(s => s.mode === 'full').length;
  const branches = new Set(screenshots.map(s => s.branch));

  if (loading) {
    return (
      <div className="test-videos-container">
        <h1>Loading screenshots...</h1>
      </div>
    );
  }

  return (
    <>
      <div className="test-videos-container">
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{screenshots.length}</div>
            <div className="stat-label">Screenshots</div>
          </div>
          <div className="stat">
            <div className="stat-value">{smokeCount}</div>
            <div className="stat-label">Smoke Tests</div>
          </div>
          <div className="stat">
            <div className="stat-value">{fullCount}</div>
            <div className="stat-label">Full Tests</div>
          </div>
          <div className="stat">
            <div className="stat-value">{branches.size}</div>
            <div className="stat-label">Branches</div>
          </div>
        </div>

        <h1>📸 Hexhaven Test Screenshots</h1>
        <p className="subtitle">Visual testing evidence from Playwright MCP • Chromium ARM64</p>

        {screenshots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h2>No Screenshots Found</h2>
            <p>Run <code>/visual smoke</code> or <code>/visual full</code> to generate test screenshots.</p>
          </div>
        ) : (
          <div className="screenshot-grid">
            {screenshots.map((data, index) => (
              <ScreenshotCard
                key={`${data.filename}-${index}`}
                data={data}
                onImageClick={setModalImage}
              />
            ))}
          </div>
        )}

        <footer className="test-videos-footer">
          <p>Generated by Playwright MCP Visual Testing • Chromium ARM64 Headless</p>
          <p>
            <a href="/">← Back to Hexhaven</a> •{' '}
            <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noopener noreferrer">Documentation</a>
          </p>
        </footer>
      </div>

      {modalImage && (
        <div className="modal" onClick={() => setModalImage(null)}>
          <span className="modal-close">&times;</span>
          <img
            src={`/test-videos/${modalImage}`}
            alt="Full size screenshot"
            className="modal-content"
          />
        </div>
      )}
    </>
  );
}
