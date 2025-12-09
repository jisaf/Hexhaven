/**
 * Unit Tests: Random Utilities
 *
 * Tests for cryptographically secure randomization functions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RandomUtils } from '../../src/utils/random';

describe('RandomUtils', () => {
  describe('shuffle', () => {
    it('should return array with same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = RandomUtils.shuffle(arr);
      expect(shuffled.length).toBe(arr.length);
    });

    it('should contain all original elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = RandomUtils.shuffle(arr);

      arr.forEach(item => {
        expect(shuffled).toContain(item);
      });
    });

    it('should not mutate original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      RandomUtils.shuffle(arr);

      expect(arr).toEqual(original);
    });

    it('should handle empty array', () => {
      const shuffled = RandomUtils.shuffle([]);
      expect(shuffled).toEqual([]);
    });

    it('should handle single element', () => {
      const shuffled = RandomUtils.shuffle([1]);
      expect(shuffled).toEqual([1]);
    });

    it('should produce different results on repeated calls (probabilistic)', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results = new Set<string>();

      // Run 10 times, expect at least 5 different orders
      for (let i = 0; i < 10; i++) {
        const shuffled = RandomUtils.shuffle(arr);
        results.add(JSON.stringify(shuffled));
      }

      expect(results.size).toBeGreaterThan(5);
    });

    it('should have roughly uniform distribution over many trials', () => {
      const arr = [1, 2, 3];
      const positionCounts = [
        [0, 0, 0], // Counts for element 1 at positions 0, 1, 2
        [0, 0, 0], // Counts for element 2
        [0, 0, 0], // Counts for element 3
      ];

      const trials = 1000;
      for (let i = 0; i < trials; i++) {
        const shuffled = RandomUtils.shuffle(arr);
        shuffled.forEach((value, position) => {
          positionCounts[value - 1][position]++;
        });
      }

      // Each element should appear at each position roughly 1/3 of the time
      // Allow 20% deviation from expected 333 appearances
      positionCounts.forEach(counts => {
        counts.forEach(count => {
          expect(count).toBeGreaterThan(250);
          expect(count).toBeLessThan(450);
        });
      });
    });
  });

  describe('selectRandom', () => {
    it('should return element from array', () => {
      const arr = [1, 2, 3, 4, 5];
      const selected = RandomUtils.selectRandom(arr);

      expect(arr).toContain(selected);
    });

    it('should throw error on empty array', () => {
      expect(() => RandomUtils.selectRandom([])).toThrow('Cannot select from empty array');
    });

    it('should return only element for single-element array', () => {
      const selected = RandomUtils.selectRandom([42]);
      expect(selected).toBe(42);
    });

    it('should have roughly uniform distribution', () => {
      const arr = [1, 2, 3, 4, 5];
      const counts = new Map<number, number>();

      const trials = 1000;
      for (let i = 0; i < trials; i++) {
        const selected = RandomUtils.selectRandom(arr);
        counts.set(selected, (counts.get(selected) || 0) + 1);
      }

      // Each element should be selected roughly 200 times (1000/5)
      // Allow 30% deviation
      counts.forEach(count => {
        expect(count).toBeGreaterThan(140);
        expect(count).toBeLessThan(260);
      });
    });

    it('should work with string arrays', () => {
      const arr = ['a', 'b', 'c'];
      const selected = RandomUtils.selectRandom(arr);

      expect(arr).toContain(selected);
    });

    it('should work with object arrays', () => {
      const arr = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const selected = RandomUtils.selectRandom(arr);

      expect(arr).toContainEqual(selected);
    });
  });

  describe('randomInt', () => {
    it('should return number in range [min, max)', () => {
      for (let i = 0; i < 100; i++) {
        const num = RandomUtils.randomInt(0, 10);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(10);
      }
    });

    it('should return min when range is [min, min+1)', () => {
      for (let i = 0; i < 10; i++) {
        const num = RandomUtils.randomInt(5, 6);
        expect(num).toBe(5);
      }
    });

    it('should handle negative ranges', () => {
      for (let i = 0; i < 100; i++) {
        const num = RandomUtils.randomInt(-10, 0);
        expect(num).toBeGreaterThanOrEqual(-10);
        expect(num).toBeLessThan(0);
      }
    });

    it('should have uniform distribution', () => {
      const counts = new Map<number, number>();
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        const num = RandomUtils.randomInt(0, 5);
        counts.set(num, (counts.get(num) || 0) + 1);
      }

      // Each number should appear roughly 200 times (1000/5)
      // Allow 30% deviation
      counts.forEach(count => {
        expect(count).toBeGreaterThan(140);
        expect(count).toBeLessThan(260);
      });
    });
  });

  describe('generateSeed', () => {
    it('should return number', () => {
      const seed = RandomUtils.generateSeed();
      expect(typeof seed).toBe('number');
    });

    it('should return number in valid range', () => {
      const seed = RandomUtils.generateSeed();
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(1000000);
    });

    it('should generate different seeds on repeated calls', () => {
      const seeds = new Set<number>();

      for (let i = 0; i < 10; i++) {
        seeds.add(RandomUtils.generateSeed());
      }

      // Expect at least 8 unique seeds out of 10 calls
      expect(seeds.size).toBeGreaterThanOrEqual(8);
    });
  });
});
