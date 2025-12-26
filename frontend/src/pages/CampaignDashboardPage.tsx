/**
 * Campaign Dashboard Page Component (Issue #316)
 *
 * Standalone page for campaign management:
 * - Scenario tree visualization (completed, available, locked)
 * - Party management (characters in campaign)
 * - Campaign stats (prosperity, reputation)
 * - Direct game start (skips intermediate lobby for streamlined flow)
 *
 * Wraps CampaignView component and adapts it for page routing.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CampaignView } from '../components/lobby/CampaignView';
import { roomSessionManager } from '../services/room-session.service';
import { websocketService } from '../services/websocket.service';
import { useRoomSession } from '../hooks/useRoomSession';
import { getDisplayName } from '../utils/storage';
import styles from './CampaignDashboardPage.module.css';

export const CampaignDashboardPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const sessionState = useRoomSession();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track pending auto-start for campaign mode (skip room lobby entirely)
  const pendingAutoStart = useRef<{ characterIds: string[]; scenarioId: string } | null>(null);

  // Navigate back to campaigns hub
  const handleBack = () => {
    navigate('/campaigns');
  };

  // Auto-start game when room is connected (skip room lobby entirely)
  useEffect(() => {
    if (sessionState.connectionStatus === 'connected' && sessionState.roomCode && pendingAutoStart.current) {
      const { characterIds, scenarioId } = pendingAutoStart.current;
      pendingAutoStart.current = null; // Clear to prevent re-triggering

      // Auto-select each character
      characterIds.forEach((charId) => {
        websocketService.selectCharacter(charId, 'add');
      });

      // Select the scenario and start the game
      websocketService.selectScenario(scenarioId);

      // Small delay to ensure character selection is processed before starting
      setTimeout(() => {
        websocketService.startGame(scenarioId);
        // Navigate directly to the game (skip room lobby)
        navigate(`/rooms/${sessionState.roomCode}/play`);
      }, 100);
    }
  }, [sessionState.connectionStatus, sessionState.roomCode, navigate]);

  // Handle session errors - use microtask to avoid synchronous setState in effect
  useEffect(() => {
    if (sessionState.error) {
      queueMicrotask(() => {
        setError(sessionState.error?.message ?? 'Connection error');
        setIsStarting(false);
      });
    }
  }, [sessionState.error]);

  // Start game directly - create room and auto-start (skip scenario lobby)
  const handleStartGame = async (scenarioId: string, campId: string, characterIds: string[]) => {
    const displayName = getDisplayName();
    if (!displayName) {
      setError('Please set a nickname first');
      return;
    }

    setIsStarting(true);
    setError(null);

    // Set pending auto-start so we skip both scenario lobby and room lobby
    pendingAutoStart.current = {
      characterIds,
      scenarioId,
    };

    try {
      await roomSessionManager.createRoom(displayName, {
        campaignId: campId,
        scenarioId,
      });
      // Auto-start happens via useEffect when room is connected
    } catch (err) {
      pendingAutoStart.current = null; // Clear on error
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsStarting(false);
    }
  };

  // No campaign ID - redirect
  if (!campaignId) {
    navigate('/campaigns');
    return null;
  }

  return (
    <div className={styles.campaignDashboardContainer}>
      <div className={styles.campaignDashboardContent}>
        {error && (
          <div className={styles.errorBanner}>
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        {isStarting && (
          <div className={styles.loadingOverlay}>
            <p>Starting game...</p>
          </div>
        )}
        <CampaignView
          campaignId={campaignId}
          onBack={handleBack}
          onStartGame={handleStartGame}
        />
      </div>
    </div>
  );
};
