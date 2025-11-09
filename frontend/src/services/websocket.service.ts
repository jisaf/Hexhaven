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
  room_joined: (data: { roomCode: string; players: any[] }) => void;
  player_joined: (data: { player: any }) => void;
  player_left: (data: { playerId: string }) => void;
  player_disconnected: (data: { playerId: string; playerName: string }) => void;
  player_reconnected: (data: { playerId: string; playerName: string }) => void;

  // Character selection
  character_selected: (data: { playerId: string; characterClass: string }) => void;

  // Game start
  game_started: (data: { gameState: any }) => void;

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
    modifier: any;
  }) => void;

  // Monster AI
  monster_activated: (data: { monsterId: string; actions: any[] }) => void;

  // Cards
  cards_selected: (data: { playerId: string; topCardId: string; bottomCardId: string }) => void;

  // Scenario
  scenario_completed: (data: { victory: boolean; rewards: any }) => void;

  // State updates
  game_state_update: (data: { gameState: any }) => void;

  // Errors
  error: (data: { message: string; code?: string }) => void;
}

export type EventName = keyof WebSocketEvents;
export type EventHandler<T extends EventName> = WebSocketEvents[T];

class WebSocketService {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private eventHandlers: Map<string, Set<Function>> = new Map();
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

    this.socket.on('error', (error: any) => {
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
    this.socket.on(event, handler as any);
  }

  /**
   * Unregister event handler
   */
  off<T extends EventName>(event: T, handler?: EventHandler<T>): void {
    if (!this.socket) return;

    if (handler) {
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
  emit(event: string, data?: any): void {
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
    this.emit('join_room', { roomCode, nickname, uuid });
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
