/**
 * Narrative Service
 *
 * Manages campaign narrative system:
 * - Loading narrative definitions from database
 * - Tracking active narratives and player acknowledgments
 * - Checking trigger conditions
 * - Applying game effects
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { NarrativeConditionService } from './narrative-condition.service';
import { v4 as uuidv4 } from 'uuid';
import type {
  ScenarioNarrativeDef,
  NarrativeTriggerDef,
  NarrativeCondition,
  NarrativeContent,
  NarrativeRewards,
  NarrativeGameEffects,
  NarrativeGameContext,
  ActiveNarrative,
  TriggerState,
  NarrativeConditionType,
  ConditionOperator,
} from '../../../shared/types/narrative';

// ========== RUNTIME VALIDATION HELPERS ==========

const VALID_CONDITION_TYPES: Set<NarrativeConditionType> = new Set([
  'character_on_hex',
  'characters_on_hexes',
  'monsters_killed',
  'round_reached',
  'all_enemies_dead',
  'treasure_collected',
  'door_opened',
  'loot_collected',
]);

const VALID_OPERATORS: Set<ConditionOperator> = new Set(['AND', 'OR']);

/**
 * Type guard for condition objects
 */
function isConditionObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Recursively validate and parse a narrative condition
 */
function validateCondition(
  json: unknown,
  triggerId: string,
  depth = 0,
): NarrativeCondition {
  if (depth > 10) {
    throw new Error(
      `Condition nesting too deep in trigger ${triggerId} (max 10 levels)`,
    );
  }

  if (!isConditionObject(json)) {
    throw new Error(
      `Invalid condition in trigger ${triggerId}: expected object, got ${typeof json}`,
    );
  }

  // Check for compound condition (AND/OR)
  if ('operator' in json && 'conditions' in json) {
    const operator = json.operator;
    const conditions = json.conditions;

    if (!VALID_OPERATORS.has(operator as ConditionOperator)) {
      throw new Error(
        `Invalid operator "${String(operator)}" in trigger ${triggerId}`,
      );
    }

    if (!Array.isArray(conditions)) {
      throw new Error(`Conditions must be an array in trigger ${triggerId}`);
    }

    return {
      operator: operator as ConditionOperator,
      conditions: conditions.map((c) =>
        validateCondition(c, triggerId, depth + 1),
      ),
    };
  }

  // Leaf condition
  if (!('type' in json)) {
    throw new Error(`Missing condition type in trigger ${triggerId}`);
  }

  const type = json.type;
  if (!VALID_CONDITION_TYPES.has(type as NarrativeConditionType)) {
    throw new Error(
      `Invalid condition type "${String(type)}" in trigger ${triggerId}`,
    );
  }

  // Return validated condition - type is correct, params can vary
  // Cast through unknown to satisfy TypeScript's strict type checking
  return json as unknown as NarrativeCondition;
}

/**
 * Validate rewards structure
 */
function validateRewards(
  json: unknown,
  triggerId: string,
): NarrativeRewards | undefined {
  if (json === null || json === undefined) return undefined;

  if (!isConditionObject(json)) {
    throw new Error(`Invalid rewards in trigger ${triggerId}: expected object`);
  }

  const rewards: NarrativeRewards = {};

  if ('gold' in json) {
    if (typeof json.gold !== 'number') {
      throw new Error(
        `Invalid rewards.gold in trigger ${triggerId}: expected number`,
      );
    }
    rewards.gold = json.gold;
  }

  if ('xp' in json) {
    if (typeof json.xp !== 'number') {
      throw new Error(
        `Invalid rewards.xp in trigger ${triggerId}: expected number`,
      );
    }
    rewards.xp = json.xp;
  }

  if ('items' in json) {
    if (
      !Array.isArray(json.items) ||
      !json.items.every((i) => typeof i === 'string')
    ) {
      throw new Error(
        `Invalid rewards.items in trigger ${triggerId}: expected string array`,
      );
    }
    rewards.items = json.items;
  }

  return rewards;
}

