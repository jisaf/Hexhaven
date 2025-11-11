/**
 * WebSocket Client Service with Socket.io Integration
 *
 * Handles real-time communication with the backend using Socket.io.
 * Includes automatic reconnection and event handling.
 */

import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * WebSocket event types
 */
export interface WebSocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  reconnecting: () => void;
  reconnected: () => void;

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

  // Loot (US2 - T123)
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
  private maxReconnectAttempts = 10;

  /**
   * Connect to WebSocket server
   */
  connect(url: string = 'http://localhost:3000'): void {
    if (this.socket?.connected) {
      console.warn('WebSocket already connected');
      return;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupConnectionHandlers();
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.emit('connect');
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      this.connectionStatus = 'disconnected';
      this.emit('disconnect');
      console.log('WebSocket disconnected');
    });

    this.socket.on('reconnect_attempt', () => {
      this.connectionStatus = 'reconnecting';
      this.reconnectAttempts++;
      this.emit('reconnecting');
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
    });

    this.socket.on('reconnect', () => {
      this.connectionStatus = 'connected';
      this.emit('reconnected');
      console.log('WebSocket reconnected');
    });

    this.socket.on('error', (error: Error) => {
      this.emit('error', { message: error.message || 'WebSocket error' });
      console.error('WebSocket error:', error);
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
   * Join a game room
   */
  joinRoom(roomCode: string, nickname: string, uuid?: string): void {
    this.emit('join_room', { roomCode, nickname, playerUUID: uuid });
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
   * Collect loot token (US2 - T123)
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
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
