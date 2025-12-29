/**
 * Environment Configuration Module
 *
 * Centralizes environment variable access with type safety and validation.
 */

import { resolve } from 'path';

/**
 * Environment types
 */
export enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/**
 * Configuration interface
 */
export interface Config {
  env: Environment;
  port: number;
  database: {
    url: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  session: {
    ttlHours: number;
    maxConcurrentSessions: number;
  };
  game: {
    minPlayers: number;
    maxPlayers: number;
    turnTimeoutSeconds: number;
  };
  logging: {
    level: string;
  };
  uploads: {
    backgroundsDir: string;
    maxFileSizeMb: number;
    allowedMimeTypes: string[];
  };
  campaign: {
    inviteTokenTtlDays: number;
    directInvitationTtlDays: number;
  };
}

/**
 * Load and validate environment configuration
 */
function loadConfig(): Config {
  const env = (process.env.NODE_ENV || 'development') as Environment;

  // Default values
  const config: Config = {
    env,
    port: parseInt(process.env.PORT || '3001', 10),
    database: {
      url:
        process.env.DATABASE_URL || 'postgresql://localhost:5432/hexhaven_dev',
    },
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    session: {
      ttlHours: parseInt(process.env.SESSION_TTL_HOURS || '24', 10),
      maxConcurrentSessions: parseInt(
        process.env.MAX_CONCURRENT_SESSIONS || '100',
        10,
      ),
    },
    game: {
      minPlayers: 2,
      maxPlayers: 4,
      turnTimeoutSeconds: parseInt(
        process.env.TURN_TIMEOUT_SECONDS || '60',
        10,
      ),
    },
    logging: {
      level:
        process.env.LOG_LEVEL ||
        (env === Environment.Production ? 'info' : 'debug'),
    },
    uploads: {
      // Default: resolve from backend to frontend/public/backgrounds
      // In production, set BACKGROUNDS_DIR to absolute path
      backgroundsDir:
        process.env.BACKGROUNDS_DIR ||
        resolve(process.cwd(), '..', 'frontend', 'public', 'backgrounds'),
      maxFileSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '5', 10),
      allowedMimeTypes: (
        process.env.ALLOWED_UPLOAD_MIMES ||
        'image/jpeg,image/png,image/gif,image/webp'
      ).split(','),
    },
    campaign: {
      inviteTokenTtlDays: parseInt(
        process.env.CAMPAIGN_INVITE_TOKEN_TTL_DAYS || '7',
        10,
      ),
      directInvitationTtlDays: parseInt(
        process.env.CAMPAIGN_DIRECT_INVITATION_TTL_DAYS || '30',
        10,
      ),
    },
  };

  // Validation
  if (!config.database.url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (env === Environment.Production && !process.env.CORS_ORIGIN) {
    console.warn('CORS_ORIGIN not set in production - defaulting to localhost');
  }

  return config;
}

/**
 * Global configuration instance
 */
export const config = loadConfig();

/**
 * Helper to check if in production
 */
export function isProduction(): boolean {
  return config.env === Environment.Production;
}

/**
 * Helper to check if in development
 */
export function isDevelopment(): boolean {
  return config.env === Environment.Development;
}

/**
 * Helper to check if in test
 */
export function isTest(): boolean {
  return config.env === Environment.Test;
}

/**
 * Get database URL with fallback for test environment
 */
export function getDatabaseUrl(): string {
  if (isTest() && process.env.DATABASE_URL_TEST) {
    return process.env.DATABASE_URL_TEST;
  }
  return config.database.url;
}

/**
 * Get CORS origins as array
 */
export function getCorsOrigins(): string[] {
  if (Array.isArray(config.cors.origin)) {
    return config.cors.origin;
  }
  return [config.cors.origin];
}
