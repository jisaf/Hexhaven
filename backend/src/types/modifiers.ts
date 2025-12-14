/**
 * Modifier Type Definitions for Card Actions
 * Defines structured types for all action modifiers and effects in Gloomhaven
 * Replaces legacy string-based effects with typed, validated structures
 */

import { Condition, ElementType } from '../../../shared/types/entities';

// ========== ATTACK MODIFIERS ==========

export interface RangeModifier {
  type: 'range';
  distance: number; // Hexes away target can be
}

export interface TargetModifier {
  type: 'target';
  count: number; // Number of separate targets
}

export interface PierceModifier {
  type: 'pierce';
  value: number; // Ignore X shield
}

export interface AreaOfEffectModifier {
  type: 'aoe';
  pattern: 'triangle' | 'line' | 'burst' | 'cone'; // AoE shape
  size: number; // Radius or extent
}

// ========== MOVEMENT MODIFIERS ==========

export interface JumpModifier {
  type: 'jump';
  // Allows ignoring hexes with enemies/obstacles/traps
}

export interface TeleportModifier {
  type: 'teleport';
  range?: number; // Optional: teleport distance (default = move distance)
}

// ========== FORCED MOVEMENT ==========

export interface PushModifier {
  type: 'push';
  distance: number; // Hexes to push
  direction?: 'away' | 'towards'; // Default 'away' from attacker
}

export interface PullModifier {
  type: 'pull';
  distance: number; // Hexes to pull
}

// ========== ELEMENT MODIFIERS ==========

export interface InfuseModifier {
  type: 'infuse';
  element: ElementType;
  state: 'generate' | 'generate-after'; // Generate now or after turn
}

export interface ConsumeModifier {
  type: 'consume';
  element: ElementType;
  bonus: {
    effect: 'damage' | 'heal' | 'move' | 'range' | 'custom';
    value: number;
  };
}

// ========== CONDITION MODIFIERS ==========

export interface ConditionModifier {
  type: 'condition';
  condition: Condition;
  duration: 'round' | 'persistent' | 'until-consumed';
  target?: 'self' | 'target' | 'allies' | 'enemies'; // Default depends on condition type
}

// ========== DURATION MODIFIERS ==========

export interface RoundModifier {
  type: 'round';
  // Effect lasts until end of character's next turn
}

export interface PersistentModifier {
  type: 'persistent';
  // Effect lasts for rest of scenario (until card lost)
}

// ========== CARD STATE MODIFIERS ==========

export interface LostModifier {
  type: 'lost';
  // Card goes to lost pile after use (burn)
}

export interface RecoverModifier {
  type: 'recover';
  cardCount: number; // Return X cards from lost pile to hand
}

export interface DiscardModifier {
  type: 'discard';
  cardCount: number; // Return X cards from lost pile to discard pile
}

// ========== SPECIAL MODIFIERS ==========

export interface ShieldModifier {
  type: 'shield';
  value: number; // Reduce damage by X
  duration: 'round' | 'persistent';
}

export interface RetaliateModifier {
  type: 'retaliate';
  value: number; // Damage dealt to attackers
  range?: number; // Hex range (default = adjacent)
  duration: 'round' | 'persistent';
}

export interface HealModifier {
  type: 'heal';
  value: number;
  range?: number; // Range in hexes
  target?: 'self' | 'allies' | 'other'; // Who can be healed
  elementBonus?: number; // Additional heal if element is consumed
}

export interface XPModifier {
  type: 'xp';
  value: number; // Experience points awarded
}

// ========== EFFECT TYPES UNION ==========

export type Modifier =
  | RangeModifier
  | TargetModifier
  | PierceModifier
  | AreaOfEffectModifier
  | JumpModifier
  | TeleportModifier
  | PushModifier
  | PullModifier
  | InfuseModifier
  | ConsumeModifier
  | ConditionModifier
  | RoundModifier
  | PersistentModifier
  | LostModifier
  | RecoverModifier
  | DiscardModifier
  | ShieldModifier
  | RetaliateModifier
  | HealModifier
  | XPModifier;

// ========== ACTION TYPES ==========

export interface AttackAction {
  type: 'attack';
  value: number; // Base attack damage
  modifiers?: Modifier[];
}

export interface MoveAction {
  type: 'move';
  value: number; // Base movement distance
  modifiers?: Modifier[];
}

export interface HealAction {
  type: 'heal';
  value: number; // Base heal amount
  modifiers?: Modifier[];
}

export interface LootAction {
  type: 'loot';
  value?: number; // Number of loot tokens to collect (or range to collect from)
  modifiers?: Modifier[];
}

export interface SpecialAction {
  type: 'special';
  modifiers?: Modifier[]; // Special actions are effect-based
}

export interface SummonAction {
  type: 'summon';
  summon: SummonDefinition;
  modifiers?: Modifier[];
}

export interface TextAction {
  type: 'text';
  title: string;
  description: string;
  quote?: string;
}

export type CardAction =
  | AttackAction
  | MoveAction
  | HealAction
  | LootAction
  | SpecialAction
  | SummonAction
  | TextAction;

// ========== SUMMON DEFINITION ==========

export interface SummonDefinition {
  name: string;
  health: number;
  attack: number;
  move: number;
  range: number;
  typeIcon: string; // Emoji or icon
  modifiers?: Modifier[]; // Summon's abilities
}

// ========== EFFECT APPLICATION RESULT ==========

export interface EffectApplicationResult {
  success: boolean;
  appliedModifiers: Modifier[];
  failedModifiers?: { modifier: Modifier; reason: string }[];
  affectedEntities?: string[]; // Entity IDs affected
}

// ========== HELPERS ==========

/**
 * Extract range from modifiers
 */
export function getRange(modifiers: Modifier[] = []): number {
  const rangeModifier = modifiers.find((m) => m.type === 'range') as RangeModifier | undefined;
  return rangeModifier?.distance ?? 0;
}

/**
 * Check if action has jump modifier
 */
export function hasJump(modifiers: Modifier[] = []): boolean {
  return modifiers.some((m) => m.type === 'jump');
}

/**
 * Check if action pushes targets
 */
export function getPush(modifiers: Modifier[] = []): PushModifier | undefined {
  return modifiers.find((m) => m.type === 'push') as PushModifier | undefined;
}

/**
 * Check if action pulls targets
 */
export function getPull(modifiers: Modifier[] = []): PullModifier | undefined {
  return modifiers.find((m) => m.type === 'pull') as PullModifier | undefined;
}

/**
 * Get all conditions from modifiers
 */
export function getConditions(modifiers: Modifier[] = []): ConditionModifier[] {
  return modifiers.filter((m) => m.type === 'condition') as ConditionModifier[];
}

/**
 * Check if modifier is lost (burn) action
 */
export function isLostAction(modifiers: Modifier[] = []): boolean {
  return modifiers.some((m) => m.type === 'lost');
}

/**
 * Check if modifier is persistent
 */
export function isPersistent(modifiers: Modifier[] = []): boolean {
  return modifiers.some((m) => m.type === 'persistent');
}

/**
 * Get XP value from modifiers
 */
export function getXPValue(modifiers: Modifier[] = []): number {
  const xpMod = modifiers.find((m) => m.type === 'xp') as XPModifier | undefined;
  return xpMod?.value ?? 0;
}
