/**
 * ConnectionStatus Component (Phase 1 - WebSocket Reliability)
 *
 * Persistent visual indicator showing WebSocket connection state.
 * Displays in the corner of the game board to inform players of their
 * connection status without blocking interaction.
 *
 * States:
 * - Green dot: Connected
 * - Yellow dot + spinner: Reconnecting
 * - Red dot: Disconnected
 */

import React from 'react';
import './ConnectionStatus.css';

export type ConnectionStatusType = 'connected' | 'disconnected' | 'reconnecting';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  showLabel?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  showLabel = false,
  className = '',
}) => {
  const getStatusLabel = (): string => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'connected':
        return 'status-connected';
      case 'reconnecting':
        return 'status-reconnecting';
      case 'disconnected':
        return 'status-disconnected';
      default:
        return '';
    }
  };

  return (
    <div
      className={`connection-status ${getStatusColor()} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${getStatusLabel()}`}
      data-testid="connection-status"
    >
      <div className="status-indicator">
        {status === 'reconnecting' && (
          <div className="status-spinner" aria-hidden="true" />
        )}
        <div className="status-dot" aria-hidden="true" />
      </div>
      {showLabel && (
        <span className="status-label">{getStatusLabel()}</span>
      )}
    </div>
  );
};

export default ConnectionStatus;
