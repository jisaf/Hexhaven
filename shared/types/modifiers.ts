/**
 * Shared Modifier Type Definitions for Card Actions
 * Used by both frontend and backend for type-safe card handling
 */

import { Condition, ElementType } from './entities';

// ========== BASE MODIFIER TYPES ==========

export interface RangeModifier {
  type: 'range';
  distance: number;
}

export interface TargetModifier {
  type: 'target';
  count: number;
}

export interface PierceModifier {
  type: 'pierce';
  value: number;
}

export interface AreaOfEffectModifier {
  type: 'aoe';
  pattern: 'triangle' | 'line' | 'burst' | 'cone';
  size: number;
}

export interface JumpModifier {
  type: 'jump';
}

export interface TeleportModifier {
  type: 'teleport';
  range?: number;
}

export interface PushModifier {
  type: 'push';
  distance: number;
  direction?: 'away' | 'towards';
}

export interface PullModifier {
  type: 'pull';
  distance: number;
}

export interface InfuseModifier {
  type: 'infuse';
  element: ElementType;
  state: 'generate' | 'generate-after';
}

export interface ConsumeModifier {
  type: 'consume';
  element: ElementType;
  bonus: {
    effect: 'damage' | 'heal' | 'move' | 'range' | 'custom';
    value: number;
  };
}

export interface ConditionModifier {
  type: 'condition';
  condition: Condition;
  duration: 'round' | 'persistent' | 'until-consumed';
  target?: 'self' | 'target' | 'allies' | 'enemies';
}

export interface RoundModifier {
  type: 'round';
}

export interface PersistentModifier {
  type: 'persistent';
}

export interface LostModifier {
  type: 'lost';
}

export interface RecoverModifier {
  type: 'recover';
  cardCount: number;
}

export interface DiscardModifier {
  type: 'discard';
  cardCount: number;
}

export interface ShieldModifier {
  type: 'shield';
  value: number;
  duration: 'round' | 'persistent';
}

export interface RetaliateModifier {
  type: 'retaliate';
  value: number;
  range?: number;
  duration: 'round' | 'persistent';
}

export interface HealModifier {
  type: 'heal';
  value: number;
  range?: number;
  target?: 'self' | 'allies' | 'other';
  elementBonus?: number;
}

export interface XPModifier {
  type: 'xp';
  value: number;
}

// ========== MODIFIER UNION ==========

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

// ========== SUMMON DEFINITION ==========

export interface SummonDefinition {
  name: string;
  health: number;
  attack: number;
  move: number;
  range: number;
  typeIcon?: string;
  modifiers?: Modifier[];
  playerControlled?: boolean; // If true, player controls instead of AI
  initiative?: number; // For scenario allies; player summons copy owner's initiative
}

// ========== CARD ACTION TYPES ==========

export interface BaseAction {
  modifiers?: Modifier[];
}

export interface AttackAction extends BaseAction {
  type: 'attack';
  value: number;
  requirement?: string;
}

export interface MoveAction extends BaseAction {
  type: 'move';
  value: number;
  special?: string;
}

export interface HealAction extends BaseAction {
  type: 'heal';
  value: number;
  target?: string;
}

export interface LootAction extends BaseAction {
  type: 'loot';
  value?: number;
}

export interface SpecialAction extends BaseAction {
  type: 'special';
  special?: string;
  xpOnKill?: number;
}

export interface SummonAction extends BaseAction {
  type: 'summon';
  summon: SummonDefinition;
}

export interface TextAction extends BaseAction {
  type: 'text';
  title?: string;
  description?: string;
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

// ========== HELPER FUNCTIONS ==========

export function getRange(modifiers: Modifier[] = []): number {
  const rangeModifier = modifiers.find((m) => m.type === 'range') as RangeModifier | undefined;
  return rangeModifier?.distance ?? 0;
}

export function hasJump(modifiers: Modifier[] = []): boolean {
  return modifiers.some((m) => m.type === 'jump');
}

export function getPush(modifiers: Modifier[] = []): PushModifier | undefined {
  return modifiers.find((m) => m.type === 'push') as PushModifier | undefined;
}

export function getPull(modifiers: Modifier[] = []): PullModifier | undefined {
  return modifiers.find((m) => m.type === 'pull') as PullModifier | undefined;
}

export function getConditions(modifiers: Modifier[] = []): ConditionModifier[] {
  return modifiers.filter((m) => m.type === 'condition') as ConditionModifier[];
}

export function isLostAction(modifiers: Modifier[] = []): boolean {
  return modifiers.some((m) => m.type === 'lost');
}

export function isPersistent(modifiers: Modifier[] = []): boolean {
  return modifiers.some((m) => m.type === 'persistent');
}

export function getXPValue(modifiers: Modifier[] = []): number {
  const xpMod = modifiers.find((m) => m.type === 'xp') as XPModifier | undefined;
  return xpMod?.value ?? 0;
}

export function getShield(modifiers: Modifier[] = []): ShieldModifier | undefined {
  return modifiers.find((m) => m.type === 'shield') as ShieldModifier | undefined;
}

export function getRetaliate(modifiers: Modifier[] = []): RetaliateModifier | undefined {
  return modifiers.find((m) => m.type === 'retaliate') as RetaliateModifier | undefined;
}

export function getInfuseModifiers(modifiers: Modifier[] = []): InfuseModifier[] {
  return modifiers.filter((m) => m.type === 'infuse') as InfuseModifier[];
}

export function getInfuseModifier(modifiers: Modifier[] = []): InfuseModifier | undefined {
  return modifiers.find((m): m is InfuseModifier => m.type === 'infuse');
}

export function getConsumeModifiers(modifiers: Modifier[] = []): ConsumeModifier[] {
  return modifiers.filter((m) => m.type === 'consume') as ConsumeModifier[];
}

export function getConsumeModifier(modifiers: Modifier[] = []): ConsumeModifier | undefined {
  return modifiers.find((m): m is ConsumeModifier => m.type === 'consume');
}

export function getPierce(modifiers: Modifier[] = []): PierceModifier | undefined {
  return modifiers.find((m) => m.type === 'pierce') as PierceModifier | undefined;
}

export function getTarget(modifiers: Modifier[] = []): TargetModifier | undefined {
  return modifiers.find((m) => m.type === 'target') as TargetModifier | undefined;
}

export function getAoE(modifiers: Modifier[] = []): AreaOfEffectModifier | undefined {
  return modifiers.find((m) => m.type === 'aoe') as AreaOfEffectModifier | undefined;
}

// ========== EFFECT APPLICATION RESULT ==========

export interface EffectApplicationResult {
  success: boolean;
  appliedModifiers: Modifier[];
  failedModifiers?: { modifier: Modifier; reason: string }[];
  affectedEntities?: string[]; // Entity IDs affected
}
