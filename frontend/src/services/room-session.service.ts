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
import { authService } from './auth.service';
import {
  getLastRoomCode,
  getPlayerUUID,
  getOrCreatePlayerUUID,
  saveLastRoomCode,
  savePlayerNickname,
  saveLastGameActive,
  clearLastGameActive,
  getDisplayName,
  isUserAuthenticated,
} from '../utils/storage';
import { getApiUrl } from '../config/api';
import type { GameStartedPayload } from '../../../shared/types/events';
import type { CharacterClass } from '../../../shared/types/entities';

/**
 * Join intent - indicates WHY a join is happening
 * Used for backend logging and debugging
 */
export type JoinIntent = 'create' | 'join' | 'rejoin' | 'refresh';

/**
 * Room status lifecycle (DEPRECATED - use connectionStatus + isGameActive)
 * @deprecated Will be removed after #309-317 migration
 */
export type RoomStatus = 'disconnected' | 'joining' | 'lobby' | 'active';

/**
 * Connection status - tracks WebSocket/room connection state
 * Separated from game mode state for Issue #308
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Player role in the room
 */
export type PlayerRole = 'host' | 'player' | null;

/**
 * Current player's character selection state
 * Single source of truth for character selections
 */
export interface CurrentPlayerCharacters {
  characterClasses: CharacterClass[];
  characterIds: string[];
  activeIndex: number;
}

/**
 * Room session state
 */
import type { Player } from '../components/PlayerList';

export interface RoomSessionState {
  roomCode: string | null;

  /**
   * Connection status - tracks WebSocket/room connection state
   * @see Issue #308 - RoomSessionManager Simplification
   */
  connectionStatus: ConnectionStatus;

  /**
   * Whether a game is actively in progress
   * false = in lobby (waiting to start)
   * true = game is active
   * @see Issue #308 - RoomSessionManager Simplification
   */
  isGameActive: boolean;

  /**
   * @deprecated Use connectionStatus + isGameActive instead
   * Will be removed after #309-317 migration
   * Computed: disconnected→disconnected, connecting→joining, connected+!active→lobby, connected+active→active
   */
  status: RoomStatus;

  playerRole: PlayerRole;
  players: Player[];
  gameState: GameStartedPayload | null;
  lastJoinIntent: JoinIntent | null;
  error: { message: string } | null;
  /** Current player's character selections (single source of truth) */
  currentPlayerCharacters: CurrentPlayerCharacters;

  /**
   * Campaign ID if this room is part of a campaign
   * @see Issue #308 - Campaign context tracking
   */
  campaignId: string | null;

