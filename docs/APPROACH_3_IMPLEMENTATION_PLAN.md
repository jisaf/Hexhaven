# Approach 3: Event-Sourced Architecture Implementation Plan

## Overview

This plan rebuilds the Hexhaven game engine using event sourcing, enabling:
1. Complete game replay and debugging
2. Reduced server load via batched WebSocket + HTTP lobby (issue #283 Option C)
3. Cryptographic audit trail for anti-cheat
4. Clean separation of concerns (resolves god objects)
5. **Future**: WebRTC P2P with Cloudflare TURN (documented below)

## Architecture Philosophy

**Phase 1 (Now):** Server-authoritative with optimized transport
- HTTP polling for lobbies (stateless, scalable)
- Batched WebSocket for active games (fewer messages)
- Server validates all events
- Event sourcing for replay/debugging

**Phase 2 (Future):** Optional P2P enhancement
- WebRTC with Cloudflare TURN
- Hybrid model: P2P real-time + server checkpoints
- Same event architecture, different transport

---

## Architecture Target

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  Event Bus   │───►│  Projections │───►│   React UI   │                   │
│  │  (received)  │    │  (derived)   │    │  (renders)   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         ▲                                                                    │
│         │                                                                    │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
┌─────────┴───────────────────────────────────────────────────────────────────┐
│                           TRANSPORT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LOBBY (Stateless)              │  ACTIVE GAME (Real-time)                  │
│  ─────────────────              │  ────────────────────────                  │
│  HTTP Polling (3s interval)     │  Batched WebSocket                        │
│  REST for actions               │  Events grouped per action                │
│  • GET  /rooms/:code/state      │  • Single message per player turn         │
│  • POST /rooms/:code/join       │  • Atomic state updates                   │
│  • POST /rooms/:code/character  │  • Sequence numbers for ordering          │
│  • POST /rooms/:code/start      │                                           │
│                                                                              │
│  Future: WebRTC P2P with Cloudflare TURN (see Phase 7)                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────────────────────────┐
│         ▼                        BACKEND                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Command    │───►│   Domain     │───►│   Event      │                   │
│  │   Handlers   │    │   Logic      │    │   Store      │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                                       │                            │
│         │ validate                              │ persist + broadcast        │
│         ▼                                       ▼                            │
│  ┌──────────────┐                        ┌──────────────┐                   │
│  │   Read       │◄───────────────────────│   Event      │                   │
│  │   Models     │    (project events)    │   Processor  │                   │
│  └──────────────┘                        └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Foundation (Week 1)

### 0.1 Event Schema Design

Define all game events with cryptographic signatures:

```typescript
// shared/types/events/base.ts
interface GameEvent {
  // Identity
  id: string;                    // UUID v4
  gameId: string;
  sequence: number;              // Monotonic per game

  // Content
  type: EventType;
  payload: unknown;
  timestamp: number;

  // Cryptographic chain
  previousHash: string;          // SHA-256 of previous event
  hash: string;                  // SHA-256(id + sequence + type + payload + previousHash)

  // Authorization
  playerId: string;
  signature: string;             // Ed25519 signature
}

type EventType =
  // Lifecycle
  | 'GameCreated'
  | 'PlayerJoined'
  | 'CharacterSelected'
  | 'GameStarted'

  // Round Management
  | 'CardsSelected'
  | 'RoundStarted'
  | 'TurnStarted'
  | 'TurnEnded'
  | 'RoundEnded'

  // Actions
  | 'CharacterMoved'
  | 'AttackDeclared'
  | 'AttackResolved'
  | 'LootCollected'
  | 'RestInitiated'
  | 'RestCompleted'
  | 'ItemUsed'

  // State Changes
  | 'DamageApplied'
  | 'HealthRestored'
  | 'ConditionApplied'
  | 'ConditionRemoved'
  | 'ElementInfused'
  | 'ElementConsumed'
  | 'MonsterSpawned'
  | 'MonsterDied'
  | 'LootSpawned'
  | 'SummonSpawned'
  | 'SummonDied'

  // Objectives
  | 'ObjectiveProgressed'
  | 'ObjectiveCompleted'
  | 'ScenarioWon'
  | 'ScenarioLost'

  // Narrative
  | 'NarrativeTriggered'
  | 'NarrativeAcknowledged';
```

### 0.2 Event Store Interface

```typescript
// backend/src/events/event-store.interface.ts
interface EventStore {
  // Write
  append(gameId: string, event: GameEvent): Promise<void>;
  appendBatch(gameId: string, events: GameEvent[]): Promise<void>;

  // Read
  getEvents(gameId: string, fromSequence?: number): Promise<GameEvent[]>;
  getLatestEvent(gameId: string): Promise<GameEvent | null>;

  // Snapshots (optimization)
  saveSnapshot(gameId: string, sequence: number, state: GameState): Promise<void>;
  getLatestSnapshot(gameId: string): Promise<{ sequence: number; state: GameState } | null>;
}
```

### 0.3 Crypto Utilities

```typescript
// shared/crypto/event-signing.ts
import nacl from 'tweetnacl';

function signEvent(event: Omit<GameEvent, 'signature'>, privateKey: Uint8Array): string {
  const message = computeEventHash(event);
  return Buffer.from(nacl.sign.detached(
    Buffer.from(message, 'hex'),
    privateKey
  )).toString('base64');
}

function verifyEvent(event: GameEvent, publicKey: Uint8Array): boolean {
  const message = computeEventHash(event);
  return nacl.sign.detached.verify(
    Buffer.from(message, 'hex'),
    Buffer.from(event.signature, 'base64'),
    publicKey
  );
}

function computeEventHash(event: Omit<GameEvent, 'hash' | 'signature'>): string {
  const data = `${event.id}:${event.sequence}:${event.type}:${JSON.stringify(event.payload)}:${event.previousHash}`;
  return sha256(data);
}
```

### Deliverables - Week 1
- [ ] Event type definitions (all ~30 event types)
- [ ] Event store implementation (PostgreSQL-backed)
- [ ] Crypto signing/verification utilities
- [ ] Event validation logic (hash chain, signature)
- [ ] Unit tests for event store and crypto

---

## Phase 1: Command Handlers (Week 2-3)

Replace WebSocket handlers with command/event pattern.

### 1.1 Command Definitions

```typescript
// shared/types/commands.ts
interface Command {
  type: CommandType;
  gameId: string;
  playerId: string;
  payload: unknown;
  timestamp: number;
}

type CommandType =
  | 'JoinGame'
  | 'SelectCharacter'
  | 'StartGame'
  | 'SelectCards'
  | 'MoveCharacter'
  | 'DeclareAttack'
  | 'CollectLoot'
  | 'InitiateRest'
  | 'AcceptRest'
  | 'RerollRest'
  | 'UseItem'
  | 'EndTurn'
  | 'AcknowledgeNarrative';
```

### 1.2 Command Handler Structure

```typescript
// backend/src/commands/handlers/move-character.handler.ts
@CommandHandler(MoveCharacterCommand)
export class MoveCharacterHandler {
  constructor(
    private eventStore: EventStore,
    private stateProjection: GameStateProjection,
  ) {}

  async execute(command: MoveCharacterCommand): Promise<GameEvent[]> {
    // 1. Load current state
    const state = await this.stateProjection.getState(command.gameId);

    // 2. Validate command
    this.validateMove(command, state);

    // 3. Generate events
    const events: GameEvent[] = [];

    // Movement event
    events.push(this.createEvent('CharacterMoved', {
      characterId: command.characterId,
      fromHex: state.characters[command.characterId].currentHex,
      toHex: command.targetHex,
      path: command.path,
      movementPointsUsed: command.path.length,
    }));

    // Check narrative triggers
    const narrativeTrigger = this.checkNarrativeTriggers(command.targetHex, state);
    if (narrativeTrigger) {
      events.push(this.createEvent('NarrativeTriggered', narrativeTrigger));
    }

    // Check loot at destination
    const loot = state.lootTokens.find(l =>
      l.hex.q === command.targetHex.q && l.hex.r === command.targetHex.r
    );
    if (loot) {
      events.push(this.createEvent('LootCollected', {
        characterId: command.characterId,
        tokenId: loot.id,
        goldValue: loot.value,
      }));
    }

    // 4. Sign and chain events
    return this.signAndChainEvents(events, command.gameId);
  }

  private validateMove(command: MoveCharacterCommand, state: GameState): void {
    // Is it this player's turn?
    if (state.currentTurnEntityId !== command.characterId) {
      throw new InvalidCommandError('Not your turn');
    }

    // Does character have movement points?
    const character = state.characters[command.characterId];
    if (character.remainingMovement < command.path.length) {
      throw new InvalidCommandError('Insufficient movement points');
    }

    // Is path valid?
    if (!this.pathfindingService.isValidPath(command.path, state)) {
      throw new InvalidCommandError('Invalid movement path');
    }
  }
}
```

### 1.3 Extract Domain Logic from GameGateway

Map current handlers to command handlers:

| Current Handler | Command Handler | Priority |
|-----------------|-----------------|----------|
| `@SubscribeMessage('move_character')` | `MoveCharacterHandler` | High |
| `@SubscribeMessage('attack_target')` | `DeclareAttackHandler` + `ResolveAttackHandler` | High |
| `@SubscribeMessage('select_cards')` | `SelectCardsHandler` | High |
| `@SubscribeMessage('end_turn')` | `EndTurnHandler` | High |
| `@SubscribeMessage('start_game')` | `StartGameHandler` | High |
| `@SubscribeMessage('collect_loot')` | (Merged into movement) | Medium |
| `@SubscribeMessage('execute-rest')` | `InitiateRestHandler` | Medium |
| `@SubscribeMessage('rest-action')` | `RestActionHandler` | Medium |
| `@SubscribeMessage('use_item')` | `UseItemHandler` | Medium |
| `@SubscribeMessage('join_room')` | `JoinGameHandler` | Low |
| `@SubscribeMessage('select_character')` | `SelectCharacterHandler` | Low |

### Deliverables - Week 2-3
- [ ] Command definitions and validation
- [ ] Core command handlers (move, attack, cards, turn)
- [ ] Event generation logic extracted from GameGateway
- [ ] Command → Event pipeline
- [ ] Integration tests for command handlers

---

## Phase 2: State Projections (Week 3-4)

Build read models from event stream.

### 2.1 Game State Projection

```typescript
// backend/src/projections/game-state.projection.ts
@Injectable()
export class GameStateProjection {
  private stateCache = new Map<string, GameState>();

  constructor(private eventStore: EventStore) {}

  async getState(gameId: string): Promise<GameState> {
    // Check cache
    if (this.stateCache.has(gameId)) {
      return this.stateCache.get(gameId)!;
    }

    // Load from snapshot + events
    const snapshot = await this.eventStore.getLatestSnapshot(gameId);
    const fromSequence = snapshot?.sequence ?? 0;
    const events = await this.eventStore.getEvents(gameId, fromSequence);

    let state = snapshot?.state ?? this.createInitialState();

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    this.stateCache.set(gameId, state);
    return state;
  }

  applyEvent(state: GameState, event: GameEvent): GameState {
    switch (event.type) {
      case 'CharacterMoved':
        return this.applyCharacterMoved(state, event.payload as CharacterMovedPayload);

      case 'AttackResolved':
        return this.applyAttackResolved(state, event.payload as AttackResolvedPayload);

      case 'DamageApplied':
        return this.applyDamageApplied(state, event.payload as DamageAppliedPayload);

      case 'MonsterDied':
        return this.applyMonsterDied(state, event.payload as MonsterDiedPayload);

      // ... all event types

      default:
        return state;
    }
  }

  private applyCharacterMoved(state: GameState, payload: CharacterMovedPayload): GameState {
    return {
      ...state,
      characters: {
        ...state.characters,
        [payload.characterId]: {
          ...state.characters[payload.characterId],
          currentHex: payload.toHex,
          remainingMovement: state.characters[payload.characterId].remainingMovement - payload.movementPointsUsed,
        },
      },
    };
  }
}
```

### 2.2 Specialized Projections

```typescript
// Read models optimized for specific queries

// Turn order projection
interface TurnOrderProjection {
  getCurrentTurn(gameId: string): TurnEntity;
  getTurnOrder(gameId: string): TurnEntity[];
  getRound(gameId: string): number;
}

// Combat state projection
interface CombatProjection {
  getPendingAttack(gameId: string): PendingAttack | null;
  getModifierDeck(gameId: string, entityId: string): ModifierCard[];
}

// Objective progress projection
interface ObjectiveProjection {
  getProgress(gameId: string): ObjectiveProgress;
  checkCompletion(gameId: string): ScenarioResult | null;
}
```

### Deliverables - Week 3-4
- [ ] GameStateProjection with all event handlers
- [ ] Snapshot saving/loading
- [ ] Specialized projections (turn, combat, objectives)
- [ ] State cache invalidation on new events
- [ ] Projection tests (event replay produces correct state)

---

## Phase 3: HTTP Lobby + Batched WebSocket (Week 4-5)

Implement Option C from issue #283: HTTP for lobbies, optimized WebSocket for games.

### 3.1 HTTP Lobby Endpoints (per #283)

```typescript
// backend/src/api/rooms.controller.ts
@Controller('rooms')
export class RoomsController {

  // Polling endpoint - clients call every 3 seconds
  @Get(':code/state')
  async getRoomState(@Param('code') code: string): Promise<RoomStateDto> {
    const room = await this.roomService.getRoom(code);
    return {
      code: room.code,
      status: room.status,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        characterClass: p.characterClass,
        isReady: p.isReady,
      })),
      hostId: room.hostId,
      scenarioId: room.scenarioId,
      updatedAt: room.updatedAt,
    };
  }

  // Actions via REST (not WebSocket)
  @Post(':code/join')
  async joinRoom(
    @Param('code') code: string,
    @Body() dto: JoinRoomDto,
    @CurrentUser() user: User,
  ): Promise<RoomStateDto> {
    await this.roomService.addPlayer(code, user.id, dto.playerName);
    return this.getRoomState(code);
  }

  @Post(':code/character')
  async selectCharacter(
    @Param('code') code: string,
    @Body() dto: SelectCharacterDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.roomService.selectCharacter(code, user.id, dto.characterClass);
  }

  @Post(':code/ready')
  async setReady(
    @Param('code') code: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.roomService.setPlayerReady(code, user.id);
  }

  // Long-poll for game start (holds connection up to 30s)
  @Get(':code/start')
  async waitForStart(
    @Param('code') code: string,
    @Query('timeout') timeout = 30000,
  ): Promise<{ started: boolean; gameId?: string }> {
    const result = await this.roomService.waitForGameStart(code, timeout);
    return result;
  }

  @Post(':code/start')
  async startGame(
    @Param('code') code: string,
    @CurrentUser() user: User,
  ): Promise<{ gameId: string }> {
    // Only host can start
    const gameId = await this.gameService.startGame(code, user.id);
    return { gameId };
  }

  @Delete(':code/leave')
  async leaveRoom(
    @Param('code') code: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.roomService.removePlayer(code, user.id);
  }
}
```

### 3.2 Frontend Polling Hook

```typescript
// frontend/src/hooks/useRoomPolling.ts
export function useRoomPolling(roomCode: string) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      try {
        const state = await api.getRoomState(roomCode);
        if (mounted) {
          setRoomState(state);
          setError(null);
          // Poll every 3 seconds
          timeoutId = setTimeout(poll, 3000);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          // Retry after 5 seconds on error
          timeoutId = setTimeout(poll, 5000);
        }
      }
    };

    poll();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [roomCode]);

  return { roomState, error };
}

// Long-poll for game start
export function useWaitForGameStart(roomCode: string, enabled: boolean) {
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const waitForStart = async () => {
      while (mounted) {
        try {
          const result = await api.waitForStart(roomCode, 30000);
          if (result.started && mounted) {
            setGameId(result.gameId!);
            return;
          }
          // Timeout - try again
        } catch {
          // Error - wait and retry
          await sleep(2000);
        }
      }
    };

    waitForStart();

    return () => { mounted = false; };
  }, [roomCode, enabled]);

  return gameId;
}
```

### 3.3 Batched WebSocket Events

Instead of many small messages, batch related events:

```typescript
// Before: 5+ messages per move
emit('character_moved', {...})
emit('loot_collected', {...})
emit('narrative_triggered', {...})
emit('objective_progressed', {...})
emit('game_log', {...})

// After: Single batched message
emit('events', {
  sequence: 42,
  batch: [
    { type: 'CharacterMoved', payload: {...} },
    { type: 'LootCollected', payload: {...} },
    { type: 'NarrativeTriggered', payload: {...} },
    { type: 'ObjectiveProgressed', payload: {...} },
  ]
})
```

```typescript
// backend/src/events/event-batcher.service.ts
@Injectable()
export class EventBatcherService {
  private pendingEvents = new Map<string, GameEvent[]>();
  private flushTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private eventBroadcaster: EventBroadcasterService,
  ) {}

  // Collect events during command execution
  addEvent(gameId: string, event: GameEvent): void {
    if (!this.pendingEvents.has(gameId)) {
      this.pendingEvents.set(gameId, []);
    }
    this.pendingEvents.get(gameId)!.push(event);
  }

  // Flush all events for a game as single message
  async flush(gameId: string): Promise<void> {
    const events = this.pendingEvents.get(gameId) || [];
    if (events.length === 0) return;

    this.pendingEvents.delete(gameId);

    await this.eventBroadcaster.broadcastBatch(gameId, events);
  }
}

// backend/src/events/event-broadcaster.service.ts
@Injectable()
export class EventBroadcasterService {
  constructor(@InjectServer() private server: Server) {}

  async broadcastBatch(gameId: string, events: GameEvent[]): Promise<void> {
    const roomCode = await this.getRoomCode(gameId);

    this.server.to(roomCode).emit('events', {
      sequence: events[events.length - 1].sequence,
      batch: events.map(e => ({
        type: e.type,
        payload: e.payload,
        sequence: e.sequence,
      })),
    });
  }
}
```

```typescript
// frontend/src/services/event-receiver.service.ts
class EventReceiverService {
  private lastSequence = 0;
  private eventBuffer: GameEvent[] = [];

  constructor(private projection: GameStateProjection) {
    websocketService.on('events', this.handleEventBatch.bind(this));
  }

  private handleEventBatch(data: { sequence: number; batch: GameEvent[] }): void {
    // Check for gaps
    const expectedSequence = this.lastSequence + 1;
    const firstEventSequence = data.batch[0]?.sequence ?? data.sequence;

    if (firstEventSequence > expectedSequence) {
      // Gap detected - buffer and request missing
      this.eventBuffer.push(...data.batch);
      this.requestMissingEvents(expectedSequence, firstEventSequence - 1);
      return;
    }

    // Apply all events in batch atomically
    for (const event of data.batch) {
      this.projection.applyEvent(event);
      this.lastSequence = event.sequence;
    }

    // Process any buffered events that are now in order
    this.processBuffer();

    // Single UI update for entire batch
    this.projection.emitStateUpdate();
  }

  private requestMissingEvents(from: number, to: number): void {
    websocketService.emit('request_events', { from, to });
  }
}
```

### 3.4 Thin Gateway Facade

```typescript
// backend/src/websocket/game.gateway.ts (NEW - ~200 lines)
@WebSocketGateway({ namespace: '/game' })
export class GameGateway {
  constructor(
    private commandBus: CommandBus,
    private eventBus: EventBus,
    private stateProjection: GameStateProjection,
  ) {}

  @SubscribeMessage('command')
  async handleCommand(
    @MessageBody() command: Command,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      // Execute command → generates events
      const events = await this.commandBus.execute(command);

      // Events are broadcast by EventProcessor
    } catch (error) {
      client.emit('command_rejected', {
        commandType: command.type,
        reason: error.message,
      });
    }
  }

  // Connection lifecycle (unchanged)
  handleConnection(client: Socket) { /* ... */ }
  handleDisconnect(client: Socket) { /* ... */ }
}
```

### 3.2 Event Broadcaster

```typescript
// backend/src/events/event-broadcaster.ts
@Injectable()
export class EventBroadcaster {
  constructor(
    @InjectServer() private server: Server,
  ) {}

  @OnEvent('game.event')
  async broadcastEvent(event: GameEvent): Promise<void> {
    const roomCode = await this.getRoomCode(event.gameId);

    // Broadcast to all clients in room
    this.server.to(roomCode).emit('game_event', {
      type: event.type,
      payload: event.payload,
      sequence: event.sequence,
      timestamp: event.timestamp,
    });
  }
}
```

### 3.3 Frontend Event Handler

```typescript
// frontend/src/services/event-handler.service.ts
class EventHandlerService {
  private projection = new ClientGameStateProjection();
  private eventBuffer: GameEvent[] = [];
  private lastSequence = 0;

  handleEvent(event: GameEvent): void {
    // Ensure ordering
    if (event.sequence !== this.lastSequence + 1) {
      this.eventBuffer.push(event);
      this.requestMissingEvents();
      return;
    }

    // Apply to local state
    this.projection.applyEvent(event);
    this.lastSequence = event.sequence;

    // Process buffered events
    this.processBuffer();

    // Notify React
    this.emitStateUpdate();
  }

  private requestMissingEvents(): void {
    websocketService.emit('request_events', {
      fromSequence: this.lastSequence + 1,
    });
  }
}
```

### Deliverables - Week 4-5
- [ ] Thin GameGateway facade (~200 lines)
- [ ] Command → Event → Broadcast pipeline
- [ ] Frontend event handler with ordering
- [ ] Event gap recovery (request missing)
- [ ] Backward compatibility layer for transition

---

## Phase 4: State Migration (Week 5-6)

Replace Map-based stores with projections.

### 4.1 State Store Replacement

| Old Map Store | Replacement |
|---------------|-------------|
| `roomMonsters` | `GameStateProjection.monsters` |
| `roomTurnOrder` | `TurnOrderProjection.turnOrder` |
| `currentTurnIndex` | `TurnOrderProjection.currentIndex` |
| `roomGamePhase` | `GameStateProjection.phase` |
| `characterModifierDecks` | `CombatProjection.modifierDecks` |
| `roomLootTokens` | `GameStateProjection.lootTokens` |
| `roomObjectives` | `ObjectiveProjection.objectives` |
| ... (28 more) | ... |

### 4.2 Migration Strategy

```typescript
// Parallel running during migration
class HybridStateManager {
  constructor(
    private legacyMaps: LegacyMapStores,
    private projection: GameStateProjection,
  ) {}

  async getMonsters(gameId: string): Promise<Monster[]> {
    const legacyMonsters = this.legacyMaps.roomMonsters.get(gameId);
    const projectedMonsters = (await this.projection.getState(gameId)).monsters;

    // Compare and log discrepancies
    if (!deepEqual(legacyMonsters, projectedMonsters)) {
      logger.warn('State divergence detected', { gameId, diff: ... });
    }

    // Return projection (source of truth)
    return projectedMonsters;
  }
}
```

### Deliverables - Week 5-6
- [ ] Hybrid state manager
- [ ] Migration of each Map store
- [ ] Divergence detection and logging
- [ ] Remove legacy Maps after validation
- [ ] Performance benchmarking

---

## Phase 5: Frontend Restructure (Week 6-7)

Replace flat state with projection-based architecture.

### 5.1 Client-Side Projections

```typescript
// frontend/src/state/projections/game-state.projection.ts
class ClientGameStateProjection {
  private events: GameEvent[] = [];
  private state: GameState;
  private listeners = new Set<() => void>();

  applyEvent(event: GameEvent): void {
    this.events.push(event);
    this.state = this.computeState();
    this.notifyListeners();
  }

  private computeState(): GameState {
    return this.events.reduce(
      (state, event) => applyEvent(state, event),
      createInitialState()
    );
  }

  // React hook integration
  useSelector<T>(selector: (state: GameState) => T): T {
    const [value, setValue] = useState(() => selector(this.state));

    useEffect(() => {
      const unsubscribe = this.subscribe(() => {
        setValue(selector(this.state));
      });
      return unsubscribe;
    }, [selector]);

    return value;
  }
}
```

### 5.2 Component Integration

```typescript
// frontend/src/components/GameBoard.tsx
function GameBoard() {
  const monsters = useGameSelector(state => state.monsters);
  const characters = useGameSelector(state => state.characters);
  const currentTurn = useGameSelector(state => state.currentTurn);

  // Only re-renders when selected slices change
  return (
    <HexGrid>
      {monsters.map(m => <MonsterSprite key={m.id} monster={m} />)}
      {characters.map(c => <CharacterSprite key={c.id} character={c} />)}
      <TurnIndicator entity={currentTurn} />
    </HexGrid>
  );
}
```

### Deliverables - Week 6-7
- [ ] Client-side projection implementation
- [ ] React hooks for state selection
- [ ] Component refactoring to use selectors
- [ ] Memoization for render performance
- [ ] Time-travel debugging (dev mode)

---

## Phase 6: Transport Abstraction Layer (Week 7)

Design for future WebRTC without implementing it yet.

### 6.1 Transport Interface

```typescript
// shared/transport/transport.interface.ts
interface EventTransport {
  // Lifecycle
  connect(gameId: string): Promise<void>;
  disconnect(): void;

  // Send events (to server or peers)
  send(events: GameEvent[]): Promise<void>;

  // Receive events
  onReceive(handler: (events: GameEvent[]) => void): void;
  onDisconnect(handler: () => void): void;

  // Status
  isConnected(): boolean;
}
```

### 6.2 WebSocket Transport (Current)

```typescript
// frontend/src/transport/websocket.transport.ts
export class WebSocketTransport implements EventTransport {
  private socket: Socket | null = null;
  private receiveHandler: ((events: GameEvent[]) => void) | null = null;

  async connect(gameId: string): Promise<void> {
    this.socket = io('/game', { query: { gameId } });

    this.socket.on('events', (data: { batch: GameEvent[] }) => {
      this.receiveHandler?.(data.batch);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  async send(events: GameEvent[]): Promise<void> {
    // Server-authoritative: send as commands, receive as events
    for (const event of events) {
      this.socket?.emit('command', {
        type: event.type,
        payload: event.payload,
      });
    }
  }

  onReceive(handler: (events: GameEvent[]) => void): void {
    this.receiveHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.socket?.on('disconnect', handler);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
```

### 6.3 Game Client Uses Abstraction

```typescript
// frontend/src/services/game-client.service.ts
class GameClientService {
  private transport: EventTransport;
  private projection: GameStateProjection;

  constructor() {
    // Currently WebSocket, future: could be WebRTC
    this.transport = new WebSocketTransport();
    this.projection = new GameStateProjection();

    this.transport.onReceive((events) => {
      for (const event of events) {
        this.projection.applyEvent(event);
      }
      this.projection.emitStateUpdate();
    });
  }

  async joinGame(gameId: string): Promise<void> {
    await this.transport.connect(gameId);
  }

  // Game actions - transport agnostic
  async moveCharacter(characterId: string, toHex: Axial): Promise<void> {
    await this.transport.send([{
      type: 'MoveCharacter',
      payload: { characterId, toHex },
    }]);
  }

  async attack(attackerId: string, targetId: string): Promise<void> {
    await this.transport.send([{
      type: 'DeclareAttack',
      payload: { attackerId, targetId },
    }]);
  }
}
```

### Deliverables - Week 7
- [ ] Transport interface definition
- [ ] WebSocket transport implementation
- [ ] Game client refactored to use transport abstraction
- [ ] Easy to add WebRTC transport later

---

## Phase 7: Polish & Optimization (Week 9-10)

### 7.1 Snapshotting Strategy

```typescript
// Save snapshot every N events or every round
const SNAPSHOT_INTERVAL = 50; // events

async function maybeSnapshot(gameId: string, sequence: number): Promise<void> {
  if (sequence % SNAPSHOT_INTERVAL === 0) {
    const state = await projection.getState(gameId);
    await eventStore.saveSnapshot(gameId, sequence, state);
  }
}
```

### 7.2 Event Compaction

```typescript
// Archive old events to cold storage
async function compactEvents(gameId: string): Promise<void> {
  const latestSnapshot = await eventStore.getLatestSnapshot(gameId);
  if (!latestSnapshot) return;

  // Move events before snapshot to archive
  const oldEvents = await eventStore.getEvents(gameId, 0, latestSnapshot.sequence);
  await archiveStore.append(gameId, oldEvents);
  await eventStore.deleteEvents(gameId, 0, latestSnapshot.sequence);
}
```

### 7.3 Performance Monitoring

```typescript
// Metrics to track
interface EventMetrics {
  eventsPerSecond: number;
  averageEventSize: number;
  projectionLatency: number;
  snapshotSize: number;
  peerLatency: Map<string, number>;
}
```

### Deliverables - Week 9-10
- [ ] Snapshotting implementation
- [ ] Event compaction/archival
- [ ] Performance benchmarks
- [ ] Load testing (100+ concurrent games)
- [ ] Documentation

---

## Risk Mitigation

### Parallel Running

During migration, run both systems in parallel:

```
Old Path: WebSocket → GameGateway → Maps → Broadcast
New Path: WebSocket → Commands → Events → Projections → Broadcast
                                    ↓
                              Compare outputs
```

### Rollback Plan

Each phase is independently deployable:
- Feature flag: `USE_EVENT_SOURCING`
- If issues: Disable flag, revert to legacy
- No data loss: Events are append-only

### Performance Safeguards

- Snapshot every 50 events (prevents slow replay)
- Cache projections in memory
- WebSocket fallback if WebRTC fails
- Rate limiting on command handlers

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| GameGateway lines | 6,945 | ~200 |
| game-state.service.ts lines | 1,573 | ~500 |
| Map-based stores | 42 | 0 |
| WebSocket messages per turn | 20-50 | 1-3 (batched) |
| Lobby connections | WebSocket (persistent) | HTTP (stateless) |
| Test coverage (game logic) | ~40% | >90% |
| Time to replay 100 events | N/A | <100ms |

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Foundation | Event schema, store, crypto |
| 2-3 | Commands | Command handlers, domain extraction |
| 3-4 | Projections | State projections, snapshots |
| 4-5 | HTTP Lobby + Batched WS | REST endpoints, event batching |
| 5-6 | Migration | Replace Map stores |
| 6-7 | Frontend | Client projections, React integration |
| 7 | Transport Abstraction | Interface for future WebRTC |
| 8 | Polish | Optimization, testing, docs |

**Total: 8 weeks**

---

## Files Created/Modified

### New Files (~25 files)
```
shared/types/events/
  base.ts
  lifecycle.ts
  actions.ts
  state-changes.ts

shared/types/commands/
  index.ts

shared/crypto/
  event-signing.ts

backend/src/events/
  event-store.interface.ts
  postgres-event-store.ts
  event-processor.ts
  event-broadcaster.ts

backend/src/commands/
  command-bus.ts
  handlers/
    move-character.handler.ts
    declare-attack.handler.ts
    resolve-attack.handler.ts
    select-cards.handler.ts
    end-turn.handler.ts
    ... (10 more)

backend/src/projections/
  game-state.projection.ts
  turn-order.projection.ts
  combat.projection.ts
  objective.projection.ts

frontend/src/state/
  projections/
    game-state.projection.ts
    event-applicator.ts
  hooks/
    use-game-selector.ts
```

### Modified Files
```
backend/src/websocket/game.gateway.ts  → Thin facade (~200 lines)
frontend/src/services/game-state.service.ts → Event-driven (~500 lines)
```

### Deleted Files (after migration)
```
(None - legacy code removed incrementally)
```

---

## Future Enhancement: WebRTC with Cloudflare

When ready to reduce server load further, add P2P with the transport abstraction.

### Why Cloudflare Calls

| Benefit | Details |
|---------|---------|
| **Free tier** | 1 TB/month (~7,000-46,000 games depending on mode) |
| **Global edge** | 300+ locations, low latency everywhere |
| **No STUN/TURN hassle** | Single API call for credentials |
| **Reliable** | Cloudflare-grade infrastructure |

### Hybrid Model: P2P + Server Checkpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                      REAL-TIME LAYER                             │
│                                                                  │
│   Player A ◄──── WebRTC P2P (Cloudflare TURN) ────► Player B    │
│       │                                                │         │
│       └────────────────────────────────────────────────┘         │
│                           │                                      │
│                  Signed event stream                             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     CHECKPOINT LAYER                             │
│                                                                  │
│   Every round:  Events ──► Server ──► Validate ──► Persist      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    PERSISTENCE LAYER                             │
│                                                                  │
│   PostgreSQL: events, game_state, campaigns, characters         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What Goes Where

| Data | Path | Why |
|------|------|-----|
| Movement, attacks, cards | P2P | Real-time, low cheating benefit |
| Round completion | P2P + checkpoint | Server validates event chain |
| Game completion | Server | Must persist rewards/XP |
| Campaign unlocks | Server | Must validate + persist |
| Inventory changes | Server | Persistent data |

### WebRTC Transport Implementation

```typescript
// frontend/src/transport/webrtc.transport.ts
export class WebRTCTransport implements EventTransport {
  private peers = new Map<string, RTCPeerConnection>();
  private channels = new Map<string, RTCDataChannel>();
  private websocketFallback: WebSocketTransport;

  constructor() {
    // Always have WebSocket ready as fallback
    this.websocketFallback = new WebSocketTransport();
  }

  async connect(gameId: string): Promise<void> {
    // Get Cloudflare TURN credentials
    const iceServers = await this.getCloudflareCredentials();

    // Get peer list from server
    const peers = await api.getGamePeers(gameId);

    // Try P2P connections
    try {
      await Promise.race([
        this.connectToPeers(peers, iceServers),
        timeout(5000),
      ]);
    } catch {
      // P2P failed - use WebSocket
      console.log('WebRTC failed, falling back to WebSocket');
      await this.websocketFallback.connect(gameId);
      return;
    }
  }

  private async getCloudflareCredentials(): Promise<RTCIceServer[]> {
    const response = await fetch('/api/turn/credentials');
    const { iceServers } = await response.json();
    return iceServers;
  }

  private async connectToPeers(
    peers: string[],
    iceServers: RTCIceServer[],
  ): Promise<void> {
    for (const peerId of peers) {
      const pc = new RTCPeerConnection({ iceServers });
      const channel = pc.createDataChannel('game');

      channel.onmessage = (e) => {
        const events = JSON.parse(e.data);
        this.receiveHandler?.(events);
      };

      this.peers.set(peerId, pc);
      this.channels.set(peerId, channel);

      // Exchange SDP via signaling
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signalingService.sendOffer(peerId, offer);
    }
  }

  async send(events: GameEvent[]): Promise<void> {
    const message = JSON.stringify(events);

    for (const channel of this.channels.values()) {
      if (channel.readyState === 'open') {
        channel.send(message);
      }
    }
  }
}
```

### Backend: Cloudflare Credential Endpoint

```typescript
// backend/src/api/turn.controller.ts
@Controller('turn')
export class TurnController {
  private readonly appId = process.env.CLOUDFLARE_CALLS_APP_ID;
  private readonly apiToken = process.env.CLOUDFLARE_API_TOKEN;

  @Get('credentials')
  @UseGuards(AuthGuard)
  async getCredentials(): Promise<{ iceServers: RTCIceServer[] }> {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/apps/${this.appId}/turn/credentials`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiToken}` },
        body: JSON.stringify({ ttl: 3600 }), // 1 hour
      }
    );

    const { iceServers } = await response.json();
    return { iceServers };
  }
}
```

