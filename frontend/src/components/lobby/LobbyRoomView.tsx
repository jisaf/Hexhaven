/**
 * LobbyRoomView Component
 *
 * Displays the in-room view with players, character selection, and game controls.
 */

import { useTranslation } from 'react-i18next';
import { PlayerList, type Player } from '../PlayerList';
import { CharacterSelect, type CharacterClass } from '../CharacterSelect';
import { ScenarioSelectionPanel } from '../ScenarioSelectionPanel';
import { RoomCodeDisplay } from './RoomCodeDisplay';
import styles from './LobbyRoomView.module.css';

interface LobbyRoomViewProps {
  roomCode: string;
  players: Player[];
  currentPlayerId?: string;
  isHost: boolean;
  selectedCharacter: CharacterClass | undefined;
  disabledClasses: CharacterClass[];
  selectedScenario: string;
  canStartGame: boolean;
  allPlayersReady: boolean;
  error: string | null;
  onSelectCharacter: (characterClass: CharacterClass) => void;
  onSelectScenario: (scenarioId: string) => void;
  onStartGame: () => void;
}

export function LobbyRoomView({
  roomCode,
  players,
  currentPlayerId,
  isHost,
  selectedCharacter,
  disabledClasses,
  selectedScenario,
  canStartGame,
  allPlayersReady,
  error,
  onSelectCharacter,
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
          <CharacterSelect
            selectedClass={selectedCharacter}
            disabledClasses={disabledClasses}
            onSelect={onSelectCharacter}
          />
        </div>
      </div>

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
