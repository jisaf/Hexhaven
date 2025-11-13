/**
 * PlayerDisconnectedBanner Component (US4 - T156)
 *
 * Displays a banner notification when another player in the game
 * disconnects or reconnects. Shows player name and connection status.
 */

import React, { useEffect, useState } from 'react';
import './PlayerDisconnectedBanner.css';

interface PlayerDisconnectedBannerProps {
  playerName: string;
  status: 'disconnected' | 'reconnected';
  onDismiss?: () => void;
  autoDismissDelay?: number; // milliseconds
}

export const PlayerDisconnectedBanner: React.FC<
  PlayerDisconnectedBannerProps
> = ({ playerName, status, onDismiss, autoDismissDelay = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (status === 'reconnected' && autoDismissDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [status, autoDismissDelay, onDismiss]);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const getStatusIcon = () => {
    if (status === 'disconnected') {
      return (
        <svg
          className="banner-icon disconnected-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Disconnected"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path
            d="M8 8L16 16M16 8L8 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="banner-icon reconnected-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Reconnected"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path
            d="M8 12L11 15L16 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
  };

  const getMessage = () => {
    if (status === 'disconnected') {
      return `${playerName} has disconnected`;
    } else {
      return `${playerName} has reconnected`;
    }
  };

  const bannerClass = `player-banner ${status === 'disconnected' ? 'banner-warning' : 'banner-success'}`;

  return (
    <div
      className={bannerClass}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="banner-content">
        {getStatusIcon()}
        <span className="banner-message">{getMessage()}</span>
      </div>
      <button
        className="banner-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
};