### Backend: Checkpoint Validation

```typescript
// backend/src/api/games.controller.ts
@Controller('games')
export class GamesController {

  @Post(':id/checkpoint')
  async submitCheckpoint(
    @Param('id') gameId: string,
    @Body() checkpoint: CheckpointDto,
  ): Promise<void> {
    // Verify event chain integrity
    for (let i = 1; i < checkpoint.events.length; i++) {
      const prev = checkpoint.events[i - 1];
      const curr = checkpoint.events[i];

      if (curr.previousHash !== computeEventHash(prev)) {
        throw new BadRequestException('Invalid event chain');
      }

      if (!verifyEventSignature(curr)) {
        throw new BadRequestException('Invalid event signature');
      }
    }

    // Replay events to validate game rules
    const state = this.replayEvents(checkpoint.events);

    // Verify state hash matches client's claim
    if (computeStateHash(state) !== checkpoint.stateHash) {
      throw new ConflictException('State divergence detected');
    }

    // Persist validated events
    await this.eventStore.appendBatch(gameId, checkpoint.events);
  }

  @Post(':id/complete')
  async completeGame(
    @Param('id') gameId: string,
    @Body() completion: GameCompletionDto,
  ): Promise<void> {
    // Final checkpoint validation
    await this.submitCheckpoint(gameId, completion.finalCheckpoint);

    // Apply rewards (server authoritative)
    const state = await this.getValidatedState(gameId);
    await this.campaignService.applyRewards(state);
    await this.characterService.addExperience(state);
    await this.inventoryService.addLoot(state);
  }
}
```

### Implementation Effort

| Task | Time |
|------|------|
| WebRTC transport class | 2 days |
| Cloudflare credential endpoint | 0.5 day |
| Signaling server (~150 lines) | 1 day |
| Checkpoint validation endpoint | 1 day |
| Testing + edge cases | 1.5 days |

**Total: ~1 week** to add P2P as an option

### When to Implement

Consider adding WebRTC when:
- Server costs become significant
- You want <50ms latency for actions
- You're seeing WebSocket scalability limits
- You've validated the event architecture works

The transport abstraction means WebRTC is a drop-in enhancement, not a rewrite.
