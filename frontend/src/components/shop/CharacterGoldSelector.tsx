/**
 * CharacterGoldSelector Component (Issue #332)
 *
 * Displays campaign characters with their gold balance for shop purchases.
 * Allows switching between characters to shop with.
 */

import { useMemo } from 'react';
import type { CampaignCharacterSummary } from '../../../../shared/types/campaign';
import styles from './CharacterGoldSelector.module.css';

interface CharacterGoldSelectorProps {
  /** Characters available in the campaign */
  characters: CampaignCharacterSummary[];
  /** Currently selected character ID */
  selectedCharacterId: string | null;
  /** Callback when character selection changes */
  onSelectCharacter: (characterId: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

export function CharacterGoldSelector({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  disabled = false,
}: CharacterGoldSelectorProps) {
  // Filter to only active (non-retired) characters
  const activeCharacters = useMemo(
    () => characters.filter((c) => !c.retired),
    [characters]
  );

  // Get selected character data
  const selectedCharacter = useMemo(
    () => activeCharacters.find((c) => c.id === selectedCharacterId),
    [activeCharacters, selectedCharacterId]
  );

  if (activeCharacters.length === 0) {
    return (
      <div className={styles.noCharacters}>
        No characters available in this campaign
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Shopping as:</span>
        {selectedCharacter && (
          <span className={styles.goldDisplay}>
            <span className={styles.goldIcon}>$</span>
            <span className={styles.goldAmount}>{selectedCharacter.gold}</span>
            <span className={styles.goldLabel}>gold</span>
          </span>
        )}
      </div>

      {activeCharacters.length === 1 ? (
        // Single character display (no dropdown needed)
        <div className={styles.singleCharacter}>
          <CharacterOption character={activeCharacters[0]} />
        </div>
      ) : (
        // Multiple characters - show as selectable list
        <div className={styles.characterList}>
          {activeCharacters.map((character) => (
            <button
              key={character.id}
              className={`${styles.characterButton} ${
                selectedCharacterId === character.id ? styles.selected : ''
              }`}
              onClick={() => onSelectCharacter(character.id)}
              disabled={disabled}
            >
              <CharacterOption character={character} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Character option display
interface CharacterOptionProps {
  character: CampaignCharacterSummary;
}

function CharacterOption({ character }: CharacterOptionProps) {
  return (
    <div className={styles.characterOption}>
      <div className={styles.characterInfo}>
        <span className={styles.characterName}>{character.name}</span>
        <span className={styles.characterClass}>
          {character.className} Lv.{character.level}
        </span>
      </div>
      <div className={styles.characterGold}>
        <span className={styles.goldIcon}>$</span>
        {character.gold}
      </div>
    </div>
  );
}

export default CharacterGoldSelector;
