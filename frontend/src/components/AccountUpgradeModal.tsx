import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * T206 [US7] Create AccountUpgradeModal component
 *
 * Modal for upgrading anonymous account to registered account.
 * Shows progress summary and confirmation.
 */

interface AnonymousProgress {
  scenariosCompleted: number;
  totalExperience: number;
  charactersPlayed: string[];
}

interface AccountUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  anonymousProgress: AnonymousProgress | null;
}

export const AccountUpgradeModal: React.FC<AccountUpgradeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  anonymousProgress,
}) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);

    try {
      await onConfirm();
      // Modal will be closed by parent after successful confirmation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      setIsConfirming(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      data-testid="account-upgrade-modal"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t('account.upgrade.title', 'Create Account')}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            {t('account.upgrade.description',
              'Create an account to save your progress and access it across devices.'
            )}
          </p>

          {anonymousProgress && anonymousProgress.scenariosCompleted > 0 && (
            <div className="progress-summary">
              <h3>{t('account.upgrade.yourProgress', 'Your Progress')}</h3>
              <div className="progress-stats">
                <div className="stat-item">
                  <span className="stat-label">
                    {t('account.scenariosCompleted', 'Scenarios Completed')}:
                  </span>
                  <span className="stat-value">
                    {anonymousProgress.scenariosCompleted}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">
                    {t('account.totalExperience', 'Total Experience')}:
                  </span>
                  <span className="stat-value">
                    {anonymousProgress.totalExperience}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">
                    {t('account.charactersPlayed', 'Characters Played')}:
                  </span>
                  <span className="stat-value">
                    {anonymousProgress.charactersPlayed.length}
                  </span>
                </div>
              </div>
              <p className="progress-note">
                {t('account.upgrade.progressNote',
                  'All your progress will be saved to your account.'
                )}
              </p>
            </div>
          )}

          {anonymousProgress && anonymousProgress.scenariosCompleted === 0 && (
            <div className="no-progress-note">
              <p>
                {t('account.upgrade.noProgress',
                  'You haven\'t completed any scenarios yet, but creating an account will save your future progress.'
                )}
              </p>
            </div>
          )}

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="button button-secondary"
            onClick={onClose}
            disabled={isConfirming}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            className="button button-primary"
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming
              ? t('account.upgrade.creating', 'Creating Account...')
              : t('common.confirm', 'Confirm')
            }
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #1a1a2e;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #2a2a3e;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #fff;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 2rem;
          color: #aaa;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #fff;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-description {
          color: #ccc;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .progress-summary {
          background: #2a2a3e;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .progress-summary h3 {
          margin: 0 0 12px 0;
          font-size: 1.1rem;
          color: #4ecdc4;
        }

        .progress-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          color: #aaa;
          font-size: 0.9rem;
        }

        .stat-value {
          color: #fff;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .progress-note {
          margin-top: 12px;
          font-size: 0.85rem;
          color: #888;
          font-style: italic;
        }

        .no-progress-note {
          background: #2a2a3e;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .no-progress-note p {
          margin: 0;
          color: #aaa;
          line-height: 1.5;
        }

        .error-message {
          background: #d32f2f;
          color: #fff;
          padding: 12px;
          border-radius: 6px;
          margin-top: 16px;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #2a2a3e;
          justify-content: flex-end;
        }

        .button {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button-secondary {
          background: #444;
          color: #fff;
        }

        .button-secondary:hover:not(:disabled) {
          background: #555;
        }

        .button-primary {
          background: #4ecdc4;
          color: #1a1a2e;
          font-weight: 600;
        }

        .button-primary:hover:not(:disabled) {
          background: #5fd8cf;
        }

        @media (max-width: 600px) {
          .modal-content {
            width: 95%;
            max-height: 95vh;
          }

          .modal-header h2 {
            font-size: 1.25rem;
          }

          .button {
            min-width: 80px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};
