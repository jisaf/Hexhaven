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
  CharacterMovedPayload,
  AttackResolvedPayload,
  MonsterActivatedPayload,
  ObjectivesLoadedPayload,
  ObjectiveProgressUpdatePayload,
  CharacterExhaustedPayload,
  ScenarioCompletedPayload,
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
  character_moved: (data: CharacterMovedPayload) => void;

  // Attack
  attack_resolved: (data: AttackResolvedPayload) => void;

  // Loot
  loot_collected: (data: {
    playerId: string;
    lootTokenId: string;
    hexCoordinates: { q: number; r: number };
    goldValue: number;
  }) => void;

  // Monster AI
  monster_activated: (data: MonsterActivatedPayload) => void;
  monster_died: (data: { monsterId: string; killerId: string; hexCoordinates: { q: number; r: number } }) => void;
  loot_spawned: (data: { id: string; coordinates: { q: number; r: number }; value: number }) => void;

  // Cards
  cards_selected: (data: { playerId: string; topCardId: string; bottomCardId: string }) => void;

  // Scenario
  scenario_completed: (data: ScenarioCompletedPayload) => void;

  // Objectives (Phase 3)
  objectives_loaded: (data: ObjectivesLoadedPayload) => void;
  objective_progress: (data: ObjectiveProgressUpdatePayload) => void;
  character_exhausted: (data: CharacterExhaustedPayload) => void;

  // State updates
  game_state_update: (data: { gameState: Record<string, unknown> }) => void;

  // Debug logging
  debug_log: (data: DebugLogPayload) => void;

  // Rest mechanics
  'rest-event': (data: import('../../../shared/types/events').RestEventPayload) => void;

  // Item & Inventory events (Issue #205)
  item_used: (data: import('../../../shared/types/events').ItemUsedPayload) => void;
  items_refreshed: (data: import('../../../shared/types/events').ItemsRefreshedPayload) => void;
  item_equipped: (data: import('../../../shared/types/events').ItemEquippedPayload) => void;
  item_unequipped: (data: import('../../../shared/types/events').ItemUnequippedPayload) => void;
  equipment_changed: (data: { characterId: string; equipped: import('../../../shared/types/entities').EquippedItems }) => void;
  inventory_updated: (data: { characterId: string; items: import('../../../shared/types/entities').Item[] }) => void;

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
      for (const event of this.eventHandlers.keys()) {
        this.registerEventWithSocket(event as EventName);
      }

      this.emit('ws_connected');
      // Verbose connection logging removed

      // Auto-rejoin removed - RoomSessionManager now handles room joining
      // See /home/opc/hexhaven/ROOM_JOIN_UNIFIED_ARCHITECTURE.md for architecture details
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionStatus = 'disconnected';
      this.emit('ws_disconnected');
      // Disconnection handled via events

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
      // Reconnection handled via UI
    });

    this.socket.on('reconnect', () => {
      this.connectionStatus = 'connected';
      this.emit('ws_reconnected');
      // Reconnection success handled via UI
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
        // Emit to application layer for UI updates
        this.emit('player_disconnected', {
          playerId: data.playerId,
          playerName: data.nickname,
        });
      },
    );

    // Handle other players reconnecting (US4 - T160)
    this.socket.on('player_reconnected', (data: { playerId: string; nickname: string }) => {
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
   * @returns An unsubscribe function
   */
  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    if (this.socket && !this.registeredEvents.has(event)) {
      this.registerEventWithSocket(event);
    }

    // Return an unsubscribe function
    return () => {
      this.off(event, handler);
    };
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
      // Call ALL registered handlers for this event
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        for (const handler of handlers) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (handler as any)(...args);
          } catch (error) {
            console.error(`Error in handler for "${event}":`, error);
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    // Register with socket.io (one listener per event)
    this.socket.on(event, wrappedHandler);
    this.registeredEvents.add(event);
    // Event registration logging removed
  }

  /**
   * Unregister event handler
   */
  off<T extends EventName>(event: T, handler: EventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
        this.registeredEvents.delete(event);
        this.socket?.off(event);
      }
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
    // Verbose join logging removed - events handle this
  }

  /**
   * Leave a specific room (or current room if no roomCode provided)
   */
  leaveRoom(roomCode?: string): void {
    if (roomCode) {
      this.emit('leave_room', { roomCode });
    } else {
      this.emit('leave_room');
    }
  }

  /**
   * Select/add a character (multi-character support)
   * @param characterIdOrClass - Either a character UUID (persistent character) or a CharacterClass name (legacy)
   * @param action - 'add' to add a character, 'remove' to remove by index, 'set_active' to set active character
   * @param index - Index for 'remove' or 'set_active' actions
   */
  selectCharacter(characterIdOrClass: string, action: 'add' | 'remove' | 'set_active' = 'add', index?: number): void {
    // Handle remove and set_active actions
    if (action === 'remove' || action === 'set_active') {
      this.emit('select_character', { action, index });
      return;
    }

    // Check if input is a UUID (contains hyphens) or a character class name
    const isUUID = characterIdOrClass.includes('-');

    if (isUUID) {
      // Persistent character selection - send characterId
      this.emit('select_character', { characterId: characterIdOrClass, action });
    } else {
      // Legacy character class selection - send characterClass
      this.emit('select_character', { characterClass: characterIdOrClass, action });
    }
  }

  /**
   * Remove a character by index (multi-character support)
   */
  removeCharacter(index: number): void {
    this.emit('select_character', { action: 'remove', index });
  }

  /**
   * Set active character by index (multi-character support)
   */
  setActiveCharacter(index: number): void {
    this.emit('select_character', { action: 'set_active', index });
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
   * @param characterId - Which character is moving (required for multi-character support)
   * @param targetHex - Target hex coordinates
   */
  moveCharacter(characterId: string, targetHex: { q: number; r: number }): void {
    this.emit('move_character', { characterId, targetHex });
  }

  /**
   * Attack target
   * @param characterId - Which character is attacking (required for multi-character support)
   * @param targetId - Monster or character UUID to attack
   */
  attackTarget(characterId: string, targetId: string): void {
    this.emit('attack_target', { characterId, targetId });
  }

  /**
   * Select cards for the turn
   * @param topCardId - Card ID for top action
   * @param bottomCardId - Card ID for bottom action
   * @param characterId - Optional: which character's cards (for multi-character support)
   */
  selectCards(topCardId: string, bottomCardId: string, characterId?: string): void {
    this.emit('select_cards', { topCardId, bottomCardId, characterId });
  }

  /**
   * End turn
   */
  endTurn(): void {
    this.emit('end_turn');
  }

  /**
   * Collect loot token
   * @param characterId - Which character is collecting (required for multi-character support)
   * @param hexCoordinates - Hex coordinates of the loot token
   */
  collectLoot(characterId: string, hexCoordinates: { q: number; r: number }): void {
    this.emit('collect_loot', { characterId, hexCoordinates });
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
