/**
 * Action Dispatcher Service
 * Central service for dispatching and applying card actions to game entities
 * Handles effect resolution, validation, and state updates
 *
 * Updated for Issue #220 - works with existing Character model
 */

import { Injectable, Optional } from '@nestjs/common';
import { Modifier, CardAction, EffectApplicationResult } from '../../../shared/types/modifiers';
import { Condition } from '../../../shared/types/entities';
import { Character } from '../models/character.model';
import { ConditionService } from './condition.service';
import { DamageCalculationService } from './damage-calculation.service';
import { ForcedMovementService } from './forced-movement.service';
import { ValidationService } from './validation.service';

@Injectable()
export class ActionDispatcherService {
  constructor(
    private conditionService: ConditionService,
    @Optional() private damageCalc: DamageCalculationService,
    @Optional() private forcedMovement: ForcedMovementService,
    @Optional() private validation: ValidationService,
  ) {}

  /**
   * Apply an action to a target
   * Validates and applies all effects
   */
  async applyAction(
    action: CardAction,
    source: Character,
    targetId?: string,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
      affectedEntities: [],
    };

    try {
      switch (action.type) {
        case 'attack':
          return await this.applyAttackAction(action, source, targetId, gameId);
        case 'move':
          return await this.applyMoveAction(action, source, gameId);
        case 'heal':
          return await this.applyHealAction(action, source, targetId, gameId);
        case 'loot':
          return await this.applyLootAction(action, source, gameId);
        case 'special':
          return await this.applySpecialAction(action, source, gameId);
        case 'summon':
          return await this.applySummonAction(action, source, gameId);
        case 'text':
          // Text actions are informational only
          return result;
        default:
          result.success = false;
          return result;
      }
    } catch (error) {
      result.success = false;
      return result;
    }
  }

  /**
   * Apply modifiers to an action
   * Validates that modifiers are legal and applies them
   */
  async applyModifiers(
    modifiers: Modifier[] = [],
    source: Character,
    target?: Character,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
      affectedEntities: [],
    };

    for (const modifier of modifiers) {
      try {
        switch (modifier.type) {
          case 'condition':
            await this.applyConditionModifier(modifier, target || source, gameId);
            result.appliedModifiers.push(modifier);
            break;

          case 'push':
            if (target && this.forcedMovement) {
              await this.forcedMovement.applyPush(source, target, modifier.distance);
              result.appliedModifiers.push(modifier);
              result.affectedEntities!.push(target.id);
            }
            break;

          case 'pull':
            if (target && this.forcedMovement) {
              await this.forcedMovement.applyPull(source, target, modifier.distance);
              result.appliedModifiers.push(modifier);
              result.affectedEntities!.push(target.id);
            }
            break;

          case 'infuse':
            // Element infusion handled by elemental state service
            result.appliedModifiers.push(modifier);
            break;

          case 'consume':
            // Element consumption handled by elemental state service
            result.appliedModifiers.push(modifier);
            break;

          case 'shield':
            // Shield stored as temporary effect
            await this.applyShieldModifier(modifier, source);
            result.appliedModifiers.push(modifier);
            break;

          case 'retaliate':
            // Retaliate stored as persistent effect
            await this.applyRetaliateModifier(modifier, source);
            result.appliedModifiers.push(modifier);
            break;

          case 'range':
          case 'target':
          case 'pierce':
          case 'aoe':
          case 'jump':
          case 'teleport':
            // Action modifiers (not condition modifiers) - already handled by action handler
            result.appliedModifiers.push(modifier);
            break;

          case 'lost':
          case 'recover':
          case 'discard':
          case 'round':
          case 'persistent':
          case 'xp':
            // Card state modifiers - handled by action handlers
            result.appliedModifiers.push(modifier);
            break;

          case 'heal':
            // Heal modifiers handled by heal action
            result.appliedModifiers.push(modifier);
            break;

          default:
            result.failedModifiers?.push({
              modifier,
              reason: `Unknown modifier type: ${(modifier as Modifier).type}`,
            });
        }
      } catch (error) {
        result.failedModifiers?.push({
          modifier,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Apply an attack action
   */
  private async applyAttackAction(
    action: CardAction & { type: 'attack' },
    source: Character,
    targetId?: string,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
    };

    if (!targetId) {
      result.success = false;
      return result;
    }

    // Validate attacker is not disarmed or stunned - use Character's built-in getters
    if (source.isDisarmed || source.isStunned) {
      result.success = false;
      return result;
    }

    // Apply base damage
    const damage = action.value || 0;
    const modifierResult = await this.applyModifiers(action.modifiers || [], source, undefined, gameId);

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.affectedEntities = [targetId];

    return result;
  }

  /**
   * Apply a move action
   */
  private async applyMoveAction(
    action: CardAction & { type: 'move' },
    source: Character,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
    };

    // Validate character is not immobilized or stunned - use Character's built-in getters
    if (source.isImmobilized || source.isStunned) {
      result.success = false;
      return result;
    }

    // Movement distance is the action value
    const moveDistance = action.value || 0;

    // Apply modifiers (jump, teleport, etc.)
    const modifierResult = await this.applyModifiers(action.modifiers || [], source, undefined, gameId);

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.affectedEntities = [source.id];

    return result;
  }

  /**
   * Apply a heal action
   */
  private async applyHealAction(
    action: CardAction & { type: 'heal' },
    source: Character,
    targetId?: string,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
    };

    const healAmount = action.value || 0;

    // Determine target - if no targetId, heal self
    const isSelfHeal = !targetId;
    const actualTargetId = targetId || source.id;

    // If self heal, apply healing directly
    if (isSelfHeal) {
      source.heal(healAmount);
    }
    // Note: For target heal, the gateway should apply the heal since it has access to the target Character

    // Apply modifiers
    const modifierResult = await this.applyModifiers(action.modifiers || [], source, undefined, gameId);

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.affectedEntities = [actualTargetId];

    return result;
  }

  /**
   * Apply a loot action
   */
  private async applyLootAction(
    action: CardAction & { type: 'loot' },
    source: Character,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
    };

    // Loot action collects tokens in range
    const lootRange = action.value || 1;

    // TODO: Implement loot collection logic

    return result;
  }

  /**
   * Apply a special action
   */
  private async applySpecialAction(
    action: CardAction & { type: 'special' },
    source: Character,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
    };

    // Special actions are modifier-based
    const modifierResult = await this.applyModifiers(action.modifiers || [], source, undefined, gameId);

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.failedModifiers = modifierResult.failedModifiers;
    result.affectedEntities = modifierResult.affectedEntities;

    return result;
  }

  /**
   * Apply a summon action
   */
  private async applySummonAction(
    action: CardAction & { type: 'summon' },
    source: Character,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
    };

    // TODO: Implement summon creation logic

    return result;
  }

  /**
   * Apply condition modifier
   */
  private async applyConditionModifier(
    modifier: Modifier & { type: 'condition' },
    target: Character,
    gameId?: string,
  ): Promise<void> {
    const condition = modifier.condition as Condition;
    const duration = modifier.duration as 'round' | 'persistent' | 'until-consumed';

    await this.conditionService.applyCondition(target, condition, duration);
  }

  /**
   * Apply shield modifier (temporary damage reduction)
   * Delegates to ConditionService for centralized effect management
   */
  private async applyShieldModifier(
    modifier: Modifier & { type: 'shield' },
    target: Character,
  ): Promise<void> {
    this.conditionService.applyShield(target.id, modifier.value, modifier.duration);
  }

  /**
   * Apply retaliate modifier (counter-attack on incoming damage)
   * Delegates to ConditionService for centralized effect management
   */
  private async applyRetaliateModifier(
    modifier: Modifier & { type: 'retaliate' },
    target: Character,
  ): Promise<void> {
    this.conditionService.applyRetaliate(
      target.id,
      modifier.value,
      modifier.range || 1,
      modifier.duration,
    );
  }

}
