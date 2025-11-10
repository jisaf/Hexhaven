/**
 * Contract Test: WebSocket select_cards Event (US2 - T077)
 *
 * Tests the contract for select_cards WebSocket event:
 * - Client sends select_cards with cardIds array and initiative
 * - Server validates payload (exactly 2 cards or long rest)
 * - Server emits cards_selected confirmation to client
 * - Server broadcasts player_cards_selected to other clients (with initiative only)
 * - After all players select, server emits turn_order_determined
 * - Server emits error for invalid card selections
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type {
  SelectCardsPayload,
  CardsSelectedPayload,
  PlayerCardsSelectedPayload,
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

  it('should emit cards_selected when selecting exactly 2 cards', (done) => {
    const selectPayload: SelectCardsPayload = {
      roomCode: 'CARD01',
      playerUUID: 'player-uuid-001',
      cardIds: ['card-123', 'card-456'],
      initiative: 45, // Initiative from selected cards
    };

    clientSocket.on('cards_selected', (payload: CardsSelectedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('cardIds');
      expect(payload).toHaveProperty('initiative');
      expect(payload).toHaveProperty('playerId');

      // Verify payload values
      expect(payload.cardIds).toEqual(selectPayload.cardIds);
      expect(payload.initiative).toBe(selectPayload.initiative);
      expect(Array.isArray(payload.cardIds)).toBe(true);
      expect(payload.cardIds.length).toBe(2);

      done();
    });

    clientSocket.emit('select_cards', selectPayload);
  });

  it('should broadcast player_cards_selected to other clients (without card IDs)', (done) => {
    const roomCode = 'CARD02';

    // Setup: Both players join game room
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

    // Wait for both to join
    let joinedCount = 0;
    const onJoined = () => {
      joinedCount++;
      if (joinedCount === 2) {
        // Player 1 selects cards
        const selectPayload: SelectCardsPayload = {
          roomCode,
          playerUUID: 'player1-uuid',
          cardIds: ['card-111', 'card-222'],
          initiative: 32,
        };

        // Player 2 listens for broadcast
        client2Socket.on('player_cards_selected', (payload: PlayerCardsSelectedPayload) => {
          // Verify payload structure
          expect(payload).toHaveProperty('playerId');
          expect(payload).toHaveProperty('nickname');
          expect(payload).toHaveProperty('initiative');
          expect(payload).not.toHaveProperty('cardIds'); // Cards are hidden from other players

          // Verify payload values
          expect(payload.nickname).toBe('Player 1');
          expect(payload.initiative).toBe(selectPayload.initiative);

          done();
        });

        clientSocket.emit('select_cards', selectPayload);
      }
    };

    clientSocket.on('room_joined', onJoined);
    client2Socket.on('room_joined', onJoined);
  });

  it('should emit turn_order_determined when all players have selected cards', (done) => {
    const roomCode = 'TURN01';

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
        // Setup listener for turn order
        clientSocket.on('turn_order_determined', (payload: TurnOrderDeterminedPayload) => {
          // Verify payload structure
          expect(payload).toHaveProperty('turnOrder');
          expect(payload).toHaveProperty('currentTurnIndex');
          expect(payload).toHaveProperty('round');

          // Verify turn order
          expect(Array.isArray(payload.turnOrder)).toBe(true);
          expect(payload.turnOrder.length).toBeGreaterThanOrEqual(2); // At least 2 players
          expect(payload.currentTurnIndex).toBe(0); // Starts at first entity

          // Verify turn order is sorted by initiative (lowest goes first)
          // (In Hexhaven, lower initiative acts first)
          for (let i = 0; i < payload.turnOrder.length - 1; i++) {
            expect(payload.turnOrder[i].initiative).toBeLessThanOrEqual(
              payload.turnOrder[i + 1].initiative
            );
          }

          done();
        });

        // Player 1 selects cards (initiative 50)
        clientSocket.emit('select_cards', {
          roomCode,
          playerUUID: 'player1-uuid',
          cardIds: ['card-111', 'card-222'],
          initiative: 50,
        });

        // Player 2 selects cards (initiative 20) - should go first
        client2Socket.emit('select_cards', {
          roomCode,
          playerUUID: 'player2-uuid',
          cardIds: ['card-333', 'card-444'],
          initiative: 20,
        });
      }
    };

    clientSocket.on('room_joined', onJoined);
    client2Socket.on('room_joined', onJoined);
  });

  it('should emit error when selecting wrong number of cards', (done) => {
    const invalidPayload: SelectCardsPayload = {
      roomCode: 'CARD03',
      playerUUID: 'player-uuid-002',
      cardIds: ['card-only-one'], // Only 1 card
      initiative: 30,
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload).toHaveProperty('code');
      expect(payload).toHaveProperty('message');

      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Must select exactly 2 cards');

      done();
    });

    clientSocket.emit('select_cards', invalidPayload);
  });

  it('should emit error when selecting cards not in hand', (done) => {
    const invalidPayload: SelectCardsPayload = {
      roomCode: 'CARD04',
      playerUUID: 'player-uuid-003',
      cardIds: ['non-existent-card-1', 'non-existent-card-2'],
      initiative: 40,
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_CARDS');
      expect(payload.message).toContain('Selected cards not in hand');
      done();
    });

    clientSocket.emit('select_cards', invalidPayload);
  });

  it('should emit error when selecting cards out of turn (not card selection phase)', (done) => {
    const outOfTurnPayload: SelectCardsPayload = {
      roomCode: 'CARD05',
      playerUUID: 'player-uuid-004',
      cardIds: ['card-777', 'card-888'],
      initiative: 25,
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_PHASE');
      expect(payload.message).toContain('Not in card selection phase');
      done();
    });

    clientSocket.emit('select_cards', outOfTurnPayload);
  });

  it('should allow long rest (no cards selected, initiative 99)', (done) => {
    const longRestPayload: SelectCardsPayload = {
      roomCode: 'REST01',
      playerUUID: 'player-uuid-005',
      cardIds: [], // No cards for long rest
      initiative: 99, // Long rest always has initiative 99
    };

    clientSocket.on('cards_selected', (payload: CardsSelectedPayload) => {
      expect(payload.cardIds).toEqual([]);
      expect(payload.initiative).toBe(99);
      expect(payload).toHaveProperty('isLongRest');
      expect(payload.isLongRest).toBe(true);

      done();
    });

    clientSocket.emit('select_cards', longRestPayload);
  });

  it('should emit error when selecting duplicate card IDs', (done) => {
    const duplicatePayload: SelectCardsPayload = {
      roomCode: 'CARD06',
      playerUUID: 'player-uuid-006',
      cardIds: ['card-999', 'card-999'], // Same card twice
      initiative: 35,
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Cannot select the same card twice');
      done();
    });

    clientSocket.emit('select_cards', duplicatePayload);
  });

  it('should emit error when initiative does not match selected cards', (done) => {
    const mismatchPayload: SelectCardsPayload = {
      roomCode: 'CARD07',
      playerUUID: 'player-uuid-007',
      cardIds: ['card-abc', 'card-def'],
      initiative: 999, // Invalid initiative value
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Initiative mismatch');
      done();
    });

    clientSocket.emit('select_cards', mismatchPayload);
  });

  it('should include monsters in turn order after all players select', (done) => {
    const roomCode = 'MONSTER01';

    // Join room with scenario containing monsters
    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player1-uuid',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Start game (this spawns monsters)
      clientSocket.emit('start_game', {
        roomCode,
        scenarioId: 'scenario-with-monsters',
      });

      clientSocket.on('game_started', () => {
        // Listen for turn order
        clientSocket.on('turn_order_determined', (payload: TurnOrderDeterminedPayload) => {
          // Turn order should include player(s) AND monsters
          const entityTypes = payload.turnOrder.map(entity => entity.type);

          expect(entityTypes).toContain('player');
          expect(entityTypes).toContain('monster');

          // Verify monsters have initiative values
          const monsters = payload.turnOrder.filter(e => e.type === 'monster');
          monsters.forEach(monster => {
            expect(monster).toHaveProperty('initiative');
            expect(typeof monster.initiative).toBe('number');
          });

          done();
        });

        // Select cards
        clientSocket.emit('select_cards', {
          roomCode,
          playerUUID: 'player1-uuid',
          cardIds: ['card-123', 'card-456'],
          initiative: 45,
        });
      });
    });
  });

  it('should prevent reselecting cards after confirmation', (done) => {
    const roomCode = 'RESEL01';

    clientSocket.emit('join_room', {
      roomCode,
      playerUUID: 'player-uuid-008',
      nickname: 'Player 1',
    });

    clientSocket.on('room_joined', () => {
      // Select cards first time
      clientSocket.emit('select_cards', {
        roomCode,
        playerUUID: 'player-uuid-008',
        cardIds: ['card-111', 'card-222'],
        initiative: 40,
      });

      clientSocket.on('cards_selected', () => {
        // Try to select different cards
        clientSocket.on('error', (payload: ErrorPayload) => {
          expect(payload.code).toBe('CARDS_ALREADY_SELECTED');
          expect(payload.message).toContain('Cards already selected for this round');
          done();
        });

        clientSocket.emit('select_cards', {
          roomCode,
          playerUUID: 'player-uuid-008',
          cardIds: ['card-333', 'card-444'],
          initiative: 50,
        });
      });
    });
  });
});
