/**
 * Contract Test: WebSocket start_game Event (US1 - T041)
 *
 * Tests the contract for start_game WebSocket event:
 * - Client (host) sends start_game with scenarioId
 * - Server validates all players have selected characters
 * - Server validates requester is host
 * - Server emits game_started to all clients
 * - Server loads scenario and initializes game state
 * - Server emits error for validation failures
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type {
  JoinRoomPayload,
  SelectCharacterPayload,
  StartGamePayload,
  GameStartedPayload,
  ErrorPayload,
} from '../../../shared/types/events';
import { CharacterClass } from '../../../shared/types/entities';

describe('WebSocket Contract: start_game event', () => {
  let hostSocket: ClientSocket;
  let client2Socket: ClientSocket;
  const testPort = 3001;
  const serverUrl = `http://localhost:${testPort}`;
  const testRoomCode = 'START1';

  beforeEach((done) => {
    hostSocket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
    });

    client2Socket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
    });

    hostSocket.connect();
    client2Socket.connect();

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        // Both clients join room
        const joinPayload1: JoinRoomPayload = {
          roomCode: testRoomCode,
          playerUUID: 'host-player',
          nickname: 'Host',
        };

        const joinPayload2: JoinRoomPayload = {
          roomCode: testRoomCode,
          playerUUID: 'player-2',
          nickname: 'Player 2',
        };

        let joinedCount = 0;
        const onJoin = () => {
          joinedCount++;
          if (joinedCount === 2) {
            done();
          }
        };

        hostSocket.on('room_joined', onJoin);
        client2Socket.on('room_joined', onJoin);

        hostSocket.emit('join_room', joinPayload1);
        client2Socket.emit('join_room', joinPayload2);
      }
    };

    hostSocket.on('connect', onConnect);
    client2Socket.on('connect', onConnect);
  });

  afterEach(() => {
    if (hostSocket.connected) {
      hostSocket.disconnect();
    }
    if (client2Socket.connected) {
      client2Socket.disconnect();
    }
  });

  it('should emit game_started to all players when host starts game', (done) => {
    // Both players select characters
    const hostCharacter: SelectCharacterPayload = {
      characterClass: CharacterClass.BRUTE,
    };

    const player2Character: SelectCharacterPayload = {
      characterClass: CharacterClass.TINKERER,
    };

    let selectCount = 0;
    const onSelect = () => {
      selectCount++;
      if (selectCount === 2) {
        // Both selected, now start game
        const startPayload: StartGamePayload = {
          scenarioId: 'scenario-001',
        };

        let receivedCount = 0;
        const onGameStarted = (payload: GameStartedPayload) => {
          // Verify payload structure
          expect(payload).toHaveProperty('scenarioId');
          expect(payload).toHaveProperty('scenarioName');
          expect(payload).toHaveProperty('mapLayout');
          expect(payload).toHaveProperty('monsters');
          expect(payload).toHaveProperty('characters');

          // Verify payload values
          expect(payload.scenarioId).toBe('scenario-001');
          expect(Array.isArray(payload.mapLayout)).toBe(true);
          expect(Array.isArray(payload.monsters)).toBe(true);
          expect(Array.isArray(payload.characters)).toBe(true);

          // Verify character data
          expect(payload.characters.length).toBe(2);
          const characterClasses = payload.characters.map((c: any) => c.characterClass);
          expect(characterClasses).toContain(CharacterClass.BRUTE);
          expect(characterClasses).toContain(CharacterClass.TINKERER);

          receivedCount++;
          if (receivedCount === 2) {
            done();
          }
        };

        hostSocket.on('game_started', onGameStarted);
        client2Socket.on('game_started', onGameStarted);

        hostSocket.emit('start_game', startPayload);
      }
    };

    hostSocket.on('character_selected', onSelect);
    client2Socket.on('character_selected', onSelect);

    hostSocket.emit('select_character', hostCharacter);
    client2Socket.emit('select_character', player2Character);
  });

  it('should emit error if non-host tries to start game', (done) => {
    // Select characters
    hostSocket.emit('select_character', { characterClass: CharacterClass.BRUTE });
    client2Socket.emit('select_character', { characterClass: CharacterClass.TINKERER });

    let selectCount = 0;
    const onSelect = () => {
      selectCount++;
      if (selectCount === 2) {
        // Player 2 (non-host) tries to start
        client2Socket.on('error', (payload: ErrorPayload) => {
          expect(payload.code).toBe('NOT_HOST');
          expect(payload.message).toContain('Only the host can start the game');
          done();
        });

        client2Socket.emit('start_game', { scenarioId: 'scenario-001' });
      }
    };

    hostSocket.on('character_selected', onSelect);
    client2Socket.on('character_selected', onSelect);
  });

  it('should emit error if not all players have selected characters', (done) => {
    // Only host selects character, player 2 doesn't
    hostSocket.on('character_selected', () => {
      // Try to start game without all players ready
      hostSocket.on('error', (payload: ErrorPayload) => {
        expect(payload.code).toBe('PLAYERS_NOT_READY');
        expect(payload.message).toContain('All players must select characters');
        done();
      });

      hostSocket.emit('start_game', { scenarioId: 'scenario-001' });
    });

    hostSocket.emit('select_character', { characterClass: CharacterClass.BRUTE });
  });

  it('should emit error for invalid scenario ID', (done) => {
    // Select characters
    hostSocket.emit('select_character', { characterClass: CharacterClass.BRUTE });
    client2Socket.emit('select_character', { characterClass: CharacterClass.TINKERER });

    let selectCount = 0;
    const onSelect = () => {
      selectCount++;
      if (selectCount === 2) {
        hostSocket.on('error', (payload: ErrorPayload) => {
          expect(payload.code).toBe('SCENARIO_NOT_FOUND');
          expect(payload.message).toContain('Scenario not found');
          done();
        });

        hostSocket.emit('start_game', { scenarioId: 'invalid-scenario' });
      }
    };

    hostSocket.on('character_selected', onSelect);
    client2Socket.on('character_selected', onSelect);
  });

  it('should emit error for missing scenario ID', (done) => {
    hostSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Scenario ID is required');
      done();
    });

    hostSocket.emit('start_game', {});
  });

  it('should emit error when trying to start before joining room', (done) => {
    const newSocket = io(serverUrl, { transports: ['websocket'] });

    newSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_IN_ROOM');
      expect(payload.message).toContain('must join a room first');
      newSocket.disconnect();
      done();
    });

    newSocket.emit('start_game', { scenarioId: 'scenario-001' });
  });

  it('should initialize hex map layout from scenario', (done) => {
    // Select characters
    hostSocket.emit('select_character', { characterClass: CharacterClass.BRUTE });
    client2Socket.emit('select_character', { characterClass: CharacterClass.TINKERER });

    let selectCount = 0;
    const onSelect = () => {
      selectCount++;
      if (selectCount === 2) {
        hostSocket.on('game_started', (payload: GameStartedPayload) => {
          // Verify map layout has hex tiles
          expect(payload.mapLayout.length).toBeGreaterThan(0);

          const firstTile = payload.mapLayout[0];
          expect(firstTile).toHaveProperty('coordinates');
          expect(firstTile.coordinates).toHaveProperty('q');
          expect(firstTile.coordinates).toHaveProperty('r');
          expect(firstTile).toHaveProperty('terrain');

          done();
        });

        hostSocket.emit('start_game', { scenarioId: 'scenario-001' });
      }
    };

    hostSocket.on('character_selected', onSelect);
    client2Socket.on('character_selected', onSelect);
  });

  it('should spawn monsters from scenario', (done) => {
    // Select characters
    hostSocket.emit('select_character', { characterClass: CharacterClass.BRUTE });
    client2Socket.emit('select_character', { characterClass: CharacterClass.TINKERER });

    let selectCount = 0;
    const onSelect = () => {
      selectCount++;
      if (selectCount === 2) {
        hostSocket.on('game_started', (payload: GameStartedPayload) => {
          // Verify monsters are spawned
          expect(payload.monsters.length).toBeGreaterThan(0);

          const firstMonster = payload.monsters[0];
          expect(firstMonster).toHaveProperty('id');
          expect(firstMonster).toHaveProperty('type');
          expect(firstMonster).toHaveProperty('position');
          expect(firstMonster).toHaveProperty('health');

          done();
        });

        hostSocket.emit('start_game', { scenarioId: 'scenario-001' });
      }
    };

    hostSocket.on('character_selected', onSelect);
    client2Socket.on('character_selected', onSelect);
  });

  it('should place characters at starting positions', (done) => {
    // Select characters
    hostSocket.emit('select_character', { characterClass: CharacterClass.BRUTE });
    client2Socket.emit('select_character', { characterClass: CharacterClass.TINKERER });

    let selectCount = 0;
    const onSelect = () => {
      selectCount++;
      if (selectCount === 2) {
        hostSocket.on('game_started', (payload: GameStartedPayload) => {
          // Verify characters have positions
          expect(payload.characters.length).toBe(2);

          payload.characters.forEach((character: any) => {
            expect(character).toHaveProperty('position');
            expect(character.position).toHaveProperty('q');
            expect(character.position).toHaveProperty('r');
            expect(character).toHaveProperty('characterClass');
          });

          done();
        });

        hostSocket.emit('start_game', { scenarioId: 'scenario-001' });
      }
    };

    hostSocket.on('character_selected', onSelect);
    client2Socket.on('character_selected', onSelect);
  });

  it('should emit error when game already started', (done) => {
    // Select characters and start game
    hostSocket.emit('select_character', { characterClass: CharacterClass.BRUTE });
    client2Socket.emit('select_character', { characterClass: CharacterClass.TINKERER });

    let selectCount = 0;
    const onSelect = () => {
      selectCount++;
      if (selectCount === 2) {
        hostSocket.on('game_started', () => {
          // Try to start again
          hostSocket.on('error', (payload: ErrorPayload) => {
            expect(payload.code).toBe('GAME_ALREADY_STARTED');
            expect(payload.message).toContain('Game has already started');
            done();
          });

          hostSocket.emit('start_game', { scenarioId: 'scenario-002' });
        });

        hostSocket.emit('start_game', { scenarioId: 'scenario-001' });
      }
    };

    hostSocket.on('character_selected', onSelect);
    client2Socket.on('character_selected', onSelect);
  });
});
