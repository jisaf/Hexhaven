/**
 * Narrative Story Page Component
 *
 * Full-screen story page for intro and outro narratives.
 * Used for before-scenario and after-scenario (victory/defeat) narratives.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { NarrativeContent, NarrativeType } from '../../../../shared/types/narrative';
import type { NarrativeAcknowledgmentState } from '../../hooks/useNarrative';
import { PlayerAcknowledgmentStatus } from './PlayerAcknowledgmentStatus';
import './NarrativeOverlay.css';

export interface NarrativeStoryPageProps {
  type: NarrativeType;
  content: NarrativeContent;
  acknowledgments: NarrativeAcknowledgmentState[];
  myPlayerId: string | null;
  myAcknowledgment: boolean;
  onAcknowledge: () => void;
}

export const NarrativeStoryPage: React.FC<NarrativeStoryPageProps> = ({
  type,
  content,
  acknowledgments,
  myPlayerId,
  myAcknowledgment,
  onAcknowledge,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getHeaderClass = () => {
    switch (type) {
      case 'victory':
        return 'story-header victory';
      case 'defeat':
        return 'story-header defeat';
      case 'intro':
      default:
        return 'story-header intro';
    }
  };

  const getButtonText = () => {
    if (myAcknowledgment) {
      return 'Waiting for others...';
    }
    switch (type) {
      case 'intro':
        return 'Begin Scenario';
      case 'victory':
      case 'defeat':
        return 'Continue';
      default:
        return 'Continue';
    }
  };

  // Keyboard handler for Enter/Space to acknowledge
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !myAcknowledgment) {
        e.preventDefault();
        onAcknowledge();
      }
    },
    [myAcknowledgment, onAcknowledge],
  );

  // Focus button on mount and attach keyboard listener
  useEffect(() => {
    buttonRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="narrative-story-page" role="dialog" aria-modal="true">
      <div className="story-content-wrapper">
        {/* Background image if provided */}
        {content.imageUrl && (
          <div
            className="story-background-image"
            style={{ backgroundImage: `url(${content.imageUrl})` }}
          />
        )}

        <div className="story-content">
          {/* Header with type indicator */}
          <div className={getHeaderClass()}>
            {type === 'victory' && (
              <div className="story-icon victory-icon">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            )}
            {type === 'defeat' && (
              <div className="story-icon defeat-icon">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </div>
            )}
            {content.title && <h1 className="story-title">{content.title}</h1>}
          </div>

          {/* Story text */}
          <div className="story-text-container">
            <p className="story-text">{content.text}</p>
          </div>

          {/* Player acknowledgment status */}
          <PlayerAcknowledgmentStatus
            acknowledgments={acknowledgments}
            myPlayerId={myPlayerId}
          />

          {/* Continue button */}
          <button
            ref={buttonRef}
            className={`story-continue-button ${myAcknowledgment ? 'acknowledged' : ''}`}
            onClick={onAcknowledge}
            disabled={myAcknowledgment}
            aria-label={myAcknowledgment ? 'Waiting for others to acknowledge' : getButtonText()}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NarrativeStoryPage;
