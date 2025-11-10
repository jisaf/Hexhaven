/**
 * Contract Test: WebSocket end_turn Event (US2 - T079)
 *
 * Tests the contract for end_turn WebSocket event:
 * - Client sends end_turn to complete current turn
 * - Server validates it's the player's turn
 * - Server advances to next entity in turn order
 * - Server emits next_turn_started with new current entity
 * - If monster turn, server triggers monster AI
 * - At end of round, server triggers new card selection phase
 * - Server emits error for invalid end turn attempts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type {
  EndTurnPayload,
  NextTurnStartedPayload,
  MonsterActivatedPayload,
  NewRoundStartedPayload,
  ErrorPayload,
} from '../../../shared/types/events';

describe('WebSocket Contract: end_turn event', () => {
  let clientSocket: ClientSocket;
  let client2Socket: ClientSocket;
  const testPort = 3001;
  const serverUrl = `http://localhost:${testPort}`;

  beforeEach((done) => {
    clientSocket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
    });

    client2Socket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
    });

    clientSocket.connect();
    client2Socket.connect();

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        done();
      }
    };

    clientSocket.on('connect', onConnect);
    client2Socket.on('connect', onConnect);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (client2Socket.connected) {
      client2Socket.disconnect();
    }
  });

  it('should emit next_turn_started when ending turn', (done) => {
    const endTurnPayload: EndTurnPayload = {
      roomCode: 'TURN01',
      playerUUID: 'player-uuid-001',
    };

    clientSocket.on('next_turn_started', (payload: NextTurnStartedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('currentTurnIndex');
      expect(payload).toHaveProperty('currentEntity');
      expect(payload).toHaveProperty('round');

      // Verify current entity structure
      expect(payload.currentEntity).toHaveProperty('id');
      expect(payload.currentEntity).toHaveProperty('type'); // 'player' or 'monster'
      expect(payload.currentEntity).toHaveProperty('initiative');

      // Turn index should have advanced
      expect(typeof payload.currentTurnIndex).toBe('number');
      expect(payload.currentTurnIndex).toBeGreaterThanOrEqual(0);

      done();
    });

    clientSocket.emit('end_turn', endTurnPayload);
  });

  it('should broadcast next_turn_started to all players', (done) => {
    const roomCode = 'TURN02';

    // Both players join
    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player1-uuid',
      nickname: 'Player 1',
    });

    client2Socket.emit('join_room', {
      roomCode,
      playerUUID: 'player2-uuid',
      nickname: 'Player 2',
    });

    let joinedCount = 0;
    const onJoined = () => {
      joinedCount++;
      if (joinedCount === 2) {
        // Player 2 listens for turn change
        client2Socket.on('next_turn_started', (payload: NextTurnStartedPayload) => {
          expect(payload).toHaveProperty('currentEntity');
          expect(payload.currentEntity.type).toMatch(/^(player|monster)$/);

          done();
        });

        // Player 1 ends turn
        clientSocket.emit('end_turn', {
          roomCode,
          playerUUID: 'player1-uuid',
        });
      }
    };

    clientSocket.on('room_joined', onJoined);
    client2Socket.on('room_joined', onJoined);
  });

  it('should emit error when ending turn out of turn', (done) => {
    const wrongPlayerPayload: EndTurnPayload = {
      roomCode: 'TURN03',
      playerUUID: 'wrong-player-uuid',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_YOUR_TURN');
      expect(payload.message).toContain('Not your turn');
      done();
    });

    clientSocket.emit('end_turn', wrongPlayerPayload);
  });

  it('should activate monster AI when monster turn starts', (done) => {
    const roomCode = 'MONSTER01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-002',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Listen for monster activation
      clientSocket.on('monster_activated', (payload: MonsterActivatedPayload) => {
        // Verify payload structure
        expect(payload).toHaveProperty('monsterId');
        expect(payload).toHaveProperty('actions');

        // Verify actions array
        expect(Array.isArray(payload.actions)).toBe(true);
        expect(payload.actions.length).toBeGreaterThan(0);

        // Verify action structure
        const action = payload.actions[0];
        expect(action).toHaveProperty('type'); // 'move', 'attack', etc.
        expect(action.type).toMatch(/^(move|attack|special)$/);

        if (action.type === 'move') {
          expect(action).toHaveProperty('from');
          expect(action).toHaveProperty('to');
        } else if (action.type === 'attack') {
          expect(action).toHaveProperty('targetId');
          expect(action).toHaveProperty('damage');
        }

        done();
      });

      // End player turn to trigger monster turn
      clientSocket.emit('end_turn', {
        roomCode,
        playerUUID: 'player-uuid-002',
      });
    });
  });

  it('should start new round after all entities complete turns', (done) => {
    const roomCode = 'ROUND01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-003',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Listen for new round start
      clientSocket.on('new_round_started', (payload: NewRoundStartedPayload) => {
        // Verify payload structure
        expect(payload).toHaveProperty('round');
        expect(payload).toHaveProperty('elementalState');

        // Round should increment
        expect(typeof payload.round).toBe('number');
        expect(payload.round).toBeGreaterThan(1);

        // Elemental state should decay (strong → waning, waning → inert)
        expect(payload.elementalState).toHaveProperty('fire');
        expect(payload.elementalState).toHaveProperty('ice');
        expect(payload.elementalState).toHaveProperty('air');
        expect(payload.elementalState).toHaveProperty('earth');
        expect(payload.elementalState).toHaveProperty('light');
        expect(payload.elementalState).toHaveProperty('dark');

        // Each element should have valid state
        Object.values(payload.elementalState).forEach((state: any) => {
          expect(state).toMatch(/^(inert|waning|strong)$/);
        });

        done();
      });

      // Complete full round by ending turns
      // (Simplified - actual test would cycle through all entities)
      clientSocket.emit('end_turn', {
        roomCode,
        playerUUID: 'player-uuid-003',
      });
    });
  });

  it('should trigger card selection phase at start of new round', (done) => {
    const roomCode = 'CARDSEL01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-004',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      clientSocket.on('new_round_started', () => {
        // After new round, card selection should begin
        clientSocket.on('card_selection_started', (payload) => {
          expect(payload).toHaveProperty('round');
          expect(payload).toHaveProperty('hand'); // Player's available cards

          expect(Array.isArray(payload.hand)).toBe(true);

          done();
        });
      });

      // End turn to complete round
      clientSocket.emit('end_turn', {
        roomCode,
        playerUUID: 'player-uuid-004',
      });
    });
  });

  it('should emit error when ending turn before taking action', (done) => {
    const noActionPayload: EndTurnPayload = {
      roomCode: 'NOACT01',
      playerUUID: 'player-uuid-005',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NO_ACTION_TAKEN');
      expect(payload.message).toContain('Must perform at least one action before ending turn');
      done();
    });

    clientSocket.emit('end_turn', noActionPayload);
  });

  it('should handle player exhaustion when ending turn', (done) => {
    const exhaustedPayload: EndTurnPayload = {
      roomCode: 'EXHAUST01',
      playerUUID: 'player-exhausted',
    };

    clientSocket.on('player_exhausted', (payload) => {
      // Verify exhaustion payload
      expect(payload).toHaveProperty('playerId');
      expect(payload).toHaveProperty('reason'); // 'health' or 'cards'

      expect(payload.reason).toMatch(/^(health|cards)$/);

      done();
    });

    clientSocket.emit('end_turn', exhaustedPayload);
  });

  it('should emit error when room is not in active phase', (done) => {
    const inactiveRoomPayload: EndTurnPayload = {
      roomCode: 'INACTIVE01',
      playerUUID: 'player-uuid-006',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_PHASE');
      expect(payload.message).toContain('Game is not in active phase');
      done();
    });

    clientSocket.emit('end_turn', inactiveRoomPayload);
  });

  it('should update elemental states at end of round', (done) => {
    const roomCode = 'ELEMEND01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-007',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      clientSocket.on('new_round_started', (payload: NewRoundStartedPayload) => {
        // Elements should decay at end of round
        // strong → waning, waning → inert

        const elementalState = payload.elementalState;

        // Verify all elements are in valid states
        Object.keys(elementalState).forEach(element => {
          const state = elementalState[element];
          expect(['inert', 'waning', 'strong']).toContain(state);
        });

        // If there was a strong element, it should now be waning or inert
        // If there was a waning element, it should now be inert
        // (Would need to track previous state for full verification)

        done();
      });

      // End turn to complete round
      clientSocket.emit('end_turn', {
        roomCode,
        playerUUID: 'player-uuid-007',
      });
    });
  });

  it('should skip turn if player times out (60s idle)', (done) => {
    // Note: This test would require time manipulation or mocking
    // Structure shows expected behavior

    const roomCode = 'TIMEOUT01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-008',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Listen for turn skip event
      clientSocket.on('turn_skipped', (payload) => {
        expect(payload).toHaveProperty('playerId');
        expect(payload).toHaveProperty('reason');
        expect(payload.reason).toBe('timeout');

        done();
      });

      // Don't end turn, wait for timeout
      // (In practice, we'd fast-forward time or use shorter timeout for testing)
    });
  });

  it('should handle scenario completion check at end of turn', (done) => {
    const roomCode = 'COMPLETE01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-009',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Listen for scenario completion
      clientSocket.on('scenario_completed', (payload) => {
        expect(payload).toHaveProperty('result'); // 'victory' or 'defeat'
        expect(payload).toHaveProperty('scenarioName');
        expect(payload).toHaveProperty('experience');
        expect(payload).toHaveProperty('loot');

        expect(payload.result).toMatch(/^(victory|defeat)$/);

        done();
      });

      // End turn (scenario completes if conditions met)
      clientSocket.emit('end_turn', {
        roomCode,
        playerUUID: 'player-uuid-009',
      });
    });
  });

  it('should validate player is in the game room', (done) => {
    const wrongRoomPayload: EndTurnPayload = {
      roomCode: 'NONEXISTENT',
      playerUUID: 'player-uuid-010',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('ROOM_NOT_FOUND');
      expect(payload.message).toContain('Room not found');
      done();
    });

    clientSocket.emit('end_turn', wrongRoomPayload);
  });

  it('should auto-advance after monster turn completes', (done) => {
    const roomCode = 'AUTOMONSTER01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-011',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      let monsterActivated = false;

      clientSocket.on('monster_activated', () => {
        monsterActivated = true;
      });

      // After monster activation, turn should auto-advance
      clientSocket.on('next_turn_started', (payload: NextTurnStartedPayload) => {
        if (monsterActivated) {
          // Monster turn completed, next turn started automatically
          expect(payload.currentEntity.type).toBeDefined();

          done();
        }
      });

      // End player turn to trigger monster turn
      clientSocket.emit('end_turn', {
        roomCode,
        playerUUID: 'player-uuid-011',
      });
    });
  });

  it('should preserve game state continuity across turns', (done) => {
    const roomCode = 'CONTINUITY01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-012',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Record state before ending turn
      let initialRound = 1;

      clientSocket.on('next_turn_started', (payload: NextTurnStartedPayload) => {
        // Verify round is preserved or incremented correctly
        expect(payload.round).toBeGreaterThanOrEqual(initialRound);

        // Turn index should advance or wrap to 0 for new round
        expect(payload.currentTurnIndex).toBeGreaterThanOrEqual(0);

        done();
      });

      clientSocket.emit('end_turn', {
        roomCode,
        playerUUID: 'player-uuid-012',
      });
    });
  });
});
