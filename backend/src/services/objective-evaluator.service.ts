/**
 * Objective Evaluator Service (Phase 2 - Game Completion System)
 *
 * Handles objective evaluation:
 * - Template-based objective evaluation (7+ templates)
 * - Custom JavaScript function evaluation with security validation
 * - Progress tracking for objectives
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  ObjectiveDefinition,
  ObjectiveParams,
  ObjectiveEvaluationContext,
  ObjectiveResult,
  ObjectiveProgressData,
  ObjectiveTemplateType,
  CustomFunctionValidationResult,
  CustomFunctionSecurityConfig,
} from '../../../shared/types/objectives';

@Injectable()
export class ObjectiveEvaluatorService {
  private readonly logger = new Logger(ObjectiveEvaluatorService.name);

  /**
   * Security configuration for custom function evaluation
   */
  private readonly securityConfig: CustomFunctionSecurityConfig = {
    maxExecutionTime: 1000, // 1 second max
    forbiddenPatterns: [
      'require(',
      'require (',
      'import(',
      'import (',
      'process.',
      'global.',
      'globalThis.',
      'eval(',
      'eval (',
      'Function(',
      'Function (',
      'this.constructor',
      '__dirname',
      '__filename',
      'fs.',
      'child_process',
      'while(true)',
      'while (true)',
      'for(;;)',
      'for (;;)',
      'setTimeout',
      'setInterval',
      'setImmediate',
      'clearTimeout',
      'clearInterval',
      'clearImmediate',
      'Buffer',
      'Reflect',
      'Proxy',
      'WebAssembly',
      'SharedArrayBuffer',
      'Atomics',
      'async',
      'await',
      'fetch(',
      'XMLHttpRequest',
      'WebSocket',
      '.prototype',
      '.__proto__',
      '.constructor',
      'Object.getOwnPropertyDescriptor',
      'Object.defineProperty',
      'Object.setPrototypeOf',
      'Object.getPrototypeOf',
    ],
    logRejections: true,
  };

  /**
   * Evaluate an objective using template or custom function
   */
  evaluateObjective(
    objective: ObjectiveDefinition,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    try {
      // Use custom function if type is 'custom' and customFunction is provided
      if (objective.type === 'custom' && objective.customFunction) {
        return this.evaluateCustomFunction(objective.customFunction, context);
      }

      // Use template-based evaluation
      return this.evaluateTemplate(
        objective.type,
        objective.params || {},
        context,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Objective evaluation failed for ${objective.id}: ${errorMessage}`,
      );
      return {
        complete: false,
        progress: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Evaluate using a template
   */
  private evaluateTemplate(
    type: ObjectiveTemplateType,
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    switch (type) {
      case 'kill_all_monsters':
        return this.evaluateKillAllMonsters(context);

      case 'kill_monster_type':
        return this.evaluateKillMonsterType(params, context);

      case 'kill_boss':
        return this.evaluateKillBoss(params, context);

      case 'survive_rounds':
        return this.evaluateSurviveRounds(params, context);

      case 'collect_loot':
        return this.evaluateCollectLoot(params, context);

      case 'reach_location':
        return this.evaluateReachLocation(params, context);

      case 'protect_npc':
        return this.evaluateProtectNPC(params, context);

      case 'time_limit':
        return this.evaluateTimeLimit(params, context);

      case 'no_damage':
        return this.evaluateNoDamage(context);

      case 'minimum_health':
        return this.evaluateMinimumHealth(params, context);

      case 'collect_treasure':
        return this.evaluateCollectTreasure(params, context);

      case 'escape':
        return this.evaluateEscape(params, context);

      case 'custom':
        // Should not reach here - custom requires customFunction
        return {
          complete: false,
          progress: null,
          error: 'Custom objective requires customFunction',
        };

      default:
        return {
          complete: false,
          progress: null,
          error: `Unknown objective type: ${type as string}`,
        };
    }
  }

  // ========== TEMPLATE IMPLEMENTATIONS ==========

  /**
   * Template: kill_all_monsters
   * Complete when all monsters are dead
   */
  private evaluateKillAllMonsters(
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const totalMonsters = context.monsters.length;
    const deadMonsters = context.monsters.filter((m) => m.isDead).length;
    const complete = totalMonsters > 0 && deadMonsters === totalMonsters;

    return {
      complete,
      progress: {
        current: deadMonsters,
        target: totalMonsters,
        percent:
          totalMonsters > 0
            ? Math.floor((deadMonsters / totalMonsters) * 100)
            : 0,
        milestonesReached: this.calculateMilestones(
          deadMonsters,
          totalMonsters,
        ),
      },
    };
  }

  /**
   * Template: kill_monster_type
   * Complete when all monsters of specific type(s) are dead
   */
  private evaluateKillMonsterType(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const targetTypes =
      params.monsterTypes || (params.monsterType ? [params.monsterType] : []);

    if (targetTypes.length === 0) {
      return {
        complete: false,
        progress: null,
        error:
          'kill_monster_type requires monsterType or monsterTypes parameter',
      };
    }

    const targetMonsters = context.monsters.filter((m) =>
      targetTypes.includes(m.type),
    );
    const deadTargetMonsters = targetMonsters.filter((m) => m.isDead).length;
    const complete =
      targetMonsters.length > 0 && deadTargetMonsters === targetMonsters.length;

    return {
      complete,
      progress: {
        current: deadTargetMonsters,
        target: targetMonsters.length,
        percent:
          targetMonsters.length > 0
            ? Math.floor((deadTargetMonsters / targetMonsters.length) * 100)
            : 0,
        milestonesReached: this.calculateMilestones(
          deadTargetMonsters,
          targetMonsters.length,
        ),
      },
    };
  }

  /**
   * Template: kill_boss
   * Complete when a specific boss monster is dead
   */
  private evaluateKillBoss(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    if (!params.monsterType) {
      return {
        complete: false,
        progress: null,
        error: 'kill_boss requires monsterType parameter',
      };
    }

    const boss = context.monsters.find((m) => m.type === params.monsterType);

    if (!boss) {
      return {
        complete: false,
        progress: {
          current: 0,
          target: 1,
          percent: 0,
          milestonesReached: [],
          details: { bossNotFound: true },
        },
      };
    }

    // Progress based on boss health remaining
    const healthDepleted = boss.maxHealth - boss.health;
    const percent = Math.floor((healthDepleted / boss.maxHealth) * 100);

    return {
      complete: boss.isDead,
      progress: {
        current: boss.isDead ? 1 : 0,
        target: 1,
        percent: boss.isDead ? 100 : percent,
        milestonesReached: this.calculateMilestones(
          boss.isDead ? 100 : percent,
          100,
        ),
        details: {
          bossHealth: boss.health,
          bossMaxHealth: boss.maxHealth,
        },
      },
    };
  }

  /**
   * Template: survive_rounds
   * Complete when players survive for N rounds
   */
  private evaluateSurviveRounds(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const targetRounds = params.rounds || 1;
    const currentRound = context.game.currentRound;

    // Check if any character is dead or exhausted (failure condition)
    const allAlive = context.characters.every(
      (c) => !c.isDead && !c.isExhausted,
    );

    if (!allAlive) {
      return {
        complete: false,
        progress: {
          current: currentRound,
          target: targetRounds,
          percent: Math.floor((currentRound / targetRounds) * 100),
          milestonesReached: this.calculateMilestones(
            currentRound,
            targetRounds,
          ),
          details: { failed: true, reason: 'Character died or exhausted' },
        },
        failed: true,
      };
    }

    const complete = currentRound >= targetRounds;

    return {
      complete,
      progress: {
        current: currentRound,
        target: targetRounds,
        percent: Math.min(100, Math.floor((currentRound / targetRounds) * 100)),
        milestonesReached: this.calculateMilestones(currentRound, targetRounds),
      },
    };
  }

  /**
   * Template: collect_loot
   * Complete when N loot tokens are collected
   */
  private evaluateCollectLoot(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const targetCount = params.target || 1;
    const collectedCount = context.board.lootTokens.filter(
      (t) => t.isCollected,
    ).length;
    const complete = collectedCount >= targetCount;

    return {
      complete,
      progress: {
        current: collectedCount,
        target: targetCount,
        percent: Math.min(
          100,
          Math.floor((collectedCount / targetCount) * 100),
        ),
        milestonesReached: this.calculateMilestones(
          collectedCount,
          targetCount,
        ),
      },
    };
  }

  /**
   * Template: reach_location
   * Complete when character(s) reach a specific hex position
   */
  private evaluateReachLocation(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const locations =
      params.locations || (params.location ? [params.location] : []);
    const requireAll = params.requireAll ?? false;

    if (locations.length === 0) {
      return {
        complete: false,
        progress: null,
        error: 'reach_location requires location or locations parameter',
      };
    }

    // Get living characters
    const livingCharacters = context.characters.filter(
      (c) => !c.isDead && !c.isExhausted,
    );

    // Check which characters have reached any target location
    const charactersAtLocation = livingCharacters.filter((c) =>
      locations.some((loc) => c.position.q === loc.q && c.position.r === loc.r),
    );

    let complete: boolean;
    let current: number;
    let target: number;

    if (requireAll) {
      // All living characters must reach the location
      complete =
        livingCharacters.length > 0 &&
        charactersAtLocation.length === livingCharacters.length;
      current = charactersAtLocation.length;
      target = livingCharacters.length;
    } else {
      // At least one character must reach the location
      complete = charactersAtLocation.length > 0;
      current = charactersAtLocation.length;
      target = 1;
    }

    return {
      complete,
      progress: {
        current,
        target,
        percent:
          target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 0,
        milestonesReached: this.calculateMilestones(current, target),
        details: {
          locationsToReach: locations,
          charactersAtLocation: charactersAtLocation.map((c) => c.id),
        },
      },
    };
  }

  /**
   * Template: protect_npc
   * Complete when NPC survives for N rounds
   */
  private evaluateProtectNPC(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const targetRounds = params.rounds || 1;
    const npcId = params.npcId;

    if (!npcId) {
      return {
        complete: false,
        progress: null,
        error: 'protect_npc requires npcId parameter',
      };
    }

    const npc = context.npcs.find((n) => n.id === npcId);

    if (!npc) {
      return {
        complete: false,
        progress: {
          current: 0,
          target: targetRounds,
          percent: 0,
          milestonesReached: [],
          details: { npcNotFound: true },
        },
      };
    }

    // If NPC is dead, objective failed
    if (npc.isDead) {
      return {
        complete: false,
        progress: {
          current: context.game.currentRound,
          target: targetRounds,
          percent: Math.floor((context.game.currentRound / targetRounds) * 100),
          milestonesReached: this.calculateMilestones(
            context.game.currentRound,
            targetRounds,
          ),
          details: { failed: true, reason: 'NPC died' },
        },
        failed: true,
      };
    }

    const complete = context.game.currentRound >= targetRounds;

    return {
      complete,
      progress: {
        current: context.game.currentRound,
        target: targetRounds,
        percent: Math.min(
          100,
          Math.floor((context.game.currentRound / targetRounds) * 100),
        ),
        milestonesReached: this.calculateMilestones(
          context.game.currentRound,
          targetRounds,
        ),
        details: {
          npcHealth: npc.health,
          npcMaxHealth: npc.maxHealth,
        },
      },
    };
  }

  /**
   * Template: time_limit
   * Fails if N rounds have passed without completing other objectives
   * This is typically used as a failure condition
   */
  private evaluateTimeLimit(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const maxRounds = params.rounds || 10;
    const currentRound = context.game.currentRound;
    const exceeded = currentRound > maxRounds;

    return {
      complete: exceeded, // "Complete" means the time limit was exceeded (failure)
      progress: {
        current: currentRound,
        target: maxRounds,
        percent: Math.min(100, Math.floor((currentRound / maxRounds) * 100)),
        milestonesReached: this.calculateMilestones(currentRound, maxRounds),
        details: {
          roundsRemaining: Math.max(0, maxRounds - currentRound),
        },
      },
      failed: exceeded,
    };
  }

  /**
   * Template: no_damage
   * Complete if all characters are at full health
   * Typically used as a bonus objective
   */
  private evaluateNoDamage(
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const livingCharacters = context.characters.filter(
      (c) => !c.isDead && !c.isExhausted,
    );
    const atFullHealth = livingCharacters.filter(
      (c) => c.health === c.maxHealth,
    );
    const complete =
      livingCharacters.length > 0 &&
      atFullHealth.length === livingCharacters.length;

    // Track accumulated damage taken
    const totalDamageTaken = context.accumulated.totalDamageTaken;
    const failed = totalDamageTaken > 0;

    return {
      complete: complete && !failed,
      progress: {
        current: atFullHealth.length,
        target: livingCharacters.length,
        percent:
          livingCharacters.length > 0
            ? Math.floor((atFullHealth.length / livingCharacters.length) * 100)
            : 0,
        milestonesReached: [],
        details: {
          totalDamageTaken,
          failed,
        },
      },
      failed,
    };
  }

  /**
   * Template: minimum_health
   * Complete if all characters are above a health threshold
   */
  private evaluateMinimumHealth(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const healthPercent = params.healthPercent ?? 50;
    const livingCharacters = context.characters.filter(
      (c) => !c.isDead && !c.isExhausted,
    );

    const aboveThreshold = livingCharacters.filter(
      (c) => (c.health / c.maxHealth) * 100 >= healthPercent,
    );

    const complete =
      livingCharacters.length > 0 &&
      aboveThreshold.length === livingCharacters.length;

    return {
      complete,
      progress: {
        current: aboveThreshold.length,
        target: livingCharacters.length,
        percent:
          livingCharacters.length > 0
            ? Math.floor(
                (aboveThreshold.length / livingCharacters.length) * 100,
              )
            : 0,
        milestonesReached: this.calculateMilestones(
          aboveThreshold.length,
          livingCharacters.length,
        ),
        details: {
          requiredHealthPercent: healthPercent,
          characterHealths: livingCharacters.map((c) => ({
            id: c.id,
            health: c.health,
            maxHealth: c.maxHealth,
            percent: Math.floor((c.health / c.maxHealth) * 100),
          })),
        },
      },
    };
  }

  /**
   * Template: collect_treasure
   * Complete when specific treasure(s) are collected
   */
  private evaluateCollectTreasure(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const treasureIds = params.treasureIds || [];
    const targetCount = params.target || treasureIds.length || 1;

    if (treasureIds.length === 0) {
      // No specific treasures, just count total collected
      const collectedCount = context.board.treasures.filter(
        (t) => t.isCollected,
      ).length;
      const complete = collectedCount >= targetCount;

      return {
        complete,
        progress: {
          current: collectedCount,
          target: targetCount,
          percent: Math.min(
            100,
            Math.floor((collectedCount / targetCount) * 100),
          ),
          milestonesReached: this.calculateMilestones(
            collectedCount,
            targetCount,
          ),
        },
      };
    }

    // Check specific treasures
    const targetTreasures = context.board.treasures.filter((t) =>
      treasureIds.includes(t.id),
    );
    const collectedTargets = targetTreasures.filter((t) => t.isCollected);
    const complete = collectedTargets.length >= targetCount;

    return {
      complete,
      progress: {
        current: collectedTargets.length,
        target: targetCount,
        percent: Math.min(
          100,
          Math.floor((collectedTargets.length / targetCount) * 100),
        ),
        milestonesReached: this.calculateMilestones(
          collectedTargets.length,
          targetCount,
        ),
        details: {
          targetTreasureIds: treasureIds,
          collectedTreasureIds: collectedTargets.map((t) => t.id),
        },
      },
    };
  }

  /**
   * Template: escape
   * Complete when all living characters reach exit location(s)
   */
  private evaluateEscape(
    params: ObjectiveParams,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    const exitLocations =
      params.locations || (params.location ? [params.location] : []);

    if (exitLocations.length === 0) {
      return {
        complete: false,
        progress: null,
        error: 'escape requires location or locations parameter',
      };
    }

    const livingCharacters = context.characters.filter(
      (c) => !c.isDead && !c.isExhausted,
    );

    // Characters at exit locations
    const escapedCharacters = livingCharacters.filter((c) =>
      exitLocations.some(
        (loc) => c.position.q === loc.q && c.position.r === loc.r,
      ),
    );

    // All living characters must escape
    const complete =
      livingCharacters.length > 0 &&
      escapedCharacters.length === livingCharacters.length;

    return {
      complete,
      progress: {
        current: escapedCharacters.length,
        target: livingCharacters.length,
        percent:
          livingCharacters.length > 0
            ? Math.floor(
                (escapedCharacters.length / livingCharacters.length) * 100,
              )
            : 0,
        milestonesReached: this.calculateMilestones(
          escapedCharacters.length,
          livingCharacters.length,
        ),
        details: {
          exitLocations,
          escapedCharacterIds: escapedCharacters.map((c) => c.id),
          remainingCharacterIds: livingCharacters
            .filter((c) => !escapedCharacters.includes(c))
            .map((c) => c.id),
        },
      },
    };
  }

  // ========== CUSTOM FUNCTION EVALUATION ==========

  /**
   * Validate a custom function for security
   */
  validateCustomFunction(fnBody: string): CustomFunctionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for forbidden patterns
    for (const pattern of this.securityConfig.forbiddenPatterns) {
      if (fnBody.includes(pattern)) {
        errors.push(`Forbidden pattern detected: "${pattern}"`);
      }
    }

    // Check for suspicious patterns
    if (fnBody.includes('\\x') || fnBody.includes('\\u')) {
      warnings.push('Unicode escape sequences detected - verify intent');
    }

    if (fnBody.length > 5000) {
      warnings.push('Function body is very long - consider simplifying');
    }

    // Check for infinite loop patterns
    const loopPatterns = [
      /while\s*\(\s*1\s*\)/,
      /while\s*\(\s*!\s*0\s*\)/,
      /for\s*\(\s*;\s*;\s*\)/,
    ];
    for (const pattern of loopPatterns) {
      if (pattern.test(fnBody)) {
        errors.push('Potential infinite loop detected');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Evaluate a custom JavaScript function safely
   */
  evaluateCustomFunction(
    fnBody: string,
    context: ObjectiveEvaluationContext,
  ): ObjectiveResult {
    // Validate the function first
    const validation = this.validateCustomFunction(fnBody);

    if (!validation.valid) {
      if (this.securityConfig.logRejections) {
        this.logger.warn(
          `Custom function rejected: ${validation.errors.join(', ')}`,
        );
      }
      return {
        complete: false,
        progress: null,
        error: `Security validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      this.logger.warn(
        `Custom function warnings: ${validation.warnings.join(', ')}`,
      );
    }

    try {
      // Build a safe execution environment
      // The function has access only to 'context'
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const safeFunction = new Function(
        'context',
        `"use strict";
        // Prevent access to global scope
        const window = undefined;
        const document = undefined;
        const global = undefined;
        const globalThis = undefined;
        const self = undefined;
        const process = undefined;
        const require = undefined;
        const module = undefined;
        const exports = undefined;
        const __dirname = undefined;
        const __filename = undefined;
        const setTimeout = undefined;
        const setInterval = undefined;
        const setImmediate = undefined;
        const clearTimeout = undefined;
        const clearInterval = undefined;
        const clearImmediate = undefined;
        const eval = undefined;
        const Function = undefined;
        const Buffer = undefined;
        const Reflect = undefined;
        const Proxy = undefined;
        const WebAssembly = undefined;
        const SharedArrayBuffer = undefined;
        const Atomics = undefined;

        ${fnBody}`,
      );

      // Execute with timeout
      const startTime = Date.now();
      const result = safeFunction(context);
      const executionTime = Date.now() - startTime;

      if (executionTime > this.securityConfig.maxExecutionTime) {
        this.logger.warn(
          `Custom function took ${executionTime}ms (limit: ${this.securityConfig.maxExecutionTime}ms)`,
        );
      }

      // Handle different return types
      if (typeof result === 'boolean') {
        return {
          complete: result,
          progress: null,
        };
      }

      if (
        typeof result === 'object' &&
        result !== null &&
        typeof result.complete === 'boolean'
      ) {
        return result as ObjectiveResult;
      }

      // Invalid return type
      return {
        complete: false,
        progress: null,
        error: 'Custom function must return boolean or ObjectiveResult',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Custom function execution failed: ${errorMessage}`);
      return {
        complete: false,
        progress: null,
        error: `Execution failed: ${errorMessage}`,
      };
    }
  }

  // ========== PROGRESS CALCULATION ==========

  /**
   * Build progress data for an objective
   */
  buildProgress(
    objective: ObjectiveDefinition,
    context: ObjectiveEvaluationContext,
  ): ObjectiveProgressData | null {
    if (!objective.trackProgress) {
      return null;
    }

    // Get the result which includes progress
    const result = this.evaluateObjective(objective, context);
    return result.progress;
  }

  /**
   * Calculate which milestone percentages have been reached
   */
  private calculateMilestones(current: number, target: number): number[] {
    if (target <= 0) return [];

    const percent = Math.floor((current / target) * 100);
    const standardMilestones = [25, 50, 75, 100];

    return standardMilestones.filter((m) => percent >= m);
  }

  /**
   * Get milestone message for a reached milestone
   */
  getMilestoneMessage(
    objective: ObjectiveDefinition,
    milestonePercent: number,
  ): string | undefined {
    if (!objective.milestones) return undefined;

    for (const milestone of objective.milestones) {
      if (typeof milestone === 'number') {
        if (milestone === milestonePercent) {
          return `${milestonePercent}% complete`;
        }
      } else if (milestone.percent === milestonePercent) {
        return milestone.message;
      }
    }

    return undefined;
  }
}
