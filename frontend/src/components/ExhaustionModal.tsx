/**
 * ExhaustionModal Component
 *
 * Displayed when a player becomes exhausted (0 HP or insufficient cards).
 * Explains what happened and what happens next.
 */

import React from 'react';
import './ExhaustionModal.css';

interface ExhaustionModalProps {
  visible: boolean;
  characterName: string;
  reason: 'damage' | 'insufficient_cards';
  onAcknowledge: () => void;
}

export const ExhaustionModal: React.FC<ExhaustionModalProps> = ({
  visible,
  characterName,
  reason,
  onAcknowledge,
}) => {
  if (!visible) return null;

  const reasonText = reason === 'damage'
    ? `${characterName} has fallen! (0 HP)`
    : `${characterName} is exhausted! (No cards to play or rest)`;

  const reasonEmoji = reason === 'damage' ? '💀' : '🎴';

  return (
    <div className="exhaustion-modal-overlay" role="alertdialog" aria-modal="true">
      <div className="exhaustion-modal">
        <div className="exhaustion-icon">{reasonEmoji}</div>
        <h2 className="exhaustion-title">Exhausted</h2>
        <p className="exhaustion-reason">{reasonText}</p>
        <div className="exhaustion-consequences">
          <h3 className="consequences-title">What happens now:</h3>
          <ul className="consequences-list">
            <li>All cards moved to lost pile</li>
            <li>Removed from the board</li>
            <li>Cannot participate further this scenario</li>
            <li>Other players can continue</li>
          </ul>
        </div>
        <button
          className="exhaustion-btn"
          onClick={onAcknowledge}
          data-testid="exhaustion-acknowledge-btn"
        >
          Understood
        </button>
      </div>
    </div>
  );
};