  /**
   * Scenario ID for the current room
   * @see Issue #308 - Scenario context tracking
   */
  scenarioId: string | null;
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
  campaignId?: string;
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
    connectionStatus: 'disconnected',
    isGameActive: false,
    status: 'disconnected', // Computed for backward compatibility
    playerRole: null,
    players: [],
    gameState: null,
    lastJoinIntent: null,
    error: null,
    currentPlayerCharacters: {
      characterClasses: [],
      characterIds: [],
      activeIndex: 0,
    },
    campaignId: null,
    scenarioId: null,
  };

  // Prevents duplicate joins within same session
  private hasJoinedInSession = false;
  private joinInProgress = false;

  // Subscription callbacks
  private subscribers: Set<StateUpdateCallback> = new Set();

  constructor() {
    this.setupWebSocketListeners();
  }

  /**
   * Compute backward-compatible status from connectionStatus and isGameActive
   * @deprecated This is for backward compatibility during #309-317 migration
   */
  private computeStatus(): RoomStatus {
    if (this.state.connectionStatus === 'disconnected') return 'disconnected';
    if (this.state.connectionStatus === 'connecting') return 'joining';
    if (this.state.isGameActive) return 'active';
    return 'lobby';
  }

  /**
   * Update state with new connectionStatus/isGameActive and auto-compute status
   * This ensures status is always in sync during the transition period
   */
  private updateConnectionState(
    connectionStatus: ConnectionStatus,
    isGameActive?: boolean
  ): void {
    this.state.connectionStatus = connectionStatus;
    if (isGameActive !== undefined) {
      this.state.isGameActive = isGameActive;
    }
    this.state.status = this.computeStatus();
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
    websocketService.on('character_selected', (data) => this.onCharacterSelected(
      data.playerId,
      data.characterClasses || (data.characterClass ? [data.characterClass] : []),
      data.characterIds || [],
      data.activeIndex ?? 0
    ));
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
    if (this.joinInProgress) {
      console.warn('[RoomSessionManager] Join already in progress, skipping request');
      return;
    }
    this.joinInProgress = true;

    try {
      console.log(`[RoomSessionManager] ensureJoined called with intent: ${intent}`);

      // Prevent duplicate joins in same session
      if (this.hasJoinedInSession && this.state.connectionStatus !== 'disconnected') {
        // Special case: Allow 'refresh' intent if we're in an active game but missing game state
        // This happens when navigating to /game after Lobby has unmounted
        if (intent === 'refresh' && this.state.isGameActive && !this.state.gameState) {
          console.log('[RoomSessionManager] Refresh intent with missing game state - proceeding to fetch from backend');
        } else {
          console.log(
            `[RoomSessionManager] Already joined in this session (connectionStatus: ${this.state.connectionStatus}, isGameActive: ${this.state.isGameActive}), skipping duplicate join`
          );
          return;
        }
      }

      // Get room info from state or localStorage
      // - 'create': Use fresh roomCode from localStorage (just created)
      // - 'refresh': Prefer localStorage (URL roomCode saved by GameBoard) to handle direct URL navigation
      // - 'join'/'rejoin': Use state first, fallback to localStorage
      const roomCode = (intent === 'create' || intent === 'refresh')
        ? getLastRoomCode() || this.state.roomCode
        : this.state.roomCode || getLastRoomCode();
      const nickname = getDisplayName();
      const userId = getPlayerUUID(); // Returns database user ID for authenticated users

      // Validation
      if (!roomCode) {
        throw new Error('No room code available - cannot join room');
      }
      if (!nickname || !userId) {
        throw new Error('Missing player credentials (nickname or user ID)');
      }

      // Leave previous room if switching to a different room
      // This prevents being in multiple Socket.IO rooms simultaneously
      const previousRoomCode = this.state.roomCode;
      if (previousRoomCode && previousRoomCode !== roomCode) {
        console.log(`[RoomSessionManager] Leaving previous room ${previousRoomCode} before joining ${roomCode}`);
        websocketService.leaveRoom(previousRoomCode);
      }

      // Update state: we're attempting to join
      this.updateConnectionState('connecting');
      this.state.lastJoinIntent = intent;
      this.state.roomCode = roomCode; // Ensure state has room code
      this.emitStateUpdate();

      // Wait for WebSocket connection (with timeout)
      await this.waitForConnection();

      // Call WebSocket service to emit join_room event
      websocketService.joinRoom(roomCode, nickname, userId, intent);

      // Mark as joined to prevent duplicates
      this.hasJoinedInSession = true;

      console.log(
        `[RoomSessionManager] ✅ join_room emitted with intent: ${intent}, roomCode: ${roomCode}`
      );
    } catch (error) {
      // On error, mark as disconnected and set error state
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('[RoomSessionManager] ❌ Error in ensureJoined:', errorMessage);
      this.updateConnectionState('disconnected', false);
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
    console.log('[RoomSessionManager] onRoomJoined:', data);

    this.state.roomCode = data.roomCode;
    // Issue #308: Separate connection status from game active state
    this.updateConnectionState('connected', data.roomStatus === 'active');

    this.state.players = data.players.map(p => ({
      ...p,
      connectionStatus: 'connected',
      isReady: !!p.characterClass, // Derive isReady from characterClass presence
    }));

    const currentUserId = getPlayerUUID(); // Returns database user ID for authenticated users
    const currentPlayer = data.players.find((p) => p.id === currentUserId);
    this.state.playerRole = currentPlayer?.isHost ? 'host' : 'player';

    // Issue #308: Store campaign and scenario context
    this.state.campaignId = data.campaignId || null;
    this.state.scenarioId = data.scenarioId || null;

    console.log(
      `[RoomSessionManager] Room status updated: connectionStatus=${this.state.connectionStatus}, isGameActive=${this.state.isGameActive}, role: ${this.state.playerRole}`
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

  public onCharacterSelected(
    playerId: string,
    characterClasses: string[],
    characterIds: string[] = [],
    activeIndex: number = 0
  ): void {
    console.log('[RoomSessionManager] onCharacterSelected:', { playerId, characterClasses, characterIds, activeIndex });
    console.log('[RoomSessionManager] Current players:', this.state.players);

    const currentUserId = getPlayerUUID(); // Returns database user ID for authenticated users

    // Update players array (all players)
    this.state.players = this.state.players.map(p => {
      if (p.id === playerId) {
        const characterClass = characterClasses[0] || undefined; // First character for backward compatibility
        console.log('[RoomSessionManager] Updating player:', p.id, 'to', characterClasses.join(', '));
        return { ...p, characterClass, characterClasses, isReady: characterClasses.length > 0 };
      }
      return p;
    });

    // If this is the current player, update their dedicated character selection state
    if (playerId === currentUserId) {
      console.log('[RoomSessionManager] Updating current player character state');
      this.state.currentPlayerCharacters = {
        characterClasses: characterClasses as CharacterClass[],
        characterIds,
        activeIndex,
      };
    }

    console.log('[RoomSessionManager] Updated players:', this.state.players);
    this.emitStateUpdate();
  }

  public async createRoom(
    nickname: string,
    options?: { campaignId?: string; scenarioId?: string; isSoloGame?: boolean }
  ): Promise<void> {
    // Get user ID - database ID for authenticated users, or generate UUID for anonymous
    let userId: string;
    const user = authService.getUser();
    if (user?.id) {
      userId = user.id;
    } else {
      // Anonymous user - use or generate a UUID
      userId = getPlayerUUID() || getOrCreatePlayerUUID();
    }

    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        nickname,
        campaignId: options?.campaignId,
        scenarioId: options?.scenarioId,
        isSoloGame: options?.isSoloGame,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    saveLastRoomCode(data.room.roomCode);

    // Store whether the game is active for HomePage continue routing
    if (options?.isSoloGame) {
      saveLastGameActive(true);
    } else {
      saveLastGameActive(false);
    }

    // Only save nickname for anonymous users
    // Authenticated users use their username dynamically
    if (!isUserAuthenticated()) {
      savePlayerNickname(nickname);
    }

    await this.ensureJoined('create');
  }

  public async joinRoom(roomCode: string, nickname: string): Promise<void> {
    // Only save nickname for anonymous users
    // Authenticated users use their username dynamically
    if (!isUserAuthenticated()) {
      savePlayerNickname(nickname);
    }

    saveLastRoomCode(roomCode);
    await this.ensureJoined('join');
  }

  /**
   * Handle game_started event from backend
   * Updates session state with game data
   */
  public onGameStarted(data: GameStartedPayload): void {
    console.log('[RoomSessionManager] onGameStarted with', data.mapLayout?.length || 0, 'tiles');

    // Issue #308: Set isGameActive to true (connectionStatus remains 'connected')
    this.updateConnectionState('connected', true);
    this.state.gameState = data;

    // Save game active state for HomePage Continue Game routing
    saveLastGameActive(true);

    console.log('[RoomSessionManager] Game state stored, isGameActive=true');

    this.emitStateUpdate();
  }

  /**
   * Handle WebSocket disconnection
   * Marks session as disconnected so next join will proceed
   */
  public onDisconnected(): void {
    console.log('[RoomSessionManager] WebSocket disconnected');

    // Issue #308: Set connectionStatus to disconnected (preserve isGameActive for reconnection context)
    this.updateConnectionState('disconnected');
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
      connectionStatus: 'disconnected',
      isGameActive: false,
      status: 'disconnected', // Computed for backward compatibility
      playerRole: null,
      players: [],
      gameState: null,
      lastJoinIntent: null,
      error: null,
      currentPlayerCharacters: {
        characterClasses: [],
        characterIds: [],
        activeIndex: 0,
      },
      campaignId: null,
      scenarioId: null,
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
    console.log('[RoomSessionManager] Switching room - clearing frontend state');

    // Clear frontend state only (don't leave backend room yet)
    this.state = {
      roomCode: null,
      connectionStatus: 'disconnected',
      isGameActive: false,
      status: 'disconnected', // Computed for backward compatibility
      playerRole: null,
      players: [],
      gameState: null,
      lastJoinIntent: null,
      error: null,
      currentPlayerCharacters: {
        characterClasses: [],
        characterIds: [],
        activeIndex: 0,
      },
      campaignId: null,
      scenarioId: null,
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
    console.log('[RoomSessionManager] Clearing game state');

    this.state.gameState = null;
    // Issue #308: Keep connected but set game as not active
    this.updateConnectionState('connected', false);

    // Clear game active state for HomePage routing
    clearLastGameActive();

    this.emitStateUpdate();
  }
}

// Export singleton instance
export const roomSessionManager = new RoomSessionManager();
