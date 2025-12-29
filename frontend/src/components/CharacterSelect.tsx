/**
 * CharacterSelect Component
 *
 * Displays 6 character classes for selection in the lobby.
 * Features:
 * - Grid layout with character cards
 * - Visual feedback for selected character
 * - Disabled state for already-selected characters
 * - Character class descriptions
 * - Touch-optimized selection
 */

import { useTranslation } from 'react-i18next';
import { CharacterClass } from '../../../shared/types/entities';

// Re-export for backward compatibility
export { CharacterClass };

export interface CharacterSelectProps {
  selectedClass?: CharacterClass;
  disabledClasses?: CharacterClass[];
  onSelect: (characterClass: CharacterClass) => void;
  /** Compact mode for inline display (smaller cards, no descriptions) */
  compact?: boolean;
}

const characterColors: Partial<Record<CharacterClass, string>> = {
  [CharacterClass.BRUTE]: '#CC3333',
  [CharacterClass.TINKERER]: '#3399CC',
  [CharacterClass.SPELLWEAVER]: '#9933CC',
  [CharacterClass.SCOUNDREL]: '#33CC33',
  [CharacterClass.CRAGHEART]: '#CC9933',
  [CharacterClass.MINDTHIEF]: '#CC33CC',
};

const characterDescriptions: Partial<Record<CharacterClass, string>> = {
  [CharacterClass.BRUTE]: 'A tanky melee fighter who excels at absorbing damage and dealing heavy blows to adjacent enemies.',
  [CharacterClass.TINKERER]: 'A support specialist who heals allies and summons mechanical contraptions to aid the party.',
  [CharacterClass.SPELLWEAVER]: 'A powerful mage who controls elemental forces to devastate enemies from range.',
  [CharacterClass.SCOUNDREL]: 'An agile rogue who strikes from advantage and uses cunning to outmaneuver foes.',
  [CharacterClass.CRAGHEART]: 'A versatile earth elemental who can manipulate terrain and deals area damage.',
  [CharacterClass.MINDTHIEF]: 'A psionic assassin who augments melee attacks with mind control and illusions.',
};

const characterStats: Partial<Record<CharacterClass, { health: number; handSize: number }>> = {
  [CharacterClass.BRUTE]: { health: 10, handSize: 10 },
  [CharacterClass.TINKERER]: { health: 8, handSize: 12 },
  [CharacterClass.SPELLWEAVER]: { health: 6, handSize: 8 },
  [CharacterClass.SCOUNDREL]: { health: 8, handSize: 9 },
  [CharacterClass.CRAGHEART]: { health: 10, handSize: 11 },
  [CharacterClass.MINDTHIEF]: { health: 6, handSize: 10 },
};

export function CharacterSelect({ selectedClass, disabledClasses = [], onSelect, compact = false }: CharacterSelectProps) {
  const { t } = useTranslation();

  const characters: CharacterClass[] = [
    CharacterClass.BRUTE,
    CharacterClass.TINKERER,
    CharacterClass.SPELLWEAVER,
    CharacterClass.SCOUNDREL,
    CharacterClass.CRAGHEART,
    CharacterClass.MINDTHIEF,
  ];

  const handleSelect = (characterClass: CharacterClass) => {
    if (!disabledClasses.includes(characterClass)) {
      onSelect(characterClass);
    }
  };

  return (
    <div className={`character-select ${compact ? 'compact' : ''}`} data-testid="character-select">
      {!compact && (
        <h3 className="character-select-title">
          {t('lobby:selectCharacter', 'Select Your Character')}
        </h3>
      )}

      <div className="character-grid">
        {characters.map((characterClass) => {
          const isSelected = selectedClass === characterClass;
          const isDisabled = disabledClasses.includes(characterClass);
          const color = characterColors[characterClass];
          const stats = characterStats[characterClass];

          return (
            <button
              key={characterClass}
              className={`character-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => handleSelect(characterClass)}
              disabled={isDisabled}
              style={{
                '--character-color': color,
              } as React.CSSProperties}
              aria-label={`${t(`characters.${characterClass}.name`, characterClass)}`}
              aria-pressed={isSelected}
              data-testid={`character-card-${characterClass}`}
            >
              <div className="character-icon" style={{ backgroundColor: color }}>
                {characterClass.charAt(0)}
              </div>

              <div className="character-info">
                <div className="character-name">
                  {t(`characters.${characterClass}.name`, characterClass)}
                </div>
                {!compact && (
                  <div className="character-description" data-testid="character-description">
                    {t(
                      `characters.${characterClass}.description`,
                      characterDescriptions[characterClass] ?? ''
                    )}
                  </div>
                )}
                <div className="character-stats">
                  <div className="stat-item">
                    <span className="stat-label">❤️</span>
                    <span className="stat-value" data-testid="character-health">{stats?.health ?? 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">🃏</span>
                    <span className="stat-value" data-testid="character-hand-size">{stats?.handSize ?? 0}</span>
                  </div>
                </div>
              </div>

              {isSelected && <div className="selected-indicator">✓</div>}
              {isDisabled && (
                <div className="disabled-overlay">
                  <span>{t('lobby:taken', 'Taken')}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        .character-select {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        .character-select-title {
          margin: 0 0 24px 0;
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          text-align: center;
        }

        .character-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .character-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: #2c2c2c;
          border: 3px solid #444;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 160px;
          text-align: center;
        }

        .character-card:hover:not(:disabled) {
          border-color: var(--character-color);
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .character-card.selected {
          border-color: var(--character-color);
          background: rgba(255, 255, 255, 0.05);
        }

        .character-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .character-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
          color: #ffffff;
          border-radius: 50%;
          margin-bottom: 12px;
        }

        .character-info {
          flex: 1;
        }

        .character-name {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .character-description {
          font-size: 13px;
          color: #aaa;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .character-stats {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 8px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
        }

        .stat-label {
          color: #999;
          font-weight: 500;
        }

        .stat-value {
          color: #ffffff;
          font-weight: 600;
        }

        .selected-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #ffffff;
          background: var(--character-color);
          border-radius: 50%;
        }

        .disabled-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 12px;
        }

        .disabled-overlay span {
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: #ef4444;
          border-radius: 8px;
        }

        @media (max-width: 768px) {
          .character-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .character-grid {
            grid-template-columns: 1fr;
          }

          .character-card {
            flex-direction: row;
            text-align: left;
            gap: 16px;
          }

          .character-icon {
            width: 56px;
            height: 56px;
            font-size: 28px;
            margin-bottom: 0;
            flex-shrink: 0;
          }
        }

        /* Compact mode for inline display */
        .character-select.compact .character-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .character-select.compact .character-card {
          padding: 12px;
          min-height: 80px;
          flex-direction: row;
          gap: 8px;
        }

        .character-select.compact .character-icon {
          width: 40px;
          height: 40px;
          font-size: 20px;
          margin-bottom: 0;
          flex-shrink: 0;
        }

        .character-select.compact .character-name {
          font-size: 14px;
          margin-bottom: 4px;
        }

        .character-select.compact .character-stats {
          gap: 8px;
          margin-top: 4px;
        }

        .character-select.compact .stat-item {
          font-size: 12px;
          gap: 2px;
        }

        .character-select.compact .selected-indicator {
          width: 24px;
          height: 24px;
          font-size: 14px;
          top: 8px;
          right: 8px;
        }

        @media (max-width: 600px) {
          .character-select.compact .character-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
