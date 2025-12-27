/**
 * useAutoStartGame Hook
 *
 * Handles auto-start logic for campaign mode where we skip the room lobby
 * and go directly from campaign/scenario selection to gameplay.
 *
 * Extracted from CampaignDashboardPage and CampaignScenarioLobbyPage
 * to avoid code duplication (DRY principle).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { websocketService } from '../services/websocket.service';
import { roomSessionManager } from '../services/room-session.service';
import { useRoomSession } from './useRoomSession';
import { getDisplayName } from '../utils/storage';

interface AutoStartConfig {
  characterIds: string[];
  scenarioId: string;
}

interface UseAutoStartGameOptions {
  /** Called when an error occurs during auto-start */
  onError?: (error: string) => void;
}

interface UseAutoStartGameReturn {
  /** Whether the game is currently starting */
  isStarting: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
  /** Start the game with the given configuration */
  startGame: (scenarioId: string, campaignId: string, characterIds: string[]) => Promise<void>;
}

export function useAutoStartGame(options: UseAutoStartGameOptions = {}): UseAutoStartGameReturn {
  const navigate = useNavigate();
  const sessionState = useRoomSession();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track pending auto-start for campaign mode (skip room lobby entirely)
  const pendingAutoStart = useRef<AutoStartConfig | null>(null);
  // Track timeout for cleanup on unmount
  const autoStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle auto-start failure
  const handleAutoStartError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsStarting(false);
    pendingAutoStart.current = null;
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }
    options.onError?.(errorMessage);
  }, [options]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
    };
  }, []);

  // Auto-start game when room is connected (skip room lobby entirely)
  useEffect(() => {
    if (sessionState.connectionStatus === 'connected' && sessionState.roomCode && pendingAutoStart.current) {
      const { characterIds, scenarioId } = pendingAutoStart.current;
      pendingAutoStart.current = null; // Clear to prevent re-triggering

      try {
        // Auto-select each character
        characterIds.forEach((charId) => {
          websocketService.selectCharacter(charId, 'add');
        });

        // Select the scenario and start the game
        websocketService.selectScenario(scenarioId);

        // Small delay to ensure character selection is processed before starting
        // Store timeout ref for cleanup
        autoStartTimeoutRef.current = setTimeout(() => {
          autoStartTimeoutRef.current = null;
          websocketService.startGame(scenarioId);
        }, 100);
      } catch (err) {
        // Use queueMicrotask to avoid synchronous setState in effect
        const errorMessage = err instanceof Error ? err.message : 'Failed to auto-start game';
        queueMicrotask(() => handleAutoStartError(errorMessage));
      }
    }
  }, [sessionState.connectionStatus, sessionState.roomCode, handleAutoStartError]);

  // Navigate to game once it's actually started (game_started event received)
  useEffect(() => {
    if (sessionState.isGameActive && sessionState.roomCode && isStarting) {
      navigate(`/rooms/${sessionState.roomCode}/play`);
    }
  }, [sessionState.isGameActive, sessionState.roomCode, isStarting, navigate]);

  // Handle session errors
  useEffect(() => {
    if (sessionState.error) {
      queueMicrotask(() => {
        setError(sessionState.error?.message ?? 'Connection error');
        setIsStarting(false);
      });
    }
  }, [sessionState.error]);

  // Start game - create room and auto-start (skip lobby)
  const startGame = useCallback(async (
    scenarioId: string,
    campaignId: string,
    characterIds: string[]
  ): Promise<void> => {
    const displayName = getDisplayName();
    if (!displayName) {
      setError('Please set a nickname first');
      return;
    }

    setIsStarting(true);
    setError(null);

    // Set pending auto-start so we skip the room lobby
    pendingAutoStart.current = {
      characterIds,
      scenarioId,
    };

    try {
      await roomSessionManager.createRoom(displayName, {
        campaignId,
        scenarioId,
      });
      // Auto-start happens via useEffect when room is connected
    } catch (err) {
      pendingAutoStart.current = null; // Clear on error
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsStarting(false);
    }
  }, []);

  return {
    isStarting,
    error,
    clearError,
    startGame,
  };
}
