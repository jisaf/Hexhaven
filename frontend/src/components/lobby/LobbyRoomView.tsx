/**
 * LobbyRoomView Component
 *
 * Displays the in-room view with players, character selection, and game controls.
 * Supports multi-character selection per player.
 * Equipment management moved to MultiCharacterPanel inline display.
 */

import { useTranslation } from 'react-i18next';
import { PlayerList, type Player } from '../PlayerList';
import { MultiCharacterPanel, type SelectedCharacter } from './MultiCharacterPanel';
import { ScenarioSelectionPanel } from '../ScenarioSelectionPanel';
import { RoomCodeDisplay } from './RoomCodeDisplay';
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
  campaignId?: string | null; // Issue #244 - Campaign Mode
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
  campaignId,
  onAddCharacter,
  onRemoveCharacter,
  onSetActiveCharacter,
  onSelectScenario,
  onStartGame,
}: LobbyRoomViewProps) {
  const { t } = useTranslation('lobby');

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

      {/* Scenario Selection (US5 - Host Only) */}
      {/* Hide scenario selection in campaign mode - scenario is pre-selected */}
      {isHost && !campaignId && (
        <div className={styles.scenarioSection}>
          <ScenarioSelectionPanel
            selectedScenarioId={selectedScenario}
            onSelectScenario={onSelectScenario}
          />
        </div>
      )}

      {/* Campaign Mode Indicator */}
      {campaignId && (
        <div className={styles.campaignModeIndicator}>
          <div className={styles.campaignBadge}>
            <span className={styles.campaignIcon}>⚔️</span>
            <span>Campaign Game</span>
          </div>
          <p className={styles.campaignScenarioInfo}>
            Scenario: <strong>{selectedScenario}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
