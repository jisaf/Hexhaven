/**
 * Contract Test: WebSocket select_character Event (US1 - T040)
 *
 * Tests the contract for select_character WebSocket event:
 * - Client sends select_character with characterClass
 * - Server validates character is not already selected by another player
 * - Server emits character_selected to client
 * - Server broadcasts character_selected to all clients in room
 * - Server emits error for invalid character or already selected
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type {
  JoinRoomPayload,
  SelectCharacterPayload,
  CharacterSelectedPayload,
  ErrorPayload,
} from '../../../shared/types/events';
import type { CharacterClass } from '../../../shared/types/entities';

describe('WebSocket Contract: select_character event', () => {
  let clientSocket: ClientSocket;
  let client2Socket: ClientSocket;
  const testPort = 3001;
  const serverUrl = `http://localhost:${testPort}`;
  const testRoomCode = 'CHAR01';

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
        // Both clients join the same room
        const joinPayload1: JoinRoomPayload = {
          roomCode: testRoomCode,
          playerUUID: 'player-1',
          nickname: 'Player 1',
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

        clientSocket.on('room_joined', onJoin);
        client2Socket.on('room_joined', onJoin);

        clientSocket.emit('join_room', joinPayload1);
        client2Socket.emit('join_room', joinPayload2);
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

  it('should emit character_selected when selecting valid character', (done) => {
    const selectPayload: SelectCharacterPayload = {
      characterClass: 'Brute',
    };

    clientSocket.on('character_selected', (payload: CharacterSelectedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('playerId');
      expect(payload).toHaveProperty('characterClass');

      // Verify payload values
      expect(payload.characterClass).toBe('Brute');
      expect(payload.playerId).toBe('player-1');

      done();
    });

    clientSocket.emit('select_character', selectPayload);
  });

  it('should broadcast character_selected to all players in room', (done) => {
    const selectPayload: SelectCharacterPayload = {
      characterClass: 'Tinkerer',
    };

    // Setup listener on client 2 for broadcast
    client2Socket.on('character_selected', (payload: CharacterSelectedPayload) => {
      expect(payload.characterClass).toBe('Tinkerer');
      expect(payload.playerId).toBe('player-1');
      done();
    });

    // Client 1 selects character
    clientSocket.emit('select_character', selectPayload);
  });

  it('should emit error when selecting already-selected character', (done) => {
    const brutePayload: SelectCharacterPayload = {
      characterClass: 'Brute',
    };

    // Client 1 selects Brute
    clientSocket.on('character_selected', () => {
      // Client 2 tries to select Brute (should fail)
      client2Socket.on('error', (payload: ErrorPayload) => {
        expect(payload.code).toBe('CHARACTER_ALREADY_SELECTED');
        expect(payload.message).toContain('already selected');
        expect(payload.message).toContain('Brute');
        done();
      });

      client2Socket.emit('select_character', brutePayload);
    });

    clientSocket.emit('select_character', brutePayload);
  });

  it('should emit error for invalid character class', (done) => {
    const invalidPayload = {
      characterClass: 'InvalidClass',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Invalid character class');
      done();
    });

    clientSocket.emit('select_character', invalidPayload);
  });

  it('should allow all 6 character classes to be selected', (done) => {
    const characters: CharacterClass[] = [
      'Brute',
      'Tinkerer',
      'Spellweaver',
      'Scoundrel',
      'Cragheart',
      'Mindthief',
    ];

    let selectedCount = 0;

    clientSocket.on('character_selected', (payload: CharacterSelectedPayload) => {
      expect(characters).toContain(payload.characterClass);
      selectedCount++;

      if (selectedCount === characters.length) {
        done();
      }
    });

    // Select all characters in sequence
    characters.forEach((char) => {
      clientSocket.emit('select_character', { characterClass: char });
    });
  });

  it('should allow changing character selection', (done) => {
    const firstSelection: SelectCharacterPayload = {
      characterClass: 'Brute',
    };

    const secondSelection: SelectCharacterPayload = {
      characterClass: 'Tinkerer',
    };

    let selectionCount = 0;

    clientSocket.on('character_selected', (payload: CharacterSelectedPayload) => {
      selectionCount++;

      if (selectionCount === 1) {
        // First selection confirmed, now change to Tinkerer
        expect(payload.characterClass).toBe('Brute');
        clientSocket.emit('select_character', secondSelection);
      } else if (selectionCount === 2) {
        // Second selection confirmed
        expect(payload.characterClass).toBe('Tinkerer');
        done();
      }
    });

    clientSocket.emit('select_character', firstSelection);
  });

  it('should emit error when selecting before joining room', (done) => {
    // Create new socket not in a room
    const newSocket = io(serverUrl, { transports: ['websocket'] });

    newSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('NOT_IN_ROOM');
      expect(payload.message).toContain('must join a room first');
      newSocket.disconnect();
      done();
    });

    newSocket.emit('select_character', { characterClass: 'Brute' });
  });

  it('should emit error for missing payload', (done) => {
    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Invalid payload');
      done();
    });

    clientSocket.emit('select_character', {});
  });

  it('should allow character reselection after another player deselects', (done) => {
    const brutePayload: SelectCharacterPayload = {
      characterClass: 'Brute',
    };

    const tinkererPayload: SelectCharacterPayload = {
      characterClass: 'Tinkerer',
    };

    let step = 0;

    clientSocket.on('character_selected', () => {
      if (step === 0) {
        step++;
        // Client 1 selected Brute, now client 1 changes to Tinkerer
        clientSocket.emit('select_character', tinkererPayload);
      } else if (step === 1) {
        step++;
        // Client 1 now has Tinkerer, client 2 can select Brute
        client2Socket.emit('select_character', brutePayload);
      }
    });

    client2Socket.on('character_selected', (payload: CharacterSelectedPayload) => {
      if (payload.playerId === 'player-2') {
        // Client 2 successfully selected Brute (which was freed up)
        expect(payload.characterClass).toBe('Brute');
        done();
      }
    });

    clientSocket.emit('select_character', brutePayload);
  });

  it('should maintain character selection when other players join', (done) => {
    const brutePayload: SelectCharacterPayload = {
      characterClass: 'Brute',
    };

    clientSocket.on('character_selected', () => {
      // Create new client that joins the room
      const client3Socket = io(serverUrl, { transports: ['websocket'] });

      client3Socket.on('room_joined', (roomPayload) => {
        // Verify existing player's character selection is in the room state
        const player1 = roomPayload.players.find((p: any) => p.id === 'player-1');
        expect(player1).toBeDefined();
        expect(player1.characterClass).toBe('Brute');

        client3Socket.disconnect();
        done();
      });

      const joinPayload: JoinRoomPayload = {
        roomCode: testRoomCode,
        playerUUID: 'player-3',
        nickname: 'Player 3',
      };

      client3Socket.emit('join_room', joinPayload);
    });

    clientSocket.emit('select_character', brutePayload);
  });
});
