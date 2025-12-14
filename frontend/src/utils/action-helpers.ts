/**
 * Action Helper Utilities
 *
 * Shared helper functions for extracting and formatting action data
 * from the modifier-based card action format (Issue #220).
 */

import type {
  Action,
  Modifier,
  InfuseModifier,
  ConsumeModifier,
} from '../../../shared/types/entities';

/**
 * Get infuse modifier from action modifiers
 */
export function getInfuseModifier(modifiers: Modifier[] = []): InfuseModifier | undefined {
  return modifiers.find((m): m is InfuseModifier => m.type === 'infuse');
}

/**
 * Get consume modifier from action modifiers
 */
export function getConsumeModifier(modifiers: Modifier[] = []): ConsumeModifier | undefined {
  return modifiers.find((m): m is ConsumeModifier => m.type === 'consume');
}

/**
 * Extract action value based on action type
 */
export function getActionValue(action: Action): number | undefined {
  if (action.type === 'attack' || action.type === 'move' || action.type === 'heal') {
    return action.value;
  }
  if (action.type === 'loot') {
    return action.value;
  }
  return undefined;
}

/**
 * Convert modifiers to display-friendly effect strings
 */
export function getEffectStrings(modifiers: Modifier[] = []): string[] {
  const effects: string[] = [];

  for (const mod of modifiers) {
    switch (mod.type) {
      case 'push':
        effects.push(`Push ${mod.distance}`);
        break;
      case 'pull':
        effects.push(`Pull ${mod.distance}`);
        break;
      case 'pierce':
        effects.push(`Pierce ${mod.value}`);
        break;
      case 'condition':
        effects.push(mod.condition.charAt(0).toUpperCase() + mod.condition.slice(1));
        break;
      case 'shield':
        effects.push(`Shield ${mod.value}`);
        break;
      case 'retaliate':
        effects.push(`Retaliate ${mod.value}`);
        break;
      case 'jump':
        effects.push('Jump');
        break;
      case 'target':
        effects.push(`Target ${mod.count}`);
        break;
      case 'aoe':
        effects.push(`${mod.pattern} ${mod.size}`);
        break;
      // Skip these as they're shown elsewhere
      case 'range':
      case 'infuse':
      case 'consume':
      case 'lost':
      case 'persistent':
      case 'round':
      case 'xp':
        break;
      default:
        break;
    }
  }

  return effects;
}
