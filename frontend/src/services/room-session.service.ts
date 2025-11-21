/**
 * RoomSessionManager - Single source of truth for room session state
 *
 * This service ensures:
 * - Only ONE join_room call per session (prevents duplicates)
 * - Reliable event delivery (state persists across navigation)
 * - Clear join intent logging (debugging)
 *
 * Usage:
 *   await roomSessionManager.ensureJoined('create');  // When creating room
 *   await roomSessionManager.ensureJoined('join');    // When joining existing room
 *   await roomSessionManager.ensureJoined('rejoin');  // When rejoining from lobby
 *   await roomSessionManager.ensureJoined('refresh'); // When refreshing /game page
 *
 * Architecture:
 * - Lobby and GameBoard subscribe to session state changes
 * - Navigation is driven by state changes, not events directly
 * - WebSocket events update session state via onRoomJoined/onGameStarted
 *
 * See /home/opc/hexhaven/ROOM_JOIN_UNIFIED_ARCHITECTURE.md for details.
 */

import { websocketService } from './websocket.service';
import { getLastRoomCode, getPlayerNickname, getPlayerUUID } from '../utils/storage';
import type { GameStartedPayload } from '../../../shared/types/events';

/**
 * Join intent - indicates WHY a join is happening
 * Used for backend logging and debugging
 */
export type JoinIntent = 'create' | 'join' | 'rejoin' | 'refresh';

/**
 * Room status lifecycle
 */
export type RoomStatus = 'disconnected' | 'joining' | 'lobby' | 'active';

/**
 * Player role in the room
 */
export type PlayerRole = 'host' | 'player' | null;

/**
 * Room session state
 */
export interface RoomSessionState {
  roomCode: string | null;
  status: RoomStatus;
  playerRole: PlayerRole;
  gameState: GameStartedPayload | null;
  lastJoinIntent: JoinIntent | null;
}

/**
 * Room joined event data (from backend)
 */
interface RoomJoinedPayload {
  roomId: string;
  roomCode: string;
  roomStatus: 'lobby' | 'active' | 'completed' | 'abandoned';
  players: Array<{
    id: string;
    nickname: string;
    isHost: boolean;
    characterClass?: string;
  }>;
  scenarioId?: string;
}

/**
 * State update callback
 */
type StateUpdateCallback = (state: RoomSessionState) => void;

/**
 * RoomSessionManager class
 * Singleton service managing room session lifecycle
 */
class RoomSessionManager {
  private state: RoomSessionState = {
    roomCode: null,
    status: 'disconnected',
    playerRole: null,
    gameState: null,
    lastJoinIntent: null,
  };

  // Prevents duplicate joins within same session
  private hasJoinedInSession = false;

  // Subscription callbacks
  private subscribers: Set<StateUpdateCallback> = new Set();

  /**
   * Subscribe to session state changes
   * Returns unsubscribe function
   */
  public subscribe(callback: StateUpdateCallback): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current session state (immutable copy)
   */
  public getState(): RoomSessionState {
    return { ...this.state };
  }

