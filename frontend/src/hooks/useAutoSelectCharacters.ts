/**
 * useAutoSelectCharacters Hook
 *
 * Handles auto-selection of characters from navigation state when arriving
 * from CreateGamePage. Also handles auto-starting solo games.
 *
 * Extracted from Lobby.tsx and RoomLobbyPage.tsx to avoid code duplication
 * (DRY principle - Issue #443 code review).
 *
 * Features:
 * - Auto-selects characters passed via navigation state
 * - Auto-starts solo games after character selection
 * - Proper cleanup for timeouts to prevent memory leaks
 * - Clears navigation state to prevent re-triggering
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { websocketService } from '../services/websocket.service';

/**
 * Navigation state structure passed from CreateGamePage.
 * Defined as a shared interface for type safety.
 */
export interface CreateGameNavigationState {
  /** Character IDs to auto-select in the lobby */
  pendingCharacters?: string[];
  /** Whether this is a solo game that should auto-start */
  isSoloGame?: boolean;
}

/**
 * Type guard to validate navigation state at runtime.
 */
function isValidNavigationState(state: unknown): state is CreateGameNavigationState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;

  // Check pendingCharacters is array of strings if present
  if (s.pendingCharacters !== undefined) {
    if (!Array.isArray(s.pendingCharacters)) return false;
    if (!s.pendingCharacters.every((id) => typeof id === 'string')) return false;
  }

  // Check isSoloGame is boolean if present
  if (s.isSoloGame !== undefined && typeof s.isSoloGame !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * Delay to allow WebSocket character selection messages to be processed
 * before starting the game. Needed because character selections are async.
 */
const AUTO_START_DELAY_MS = 500;

interface UseAutoSelectCharactersOptions {
  /**
   * Whether the component is ready to auto-select characters.
   * For Lobby.tsx: sessionState.status === 'lobby' && sessionState.roomCode
   * For RoomLobbyPage.tsx: sessionState.connectionStatus === 'connected' && sessionState.roomCode
   */
  isReady: boolean;
  /** Function to add a character by ID */
  addCharacter: (characterId: string) => void;
}

/**
 * Hook to handle auto-selection of characters from CreateGamePage navigation state.
 *
 * @param options - Configuration options
 */
export function useAutoSelectCharacters(options: UseAutoSelectCharactersOptions): void {
  const { isReady, addCharacter } = options;
  const location = useLocation();
  const navigate = useNavigate();

  // Track timeout for cleanup to prevent memory leaks and race conditions
  const autoStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if we've already processed this navigation state to prevent re-triggering
  const processedRef = useRef(false);

  useEffect(() => {
    // Validate navigation state with type guard
    const navState = isValidNavigationState(location.state) ? location.state : null;

    // Skip if not ready, no pending characters, or already processed
    if (!isReady || !navState?.pendingCharacters?.length || processedRef.current) {
      return;
    }

    console.log('[useAutoSelectCharacters] Auto-selecting characters from CreateGamePage:', navState.pendingCharacters);

    // Mark as processed to prevent re-triggering
    processedRef.current = true;

    // Add each character to the selection
    navState.pendingCharacters.forEach((characterId) => {
      addCharacter(characterId);
    });

    // For solo games, automatically start the game after characters are selected
    if (navState.isSoloGame) {
      console.log('[useAutoSelectCharacters] Solo game - auto-starting after character selection');

      autoStartTimeoutRef.current = setTimeout(() => {
        websocketService.startGame();
      }, AUTO_START_DELAY_MS);
    }

    // Clear navigation state to prevent re-triggering on re-renders
    navigate(location.pathname, { replace: true, state: {} });

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
    };
  }, [isReady, location.state, location.pathname, addCharacter, navigate]);

  // Reset processed flag when location changes to a different path
  useEffect(() => {
    return () => {
      processedRef.current = false;
    };
  }, [location.pathname]);
}
