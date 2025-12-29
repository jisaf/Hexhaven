/**
 * Loot Action Tests (Issue #227)
 * TDD tests for loot action implementation in ActionDispatcherService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ActionDispatcherService } from '../src/services/action-dispatcher.service';
import { ConditionService } from '../src/services/condition.service';
import { ForcedMovementService } from '../src/services/forced-movement.service';
import { DamageCalculationService } from '../src/services/damage-calculation.service';
import { ValidationService } from '../src/services/validation.service';
import { Character, CharacterData } from '../src/models/character.model';
import { Condition, CharacterClass } from '../../shared/types/entities';
import { LootAction } from '../../shared/types/modifiers';

// Helper to create test characters
function createTestCharacter(overrides: Partial<CharacterData> & { id: string }): Character {
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

describe('ActionDispatcherService - Loot Actions', () => {
  let service: ActionDispatcherService;
  let mockConditionService: any;

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

  describe('applyLootAction - basic behavior', () => {
    it('should return success when character is in valid position', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });

      const action: LootAction = {
        type: 'loot',
        value: 1,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
    });

    it('should use action.value as collection range', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });

      const action: LootAction = {
        type: 'loot',
        value: 2, // Loot 2 = 2 hex range
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      // The range value should be stored for the gateway to use
      // Result metadata or affectedEntities can communicate this
    });

    it('should default to range 1 when value not specified', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });

      const action: LootAction = {
        type: 'loot',
        // No value specified - should default to 1
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
    });

    it('should include source character in affected entities', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });

      const action: LootAction = {
        type: 'loot',
        value: 1,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain(source.id);
    });
  });

  describe('applyLootAction - precondition failures', () => {
    it('should fail if character is stunned', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });
      source.addCondition(Condition.STUN);

      const action: LootAction = {
        type: 'loot',
        value: 1,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(false);
    });

    it('should succeed even if character is immobilized (loot does not require movement)', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });
      source.addCondition(Condition.IMMOBILIZE);

      const action: LootAction = {
        type: 'loot',
        value: 1,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
    });

    it('should succeed even if character is disarmed (loot is not an attack)', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });
      source.addCondition(Condition.DISARM);

      const action: LootAction = {
        type: 'loot',
        value: 1,
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
    });
  });

  describe('applyLootAction - modifiers', () => {
    it('should apply modifiers on the loot action', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });

      const action: LootAction = {
        type: 'loot',
        value: 1,
        modifiers: [
          { type: 'xp', value: 1 },
        ],
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'xp', value: 1 });
    });

    it('should handle loot action with lost modifier (consumed after use)', () => {
      const source = createTestCharacter({ id: 'looter', position: { q: 0, r: 0 } });

      const action: LootAction = {
        type: 'loot',
        value: 1,
        modifiers: [
          { type: 'lost' },
        ],
      };

      const result = service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'lost' });
    });
  });
});
