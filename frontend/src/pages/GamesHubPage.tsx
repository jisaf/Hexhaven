/**
 * Games Hub Page Component (Issue #310)
 *
 * Displays "My Games" and "Active Games" tabs:
 * - My Games: Games the current player has joined (reuses MyRoomsList)
 * - Active Games: Public games available to join (reuses LobbyWelcome/ActiveRoomsList)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs } from '../components/Tabs';
import { MyRoomsList, type RoomWithPlayers } from '../components/lobby/MyRoomsList';
import { LobbyWelcome } from '../components/lobby/LobbyWelcome';
import { fetchActiveRooms, fetchMyRooms } from '../services/room.api';
import styles from './GamesHubPage.module.css';

export const GamesHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);

  // State
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [myRooms, setMyRooms] = useState<RoomWithPlayers[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active rooms
  const loadActiveRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const rooms = await fetchActiveRooms();
      setActiveRooms(rooms);
    } catch (err) {
      console.error('Failed to fetch active rooms:', err);
      setError('Failed to load active games');
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  // Fetch user's rooms
  const loadMyRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const rooms = await fetchMyRooms();
      setMyRooms(rooms);
    } catch (err) {
      console.error('Failed to fetch my rooms:', err);
      setError('Failed to load your games');
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  // Load rooms on mount
  useEffect(() => {
    loadMyRooms();
    loadActiveRooms();
  }, [loadMyRooms, loadActiveRooms]);

  // Handle quick join from active rooms list
  const handleQuickJoinRoom = (roomCode: string) => {
    navigate(`/games/join/${roomCode}`);
  };

  // Handle join room button (go to join page)
  const handleJoinRoom = () => {
    navigate('/games/join');
  };

  // Tabs configuration
  const tabs = [
    {
      label: t('lobby:myGames', 'My Games'),
      content: (
        <MyRoomsList rooms={myRooms} />
      ),
    },
    {
      label: t('lobby:activeGames', 'Active Games'),
      content: (
        <LobbyWelcome
          activeRooms={activeRooms}
          loadingRooms={loadingRooms}
          isLoading={loadingRooms}
          onJoinRoom={handleJoinRoom}
          onQuickJoinRoom={handleQuickJoinRoom}
        />
      ),
    },
  ];

  return (
    <div className={styles.gamesHubContainer}>
      <div className={styles.gamesHubContent}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{t('lobby:games', 'Games')}</h1>
          <button
            className={styles.createButton}
            onClick={() => navigate('/games/create')}
          >
            {t('lobby:createGame', 'Create Game')}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className={styles.errorBanner}>
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <Tabs tabs={tabs} defaultTab={0} />

        {/* Refresh button */}
        <div className={styles.refreshSection}>
          <button
            className={styles.refreshButton}
            onClick={() => {
              loadMyRooms();
              loadActiveRooms();
            }}
            disabled={loadingRooms}
          >
            {loadingRooms ? t('common:loading', 'Loading...') : t('common:refresh', 'Refresh')}
          </button>
        </div>
      </div>
    </div>
  );
};
