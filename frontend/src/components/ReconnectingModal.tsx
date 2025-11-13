/**
 * ReconnectingModal Component (US4 - T155, T161)
 *
 * Displays a modal overlay with "Reconnecting..." message when the player
 * loses connection to the game server. Shows reconnection status and
 * connection state updates.
 */

import React from 'react';
import './ReconnectingModal.css';

interface ReconnectingModalProps {
  isVisible: boolean;
  reconnectAttempt?: number;
  maxAttempts?: number;
  status?: 'connecting' | 'connected' | 'failed';
}

export const ReconnectingModal: React.FC<ReconnectingModalProps> = ({
  isVisible,
  reconnectAttempt = 1,
  maxAttempts = 5,
  status = 'connecting',
}) => {
  if (!isVisible) {
    return null;
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'connecting':
        return `Reconnecting... (Attempt ${reconnectAttempt}/${maxAttempts})`;
      case 'connected':
        return 'Connected!';
      case 'failed':
        return 'Connection failed. Please refresh the page.';
      default:
        return 'Reconnecting...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
        return (
          <div className="reconnecting-spinner" aria-label="Reconnecting">
            <div className="spinner"></div>
          </div>
        );
      case 'connected':
        return (
          <div className="reconnecting-success" aria-label="Connected">
            ✓
          </div>
        );
      case 'failed':
        return (
          <div className="reconnecting-error" aria-label="Connection failed">
            ✕
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="reconnecting-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconnecting-title"
      data-testid="reconnecting-modal"
    >
      <div className="reconnecting-modal">
        {getStatusIcon()}
        <h2 id="reconnecting-title" className="reconnecting-title">
          {getStatusMessage()}
        </h2>
        {status === 'connecting' && (
          <p className="reconnecting-message">
            Please wait while we restore your connection...
          </p>
        )}
        {status === 'connected' && (
          <p className="reconnecting-message">
            Your connection has been restored.
          </p>
        )}
        {status === 'failed' && (
          <button
            className="reconnecting-refresh-btn"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        )}
      </div>
    </div>
  );
};
