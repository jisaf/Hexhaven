/**
 * Contract Test: WebSocket move_character Event (US1 - T042)
 *
 * Tests the contract for move_character WebSocket event:
 * - Client sends move_character with characterId and targetHex
 * - Server validates move (range, obstacles, occupancy)
 * - Server emits character_moved to all clients with movement path
 * - Server updates game state
 * - Server emits error for invalid movements
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type {
  JoinRoomPayload,
  SelectCharacterPayload,
  StartGamePayload,
  MoveCharacterPayload,
  CharacterMovedPayload,
  ErrorPayload,
} from '../../../shared/types/events';
import type { AxialCoordinates } from '../../../shared/types/entities';
import { CharacterClass } from '../../../shared/types/entities';

describe('WebSocket Contract: move_character event', () => {
  let hostSocket: ClientSocket;
  let client2Socket: ClientSocket;
  const testPort = 3001;
  const serverUrl = `http://localhost:${testPort}`;
  const testRoomCode = 'MOVE01';

  // Helper to setup game with 2 players
  async function setupGameState(done: any) {
    hostSocket = io(serverUrl, { autoConnect: false, transports: ['websocket'] });
    client2Socket = io(serverUrl, { autoConnect: false, transports: ['websocket'] });

    hostSocket.connect();
    client2Socket.connect();

    let step = 0;

    const checkStep = () => {
      step++;
      if (step === 6) {
        // All setup complete
        done();
      }
    };

    hostSocket.on('connect', () => {
      hostSocket.emit('join_room', {
        roomCode: testRoomCode,
        playerUUID: 'host',
        nickname: 'Host',
      });
    });

    client2Socket.on('connect', () => {
      client2Socket.emit('join_room', {
        roomCode: testRoomCode,
        playerUUID: 'player-2',
        nickname: 'Player 2',
      });
    });

    hostSocket.on('room_joined', checkStep);
    client2Socket.on('room_joined', checkStep);

    let characterSelectCount = 0;
    const onCharacterSelect = () => {
      characterSelectCount++;
      if (characterSelectCount === 2) {
        checkStep();
        hostSocket.emit('start_game', { scenarioId: 'scenario-001' });
      }
    };

    hostSocket.on('character_selected', onCharacterSelect);
    client2Socket.on('character_selected', onCharacterSelect);

    // Select characters after both joined
    setTimeout(() => {
      hostSocket.emit('select_character', { characterClass: CharacterClass.BRUTE });
      client2Socket.emit('select_character', { characterClass: CharacterClass.TINKERER });
      checkStep(); // For both character emissions
    }, 100);

    hostSocket.on('game_started', checkStep);
    client2Socket.on('game_started', checkStep);
  }

  beforeEach((done) => {
    setupGameState(done);
  });

  afterEach(() => {
    if (hostSocket && hostSocket.connected) {
      hostSocket.disconnect();
    }
    if (client2Socket && client2Socket.connected) {
      client2Socket.disconnect();
    }
  });

  it('should emit character_moved when making valid movement', (done) => {
    const movePayload: MoveCharacterPayload = {
      characterId: 'brute-char-id', // Will be actual character ID from game_started
      targetHex: { q: 1, r: 0 }, // Adjacent hex
    };

    hostSocket.on('character_moved', (payload: CharacterMovedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('characterId');
      expect(payload).toHaveProperty('fromHex');
      expect(payload).toHaveProperty('toHex');
      expect(payload).toHaveProperty('movementPath');

      // Verify payload values
      expect(payload.characterId).toBe(movePayload.characterId);
      expect(payload.toHex).toEqual(movePayload.targetHex);
      expect(Array.isArray(payload.movementPath)).toBe(true);
      expect(payload.movementPath.length).toBeGreaterThan(0);

      // Verify hex coordinate structure
      expect(payload.toHex).toHaveProperty('q');
      expect(payload.toHex).toHaveProperty('r');

      done();
    });

    hostSocket.emit('move_character', movePayload);
  });

  it('should broadcast character_moved to all players', (done) => {
    const movePayload: MoveCharacterPayload = {
      characterId: 'brute-char-id',
      targetHex: { q: 1, r: 0 },
    };

    // Setup listener on client 2
    client2Socket.on('character_moved', (payload: CharacterMovedPayload) => {
      expect(payload.characterId).toBe(movePayload.characterId);
      expect(payload.toHex).toEqual(movePayload.targetHex);
      done();
    });

    hostSocket.emit('move_character', movePayload);
  });

  it('should emit error when moving out of range', (done) => {
    const outOfRangePayload: MoveCharacterPayload = {
      characterId: 'brute-char-id',
      targetHex: { q: 10, r: 10 }, // Too far away
    };

    hostSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_MOVEMENT');
      expect(payload.message).toContain('out of range');
      done();
    });

    hostSocket.emit('move_character', outOfRangePayload);
  });

  it('should emit error when moving to obstacle hex', (done) => {
    const obstaclePayload: MoveCharacterPayload = {
      characterId: 'brute-char-id',
      targetHex: { q: 1, r: 1 }, // Assume this is an obstacle in the test scenario
    };

    hostSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_MOVEMENT');
      expect(payload.message.toLowerCase()).toMatch(/obstacle|blocked/);
      done();
    });

    hostSocket.emit('move_character', obstaclePayload);
  });

  it('should emit error when moving to occupied hex', (done) => {
    // First, get Tinkerer's position from game_started
    let tinkererPosition: AxialCoordinates;

    hostSocket.on('game_started', (payload: any) => {
      const tinkerer = payload.characters.find((c: any) => c.characterClass === CharacterClass.TINKERER);
      tinkererPosition = tinkerer.position;

      // Try to move Brute to Tinkerer's position
      const occupiedPayload: MoveCharacterPayload = {
        characterId: 'brute-char-id',
        targetHex: tinkererPosition,
      };

      hostSocket.on('error', (payload: ErrorPayload) => {
        expect(payload.code).toBe('INVALID_MOVEMENT');
        expect(payload.message).toContain('occupied');
        done();
      });

      hostSocket.emit('move_character', occupiedPayload);
    });
  });

  it('should emit error when moving another player\'s character', (done) => {
    const movePayload: MoveCharacterPayload = {
      characterId: 'tinkerer-char-id', // Player 2's character
      targetHex: { q: 1, r: 0 },
    };

    // Host tries to move Player 2's character
    hostSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_YOUR_CHARACTER');
      expect(payload.message.toLowerCase()).toMatch(/not your character|cannot control/);
      done();
    });

    hostSocket.emit('move_character', movePayload);
  });

  it('should emit error when moving on another player\'s turn', (done) => {
    // This test assumes turn-based gameplay
    // First, determine whose turn it is, then wrong player tries to move

    const movePayload: MoveCharacterPayload = {
      characterId: 'tinkerer-char-id',
      targetHex: { q: 1, r: 0 },
    };

    // If it's not Player 2's turn, they shouldn't be able to move
    client2Socket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_YOUR_TURN');
      expect(payload.message).toContain('not your turn');
      done();
    });

    client2Socket.emit('move_character', movePayload);
  });

  it('should emit error for invalid character ID', (done) => {
    const invalidPayload: MoveCharacterPayload = {
      characterId: 'non-existent-character',
      targetHex: { q: 1, r: 0 },
    };

    hostSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('CHARACTER_NOT_FOUND');
      expect(payload.message).toContain('Character not found');
      done();
    });

    hostSocket.emit('move_character', invalidPayload);
  });

  it('should emit error for missing payload fields', (done) => {
    const invalidPayload = {
      characterId: 'brute-char-id',
      // Missing targetHex
    };

    hostSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Invalid payload');
      done();
    });

    hostSocket.emit('move_character', invalidPayload);
  });

  it('should emit error for invalid hex coordinates', (done) => {
    const invalidHexPayload: MoveCharacterPayload = {
      characterId: 'brute-char-id',
      targetHex: { q: 'invalid' as any, r: 0 },
    };

    hostSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Invalid coordinates');
      done();
    });

    hostSocket.emit('move_character', invalidHexPayload);
  });

  it('should include movement path in character_moved event', (done) => {
    const movePayload: MoveCharacterPayload = {
      characterId: 'brute-char-id',
      targetHex: { q: 2, r: 0 }, // 2 hexes away
    };

    hostSocket.on('character_moved', (payload: CharacterMovedPayload) => {
      expect(payload.movementPath).toBeDefined();
      expect(Array.isArray(payload.movementPath)).toBe(true);

      // Path should include start and end hexes
      expect(payload.movementPath.length).toBeGreaterThanOrEqual(2);

      // Each coordinate in path should be valid
      payload.movementPath.forEach((coord: AxialCoordinates) => {
        expect(coord).toHaveProperty('q');
        expect(coord).toHaveProperty('r');
        expect(typeof coord.q).toBe('number');
        expect(typeof coord.r).toBe('number');
      });

      // Last hex in path should be the target
      const lastHex = payload.movementPath[payload.movementPath.length - 1];
      expect(lastHex).toEqual(movePayload.targetHex);

      done();
    });

    hostSocket.emit('move_character', movePayload);
  });

  it('should update character position in game state', (done) => {
    const movePayload: MoveCharacterPayload = {
      characterId: 'brute-char-id',
      targetHex: { q: 1, r: 0 },
    };

    hostSocket.on('character_moved', () => {
      // Request current game state or verify position in subsequent events
      // This test verifies the server persists the movement
      hostSocket.on('game_state_update', (payload: any) => {
        const brute = payload.state.characters.find((c: any) => c.id === 'brute-char-id');
        expect(brute.position).toEqual(movePayload.targetHex);
        done();
      });

      // Trigger a state update request (implementation-specific)
      hostSocket.emit('get_game_state');
    });

    hostSocket.emit('move_character', movePayload);
  });

  it('should validate movement respects character movement range', (done) => {
    // Characters have different movement ranges (e.g., Brute: 2, Scoundrel: 3)
    // This test verifies the server enforces character-specific movement limits

    const beyondRangePayload: MoveCharacterPayload = {
      characterId: 'brute-char-id',
      targetHex: { q: 5, r: 5 }, // Beyond Brute's movement range
    };

    hostSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('INVALID_MOVEMENT');
      expect(payload.message).toContain('range');
      done();
    });

    hostSocket.emit('move_character', beyondRangePayload);
  });
});
