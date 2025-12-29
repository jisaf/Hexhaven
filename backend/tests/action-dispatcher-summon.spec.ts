/**
 * Summon Action Tests (Issue #228)
 * TDD tests for summon action implementation in ActionDispatcherService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ActionDispatcherService } from '../src/services/action-dispatcher.service';
import { ConditionService } from '../src/services/condition.service';
import { ForcedMovementService } from '../src/services/forced-movement.service';
import { DamageCalculationService } from '../src/services/damage-calculation.service';
import { ValidationService } from '../src/services/validation.service';
import { Character, CharacterData } from '../src/models/character.model';
import { Condition, CharacterClass } from '../../shared/types/entities';
import { SummonAction, SummonDefinition } from '../../shared/types/modifiers';

// Helper to create test characters
function createTestCharacter(overrides: Partial<CharacterData> & { id: string }): Character {
  const now = new Date();
  const data: CharacterData = {
    id: overrides.id,
    playerId: overrides.playerId || 'test-player',
    characterClass: overrides.characterClass || CharacterClass.SPELLWEAVER,
    position: overrides.position || { q: 0, r: 0 },
    stats: overrides.stats || { health: 8, movement: 2, attack: 1, range: 3 },
    currentHealth: overrides.currentHealth ?? 8,
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

describe('ActionDispatcherService - Summon Actions', () => {
  let service: ActionDispatcherService;
  let mockConditionService: any;

  const mysticAllyDefinition: SummonDefinition = {
    name: 'Mystic Ally',
    health: 4,
    attack: 2,
    move: 3,
    range: 2,
    typeIcon: 'ra-wolf-howl',
  };

  beforeEach(async () => {
    mockConditionService = {
      applyCondition: jest.fn(),
      removeCondition: jest.fn(),
      hasCondition: jest.fn(),
      applyShield: jest.fn(),
      getShieldEffect: jest.fn(),
      clearShieldEffect: jest.fn(),
      applyRetaliate: jest.fn(),
      getRetaliateEffect: jest.fn(),
      clearRetaliateEffect: jest.fn(),
      clearRoundEffects: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionDispatcherService,
        {
          provide: ConditionService,
          useValue: mockConditionService,
        },
        {
          provide: ForcedMovementService,
          useValue: {
            applyPush: jest.fn().mockReturnValue({ success: true }),
            applyPull: jest.fn().mockReturnValue({ success: true }),
          },
        },
        {
          provide: DamageCalculationService,
          useValue: {
            calculateDamage: jest.fn().mockReturnValue(5),
          },
        },
        {
          provide: ValidationService,
          useValue: {
            validateMovement: jest.fn().mockReturnValue({ valid: true }),
            validateAttack: jest.fn().mockReturnValue({ valid: true }),
          },
        },
      ],
    }).compile();

    service = module.get<ActionDispatcherService>(ActionDispatcherService);
  });

  describe('applySummonAction - basic behavior', () => {
    it('should return success when summon action is valid', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });

      const action: SummonAction = {
        type: 'summon',
        summon: mysticAllyDefinition,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
    });

    it('should include source character in affected entities', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });

      const action: SummonAction = {
        type: 'summon',
        summon: mysticAllyDefinition,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain(source.id);
    });

    it('should pass summon definition for gateway to use', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });

      const action: SummonAction = {
        type: 'summon',
        summon: {
          name: 'Shadow Spirit',
          health: 6,
          attack: 3,
          move: 2,
          range: 0,
        },
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      // The gateway will use the summon definition from the action
    });
  });

  describe('applySummonAction - precondition failures', () => {
    it('should fail if character is stunned', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });
      source.addCondition(Condition.STUN);

      const action: SummonAction = {
        type: 'summon',
        summon: mysticAllyDefinition,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(false);
    });

    it('should succeed even if character is immobilized (summon does not require movement)', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });
      source.addCondition(Condition.IMMOBILIZE);

      const action: SummonAction = {
        type: 'summon',
        summon: mysticAllyDefinition,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
    });

    it('should succeed even if character is disarmed (summon is not an attack)', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });
      source.addCondition(Condition.DISARM);

      const action: SummonAction = {
        type: 'summon',
        summon: mysticAllyDefinition,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
    });
  });

  describe('applySummonAction - modifiers', () => {
    it('should apply lost modifier (summon cards are typically lost)', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });

      const action: SummonAction = {
        type: 'summon',
        summon: mysticAllyDefinition,
        modifiers: [
          { type: 'lost' },
        ],
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'lost' });
    });

    it('should apply XP modifier', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });

      const action: SummonAction = {
        type: 'summon',
        summon: mysticAllyDefinition,
        modifiers: [
          { type: 'xp', value: 2 },
        ],
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'xp', value: 2 });
    });

    it('should apply element infusion modifier', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });

      const action: SummonAction = {
        type: 'summon',
        summon: {
          name: 'Shadow Spirit',
          health: 6,
          attack: 3,
          move: 2,
          range: 0,
        },
        modifiers: [
          { type: 'infuse', element: 'dark' },
          { type: 'lost' },
        ],
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'infuse', element: 'dark' });
    });
  });

  describe('applySummonAction - player controlled summons', () => {
    it('should handle playerControlled flag in summon definition', () => {
      const source = createTestCharacter({ id: 'summoner', position: { q: 0, r: 0 } });

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

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      // The gateway will use the playerControlled flag
    });
  });
});
