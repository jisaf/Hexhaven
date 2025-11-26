/**
 * Enhanced WebSocket Client Service (US4 - T157, T159, T160, T161)
 *
 * Handles real-time communication with the backend using Socket.io.
 * Includes automatic reconnection with exponential backoff, session restoration,
 * and player disconnect/reconnect event handling.
 */

import { io, Socket } from 'socket.io-client';
import { getOrCreatePlayerUUID, saveLastRoomCode } from '../utils/storage';
import type {
  RoomJoinedPayload,
  GameStartedPayload,
  PlayerLeftPayload,
  PlayerDisconnectedPayload,
  PlayerReconnectedPayload,
  CharacterSelectedPayload,
  RoundEndedPayload,
  TurnEntity,
  DebugLogPayload,
} from '../../../shared/types/events';

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
  room_joined: (data: RoomJoinedPayload) => void;
  player_joined: (data: { player: { id: string; nickname: string; isHost: boolean } }) => void;
  player_left: (data: PlayerLeftPayload) => void;
  player_disconnected: (data: PlayerDisconnectedPayload) => void;
  player_reconnected: (data: PlayerReconnectedPayload) => void;

  // Character selection
  character_selected: (data: CharacterSelectedPayload) => void;

  // Game start
  game_started: (data: GameStartedPayload) => void;

  // Turn events
  turn_order_determined: (data: { turnOrder: string[] }) => void;
  turn_started: (data: { entityId: string; entityType: 'character' | 'monster'; turnIndex: number }) => void;

  // Round events
  round_started: (data: { roundNumber: number; turnOrder: TurnEntity[] }) => void;
  round_ended: (data: RoundEndedPayload) => void;

  // Movement
  character_moved: (data: { characterId: string; fromHex: { q: number; r: number }; toHex: { q: number; r: number }; movementPath: { q: number; r: number }[] }) => void;

  // Attack
  attack_resolved: (data: {
    attackerId: string;
    targetId: string;
    damage: number;
    modifier: number | 'null' | 'x2';
    effects: string[];
    targetHealth: number;
    targetDead: boolean;
  }) => void;

  // Loot
  loot_collected: (data: {
    playerId: string;
    lootTokenId: string;
    hexCoordinates: { q: number; r: number };
    goldValue: number;
  }) => void;

  // Monster AI
  monster_activated: (data: {
    monsterId: string;
    focusTarget: string;
    movement: { q: number; r: number };
    attack: {
      targetId: string;
      damage: number;
      modifier: number | 'null' | 'x2';
    } | null;
  }) => void;

  // Cards
  cards_selected: (data: { playerId: string; topCardId: string; bottomCardId: string }) => void;

  // Scenario
  scenario_completed: (data: { victory: boolean; rewards: { experience: number; loot: string[] } }) => void;

  // State updates
  game_state_update: (data: { gameState: Record<string, unknown> }) => void;

  // Debug logging
  debug_log: (data: DebugLogPayload) => void;

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
  private registeredEvents: Set<string> = new Set(); // Track which events are registered with Socket.IO
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private playerUUID: string | null = null;

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

      // Register all queued events with the connected socket
      console.log('WebSocket connected - registering queued events');
      for (const event of this.eventHandlers.keys()) {
        this.registerEventWithSocket(event as EventName);
      }

      this.emit('ws_connected');
      console.log('WebSocket connected', { playerUUID: this.playerUUID });

      // Auto-rejoin removed - RoomSessionManager now handles room joining
      // See /home/opc/hexhaven/ROOM_JOIN_UNIFIED_ARCHITECTURE.md for architecture details
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionStatus = 'disconnected';
      this.emit('ws_disconnected');
      console.log('WebSocket disconnected:', reason);

      // Clear registered events so they can be re-registered on reconnect
      this.registeredEvents.clear();

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
   * Register event handler (supports acknowledgment callbacks)
   * Queues handlers if socket not connected yet - they'll be registered on connection
   */
  on<T extends EventName>(event: T, handler: EventHandler<T>): void {
    // Store handler for internal tracking (even if socket not connected yet)
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
      console.log(`📝 Creating new handler set for event: ${event}`);
    }
    this.eventHandlers.get(event)!.add(handler);
    console.log(`📝 Added handler for "${event}" (total: ${this.eventHandlers.get(event)!.size})`);

    // If socket is connected and this event hasn't been registered yet, register it now
    if (this.socket && !this.registeredEvents.has(event)) {
      console.log(`   Socket connected, registering "${event}" immediately`);
      this.registerEventWithSocket(event);
    } else if (!this.socket) {
      console.log(`   Socket not connected, "${event}" will be registered on connect`);
    } else {
      console.log(`   "${event}" already registered with Socket.IO`);
    }
    // Otherwise, handler will be registered when socket connects (see setupConnectionHandlers)
  }

  /**
   * Internal method to register an event with Socket.IO
   * This registers ONE listener per event that calls ALL stored handlers
   */
  private registerEventWithSocket<T extends EventName>(event: T): void {
    if (!this.socket) return;
    if (this.registeredEvents.has(event)) return; // Already registered

    // Create a wrapper that calls ALL handlers for this event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrappedHandler = ((...args: any[]): void => {
      // Debug logging for all events
      console.log(`🔔 WebSocket event "${event}" received`, args.length > 0 ? args[0] : '(no data)');

      // Call ALL registered handlers for this event
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        console.log(`   Calling ${handlers.size} handler(s) for "${event}"`);
        for (const handler of handlers) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (handler as any)(...args);
          } catch (error) {
            console.error(`   ❌ Error in handler for "${event}":`, error);
          }
        }
      } else {
        console.warn(`   ⚠️  No handlers found for "${event}"`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    // Register with socket.io (one listener per event)
    this.socket.on(event, wrappedHandler);
    this.registeredEvents.add(event);
    console.log(`✅ Registered Socket.IO listener for event: ${event}`);
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
      this.registeredEvents.delete(event); // Fix: Also remove from registeredEvents
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
   * @param intent - Why is this join happening? Used for backend logging and debugging
   */
  joinRoom(roomCode: string, nickname: string, uuid?: string, intent?: string): void {
    const playerUUID = uuid || this.playerUUID || getOrCreatePlayerUUID();

    // Store for future reference
    this.playerUUID = playerUUID;

    // Save to localStorage for page refresh recovery
    saveLastRoomCode(roomCode);

    this.emit('join_room', { roomCode, nickname, playerUUID, intent });
    console.log('Joining room:', { roomCode, nickname, playerUUID, intent });
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
  startGame(scenarioId: string = 'scenario-1'): void {
    this.emit('start_game', { scenarioId });
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