  /**
   * Emit state update to all subscribers
   */
  private emitStateUpdate(): void {
    const stateCopy = this.getState();
    this.subscribers.forEach((callback) => {
      try {
        callback(stateCopy);
      } catch (error) {
        console.error('[RoomSessionManager] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Wait for WebSocket connection to be established
   * Times out after 5 seconds
   */
  private async waitForConnection(): Promise<void> {
    if (websocketService.isConnected()) {
      console.log('[RoomSessionManager] WebSocket already connected');
      return Promise.resolve();
    }

    console.log('[RoomSessionManager] Waiting for WebSocket connection...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        websocketService.off('ws_connected', handleConnected);
        reject(new Error('WebSocket connection timeout (5 seconds)'));
      }, 5000);

      const handleConnected = () => {
        clearTimeout(timeout);
        websocketService.off('ws_connected', handleConnected);
        console.log('[RoomSessionManager] WebSocket connected');
        resolve();
      };

      websocketService.on('ws_connected', handleConnected);
    });
  }

  /**
   * Ensure player has joined the room
   *
   * This is the ONLY method that calls websocketService.joinRoom()
   * All components should call this instead of joining directly
   *
   * Idempotent: Multiple calls in same session result in only ONE join
   *
   * @param intent - Why is this join happening? Used for logging
   * @throws Error if room data is missing or connection fails
   */
  public async ensureJoined(intent: JoinIntent): Promise<void> {
    console.log(`[RoomSessionManager] ensureJoined called with intent: ${intent}`);

    // Prevent duplicate joins in same session
    if (this.hasJoinedInSession && this.state.status !== 'disconnected') {
      // Special case: Allow 'refresh' intent if we're in an active game but missing game state
      // This happens when navigating to /game after Lobby has unmounted
      if (intent === 'refresh' && this.state.status === 'active' && !this.state.gameState) {
        console.log('[RoomSessionManager] Refresh intent with missing game state - proceeding to fetch from backend');
      } else {
        console.log(
          `[RoomSessionManager] Already joined in this session (status: ${this.state.status}), skipping duplicate join`
        );
        return;
      }
    }

    try {
      // Get room info from state or localStorage
      const roomCode = this.state.roomCode || getLastRoomCode();
      const nickname = getPlayerNickname();
      const uuid = getPlayerUUID();

      // Validation
      if (!roomCode) {
        throw new Error('No room code available - cannot join room');
      }
      if (!nickname || !uuid) {
        throw new Error('Missing player credentials (nickname or UUID)');
      }

      // Update state: we're attempting to join
      this.state.status = 'joining';
      this.state.lastJoinIntent = intent;
      this.state.roomCode = roomCode; // Ensure state has room code
      this.emitStateUpdate();

      // Wait for WebSocket connection (with timeout)
      await this.waitForConnection();

      // Call WebSocket service to emit join_room event
      websocketService.joinRoom(roomCode, nickname, uuid, intent);

      // Mark as joined to prevent duplicates
      this.hasJoinedInSession = true;

      console.log(
        `[RoomSessionManager] ✅ join_room emitted with intent: ${intent}, roomCode: ${roomCode}`
      );
    } catch (error) {
      // On error, mark as disconnected and re-throw
      console.error('[RoomSessionManager] ❌ Error in ensureJoined:', error);
      this.state.status = 'disconnected';
      this.emitStateUpdate();
      throw error;
    }
  }

  /**
   * Handle room_joined event from backend
   * Updates session state with room info
   */
  public onRoomJoined(data: RoomJoinedPayload): void {
    console.log('[RoomSessionManager] onRoomJoined:', data);

    // Update room code and status
    this.state.roomCode = data.roomCode;
    this.state.status = data.roomStatus === 'active' ? 'active' : 'lobby';

    // Determine player role
    const playerUUID = getPlayerUUID();
    const currentPlayer = data.players.find((p) => p.id === playerUUID);
    this.state.playerRole = currentPlayer?.isHost ? 'host' : 'player';

    console.log(
      `[RoomSessionManager] Room status updated: ${this.state.status}, role: ${this.state.playerRole}`
    );

    this.emitStateUpdate();
  }

  /**
   * Handle game_started event from backend
   * Updates session state with game data
   */
  public onGameStarted(data: GameStartedPayload): void {
    console.log('[RoomSessionManager] onGameStarted with', data.mapLayout?.length || 0, 'tiles');

    this.state.status = 'active';
    this.state.gameState = data;

    console.log('[RoomSessionManager] Game state stored, status set to active');

    this.emitStateUpdate();
  }

  /**
   * Handle WebSocket disconnection
   * Marks session as disconnected so next join will proceed
   */
  public onDisconnected(): void {
    console.log('[RoomSessionManager] WebSocket disconnected');

    this.state.status = 'disconnected';
    this.hasJoinedInSession = false; // Allow rejoin after disconnect

    this.emitStateUpdate();
  }

  /**
   * Reset session state (on intentional leave or logout)
   */
  public reset(): void {
    console.log('[RoomSessionManager] Resetting session');

    this.state = {
      roomCode: null,
      status: 'disconnected',
      playerRole: null,
      gameState: null,
      lastJoinIntent: null,
    };

    this.hasJoinedInSession = false;

    this.emitStateUpdate();
  }

  /**
   * Clear game state only (keep room membership)
   * Used when game ends but player stays in lobby
   */
  public clearGameState(): void {
    console.log('[RoomSessionManager] Clearing game state');

    this.state.gameState = null;
    this.state.status = 'lobby';

    this.emitStateUpdate();
  }
}

// Export singleton instance
export const roomSessionManager = new RoomSessionManager();
