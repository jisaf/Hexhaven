/**
 * RestModal Component
 *
 * Displays rest UI for short rest, long rest, and exhaustion.
 * Follows event-driven pattern with gameStateManager.
 */

import React from 'react';
import './RestModal.css';
import type { RestState } from '../services/game-state.service';

interface RestModalProps {
  restState: RestState | null;
  onAccept: () => void;
  onReroll: () => void;
  onConfirmLongRest?: (cardId: string) => void;
  onClose?: () => void;
}

export const RestModal: React.FC<RestModalProps> = ({
  restState,
  onAccept,
  onReroll,
  onConfirmLongRest,
  onClose,
}) => {
  const [selectedCard, setSelectedCard] = React.useState<string | null>(null);

  if (!restState) {
    return null;
  }

  const renderContent = () => {
    switch (restState.stage) {
      case 'rest-started':
        return (
          <div className="rest-modal-content">
            <div className="rest-spinner">
              <div className="spinner"></div>
            </div>
            <h2 className="rest-title">
              {restState.restType === 'short' ? 'Short Rest' : 'Long Rest'}
            </h2>
            <p className="rest-message">Preparing rest...</p>
          </div>
        );

      case 'card-selected':
      case 'awaiting-decision':
        if (restState.restType === 'short') {
          return (
            <div className="rest-modal-content">
              <h2 className="rest-title">Short Rest</h2>
              <div className="rest-card-display">
                <div className="random-card-label">Random Card to Lose:</div>
                <div className="random-card-id">{restState.randomCardId}</div>
              </div>

              {restState.canReroll && (
                <div className="reroll-option">
                  <p className="reroll-warning">
                    You can reroll once for 1 HP damage
                  </p>
                  <p className="current-health">
                    Current HP: <span className="health-value">{restState.currentHealth}</span>
                  </p>
                </div>
              )}

              <div className="rest-actions">
                <button
                  className="rest-btn rest-btn-accept"
                  onClick={onAccept}
                  data-testid="accept-rest-btn"
                >
                  Accept
                </button>
                {restState.canReroll && (
                  <button
                    className="rest-btn rest-btn-reroll"
                    onClick={onReroll}
                    disabled={restState.currentHealth <= 1}
                    data-testid="reroll-rest-btn"
                    title={
                      restState.currentHealth <= 1
                        ? 'Cannot reroll - would cause exhaustion'
                        : 'Reroll for 1 HP damage'
                    }
                  >
                    Reroll (-1 HP)
                  </button>
                )}
              </div>
            </div>
          );
        } else {
          // Long rest (shouldn't reach here, long rest is immediate)
          return (
            <div className="rest-modal-content">
              <h2 className="rest-title">Long Rest</h2>
              <p className="rest-message">Completing long rest...</p>
            </div>
          );
        }

      case 'long-selection':
        return (
          <div className="rest-modal-content">
            <h2 className="rest-title">Long Rest</h2>
            <p className="rest-instructions">Choose a card to lose:</p>
            <div className="discard-pile-grid">
              {(restState.discardPileCards || []).map(cardId => (
                <button
                  key={cardId}
                  className={`card-option ${selectedCard === cardId ? 'selected' : ''}`}
                  onClick={() => setSelectedCard(cardId)}
                  data-testid={`card-option-${cardId}`}
                >
                  {cardId}
                </button>
              ))}
            </div>
            <div className="rest-benefits">
              <span className="benefit-item">✨ Heal 2 HP</span>
              <span className="benefit-item">🔄 Refresh Discard Pile</span>
            </div>
            <button
              className="rest-btn rest-btn-confirm"
              disabled={!selectedCard}
              onClick={() => {
                if (selectedCard && onConfirmLongRest) {
                  onConfirmLongRest(selectedCard);
                }
              }}
              data-testid="confirm-long-rest-btn"
              title={!selectedCard ? 'Select a card to continue' : 'Confirm long rest'}
            >
              Confirm Long Rest
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="rest-modal-content">
            <div className="rest-success-icon">✓</div>
            <h2 className="rest-title">Rest Complete</h2>
            <p className="rest-message">Cards returned to hand</p>
            {onClose && (
              <button
                className="rest-btn rest-btn-close"
                onClick={onClose}
                data-testid="close-rest-btn"
              >
                Close
              </button>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="rest-modal-content">
            <div className="rest-error-icon">✕</div>
            <h2 className="rest-title rest-title-error">Rest Failed</h2>
            <p className="rest-error-message">{restState.errorMessage}</p>
            {onClose && (
              <button
                className="rest-btn rest-btn-close"
                onClick={onClose}
                data-testid="close-rest-btn"
              >
                Close
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="rest-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rest-modal-title"
      data-testid="rest-modal"
    >
      <div className="rest-modal">{renderContent()}</div>
    </div>
  );
};
