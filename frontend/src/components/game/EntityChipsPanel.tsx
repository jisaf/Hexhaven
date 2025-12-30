/**
 * EntityChipsPanel Component
 *
 * Floating panel on the left side of the game board showing all entities.
 * Features:
 * - Player's characters (top section) - tap to switch active character
 * - All monsters in scenario (bottom section) - tap to view abilities
 * - Health indicators on each chip
 * - Turn indicator (glow/highlight)
 * - Always visible during gameplay
 *
 * Character colors are now fetched from the database via the character class service.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Character, Monster } from '../../../../shared/types/entities';
import { characterClassService } from '../../services/character-class.service';

// Monster type colors
const monsterColors: Record<string, string> = {
  Bandit: '#8B4513',
  'Bandit Guard': '#8B4513',
  'Bandit Archer': '#654321',
  Cultist: '#660066',
  Skeleton: '#CCCCCC',
  'Living Bones': '#D4C4A8',
  'Living Spirit': '#87CEEB',
  Ooze: '#32CD32',
  default: '#666666',
};

interface EntityChipsPanelProps {
  /** All characters controlled by the current player */
  myCharacters: Character[];
  /** Index of the currently active character */
  activeCharacterIndex: number;
  /** All monsters in the scenario */
  monsters: Monster[];
  /** ID of the entity whose turn it currently is */
  currentTurnEntityId: string | null;
  /** Callback when player switches active character */
  onSwitchCharacter: (index: number) => void;
  /** Callback when player taps a monster chip */
  onMonsterClick?: (monster: Monster) => void;
}

