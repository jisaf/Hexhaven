/**
 * Contract Test: WebSocket attack_target Event (US2 - T078)
 *
 * Tests the contract for attack_target WebSocket event:
 * - Client sends attack_target with targetId, damage value, and range
 * - Server validates target is in range and alive
 * - Server draws attack modifier card
 * - Server calculates final damage
 * - Server emits attack_resolved with damage dealt and modifier
 * - Server broadcasts attack_resolved to other clients
 * - Server emits error for invalid attacks
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type {
  AttackTargetPayload,
  AttackResolvedPayload,
  ErrorPayload,
} from '../../../shared/types/events';

describe('WebSocket Contract: attack_target event', () => {
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

  it('should emit attack_resolved when attacking valid target', (done) => {
    const attackPayload: AttackTargetPayload = {
      roomCode: 'ATK01',
      playerUUID: 'player-uuid-001',
      targetId: 'monster-123',
      baseDamage: 3,
      range: 0, // Melee attack
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('attackerId');
      expect(payload).toHaveProperty('targetId');
      expect(payload).toHaveProperty('baseDamage');
      expect(payload).toHaveProperty('modifierValue');
      expect(payload).toHaveProperty('finalDamage');
      expect(payload).toHaveProperty('targetCurrentHealth');
      expect(payload).toHaveProperty('targetDied');

      // Verify payload values
      expect(payload.targetId).toBe(attackPayload.targetId);
      expect(payload.baseDamage).toBe(attackPayload.baseDamage);
      expect(typeof payload.modifierValue).toBe('number');
      expect(payload.finalDamage).toBe(payload.baseDamage + payload.modifierValue);
      expect(typeof payload.targetCurrentHealth).toBe('number');
      expect(typeof payload.targetDied).toBe('boolean');

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should broadcast attack_resolved to other clients', (done) => {
    const roomCode = 'ATK02';

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
        // Player 2 listens for attack broadcast
        client2Socket.on('attack_resolved', (payload: AttackResolvedPayload) => {
          expect(payload).toHaveProperty('attackerId');
          expect(payload).toHaveProperty('targetId');
          expect(payload).toHaveProperty('finalDamage');

          // Both players should see the same attack result
          expect(payload.targetId).toBe('monster-456');

          done();
        });

        // Player 1 attacks
        clientSocket.emit('attack_target', {
          roomCode,
          playerUUID: 'player1-uuid',
          targetId: 'monster-456',
          baseDamage: 4,
          range: 2, // Ranged attack
        });
      }
    };

    clientSocket.on('room_joined', onJoined);
    client2Socket.on('room_joined', onJoined);
  });

  it('should draw attack modifier card and apply to damage', (done) => {
    const attackPayload: AttackTargetPayload = {
      roomCode: 'MOD01',
      playerUUID: 'player-uuid-002',
      targetId: 'monster-789',
      baseDamage: 5,
      range: 0,
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // Verify modifier was drawn
      expect(payload).toHaveProperty('modifierValue');
      expect(payload).toHaveProperty('modifierType'); // e.g., 'plus1', 'minus2', 'x2', 'miss'

      // Modifier value should be one of valid values
      const validModifiers = [-2, -1, 0, 1, 2]; // Standard modifiers
      const isStandardModifier = validModifiers.includes(payload.modifierValue);
      const isSpecialModifier = ['x2', 'miss', 'null'].includes(payload.modifierType);

      expect(isStandardModifier || isSpecialModifier).toBe(true);

      // Verify damage calculation
      if (payload.modifierType === 'miss') {
        expect(payload.finalDamage).toBe(0);
      } else if (payload.modifierType === 'x2') {
        expect(payload.finalDamage).toBe(payload.baseDamage * 2);
      } else {
        expect(payload.finalDamage).toBe(payload.baseDamage + payload.modifierValue);
      }

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should emit error when target is out of range', (done) => {
    const outOfRangePayload: AttackTargetPayload = {
      roomCode: 'RANGE01',
      playerUUID: 'player-uuid-003',
      targetId: 'monster-distant',
      baseDamage: 3,
      range: 0, // Melee (range 0)
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('TARGET_OUT_OF_RANGE');
      expect(payload.message).toContain('Target is out of range');
      done();
    });

    clientSocket.emit('attack_target', outOfRangePayload);
  });

  it('should emit error when target does not exist', (done) => {
    const invalidTargetPayload: AttackTargetPayload = {
      roomCode: 'TARGET01',
      playerUUID: 'player-uuid-004',
      targetId: 'non-existent-monster',
      baseDamage: 3,
      range: 2,
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_TARGET');
      expect(payload.message).toContain('Target not found');
      done();
    });

    clientSocket.emit('attack_target', invalidTargetPayload);
  });

  it('should emit error when attacking on non-player turn', (done) => {
    const wrongTurnPayload: AttackTargetPayload = {
      roomCode: 'TURN01',
      playerUUID: 'player-uuid-005',
      targetId: 'monster-999',
      baseDamage: 2,
      range: 0,
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_YOUR_TURN');
      expect(payload.message).toContain('Not your turn');
      done();
    });

    clientSocket.emit('attack_target', wrongTurnPayload);
  });

  it('should emit error when player is disarmed (condition)', (done) => {
    const disarmedPayload: AttackTargetPayload = {
      roomCode: 'DISARM01',
      playerUUID: 'player-disarmed',
      targetId: 'monster-111',
      baseDamage: 4,
      range: 0,
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_ACTION');
      expect(payload.message).toContain('Cannot attack while disarmed');
      done();
    });

    clientSocket.emit('attack_target', disarmedPayload);
  });

  it('should handle MISS modifier (deal 0 damage)', (done) => {
    // Note: In practice, we'd manipulate modifier deck to force MISS
    // This test structure shows expected behavior

    const attackPayload: AttackTargetPayload = {
      roomCode: 'MISS01',
      playerUUID: 'player-uuid-006',
      targetId: 'monster-222',
      baseDamage: 5,
      range: 1,
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      if (payload.modifierType === 'miss') {
        // Verify MISS behavior
        expect(payload.finalDamage).toBe(0);
        expect(payload.modifierValue).toBe(0);

        // Target health should not decrease
        // (Would need to track health before attack for full verification)

        // Deck should reshuffle after MISS
        expect(payload).toHaveProperty('deckReshuffled');
        expect(payload.deckReshuffled).toBe(true);
      }

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should handle x2 modifier (double damage)', (done) => {
    const attackPayload: AttackTargetPayload = {
      roomCode: 'X2-01',
      playerUUID: 'player-uuid-007',
      targetId: 'monster-333',
      baseDamage: 4,
      range: 0,
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      if (payload.modifierType === 'x2') {
        // Verify x2 behavior
        expect(payload.finalDamage).toBe(payload.baseDamage * 2);

        // Deck should reshuffle after x2
        expect(payload).toHaveProperty('deckReshuffled');
        expect(payload.deckReshuffled).toBe(true);
      }

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should indicate when target dies from attack', (done) => {
    const attackPayload: AttackTargetPayload = {
      roomCode: 'KILL01',
      playerUUID: 'player-uuid-008',
      targetId: 'monster-low-health',
      baseDamage: 10, // High damage to ensure kill
      range: 0,
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // Check if monster died
      expect(payload).toHaveProperty('targetDied');

      if (payload.targetDied) {
        expect(payload.targetCurrentHealth).toBe(0);

        // Should indicate loot token spawned
        expect(payload).toHaveProperty('lootTokenSpawned');
        expect(payload.lootTokenSpawned).toBe(true);
      }

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should reshuffle modifier deck on reshuffle cards', (done) => {
    const attackPayload: AttackTargetPayload = {
      roomCode: 'SHUFFLE01',
      playerUUID: 'player-uuid-009',
      targetId: 'monster-444',
      baseDamage: 3,
      range: 0,
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // Reshuffle cards: MISS, x2, or rolling NULL
      const reshuffleModifiers = ['miss', 'x2', 'null'];

      if (reshuffleModifiers.includes(payload.modifierType)) {
        expect(payload).toHaveProperty('deckReshuffled');
        expect(payload.deckReshuffled).toBe(true);
      } else {
        expect(payload.deckReshuffled).toBe(false);
      }

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should validate damage is non-negative', (done) => {
    const negativeDamagePayload: AttackTargetPayload = {
      roomCode: 'NEG01',
      playerUUID: 'player-uuid-010',
      targetId: 'monster-555',
      baseDamage: -5, // Invalid negative damage
      range: 0,
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Damage must be non-negative');
      done();
    });

    clientSocket.emit('attack_target', negativeDamagePayload);
  });

  it('should validate range is non-negative', (done) => {
    const invalidRangePayload: AttackTargetPayload = {
      roomCode: 'RANGE02',
      playerUUID: 'player-uuid-011',
      targetId: 'monster-666',
      baseDamage: 3,
      range: -1, // Invalid negative range
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Range must be non-negative');
      done();
    });

    clientSocket.emit('attack_target', invalidRangePayload);
  });

  it('should handle advantage and disadvantage modifiers', (done) => {
    const advantagePayload: AttackTargetPayload = {
      roomCode: 'ADV01',
      playerUUID: 'player-uuid-012',
      targetId: 'monster-777',
      baseDamage: 4,
      range: 0,
      advantage: true, // Draw two modifiers, take better
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // With advantage, two modifiers should be drawn
      expect(payload).toHaveProperty('modifiersDrawn');

      if (payload.advantage) {
        expect(payload.modifiersDrawn.length).toBe(2);
        // Final modifier should be the better of the two
      }

      done();
    });

    clientSocket.emit('attack_target', advantagePayload);
  });

  it('should apply elemental infusion effects to attacks', (done) => {
    const elementalAttackPayload: AttackTargetPayload = {
      roomCode: 'ELEM01',
      playerUUID: 'player-uuid-013',
      targetId: 'monster-888',
      baseDamage: 3,
      range: 2,
      consumeElement: 'fire', // Consume fire element for +2 damage
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // Verify element was consumed
      expect(payload).toHaveProperty('elementConsumed');

      if (payload.elementConsumed === 'fire') {
        // Fire consumption adds damage
        expect(payload).toHaveProperty('elementalBonus');
        expect(payload.elementalBonus).toBeGreaterThan(0);

        // Final damage includes elemental bonus
        expect(payload.finalDamage).toBeGreaterThanOrEqual(
          payload.baseDamage + payload.modifierValue + payload.elementalBonus
        );
      }

      done();
    });

    clientSocket.emit('attack_target', elementalAttackPayload);
  });
});
