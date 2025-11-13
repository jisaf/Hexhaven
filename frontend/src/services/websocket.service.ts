/**
 * Enhanced WebSocket Client Service (US4 - T157, T159, T160, T161)
 *
 * Handles real-time communication with the backend using Socket.io.
 * Includes automatic reconnection with exponential backoff, session restoration,
 * and player disconnect/reconnect event handling.
 */

import { io, Socket } from 'socket.io-client';
import { getOrCreatePlayerUUID, saveLastRoomCode, getLastRoomCode } from '../utils/storage';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'failed';

/**
 * WebSocket event types
 */
export interface WebSocketEvents {
  // Connection events (renamed to avoid Socket.IO reserved events)
  ws_connected: () => void;
  ws_disconnected: () => void;
  ws_reconnecting: () => void;
  ws_reconnected: () => void;

  // Room events
  room_joined: (data: { roomCode: string; players: unknown[]; playerId: string; isHost: boolean }) => void;
  player_joined: (data: { player: unknown }) => void;
  player_left: (data: { playerId: string }) => void;
  player_disconnected: (data: { playerId: string; playerName: string }) => void;
  player_reconnected: (data: { playerId: string; playerName: string }) => void;

  // Character selection
  character_selected: (data: { playerId: string; characterClass: string }) => void;

  // Game start
  game_started: (data: { gameState: { board: unknown; currentPlayerId: string } }) => void;

  // Turn events
  turn_order_determined: (data: { turnOrder: string[] }) => void;
  next_turn_started: (data: { currentTurnIndex: number; entityId: string }) => void;

  // Movement
  character_moved: (data: { characterId: string; targetHex: { q: number; r: number } }) => void;

  // Attack
  attack_resolved: (data: {
    attackerId: string;
    targetId: string;
    damage: number;
    modifier: unknown;
  }) => void;

  // Loot
  loot_collected: (data: {
    playerId: string;
    lootTokenId: string;
    hexCoordinates: { q: number; r: number };
    goldValue: number;
  }) => void;

  // Monster AI
  monster_activated: (data: { monsterId: string; actions: unknown[] }) => void;

  // Cards
  cards_selected: (data: { playerId: string; topCardId: string; bottomCardId: string }) => void;

  // Scenario
  scenario_completed: (data: { victory: boolean; rewards: unknown }) => void;

  // State updates
  game_state_update: (data: { gameState: unknown }) => void;

  // Errors
  error: (data: { message: string; code?: string }) => void;
}

export type EventName = keyof WebSocketEvents;
export type EventHandler<T extends EventName> = WebSocketEvents[T];

class WebSocketService {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventHandlers: Map<string, Set<any>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private playerUUID: string | null = null;
  private currentNickname: string | null = null;