/**
 * Validate hex coordinates
 */
function isValidHex(obj: unknown): boolean {
  return (
    isConditionObject(obj) &&
    typeof obj.q === 'number' &&
    typeof obj.r === 'number'
  );
}

/**
 * Validate game effects structure
 */
function validateGameEffects(
  json: unknown,
  triggerId: string,
): NarrativeGameEffects | undefined {
  if (json === null || json === undefined) return undefined;

  if (!isConditionObject(json)) {
    throw new Error(
      `Invalid gameEffects in trigger ${triggerId}: expected object`,
    );
  }

  const effects: NarrativeGameEffects = {};

  if ('spawnMonsters' in json) {
    if (!Array.isArray(json.spawnMonsters)) {
      throw new Error(
        `Invalid gameEffects.spawnMonsters in trigger ${triggerId}`,
      );
    }
    effects.spawnMonsters = json.spawnMonsters.map((m, i) => {
      if (
        !isConditionObject(m) ||
        typeof m.type !== 'string' ||
        !isValidHex(m.hex)
      ) {
        throw new Error(
          `Invalid monster spawn at index ${i} in trigger ${triggerId}`,
        );
      }
      return {
        type: m.type,
        hex: m.hex as { q: number; r: number },
        isElite: typeof m.isElite === 'boolean' ? m.isElite : undefined,
      };
    });
  }

  if ('unlockDoors' in json) {
    if (
      !Array.isArray(json.unlockDoors) ||
      !json.unlockDoors.every(isValidHex)
    ) {
      throw new Error(
        `Invalid gameEffects.unlockDoors in trigger ${triggerId}`,
      );
    }
    effects.unlockDoors = json.unlockDoors as { q: number; r: number }[];
  }

  if ('revealHexes' in json) {
    if (
      !Array.isArray(json.revealHexes) ||
      !json.revealHexes.every(isValidHex)
    ) {
      throw new Error(
        `Invalid gameEffects.revealHexes in trigger ${triggerId}`,
      );
    }
    effects.revealHexes = json.revealHexes as { q: number; r: number }[];
  }

  return effects;
}

/**
 * Default timeout for narrative acknowledgment (60 seconds)
 */
const DEFAULT_NARRATIVE_TIMEOUT_MS = 60000;

/**
 * Maximum queued narratives per room
 */
const MAX_QUEUED_NARRATIVES = 3;

@Injectable()
export class NarrativeService {
  private readonly logger = new Logger(NarrativeService.name);

  /**
   * Cache of loaded scenario narratives
   * Key: scenarioId
   */
  private readonly narrativeCache = new Map<
    string,
    ScenarioNarrativeDef | null
  >();

  /**
   * Currently active narrative per room
   * Key: roomCode
   */
  private readonly roomActiveNarrative = new Map<
    string,
    ActiveNarrative | null
  >();

  /**
   * Trigger states per room (which triggers have fired)
   * Key: roomCode, Value: Map of triggerId -> TriggerState
   */
  private readonly roomTriggerStates = new Map<
    string,
    Map<string, TriggerState>
  >();

  /**
   * Queued narratives waiting to be displayed (max 3 per room)
   * Key: roomCode
   */
  private readonly roomNarrativeQueue = new Map<string, ActiveNarrative[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionService: NarrativeConditionService,
  ) {}

