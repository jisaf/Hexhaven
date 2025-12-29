/**
 * Action Dispatcher Service
 * Central service for dispatching and applying card actions to game entities
 * Handles effect resolution, validation, and state updates
 *
 * Updated for Issue #220 - works with existing Character model
 */

import { Injectable, Optional } from '@nestjs/common';
import {
  Modifier,
  CardAction,
  EffectApplicationResult,
} from '../../../shared/types/modifiers';
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
  applyAction(
    action: CardAction,
    source: Character,
    targetId?: string,
    gameId?: string,
  ): EffectApplicationResult {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
      affectedEntities: [],
    };

    try {
      switch (action.type) {
        case 'attack':
          return this.applyAttackAction(action, source, targetId, gameId);
        case 'move':
          return this.applyMoveAction(action, source, gameId);
        case 'heal':
          return this.applyHealAction(action, source, targetId, gameId);
        case 'loot':
          return this.applyLootAction(action, source, gameId);
        case 'special':
          return this.applySpecialAction(action, source, gameId);
        case 'summon':
          return this.applySummonAction(action, source, gameId);
        case 'text':
          // Text actions are informational only
          return result;
        default:
          result.success = false;
          return result;
      }
    } catch {
      result.success = false;
      return result;
    }
  }

  /**
   * Apply modifiers to an action
   * Validates that modifiers are legal and applies them
   */
  applyModifiers(
    modifiers: Modifier[] = [],
    source: Character,
    target?: Character,
    gameId?: string,
  ): EffectApplicationResult {
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
            this.applyConditionModifier(modifier, target || source, gameId);
            result.appliedModifiers.push(modifier);
            break;

          case 'push':
            if (target && this.forcedMovement) {
              this.forcedMovement.applyPush(source, target, modifier.distance);
              result.appliedModifiers.push(modifier);
              result.affectedEntities!.push(target.id);
            }
            break;

          case 'pull':
            if (target && this.forcedMovement) {
              this.forcedMovement.applyPull(source, target, modifier.distance);
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
            this.applyShieldModifier(modifier, source);
            result.appliedModifiers.push(modifier);
            break;

          case 'retaliate':
            // Retaliate stored as persistent effect
            this.applyRetaliateModifier(modifier, source);
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
  private applyAttackAction(
    action: CardAction & { type: 'attack' },
    source: Character,
    targetId?: string,
    gameId?: string,
  ): EffectApplicationResult {
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

    // Apply base damage (value used by caller for actual damage application)
    const _damage = action.value || 0;
    const modifierResult = this.applyModifiers(
      action.modifiers || [],
      source,
      undefined,
      gameId,
    );

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.affectedEntities = [targetId];

    return result;
  }

  /**
   * Apply a move action
   */
  private applyMoveAction(
    action: CardAction & { type: 'move' },
    source: Character,
    gameId?: string,
  ): EffectApplicationResult {
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

    // Movement distance is the action value (used by caller for actual movement)
    const _moveDistance = action.value || 0;

    // Apply modifiers (jump, teleport, etc.)
    const modifierResult = this.applyModifiers(
      action.modifiers || [],
      source,
      undefined,
      gameId,
    );

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.affectedEntities = [source.id];

    return result;
  }

  /**
   * Apply a heal action
   */
  private applyHealAction(
    action: CardAction & { type: 'heal' },
    source: Character,
    targetId?: string,
    gameId?: string,
  ): EffectApplicationResult {
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
    const modifierResult = this.applyModifiers(
      action.modifiers || [],
      source,
      undefined,
      gameId,
    );

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.affectedEntities = [actualTargetId];

    return result;
  }

  /**
   * Apply a loot action
   * Validates the character can loot and returns info for the gateway to execute collection.
   * The gateway handles actual loot token lookup and collection based on the range.
   */
  private applyLootAction(
    action: CardAction & { type: 'loot' },
    source: Character,
    gameId?: string,
  ): EffectApplicationResult {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
      affectedEntities: [],
    };

    // Validate character is not stunned (stun prevents all actions)
    if (source.isStunned) {
      result.success = false;
      return result;
    }

    // Loot range from action value (default 1 = adjacent hexes)
    // Range 0 would mean same hex only, range 1 means adjacent, range 2 means 2 hexes away
    const _lootRange = action.value ?? 1;

    // Apply any modifiers on the loot action (XP, lost, etc.)
    const modifierResult = this.applyModifiers(
      action.modifiers || [],
      source,
      undefined,
      gameId,
    );

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.failedModifiers = modifierResult.failedModifiers;
    result.affectedEntities = [source.id];

    return result;
  }

  /**
   * Apply a special action
   */
  private applySpecialAction(
    action: CardAction & { type: 'special' },
    source: Character,
    gameId?: string,
  ): EffectApplicationResult {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
    };

    // Special actions are modifier-based
    const modifierResult = this.applyModifiers(
      action.modifiers || [],
      source,
      undefined,
      gameId,
    );

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.failedModifiers = modifierResult.failedModifiers;
    result.affectedEntities = modifierResult.affectedEntities;

    return result;
  }

  /**
   * Apply a summon action
   * Validates the character can summon and returns info for the gateway to create the summon.
   * The gateway handles actual summon creation, placement selection, and turn order integration.
   */
  private applySummonAction(
    action: CardAction & { type: 'summon' },
    source: Character,
    gameId?: string,
  ): EffectApplicationResult {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
      affectedEntities: [],
    };

    // Validate character is not stunned (stun prevents all actions)
    if (source.isStunned) {
      result.success = false;
      return result;
    }

    // Summon action does not require movement (can summon while immobilized)
    // Summon action is not an attack (can summon while disarmed)

    // Apply any modifiers on the summon action (lost, xp, infuse, etc.)
    const modifierResult = this.applyModifiers(
      action.modifiers || [],
      source,
      undefined,
      gameId,
    );

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.failedModifiers = modifierResult.failedModifiers;
    result.affectedEntities = [source.id];

    // The gateway will:
    // 1. Prompt player for placement hex selection
    // 2. Create the Summon entity using action.summon definition
    // 3. Add summon to turn order (before owner, same initiative)
    // 4. Emit summon_created event

    return result;
  }

  /**
   * Apply condition modifier
   */
  private applyConditionModifier(
    modifier: Modifier & { type: 'condition' },
    target: Character,
    _gameId?: string,
  ): void {
    const condition = modifier.condition;
    const duration = modifier.duration;

    this.conditionService.applyCondition(target, condition, duration);
  }

  /**
   * Apply shield modifier (temporary damage reduction)
   * Delegates to ConditionService for centralized effect management
   */
  private applyShieldModifier(
    modifier: Modifier & { type: 'shield' },
    target: Character,
  ): void {
    this.conditionService.applyShield(
      target.id,
      modifier.value,
      modifier.duration,
    );
  }

  /**
   * Apply retaliate modifier (counter-attack on incoming damage)
   * Delegates to ConditionService for centralized effect management
   */
  private applyRetaliateModifier(
    modifier: Modifier & { type: 'retaliate' },
    target: Character,
  ): void {
    this.conditionService.applyRetaliate(
      target.id,
      modifier.value,
      modifier.range || 1,
      modifier.duration,
    );
  }
}
