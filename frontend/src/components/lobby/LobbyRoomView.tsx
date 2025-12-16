/**
 * LobbyRoomView Component
 *
 * Displays the in-room view with players, character selection, and game controls.
 * Includes equipment management before game starts (Issue #205).
 * Supports multi-character selection per player.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayerList, type Player } from '../PlayerList';
import { MultiCharacterPanel, type SelectedCharacter } from './MultiCharacterPanel';
import { ScenarioSelectionPanel } from '../ScenarioSelectionPanel';
import { RoomCodeDisplay } from './RoomCodeDisplay';
import { InventoryTabContent } from '../inventory/InventoryTabContent';
import { useInventory } from '../../hooks/useInventory';
import { authService } from '../../services/auth.service';
import { characterService } from '../../services/character.service';
import styles from './LobbyRoomView.module.css';

interface LobbyRoomViewProps {
  roomCode: string;
  players: Player[];
  currentPlayerId?: string;
  isHost: boolean;
  // Multi-character support
  selectedCharacters: SelectedCharacter[];
  disabledCharacterIds: string[];
  activeCharacterIndex: number;
  selectedScenario: string;
  canStartGame: boolean;
  allPlayersReady: boolean;
  error: string | null;
  onAddCharacter: (characterIdOrClass: string) => void;
  onRemoveCharacter: (index: number) => void;
  onSetActiveCharacter: (index: number) => void;
  onSelectScenario: (scenarioId: string) => void;
  onStartGame: () => void;
}

export function LobbyRoomView({
  roomCode,
  players,
  currentPlayerId,
  isHost,
  selectedCharacters,
  disabledCharacterIds,
  activeCharacterIndex,
  selectedScenario,
  canStartGame,
  allPlayersReady,
  error,
  onAddCharacter,
  onRemoveCharacter,
  onSetActiveCharacter,
  onSelectScenario,
  onStartGame,
}: LobbyRoomViewProps) {
  const { t } = useTranslation('lobby');
  const isAuthenticated = authService.isAuthenticated();

  // Track character level for equipment slots (Issue #205)
  const [characterLevel, setCharacterLevel] = useState(1);
  const [showEquipment, setShowEquipment] = useState(false);

  // Get the active character ID for equipment display
  const activeCharacter = selectedCharacters[activeCharacterIndex];
  const activeCharacterId = activeCharacter?.id;

  // Fetch character details when selected (for level)
  useEffect(() => {
    if (activeCharacterId && isAuthenticated) {
      characterService.getCharacter(activeCharacterId).then((char) => {
        if (char) {
          setCharacterLevel(char.level || 1);
        }
      }).catch(() => {
        // Fallback to level 1 if fetch fails
        setCharacterLevel(1);
      });
    }
  }, [activeCharacterId, isAuthenticated]);

  // Inventory hook - only for authenticated users with selected character
  const {
    ownedItems,
    equippedItems,
    itemStates,
    loading: inventoryLoading,
    error: inventoryError,
    equipItem,
    unequipItem,
    useItem,
  } = useInventory({
    characterId: isAuthenticated ? activeCharacterId || null : null,
    enabled: isAuthenticated && !!activeCharacterId,
  });

  return (
    <div className={styles.inRoomMode} data-testid="lobby-page">
      <RoomCodeDisplay roomCode={roomCode} isHost={isHost} />

      {/* Start Game Section - Always visible at top */}
      <div className={styles.gameControlsSection}>
        {isHost ? (
          <div className={styles.hostControls}>
            {/* Error banner near the button for visibility */}
            {error && (
              <div className={styles.errorBanner} role="alert">
                ⚠️ {error}
              </div>
            )}

            <button
              className={`${styles.primaryButton} ${styles.startButton}`}
              onClick={onStartGame}
              disabled={!canStartGame}
            >
              🎮 {t('startGame', 'Start Game')}
            </button>

            {!canStartGame && (
              <p className={styles.startHint}>
                ⏳ {t('waitingForCharacterSelection', 'Please select a character to start...')}
              </p>
            )}
            {canStartGame && !allPlayersReady && (
              <p className={`${styles.startHint} ${styles.warning}`}>
                ⚠️ {t('playersNeedToSelect', 'Some players need to select characters')}
              </p>
            )}
            {canStartGame && allPlayersReady && (
              <p className={`${styles.startHint} ${styles.ready}`}>
                ✅ {t('readyToStart', 'All players ready! Click Start Game')}
              </p>
            )}
          </div>
        ) : (
          <div className={styles.playerWaiting}>
            <p>
              ⏳ {t('waitingForHost', 'Waiting for host to start the game...')}
            </p>
          </div>
        )}
      </div>

      <div className={styles.roomLayout}>
        <div className={styles.roomSection}>
          <PlayerList players={players} currentPlayerId={currentPlayerId} />
        </div>

        <div className={styles.roomSection}>
          <MultiCharacterPanel
            selectedCharacters={selectedCharacters}
            disabledCharacterIds={disabledCharacterIds}
            onAddCharacter={onAddCharacter}
            onRemoveCharacter={onRemoveCharacter}
            onSetActiveCharacter={onSetActiveCharacter}
            activeCharacterIndex={activeCharacterIndex}
          />
        </div>
      </div>

      {/* Equipment Section (Issue #205) - Only for authenticated users with character */}
      {isAuthenticated && activeCharacterId && (
        <div className={styles.equipmentSection}>
          <button
            className={styles.equipmentToggle}
            onClick={() => setShowEquipment(!showEquipment)}
          >
            🎒 {t('equipment', 'Equipment')} {showEquipment ? '▲' : '▼'}
          </button>

          {showEquipment && (
            <div className={styles.equipmentContent}>
              {inventoryLoading && (
                <p className={styles.loadingText}>{t('loadingInventory', 'Loading inventory...')}</p>
              )}
              {inventoryError && (
                <p className={styles.errorText}>{inventoryError}</p>
              )}
              {!inventoryLoading && !inventoryError && (
                <InventoryTabContent
                  ownedItems={ownedItems}
                  equippedItems={equippedItems}
                  itemStates={itemStates}
                  characterLevel={characterLevel}
                  onEquipItem={equipItem}
                  onUnequipItem={unequipItem}
                  onUseItem={useItem}
                  disabled={false}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Scenario Selection (US5 - Host Only) */}
      {isHost && (
        <div className={styles.scenarioSection}>
          <ScenarioSelectionPanel
            selectedScenarioId={selectedScenario}
            onSelectScenario={onSelectScenario}
          />
        </div>
      )}
    </div>
  );
}
