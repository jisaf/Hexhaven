/**
 * Contract Test: WebSocket select_cards Event (US2 - T077)
 *
 * Tests the contract for select_cards WebSocket event:
 * - Client sends select_cards with top and bottom card IDs
 * - Server validates payload (exactly 2 cards, cards exist in hand)
 * - Server emits cards_selected confirmation to client
 * - Server broadcasts player initiative to other clients
 * - After all players select, server emits turn_order_determined
 * - Server emits error for invalid card selections
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type {
  SelectCardsPayload,
  CardsSelectedPayload,
  TurnOrderDeterminedPayload,
  ErrorPayload,
} from '../../../shared/types/events';

describe('WebSocket Contract: select_cards event', () => {
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

  it('should emit cards_selected when selecting 2 cards', (done) => {
    const selectPayload: SelectCardsPayload = {
      topCardId: 'card-123',
      bottomCardId: 'card-456',
    };

    clientSocket.on('cards_selected', (payload: CardsSelectedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('playerId');
      expect(payload).toHaveProperty('topCardInitiative');
      expect(payload).toHaveProperty('bottomCardInitiative');

      // Verify payload values
      expect(typeof payload.playerId).toBe('string');
      expect(typeof payload.topCardInitiative).toBe('number');
      expect(typeof payload.bottomCardInitiative).toBe('number');

      done();
    });

    clientSocket.emit('select_cards', selectPayload);
  });

  it('should broadcast player card selection to other clients', (done) => {
    // Setup: Both players join game room first
    clientSocket.emit('join_room', {
      roomCode: 'CARD02',
      playerUUID: 'player1-uuid',
      nickname: 'Player 1',
    });

    client2Socket.emit('join_room', {
      roomCode: 'CARD02',
      playerUUID: 'player2-uuid',
      nickname: 'Player 2',
    });

    // Wait for both to join
    let joinedCount = 0;
    const onJoined = () => {
      joinedCount++;
      if (joinedCount === 2) {
        // Player 1 selects cards
        const selectPayload: SelectCardsPayload = {
          topCardId: 'card-111',
          bottomCardId: 'card-222',
        };

        // Player 2 listens for broadcast
        client2Socket.on('cards_selected', (payload: CardsSelectedPayload) => {
          // Should see Player 1's selection
          expect(payload).toHaveProperty('playerId');
          expect(payload).toHaveProperty('topCardInitiative');
          expect(payload).toHaveProperty('bottomCardInitiative');

          // Initiatives should be valid numbers
          expect(payload.topCardInitiative).toBeGreaterThanOrEqual(0);
          expect(payload.bottomCardInitiative).toBeGreaterThanOrEqual(0);

          done();
        });

        clientSocket.emit('select_cards', selectPayload);
      }
    };

    clientSocket.on('room_joined', onJoined);
    client2Socket.on('room_joined', onJoined);
  });

  it('should emit turn_order_determined when all players have selected', (done) => {
    // Both players join
    clientSocket.emit('join_room', {
      roomCode: 'TURN01',
      playerUUID: 'player1-uuid',
      nickname: 'Player 1',
    });

    client2Socket.emit('join_room', {
      roomCode: 'TURN01',
      playerUUID: 'player2-uuid',
      nickname: 'Player 2',
    });

    let joinedCount = 0;
    const onJoined = () => {
      joinedCount++;
      if (joinedCount === 2) {
        // Setup listener for turn order
        clientSocket.on('turn_order_determined', (payload: TurnOrderDeterminedPayload) => {
          // Verify payload structure
          expect(payload).toHaveProperty('turnOrder');
          expect(Array.isArray(payload.turnOrder)).toBe(true);
          expect(payload.turnOrder.length).toBeGreaterThanOrEqual(2);

          // Verify turn order entities
          payload.turnOrder.forEach(entity => {
            expect(entity).toHaveProperty('entityId');
            expect(entity).toHaveProperty('entityType');
            expect(entity).toHaveProperty('initiative');
            expect(entity).toHaveProperty('name');
            expect(['character', 'monster']).toContain(entity.entityType);
          });

          // Verify turn order is sorted by initiative (lowest first)
          for (let i = 0; i < payload.turnOrder.length - 1; i++) {
            expect(payload.turnOrder[i].initiative).toBeLessThanOrEqual(
              payload.turnOrder[i + 1].initiative
            );
          }

          done();
        });

        // Player 1 selects cards (high initiative)
        clientSocket.emit('select_cards', {
          topCardId: 'card-high-1',
          bottomCardId: 'card-high-2',
        });

        // Player 2 selects cards (low initiative - should go first)
        client2Socket.emit('select_cards', {
          topCardId: 'card-low-1',
          bottomCardId: 'card-low-2',
        });
      }
    };

    clientSocket.on('room_joined', onJoined);
    client2Socket.on('room_joined', onJoined);
  });

  it('should emit error when cards do not exist in hand', (done) => {
    const invalidPayload: SelectCardsPayload = {
      topCardId: 'non-existent-card-1',
      bottomCardId: 'non-existent-card-2',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload).toHaveProperty('code');
      expect(payload).toHaveProperty('message');
      expect(payload.code).toBe('INVALID_CARDS');
      expect(payload.message).toContain('not in hand');
      done();
    });

    clientSocket.emit('select_cards', invalidPayload);
  });

  it('should emit error when not in card selection phase', (done) => {
    const selectPayload: SelectCardsPayload = {
      topCardId: 'card-777',
      bottomCardId: 'card-888',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_PHASE');
      expect(payload.message).toContain('Not in card selection phase');
      done();
    });

    clientSocket.emit('select_cards', selectPayload);
  });

  it('should emit error for missing card IDs', (done) => {
    // Missing bottomCardId
    const invalidPayload = {
      topCardId: 'card-only-one',
    } as SelectCardsPayload;

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('required');
      done();
    });

    clientSocket.emit('select_cards', invalidPayload);
  });

  it('should emit error when selecting same card twice', (done) => {
    const duplicatePayload: SelectCardsPayload = {
      topCardId: 'card-999',
      bottomCardId: 'card-999', // Same card
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('same card');
      done();
    });

    clientSocket.emit('select_cards', duplicatePayload);
  });

  it('should include monsters in turn order with their initiatives', (done) => {
    // Join room with scenario containing monsters
    clientSocket.emit('join_room', {
      roomCode: 'MONSTER01',
      playerUUID: 'player1-uuid',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Start game with monsters
      clientSocket.emit('start_game', {
        scenarioId: 'scenario-with-monsters',
      });

      clientSocket.on('game_started', () => {
        clientSocket.on('turn_order_determined', (payload: TurnOrderDeterminedPayload) => {
          // Should have both players and monsters
          const entityTypes = payload.turnOrder.map(e => e.entityType);
          expect(entityTypes).toContain('character');
          expect(entityTypes).toContain('monster');

          // Monsters should have valid initiatives
          const monsters = payload.turnOrder.filter(e => e.entityType === 'monster');
          monsters.forEach(monster => {
            expect(typeof monster.initiative).toBe('number');
            expect(monster.initiative).toBeGreaterThanOrEqual(0);
          });

          done();
        });

        // Select cards
        clientSocket.emit('select_cards', {
          topCardId: 'card-123',
          bottomCardId: 'card-456',
        });
      });
    });
  });

  it('should prevent reselecting cards after confirmation', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'RESEL01',
      playerUUID: 'player-uuid-008',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Select cards first time
      clientSocket.emit('select_cards', {
        topCardId: 'card-111',
        bottomCardId: 'card-222',
      });

      clientSocket.on('cards_selected', () => {
        // Try to select different cards
        clientSocket.on('error', (payload: ErrorPayload) => {
          expect(payload.code).toBe('CARDS_ALREADY_SELECTED');
          expect(payload.message).toContain('already selected');
          done();
        });

        clientSocket.emit('select_cards', {
          topCardId: 'card-333',
          bottomCardId: 'card-444',
        });
      });
    });
  });

  it('should handle long rest as special card selection', (done) => {
    // Long rest might use special card IDs or payload structure
    clientSocket.emit('long_rest', {
      cardToLose: 'card-to-discard',
    });

    clientSocket.on('cards_selected', (payload: CardsSelectedPayload) => {
      // Long rest has initiative 99
      expect(payload.topCardInitiative).toBe(99);
      expect(payload.bottomCardInitiative).toBe(99);
      done();
    });
  });
});
