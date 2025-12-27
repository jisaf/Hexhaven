/**
 * useAutoStartGame Hook
 *
 * Handles auto-start logic for campaign mode where we skip the room lobby
 * and go directly from campaign/scenario selection to gameplay.
 *
 * Extracted from CampaignDashboardPage and CampaignScenarioLobbyPage
 * to avoid code duplication (DRY principle).
 *
 * Uses event-driven approach for character selection confirmation:
 * - Waits for character_selected events for all characters before starting game
 * - Implements retry mechanism with exponential backoff if selections not confirmed
 * - Retries game start if it fails due to characters not being ready
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { websocketService } from '../services/websocket.service';
import { roomSessionManager } from '../services/room-session.service';
import { useRoomSession } from './useRoomSession';
import { getDisplayName } from '../utils/storage';
import type { CharacterSelectedPayload } from '../../../shared/types/events';

/**
 * Configuration for character selection confirmation with retry logic.
 * These values provide a robust approach that handles network latency
 * while avoiding indefinite waiting.
 */
/** Initial timeout waiting for character selection confirmation (ms) */
const CHARACTER_CONFIRMATION_TIMEOUT_MS = 1000;
/** Maximum number of retry attempts for character selection */
const MAX_CHARACTER_SELECTION_RETRIES = 3;
/** Base delay for exponential backoff between retries (ms) */
const RETRY_BASE_DELAY_MS = 1000;
/** Maximum number of game start retries */
const MAX_GAME_START_RETRIES = 2;
/** Delay before retrying game start (ms) */
const GAME_START_RETRY_DELAY_MS = 500;

interface AutoStartConfig {
  characterIds: string[];
  scenarioId: string;
}

/** State for tracking character selection confirmations */
interface CharacterSelectionState {
  /** Character IDs we're waiting for confirmation on */
  pending: Set<string>;
  /** Character IDs that have been confirmed */
  confirmed: Set<string>;
  /** Current retry attempt number */
  retryCount: number;
  /** Scenario ID for the game start */
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

  // Track character selection confirmation state
  const selectionStateRef = useRef<CharacterSelectionState | null>(null);

  // Track timeouts for cleanup on unmount
  const confirmationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStartRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track game start retry count
  const gameStartRetryCountRef = useRef(0);

  // Store retry function reference to avoid circular dependency in useCallback
  const retryFnRef = useRef<(() => void) | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear all timeouts helper
  const clearAllTimeouts = useCallback(() => {
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
      confirmationTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (gameStartRetryTimeoutRef.current) {
      clearTimeout(gameStartRetryTimeoutRef.current);
      gameStartRetryTimeoutRef.current = null;
    }
  }, []);