  /**
   * Load scenario narrative from database
   * Includes intro, victory, defeat, and all triggers
   */
  async loadScenarioNarrative(
    scenarioId: string,
  ): Promise<ScenarioNarrativeDef | null> {
    // Check cache first
    if (this.narrativeCache.has(scenarioId)) {
      return this.narrativeCache.get(scenarioId) ?? null;
    }

    try {
      const narrative = await this.prisma.scenarioNarrative.findUnique({
        where: { scenarioId },
        include: {
          triggers: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      if (!narrative) {
        this.narrativeCache.set(scenarioId, null);
        return null;
      }

      // Transform database model to domain type
      const narrativeDef: ScenarioNarrativeDef = {
        scenarioId,
        intro: narrative.introText
          ? {
              title: narrative.introTitle ?? undefined,
              text: narrative.introText,
              imageUrl: narrative.introImageUrl ?? undefined,
            }
          : undefined,
        victory: narrative.victoryText
          ? {
              title: narrative.victoryTitle ?? undefined,
              text: narrative.victoryText,
              imageUrl: narrative.victoryImageUrl ?? undefined,
              rewards: validateRewards(narrative.victoryRewards, 'victory'),
            }
          : undefined,
        defeat: narrative.defeatText
          ? {
              title: narrative.defeatTitle ?? undefined,
              text: narrative.defeatText,
              imageUrl: narrative.defeatImageUrl ?? undefined,
              rewards: validateRewards(narrative.defeatRewards, 'defeat'),
            }
          : undefined,
        triggers: narrative.triggers.map((trigger) => ({
          id: trigger.id,
          triggerId: trigger.triggerId,
          displayOrder: trigger.displayOrder,
          content: {
            title: trigger.title ?? undefined,
            text: trigger.text,
            imageUrl: trigger.imageUrl ?? undefined,
          },
          conditions: validateCondition(trigger.conditions, trigger.triggerId),
          rewards: validateRewards(trigger.rewards, trigger.triggerId),
          gameEffects: validateGameEffects(
            trigger.gameEffects,
            trigger.triggerId,
          ),
        })),
      };

      this.narrativeCache.set(scenarioId, narrativeDef);
      return narrativeDef;
    } catch (error) {
      this.logger.error(
        `Failed to load narrative for scenario ${scenarioId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Initialize narrative state for a room when game starts
   */
  initializeRoomState(roomCode: string): void {
    this.roomTriggerStates.set(roomCode, new Map());
    this.roomActiveNarrative.set(roomCode, null);
    this.roomNarrativeQueue.set(roomCode, []);
  }

  /**
   * Clean up narrative state when room is destroyed
   */
  cleanupRoomState(roomCode: string): void {
    this.roomTriggerStates.delete(roomCode);
    this.roomActiveNarrative.delete(roomCode);
    this.roomNarrativeQueue.delete(roomCode);
  }

  /**
   * Get the currently active narrative for a room
   */
  getActiveNarrative(roomCode: string): ActiveNarrative | null {
    return this.roomActiveNarrative.get(roomCode) ?? null;
  }

  /**
   * Create an intro narrative for display
   */
  createIntroNarrative(
    content: NarrativeContent,
    players: { id: string; name: string }[],
  ): ActiveNarrative {
    return {
      id: uuidv4(),
      type: 'intro',
      content,
      acknowledgments: players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        acknowledged: false,
      })),
      displayedAt: Date.now(),
      timeoutMs: DEFAULT_NARRATIVE_TIMEOUT_MS,
      disconnectedPlayers: [],
    };
  }

  /**
   * Create a victory/defeat narrative for display
   */
  createOutroNarrative(
    type: 'victory' | 'defeat',
    content: NarrativeContent,
    players: { id: string; name: string }[],
    rewards?: NarrativeRewards,
  ): ActiveNarrative {
    return {
      id: uuidv4(),
      type,
      content,
      rewards,
      acknowledgments: players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        acknowledged: false,
      })),
      displayedAt: Date.now(),
      timeoutMs: DEFAULT_NARRATIVE_TIMEOUT_MS,
      disconnectedPlayers: [],
    };
  }

  /**
   * Create a trigger narrative for display
   */
  createTriggerNarrative(
    trigger: NarrativeTriggerDef,
    players: { id: string; name: string }[],
    triggeredBy?: string,
  ): ActiveNarrative {
    return {
      id: uuidv4(),
      type: 'trigger',
      triggerId: trigger.triggerId,
      triggeredBy,
      content: trigger.content,
      rewards: trigger.rewards,
      gameEffects: trigger.gameEffects,
      acknowledgments: players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        acknowledged: false,
      })),
      displayedAt: Date.now(),
      timeoutMs: DEFAULT_NARRATIVE_TIMEOUT_MS,
      disconnectedPlayers: [],
    };
  }

  /**
   * Set the active narrative for a room
   */
  setActiveNarrative(roomCode: string, narrative: ActiveNarrative): void {
    this.roomActiveNarrative.set(roomCode, narrative);
  }

  /**
   * Check all triggers against current game context
   * Returns the first unfired trigger whose conditions are met
   */
  checkTriggers(
    roomCode: string,
    narrativeDef: ScenarioNarrativeDef,
    context: NarrativeGameContext,
  ): NarrativeTriggerDef | null {
    if (!narrativeDef.triggers || narrativeDef.triggers.length === 0) {
      return null;
    }

    const triggerStates = this.roomTriggerStates.get(roomCode);
    if (!triggerStates) {
      this.logger.warn(`No trigger states found for room ${roomCode}`);
      return null;
    }

    // Sort by displayOrder and check each trigger
    const sortedTriggers = [...narrativeDef.triggers].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );

    for (const trigger of sortedTriggers) {
      // Skip if already fired
      const state = triggerStates.get(trigger.triggerId);
      if (state?.fired) {
        continue;
      }

      // Evaluate conditions
      if (this.conditionService.evaluate(trigger.conditions, context)) {
        // Mark as fired
        triggerStates.set(trigger.triggerId, {
          triggerId: trigger.triggerId,
          fired: true,
          firedAt: Date.now(),
        });

        this.logger.log(
          `Trigger ${trigger.triggerId} fired in room ${roomCode}`,
        );
        return trigger;
      }
    }

    return null;
  }

  /**
   * Check if any trigger would fire with the given context WITHOUT marking it as fired
   * Used for movement interrupt detection - peek at triggers before committing movement
   */
  peekTrigger(
    roomCode: string,
    narrativeDef: ScenarioNarrativeDef,
    context: NarrativeGameContext,
  ): NarrativeTriggerDef | null {
    if (!narrativeDef.triggers || narrativeDef.triggers.length === 0) {
      return null;
    }

    const triggerStates = this.roomTriggerStates.get(roomCode);
    if (!triggerStates) {
      this.logger.warn(`[peekTrigger] No trigger states found for room ${roomCode}`);
      return null;
    }

    // Sort by displayOrder and check each trigger
    const sortedTriggers = [...narrativeDef.triggers].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );

    for (const trigger of sortedTriggers) {
      // Skip if already fired
      const state = triggerStates.get(trigger.triggerId);
      if (state?.fired) {
        continue;
      }

      // Evaluate conditions (but don't mark as fired)
      if (this.conditionService.evaluate(trigger.conditions, context)) {
        this.logger.log(
          `[peekTrigger] Trigger ${trigger.triggerId} would fire in room ${roomCode}`,
        );
        return trigger;
      }
    }

    return null;
  }

  /**
   * Mark a specific trigger as fired (used after movement interrupt)
   */
  markTriggerFired(roomCode: string, triggerId: string): void {
    const triggerStates = this.roomTriggerStates.get(roomCode);
    if (!triggerStates) {
      this.logger.warn(`[markTriggerFired] No trigger states for room ${roomCode}`);
      return;
    }

    triggerStates.set(triggerId, {
      triggerId,
      fired: true,
      firedAt: Date.now(),
    });

    this.logger.log(`[markTriggerFired] Trigger ${triggerId} marked as fired in room ${roomCode}`);
  }

  /**
   * Record a player's acknowledgment of the current narrative
   * Returns true if all players have now acknowledged
   */
  acknowledgeNarrative(roomCode: string, playerId: string): boolean {
    const narrative = this.roomActiveNarrative.get(roomCode);
    if (!narrative) {
      this.logger.warn(`No active narrative for room ${roomCode}`);
      return false;
    }

    const acknowledgment = narrative.acknowledgments.find(
      (a) => a.playerId === playerId,
    );
    if (!acknowledgment) {
      this.logger.warn(
        `Player ${playerId} not found in narrative acknowledgments`,
      );
      return false;
    }

    acknowledgment.acknowledged = true;
    acknowledgment.acknowledgedAt = Date.now();

    // Check if all players have acknowledged
    return this.areAllAcknowledged(roomCode);
  }

  /**
   * Check if all players have acknowledged the current narrative
   */
  areAllAcknowledged(roomCode: string): boolean {
    const narrative = this.roomActiveNarrative.get(roomCode);
    if (!narrative) {
      return true;
    }

    return narrative.acknowledgments.every((a) => a.acknowledged);
  }

  /**
   * Clear the active narrative (after all acknowledged)
   */
  clearActiveNarrative(roomCode: string): ActiveNarrative | null {
    const narrative = this.roomActiveNarrative.get(roomCode) ?? null;
    this.roomActiveNarrative.set(roomCode, null);
    return narrative;
  }

  /**
   * Mark a player as disconnected during narrative display
   */
  markPlayerDisconnected(roomCode: string, playerId: string): void {
    const narrative = this.roomActiveNarrative.get(roomCode);
    if (!narrative) {
      return;
    }

    if (!narrative.disconnectedPlayers.includes(playerId)) {
      narrative.disconnectedPlayers.push(playerId);
    }
  }

  /**
   * Auto-acknowledge disconnected players after timeout
   * Returns true if this resulted in all players being acknowledged
   */
  autoAcknowledgeDisconnected(roomCode: string): boolean {
    const narrative = this.roomActiveNarrative.get(roomCode);
    if (!narrative) {
      return false;
    }

    const now = Date.now();
    if (now - narrative.displayedAt < narrative.timeoutMs) {
      return false;
    }

    // Auto-acknowledge all disconnected players
    for (const playerId of narrative.disconnectedPlayers) {
      const ack = narrative.acknowledgments.find(
        (a) => a.playerId === playerId,
      );
      if (ack && !ack.acknowledged) {
        ack.acknowledged = true;
        ack.acknowledgedAt = now;
        this.logger.log(
          `Auto-acknowledged player ${playerId} after timeout in room ${roomCode}`,
        );
      }
    }

    return this.areAllAcknowledged(roomCode);
  }

  /**
   * Queue a narrative for later display (if one is already active)
   */
  queueNarrative(roomCode: string, narrative: ActiveNarrative): boolean {
    const queue = this.roomNarrativeQueue.get(roomCode) ?? [];

    if (queue.length >= MAX_QUEUED_NARRATIVES) {
      this.logger.warn(
        `Narrative queue full for room ${roomCode}, dropping narrative`,
      );
      return false;
    }

    queue.push(narrative);
    this.roomNarrativeQueue.set(roomCode, queue);
    return true;
  }

  /**
   * Get the next queued narrative
   */
  dequeueNarrative(roomCode: string): ActiveNarrative | null {
    const queue = this.roomNarrativeQueue.get(roomCode) ?? [];
    if (queue.length === 0) {
      return null;
    }

    const narrative = queue.shift()!;
    this.roomNarrativeQueue.set(roomCode, queue);
    return narrative;
  }

  /**
   * Check if there's an active narrative blocking gameplay
   */
  isNarrativeActive(roomCode: string): boolean {
    const narrative = this.roomActiveNarrative.get(roomCode);
    return narrative !== null && narrative !== undefined;
  }

  /**
   * Clear the narrative queue for a room
   * Used when scenario ends - queued mid-game triggers are no longer relevant
   */
  clearQueue(roomCode: string): void {
    this.roomNarrativeQueue.set(roomCode, []);
    this.logger.log(`[clearQueue] Cleared narrative queue for room ${roomCode}`);
  }

  /**
   * Clear the narrative cache (for testing or cache invalidation)
   */
  clearCache(): void {
    this.narrativeCache.clear();
  }
}
