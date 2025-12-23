/**
 * Unit Test: Player Service (US1 - T044)
 *
 * Tests player validation and management:
 * - Nickname uniqueness within room
 * - Nickname length validation (1-20 characters)
 * - Player creation
 * - Player state management
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PlayerService } from '../../src/services/player.service';
import { Player } from '../../src/models/player.model';
import { CharacterClass, ConnectionStatus } from '../../../shared/types/entities';

describe('PlayerService', () => {
  let playerService: PlayerService;

  beforeEach(() => {
    playerService = new PlayerService();
  });

  afterEach(() => {
    playerService.clearAllPlayers();
  });

  describe('validateNickname', () => {
    it('should accept valid nicknames (1-20 characters)', () => {
      const validNicknames = [
        'A',
        'Player',
        'Player123',
        'The_Best_Player_20',
        'αβγδε', // Unicode support
      ];

      validNicknames.forEach((nickname) => {
        const result = playerService.validateNickname(nickname, []);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty nicknames', () => {
      const result = playerService.validateNickname('', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nickname cannot be empty');
    });

    it('should reject nicknames longer than 20 characters', () => {
      const tooLong = 'ThisNicknameIsWayTooLongAndExceedsTwentyCharacters';

      const result = playerService.validateNickname(tooLong, []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nickname must be between 1 and 20 characters');
    });

    it('should reject duplicate nicknames in same room', () => {
      const existingPlayer = Player.create('uuid1', 'Player1');
      const existingPlayers = [existingPlayer];

      const result = playerService.validateNickname('Player1', existingPlayers);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nickname already taken in this room');
    });

    it('should allow same nickname in different rooms', () => {
      // Room 1 - Player1 exists
      const room1Player = Player.create('uuid1', 'Player1');
      const room1Players = [room1Player];

      // Verify Player1 is taken in room 1
      const result1 = playerService.validateNickname('Player1', room1Players);
      expect(result1.valid).toBe(false);

      // Room 2 - different set of players (empty)
      const room2Players: Player[] = [];

      // Player1 should be available in room 2
      const result2 = playerService.validateNickname('Player1', room2Players);
      expect(result2.valid).toBe(true);
    });

    it('should trim whitespace from nicknames', () => {
      const nicknameWithSpaces = '  Player1  ';

      const result = playerService.validateNickname(nicknameWithSpaces, []);
      expect(result.valid).toBe(true);
    });

    it('should reject nicknames with only whitespace', () => {
      const result = playerService.validateNickname('   ', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nickname cannot be empty');
    });

    it('should be case-insensitive for duplicate check', () => {
      const existingPlayer = Player.create('uuid1', 'Player1');
      const existingPlayers = [existingPlayer];

      const result1 = playerService.validateNickname('PLAYER1', existingPlayers);
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Nickname already taken in this room');

      const result2 = playerService.validateNickname('player1', existingPlayers);
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Nickname already taken in this room');
    });
  });

  describe('createPlayer', () => {
    it('should create player with UUID and nickname', () => {
      const player = playerService.createPlayer('player-uuid-123', 'TestPlayer');

      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('userId');
      expect(player).toHaveProperty('nickname');
      expect(player).toHaveProperty('isHost');
      expect(player).toHaveProperty('characterClass');
      expect(player).toHaveProperty('isReady');

      expect(player.userId).toBe('player-uuid-123');
      expect(player.nickname).toBe('TestPlayer');
      expect(player.isHost).toBe(false);
      expect(player.characterClass).toBeNull();
      expect(player.isReady).toBe(false);
      expect(player.connectionStatus).toBe(ConnectionStatus.CONNECTED);
    });

    it('should throw error for duplicate UUID', () => {
      playerService.createPlayer('uuid1', 'Player1');

      expect(() => {
        playerService.createPlayer('uuid1', 'DifferentName');
      }).toThrow('Player with this user ID already exists');
    });

    it('should generate unique player ID', () => {
      const player1 = playerService.createPlayer('uuid1', 'P1');
      const player2 = playerService.createPlayer('uuid2', 'P2');

      expect(player1.id).not.toBe(player2.id);
    });

    it('should initialize player with null character', () => {
      const player = playerService.createPlayer('uuid', 'Player');
      expect(player.characterClass).toBeNull();
    });

    it('should trim nickname whitespace', () => {
      const player = playerService.createPlayer('uuid', '  Player  ');
      expect(player.nickname).toBe('Player');
    });

    it('should throw error for empty nickname', () => {
      expect(() => {
        playerService.createPlayer('uuid', '');
      }).toThrow('Nickname cannot be empty');
    });

    it('should throw error for nickname longer than 20 characters', () => {
      const longNickname = 'ThisIsAVeryLongNicknameExceeding20Chars';

      expect(() => {
        playerService.createPlayer('uuid', longNickname);
      }).toThrow('Nickname must be between 1 and 20 characters');
    });
  });

  describe('getPlayerByUuid', () => {
    it('should return player by UUID', () => {
      const created = playerService.createPlayer('uuid123', 'Player');
      const retrieved = playerService.getPlayerByUuid('uuid123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe('uuid123');
      expect(retrieved?.nickname).toBe('Player');
    });

    it('should return null for non-existent UUID', () => {
      const player = playerService.getPlayerByUuid('non-existent');
      expect(player).toBeNull();
    });
  });

  describe('getPlayerById', () => {
    it('should return player by ID', () => {
      const created = playerService.createPlayer('uuid', 'Player');
      const retrieved = playerService.getPlayerById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.userId).toBe('uuid');
    });

    it('should return null for non-existent ID', () => {
      const player = playerService.getPlayerById('non-existent-id');
      expect(player).toBeNull();
    });
  });

  describe('getOrCreatePlayer', () => {
    it('should return existing player if UUID exists', () => {
      const created = playerService.createPlayer('uuid1', 'OriginalName');

      // Try to get or create with same UUID but different nickname
      const retrieved = playerService.getOrCreatePlayer('uuid1', 'NewName');

      expect(retrieved.userId).toBe('uuid1');
      expect(retrieved.nickname).toBe('OriginalName'); // Should keep original
      expect(retrieved.id).toBe(created.id);
    });

    it('should create new player if UUID does not exist', () => {
      const player = playerService.getOrCreatePlayer('new-uuid', 'NewPlayer');

      expect(player.userId).toBe('new-uuid');
      expect(player.nickname).toBe('NewPlayer');
    });
  });

  describe('updateConnectionStatus', () => {
    it('should mark player as disconnected', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      const updated = playerService.updateConnectionStatus(
        'uuid',
        ConnectionStatus.DISCONNECTED,
      );

      expect(updated.connectionStatus).toBe(ConnectionStatus.DISCONNECTED);
    });

    it('should mark player as reconnecting', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      playerService.updateConnectionStatus('uuid', ConnectionStatus.DISCONNECTED);
      const updated = playerService.updateConnectionStatus(
        'uuid',
        ConnectionStatus.RECONNECTING,
      );

      expect(updated.connectionStatus).toBe(ConnectionStatus.RECONNECTING);
    });

    it('should mark player as connected', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      playerService.updateConnectionStatus('uuid', ConnectionStatus.DISCONNECTED);
      const updated = playerService.updateConnectionStatus(
        'uuid',
        ConnectionStatus.CONNECTED,
      );

      expect(updated.connectionStatus).toBe(ConnectionStatus.CONNECTED);
    });

    it('should throw error for non-existent player', () => {
      expect(() => {
        playerService.updateConnectionStatus('non-existent', ConnectionStatus.DISCONNECTED);
      }).toThrow('Player not found');
    });

    it('should update lastSeenAt timestamp', () => {
      const player = playerService.createPlayer('uuid', 'Player');
      const originalLastSeen = player.lastSeenAt.getTime();

      // Update connection status
      const updated = playerService.updateConnectionStatus(
        'uuid',
        ConnectionStatus.DISCONNECTED,
      );

      // LastSeenAt should be >= original (may be equal if very fast)
      expect(updated.lastSeenAt.getTime()).toBeGreaterThanOrEqual(originalLastSeen);
    });
  });

  describe('updateNickname', () => {
    it('should update player nickname', () => {
      const player = playerService.createPlayer('uuid', 'OldName');

      const updated = playerService.updateNickname('uuid', 'NewName');

      expect(updated.nickname).toBe('NewName');
    });

    it('should trim whitespace from new nickname', () => {
      const player = playerService.createPlayer('uuid', 'OldName');

      const updated = playerService.updateNickname('uuid', '  NewName  ');

      expect(updated.nickname).toBe('NewName');
    });

    it('should throw error for empty nickname', () => {
      const player = playerService.createPlayer('uuid', 'OldName');

      expect(() => {
        playerService.updateNickname('uuid', '');
      }).toThrow('Nickname cannot be empty');
    });

    it('should throw error for nickname longer than 20 characters', () => {
      const player = playerService.createPlayer('uuid', 'OldName');
      const longNickname = 'ThisIsAVeryLongNicknameExceeding20Chars';

      expect(() => {
        playerService.updateNickname('uuid', longNickname);
      }).toThrow('Nickname must be between 1 and 20 characters');
    });

    it('should throw error for non-existent player', () => {
      expect(() => {
        playerService.updateNickname('non-existent', 'NewName');
      }).toThrow('Player not found');
    });
  });

  describe('removePlayer', () => {
    it('should remove player from registry', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      const removed = playerService.removePlayer('uuid');
      expect(removed).toBe(true);

      const retrieved = playerService.getPlayerByUuid('uuid');
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent player', () => {
      const removed = playerService.removePlayer('non-existent');
      expect(removed).toBe(false);
    });

    it('should remove player from both UUID and ID indexes', () => {
      const player = playerService.createPlayer('uuid', 'Player');
      const playerId = player.id;

      playerService.removePlayer('uuid');

      expect(playerService.getPlayerByUuid('uuid')).toBeNull();
      expect(playerService.getPlayerById(playerId)).toBeNull();
    });
  });

  describe('getAllPlayers', () => {
    it('should return all players', () => {
      playerService.createPlayer('uuid1', 'Player1');
      playerService.createPlayer('uuid2', 'Player2');
      playerService.createPlayer('uuid3', 'Player3');

      const players = playerService.getAllPlayers();
      expect(players).toHaveLength(3);
    });

    it('should return empty array when no players exist', () => {
      const players = playerService.getAllPlayers();
      expect(players).toHaveLength(0);
    });
  });

  describe('clearAllPlayers', () => {
    it('should remove all players', () => {
      playerService.createPlayer('uuid1', 'Player1');
      playerService.createPlayer('uuid2', 'Player2');

      playerService.clearAllPlayers();

      const players = playerService.getAllPlayers();
      expect(players).toHaveLength(0);
    });
  });

  describe('getPlayerCount', () => {
    it('should return correct player count', () => {
      expect(playerService.getPlayerCount()).toBe(0);

      playerService.createPlayer('uuid1', 'Player1');
      expect(playerService.getPlayerCount()).toBe(1);

      playerService.createPlayer('uuid2', 'Player2');
      expect(playerService.getPlayerCount()).toBe(2);

      playerService.removePlayer('uuid1');
      expect(playerService.getPlayerCount()).toBe(1);
    });
  });

  describe('Player Model Integration', () => {
    it('should allow player to select character', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      player.selectCharacter(CharacterClass.BRUTE);

      expect(player.characterClass).toBe(CharacterClass.BRUTE);
      expect(player.isReady).toBe(true);
    });

    it('should allow player to clear character selection', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      player.selectCharacter(CharacterClass.BRUTE);
      player.clearCharacters();

      expect(player.characterClass).toBeNull();
      expect(player.isReady).toBe(false);
    });

    it('should allow player to change character selection', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      player.selectCharacter(CharacterClass.BRUTE);
      expect(player.characterClass).toBe(CharacterClass.BRUTE);

      player.selectCharacter(CharacterClass.SPELLWEAVER);
      expect(player.characterClass).toBe(CharacterClass.SPELLWEAVER);
    });

    it('should track player room membership', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      expect(player.roomId).toBeNull();
      expect(player.isHost).toBe(false);

      player.joinRoom('room123', true);

      expect(player.roomId).toBe('room123');
      expect(player.isHost).toBe(true);
    });

    it('should clear player state when leaving room', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      player.joinRoom('room123', true);
      player.selectCharacter(CharacterClass.TINKERER);

      player.leaveRoom();

      expect(player.roomId).toBeNull();
      expect(player.isHost).toBe(false);
      expect(player.characterClass).toBeNull();
      expect(player.isReady).toBe(false);
    });

    it('should promote player to host', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      player.joinRoom('room123', false);
      expect(player.isHost).toBe(false);

      player.promoteToHost();
      expect(player.isHost).toBe(true);
    });

    it('should throw error when promoting player not in room', () => {
      const player = playerService.createPlayer('uuid', 'Player');

      expect(() => {
        player.promoteToHost();
      }).toThrow('Player must be in a room to be promoted to host');
    });
  });
});
