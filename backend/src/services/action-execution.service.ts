/**
 * Action Execution Service (Issue #411)
 *
 * Unified action execution system that:
 * - Reads action definitions from ability cards
 * - Validates action execution per Gloomhaven rules
 * - Coordinates with ActionDispatcherService for effect application
 * - Returns comprehensive action results
 *
 * This service replaces the hardcoded move/attack paradigm with a flexible
 * system that can handle any action type defined on cards.
 */

import { Injectable } from '@nestjs/common';
import { AbilityCardService } from './ability-card.service';
import { ActionDispatcherService } from './action-dispatcher.service';
import { Character } from '../models/character.model';
import type {
  CardAction,
  SummonDefinition,
  Modifier,
} from '../../../shared/types/modifiers';
import type { AbilityCardData } from '../models/ability-card.model';

/**
 * Result of an action execution
 */
export interface ActionExecutionResult {
  success: boolean;
  error?: string;
  cardId: string;
  actionPosition: 'top' | 'bottom';
  actionType: CardAction['type'];
  actionValue?: number;
  modifiers?: Modifier[];
  affectedEntities?: string[];
  summonDefinition?: SummonDefinition;
}

/**
 * Validation result for action execution
 */
export interface ActionValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Context for action execution
 */
export interface ActionExecutionContext {
  roomCode: string;
  targetId?: string;
  targetHex?: { q: number; r: number };
}

@Injectable()
export class ActionExecutionService {
  constructor(
    private readonly abilityCardService: AbilityCardService,
    private readonly actionDispatcher: ActionDispatcherService,
  ) {}

  /**
   * Execute a card action for a character
   *
   * This is the main entry point for the unified action execution system.
   * It reads the action from the card, validates execution is allowed,
   * applies the action through the dispatcher, and returns a result.
   *
   * @param character - The character executing the action
   * @param cardId - ID of the ability card
   * @param actionPosition - Which half of the card ('top' or 'bottom')
   * @param context - Execution context (room, target, etc.)
   * @returns ActionExecutionResult with success status and details
   */
  async executeAction(
    character: Character,
    cardId: string,
    actionPosition: 'top' | 'bottom',
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult> {
    // Validate that the action can be executed
    const validation = this.validateActionExecution(
      character,
      cardId,
      actionPosition,
    );
    if (!validation.valid) {
      return {
        success: false,
        error: `Action cannot execute: ${validation.reason}`,
        cardId,
        actionPosition,
        actionType: 'special', // Default type for failed execution
      };
    }

    // Retrieve the card and action
    const card = await this.abilityCardService.getCardById(cardId);
    if (!card) {
      return {
        success: false,
        error: `Card not found: ${cardId}`,
        cardId,
        actionPosition,
        actionType: 'special',
      };
    }

    const action = this.getActionFromCardData(card, actionPosition);
    if (!action) {
      return {
        success: false,
        error: `Action not found on card ${cardId} at position ${actionPosition}`,
        cardId,
        actionPosition,
        actionType: 'special',
      };
    }

    // Execute the action through the dispatcher
    const dispatchResult = this.actionDispatcher.applyAction(
      action,
      character,
      context.targetId,
      context.roomCode,
    );

    if (!dispatchResult.success) {
      return {
        success: false,
        error: 'Action execution failed',
        cardId,
        actionPosition,
        actionType: action.type,
        actionValue: this.getActionValue(action),
        modifiers: action.modifiers,
      };
    }

    // Record the executed action on the character
    character.addExecutedAction(cardId, actionPosition);

    // Build the result
    const result: ActionExecutionResult = {
      success: true,
      cardId,
      actionPosition,
      actionType: action.type,
      actionValue: this.getActionValue(action),
      modifiers: action.modifiers,
      affectedEntities: dispatchResult.affectedEntities,
    };

    // Include summon definition for summon actions
    if (action.type === 'summon' && 'summon' in action) {
      result.summonDefinition = action.summon;
    }

    return result;
  }

  /**
   * Get the action from a card by ID and position
   *
   * @param cardId - The ability card ID
   * @param position - 'top' or 'bottom'
   * @returns The CardAction or null if not found
   */
  async getActionFromCard(
    cardId: string,
    position: 'top' | 'bottom',
  ): Promise<CardAction | null> {
    const card = await this.abilityCardService.getCardById(cardId);
    if (!card) {
      return null;
    }
    return this.getActionFromCardData(card, position);
  }

  /**
   * Validate whether an action can be executed
   *
   * Checks:
   * - Character has selected cards
   * - Card is one of the selected cards
   * - Action hasn't already been executed
   * - Follows the opposite card/half rule for second action
   * - Maximum 2 actions per turn
   *
   * @param character - The character attempting the action
   * @param cardId - The card to execute
   * @param actionPosition - Which half of the card
   * @returns Validation result with reason if invalid
   */
  validateActionExecution(
    character: Character,
    cardId: string,
    actionPosition: 'top' | 'bottom',
  ): ActionValidationResult {
    // Check if cards are selected
    const selectedCardIds = character.selectedCardIds;
    if (!selectedCardIds || selectedCardIds.length !== 2) {
      return {
        valid: false,
        reason: 'No cards selected for this round',
      };
    }

    // Check if the card is one of the selected cards
    if (!selectedCardIds.includes(cardId)) {
      return {
        valid: false,
        reason: `Card ${cardId} is not one of the selected cards`,
      };
    }

    const executedActions = character.executedActionsThisTurn;

    // Check maximum actions
    if (executedActions.length >= 2) {
      return {
        valid: false,
        reason: 'Maximum actions (2) already executed this turn',
      };
    }

    // Check if this exact action was already executed
    const alreadyExecuted = executedActions.some(
      (action) =>
        action.cardId === cardId && action.actionPosition === actionPosition,
    );
    if (alreadyExecuted) {
      return {
        valid: false,
        reason: `Action ${cardId}:${actionPosition} has already been executed`,
      };
    }

    // For second action, check the opposite card/half rule
    if (executedActions.length === 1) {
      const firstAction = executedActions[0];
      const isOppositeCard = cardId !== firstAction.cardId;
      const isOppositePosition = actionPosition !== firstAction.actionPosition;

      if (!isOppositeCard) {
        return {
          valid: false,
          reason:
            'Second action must be from the opposite card (Gloomhaven rule)',
        };
      }

      if (!isOppositePosition) {
        return {
          valid: false,
          reason:
            'Second action must be from the opposite position (Gloomhaven rule)',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get the action from card data by position
   */
  private getActionFromCardData(
    card: { topAction: CardAction; bottomAction: CardAction },
    position: 'top' | 'bottom',
  ): CardAction | null {
    if (position === 'top') {
      return card.topAction || null;
    }
    return card.bottomAction || null;
  }

  /**
   * Extract the numeric value from an action (for move, attack, heal, loot)
   */
  private getActionValue(action: CardAction): number | undefined {
    if ('value' in action) {
      return action.value;
    }
    return undefined;
  }
}
