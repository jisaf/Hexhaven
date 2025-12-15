/**
 * MonsterAbilityOverlay Component
 *
 * Small floating overlay that appears when a monster chip is tapped.
 * Shows the monster's ability card for the current round.
 * Not a modal - appears near the monster chip and can be dismissed.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Monster } from '../../../../shared/types/entities';

interface MonsterAbilityOverlayProps {
  /** The monster to show abilities for */
  monster: Monster;
  /** Callback to close the overlay */
  onClose: () => void;
}

export function MonsterAbilityOverlay({
  monster,
  onClose,
}: MonsterAbilityOverlayProps) {
  const { t } = useTranslation('game');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add listener with a small delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Get monster ability data (placeholder for now - would come from game state)
  const abilityCard = {
    name: monster.monsterType,
    initiative: 35, // Would come from monster ability deck
    actions: [
      { type: 'move', value: monster.movement || 2 },
      { type: 'attack', value: monster.attack || 2, range: monster.range || 0 },
    ],
  };

  return (
    <div className="monster-ability-overlay" ref={overlayRef} data-testid="monster-ability-overlay">
      <div className="overlay-header">
        <span className="monster-name">
          {monster.isElite && <span className="elite-marker">★</span>}
          {monster.monsterType}
        </span>
        <button className="close-button" onClick={onClose} aria-label={t('close', 'Close')}>
          ×
        </button>
      </div>

      <div className="overlay-content">
        <div className="stats-row">
          <div className="stat">
            <span className="stat-label">❤️</span>
            <span className="stat-value">{monster.health}/{monster.maxHealth}</span>
          </div>
          <div className="stat">
            <span className="stat-label">⚔️</span>
            <span className="stat-value">{monster.attack || '?'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">🏃</span>
            <span className="stat-value">{monster.movement || 0}</span>
          </div>
        </div>

        <div className="ability-section">
          <div className="initiative-badge">
            {abilityCard.initiative}
          </div>
          <div className="actions-list">
            {abilityCard.actions.map((action, index) => (
              <div key={index} className="action-item">
                {action.type === 'move' && (
                  <>
                    <span className="action-icon">👣</span>
                    <span className="action-text">Move {action.value}</span>
                  </>
                )}
                {action.type === 'attack' && (
                  <>
                    <span className="action-icon">⚔️</span>
                    <span className="action-text">
                      Attack {action.value}
                      {action.range && action.range > 0 && ` (Range ${action.range})`}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Special abilities / status effects */}
        {monster.isElite && (
          <div className="special-section">
            <span className="special-label">{t('elite', 'Elite')}</span>
            <span className="special-text">+2 HP, +1 Attack</span>
          </div>
        )}
      </div>

      <style>{`
        .monster-ability-overlay {
          position: absolute;
          left: 70px;
          top: 12px;
          width: 220px;
          background: rgba(30, 30, 30, 0.95);
          border: 2px solid #555;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          z-index: 150;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .overlay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #444;
        }

        .monster-name {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .elite-marker {
          color: #fbbf24;
          font-size: 14px;
        }

        .close-button {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #888;
          background: transparent;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-button:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .overlay-content {
          padding: 12px 16px;
        }

        .stats-row {
          display: flex;
          justify-content: space-around;
          padding-bottom: 12px;
          border-bottom: 1px solid #333;
          margin-bottom: 12px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .stat-label {
          font-size: 14px;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .ability-section {
          display: flex;
          gap: 12px;
        }

        .initiative-badge {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          color: #ffffff;
          background: linear-gradient(135deg, #4a5568, #2d3748);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .actions-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .action-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #ddd;
        }

        .action-icon {
          font-size: 14px;
        }

        .action-text {
          font-weight: 500;
        }

        .special-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #333;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .special-label {
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.2);
          border-radius: 4px;
        }

        .special-text {
          font-size: 12px;
          color: #888;
        }

        /* Arrow pointing to the chip */
        .monster-ability-overlay::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 20px;
          border: 8px solid transparent;
          border-right-color: #555;
        }

        .monster-ability-overlay::after {
          content: '';
          position: absolute;
          left: -6px;
          top: 22px;
          border: 6px solid transparent;
          border-right-color: rgba(30, 30, 30, 0.95);
        }

        @media (max-width: 768px) {
          .monster-ability-overlay {
            width: 200px;
            left: 56px;
            top: 8px;
          }

          .overlay-content {
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
}
