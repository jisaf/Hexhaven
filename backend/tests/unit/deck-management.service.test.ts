/**
 * Unit Tests: DeckManagementService
 *
 * Tests for the deck management facade that coordinates
 * CardPileService, RestService, and ExhaustionService
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DeckManagementService } from '../../src/services/deck-management.service';
import { CardPileService } from '../../src/services/card-pile.service';
import { RestService } from '../../src/services/rest.service';
import { ExhaustionService } from '../../src/services/exhaustion.service';
import { CardTemplateCache } from '../../src/utils/card-template-cache';
import type { Character, AbilityCard } from '../../../shared/types/entities';
import { CharacterClass } from '../../../shared/types/entities';

// Mock PrismaService
const mockPrisma = {
  character: {
    findUnique: jest.fn(),
  },
  cardEnhancement: {
    findMany: jest.fn(),
  },
} as any;

// Mock CardTemplateCache
jest.mock('../../src/utils/card-template-cache');

describe('DeckManagementService', () => {
  let service: DeckManagementService;
  let cardPileService: CardPileService;
  let restService: RestService;
  let exhaustionService: ExhaustionService;
  let mockCharacter: Character;
  let mockCardTemplate: AbilityCard;

  beforeEach(() => {
    // Create service instances
    cardPileService = new CardPileService();
    restService = new RestService(cardPileService);
    exhaustionService = new ExhaustionService();
    service = new DeckManagementService(
      mockPrisma,
      cardPileService,
      restService,
      exhaustionService
    );

    // Reset mocks
    jest.clearAllMocks();

    // Create mock character
    mockCharacter = {
      id: 'char-1',
      playerId: 'player-1',
      classType: CharacterClass.BRUTE,
      health: 8,
      maxHealth: 10,
      experience: 0,
      level: 1,
      currentHex: { q: 0, r: 0 },
      abilityDeck: ['card-1', 'card-2', 'card-3', 'card-4', 'card-5'],
      hand: ['card-1', 'card-2'],
      discardPile: ['card-3', 'card-4'],
      lostPile: ['card-5'],
      activeCards: null,
      conditions: [],
      isExhausted: false,
    };

    // Mock card template - uses new modifier-based format (Issue #220)
    mockCardTemplate = {
      id: 'card-1',
      characterClass: CharacterClass.BRUTE,
      name: 'Test Card',
      level: 1,
      initiative: 50,
      topAction: {
        type: 'attack',
        value: 3,
        modifiers: [{ type: 'range', distance: 1 }],
      },
      bottomAction: {
        type: 'move',
        value: 2,
        modifiers: [],
      },
    } as any;

    // Setup CardTemplateCache mock
    (CardTemplateCache.get as jest.Mock).mockReturnValue(mockCardTemplate);
  });

  describe('loadEnhancedCards', () => {
    it('should load character and enhancements from database', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        abilityDeck: ['card-1', 'card-2'],
      });
      mockPrisma.cardEnhancement.findMany.mockResolvedValue([
        { id: 'enh-1', characterId: 'char-1', cardId: 'card-1', type: 'attack', value: 1 },
      ]);

      await service.loadEnhancedCards('char-1');

      expect(mockPrisma.character.findUnique).toHaveBeenCalledWith({
        where: { id: 'char-1' },
      });
      expect(mockPrisma.cardEnhancement.findMany).toHaveBeenCalledWith({
        where: { characterId: 'char-1' },
      });
    });

    // TODO: Re-enable when Prisma Character model has abilityDeck field (campaign mode)
    it.skip('should use CardTemplateCache for base cards', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        abilityDeck: ['card-1', 'card-2', 'card-3'],
      });
      mockPrisma.cardEnhancement.findMany.mockResolvedValue([]);

      await service.loadEnhancedCards('char-1');

      expect(CardTemplateCache.get).toHaveBeenCalledWith('card-1');
      expect(CardTemplateCache.get).toHaveBeenCalledWith('card-2');
      expect(CardTemplateCache.get).toHaveBeenCalledWith('card-3');
      expect(CardTemplateCache.get).toHaveBeenCalledTimes(3);
    });

    // TODO: Re-enable when Prisma Character model has abilityDeck field (campaign mode)
    it.skip('should merge enhancements with card templates', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        abilityDeck: ['card-1'],
      });
      mockPrisma.cardEnhancement.findMany.mockResolvedValue([
        { id: 'enh-1', characterId: 'char-1', cardId: 'card-1', type: 'attack', value: 1 },
        { id: 'enh-2', characterId: 'char-1', cardId: 'card-1', type: 'move', value: 1 },
      ]);

      const result = await service.loadEnhancedCards('char-1');

      expect(result).toHaveLength(1);
      expect(result[0].enhancements).toHaveLength(2);
      expect(result[0].id).toBe('card-1');
    });

    // TODO: Re-enable when Prisma Character model has abilityDeck field (campaign mode)
    it.skip('should handle characters with no enhancements', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        abilityDeck: ['card-1', 'card-2'],
      });
      mockPrisma.cardEnhancement.findMany.mockResolvedValue([]);

      const result = await service.loadEnhancedCards('char-1');

      expect(result).toHaveLength(2);
      expect(result[0].enhancements).toEqual([]);
      expect(result[1].enhancements).toEqual([]);
    });

    it('should throw error if character not found', async () => {
      mockPrisma.character.findUnique.mockResolvedValue(null);

      await expect(service.loadEnhancedCards('invalid-id')).rejects.toThrow(
        'Character not found: invalid-id'
      );
    });
  });

  describe('playCards', () => {
    it('should delegate to CardPileService', () => {
      const spy = jest.spyOn(cardPileService, 'playCards');

      service.playCards(mockCharacter, 'card-1', 'card-2');

      expect(spy).toHaveBeenCalledWith(
        mockCharacter,
        'card-1',
        'card-2',
        expect.any(Boolean),
        expect.any(Boolean)
      );
    });

    it('should check for loss icons on both cards', () => {
      const getSpy = CardTemplateCache.get as jest.Mock;
      getSpy.mockReturnValue(mockCardTemplate);

      service.playCards(mockCharacter, 'card-1', 'card-2');

      expect(getSpy).toHaveBeenCalledWith('card-1');
      expect(getSpy).toHaveBeenCalledWith('card-2');
    });

    it('should move cards to correct piles based on loss icons', () => {
      const topLossTemplate = {
        ...mockCardTemplate,
        topAction: { ...mockCardTemplate.topAction, modifiers: [{ type: 'lost' }] },
      };
      const bottomNormalTemplate = mockCardTemplate;

      (CardTemplateCache.get as jest.Mock)
        .mockReturnValueOnce(topLossTemplate)
        .mockReturnValueOnce(bottomNormalTemplate);

      const result = service.playCards(mockCharacter, 'card-1', 'card-2');

      // Top card should go to lost, bottom to discard
      expect(result.lostPile).toContain('card-1');
      expect(result.discardPile).toContain('card-2');
    });
  });

  describe('rest operations', () => {
    it('should delegate canRest to RestService', () => {
      const spy = jest.spyOn(restService, 'canRest');

      service.canRest(mockCharacter, 'short');

      expect(spy).toHaveBeenCalledWith(mockCharacter, 'short');
    });

    it('should delegate executeShortRest to RestService', () => {
      const spy = jest.spyOn(restService, 'executeShortRest');

      service.executeShortRest(mockCharacter);

      expect(spy).toHaveBeenCalledWith(mockCharacter);
    });

    it('should delegate rerollShortRest to RestService', () => {
      const spy = jest.spyOn(restService, 'rerollShortRest');
      const char = {
        ...mockCharacter,
        shortRestState: {
          randomCardId: 'card-3',
          randomSeed: 12345,
          hasRerolled: false,
          timestamp: Date.now(),
        },
      };

      service.rerollShortRest(char);

      expect(spy).toHaveBeenCalledWith(char);
    });

    it('should delegate finalizeShortRest to RestService', () => {
      const spy = jest.spyOn(restService, 'finalizeShortRest');
      const char = {
        ...mockCharacter,
        shortRestState: {
          randomCardId: 'card-3',
          randomSeed: 12345,
          hasRerolled: false,
          timestamp: Date.now(),
        },
      };

      service.finalizeShortRest(char);

      expect(spy).toHaveBeenCalledWith(char);
    });

    it('should delegate declareLongRest to RestService', () => {
      const spy = jest.spyOn(restService, 'declareLongRest');

      service.declareLongRest(mockCharacter);

      expect(spy).toHaveBeenCalledWith(mockCharacter);
    });

    it('should delegate executeLongRest to RestService', () => {
      const spy = jest.spyOn(restService, 'executeLongRest');

      service.executeLongRest(mockCharacter, 'card-3');

      expect(spy).toHaveBeenCalledWith(mockCharacter, 'card-3');
    });
  });

  describe('exhaustion operations', () => {
    it('should delegate checkExhaustion to ExhaustionService', () => {
      const spy = jest.spyOn(exhaustionService, 'checkExhaustion');

      service.checkExhaustion(mockCharacter);

      expect(spy).toHaveBeenCalledWith(mockCharacter);
    });

    it('should delegate executeExhaustion to ExhaustionService', () => {
      const spy = jest.spyOn(exhaustionService, 'executeExhaustion');

      service.executeExhaustion(mockCharacter, 'damage');

      expect(spy).toHaveBeenCalledWith(mockCharacter, 'damage');
    });

    it('should delegate isPartyExhausted to ExhaustionService', () => {
      const spy = jest.spyOn(exhaustionService, 'isPartyExhausted');
      const characters = [mockCharacter];

      service.isPartyExhausted(characters);

      expect(spy).toHaveBeenCalledWith(characters);
    });

    it('should delegate getExhaustionRisk to ExhaustionService', () => {
      const spy = jest.spyOn(exhaustionService, 'getExhaustionRisk');

      service.getExhaustionRisk(mockCharacter);

      expect(spy).toHaveBeenCalledWith(mockCharacter);
    });
  });

  describe('card pile operations', () => {
    it('should delegate moveCard to CardPileService', () => {
      const spy = jest.spyOn(cardPileService, 'moveCard');

      service.moveCard(mockCharacter, 'card-1', 'hand', 'discard');

      expect(spy).toHaveBeenCalledWith(mockCharacter, 'card-1', 'hand', 'discard');
    });

    it('should delegate getCardCounts to CardPileService', () => {
      const spy = jest.spyOn(cardPileService, 'getCardCounts');

      service.getCardCounts(mockCharacter);

      expect(spy).toHaveBeenCalledWith(mockCharacter);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete short rest flow', () => {
      // Execute short rest
      const restResult = service.executeShortRest(mockCharacter);
      expect(restResult.character.shortRestState).toBeDefined();
      expect(restResult.randomCard).toBeDefined();

      // Finalize
      const final = service.finalizeShortRest(restResult.character);
      expect(final.shortRestState).toBeNull();
      expect(final.discardPile).toEqual([]);
      expect(final.lostPile.length).toBeGreaterThan(0);
    });

    it('should handle complete long rest flow', () => {
      // Declare long rest
      const declared = service.declareLongRest(mockCharacter);
      expect(declared.isResting).toBe(true);
      expect(declared.restType).toBe('long');

      // Execute long rest
      const result = service.executeLongRest(declared, 'card-3');
      expect(result.lostPile).toContain('card-3');
      expect(result.health).toBeGreaterThan(mockCharacter.health);
    });

    it('should detect and execute exhaustion from damage', () => {
      const char = { ...mockCharacter, health: 0 };

      // Check exhaustion
      const check = service.checkExhaustion(char);
      expect(check.isExhausted).toBe(true);
      expect(check.reason).toBe('damage');

      // Execute exhaustion
      const exhausted = service.executeExhaustion(char, 'damage');
      expect(exhausted.isExhausted).toBe(true);
      expect(exhausted.currentHex).toBeNull();
      expect(exhausted.hand).toEqual([]);
    });

    it('should detect and execute exhaustion from insufficient cards', () => {
      const char = {
        ...mockCharacter,
        hand: ['card-1'],
        discardPile: ['card-3'],
      };

      // Check exhaustion
      const check = service.checkExhaustion(char);
      expect(check.isExhausted).toBe(true);
      expect(check.reason).toBe('insufficient_cards');

      // Execute exhaustion
      const exhausted = service.executeExhaustion(char, 'insufficient_cards');
      expect(exhausted.isExhausted).toBe(true);
      expect(exhausted.exhaustionReason).toBe('insufficient_cards');
    });

    it('should play cards and check exhaustion in sequence', () => {
      // Play cards (both have loss icons)
      const topLossTemplate = {
        ...mockCardTemplate,
        topAction: { ...mockCardTemplate.topAction, modifiers: [{ type: 'lost' }] },
        bottomAction: { ...mockCardTemplate.bottomAction, modifiers: [{ type: 'lost' }] },
      };
      (CardTemplateCache.get as jest.Mock).mockReturnValue(topLossTemplate);

      let char = service.playCards(mockCharacter, 'card-1', 'card-2');
      expect(char.hand).toEqual([]);
      expect(char.lostPile.length).toBeGreaterThan(mockCharacter.lostPile.length);

      // Check exhaustion (now has 0 in hand, but 2 in discard)
      const check = service.checkExhaustion(char);
      expect(check.isExhausted).toBe(false); // Can still rest

      // Rest to get cards back
      char = service.executeLongRest(char, 'card-3');
      expect(char.hand.length).toBeGreaterThan(0);
    });
  });
});
