/**
 * Action Dispatcher Service Tests
 * Comprehensive test coverage for card action handling
 *
 * Updated for Issue #220 - matches new service implementation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ActionDispatcherService } from '../src/services/action-dispatcher.service';
import { ConditionService } from '../src/services/condition.service';
import { ForcedMovementService } from '../src/services/forced-movement.service';
import { DamageCalculationService } from '../src/services/damage-calculation.service';
import { ValidationService } from '../src/services/validation.service';
import { Character, CharacterData } from '../src/models/character.model';
import { Condition, CharacterClass } from '../../shared/types/entities';
import { AttackAction, MoveAction, HealAction, SpecialAction } from '../src/types/modifiers';

// Helper to create test characters with proper CharacterData structure
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

describe('ActionDispatcherService', () => {
  let service: ActionDispatcherService;
  let mockConditionService: any;
  let mockForcedMovement: any;

  beforeEach(async () => {
    // Mock dependencies
    mockConditionService = {
      applyCondition: jest.fn(),
      removeCondition: jest.fn(),
      hasCondition: jest.fn(),
    };

    mockForcedMovement = {
      applyPush: jest.fn().mockResolvedValue({ success: true }),
      applyPull: jest.fn().mockResolvedValue({ success: true }),
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
          useValue: mockForcedMovement,
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

  describe('Attack Actions', () => {
    it('should apply attack damage to target', async () => {
      const source = createTestCharacter({ id: 'attacker', position: { q: 0, r: 0 } });

      const action: AttackAction = {
        type: 'attack',
        value: 3,
      };

      const result = await service.applyAction(action, source, 'target-1');

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain('target-1');
    });

    it('should fail attack if no target specified', async () => {
      const source = createTestCharacter({ id: 'attacker', position: { q: 0, r: 0 } });

      const action: AttackAction = {
        type: 'attack',
        value: 3,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(false);
    });

    it('should fail attack if source is disarmed', async () => {
      const source = createTestCharacter({ id: 'attacker', position: { q: 0, r: 0 } });
      source.addCondition(Condition.DISARM);

      const action: AttackAction = {
        type: 'attack',
        value: 3,
      };

      const result = await service.applyAction(action, source, 'target-1');

      expect(result.success).toBe(false);
    });

    it('should fail attack if source is stunned', async () => {
      const source = createTestCharacter({ id: 'attacker', position: { q: 0, r: 0 } });
      source.addCondition(Condition.STUN);

      const action: AttackAction = {
        type: 'attack',
        value: 3,
      };

      const result = await service.applyAction(action, source, 'target-1');

      expect(result.success).toBe(false);
    });

    it('should apply attack with range modifier', async () => {
      const source = createTestCharacter({ id: 'attacker', position: { q: 0, r: 0 } });

      const action: AttackAction = {
        type: 'attack',
        value: 2,
        modifiers: [{ type: 'range', distance: 3 }],
      };

      const result = await service.applyAction(action, source, 'target-1');

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'range', distance: 3 });
    });

    it('should apply attack with pierce modifier', async () => {
      const source = createTestCharacter({ id: 'attacker', position: { q: 0, r: 0 } });

      const action: AttackAction = {
        type: 'attack',
        value: 2,
        modifiers: [{ type: 'pierce', value: 2 }],
      };

      const result = await service.applyAction(action, source, 'target-1');

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'pierce', value: 2 });
    });
  });

  describe('Move Actions', () => {
    it('should apply move action', async () => {
      const source = createTestCharacter({ id: 'mover', position: { q: 0, r: 0 } });

      const action: MoveAction = {
        type: 'move',
        value: 4,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain(source.id);
    });

    it('should fail move if immobilized', async () => {
      const source = createTestCharacter({ id: 'mover', position: { q: 0, r: 0 } });
      source.addCondition(Condition.IMMOBILIZE);

      const action: MoveAction = {
        type: 'move',
        value: 4,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(false);
    });

    it('should fail move if stunned', async () => {
      const source = createTestCharacter({ id: 'mover', position: { q: 0, r: 0 } });
      source.addCondition(Condition.STUN);

      const action: MoveAction = {
        type: 'move',
        value: 4,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(false);
    });

    it('should apply move with jump modifier', async () => {
      const source = createTestCharacter({ id: 'mover', position: { q: 0, r: 0 } });

      const action: MoveAction = {
        type: 'move',
        value: 3,
        modifiers: [{ type: 'jump' }],
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'jump' });
    });
  });

  describe('Heal Actions', () => {
    it('should apply heal to target', async () => {
      const source = createTestCharacter({ id: 'healer', position: { q: 0, r: 0 } });
      const target = createTestCharacter({ id: 'ally', position: { q: 1, r: 0 }, currentHealth: 5 });

      const action: HealAction = {
        type: 'heal',
        value: 3,
      };

      const result = await service.applyAction(action, source, target.id);

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain(target.id);
    });

    it('should heal self if no target specified', async () => {
      const source = createTestCharacter({ id: 'healer', position: { q: 0, r: 0 }, currentHealth: 5 });

      const action: HealAction = {
        type: 'heal',
        value: 3,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain(source.id);
    });

    it('should apply heal with range modifier', async () => {
      const source = createTestCharacter({ id: 'healer', position: { q: 0, r: 0 } });

      const action: HealAction = {
        type: 'heal',
        value: 3,
        modifiers: [{ type: 'range', distance: 2 }],
      };

      const result = await service.applyAction(action, source, 'ally-1');

      expect(result.success).toBe(true);
    });
  });

  describe('Condition Modifiers', () => {
    it('should apply condition modifier', async () => {
      const target = createTestCharacter({ id: 'target', position: { q: 1, r: 0 } });

      await service.applyModifiers(
        [{ type: 'condition', condition: Condition.POISON, duration: 'round' }],
        createTestCharacter({ id: 'source', position: { q: 0, r: 0 } }),
        target,
      );

      expect(mockConditionService.applyCondition).toHaveBeenCalledWith(
        target,
        Condition.POISON,
        'round',
      );
    });

    it('should apply multiple conditions', async () => {
      const target = createTestCharacter({ id: 'target', position: { q: 1, r: 0 } });

      await service.applyModifiers(
        [
          { type: 'condition', condition: Condition.STUN, duration: 'round' },
          { type: 'condition', condition: Condition.WOUND, duration: 'until-consumed' },
        ],
        createTestCharacter({ id: 'source', position: { q: 0, r: 0 } }),
        target,
      );

      expect(mockConditionService.applyCondition).toHaveBeenCalledTimes(2);
    });
  });

  describe('Forced Movement Modifiers', () => {
    it('should apply push modifier', async () => {
      const source = createTestCharacter({ id: 'attacker', position: { q: 0, r: 0 } });
      const target = createTestCharacter({ id: 'defender', position: { q: 1, r: 0 } });

      const result = await service.applyModifiers(
        [{ type: 'push', distance: 1 }],
        source,
        target,
      );

      expect(result.appliedModifiers).toContainEqual({ type: 'push', distance: 1 });
      expect(mockForcedMovement.applyPush).toHaveBeenCalledWith(source, target, 1);
    });

    it('should apply pull modifier', async () => {
      const source = createTestCharacter({ id: 'attacker', position: { q: 0, r: 0 } });
      const target = createTestCharacter({ id: 'defender', position: { q: 2, r: 0 } });

      const result = await service.applyModifiers(
        [{ type: 'pull', distance: 1 }],
        source,
        target,
      );

      expect(result.appliedModifiers).toContainEqual({ type: 'pull', distance: 1 });
      expect(mockForcedMovement.applyPull).toHaveBeenCalledWith(source, target, 1);
    });
  });

  describe('Shield & Retaliate Modifiers', () => {
    it('should apply shield modifier', async () => {
      const source = createTestCharacter({ id: 'character', position: { q: 0, r: 0 } });

      await service.applyModifiers(
        [{ type: 'shield', value: 2, duration: 'round' }],
        source,
      );

      // Shield is stored in the service, not on the character
      const shieldEffect = service.getShieldEffect(source.id);
      expect(shieldEffect).toBeDefined();
      expect(shieldEffect?.value).toBe(2);
      expect(shieldEffect?.duration).toBe('round');
    });

    it('should apply retaliate modifier', async () => {
      const source = createTestCharacter({ id: 'character', position: { q: 0, r: 0 } });

      await service.applyModifiers(
        [{ type: 'retaliate', value: 2, duration: 'persistent' }],
        source,
      );

      // Retaliate is stored in the service, not on the character
      const retaliateEffect = service.getRetaliateEffect(source.id);
      expect(retaliateEffect).toBeDefined();
      expect(retaliateEffect?.value).toBe(2);
      expect(retaliateEffect?.duration).toBe('persistent');
    });

    it('should clear round effects at end of round', async () => {
      const source = createTestCharacter({ id: 'character', position: { q: 0, r: 0 } });

      await service.applyModifiers(
        [
          { type: 'shield', value: 2, duration: 'round' },
          { type: 'retaliate', value: 1, duration: 'persistent' },
        ],
        source,
      );

      service.clearRoundEffects(source.id);

      // Round-duration shield should be cleared
      expect(service.getShieldEffect(source.id)).toBeUndefined();
      // Persistent retaliate should remain
      expect(service.getRetaliateEffect(source.id)).toBeDefined();
    });
  });

  describe('Special Actions', () => {
    it('should apply special action with modifiers', async () => {
      const source = createTestCharacter({ id: 'character', position: { q: 0, r: 0 } });

      const action: SpecialAction = {
        type: 'special',
        modifiers: [
          { type: 'shield', value: 1, duration: 'persistent' },
          { type: 'retaliate', value: 1, duration: 'persistent' },
        ],
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers.length).toBe(2);
    });
  });

  describe('Element Modifiers', () => {
    it('should track infuse modifier', async () => {
      const source = createTestCharacter({ id: 'character', position: { q: 0, r: 0 } });

      const result = await service.applyModifiers(
        [{ type: 'infuse', element: 'fire' }],
        source,
      );

      expect(result.appliedModifiers).toContainEqual({ type: 'infuse', element: 'fire' });
    });

    it('should track consume modifier', async () => {
      const source = createTestCharacter({ id: 'character', position: { q: 0, r: 0 } });

      const result = await service.applyModifiers(
        [{ type: 'consume', element: 'ice', bonus: { effect: 'attack', value: 2 } }],
        source,
      );

      expect(result.appliedModifiers).toContainEqual(
        expect.objectContaining({ type: 'consume', element: 'ice' }),
      );
    });
  });
});
