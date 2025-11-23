/**
 * GameRoom Page Component
 *
 * This page handles the entire "in-room" experience, including scenario selection,
 * character selection, and game start controls.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PlayerList, type Player } from "../components/PlayerList";
import { CharacterSelect, type CharacterClass } from "../components/CharacterSelect";
import { ScenarioSelectionPanel } from "../components/ScenarioSelectionPanel";
import { RoomCodeDisplay } from "../components/lobby/RoomCodeDisplay";
import { Tabs } from "../components/Tabs";
import { websocketService } from "../services/websocket.service";
import styles from "./GameRoom.module.css";

// TODO: These types should be shared from the Lobby page
type GameRoomData = {
  roomCode: string;
  players: Player[];
  isHost: boolean;
  // ... other properties
};

export function GameRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("lobby");

  // TODO: Fetch or receive this data from a service/context
  const [roomData, setRoomData] = useState<GameRoomData | null>(null);
  const [error] = useState<string | null>(null);

  // TODO: Replace with real state management
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterClass | undefined>();
  const [selectedScenario, setSelectedScenario] = useState<string>("scenario-1");
  const [canStartGame] = useState(false);
  const [allPlayersReady] = useState(false);

  useEffect(() => {
    // TODO: Here you would typically fetch the room data using the roomCode
    // For now, we"ll just simulate it.
    if (roomCode) {
      setRoomData({
        roomCode,
        players: [], // This would be populated by a fetch or WebSocket event
        isHost: false, // This would be determined by the current player"s status
      });
    } else {
      navigate("/"); // If no room code, redirect to lobby
    }
  }, [roomCode, navigate]);

  const handleSelectCharacter = (characterClass: CharacterClass) => {
    setSelectedCharacter(characterClass);
    websocketService.selectCharacter(characterClass);
  };

  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    websocketService.selectScenario(scenarioId);
  };

  const handleStartGame = () => {
    websocketService.startGame(selectedScenario);
  };

  if (!roomData) {
    return <div>Loading room...</div>; // Or some other loading indicator
  }

  const { players, isHost } = roomData;
  const currentPlayerId = ""; // TODO: Get current player ID

  const renderGameControls = () => (
    <div className={styles.gameControlsSection}>
      {isHost ? (
        <div className={styles.hostControls}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              ⚠️ {error}
            </div>
          )}
          <button
            className={`${styles.primaryButton} ${styles.startButton}`}
            onClick={handleStartGame}
            disabled={!canStartGame}
          >
            🎮 {t("startGame", "Start Game")}
          </button>
          {!canStartGame && (
            <p className={styles.startHint}>
              ⏳ {t("waitingForCharacterSelection", "Please select a character to start...")}
            </p>
          )}
          {canStartGame && !allPlayersReady && (
            <p className={`${styles.startHint} ${styles.warning}`}>
              ⚠️ {t("playersNeedToSelect", "Some players need to select characters")}
            </p>
          )}
          {canStartGame && allPlayersReady && (
            <p className={`${styles.startHint} ${styles.ready}`}>
              ✅ {t("readyToStart", "All players ready! Click Start Game")}
            </p>
          )}
        </div>
      ) : (
        <div className={styles.playerWaiting}>
          <p>⏳ {t("waitingForHost", "Waiting for host to start the game...")}</p>
        </div>
      )}
    </div>
  );

  const mainContent = (
    <>
      <div className={styles.scenarioSection}>
        <ScenarioSelectionPanel
          selectedScenarioId={selectedScenario}
          onSelectScenario={handleSelectScenario}
          isHost={isHost}
        />
      </div>
      <div className={styles.characterSelectSection}>
        <CharacterSelect
          selectedClass={selectedCharacter}
          disabledClasses={[]}
          onSelect={handleSelectCharacter}
        />
      </div>
    </>
  );

  const sidebarContent = (
    <div className={styles.sidebar}>
      <RoomCodeDisplay roomCode={roomData.roomCode} isHost={isHost} />
      <PlayerList players={players} currentPlayerId={currentPlayerId} />
      {renderGameControls()}
    </div>
  );

  return (
    <div className={styles.inRoomView} data-testid="game-room-page">
      {/* Desktop Layout: Two Columns */}
      <div className={styles.desktopLayout}>
        <div className={styles.mainContent}>{mainContent}</div>
        {sidebarContent}
      </div>

      {/* Mobile Layout: Tabs */}
      <div className={styles.mobileLayout}>
        <Tabs
          tabs={[
            {
              label: t("setup", "Setup"),
              content: mainContent,
            },
            {
              label: t("room", "Room"),
              content: (
                <>
                  <RoomCodeDisplay roomCode={roomData.roomCode} isHost={isHost} />
                  <PlayerList players={players} currentPlayerId={currentPlayerId} />
                </>
              ),
            },
          ]}
        />
        {renderGameControls()}
      </div>
    </div>
  );
}
