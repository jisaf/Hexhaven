/**
 * Unit Test: Turn Order Service (US2 - T080)
 *
 * Tests initiative calculation and turn order determination:
 * - Initiative from selected cards (lower goes first)
 * - Turn order includes both players and monsters
 * - Ties broken by character class order
 * - Long rest has initiative 99
 * - Turn order updates each round after card selection
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TurnOrderService, TurnEntity } from '../../src/services/turn-order.service';
import { CharacterClass } from '../../../shared/types/entities';

describe('TurnOrderService', () => {
  let turnOrderService: TurnOrderService;

  beforeEach(() => {
    turnOrderService = new TurnOrderService();
  });

  describe('calculateInitiative', () => {
    it('should use lower initiative from two selected cards', () => {
      const topCardInitiative = 45;
      const bottomCardInitiative = 23;

      const initiative = turnOrderService.calculateInitiative(
        topCardInitiative,
        bottomCardInitiative,
      );

      expect(initiative).toBe(23); // Lower value goes first
    });

    it('should use lower initiative when top card is lower', () => {
      const topCardInitiative = 15;
      const bottomCardInitiative = 67;

      const initiative = turnOrderService.calculateInitiative(
        topCardInitiative,
        bottomCardInitiative,
      );

      expect(initiative).toBe(15);
    });

    it('should return 99 for long rest action', () => {
      const initiative = turnOrderService.calculateInitiative(99, 99);
      expect(initiative).toBe(99);
    });

    it('should handle identical card initiatives', () => {
      const initiative = turnOrderService.calculateInitiative(50, 50);
      expect(initiative).toBe(50);
    });

    it('should use first card if only one provided', () => {
      // For long rest or single card scenarios, bottomCard is null
      const initiative = turnOrderService.calculateInitiative(67, null);
      expect(initiative).toBe(67);
    });

    it('should handle very low initiative values', () => {
      const initiative = turnOrderService.calculateInitiative(5, 10);
      expect(initiative).toBe(5);
    });

    it('should handle very high initiative values', () => {
      const initiative = turnOrderService.calculateInitiative(95, 88);
      expect(initiative).toBe(88);
    });
  });

  describe('determineTurnOrder', () => {
    it('should sort entities by initiative (lowest first)', () => {
      const entities: TurnEntity[] = [
        {
          entityId: 'player1',
          entityType: 'character',
          initiative: 50,
          name: 'Brute',
        },
        {
          entityId: 'monster1',
          entityType: 'monster',
          initiative: 25,
          name: 'Bandit Guard',
        },
        {
          entityId: 'player2',
          entityType: 'character',
          initiative: 75,
          name: 'Tinkerer',
        },
        {
          entityId: 'monster2',
          entityType: 'monster',
          initiative: 40,
          name: 'Living Bones',
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      expect(turnOrder).toHaveLength(4);
      expect(turnOrder[0].initiative).toBe(25); // Monster goes first
      expect(turnOrder[0].entityId).toBe('monster1');
      expect(turnOrder[1].initiative).toBe(40);
      expect(turnOrder[1].entityId).toBe('monster2');
      expect(turnOrder[2].initiative).toBe(50);
      expect(turnOrder[2].entityId).toBe('player1');
      expect(turnOrder[3].initiative).toBe(75); // Tinkerer goes last
      expect(turnOrder[3].entityId).toBe('player2');
    });

    it('should include both players and monsters in turn order', () => {
      const entities: TurnEntity[] = [
        {
          entityId: 'player1',
          entityType: 'character',
          initiative: 30,
          name: 'Brute',
        },
        {
          entityId: 'monster1',
          entityType: 'monster',
          initiative: 20,
          name: 'Bandit',
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      const entityTypes = turnOrder.map((e) => e.entityType);
      expect(entityTypes).toContain('character');
      expect(entityTypes).toContain('monster');
      expect(turnOrder[0].entityType).toBe('monster'); // Monster has lower initiative
      expect(turnOrder[1].entityType).toBe('character');
    });

    it('should break ties using character class order for players', () => {
      // When two players have same initiative, use character class order
      // Order: Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief

      const entities: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 50,
          name: 'Spellweaver Player',
          characterClass: CharacterClass.SPELLWEAVER,
        },
        {
          entityId: 'p2',
          entityType: 'character',
          initiative: 50,
          name: 'Brute Player',
          characterClass: CharacterClass.BRUTE,
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      expect(turnOrder[0].characterClass).toBe(CharacterClass.BRUTE); // Brute goes before Spellweaver
      expect(turnOrder[1].characterClass).toBe(CharacterClass.SPELLWEAVER);
    });

    it('should break ties correctly with all character classes', () => {
      const entities: TurnEntity[] = [
        {
          entityId: 'p6',
          entityType: 'character',
          initiative: 50,
          name: 'Mindthief Player',
          characterClass: CharacterClass.MINDTHIEF,
        },
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 50,
          name: 'Brute Player',
          characterClass: CharacterClass.BRUTE,
        },
        {
          entityId: 'p3',
          entityType: 'character',
          initiative: 50,
          name: 'Spellweaver Player',
          characterClass: CharacterClass.SPELLWEAVER,
        },
        {
          entityId: 'p2',
          entityType: 'character',
          initiative: 50,
          name: 'Tinkerer Player',
          characterClass: CharacterClass.TINKERER,
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      expect(turnOrder[0].characterClass).toBe(CharacterClass.BRUTE);
      expect(turnOrder[1].characterClass).toBe(CharacterClass.TINKERER);
      expect(turnOrder[2].characterClass).toBe(CharacterClass.SPELLWEAVER);
      expect(turnOrder[3].characterClass).toBe(CharacterClass.MINDTHIEF);
    });

    it('should place long rest (initiative 99) at end', () => {
      const entities: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 99,
          name: 'Brute',
          characterClass: CharacterClass.BRUTE,
        }, // Long rest
        {
          entityId: 'p2',
          entityType: 'character',
          initiative: 45,
          name: 'Tinkerer',
          characterClass: CharacterClass.TINKERER,
        },
        {
          entityId: 'm1',
          entityType: 'monster',
          initiative: 60,
          name: 'Bandit',
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);

      expect(turnOrder[0].entityId).toBe('p2'); // Tinkerer first (45)
      expect(turnOrder[1].entityId).toBe('m1'); // Monster second (60)
      expect(turnOrder[2].initiative).toBe(99); // Long rest last
      expect(turnOrder[2].entityId).toBe('p1');
    });

    it('should handle empty entity list', () => {
      const turnOrder = turnOrderService.determineTurnOrder([]);
      expect(turnOrder).toEqual([]);
    });

    it('should handle single entity', () => {
      const entities: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 50,
          name: 'Brute',
        },
      ];

      const turnOrder = turnOrderService.determineTurnOrder(entities);
      expect(turnOrder).toHaveLength(1);
      expect(turnOrder[0].entityId).toBe('p1');
    });

    it('should not mutate original entity array', () => {
      const entities: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 50,
          name: 'Brute',
        },
        {
          entityId: 'p2',
          entityType: 'character',
          initiative: 20,
          name: 'Tinkerer',
        },
      ];

      const originalOrder = [...entities];
      turnOrderService.determineTurnOrder(entities);

      expect(entities).toEqual(originalOrder);
    });
  });

  describe('getNextEntityIndex', () => {
    it('should return next entity in turn order', () => {
      const turnOrder = ['player1', 'monster1', 'player2'];
      const currentTurnIndex = 0;

      const nextIndex = turnOrderService.getNextEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(1);
    });

    it('should wrap to 0 when reaching end of turn order', () => {
      const turnOrder = ['player1', 'monster1', 'player2'];
      const currentTurnIndex = 2; // Last entity

      const nextIndex = turnOrderService.getNextEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(0); // Wraps to start (new round)
    });

    it('should handle middle of turn order', () => {
      const turnOrder = ['player1', 'monster1', 'player2', 'monster2'];
      const currentTurnIndex = 1;

      const nextIndex = turnOrderService.getNextEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(2);
    });

    it('should handle single entity turn order', () => {
      const turnOrder = ['player1'];
      const currentTurnIndex = 0;

      const nextIndex = turnOrderService.getNextEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(0); // Wraps back to self
    });
  });

  describe('getNextLivingEntityIndex', () => {
    it('should skip dead monsters in turn order', () => {
      const turnOrder = [
        { entityId: 'player1', isDead: false },
        { entityId: 'monster1', isDead: true }, // Dead monster
        { entityId: 'player2', isDead: false },
      ];
      const currentTurnIndex = 0;

      const nextIndex = turnOrderService.getNextLivingEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(2); // Skip dead monster, go to player2
    });

    it('should skip exhausted characters in turn order', () => {
      const turnOrder = [
        { entityId: 'player1', isExhausted: false },
        { entityId: 'player2', isExhausted: true }, // Exhausted
        { entityId: 'monster1', isDead: false },
      ];
      const currentTurnIndex = 0;

      const nextIndex = turnOrderService.getNextLivingEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(2); // Skip exhausted player
    });

    it('should skip multiple dead/exhausted entities', () => {
      const turnOrder = [
        { entityId: 'player1', isDead: false, isExhausted: false },
        { entityId: 'monster1', isDead: true },
        { entityId: 'player2', isExhausted: true },
        { entityId: 'monster2', isDead: true },
        { entityId: 'player3', isDead: false, isExhausted: false },
      ];
      const currentTurnIndex = 0;

      const nextIndex = turnOrderService.getNextLivingEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(4); // Skip all dead/exhausted to player3
    });

    it('should wrap around to find living entity', () => {
      const turnOrder = [
        { entityId: 'player1', isDead: false },
        { entityId: 'monster1', isDead: true },
        { entityId: 'player2', isDead: true },
      ];
      const currentTurnIndex = 2;

      const nextIndex = turnOrderService.getNextLivingEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(0); // Wraps to player1 (skips dead monster)
    });

    it('should return start index if all entities are dead/exhausted', () => {
      const turnOrder = [
        { entityId: 'monster1', isDead: true },
        { entityId: 'monster2', isDead: true },
        { entityId: 'player1', isExhausted: true },
      ];
      const currentTurnIndex = 0;

      const nextIndex = turnOrderService.getNextLivingEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      // Should return start index after completing full circle
      expect(nextIndex).toBe(0);
    });

    it('should return next living entity when current is alive', () => {
      const turnOrder = [
        { entityId: 'player1', isDead: false },
        { entityId: 'player2', isDead: false },
        { entityId: 'monster1', isDead: false },
      ];
      const currentTurnIndex = 0;

      const nextIndex = turnOrderService.getNextLivingEntityIndex(
        currentTurnIndex,
        turnOrder,
      );

      expect(nextIndex).toBe(1);
    });
  });

  describe('getCharacterClassOrder', () => {
    it('should define character class initiative tie-breaker order', () => {
      const classOrder = turnOrderService.getCharacterClassOrder();

      expect(classOrder).toEqual([
        CharacterClass.BRUTE,
        CharacterClass.TINKERER,
        CharacterClass.SPELLWEAVER,
        CharacterClass.SCOUNDREL,
        CharacterClass.CRAGHEART,
        CharacterClass.MINDTHIEF,
      ]);
    });

    it('should have all 6 character classes', () => {
      const classOrder = turnOrderService.getCharacterClassOrder();
      expect(classOrder).toHaveLength(6);
    });
  });

  describe('compareCharacterClasses', () => {
    it('should return negative when first class comes before second', () => {
      const brute = CharacterClass.BRUTE;
      const spellweaver = CharacterClass.SPELLWEAVER;

      const comparison = turnOrderService.compareCharacterClasses(
        brute,
        spellweaver,
      );

      expect(comparison).toBeLessThan(0); // Brute comes before Spellweaver
    });

    it('should return positive when first class comes after second', () => {
      const mindthief = CharacterClass.MINDTHIEF;
      const tinkerer = CharacterClass.TINKERER;

      const comparison = turnOrderService.compareCharacterClasses(
        mindthief,
        tinkerer,
      );

      expect(comparison).toBeGreaterThan(0); // Mindthief comes after Tinkerer
    });

    it('should return 0 when comparing same class', () => {
      const brute = CharacterClass.BRUTE;

      const comparison = turnOrderService.compareCharacterClasses(brute, brute);

      expect(comparison).toBe(0);
    });

    it('should order all classes correctly', () => {
      const classes = [
        CharacterClass.MINDTHIEF,
        CharacterClass.BRUTE,
        CharacterClass.CRAGHEART,
        CharacterClass.TINKERER,
        CharacterClass.SPELLWEAVER,
        CharacterClass.SCOUNDREL,
      ];

      const sorted = [...classes].sort((a, b) =>
        turnOrderService.compareCharacterClasses(a, b),
      );

      expect(sorted).toEqual([
        CharacterClass.BRUTE,
        CharacterClass.TINKERER,
        CharacterClass.SPELLWEAVER,
        CharacterClass.SCOUNDREL,
        CharacterClass.CRAGHEART,
        CharacterClass.MINDTHIEF,
      ]);
    });
  });

  describe('isNewRound', () => {
    it('should detect when turn wraps to start of order', () => {
      const currentTurnIndex = 2; // Last index (0, 1, 2)
      const turnOrderLength = 3;

      const isNewRound = turnOrderService.isNewRound(
        currentTurnIndex,
        turnOrderLength,
      );

      expect(isNewRound).toBe(true);
    });

    it('should return false during middle of round', () => {
      const currentTurnIndex = 1;
      const turnOrderLength = 3;

      const isNewRound = turnOrderService.isNewRound(
        currentTurnIndex,
        turnOrderLength,
      );

      expect(isNewRound).toBe(false);
    });

    it('should return false at start of round', () => {
      const currentTurnIndex = 0;
      const turnOrderLength = 3;

      const isNewRound = turnOrderService.isNewRound(
        currentTurnIndex,
        turnOrderLength,
      );

      expect(isNewRound).toBe(false);
    });

    it('should handle single entity turn order', () => {
      const currentTurnIndex = 0;
      const turnOrderLength = 1;

      const isNewRound = turnOrderService.isNewRound(
        currentTurnIndex,
        turnOrderLength,
      );

      expect(isNewRound).toBe(true); // Always at last index
    });
  });

  describe('updateTurnOrder', () => {
    it('should recalculate turn order after new card selections', () => {
      // New round, players select new cards with different initiatives

      const previousTurnOrder: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 20,
          name: 'Brute',
        },
        {
          entityId: 'p2',
          entityType: 'character',
          initiative: 40,
          name: 'Tinkerer',
        },
      ];

      const newCardSelections = [
        { playerId: 'p1', initiative: 60 }, // Changed from 20 to 60
        { playerId: 'p2', initiative: 30 }, // Changed from 40 to 30
      ];

      const newTurnOrder = turnOrderService.updateTurnOrder(
        previousTurnOrder,
        newCardSelections,
      );

      expect(newTurnOrder[0].entityId).toBe('p2'); // p2 now goes first (30 < 60)
      expect(newTurnOrder[0].initiative).toBe(30);
      expect(newTurnOrder[1].entityId).toBe('p1');
      expect(newTurnOrder[1].initiative).toBe(60);
    });

    it('should preserve monster initiatives across rounds', () => {
      // Monsters keep their initiatives, only players update

      const previousTurnOrder: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 50,
          name: 'Brute',
        },
        {
          entityId: 'm1',
          entityType: 'monster',
          initiative: 30,
          name: 'Bandit',
        },
      ];

      const newCardSelections = [
        { playerId: 'p1', initiative: 20 }, // Player changes initiative
      ];

      const newTurnOrder = turnOrderService.updateTurnOrder(
        previousTurnOrder,
        newCardSelections,
      );

      const monster = newTurnOrder.find((e) => e.entityId === 'm1');
      expect(monster?.initiative).toBe(30); // Monster keeps same initiative

      const player = newTurnOrder.find((e) => e.entityId === 'p1');
      expect(player?.initiative).toBe(20); // Player updated
    });

    it('should re-sort after updating initiatives', () => {
      const previousTurnOrder: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 20,
          name: 'Brute',
        },
        {
          entityId: 'm1',
          entityType: 'monster',
          initiative: 40,
          name: 'Bandit',
        },
        {
          entityId: 'p2',
          entityType: 'character',
          initiative: 60,
          name: 'Tinkerer',
        },
      ];

      const newCardSelections = [
        { playerId: 'p1', initiative: 70 }, // Brute now goes last
        { playerId: 'p2', initiative: 25 }, // Tinkerer now goes second
      ];

      const newTurnOrder = turnOrderService.updateTurnOrder(
        previousTurnOrder,
        newCardSelections,
      );

      expect(newTurnOrder[0].entityId).toBe('p2'); // Tinkerer first (25)
      expect(newTurnOrder[1].entityId).toBe('m1'); // Monster second (40)
      expect(newTurnOrder[2].entityId).toBe('p1'); // Brute last (70)
    });

    it('should handle partial card selection updates', () => {
      const previousTurnOrder: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 30,
          name: 'Brute',
        },
        {
          entityId: 'p2',
          entityType: 'character',
          initiative: 50,
          name: 'Tinkerer',
        },
        {
          entityId: 'p3',
          entityType: 'character',
          initiative: 40,
          name: 'Spellweaver',
        },
      ];

      const newCardSelections = [
        { playerId: 'p1', initiative: 60 }, // Only p1 updates
      ];

      const newTurnOrder = turnOrderService.updateTurnOrder(
        previousTurnOrder,
        newCardSelections,
      );

      expect(newTurnOrder[0].initiative).toBe(40); // p3 unchanged
      expect(newTurnOrder[1].initiative).toBe(50); // p2 unchanged
      expect(newTurnOrder[2].initiative).toBe(60); // p1 updated
    });

    it('should preserve all entity properties during update', () => {
      const previousTurnOrder: TurnEntity[] = [
        {
          entityId: 'p1',
          entityType: 'character',
          initiative: 30,
          name: 'Brute Player',
          characterClass: CharacterClass.BRUTE,
          isDead: false,
          isExhausted: false,
        },
      ];

      const newCardSelections = [{ playerId: 'p1', initiative: 50 }];

      const newTurnOrder = turnOrderService.updateTurnOrder(
        previousTurnOrder,
        newCardSelections,
      );

      const updated = newTurnOrder[0];
      expect(updated.entityId).toBe('p1');
      expect(updated.entityType).toBe('character');
      expect(updated.initiative).toBe(50); // Updated
      expect(updated.name).toBe('Brute Player'); // Preserved
      expect(updated.characterClass).toBe(CharacterClass.BRUTE); // Preserved
      expect(updated.isDead).toBe(false); // Preserved
      expect(updated.isExhausted).toBe(false); // Preserved
    });
  });
});