  // Handle auto-start failure
  const handleAutoStartError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsStarting(false);
    pendingAutoStart.current = null;
    selectionStateRef.current = null;
    gameStartRetryCountRef.current = 0;
    clearAllTimeouts();
    options.onError?.(errorMessage);
  }, [options, clearAllTimeouts]);

  // Attempt to start the game (with retry support)
  const attemptGameStart = useCallback((scenarioId: string) => {
    try {
      websocketService.startGame(scenarioId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start game';
      queueMicrotask(() => handleAutoStartError(errorMessage));
    }
  }, [handleAutoStartError]);

  // Handle successful character selection confirmation
  const handleAllCharactersConfirmed = useCallback((scenarioId: string) => {
    clearAllTimeouts();
    selectionStateRef.current = null;
    gameStartRetryCountRef.current = 0;

    // All characters confirmed - start the game
    attemptGameStart(scenarioId);
  }, [clearAllTimeouts, attemptGameStart]);

  // Retry character selection with exponential backoff
  const retryCharacterSelection = useCallback(() => {
    const state = selectionStateRef.current;
    if (!state) return;

    if (state.retryCount >= MAX_CHARACTER_SELECTION_RETRIES) {
      handleAutoStartError(
        `Failed to confirm character selection after ${MAX_CHARACTER_SELECTION_RETRIES} attempts. Please try again.`
      );
      return;
    }

    // Increment retry count
    state.retryCount++;

    // Calculate delay with exponential backoff
    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, state.retryCount - 1);

    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;

      // Re-send selections for characters that weren't confirmed
      const unconfirmed = Array.from(state.pending).filter(
        (id) => !state.confirmed.has(id)
      );

      unconfirmed.forEach((charId) => {
        websocketService.selectCharacter(charId, 'add');
      });

      // Set another confirmation timeout
      confirmationTimeoutRef.current = setTimeout(() => {
        confirmationTimeoutRef.current = null;
        // Check if still waiting for confirmations
        if (selectionStateRef.current && selectionStateRef.current.confirmed.size < selectionStateRef.current.pending.size) {
          // Use ref to call latest version of retry function
          retryFnRef.current?.();
        }
      }, CHARACTER_CONFIRMATION_TIMEOUT_MS);
    }, delay);
  }, [handleAutoStartError]);

  // Keep the ref updated with the latest retry function
  // This must be in an effect to avoid mutating refs during render
  useEffect(() => {
    retryFnRef.current = retryCharacterSelection;
  }, [retryCharacterSelection]);

  // Handle character_selected event from server
  const handleCharacterSelected = useCallback((data: CharacterSelectedPayload) => {
    const state = selectionStateRef.current;
    if (!state) return;

    // Track confirmations based on characterIds in the payload
    // The payload contains all selected character IDs for a player
    if (data.characterIds && data.characterIds.length > 0) {
      // Mark each confirmed character ID
      for (const charId of data.characterIds) {
        if (state.pending.has(charId)) {
          state.confirmed.add(charId);
        }
      }

      // Check if all characters are confirmed
      if (state.confirmed.size === state.pending.size) {
        handleAllCharactersConfirmed(state.scenarioId);
      }
    }
  }, [handleAllCharactersConfirmed]);

  // Handle game start failure (e.g., characters not ready)
  const handleGameStartError = useCallback((errorData: { code?: string; message: string }) => {
    if (errorData.code === 'GAME_START_FAILED' || errorData.code === 'CHARACTERS_NOT_READY') {
      const state = selectionStateRef.current;
      const scenarioId = state?.scenarioId || pendingAutoStart.current?.scenarioId;

      if (scenarioId && gameStartRetryCountRef.current < MAX_GAME_START_RETRIES) {
        gameStartRetryCountRef.current++;

        gameStartRetryTimeoutRef.current = setTimeout(() => {
          gameStartRetryTimeoutRef.current = null;
          attemptGameStart(scenarioId);
        }, GAME_START_RETRY_DELAY_MS);
      } else {
        handleAutoStartError(errorData.message || 'Failed to start game');
      }
    }
  }, [handleAutoStartError, attemptGameStart]);

  // Register event listeners for character selection confirmation
  useEffect(() => {
    const unsubscribeCharacterSelected = websocketService.on(
      'character_selected',
      handleCharacterSelected
    );

    const unsubscribeError = websocketService.on('error', handleGameStartError);

    return () => {
      if (typeof unsubscribeCharacterSelected === 'function') {
        unsubscribeCharacterSelected();
      } else {
        websocketService.off('character_selected', handleCharacterSelected);
      }
      if (typeof unsubscribeError === 'function') {
        unsubscribeError();
      } else {
        websocketService.off('error', handleGameStartError);
      }
    };
  }, [handleCharacterSelected, handleGameStartError]);

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      selectionStateRef.current = null;
    };
  }, [clearAllTimeouts]);

  // Auto-start game when room is connected (skip room lobby entirely)
  useEffect(() => {
    if (sessionState.connectionStatus === 'connected' && sessionState.roomCode && pendingAutoStart.current) {
      const { characterIds, scenarioId } = pendingAutoStart.current;
      pendingAutoStart.current = null; // Clear to prevent re-triggering

      try {
        // Initialize character selection tracking state
        selectionStateRef.current = {
          pending: new Set(characterIds),
          confirmed: new Set(),
          retryCount: 0,
          scenarioId,
        };

        // Select the scenario first
        websocketService.selectScenario(scenarioId);

        // Send character selection requests
        characterIds.forEach((charId) => {
          websocketService.selectCharacter(charId, 'add');
        });

        // Set timeout for confirmation - if not all confirmed, retry
        confirmationTimeoutRef.current = setTimeout(() => {
          confirmationTimeoutRef.current = null;
          const state = selectionStateRef.current;
          if (state && state.confirmed.size < state.pending.size) {
            // Not all characters confirmed yet, retry
            retryCharacterSelection();
          }
        }, CHARACTER_CONFIRMATION_TIMEOUT_MS);
      } catch (err) {
        // Use queueMicrotask to avoid synchronous setState in effect
        const errorMessage = err instanceof Error ? err.message : 'Failed to auto-start game';
        queueMicrotask(() => handleAutoStartError(errorMessage));
      }
    }
  }, [sessionState.connectionStatus, sessionState.roomCode, handleAutoStartError, retryCharacterSelection]);

  // Navigate to game once it's actually started (game_started event received)
  useEffect(() => {
    if (sessionState.isGameActive && sessionState.roomCode && isStarting) {
      // Clear any pending state on successful game start
      selectionStateRef.current = null;
      gameStartRetryCountRef.current = 0;
      clearAllTimeouts();
      navigate(`/rooms/${sessionState.roomCode}/play`);
    }
  }, [sessionState.isGameActive, sessionState.roomCode, isStarting, navigate, clearAllTimeouts]);

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
    gameStartRetryCountRef.current = 0;

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
