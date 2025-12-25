/**
 * Narrative Popup Component
 *
 * Modal popup for mid-scenario narrative triggers.
 * Shows narrative text and optional rewards/effects.
 */

import React from 'react';
import type { NarrativeContent, NarrativeRewards, NarrativeGameEffects } from '../../../../shared/types/narrative';
import type { NarrativeAcknowledgmentState } from '../../hooks/useNarrative';
import { PlayerAcknowledgmentStatus } from './PlayerAcknowledgmentStatus';
import './NarrativeOverlay.css';

export interface NarrativePopupProps {
  content: NarrativeContent;
  rewards?: NarrativeRewards;
  gameEffects?: NarrativeGameEffects;
  acknowledgments: NarrativeAcknowledgmentState[];
  myPlayerId: string | null;
  myAcknowledgment: boolean;
  onAcknowledge: () => void;
}

export const NarrativePopup: React.FC<NarrativePopupProps> = ({
  content,
  rewards,
  gameEffects,
  acknowledgments,
  myPlayerId,
  myAcknowledgment,
  onAcknowledge,
}) => {
  const hasRewards = rewards && (rewards.gold || rewards.xp);
  const hasEffects = gameEffects && (
    gameEffects.spawnMonsters?.length ||
    gameEffects.unlockDoors?.length ||
    gameEffects.revealHexes?.length
  );

  return (
    <div className="narrative-popup-overlay" onClick={onAcknowledge}>
      <div className="narrative-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        {content.title && (
          <div className="popup-header">
            <h2 className="popup-title">{content.title}</h2>
          </div>
        )}

        {/* Image if provided */}
        {content.imageUrl && (
          <div className="popup-image-container">
            <img src={content.imageUrl} alt="" className="popup-image" />
          </div>
        )}

        {/* Story text */}
        <div className="popup-text-container">
          <p className="popup-text">{content.text}</p>
        </div>

        {/* Rewards section */}
        {hasRewards && (
          <div className="popup-rewards">
            <h3 className="rewards-header">Rewards</h3>
            <div className="rewards-list">
              {rewards?.gold && (
                <div className="reward-item">
                  <span className="reward-icon gold-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </span>
                  <span className="reward-value">+{rewards.gold} Gold</span>
                </div>
              )}
              {rewards?.xp && (
                <div className="reward-item">
                  <span className="reward-icon xp-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </span>
                  <span className="reward-value">+{rewards.xp} XP</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Effects preview */}
        {hasEffects && (
          <div className="popup-effects">
            <h3 className="effects-header">Something happens...</h3>
            <ul className="effects-list">
              {gameEffects?.spawnMonsters?.length && (
                <li>New enemies appear!</li>
              )}
              {gameEffects?.unlockDoors?.length && (
                <li>A door unlocks!</li>
              )}
              {gameEffects?.revealHexes?.length && (
                <li>New areas are revealed!</li>
              )}
            </ul>
          </div>
        )}

        {/* Player acknowledgment status */}
        <PlayerAcknowledgmentStatus
          acknowledgments={acknowledgments}
          myPlayerId={myPlayerId}
        />

        {/* Dismiss button */}
        <button
          className={`popup-dismiss-button ${myAcknowledgment ? 'acknowledged' : ''}`}
          onClick={onAcknowledge}
          disabled={myAcknowledgment}
        >
          {myAcknowledgment ? 'Waiting for others...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default NarrativePopup;