export function EntityChipsPanel({
  myCharacters,
  activeCharacterIndex,
  monsters,
  currentTurnEntityId,
  onSwitchCharacter,
  onMonsterClick,
}: EntityChipsPanelProps) {
  const [expandedSection, setExpandedSection] = useState<'characters' | 'monsters' | null>(null);
  const [characterColors, setCharacterColors] = useState<Record<string, string>>({});

  // Load character colors from database on mount
  useEffect(() => {
    const loadColors = async () => {
      try {
        const classes = await characterClassService.getCharacterClasses();
        const colorMap: Record<string, string> = {};
        classes.forEach((c) => {
          colorMap[c.name] = c.color;
        });
        setCharacterColors(colorMap);
      } catch (err) {
        // Fall back to default colors on error
        console.warn('Failed to load character colors from database:', err);
      }
    };
    loadColors();
  }, []);

  const getCharacterColor = useCallback((classType: string): string => {
    return characterColors[classType] || '#666666';
  }, [characterColors]);

  const getMonsterColor = (monsterTypeName: string): string => {
    return monsterColors[monsterTypeName] || monsterColors.default;
  };

  const getHealthPercentage = (current: number, max: number): number => {
    return Math.max(0, Math.min(100, (current / max) * 100));
  };

  const getHealthColor = (percentage: number): string => {
    if (percentage > 60) return '#4ade80';
    if (percentage > 30) return '#fbbf24';
    return '#ef4444';
  };

  const livingMonsters = monsters.filter(m => m.health > 0);

  return (
    <div className="entity-chips-panel" data-testid="entity-chips-panel">
      {/* Characters Section */}
      {myCharacters.length > 0 && (
        <div className="section characters-section">
          <div
            className="section-header"
            onClick={() => setExpandedSection(expandedSection === 'characters' ? null : 'characters')}
          >
            <span className="section-icon">⚔️</span>
            <span className="section-count">{myCharacters.length}</span>
          </div>

          <div className={`chips-container ${expandedSection === 'characters' ? 'expanded' : ''}`}>
            {myCharacters.map((char, index) => {
              const isActive = index === activeCharacterIndex;
              const isTurn = char.id === currentTurnEntityId;
              const healthPct = getHealthPercentage(char.health, char.maxHealth);
              const color = getCharacterColor(char.classType);

              return (
                <button
                  key={char.id}
                  className={`entity-chip character-chip ${isActive ? 'active' : ''} ${isTurn ? 'current-turn' : ''} ${char.isExhausted ? 'exhausted' : ''}`}
                  onClick={() => onSwitchCharacter(index)}
                  style={{ '--entity-color': color } as React.CSSProperties}
                  title={`${char.classType} - ${char.health}/${char.maxHealth} HP`}
                  data-testid={`character-chip-${index}`}
                >
                  <div className="chip-icon" style={{ backgroundColor: color }}>
                    {char.classType.charAt(0)}
                  </div>
                  <div
                    className="health-ring"
                    style={{
                      background: `conic-gradient(${getHealthColor(healthPct)} ${healthPct}%, transparent ${healthPct}%)`,
                    }}
                  />
                  {isTurn && <div className="turn-indicator" />}
                  {char.isExhausted && <div className="exhausted-overlay">💀</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Monsters Section */}
      {livingMonsters.length > 0 && (
        <div className="section monsters-section">
          <div
            className="section-header"
            onClick={() => setExpandedSection(expandedSection === 'monsters' ? null : 'monsters')}
          >
            <span className="section-icon">👹</span>
            <span className="section-count">{livingMonsters.length}</span>
          </div>

          <div className={`chips-container ${expandedSection === 'monsters' ? 'expanded' : ''}`}>
            {livingMonsters.map((monster) => {
              const isTurn = monster.id === currentTurnEntityId;
              const healthPct = getHealthPercentage(monster.health, monster.maxHealth);
              const color = getMonsterColor(monster.monsterType);

              return (
                <button
                  key={monster.id}
                  className={`entity-chip monster-chip ${isTurn ? 'current-turn' : ''} ${monster.isElite ? 'elite' : ''}`}
                  onClick={() => onMonsterClick?.(monster)}
                  style={{ '--entity-color': color } as React.CSSProperties}
                  title={`${monster.isElite ? 'Elite ' : ''}${monster.monsterType} - ${monster.health}/${monster.maxHealth} HP`}
                  data-testid={`monster-chip-${monster.id}`}
                >
                  <div className="chip-icon" style={{ backgroundColor: color }}>
                    {monster.monsterType.charAt(0)}
                  </div>
                  <div
                    className="health-ring"
                    style={{
                      background: `conic-gradient(${getHealthColor(healthPct)} ${healthPct}%, transparent ${healthPct}%)`,
                    }}
                  />
                  {isTurn && <div className="turn-indicator" />}
                  {monster.isElite && <div className="elite-badge">★</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .entity-chips-panel {
          position: absolute;
          left: 12px;
          top: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 100;
          pointer-events: auto;
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: transparent;
          border-radius: 24px;
          padding: 4px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 12px;
          transition: background 0.2s;
          background: rgba(0, 0, 0, 0.5);
        }

        .section-header:hover {
          background: rgba(0, 0, 0, 0.7);
        }

        .section-icon {
          font-size: 14px;
        }

        .section-count {
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        }

        .chips-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 200px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        }

        .chips-container.expanded {
          max-height: 400px;
        }

        .chips-container::-webkit-scrollbar {
          width: 4px;
        }

        .chips-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .chips-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        .entity-chip {
          position: relative;
          width: 44px;
          height: 44px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .entity-chip:hover {
          transform: scale(1.1);
        }

        .chip-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          color: #ffffff;
          border-radius: 50%;
          z-index: 2;
        }

        .health-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          z-index: 1;
        }

        .character-chip.active {
          transform: scale(1.15);
        }

        .character-chip.active .chip-icon {
          box-shadow: 0 0 0 3px #5a9fd4, 0 0 12px rgba(90, 159, 212, 0.5);
        }

        .entity-chip.current-turn {
          animation: turn-pulse 1.5s ease-in-out infinite;
        }

        .turn-indicator {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: #fbbf24;
          border: 2px solid #000;
          border-radius: 50%;
          z-index: 3;
        }

        .elite-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #fbbf24;
          background: #000;
          border: 1px solid #fbbf24;
          border-radius: 50%;
          z-index: 3;
        }

        .exhausted-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 20px;
          z-index: 4;
        }

        .character-chip.exhausted .chip-icon {
          opacity: 0.4;
          filter: grayscale(100%);
        }

        @keyframes turn-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
          }
        }

        @media (max-width: 768px) {
          .entity-chips-panel {
            left: 8px;
            top: 8px;
          }

          .entity-chip {
            width: 36px;
            height: 36px;
          }

          .chip-icon {
            width: 26px;
            height: 26px;
            font-size: 14px;
          }

          .chips-container {
            max-height: 150px;
          }

          .chips-container.expanded {
            max-height: 280px;
          }
        }
      `}</style>
    </div>
  );
}
