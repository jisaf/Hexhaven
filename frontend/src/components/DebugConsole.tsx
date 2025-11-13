/**
 * Debug Console Component
 *
 * Displays console logs, errors, and warnings in a collapsible panel
 * for debugging on mobile devices where developer tools aren't easily accessible.
 */

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  data?: any;
}

export function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const logIdCounter = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    // Intercept console methods
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      addLog('log', args);
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      addLog('error', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addLog('warn', args);
    };

    console.info = (...args: any[]) => {
      originalInfo.apply(console, args);
      addLog('info', args);
    };

    // Cleanup on unmount
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (isOpen && !isMinimized) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, isMinimized]);

  const addLog = (level: LogEntry['level'], args: any[]) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = args
      .map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    setLogs(prev => [
      ...prev,
      {
        id: logIdCounter.current++,
        timestamp,
        level,
        message,
        data: args.length === 1 && typeof args[0] === 'object' ? args[0] : null,
      },
    ]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return '#ef4444';
      case 'warn':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#10b981';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'ERR';
      case 'warn':
        return 'WRN';
      case 'info':
        return 'INF';
      default:
        return 'LOG';
    }
  };

  const copyAllLogs = () => {
    const allLogsText = logs
      .map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n\n');

    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(allLogsText)
        .then(() => {
          setCopyStatus('Copied!');
          setTimeout(() => setCopyStatus(''), 2000);
        })
        .catch(() => {
          // Fallback to textarea method
          fallbackCopy(allLogsText);
        });
    } else {
      // Use fallback method
      fallbackCopy(allLogsText);
    }
  };

  const fallbackCopy = (text: string) => {
    // Create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);

    try {
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const successful = document.execCommand('copy');

      if (successful) {
        setCopyStatus('Copied!');
      } else {
        setCopyStatus('Copy failed');
      }

      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      console.error('Fallback copy failed:', err);
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(''), 2000);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="debug-toggle-button"
        aria-label="Toggle debug console"
      >
        DEBUG ({logs.length})
      </button>

      {/* Debug console panel */}
      {isOpen && (
        <div className={`debug-console ${isMinimized ? 'minimized' : ''}`}>
          <div className="debug-header">
            <div className="debug-title">
              <span>Debug Console</span>
              <span className="log-count">({logs.length} logs)</span>
            </div>
            <div className="debug-controls">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="debug-control-btn"
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? 'v' : '^'}
              </button>
              <button
                onClick={copyAllLogs}
                className="debug-control-btn"
                aria-label="Copy all logs"
                title="Copy all logs"
                disabled={logs.length === 0}
              >
                {copyStatus || 'Copy'}
              </button>
              <button
                onClick={clearLogs}
                className="debug-control-btn"
                aria-label="Clear logs"
                title="Clear logs"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="debug-control-btn"
                aria-label="Close"
                title="Close"
              >
                X
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="debug-logs">
              {logs.length === 0 ? (
                <div className="no-logs">No logs yet...</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="log-entry" data-level={log.level}>
                    <div className="log-header">
                      <span className="log-icon">{getLevelIcon(log.level)}</span>
                      <span className="log-timestamp">{log.timestamp}</span>
                      <span
                        className="log-level"
                        style={{ color: getLevelColor(log.level) }}
                      >
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <pre className="log-message">{log.message}</pre>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}

      <style>{`
        .debug-toggle-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          min-width: 80px;
          height: 50px;
          padding: 0 12px;
          border-radius: 8px;
          background: #1f2937;
          color: white;
          border: 2px solid #3b82f6;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .debug-toggle-button:hover {
          transform: scale(1.05);
          background: #374151;
        }

        .debug-console {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: calc(100vw - 40px);
          max-width: 500px;
          background: #1f2937;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          z-index: 9999;
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }

        .debug-console.minimized {
          height: auto;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #111827;
          border-bottom: 1px solid #374151;
        }

        .debug-title {
          font-size: 14px;
          font-weight: bold;
          color: #f3f4f6;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .log-count {
          font-size: 12px;
          color: #9ca3af;
          font-weight: normal;
        }

        .debug-controls {
          display: flex;
          gap: 8px;
        }

        .debug-control-btn {
          background: transparent;
          border: 1px solid #4b5563;
          color: #f3f4f6;
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .debug-control-btn:hover:not(:disabled) {
          background: #374151;
          border-color: #6b7280;
        }

        .debug-control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .debug-control-btn:active:not(:disabled) {
          background: #4b5563;
          transform: scale(0.95);
        }

        .debug-logs {
          max-height: 60vh;
          overflow-y: auto;
          padding: 8px;
          background: #111827;
        }

        .no-logs {
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }

        .log-entry {
          margin-bottom: 8px;
          padding: 12px;
          background: #1f2937;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
          font-size: 12px;
        }

        .log-entry[data-level="error"] {
          border-left-color: #ef4444;
          background: #1f1416;
        }

        .log-entry[data-level="warn"] {
          border-left-color: #f59e0b;
          background: #1f1b14;
        }

        .log-entry[data-level="info"] {
          border-left-color: #3b82f6;
        }

        .log-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .log-icon {
          font-size: 10px;
          font-weight: bold;
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
        }

        .log-timestamp {
          color: #9ca3af;
          font-size: 11px;
        }

        .log-level {
          font-weight: bold;
          font-size: 10px;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .log-message {
          color: #e5e7eb;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          margin: 0;
          line-height: 1.5;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .debug-toggle-button {
            min-width: 70px;
            height: 44px;
            bottom: 16px;
            right: 16px;
            font-size: 9px;
          }

          .debug-console {
            bottom: 70px;
            right: 16px;
            width: calc(100vw - 32px);
          }

          .debug-logs {
            max-height: 50vh;
          }

          .debug-controls {
            flex-wrap: wrap;
          }

          .debug-control-btn {
            font-size: 10px;
          }
        }
      `}</style>
    </>
  );
}
