import { z } from 'zod';

/**
 * Validation Schemas using Zod
 *
 * Provides type-safe validation for:
 * - User registration and login
 * - Character creation and updates
 * - Game creation and events
 *
 * All schemas enforce security constraints:
 * - SQL injection prevention (via Prisma parameterization)
 * - XSS prevention (input sanitization)
 * - Length limits (DoS prevention)
 * - Reserved names blocking
 */

// ========== AUTHENTICATION SCHEMAS ==========

/**
 * Username validation
 * - Length: 3-20 characters
 * - Allowed: alphanumeric, underscore, hyphen
 * - No reserved names (admin, system, deleted_user_*)
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must not exceed 20 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscore, and hyphen',
  )
  .refine(
    (username) => {
      const reserved = ['admin', 'system', 'root', 'null', 'undefined'];
      const lowerUsername = username.toLowerCase();
      return (
        !reserved.includes(lowerUsername) &&
        !lowerUsername.startsWith('deleted_user_')
      );
    },
    { message: 'This username is reserved' },
  );

/**
 * Password validation
 * - Length: 12-128 characters (bcrypt max 72 bytes, but allow unicode)
 * - All printable characters allowed
 * - Leading/trailing whitespace trimmed
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must not exceed 128 characters')
  .transform((val) => val.trim()); // Trim whitespace

/**
 * User registration request
 */
export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type RegisterDto = z.infer<typeof registerSchema>;

/**
 * User login request
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;

/**
 * Refresh token request
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

// ========== CHARACTER SCHEMAS ==========

/**
 * Character name validation
 * - Length: 1-30 characters
 * - No HTML tags (XSS prevention)
 * - Whitespace trimmed
 */
export const characterNameSchema = z
  .string()
  .min(1, 'Character name is required')
  .max(30, 'Character name must not exceed 30 characters')
  .regex(/^[^<>]+$/, 'Character name cannot contain HTML tags')
  .transform((val) => val.trim());

/**
 * Character creation request
 */
export const createCharacterSchema = z.object({
  name: characterNameSchema,
  classId: z.string().uuid('Invalid character class ID'),
});

export type CreateCharacterDto = z.infer<typeof createCharacterSchema>;

/**
 * Character update request
 */
export const updateCharacterSchema = z.object({
  name: characterNameSchema.optional(),
  experience: z.number().int().min(0).optional(),
  gold: z.number().int().min(0).optional(),
  health: z.number().int().min(0).optional(),
});

export type UpdateCharacterDto = z.infer<typeof updateCharacterSchema>;

/**
 * Add experience request
 */
export const addExperienceSchema = z.object({
  amount: z
    .number()
    .int('Experience must be an integer')
    .min(1, 'Experience must be positive')
    .max(1000, 'Experience amount too large'),
});

export type AddExperienceDto = z.infer<typeof addExperienceSchema>;

// ========== GAME SCHEMAS ==========

/**
 * Room code validation
 * - Exactly 6 characters
 * - Uppercase alphanumeric only
 */
export const roomCodeSchema = z
  .string()
  .length(6, 'Room code must be exactly 6 characters')
  .regex(/^[A-Z0-9]+$/, 'Room code must be uppercase alphanumeric')
  .transform((val) => val.toUpperCase());

/**
 * Game creation request
 */
export const createGameSchema = z.object({
  roomCode: roomCodeSchema,
  scenarioId: z.string().uuid('Invalid scenario ID'),
  difficulty: z
    .number()
    .int('Difficulty must be an integer')
    .min(1, 'Difficulty must be at least 1')
    .max(7, 'Difficulty must not exceed 7'),
  hostCharacterId: z.string().uuid('Invalid character ID'),
});

export type CreateGameDto = z.infer<typeof createGameSchema>;

/**
 * Join game request
 */
export const joinGameSchema = z.object({
  roomCode: z
    .string()
    .length(6, 'Room code must be exactly 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Room code must be alphanumeric uppercase'),
  characterId: z.string().uuid('Invalid character ID'),
});

export type JoinGameDto = z.infer<typeof joinGameSchema>;

/**
 * Game event validation
 * - Event type must be whitelisted
 * - Event data must be valid JSON
 * - Size limit: 1MB (DoS prevention)
 */
export const gameEventSchema = z.object({
  eventType: z.enum([
    'GAME_CREATED',
    'PLAYER_JOINED',
    'CHARACTER_PLACED',
    'CARDS_SELECTED',
    'CHARACTER_MOVED',
    'ATTACK_EXECUTED',
    'DAMAGE_APPLIED',
    'CONDITION_APPLIED',
    'LOOT_COLLECTED',
    'ROUND_ENDED',
    'GAME_COMPLETED',
  ]),
  eventData: z.any().refine(
    (data) => {
      const jsonString = JSON.stringify(data);
      return jsonString.length <= 1024 * 1024; // 1MB limit
    },
    { message: 'Event data exceeds 1MB size limit' },
  ),
  playerId: z.string().uuid('Invalid player ID').optional(),
});

export type GameEventDto = z.infer<typeof gameEventSchema>;

// ========== PAGINATION SCHEMAS ==========

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .or(z.string().transform((val) => parseInt(val, 10)))
    .pipe(z.number().int().min(1)),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .or(z.string().transform((val) => parseInt(val, 10)))
    .pipe(z.number().int().min(1).max(100)),
});

export type PaginationDto = z.infer<typeof paginationSchema>;

// ========== UUID PARAMETER SCHEMA ==========

/**
 * UUID parameter validation
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export type UuidParamDto = z.infer<typeof uuidParamSchema>;
