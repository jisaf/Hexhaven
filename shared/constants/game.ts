/**
 * Game Constants
 *
 * Shared constants used across frontend and backend for consistency.
 * These values should be the single source of truth for game rules.
 */

/** Maximum number of characters a single player can control */
export const MAX_CHARACTERS_PER_PLAYER = 4;

/** Initiative value for long rest action */
export const LONG_REST_INITIATIVE = 99;

/** Starting round number for new games */
export const STARTING_ROUND = 1;

/** Maximum reconnection attempts for WebSocket */
export const MAX_RECONNECT_ATTEMPTS = 5;

/** Reconnection timeout in milliseconds (10 minutes) */
export const RECONNECTION_TIMEOUT_MS = 600000;
