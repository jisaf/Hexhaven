/**
 * Player Acknowledgment Status Component
 *
 * Displays the acknowledgment status of all players during a narrative display.
 * Shows check marks for players who have acknowledged and spinners for those who haven't.
 */

import React from 'react';
import type { NarrativeAcknowledgmentState } from '../../hooks/useNarrative';
import './NarrativeOverlay.css';

export interface PlayerAcknowledgmentStatusProps {
  acknowledgments: NarrativeAcknowledgmentState[];
  myPlayerId: string | null;
}

export const PlayerAcknowledgmentStatus: React.FC<
  PlayerAcknowledgmentStatusProps
> = ({ acknowledgments, myPlayerId }) => {
  const waitingCount = acknowledgments.filter((a) => !a.acknowledged).length;

  return (
    <div className="narrative-acknowledgment-status">
      <div className="acknowledgment-list">
        {acknowledgments.map((ack) => (
          <div
            key={ack.playerId}
            className={`acknowledgment-item ${ack.acknowledged ? 'acknowledged' : 'waiting'} ${ack.playerId === myPlayerId ? 'is-me' : ''}`}
          >
            <span className="acknowledgment-icon">
              {ack.acknowledged ? (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              ) : (
                <div className="spinner-small" />
              )}
            </span>
            <span className="acknowledgment-name">
              {ack.playerName}
              {ack.playerId === myPlayerId && ' (you)'}
            </span>
          </div>
        ))}
      </div>
      {waitingCount > 0 && (
        <p className="waiting-message">
          Waiting for {waitingCount} player{waitingCount > 1 ? 's' : ''}...
        </p>
      )}
    </div>
  );
};

export default PlayerAcknowledgmentStatus;
