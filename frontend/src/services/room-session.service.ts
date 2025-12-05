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
import {
  getLastRoomCode,
  getPlayerNickname,
  getPlayerUUID,
  getOrCreatePlayerUUID,
  saveLastRoomCode,
  savePlayerNickname,
} from '../utils/storage';
import { getApiUrl } from '../config/api';
import { loggingService } from './logging.service';
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
import type { Player } from '../components/PlayerList';

export interface RoomSessionState {
  roomCode: string | null;
  status: RoomStatus;
  playerRole: PlayerRole;
  players: Player[];
  gameState: GameStartedPayload | null;
  lastJoinIntent: JoinIntent | null;
  error: { message: string } | null;
}

/**
 * Room joined event data (from backend)
 */
export interface RoomJoinedPayload {
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
    players: [],
    gameState: null,
    lastJoinIntent: null,
    error: null,
  };

  // Prevents duplicate joins within same session
  private hasJoinedInSession = false;
  private joinInProgress = false;

  // Subscription callbacks
  private subscribers: Set<StateUpdateCallback> = new Set();

  constructor() {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners(): void {
    websocketService.on('room_joined', this.onRoomJoined.bind(this));
    websocketService.on('player_joined', (data) => this.onPlayerJoined({
      id: data.player.id,
      nickname: data.player.nickname,
      isHost: data.player.isHost,
      connectionStatus: 'connected',
      isReady: false,
    }));
    websocketService.on('player_left', (data) => this.onPlayerLeft(data.playerId));
    websocketService.on('character_selected', (data) => this.onCharacterSelected(data.playerId, data.characterClass));
    websocketService.on('game_started', this.onGameStarted.bind(this));
    websocketService.on('ws_disconnected', this.onDisconnected.bind(this));
  }

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
        loggingService.error('State', 'Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Wait for WebSocket connection to be established
   * Times out after 5 seconds
   */
  private async waitForConnection(): Promise<void> {
    if (websocketService.isConnected()) {
      loggingService.log('WebSocket', 'WebSocket already connected');
      return Promise.resolve();
    }

    loggingService.log('WebSocket', 'Waiting for WebSocket connection...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        websocketService.off('ws_connected', handleConnected);
        reject(new Error('WebSocket connection timeout (5 seconds)'));
      }, 5000);

      const handleConnected = () => {
        clearTimeout(timeout);
        websocketService.off('ws_connected', handleConnected);
        loggingService.log('WebSocket', 'WebSocket connected');
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
    if (this.joinInProgress) {
      loggingService.warn('WebSocket', 'Join already in progress, skipping request');
      return;
    }
    this.joinInProgress = true;

    try {
      loggingService.log('WebSocket', `ensureJoined called with intent: ${intent}`);

      // Prevent duplicate joins in same session
      if (this.hasJoinedInSession && this.state.status !== 'disconnected') {
        // Special case: Allow 'refresh' intent if we're in an active game but missing game state
        // This happens when navigating to /game after Lobby has unmounted
        if (intent === 'refresh' && this.state.status === 'active' && !this.state.gameState) {
          loggingService.log('State', 'Refresh intent with missing game state - proceeding to fetch from backend');
        } else {
          loggingService.log(
            'State',
            `Already joined in this session (status: ${this.state.status}), skipping duplicate join`
          );
          return;
        }
      }

      // Get room info from state or localStorage
      // When creating a new room, always use fresh roomCode from localStorage
      // to avoid using stale roomCode from previous game session
      const roomCode = intent === 'create'
        ? getLastRoomCode() || this.state.roomCode
        : this.state.roomCode || getLastRoomCode();
      const nickname = getPlayerNickname();
      const uuid = getPlayerUUID();

      // Validation
      if (!roomCode) {
        throw new Error('No room code available - cannot join room');
      }
      if (!nickname || !uuid) {
        throw new Error('Missing player credentials (nickname or UUID)');
      }

      // Leave previous room if switching to a different room
      // This prevents being in multiple Socket.IO rooms simultaneously
      const previousRoomCode = this.state.roomCode;
      if (previousRoomCode && previousRoomCode !== roomCode) {
        loggingService.log('WebSocket', `Leaving previous room ${previousRoomCode} before joining ${roomCode}`);
        websocketService.leaveRoom(previousRoomCode);
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

      loggingService.log(
        'WebSocket',
        `✅ join_room emitted with intent: ${intent}, roomCode: ${roomCode}`
      );
    } catch (error) {
      // On error, mark as disconnected and set error state
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      loggingService.error('WebSocket', '❌ Error in ensureJoined:', errorMessage);
      this.state.status = 'disconnected';
      this.state.error = { message: errorMessage };
      this.emitStateUpdate();
    } finally {
      this.joinInProgress = false;
    }
  }

  /**
   * Handle room_joined event from backend
   * Updates session state with room info
   */
  public onRoomJoined(data: RoomJoinedPayload): void {
    loggingService.log('WebSocket', 'onRoomJoined:', data);

    this.state.roomCode = data.roomCode;
    this.state.status = data.roomStatus === 'active' ? 'active' : 'lobby';
    this.state.players = data.players.map(p => ({
      ...p,
      connectionStatus: 'connected',
      isReady: !!p.characterClass, // Derive isReady from characterClass presence
    }));

    const playerUUID = getPlayerUUID();
    const currentPlayer = data.players.find((p) => p.id === playerUUID);
    this.state.playerRole = currentPlayer?.isHost ? 'host' : 'player';

    loggingService.log(
      'State',
      `Room status updated: ${this.state.status}, role: ${this.state.playerRole}`
    );

    this.emitStateUpdate();
  }

  public onPlayerJoined(player: Player): void {
    this.state.players.push(player);
    this.emitStateUpdate();
  }

  public onPlayerLeft(playerId: string): void {
    this.state.players = this.state.players.filter(p => p.id !== playerId);
    this.emitStateUpdate();
  }

  public onCharacterSelected(playerId: string, characterClass: string): void {
    loggingService.log('WebSocket', 'onCharacterSelected:', { playerId, characterClass });
    loggingService.log('State', 'Current players:', this.state.players);

    this.state.players = this.state.players.map(p => {
      if (p.id === playerId) {
        loggingService.log('State', 'Updating player:', p.id, 'to', characterClass);
        return { ...p, characterClass, isReady: true };
      }
      return p;
    });

    loggingService.log('State', 'Updated players:', this.state.players);
    this.emitStateUpdate();
  }

  public async createRoom(nickname: string): Promise<void> {
    const uuid = getOrCreatePlayerUUID();
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, nickname }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    saveLastRoomCode(data.room.roomCode);
    savePlayerNickname(nickname);
    await this.ensureJoined('create');
  }

  public async joinRoom(roomCode: string, nickname: string): Promise<void> {
    savePlayerNickname(nickname);
    saveLastRoomCode(roomCode);
    await this.ensureJoined('join');
  }

  /**
   * Handle game_started event from backend
   * Updates session state with game data
   */
  public onGameStarted(data: GameStartedPayload): void {
    loggingService.log('WebSocket', 'onGameStarted with', data.mapLayout?.length || 0, 'tiles');

    this.state.status = 'active';
    this.state.gameState = data;

    loggingService.log('State', 'Game state stored, status set to active');

    this.emitStateUpdate();
  }

  /**
   * Handle WebSocket disconnection
   * Marks session as disconnected so next join will proceed
   */
  public onDisconnected(): void {
    loggingService.log('WebSocket', 'WebSocket disconnected');

    this.state.status = 'disconnected';
    this.hasJoinedInSession = false; // Allow rejoin after disconnect

    this.emitStateUpdate();
  }

  /**
   * Reset session state (on intentional leave or logout)
   */
  public reset(): void {
    loggingService.log('State', 'Resetting session');

    this.state = {
      roomCode: null,
      status: 'disconnected',
      playerRole: null,
      players: [],
      gameState: null,
      lastJoinIntent: null,
      error: null,
    };

    this.hasJoinedInSession = false;

    this.emitStateUpdate();
  }

  /**
   * Switch to a different room (clears frontend state only)
   * Does NOT leave the room on backend to keep room in "My Rooms"
   * Backend room is left when actually joining a different room (see ensureJoined)
   *
   * IMPORTANT: Also notifies game state manager to reset
   */
  public switchRoom(): void {
    loggingService.log('State', 'Switching room - clearing frontend state');

    // Clear frontend state only (don't leave backend room yet)
    this.state = {
      roomCode: null,
      status: 'disconnected',
      playerRole: null,
      players: [],
      gameState: null,
      lastJoinIntent: null,
      error: null,
    };

    this.hasJoinedInSession = false;

    // Emit state update - game-state-service will listen and reset itself synchronously
    this.emitStateUpdate();
  }

  /**
   * Clear game state only (keep room membership)
   * Used when game ends but player stays in lobby
   */
  public clearGameState(): void {
    loggingService.log('State', 'Clearing game state');

    this.state.gameState = null;
    this.state.status = 'lobby';

    this.emitStateUpdate();
  }
}

// Export singleton instance
export const roomSessionManager = new RoomSessionManager();
