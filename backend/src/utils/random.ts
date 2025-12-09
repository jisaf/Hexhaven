/**
 * Random Utilities for Fair Multiplayer Gameplay
 *
 * Uses crypto.randomInt() for cryptographically secure randomization
 * to ensure fairness in multiplayer scenarios.
 */

import * as crypto from 'crypto';

export class RandomUtils {
  /**
   * Shuffle array using Fisher-Yates algorithm with crypto.randomInt
   *
   * @param array - Array to shuffle
   * @returns New shuffled array (does not mutate original)
   */
  static shuffle<T>(array: T[]): T[] {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  /**
   * Select random element from array
   *
   * @param array - Array to select from
   * @returns Random element from array
   * @throws Error if array is empty
   */
  static selectRandom<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot select from empty array');
    }

    const index = crypto.randomInt(0, array.length);
    return array[index];
  }

  /**
   * Generate random integer in range [min, max)
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Random integer
   */
  static randomInt(min: number, max: number): number {
    return crypto.randomInt(min, max);
  }

  /**
   * Generate random seed for reproducible randomization
   *
   * @returns Random seed number
   */
  static generateSeed(): number {
    return crypto.randomInt(0, 1000000);
  }
}
