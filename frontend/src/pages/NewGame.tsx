import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomJoinedPayload } from '../../../shared/types/events';
import { CharacterSelect } from '../components/CharacterSelect';
import { PlayerList } from '../components/PlayerList';
import { ScenarioSelectionPanel } from '../components/ScenarioSelectionPanel';
import { Tabs } from '../components/Tabs';
import { useNewGame } from '../contexts/NewGameContext';
import { websocketService } from '../services/websocket.service';
import styles from './NewGame.module.css';
import { useTranslation } from 'react-i18next';
import { getPlayerNickname, getPlayerUUID } from '../utils/storage';
import { roomSessionManager } from '../services/room-session.service';
import { useWebSocketConnection } from '../contexts/WebSocketConnectionContext';

export function NewGame() {
  const { t } = useTranslation(['lobby', 'common']);
  const { isConnected } = useWebSocketConnection();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    players,
    setPlayers,
    selectedScenario,
    selectScenario,
    selectedCharacter,
    selectCharacter,
  } = useNewGame();

  useEffect(() => {
    const playerNickname = getPlayerNickname();
    if (!playerNickname) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const playerNickname = getPlayerNickname();
    const playerUUID = getPlayerUUID();
    if (playerNickname && playerUUID) {
      setPlayers([
        {
          id: playerUUID,
          nickname: playerNickname,
          isHost: true,
          isReady: false,
          connectionStatus: 'connected',
        },
      ]);
    }
  }, [setPlayers]);

  useEffect(() => {
    const handleRoomJoined = (data: RoomJoinedPayload) => {
      roomSessionManager.onRoomJoined(data);
      navigate('/'); // Navigate to lobby to wait for players
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
    };

    websocketService.on('room_joined', handleRoomJoined);
    websocketService.on('error', handleError);

    return () => {
      websocketService.off('room_joined', handleRoomJoined);
      websocketService.off('error', handleError);
    };
  }, [navigate]);

  const handleStartGame = () => {
    const playerNickname = getPlayerNickname();
    if (selectedScenario && selectedCharacter && playerNickname) {
      websocketService.emit('create_room', {
        playerNickname,
        scenarioId: selectedScenario,
        characterClass: selectedCharacter,
      });
    }
  };

  const canStartGame = selectedScenario && selectedCharacter;
  const [activeTab, setActiveTab] = useState(0);

  // Switch to character tab when scenario is selected for the first time
  useEffect(() => {
    if (selectedScenario && !selectedCharacter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(1);
    }
  }, [selectedScenario, selectedCharacter]);

  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
  };

  // Mobile view logic
  const tabs = [
    {
      label: t('scenario'),
      content: (
        <ScenarioSelectionPanel
          selectedScenarioId={selectedScenario}
          onSelectScenario={selectScenario}
        />
      ),
    },
    {
      label: t('character'),
      content: (
        <CharacterSelect
          selectedClass={selectedCharacter}
          onSelect={selectCharacter}
          disabledClasses={[]}
        />
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.mainContent}>
          {/* Desktop */}
          <div className={styles.hiddenMobile}>
            <ScenarioSelectionPanel
              selectedScenarioId={selectedScenario}
              onSelectScenario={selectScenario}
            />
            <CharacterSelect
              selectedClass={selectedCharacter}
              onSelect={selectCharacter}
              disabledClasses={[]}
            />
          </div>
          {/* Mobile */}
          <div className={styles.hiddenDesktop}>
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        <div className={styles.startGameSection}>
            <button
              className={styles.startButton}
              onClick={handleStartGame}
              disabled={!canStartGame || !isConnected}
            >
              {isConnected ? t('startGame', { ns: 'lobby' }) : t('connecting', { ns: 'common' })}
            </button>
            {!canStartGame && (
              <p className={styles.startHint}>
                {t('selectScenarioAndCharacter', { ns: 'lobby' })}
              </p>
            )}
            {error && <p className={styles.error}>{error}</p>}
          </div>
          </div>
        <div className={styles.sidebar}>
          <PlayerList players={players} />
        </div>
      </div>
    </div>
  );
}
