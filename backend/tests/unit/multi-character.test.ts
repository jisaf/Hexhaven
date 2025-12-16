/**
 * Unit Test: Multi-Character Control Feature
 *
 * Tests multi-character functionality across Player and CharacterService:
 * - Player.addCharacter() limit enforcement (max 4)
 * - Player character management (add, remove, set active)
 * - CharacterService.getCharactersByPlayerId()
 * - CharacterService.addCharacterForPlayer() limit enforcement
 * - Turn order with multiple characters from same player
 * - Backward compatibility with single-character methods
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Player } from '../../src/models/player.model';
import { CharacterService } from '../../src/services/character.service';
import { TurnOrderService, TurnEntity } from '../../src/services/turn-order.service';
import { CharacterClass, ConnectionStatus } from '../../../shared/types/entities';
import { MAX_CHARACTERS_PER_PLAYER } from '../../../shared/constants/game';

// Alias for backward compatibility with existing tests
const SERVICE_MAX_CHARACTERS = MAX_CHARACTERS_PER_PLAYER;

describe('Multi-Character Control', () => {
  describe('Player Model - Multi-Character Support', () => {
    let player: Player;

    beforeEach(() => {
      player = Player.create('test-uuid', 'TestPlayer');
    });

    describe('addCharacter', () => {
      it('should add a character to an empty player', () => {
        player.addCharacter(CharacterClass.BRUTE);

        expect(player.characterClasses).toHaveLength(1);
        expect(player.characterClasses[0]).toBe(CharacterClass.BRUTE);
      });

      it('should add multiple characters up to the limit', () => {
        player.addCharacter(CharacterClass.BRUTE);
        player.addCharacter(CharacterClass.SPELLWEAVER);
        player.addCharacter(CharacterClass.TINKERER);

        expect(player.characterClasses).toHaveLength(3);
        expect(player.characterClasses).toContain(CharacterClass.BRUTE);
        expect(player.characterClasses).toContain(CharacterClass.SPELLWEAVER);
        expect(player.characterClasses).toContain(CharacterClass.TINKERER);
      });

      it('should add up to MAX_CHARACTERS_PER_PLAYER (4) characters', () => {
        player.addCharacter(CharacterClass.BRUTE);
        player.addCharacter(CharacterClass.SPELLWEAVER);
        player.addCharacter(CharacterClass.TINKERER);
        player.addCharacter(CharacterClass.SCOUNDREL);

        expect(player.characterClasses).toHaveLength(MAX_CHARACTERS_PER_PLAYER);
        expect(MAX_CHARACTERS_PER_PLAYER).toBe(4);
      });

      it('should throw error when exceeding MAX_CHARACTERS_PER_PLAYER limit', () => {
        // Add max characters
        player.addCharacter(CharacterClass.BRUTE);
        player.addCharacter(CharacterClass.SPELLWEAVER);
        player.addCharacter(CharacterClass.TINKERER);
        player.addCharacter(CharacterClass.SCOUNDREL);

        // Try to add one more
        expect(() => {
          player.addCharacter(CharacterClass.CRAGHEART);
        }).toThrow(`Cannot add more than ${MAX_CHARACTERS_PER_PLAYER} characters per player`);
      });

      it('should store persistent character ID when provided', () => {
        const persistentId = 'persistent-char-id-123';
        player.addCharacter(CharacterClass.BRUTE, persistentId);

        expect(player.characterIds).toHaveLength(1);
        expect(player.characterIds[0]).toBe(persistentId);
      });

      it('should store empty string for character ID when not provided', () => {
        player.addCharacter(CharacterClass.BRUTE);

        expect(player.characterIds).toHaveLength(1);
        expect(player.characterIds[0]).toBe('');
      });
    });

    describe('removeCharacter', () => {
      beforeEach(() => {
        player.addCharacter(CharacterClass.BRUTE, 'id-1');
        player.addCharacter(CharacterClass.SPELLWEAVER, 'id-2');
        player.addCharacter(CharacterClass.TINKERER, 'id-3');
      });

      it('should remove character at specified index', () => {
        player.removeCharacter(1); // Remove Spellweaver

        expect(player.characterClasses).toHaveLength(2);
        expect(player.characterClasses).toContain(CharacterClass.BRUTE);
        expect(player.characterClasses).toContain(CharacterClass.TINKERER);
        expect(player.characterClasses).not.toContain(CharacterClass.SPELLWEAVER);
      });

      it('should remove corresponding character ID', () => {
        player.removeCharacter(1);

        expect(player.characterIds).toHaveLength(2);
        expect(player.characterIds).toContain('id-1');
        expect(player.characterIds).toContain('id-3');
        expect(player.characterIds).not.toContain('id-2');
      });

      it('should remove first character correctly', () => {
        player.removeCharacter(0);

        expect(player.characterClasses).toHaveLength(2);
        expect(player.characterClasses[0]).toBe(CharacterClass.SPELLWEAVER);
        expect(player.characterClasses[1]).toBe(CharacterClass.TINKERER);
      });

      it('should remove last character correctly', () => {
        player.removeCharacter(2);

        expect(player.characterClasses).toHaveLength(2);
        expect(player.characterClasses[0]).toBe(CharacterClass.BRUTE);
        expect(player.characterClasses[1]).toBe(CharacterClass.SPELLWEAVER);
      });

      it('should throw error for invalid negative index', () => {
        expect(() => {
          player.removeCharacter(-1);
        }).toThrow('Invalid character index');
      });

      it('should throw error for index out of bounds', () => {
        expect(() => {
          player.removeCharacter(5);
        }).toThrow('Invalid character index');
      });

      it('should adjust activeCharacterIndex when removing before active', () => {
        player.setActiveCharacter(2); // Set Tinkerer as active
        player.removeCharacter(0); // Remove Brute

        // Active index should now point to what was index 2, now index 1
        expect(player.activeCharacterIndex).toBe(1);
      });

      it('should adjust activeCharacterIndex when removing active character', () => {
        player.setActiveCharacter(2); // Set Tinkerer as active
        player.removeCharacter(2); // Remove active character

        // Active index should be adjusted to valid range
        expect(player.activeCharacterIndex).toBeLessThan(player.characterClasses.length);
        expect(player.activeCharacterIndex).toBe(1);
      });

      it('should reset activeCharacterIndex to 0 when removing all characters', () => {
        player.removeCharacter(2);
        player.removeCharacter(1);
        player.removeCharacter(0);

        expect(player.characterClasses).toHaveLength(0);
        expect(player.activeCharacterIndex).toBe(0);
      });
    });

    describe('setActiveCharacter', () => {
      beforeEach(() => {
        player.addCharacter(CharacterClass.BRUTE);
        player.addCharacter(CharacterClass.SPELLWEAVER);
        player.addCharacter(CharacterClass.TINKERER);
      });

      it('should set active character to valid index', () => {
        player.setActiveCharacter(1);
        expect(player.activeCharacterIndex).toBe(1);
      });

      it('should default to index 0', () => {
        expect(player.activeCharacterIndex).toBe(0);
      });

      it('should throw error for negative index', () => {
        expect(() => {
          player.setActiveCharacter(-1);
        }).toThrow('Invalid character index');
      });

      it('should throw error for index out of bounds', () => {
        expect(() => {
          player.setActiveCharacter(5);
        }).toThrow('Invalid character index');
      });

      it('should throw error when no characters exist', () => {
        const emptyPlayer = Player.create('empty-uuid', 'EmptyPlayer');

        expect(() => {
          emptyPlayer.setActiveCharacter(0);
        }).toThrow('Invalid character index');
      });
    });

    describe('getActiveCharacter', () => {
      it('should return active character class and ID', () => {
        player.addCharacter(CharacterClass.BRUTE, 'id-brute');
        player.addCharacter(CharacterClass.SPELLWEAVER, 'id-spellweaver');
        player.setActiveCharacter(1);

        const active = player.getActiveCharacter();

        expect(active.characterClass).toBe(CharacterClass.SPELLWEAVER);
        expect(active.characterId).toBe('id-spellweaver');
      });

      it('should return null values when no characters exist', () => {
        const active = player.getActiveCharacter();

        expect(active.characterClass).toBeNull();
        expect(active.characterId).toBeNull();
      });

      it('should return first character by default', () => {
        player.addCharacter(CharacterClass.BRUTE, 'id-brute');
        player.addCharacter(CharacterClass.SPELLWEAVER, 'id-spellweaver');

        const active = player.getActiveCharacter();

        expect(active.characterClass).toBe(CharacterClass.BRUTE);
        expect(active.characterId).toBe('id-brute');
      });
    });

    describe('clearCharacters', () => {
      it('should remove all characters', () => {
        player.addCharacter(CharacterClass.BRUTE);
        player.addCharacter(CharacterClass.SPELLWEAVER);

        player.clearCharacters();

        expect(player.characterClasses).toHaveLength(0);
        expect(player.characterIds).toHaveLength(0);
      });

      it('should reset activeCharacterIndex to 0', () => {
        player.addCharacter(CharacterClass.BRUTE);
        player.addCharacter(CharacterClass.SPELLWEAVER);
        player.setActiveCharacter(1);

        player.clearCharacters();

        expect(player.activeCharacterIndex).toBe(0);
      });
    });

    describe('backward compatibility', () => {
      it('should return first character via characterClass getter', () => {
        player.addCharacter(CharacterClass.BRUTE);
        player.addCharacter(CharacterClass.SPELLWEAVER);

        expect(player.characterClass).toBe(CharacterClass.BRUTE);
      });

      it('should return null characterClass when no characters', () => {
        expect(player.characterClass).toBeNull();
      });

      it('should return first characterId via getter', () => {
        player.addCharacter(CharacterClass.BRUTE, 'id-1');
        player.addCharacter(CharacterClass.SPELLWEAVER, 'id-2');

        expect(player.characterId).toBe('id-1');
      });

      it('should clear all characters and add one via selectCharacter', () => {
        player.addCharacter(CharacterClass.BRUTE);
        player.addCharacter(CharacterClass.SPELLWEAVER);

        player.selectCharacter(CharacterClass.TINKERER);

        expect(player.characterClasses).toHaveLength(1);
        expect(player.characterClasses[0]).toBe(CharacterClass.TINKERER);
      });

      it('should return isReady when at least one character is selected', () => {
        expect(player.isReady).toBe(false);

        player.addCharacter(CharacterClass.BRUTE);

        expect(player.isReady).toBe(true);
      });
    });

    describe('toJSON serialization', () => {
      it('should include all multi-character fields', () => {
        player.addCharacter(CharacterClass.BRUTE, 'id-1');
        player.addCharacter(CharacterClass.SPELLWEAVER, 'id-2');
        player.setActiveCharacter(1);

        const json = player.toJSON();

        expect(json.characterClasses).toEqual([CharacterClass.BRUTE, CharacterClass.SPELLWEAVER]);
        expect(json.characterIds).toEqual(['id-1', 'id-2']);
        expect(json.activeCharacterIndex).toBe(1);
      });
    });
  });

  describe('CharacterService - Multi-Character Support', () => {
    let characterService: CharacterService;
    const playerId = 'player-123';
    const startingPosition = { q: 0, r: 0 };

    beforeEach(() => {
      characterService = new CharacterService();
    });

    afterEach(() => {
      characterService.clearAllCharacters();
    });

    describe('addCharacterForPlayer', () => {
      it('should add a character for a player', () => {
        const character = characterService.addCharacterForPlayer(
          playerId,
          CharacterClass.BRUTE,
          startingPosition,
        );

        expect(character).toBeDefined();
        expect(character.characterClass).toBe(CharacterClass.BRUTE);
        expect(character.playerId).toBe(playerId);
      });

      it('should add multiple characters up to the limit', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SPELLWEAVER, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.TINKERER, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SCOUNDREL, startingPosition);

        const characters = characterService.getCharactersByPlayerId(playerId);
        expect(characters).toHaveLength(SERVICE_MAX_CHARACTERS);
      });

      it('should throw error when exceeding limit', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SPELLWEAVER, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.TINKERER, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SCOUNDREL, startingPosition);

        expect(() => {
          characterService.addCharacterForPlayer(playerId, CharacterClass.CRAGHEART, startingPosition);
        }).toThrow(`Player cannot have more than ${SERVICE_MAX_CHARACTERS} characters`);
      });

      it('should allow different players to have MAX_CHARACTERS_PER_PLAYER each', () => {
        const player1Id = 'player-1';
        const player2Id = 'player-2';

        // Player 1 adds max characters
        characterService.addCharacterForPlayer(player1Id, CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer(player1Id, CharacterClass.SPELLWEAVER, startingPosition);
        characterService.addCharacterForPlayer(player1Id, CharacterClass.TINKERER, startingPosition);
        characterService.addCharacterForPlayer(player1Id, CharacterClass.SCOUNDREL, startingPosition);

        // Player 2 should also be able to add max characters
        characterService.addCharacterForPlayer(player2Id, CharacterClass.CRAGHEART, startingPosition);
        characterService.addCharacterForPlayer(player2Id, CharacterClass.MINDTHIEF, startingPosition);

        expect(characterService.getCharactersByPlayerId(player1Id)).toHaveLength(4);
        expect(characterService.getCharactersByPlayerId(player2Id)).toHaveLength(2);
      });
    });

    describe('getCharactersByPlayerId', () => {
      it('should return all characters for a player', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SPELLWEAVER, startingPosition);

        const characters = characterService.getCharactersByPlayerId(playerId);

        expect(characters).toHaveLength(2);
        expect(characters.map((c) => c.characterClass)).toContain(CharacterClass.BRUTE);
        expect(characters.map((c) => c.characterClass)).toContain(CharacterClass.SPELLWEAVER);
      });

      it('should return empty array for player with no characters', () => {
        const characters = characterService.getCharactersByPlayerId('non-existent-player');
        expect(characters).toHaveLength(0);
      });

      it('should not return characters from other players', () => {
        characterService.addCharacterForPlayer('player-1', CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer('player-2', CharacterClass.SPELLWEAVER, startingPosition);

        const player1Characters = characterService.getCharactersByPlayerId('player-1');

        expect(player1Characters).toHaveLength(1);
        expect(player1Characters[0].characterClass).toBe(CharacterClass.BRUTE);
      });
    });

    describe('getActiveCharacter', () => {
      it('should return character at specified index', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SPELLWEAVER, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.TINKERER, startingPosition);

        const activeChar = characterService.getActiveCharacter(playerId, 1);

        expect(activeChar).toBeDefined();
        expect(activeChar?.characterClass).toBe(CharacterClass.SPELLWEAVER);
      });

      it('should return null for invalid index', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);

        expect(characterService.getActiveCharacter(playerId, 5)).toBeNull();
        expect(characterService.getActiveCharacter(playerId, -1)).toBeNull();
      });

      it('should return null for player with no characters', () => {
        expect(characterService.getActiveCharacter('non-existent', 0)).toBeNull();
      });
    });

    describe('removeCharacterForPlayer', () => {
      it('should remove specific character by ID', () => {
        const char1 = characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);
        const char2 = characterService.addCharacterForPlayer(playerId, CharacterClass.SPELLWEAVER, startingPosition);

        const removed = characterService.removeCharacterForPlayer(playerId, char1.id);

        expect(removed).toBe(true);
        expect(characterService.getCharactersByPlayerId(playerId)).toHaveLength(1);
        expect(characterService.getCharacterById(char1.id)).toBeNull();
        expect(characterService.getCharacterById(char2.id)).toBeDefined();
      });

      it('should return false for non-existent character', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);

        const removed = characterService.removeCharacterForPlayer(playerId, 'non-existent-id');

        expect(removed).toBe(false);
      });

      it('should return false for wrong player', () => {
        const char = characterService.addCharacterForPlayer('player-1', CharacterClass.BRUTE, startingPosition);

        const removed = characterService.removeCharacterForPlayer('player-2', char.id);

        expect(removed).toBe(false);
        expect(characterService.getCharacterById(char.id)).toBeDefined();
      });

      it('should clean up playerCharacters map when all characters removed', () => {
        const char = characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);

        characterService.removeCharacterForPlayer(playerId, char.id);

        expect(characterService.hasCharacter(playerId)).toBe(false);
      });
    });

    describe('removeAllCharactersForPlayer', () => {
      it('should remove all characters for a player', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SPELLWEAVER, startingPosition);

        const removed = characterService.removeAllCharactersForPlayer(playerId);

        expect(removed).toBe(true);
        expect(characterService.getCharactersByPlayerId(playerId)).toHaveLength(0);
      });

      it('should not affect other players characters', () => {
        characterService.addCharacterForPlayer('player-1', CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer('player-2', CharacterClass.SPELLWEAVER, startingPosition);

        characterService.removeAllCharactersForPlayer('player-1');

        expect(characterService.getCharactersByPlayerId('player-1')).toHaveLength(0);
        expect(characterService.getCharactersByPlayerId('player-2')).toHaveLength(1);
      });
    });

    describe('backward compatibility', () => {
      it('should replace all characters via selectCharacter', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SPELLWEAVER, startingPosition);

        characterService.selectCharacter(playerId, CharacterClass.TINKERER, startingPosition);

        const characters = characterService.getCharactersByPlayerId(playerId);
        expect(characters).toHaveLength(1);
        expect(characters[0].characterClass).toBe(CharacterClass.TINKERER);
      });

      it('should return first character via getCharacterByPlayerId', () => {
        characterService.addCharacterForPlayer(playerId, CharacterClass.BRUTE, startingPosition);
        characterService.addCharacterForPlayer(playerId, CharacterClass.SPELLWEAVER, startingPosition);

        const character = characterService.getCharacterByPlayerId(playerId);

        expect(character).toBeDefined();
        expect(character?.characterClass).toBe(CharacterClass.BRUTE);
      });
    });
  });

  describe('Turn Order with Multi-Character Support', () => {
    let turnOrderService: TurnOrderService;
    let characterService: CharacterService;

    beforeEach(() => {
      turnOrderService = new TurnOrderService();
      characterService = new CharacterService();
    });

    afterEach(() => {
      characterService.clearAllCharacters();
    });

    it('should include all characters from same player in turn order', () => {
      // Player 1 has two characters
      const entities: TurnEntity[] = [
        {
          entityId: 'char-p1-1',
          entityType: 'character',
          initiative: 30,
          name: 'Brute (P1)',
          characterClass: CharacterClass.BRUTE,
        },
        {
          entityId: 'char-p1-2',
          entityType: 'character',
          initiative: 60,
          name: 'Spellweaver (P1)',
          characterClass: CharacterClass.SPELLWEAVER,
        },
        // Player 2 has one character
        {
          entityId: 'char-p2-1',
          entityType: 'character',
          initiative: 45,
          name: 'Tinkerer (P2)',
          characterClass: CharacterClass.TINKERER,
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      expect(turnOrder).toHaveLength(3);
      expect(turnOrder[0].entityId).toBe('char-p1-1'); // Brute first (30)
      expect(turnOrder[1].entityId).toBe('char-p2-1'); // Tinkerer second (45)
      expect(turnOrder[2].entityId).toBe('char-p1-2'); // Spellweaver last (60)
    });

    it('should interleave characters from different players based on initiative', () => {
      const entities: TurnEntity[] = [
        {
          entityId: 'p1-brute',
          entityType: 'character',
          initiative: 20,
          name: 'Brute (P1)',
          characterClass: CharacterClass.BRUTE,
        },
        {
          entityId: 'p1-scoundrel',
          entityType: 'character',
          initiative: 50,
          name: 'Scoundrel (P1)',
          characterClass: CharacterClass.SCOUNDREL,
        },
        {
          entityId: 'p2-tinkerer',
          entityType: 'character',
          initiative: 35,
          name: 'Tinkerer (P2)',
          characterClass: CharacterClass.TINKERER,
        },
        {
          entityId: 'monster-guard',
          entityType: 'monster',
          initiative: 40,
          name: 'Bandit Guard',
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      expect(turnOrder[0].entityId).toBe('p1-brute'); // 20
      expect(turnOrder[1].entityId).toBe('p2-tinkerer'); // 35
      expect(turnOrder[2].entityId).toBe('monster-guard'); // 40
      expect(turnOrder[3].entityId).toBe('p1-scoundrel'); // 50
    });

    it('should break ties between same-player characters by class order', () => {
      const entities: TurnEntity[] = [
        {
          entityId: 'p1-mindthief',
          entityType: 'character',
          initiative: 50,
          name: 'Mindthief (P1)',
          characterClass: CharacterClass.MINDTHIEF, // Last in class order
        },
        {
          entityId: 'p1-brute',
          entityType: 'character',
          initiative: 50,
          name: 'Brute (P1)',
          characterClass: CharacterClass.BRUTE, // First in class order
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      expect(turnOrder[0].characterClass).toBe(CharacterClass.BRUTE);
      expect(turnOrder[1].characterClass).toBe(CharacterClass.MINDTHIEF);
    });

    it('should handle 4 characters from same player with 1 from another', () => {
      // Player 1: max 4 characters
      const entities: TurnEntity[] = [
        {
          entityId: 'p1-brute',
          entityType: 'character',
          initiative: 25,
          name: 'Brute (P1)',
          characterClass: CharacterClass.BRUTE,
        },
        {
          entityId: 'p1-spellweaver',
          entityType: 'character',
          initiative: 15,
          name: 'Spellweaver (P1)',
          characterClass: CharacterClass.SPELLWEAVER,
        },
        {
          entityId: 'p1-scoundrel',
          entityType: 'character',
          initiative: 45,
          name: 'Scoundrel (P1)',
          characterClass: CharacterClass.SCOUNDREL,
        },
        {
          entityId: 'p1-cragheart',
          entityType: 'character',
          initiative: 35,
          name: 'Cragheart (P1)',
          characterClass: CharacterClass.CRAGHEART,
        },
        // Player 2: 1 character
        {
          entityId: 'p2-tinkerer',
          entityType: 'character',
          initiative: 30,
          name: 'Tinkerer (P2)',
          characterClass: CharacterClass.TINKERER,
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      expect(turnOrder).toHaveLength(5);
      expect(turnOrder[0].initiative).toBe(15); // Spellweaver
      expect(turnOrder[1].initiative).toBe(25); // Brute
      expect(turnOrder[2].initiative).toBe(30); // Tinkerer (P2)
      expect(turnOrder[3].initiative).toBe(35); // Cragheart
      expect(turnOrder[4].initiative).toBe(45); // Scoundrel
    });

    it('should handle updateTurnOrder with multiple characters per player', () => {
      const previousTurnOrder: TurnEntity[] = [
        {
          entityId: 'p1-brute',
          entityType: 'character',
          initiative: 30,
          name: 'Brute',
          characterClass: CharacterClass.BRUTE,
        },
        {
          entityId: 'p1-spellweaver',
          entityType: 'character',
          initiative: 50,
          name: 'Spellweaver',
          characterClass: CharacterClass.SPELLWEAVER,
        },
      ];

      // New round: both characters selected new cards
      const newCardSelections = [
        { playerId: 'p1-brute', initiative: 60 }, // Brute selected slower cards
        { playerId: 'p1-spellweaver', initiative: 20 }, // Spellweaver selected faster cards
      ];

      const newTurnOrder = turnOrderService.updateTurnOrder(
        previousTurnOrder,
        newCardSelections,
      );

      // Order should be reversed based on new initiatives
      expect(newTurnOrder[0].entityId).toBe('p1-spellweaver'); // 20
      expect(newTurnOrder[1].entityId).toBe('p1-brute'); // 60
    });
  });

  describe('Integration: Player + CharacterService Multi-Character Flow', () => {
    let characterService: CharacterService;
    let player: Player;

    beforeEach(() => {
      characterService = new CharacterService();
      player = Player.create('player-uuid', 'TestPlayer');
    });

    afterEach(() => {
      characterService.clearAllCharacters();
    });

    it('should track characters in both Player model and CharacterService', () => {
      const startingPosition = { q: 0, r: 0 };

      // Add characters through CharacterService
      const char1 = characterService.addCharacterForPlayer(
        player.id,
        CharacterClass.BRUTE,
        startingPosition,
      );
      const char2 = characterService.addCharacterForPlayer(
        player.id,
        CharacterClass.SPELLWEAVER,
        startingPosition,
      );

      // Track in Player model
      player.addCharacter(CharacterClass.BRUTE, char1.id);
      player.addCharacter(CharacterClass.SPELLWEAVER, char2.id);

      // Both should be in sync
      expect(player.characterClasses).toHaveLength(2);
      expect(characterService.getCharactersByPlayerId(player.id)).toHaveLength(2);

      expect(player.characterIds).toContain(char1.id);
      expect(player.characterIds).toContain(char2.id);
    });

    it('should switch active character and get correct game state', () => {
      const startingPosition = { q: 0, r: 0 };

      const char1 = characterService.addCharacterForPlayer(
        player.id,
        CharacterClass.BRUTE,
        startingPosition,
      );
      const char2 = characterService.addCharacterForPlayer(
        player.id,
        CharacterClass.SPELLWEAVER,
        startingPosition,
      );

      player.addCharacter(CharacterClass.BRUTE, char1.id);
      player.addCharacter(CharacterClass.SPELLWEAVER, char2.id);

      // Initially active is first character
      const active1 = characterService.getActiveCharacter(player.id, player.activeCharacterIndex);
      expect(active1?.characterClass).toBe(CharacterClass.BRUTE);

      // Switch to second character
      player.setActiveCharacter(1);
      const active2 = characterService.getActiveCharacter(player.id, player.activeCharacterIndex);
      expect(active2?.characterClass).toBe(CharacterClass.SPELLWEAVER);
    });

    it('should enforce limit consistently between Player model and CharacterService', () => {
      const startingPosition = { q: 0, r: 0 };

      // Both limits should match
      expect(MAX_CHARACTERS_PER_PLAYER).toBe(SERVICE_MAX_CHARACTERS);
      expect(MAX_CHARACTERS_PER_PLAYER).toBe(4);

      // Add max characters through service
      for (let i = 0; i < MAX_CHARACTERS_PER_PLAYER; i++) {
        characterService.addCharacterForPlayer(
          player.id,
          Object.values(CharacterClass)[i] as CharacterClass,
          startingPosition,
        );
      }

      // Should not be able to add more
      expect(() => {
        characterService.addCharacterForPlayer(
          player.id,
          CharacterClass.MINDTHIEF,
          startingPosition,
        );
      }).toThrow();
    });
  });
});
