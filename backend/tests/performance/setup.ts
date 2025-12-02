/**
 * Performance Benchmarking Setup
 *
 * Provides utilities for measuring and comparing performance of critical operations
 * Tracks P50, P95, P99 percentiles and ops/sec
 */

import Benchmark from 'benchmark';

/**
 * Performance statistics for a benchmark
 */
export interface BenchmarkStats {
  name: string;
  opsPerSec: number;
  mean: number; // Mean execution time (ms)
  p50: number; // Median (ms)
  p95: number; // 95th percentile (ms)
  p99: number; // 99th percentile (ms)
  samples: number;
  margin: number; // Margin of error (%)
}

/**
 * Run a single benchmark and return statistics
 */
export async function runBenchmark(
  name: string,
  fn: () => Promise<void> | void,
  options: Benchmark.Options = {}
): Promise<BenchmarkStats> {
  return new Promise((resolve, reject) => {
    const suite = new Benchmark.Suite();

    suite
      .add(name, {
        defer: typeof fn() === 'object', // Is async
        fn: function (deferred?: any) {
          const result = fn();
          if (result && typeof result.then === 'function') {
            result.then(() => deferred?.resolve()).catch(reject);
          }
        },
        ...options,
      })
      .on('cycle', (event: any) => {
        const bench = event.target;
        const stats = calculateStats(bench);
        console.log(`  ${bench.toString()}`);
        console.log(`    P50: ${stats.p50.toFixed(2)}ms`);
        console.log(`    P95: ${stats.p95.toFixed(2)}ms`);
        console.log(`    P99: ${stats.p99.toFixed(2)}ms`);
        resolve(stats);
      })
      .on('error', (event: any) => {
        reject(event.target.error);
      })
      .run({ async: true });
  });
}

/**
 * Run multiple benchmarks and compare results
 */
export async function runComparison(
  benchmarks: Array<{ name: string; fn: () => Promise<void> | void }>,
  options: Benchmark.Options = {}
): Promise<BenchmarkStats[]> {
  const results: BenchmarkStats[] = [];

  return new Promise((resolve, reject) => {
    const suite = new Benchmark.Suite();

    benchmarks.forEach(({ name, fn }) => {
      suite.add(name, {
        defer: typeof fn() === 'object',
        fn: function (deferred?: any) {
          const result = fn();
          if (result && typeof result.then === 'function') {
            result.then(() => deferred?.resolve()).catch(reject);
          }
        },
        ...options,
      });
    });

    suite
      .on('cycle', (event: any) => {
        const bench = event.target;
        const stats = calculateStats(bench);
        console.log(`  ${bench.toString()}`);
        console.log(`    P50: ${stats.p50.toFixed(2)}ms`);
        console.log(`    P95: ${stats.p95.toFixed(2)}ms`);
        console.log(`    P99: ${stats.p99.toFixed(2)}ms`);
        results.push(stats);
      })
      .on('complete', function (this: any) {
        console.log(`\nFastest: ${this.filter('fastest').map('name')}`);
        console.log(`Slowest: ${this.filter('slowest').map('name')}`);
        resolve(results);
      })
      .on('error', (event: any) => {
        reject(event.target.error);
      })
      .run({ async: true });
  });
}

/**
 * Calculate performance statistics from benchmark results
 */
function calculateStats(bench: any): BenchmarkStats {
  const times = bench.stats.sample as number[]; // Sample execution times
  const sortedTimes = [...times].sort((a, b) => a - b);

  // Convert seconds to milliseconds
  const timesMs = sortedTimes.map((t) => t * 1000);

  return {
    name: bench.name,
    opsPerSec: bench.hz,
    mean: bench.stats.mean * 1000,
    p50: percentile(timesMs, 50),
    p95: percentile(timesMs, 95),
    p99: percentile(timesMs, 99),
    samples: times.length,
    margin: bench.stats.rme,
  };
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;

  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) {
    return sortedArray[lower];
  }

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Assert that benchmark meets performance target
 */
export function assertPerformance(
  stats: BenchmarkStats,
  target: {
    p95?: number; // Max P95 in ms
    p99?: number; // Max P99 in ms
    minOpsPerSec?: number; // Min operations per second
  }
) {
  if (target.p95 !== undefined && stats.p95 > target.p95) {
    throw new Error(
      `Performance target failed: P95 ${stats.p95.toFixed(2)}ms exceeds target ${target.p95}ms`
    );
  }

  if (target.p99 !== undefined && stats.p99 > target.p99) {
    throw new Error(
      `Performance target failed: P99 ${stats.p99.toFixed(2)}ms exceeds target ${target.p99}ms`
    );
  }

  if (
    target.minOpsPerSec !== undefined &&
    stats.opsPerSec < target.minOpsPerSec
  ) {
    throw new Error(
      `Performance target failed: ${stats.opsPerSec.toFixed(0)} ops/sec below target ${target.minOpsPerSec} ops/sec`
    );
  }
}

/**
 * Format benchmark results as table
 */
export function formatResults(results: BenchmarkStats[]): string {
  const lines = [
    '┌────────────────────────┬─────────────┬──────────┬──────────┬──────────┬──────────┐',
    '│ Benchmark              │ Ops/sec     │ Mean     │ P50      │ P95      │ P99      │',
    '├────────────────────────┼─────────────┼──────────┼──────────┼──────────┼──────────┤',
  ];

  results.forEach((stats) => {
    const name = stats.name.padEnd(22).substring(0, 22);
    const ops = stats.opsPerSec.toFixed(0).padStart(11);
    const mean = `${stats.mean.toFixed(2)}ms`.padStart(8);
    const p50 = `${stats.p50.toFixed(2)}ms`.padStart(8);
    const p95 = `${stats.p95.toFixed(2)}ms`.padStart(8);
    const p99 = `${stats.p99.toFixed(2)}ms`.padStart(8);

    lines.push(
      `│ ${name} │ ${ops} │ ${mean} │ ${p50} │ ${p95} │ ${p99} │`
    );
  });

  lines.push(
    '└────────────────────────┴─────────────┴──────────┴──────────┴──────────┴──────────┘'
  );

  return lines.join('\n');
}
