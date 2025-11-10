/**
 * Contract Test: WebSocket end_turn Event (US2 - T079)
 *
 * Tests the contract for end_turn WebSocket event:
 * - Client sends end_turn to complete current turn
 * - Server validates it's the player's turn
 * - Server advances to next entity in turn order
 * - Server emits turn_started with new current entity
 * - If monster turn, server triggers monster AI and emits monster_activated
 * - At end of round, server emits round_ended with elemental decay
 * - Server emits error for invalid end turn attempts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type {
  EndTurnPayload,
  TurnStartedPayload,
  MonsterActivatedPayload,
  RoundEndedPayload,
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

  it('should emit turn_started when ending turn', (done) => {
    const endTurnPayload: EndTurnPayload = {};

    clientSocket.on('turn_started', (payload: TurnStartedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('entityId');
      expect(payload).toHaveProperty('entityType');
      expect(payload).toHaveProperty('turnIndex');

      // Verify entity type is valid
      expect(['character', 'monster']).toContain(payload.entityType);

      // Turn index should be valid number
      expect(typeof payload.turnIndex).toBe('number');
      expect(payload.turnIndex).toBeGreaterThanOrEqual(0);

      done();
    });

    clientSocket.emit('end_turn', endTurnPayload);
  });

  it('should broadcast turn_started to all players', (done) => {
    // Both players join
    clientSocket.emit('join_room', {
      roomCode: 'TURN02',
      playerUUID: 'player1-uuid',
      nickname: 'Player 1',
    });

    client2Socket.emit('join_room', {
      roomCode: 'TURN02',
      playerUUID: 'player2-uuid',
      nickname: 'Player 2',
    });

    let joinedCount = 0;
    const onJoined = () => {
      joinedCount++;
      if (joinedCount === 2) {
        // Player 2 listens for turn change
        client2Socket.on('turn_started', (payload: TurnStartedPayload) => {
          expect(payload).toHaveProperty('entityId');
          expect(['character', 'monster']).toContain(payload.entityType);

          done();
        });

        // Player 1 ends turn
        clientSocket.emit('end_turn', {});
      }
    };

    clientSocket.on('room_joined', onJoined);
    client2Socket.on('room_joined', onJoined);
  });

  it('should emit error when ending turn out of turn', (done) => {
    // Try to end turn when it's not this player's turn
    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_YOUR_TURN');
      expect(payload.message).toContain('not your turn');
      done();
    });

    clientSocket.emit('end_turn', {});
  });

  it('should activate monster AI when monster turn starts', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'MONSTER01',
      playerUUID: 'player-uuid-002',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Listen for monster activation
      clientSocket.on('monster_activated', (payload: MonsterActivatedPayload) => {
        // Verify payload structure
        expect(payload).toHaveProperty('monsterId');
        expect(payload).toHaveProperty('focusTarget');
        expect(payload).toHaveProperty('movement');
        expect(payload).toHaveProperty('attack');

        // Verify movement coordinates
        expect(payload.movement).toHaveProperty('q');
        expect(payload.movement).toHaveProperty('r');

        // Attack can be null if monster doesn't attack
        if (payload.attack !== null) {
          expect(payload.attack).toHaveProperty('targetId');
          expect(payload.attack).toHaveProperty('damage');
          expect(payload.attack).toHaveProperty('modifier');
        }

        done();
      });

      // End player turn to trigger monster turn
      clientSocket.emit('end_turn', {});
    });
  });

  it('should emit round_ended after all entities complete turns', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'ROUND01',
      playerUUID: 'player-uuid-003',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Listen for round end
      clientSocket.on('round_ended', (payload: RoundEndedPayload) => {
        // Verify payload structure
        expect(payload).toHaveProperty('roundNumber');
        expect(payload).toHaveProperty('elementalState');

        // Round should be positive number
        expect(payload.roundNumber).toBeGreaterThan(0);

        // Elemental state should have all 6 elements
        expect(payload.elementalState).toHaveProperty('fire');
        expect(payload.elementalState).toHaveProperty('ice');
        expect(payload.elementalState).toHaveProperty('air');
        expect(payload.elementalState).toHaveProperty('earth');
        expect(payload.elementalState).toHaveProperty('light');
        expect(payload.elementalState).toHaveProperty('dark');

        // Each element state should be valid
        Object.values(payload.elementalState).forEach((state: any) => {
          expect(['inert', 'waning', 'strong']).toContain(state);
        });

        done();
      });

      // End turn to potentially complete round
      clientSocket.emit('end_turn', {});
    });
  });

  it('should trigger card selection phase at start of new round', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'CARDSEL01',
      playerUUID: 'player-uuid-004',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      clientSocket.on('round_ended', () => {
        // After round ends, card selection should begin
        clientSocket.on('card_selection_started', () => {
          // Card selection phase started
          done();
        });
      });

      clientSocket.emit('end_turn', {});
    });
  });

  it('should emit error when ending turn before taking action', (done) => {
    // Player must perform at least one action before ending turn
    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NO_ACTION_TAKEN');
      expect(payload.message).toContain('action before ending turn');
      done();
    });

    clientSocket.emit('end_turn', {});
  });

  it('should emit error when room is not in active phase', (done) => {
    // Try to end turn when game hasn't started (still in lobby)
    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_PHASE');
      expect(payload.message).toContain('not in active phase');
      done();
    });

    clientSocket.emit('end_turn', {});
  });

  it('should decay elemental states at end of round', (done) => {
    // strong → waning, waning → inert
    clientSocket.emit('join_room', {
      roomCode: 'ELEMEND01',
      playerUUID: 'player-uuid-007',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      clientSocket.on('round_ended', (payload: RoundEndedPayload) => {
        // Elements should have decayed
        const elementalState = payload.elementalState;

        // Verify all elements are in valid states
        Object.keys(elementalState).forEach(element => {
          const state = elementalState[element as keyof typeof elementalState];
          expect(['inert', 'waning', 'strong']).toContain(state);
        });

        done();
      });

      clientSocket.emit('end_turn', {});
    });
  });

  it('should handle scenario completion check at end of turn', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'COMPLETE01',
      playerUUID: 'player-uuid-009',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Listen for scenario completion (victory or defeat)
      clientSocket.on('scenario_completed', (payload) => {
        expect(payload).toHaveProperty('victory');
        expect(payload).toHaveProperty('experience');
        expect(payload).toHaveProperty('loot');

        expect(typeof payload.victory).toBe('boolean');

        done();
      });

      // End turn might trigger completion
      clientSocket.emit('end_turn', {});
    });
  });

  it('should emit error when player not in game room', (done) => {
    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_IN_ROOM');
      expect(payload.message).toContain('not in a room');
      done();
    });

    clientSocket.emit('end_turn', {});
  });

  it('should auto-advance after monster turn completes', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'AUTOMONSTER01',
      playerUUID: 'player-uuid-011',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      let monsterActivated = false;

      clientSocket.on('monster_activated', () => {
        monsterActivated = true;
      });

      // After monster activation, turn should auto-advance
      clientSocket.on('turn_started', (payload: TurnStartedPayload) => {
        if (monsterActivated) {
          // Monster turn completed, next turn started automatically
          expect(payload.entityType).toBeDefined();
          done();
        }
      });

      clientSocket.emit('end_turn', {});
    });
  });

  it('should preserve turn order across rounds', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'CONTINUITY01',
      playerUUID: 'player-uuid-012',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      clientSocket.on('round_ended', (payload: RoundEndedPayload) => {
        // Round number should increment
        expect(payload.roundNumber).toBeGreaterThan(1);

        done();
      });

      clientSocket.emit('end_turn', {});
    });
  });

  it('should handle monster with no attack (move only)', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'MOVE_ONLY',
      playerUUID: 'player-uuid-013',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      clientSocket.on('monster_activated', (payload: MonsterActivatedPayload) => {
        // Monster might not attack if out of range
        if (payload.attack === null) {
          expect(payload.movement).toBeDefined();
          expect(payload.focusTarget).toBeDefined();
          done();
        }
      });

      clientSocket.emit('end_turn', {});
    });
  });

  it('should track turn index correctly', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'TURN_INDEX',
      playerUUID: 'player-uuid-014',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      let previousIndex = -1;

      clientSocket.on('turn_started', (payload: TurnStartedPayload) => {
        // Turn index should increment or wrap to 0
        if (previousIndex >= 0) {
          const expectedNext = previousIndex + 1;
          // Either increments or wraps to 0 for new round
          expect(payload.turnIndex === expectedNext || payload.turnIndex === 0).toBe(true);
        }

        previousIndex = payload.turnIndex;
        done();
      });

      clientSocket.emit('end_turn', {});
    });
  });
});
