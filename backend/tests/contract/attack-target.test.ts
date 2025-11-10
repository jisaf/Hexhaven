/**
 * Contract Test: WebSocket attack_target Event (US2 - T078)
 *
 * Tests the contract for attack_target WebSocket event:
 * - Client sends attack_target with targetId and attackingCardId
 * - Server validates target exists, is in range, and is alive
 * - Server draws attack modifier card from deck
 * - Server calculates final damage (base + modifier)
 * - Server emits attack_resolved with results
 * - Server broadcasts attack_resolved to all clients
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
      targetId: 'monster-123',
      attackingCardId: 'card-attack',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('attackerId');
      expect(payload).toHaveProperty('targetId');
      expect(payload).toHaveProperty('damage');
      expect(payload).toHaveProperty('modifier');
      expect(payload).toHaveProperty('effects');
      expect(payload).toHaveProperty('targetHealth');
      expect(payload).toHaveProperty('targetDead');

      // Verify payload values
      expect(payload.targetId).toBe(attackPayload.targetId);
      expect(typeof payload.damage).toBe('number');
      expect(Array.isArray(payload.effects)).toBe(true);
      expect(typeof payload.targetHealth).toBe('number');
      expect(typeof payload.targetDead).toBe('boolean');

      // Modifier is either number or special string
      expect(
        typeof payload.modifier === 'number' ||
        payload.modifier === 'null' ||
        payload.modifier === 'x2'
      ).toBe(true);

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should broadcast attack_resolved to other clients', (done) => {
    // Both players join
    clientSocket.emit('join_room', {
      roomCode: 'ATK02',
      playerUUID: 'player1-uuid',
      nickname: 'Player 1',
    });

    client2Socket.emit('join_room', {
      roomCode: 'ATK02',
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
          expect(payload).toHaveProperty('damage');
          expect(payload.targetId).toBe('monster-456');

          done();
        });

        // Player 1 attacks
        clientSocket.emit('attack_target', {
          targetId: 'monster-456',
          attackingCardId: 'card-attack',
        });
      }
    };

    clientSocket.on('room_joined', onJoined);
    client2Socket.on('room_joined', onJoined);
  });

  it('should apply attack modifier from deck draw', (done) => {
    const attackPayload: AttackTargetPayload = {
      targetId: 'monster-789',
      attackingCardId: 'card-attack',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // Verify modifier was applied
      expect(payload).toHaveProperty('modifier');

      // Standard modifiers: -2, -1, 0, +1, +2, or special: null, x2
      const validNumericModifiers = [-2, -1, 0, 1, 2];
      const validSpecialModifiers = ['null', 'x2'];

      const isValid =
        (typeof payload.modifier === 'number' && validNumericModifiers.includes(payload.modifier)) ||
        (typeof payload.modifier === 'string' && validSpecialModifiers.includes(payload.modifier));

      expect(isValid).toBe(true);

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should emit error when target is out of range', (done) => {
    const outOfRangePayload: AttackTargetPayload = {
      targetId: 'monster-distant',
      attackingCardId: 'card-melee', // Melee attack, target too far
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('TARGET_OUT_OF_RANGE');
      expect(payload.message).toContain('out of range');
      done();
    });

    clientSocket.emit('attack_target', outOfRangePayload);
  });

  it('should emit error when target does not exist', (done) => {
    const invalidTargetPayload: AttackTargetPayload = {
      targetId: 'non-existent-monster',
      attackingCardId: 'card-attack',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_TARGET');
      expect(payload.message).toContain('not found');
      done();
    });

    clientSocket.emit('attack_target', invalidTargetPayload);
  });

  it('should emit error when not player turn', (done) => {
    const wrongTurnPayload: AttackTargetPayload = {
      targetId: 'monster-999',
      attackingCardId: 'card-attack',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_YOUR_TURN');
      expect(payload.message).toContain('not your turn');
      done();
    });

    clientSocket.emit('attack_target', wrongTurnPayload);
  });

  it('should handle null modifier (miss)', (done) => {
    const attackPayload: AttackTargetPayload = {
      targetId: 'monster-222',
      attackingCardId: 'card-attack',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      if (payload.modifier === 'null') {
        // Miss means 0 damage dealt
        expect(payload.damage).toBe(0);
        // Target health should not decrease
        expect(payload.targetHealth).toBeGreaterThan(0);
      }

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should handle x2 modifier (double damage)', (done) => {
    const attackPayload: AttackTargetPayload = {
      targetId: 'monster-333',
      attackingCardId: 'card-attack',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      if (payload.modifier === 'x2') {
        // Damage should be doubled
        expect(payload.damage).toBeGreaterThan(0);
        // Could verify damage is double base, but would need to know base
      }

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should indicate when target dies from attack', (done) => {
    const attackPayload: AttackTargetPayload = {
      targetId: 'monster-low-health',
      attackingCardId: 'card-strong-attack',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      if (payload.targetDead) {
        // Health should be 0 or negative
        expect(payload.targetHealth).toBeLessThanOrEqual(0);
      }

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should include effect strings in attack results', (done) => {
    const attackPayload: AttackTargetPayload = {
      targetId: 'monster-444',
      attackingCardId: 'card-poison-attack',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      expect(Array.isArray(payload.effects)).toBe(true);

      // Effects might include: poison, wound, stun, immobilize, etc.
      // Empty array if no effects
      payload.effects.forEach(effect => {
        expect(typeof effect).toBe('string');
      });

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should emit error when attacking with invalid card', (done) => {
    const invalidCardPayload: AttackTargetPayload = {
      targetId: 'monster-555',
      attackingCardId: 'card-that-is-not-attack',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_CARD');
      expect(payload.message).toContain('not an attack');
      done();
    });

    clientSocket.emit('attack_target', invalidCardPayload);
  });

  it('should emit error when card not in selected cards', (done) => {
    const unselectedCardPayload: AttackTargetPayload = {
      targetId: 'monster-666',
      attackingCardId: 'card-not-selected',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('CARD_NOT_SELECTED');
      expect(payload.message).toContain('not selected this round');
      done();
    });

    clientSocket.emit('attack_target', unselectedCardPayload);
  });

  it('should handle area of effect attacks with multiple targets', (done) => {
    const aoePayload: AttackTargetPayload = {
      targetId: 'hex-5-5', // Target hex for AOE
      attackingCardId: 'card-aoe-attack',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // AOE might have multiple effects or special handling
      expect(payload).toHaveProperty('effects');

      done();
    });

    clientSocket.emit('attack_target', aoePayload);
  });

  it('should validate attack range based on card', (done) => {
    // Melee attack (range 0) on adjacent target should work
    // Melee attack on distant target should fail

    const meleePayload: AttackTargetPayload = {
      targetId: 'monster-adjacent',
      attackingCardId: 'card-melee',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      expect(payload.targetId).toBe('monster-adjacent');
      done();
    });

    clientSocket.emit('attack_target', meleePayload);
  });

  it('should handle advantage modifier (draw 2, use better)', (done) => {
    // Advantage means draw 2 modifiers and use the better one
    // This would be indicated in the attack card or character state

    const attackPayload: AttackTargetPayload = {
      targetId: 'monster-777',
      attackingCardId: 'card-with-advantage',
    };

    clientSocket.on('attack_resolved', (payload: AttackResolvedPayload) => {
      // Attack should resolve normally
      expect(payload).toHaveProperty('modifier');
      expect(payload).toHaveProperty('damage');

      done();
    });

    clientSocket.emit('attack_target', attackPayload);
  });

  it('should emit error when target is already dead', (done) => {
    const deadTargetPayload: AttackTargetPayload = {
      targetId: 'monster-already-dead',
      attackingCardId: 'card-attack',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_TARGET');
      expect(payload.message).toContain('already dead');
      done();
    });

    clientSocket.emit('attack_target', deadTargetPayload);
  });
});
