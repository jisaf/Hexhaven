/**
 * Action Dispatcher Service
 * Central service for dispatching and applying card actions to game entities
 * Handles effect resolution, validation, and state updates
 */

import { Injectable } from '@nestjs/common';
import { Modifier, CardAction, EffectApplicationResult } from '../types/modifiers';
import { Condition } from '../../../shared/types/entities';
import { Character } from '../models/character.model';
import { GameStateManager } from './game-state.service';
import { ConditionService } from './condition.service';
import { DamageCalculationService } from './damage-calculation.service';
import { ForcedMovementService } from './forced-movement.service';
import { ValidationService } from './validation.service';

@Injectable()
export class ActionDispatcherService {
  constructor(
    private gameState: GameStateManager,
    private conditionService: ConditionService,
    private damageCalc: DamageCalculationService,
    private forcedMovement: ForcedMovementService,
    private validation: ValidationService,
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
            await this.forcedMovement.applyPush(source, target, modifier.distance);
            result.appliedModifiers.push(modifier);
            if (target) result.affectedEntities.push(target.id);
            break;

          case 'pull':
            await this.forcedMovement.applyPull(source, target, modifier.distance);
            result.appliedModifiers.push(modifier);
            if (target) result.affectedEntities.push(target.id);
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
            // Shield stored as temporary condition
            await this.applyShieldModifier(modifier, source, gameId);
            result.appliedModifiers.push(modifier);
            break;

          case 'retaliate':
            // Retaliate stored as persistent condition
            await this.applyRetaliateModifier(modifier, source, gameId);
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
              reason: `Unknown modifier type: ${(modifier as any).type}`,
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
    action: any,
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

    // Validate attacker is not disarmed or stunned
    if (source.conditions.has(Condition.DISARM) || source.conditions.has(Condition.STUN)) {
      result.success = false;
      return result;
    }

    // Get target
    const target = await this.gameState.getEntity(targetId);
    if (!target) {
      result.success = false;
      return result;
    }

    // Apply base damage
    const damage = action.value || 0;
    const modifierResult = await this.applyModifiers(action.modifiers || [], source, target, gameId);

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.affectedEntities = [targetId];

    return result;
  }

  /**
   * Apply a move action
   */
  private async applyMoveAction(
    action: any,
    source: Character,
    gameId?: string,
  ): Promise<EffectApplicationResult> {
    const result: EffectApplicationResult = {
      success: true,
      appliedModifiers: [],
      failedModifiers: [],
    };

    // Validate character is not immobilized or stunned
    if (source.conditions.has(Condition.IMMOBILIZE) || source.conditions.has(Condition.STUN)) {
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
    action: any,
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

    // Determine target - can be self or another character
    let target: Character | undefined;
    if (targetId) {
      target = await this.gameState.getEntity(targetId);
    } else {
      // Default to self
      target = source;
    }

    if (!target) {
      result.success = false;
      return result;
    }

    // Apply modifiers
    const modifierResult = await this.applyModifiers(action.modifiers || [], source, target, gameId);

    result.appliedModifiers = modifierResult.appliedModifiers;
    result.affectedEntities = [target.id];

    return result;
  }

  /**
   * Apply a loot action
   */
  private async applyLootAction(
    action: any,
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
    action: any,
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
    action: any,
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
  private async applyConditionModifier(modifier: any, target: Character, gameId?: string): Promise<void> {
    const condition = modifier.condition as Condition;
    const duration = modifier.duration as 'round' | 'persistent' | 'until-consumed';

    await this.conditionService.applyCondition(target, condition, duration);
  }

  /**
   * Apply shield modifier (temporary damage reduction)
   */
  private async applyShieldModifier(modifier: any, target: Character, gameId?: string): Promise<void> {
    // Shield creates a temporary condition that reduces damage
    // Stored as metadata on character
    target.metadata = target.metadata || {};
    target.metadata.shield = {
      value: modifier.value,
      appliedAt: new Date(),
      duration: modifier.duration,
    };
  }

  /**
   * Apply retaliate modifier (counter-attack on incoming damage)
   */
  private async applyRetaliateModifier(modifier: any, target: Character, gameId?: string): Promise<void> {
    // Retaliate creates a persistent effect that triggers on incoming attacks
    target.metadata = target.metadata || {};
    target.metadata.retaliate = {
      value: modifier.value,
      range: modifier.range || 1,
      appliedAt: new Date(),
      duration: modifier.duration,
    };
  }
}
