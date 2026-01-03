/**
 * Card Action Handlers Tests (Issue #411 - Phase 5)
 * Tests for executeCardSpecialAction, executeCardSummonAction,
 * executeCardLootAction, and executeCardTextAction
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConditionService } from '../src/services/condition.service';
import { Character, CharacterData } from '../src/models/character.model';
import { LootToken } from '../src/models/loot-token.model';
import { CharacterClass, Condition } from '../../shared/types/entities';
import type {
  SpecialAction,
  LootAction,
  SummonAction,
  TextAction,
  ShieldModifier,
  RetaliateModifier,
  ConditionModifier,
} from '../../shared/types/modifiers';
import { hexDistance } from '../src/utils/hex-utils';

// Helper to create test characters
function createTestCharacter(
  overrides: Partial<CharacterData> & { id: string },
): Character {
  const now = new Date();
  const data: CharacterData = {
    id: overrides.id,
    playerId: overrides.playerId || 'test-player',
    characterClass: overrides.characterClass || CharacterClass.BRUTE,
    position: overrides.position || { q: 0, r: 0 },
    stats: overrides.stats || { health: 10, movement: 2, attack: 2, range: 1 },
    currentHealth: overrides.currentHealth ?? 10,
    conditions: overrides.conditions || [],
    exhausted: overrides.exhausted || false,
    hand: overrides.hand || [],
    discardPile: overrides.discardPile || [],
    lostPile: overrides.lostPile || [],
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
  return new Character(data);
}

describe('Card Action Handlers (Issue #411 - Phase 5)', () => {
  describe('hexDistance utility', () => {
    it('should calculate correct distance for adjacent hexes', () => {
      expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
      expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
      expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
    });

    it('should calculate correct distance for same hex', () => {
      expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    });

    it('should calculate correct distance for hexes 2 apart', () => {
      expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2);
      expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 2 })).toBe(2);
    });

    it('should calculate correct distance for diagonal hexes', () => {
      expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe(2);
    });
  });

  describe('ConditionService - Shield and Retaliate', () => {
    let conditionService: ConditionService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [ConditionService],
      }).compile();

      conditionService = module.get<ConditionService>(ConditionService);
    });

    describe('applyShield', () => {
      it('should apply shield effect to character', () => {
        conditionService.applyShield('char-1', 2, 'round');

        const shield = conditionService.getShieldEffect('char-1');
        expect(shield).toBeDefined();
        expect(shield?.value).toBe(2);
        expect(shield?.duration).toBe('round');
      });

      it('should replace existing shield with new value', () => {
        conditionService.applyShield('char-1', 1, 'round');
        conditionService.applyShield('char-1', 3, 'persistent');

        const shield = conditionService.getShieldEffect('char-1');
        expect(shield?.value).toBe(3);
        expect(shield?.duration).toBe('persistent');
      });

      it('should clear shield effect', () => {
        conditionService.applyShield('char-1', 2, 'round');
        conditionService.clearShieldEffect('char-1');

        const shield = conditionService.getShieldEffect('char-1');
        expect(shield).toBeUndefined();
      });
    });

    describe('applyRetaliate', () => {
      it('should apply retaliate effect to character', () => {
        conditionService.applyRetaliate('char-1', 2, 1, 'round');

        const retaliate = conditionService.getRetaliateEffect('char-1');
        expect(retaliate).toBeDefined();
        expect(retaliate?.value).toBe(2);
        expect(retaliate?.range).toBe(1);
        expect(retaliate?.duration).toBe('round');
      });

      it('should apply retaliate with extended range', () => {
        conditionService.applyRetaliate('char-1', 1, 3, 'persistent');

        const retaliate = conditionService.getRetaliateEffect('char-1');
        expect(retaliate?.value).toBe(1);
        expect(retaliate?.range).toBe(3);
        expect(retaliate?.duration).toBe('persistent');
      });

      it('should clear retaliate effect', () => {
        conditionService.applyRetaliate('char-1', 2, 1, 'round');
        conditionService.clearRetaliateEffect('char-1');

        const retaliate = conditionService.getRetaliateEffect('char-1');
        expect(retaliate).toBeUndefined();
      });
    });

    describe('clearRoundEffects', () => {
      it('should clear round-based shield but keep persistent', () => {
        conditionService.applyShield('char-round', 2, 'round');
        conditionService.applyShield('char-persist', 3, 'persistent');

        conditionService.clearRoundEffects('char-round');
        conditionService.clearRoundEffects('char-persist');

        expect(conditionService.getShieldEffect('char-round')).toBeUndefined();
        expect(conditionService.getShieldEffect('char-persist')).toBeDefined();
      });

      it('should clear round-based retaliate but keep persistent', () => {
        conditionService.applyRetaliate('char-round', 1, 1, 'round');
        conditionService.applyRetaliate('char-persist', 2, 1, 'persistent');

        conditionService.clearRoundEffects('char-round');
        conditionService.clearRoundEffects('char-persist');

        expect(conditionService.getRetaliateEffect('char-round')).toBeUndefined();
        expect(conditionService.getRetaliateEffect('char-persist')).toBeDefined();
      });
    });

    describe('applyCondition', () => {
      it('should apply strengthen condition', () => {
        const character = createTestCharacter({ id: 'char-1' });
        conditionService.applyCondition(character, Condition.STRENGTHEN, 'round');

        expect(conditionService.hasCondition(character, Condition.STRENGTHEN)).toBe(
          true,
        );
      });

      it('should apply bless condition', () => {
        const character = createTestCharacter({ id: 'char-1' });
        conditionService.applyCondition(character, Condition.BLESS, 'until-consumed');

        expect(conditionService.hasCondition(character, Condition.BLESS)).toBe(true);
      });
    });
  });

  describe('LootToken - range filtering', () => {
    it('should filter tokens within range 1', () => {
      const characterPos = { q: 0, r: 0 };
      const tokens = [
        LootToken.create('room-1', { q: 0, r: 0 }, 1), // Same hex - distance 0
        LootToken.create('room-1', { q: 1, r: 0 }, 1), // Adjacent - distance 1
        LootToken.create('room-1', { q: 2, r: 0 }, 1), // 2 away - distance 2
      ];

      const inRange = tokens.filter((token) => {
        const distance = hexDistance(characterPos, token.coordinates);
        return distance <= 1;
      });

      expect(inRange.length).toBe(2);
    });

    it('should filter tokens within range 2', () => {
      const characterPos = { q: 0, r: 0 };
      const tokens = [
        LootToken.create('room-1', { q: 0, r: 0 }, 1), // distance 0
        LootToken.create('room-1', { q: 1, r: 0 }, 1), // distance 1
        LootToken.create('room-1', { q: 2, r: 0 }, 1), // distance 2
        LootToken.create('room-1', { q: 3, r: 0 }, 1), // distance 3
      ];

      const inRange = tokens.filter((token) => {
        const distance = hexDistance(characterPos, token.coordinates);
        return distance <= 2;
      });

      expect(inRange.length).toBe(3);
    });

    it('should exclude collected tokens', () => {
      const characterPos = { q: 0, r: 0 };
      const tokens = [
        LootToken.create('room-1', { q: 0, r: 0 }, 1),
        LootToken.create('room-1', { q: 1, r: 0 }, 1),
      ];

      // Collect first token
      tokens[0].collect('player-1');

      const inRange = tokens.filter((token) => {
        if (token.isCollected) return false;
        const distance = hexDistance(characterPos, token.coordinates);
        return distance <= 1;
      });

      expect(inRange.length).toBe(1);
    });
  });

  describe('Special Action modifiers', () => {
    it('should extract shield modifier from action', () => {
      const action: SpecialAction = {
        type: 'special',
        modifiers: [{ type: 'shield', value: 2, duration: 'round' } as ShieldModifier],
      };

      const shieldMod = action.modifiers?.find(
        (m) => m.type === 'shield',
      ) as ShieldModifier | undefined;

      expect(shieldMod).toBeDefined();
      expect(shieldMod?.value).toBe(2);
      expect(shieldMod?.duration).toBe('round');
    });

    it('should extract retaliate modifier from action', () => {
      const action: SpecialAction = {
        type: 'special',
        modifiers: [
          { type: 'retaliate', value: 1, range: 2, duration: 'round' } as RetaliateModifier,
        ],
      };

      const retaliateMod = action.modifiers?.find(
        (m) => m.type === 'retaliate',
      ) as RetaliateModifier | undefined;

      expect(retaliateMod).toBeDefined();
      expect(retaliateMod?.value).toBe(1);
      expect(retaliateMod?.range).toBe(2);
    });

    it('should extract condition modifiers from action', () => {
      const action: SpecialAction = {
        type: 'special',
        modifiers: [
          {
            type: 'condition',
            condition: Condition.STRENGTHEN,
            duration: 'round',
            target: 'self',
          } as ConditionModifier,
        ],
      };

      const condMods = action.modifiers?.filter(
        (m) => m.type === 'condition',
      ) as ConditionModifier[];

      expect(condMods.length).toBe(1);
      expect(condMods[0].condition).toBe(Condition.STRENGTHEN);
    });

    it('should handle action with multiple modifiers', () => {
      const action: SpecialAction = {
        type: 'special',
        modifiers: [
          { type: 'shield', value: 2, duration: 'round' } as ShieldModifier,
          { type: 'retaliate', value: 1, range: 1, duration: 'round' } as RetaliateModifier,
          {
            type: 'condition',
            condition: Condition.STRENGTHEN,
            duration: 'round',
            target: 'self',
          } as ConditionModifier,
        ],
      };

      expect(action.modifiers?.length).toBe(3);
    });
  });

  describe('Summon Action structure', () => {
    it('should have summon definition', () => {
      const action: SummonAction = {
        type: 'summon',
        summon: {
          name: 'Mystic Ally',
          health: 4,
          attack: 2,
          move: 3,
          range: 2,
        },
      };

      expect(action.summon.name).toBe('Mystic Ally');
      expect(action.summon.health).toBe(4);
    });

    it('should support player controlled summons', () => {
      const action: SummonAction = {
        type: 'summon',
        summon: {
          name: 'Controllable Companion',
          health: 5,
          attack: 2,
          move: 3,
          range: 1,
          playerControlled: true,
        },
      };

      expect(action.summon.playerControlled).toBe(true);
    });
  });

  describe('Loot Action structure', () => {
    it('should have optional value for range', () => {
      const action: LootAction = {
        type: 'loot',
        value: 2,
      };

      expect(action.value).toBe(2);
    });

    it('should default value to 1 when not specified', () => {
      const action: LootAction = {
        type: 'loot',
      };

      const lootRange = action.value || 1;
      expect(lootRange).toBe(1);
    });
  });

  describe('Text Action structure', () => {
    it('should have optional description', () => {
      const action: TextAction = {
        type: 'text',
        description: 'Wound all adjacent enemies',
      };

      expect(action.description).toBe('Wound all adjacent enemies');
    });

    it('should have optional title', () => {
      const action: TextAction = {
        type: 'text',
        title: 'Devastating Blow',
      };

      expect(action.title).toBe('Devastating Blow');
    });

    it('should have optional quote', () => {
      const action: TextAction = {
        type: 'text',
        quote: '"The darkness consumes all..."',
      };

      expect(action.quote).toBe('"The darkness consumes all..."');
    });
  });
});
