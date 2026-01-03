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
 * Uses FloatingChip component for consistent chip rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Character, Monster } from '../../../../shared/types/entities';
import { characterClassService } from '../../services/character-class.service';
import { FloatingChip } from './FloatingChip';

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
                <FloatingChip
                  key={char.id}
                  id={char.id}
                  icon={char.classType.charAt(0)}
                  color={color}
                  intensity="full"
                  ringPercent={healthPct}
                  ringColor={getHealthColor(healthPct)}
                  isActive={isActive}
                  isTurn={isTurn}
                  onClick={() => onSwitchCharacter(index)}
                  title={`${char.classType} - ${char.health}/${char.maxHealth} HP`}
                  overlay={char.isExhausted ? '💀' : undefined}
                  testId={`character-chip-${index}`}
                  className="character-chip"
                />
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
                <FloatingChip
                  key={monster.id}
                  id={monster.id}
                  icon={monster.monsterType.charAt(0)}
                  color={color}
                  intensity="full"
                  ringPercent={healthPct}
                  ringColor={getHealthColor(healthPct)}
                  isTurn={isTurn}
                  onClick={() => onMonsterClick?.(monster)}
                  title={`${monster.isElite ? 'Elite ' : ''}${monster.monsterType} - ${monster.health}/${monster.maxHealth} HP`}
                  badge={monster.isElite ? '★' : undefined}
                  testId={`monster-chip-${monster.id}`}
                  className="monster-chip"
                />
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

        @media (max-width: 768px) {
          .entity-chips-panel {
            left: 8px;
            top: 8px;
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
