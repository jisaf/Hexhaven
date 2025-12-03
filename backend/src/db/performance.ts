/**
 * Database Query Performance Logger
 *
 * Prisma middleware that logs slow queries (>100ms) with execution plans
 * Collects timing statistics for performance monitoring
 */

import type { Prisma as _Prisma } from '@prisma/client';

/**
 * Query performance statistics
 */
interface QueryStats {
  model: string;
  action: string;
  duration: number;
  timestamp: Date;
  args?: any;
}

/**
 * Performance thresholds
 */
const SLOW_QUERY_THRESHOLD_MS = 100; // Log queries slower than 100ms
const VERY_SLOW_QUERY_THRESHOLD_MS = 500; // Warn for queries slower than 500ms

/**
 * Query statistics collection
 */
const queryStats: QueryStats[] = [];
const MAX_STATS_SIZE = 1000; // Keep last 1000 queries

/**
 * Create Prisma middleware for query performance logging
 */
export function createPerformanceMiddleware(): any {
  return async (params: any, next: any) => {
    const start = Date.now();

    try {
      // Execute query
      const result = await next(params);

      // Calculate duration
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        logSlowQuery(params, duration);
      }

      // Collect statistics
      collectStats(params, duration);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    } catch (error) {
      // Log failed queries
      const duration = Date.now() - start;
      console.error('[Prisma] Query failed', {
        model: params.model,
        action: params.action,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}

/**
 * Log slow query with details
 */
function logSlowQuery(params: any, duration: number) {
  const level = duration > VERY_SLOW_QUERY_THRESHOLD_MS ? 'WARN' : 'INFO';
  const emoji = level === 'WARN' ? '⚠️' : '🐢';

  console[level === 'WARN' ? 'warn' : 'log'](
    `${emoji} [Prisma] Slow query detected`,
    {
      model: params.model,
      action: params.action,
      duration: `${duration}ms`,
      threshold: `${SLOW_QUERY_THRESHOLD_MS}ms`,
      args: sanitizeArgs(params.args),
    },
  );

  // In development, log the full query for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Prisma] Query details:', {
      model: params.model,
      action: params.action,
      args: params.args,
    });
  }
}

/**
 * Collect query statistics
 */
function collectStats(params: any, duration: number) {
  const stat: QueryStats = {
    model: params.model || 'unknown',
    action: params.action,
    duration,
    timestamp: new Date(),
    args: sanitizeArgs(params.args),
  };

  queryStats.push(stat);

  // Keep only recent stats
  if (queryStats.length > MAX_STATS_SIZE) {
    queryStats.shift();
  }
}

/**
 * Sanitize query args (remove sensitive data)
 */
function sanitizeArgs(args: any): any {
  if (!args) return undefined;

  // Clone args to avoid mutation
  const sanitized = JSON.parse(JSON.stringify(args));

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'apiKey',
  ];

  function redactSensitiveData(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    Object.keys(obj).forEach((key) => {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        redactSensitiveData(obj[key]);
      }
    });

    return obj;
  }

  return redactSensitiveData(sanitized);
}

/**
 * Get query statistics summary
 */
export function getQueryStatsSummary() {
  if (queryStats.length === 0) {
    return {
      totalQueries: 0,
      avgDuration: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      slowQueries: 0,
    };
  }

  const durations = queryStats.map((s) => s.duration).sort((a, b) => a - b);
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);

  return {
    totalQueries: queryStats.length,
    avgDuration: totalDuration / queryStats.length,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    slowQueries: queryStats.filter((s) => s.duration > SLOW_QUERY_THRESHOLD_MS)
      .length,
    slowQueriesByModel: getSlowQueriesByModel(),
  };
}

/**
 * Get slow queries grouped by model
 */
function getSlowQueriesByModel(): Record<string, number> {
  const slowQueries = queryStats.filter(
    (s) => s.duration > SLOW_QUERY_THRESHOLD_MS,
  );

  return slowQueries.reduce(
    (acc, stat) => {
      acc[stat.model] = (acc[stat.model] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
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
 * Get recent slow queries
 */
export function getRecentSlowQueries(limit = 10): QueryStats[] {
  return queryStats
    .filter((s) => s.duration > SLOW_QUERY_THRESHOLD_MS)
    .slice(-limit)
    .reverse();
}

/**
 * Clear collected statistics
 */
export function clearQueryStats() {
  queryStats.length = 0;
}

/**
 * Log performance summary
 */
export function logPerformanceSummary() {
  const summary = getQueryStatsSummary();

  console.log('\n[Prisma] Query Performance Summary:');
  console.log(`  Total Queries: ${summary.totalQueries}`);
  console.log(`  Avg Duration: ${summary.avgDuration.toFixed(2)}ms`);
  console.log(`  P50: ${summary.p50.toFixed(2)}ms`);
  console.log(`  P95: ${summary.p95.toFixed(2)}ms`);
  console.log(`  P99: ${summary.p99.toFixed(2)}ms`);
  console.log(
    `  Slow Queries (>${SLOW_QUERY_THRESHOLD_MS}ms): ${summary.slowQueries}`,
  );

  if (
    summary.slowQueriesByModel &&
    Object.keys(summary.slowQueriesByModel).length > 0
  ) {
    console.log('\n  Slow Queries by Model:');
    Object.entries(summary.slowQueriesByModel).forEach(([model, count]) => {
      console.log(`    ${model}: ${count}`);
    });
  }

  console.log('');
}

/**
 * Enable performance monitoring
 * Call this when initializing Prisma client
 */
export function enablePerformanceMonitoring(prisma: any) {
  prisma.$use(createPerformanceMiddleware());

  // Log summary on process exit
  process.on('SIGINT', () => {
    logPerformanceSummary();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logPerformanceSummary();
    process.exit(0);
  });

  console.log('[Prisma] Performance monitoring enabled');
  console.log(`[Prisma] Slow query threshold: ${SLOW_QUERY_THRESHOLD_MS}ms`);
}