  /**
   * Connect to WebSocket server with enhanced reconnection (US4 - T157)
   */
  connect(url: string = 'http://localhost:3000'): void {
    if (this.socket?.connected) {
      console.warn('WebSocket already connected');
      return;
    }

    // Get or create persistent UUID for session restoration
    this.playerUUID = getOrCreatePlayerUUID();

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000, // Start at 1 second
      reconnectionDelayMax: 10000, // Max 10 seconds (exponential backoff)
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 5000, // Connection timeout
      query: {
        playerUUID: this.playerUUID, // Send UUID for server-side session restoration
      },
    });

    this.setupConnectionHandlers();
    this.setupReconnectionHandlers();
  }

  /**
   * Setup connection event handlers (enhanced for US4)
   */
  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.emit('ws_connected');
      console.log('WebSocket connected', { playerUUID: this.playerUUID });

      // Auto-rejoin room if reconnecting (US4 - T157)
      const lastRoom = getLastRoomCode();
      if (lastRoom && this.currentNickname) {
        console.log('Auto-rejoining room:', lastRoom);
        this.joinRoom(lastRoom, this.currentNickname, this.playerUUID!);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionStatus = 'disconnected';
      this.emit('ws_disconnected');
      console.log('WebSocket disconnected:', reason);

      // Don't reconnect if disconnected by server or client intentionally
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        this.socket?.connect(); // Force reconnect
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.connectionStatus = 'reconnecting';
      this.reconnectAttempts = attemptNumber;
      this.emit('ws_reconnecting');
      console.log(`Reconnecting... (attempt ${attemptNumber}/${this.maxReconnectAttempts})`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.connectionStatus = 'connected';
      this.emit('ws_reconnected');
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_failed', () => {
      this.connectionStatus = 'failed';
      console.error('Reconnection failed after maximum attempts');
      this.emit('error', {
        message: 'Connection failed. Please refresh the page.',
        code: 'RECONNECT_FAILED',
      });
    });

    this.socket.on('error', (error: Error) => {
      this.emit('error', { message: error.message || 'WebSocket error' });
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Setup reconnection-specific event handlers (US4 - T159, T160)
   */
  private setupReconnectionHandlers(): void {
    if (!this.socket) return;

    // Handle other players disconnecting (US4 - T159)
    this.socket.on(
      'player_disconnected',
      (data: { playerId: string; nickname: string; willReconnect: boolean }) => {
        console.log('Player disconnected:', data);
        // Emit to application layer for UI updates
        this.emit('player_disconnected', {
          playerId: data.playerId,
          playerName: data.nickname,
        });
      },
    );

    // Handle other players reconnecting (US4 - T160)
    this.socket.on('player_reconnected', (data: { playerId: string; nickname: string }) => {
      console.log('Player reconnected:', data);
      // Emit to application layer for UI updates
      this.emit('player_reconnected', {
        playerId: data.playerId,
        playerName: data.nickname,
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
    }
  }

  /**
   * Register event handler
   */
  on<T extends EventName>(event: T, handler: EventHandler<T>): void {
    if (!this.socket) {
      console.warn('WebSocket not connected. Call connect() first.');
      return;
    }

    // Store handler for internal tracking
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Register with socket.io
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on(event, handler as any);
  }

  /**
   * Unregister event handler
   */
  off<T extends EventName>(event: T, handler?: EventHandler<T>): void {
    if (!this.socket) return;

    if (handler) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.off(event, handler as any);
      this.eventHandlers.get(event)?.delete(handler);
    } else {
      this.socket.off(event);
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: unknown): void {
    if (!this.socket || !this.socket.connected) {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Join a game room (enhanced for reconnection - US4)
   */
  joinRoom(roomCode: string, nickname: string, uuid?: string): void {
    const playerUUID = uuid || this.playerUUID || getOrCreatePlayerUUID();

    // Store for reconnection
    this.currentNickname = nickname;
    this.playerUUID = playerUUID;

    // Save to localStorage for page refresh recovery
    saveLastRoomCode(roomCode);

    this.emit('join_room', { roomCode, nickname, playerUUID });
    console.log('Joining room:', { roomCode, nickname, playerUUID });
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    this.emit('leave_room');
  }

  /**
   * Select character
   */
  selectCharacter(characterClass: string): void {
    this.emit('select_character', { characterClass });
  }

  /**
   * Select scenario (host only)
   */
  selectScenario(scenarioId: string): void {
    this.emit('select_scenario', { scenarioId });
  }

  /**
   * Start game (host only)
   */
  startGame(): void {
    this.emit('start_game');
  }

  /**
   * Move character
   */
  moveCharacter(targetHex: { q: number; r: number }): void {
    this.emit('move_character', { targetHex });
  }

  /**
   * Attack target
   */
  attackTarget(targetId: string): void {
    this.emit('attack_target', { targetId });
  }

  /**
   * Select cards for the turn
   */
  selectCards(topCardId: string, bottomCardId: string): void {
    this.emit('select_cards', { topCardId, bottomCardId });
  }

  /**
   * End turn
   */
  endTurn(): void {
    this.emit('end_turn');
  }

  /**
   * Collect loot token
   */
  collectLoot(hexCoordinates: { q: number; r: number }): void {
    this.emit('collect_loot', { hexCoordinates });
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get current reconnection attempt number
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Get max reconnection attempts
   */
  getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Check if currently reconnecting
   */
  isReconnecting(): boolean {
    return this.connectionStatus === 'reconnecting';
  }

  /**
   * Get player UUID
   */
  getPlayerUUID(): string | null {
    return this.playerUUID;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
