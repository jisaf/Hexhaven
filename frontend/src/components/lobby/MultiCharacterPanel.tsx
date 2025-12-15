/**
 * MultiCharacterPanel Component
 *
 * Allows players to select multiple characters (up to 4) in the lobby.
 * Features:
 * - Inline character selection (no modals)
 * - Shows selected characters as removable chips
 * - "Add Character" button that expands inline selection
 * - Supports both authenticated (persistent) and anonymous (session) users
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterSelect, type CharacterClass } from '../CharacterSelect';
import { UserCharacterSelect } from '../UserCharacterSelect';
import { authService } from '../../services/auth.service';
import { MAX_CHARACTERS_PER_PLAYER } from '../../../../shared/constants/game';
import { getCharacterColor } from '../../../../shared/utils/character-colors';
import styles from './MultiCharacterPanel.module.css';

// Re-export for backward compatibility
export { MAX_CHARACTERS_PER_PLAYER } from '../../../../shared/constants/game';
export { getCharacterColor } from '../../../../shared/utils/character-colors';

export interface SelectedCharacter {
  id: string; // Character UUID for persistent, class name for anonymous
  classType: CharacterClass;
  name?: string; // Display name (for persistent characters)
  level?: number; // For persistent characters
}

export interface MultiCharacterPanelProps {
  selectedCharacters: SelectedCharacter[];
  disabledCharacterIds: string[]; // IDs/classes selected by other players
  onAddCharacter: (characterIdOrClass: string) => void;
  onRemoveCharacter: (index: number) => void;
  onSetActiveCharacter?: (index: number) => void;
  activeCharacterIndex?: number;
}

export function MultiCharacterPanel({
  selectedCharacters,
  disabledCharacterIds,
  onAddCharacter,
  onRemoveCharacter,
  onSetActiveCharacter,
  activeCharacterIndex = 0,
}: MultiCharacterPanelProps) {
  const { t } = useTranslation('lobby');
  const isAuthenticated = authService.isAuthenticated();
  const [showSelection, setShowSelection] = useState(false);

  const canAddMore = selectedCharacters.length < MAX_CHARACTERS_PER_PLAYER;

  const handleAddClick = () => {
    setShowSelection(true);
  };

  const handleSelectCharacter = (characterIdOrClass: string) => {
    onAddCharacter(characterIdOrClass);
    // Close selection after adding if at max
    if (selectedCharacters.length >= MAX_CHARACTERS_PER_PLAYER - 1) {
      setShowSelection(false);
    }
  };

  const handleCancelSelection = () => {
    setShowSelection(false);
  };

  return (
    <div className={styles.panel} data-testid="multi-character-panel">
      <div className={styles.header}>
        <h3 className={styles.title}>
          {t('yourCharacters', 'Your Characters')}
        </h3>
        <span className={styles.characterCount}>
          {selectedCharacters.length}/{MAX_CHARACTERS_PER_PLAYER}
        </span>
      </div>

      {/* Selected Characters List */}
      <div className={styles.selectedCharacters}>
        {selectedCharacters.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{t('noCharactersSelected', 'No characters selected')}</p>
            <p className={styles.hint}>{t('selectCharacterHint', 'Select at least one character to play')}</p>
          </div>
        ) : (
          selectedCharacters.map((char, index) => (
            <div
              key={char.id}
              className={`${styles.characterChip} ${index === activeCharacterIndex ? styles.characterChipActive : ''}`}
              style={{ '--chip-color': getCharacterColor(char.classType) } as React.CSSProperties}
              onClick={() => onSetActiveCharacter?.(index)}
              data-testid={`character-chip-${index}`}
            >
              <div
                className={styles.chipIcon}
                style={{ backgroundColor: getCharacterColor(char.classType) }}
              >
                {char.classType.charAt(0)}
              </div>
              <div className={styles.chipInfo}>
                <span className={styles.chipName}>
                  {char.name || char.classType}
                </span>
                {char.level && (
                  <span className={styles.chipLevel}>Lv.{char.level}</span>
                )}
              </div>
              <button
                className={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveCharacter(index);
                }}
                aria-label={t('removeCharacter', 'Remove character')}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Character Button */}
      {canAddMore && !showSelection && (
        <button
          className={styles.addButton}
          onClick={handleAddClick}
          data-testid="add-character-button"
        >
          + {t('addCharacter', 'Add Character')}
        </button>
      )}

      {/* Inline Character Selection */}
      {showSelection && (
        <div className={styles.inlineSelection}>
          <div className={styles.selectionHeader}>
            <h4>{t('selectCharacter', 'Select Character')}</h4>
            <button
              className={styles.cancelButton}
              onClick={handleCancelSelection}
            >
              {t('cancel', 'Cancel')}
            </button>
          </div>
          <div className={styles.selectionContent}>
            {isAuthenticated ? (
              <UserCharacterSelect
                selectedCharacterId={undefined}
                disabledCharacterIds={[
                  ...disabledCharacterIds,
                  ...selectedCharacters.map(c => c.id),
                ]}
                onSelect={handleSelectCharacter}
                compact
              />
            ) : (
              <CharacterSelect
                selectedClass={undefined}
                disabledClasses={[
                  ...disabledCharacterIds as CharacterClass[],
                  ...selectedCharacters.map(c => c.classType),
                ]}
                onSelect={handleSelectCharacter}
                compact
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
