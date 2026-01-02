/**
 * Action Protocol Types (Phase 2: WebSocket Reliability)
 *
 * Defines the request/response protocol for reliable action delivery.
 * Every action sent to the server includes a unique request ID and
 * receives an acknowledgment response.
 */

/**
 * Base action request - included in all action payloads
 */
export interface ActionRequest {
  /** Unique ID for tracking this specific request (UUID) */
  requestId: string;
  /** Timestamp when the request was created */
  timestamp: number;
}

/**
 * Base action response - returned by all action handlers
 */
export interface ActionResponse {
  /** Echoed request ID for correlation */
  requestId: string;
  /** Whether the action was processed successfully */
  success: boolean;
  /** Error details if success is false */
  error?: ActionError;
  /** Server-side timestamp when the action was processed */
  serverTimestamp: number;
}

/**
 * Error details for failed actions
 */
export interface ActionError {
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
}

// ============================================================
// Specific Action Payloads with Request ID
// ============================================================

/**
 * Card selection action with acknowledgment support
 */
export interface SelectCardsRequest extends ActionRequest {
  topCardId: string;
  bottomCardId: string;
  characterId?: string;
}

/**
 * Character movement action with acknowledgment support
 */
export interface MoveCharacterRequest extends ActionRequest {
  characterId: string;
  targetHex: { q: number; r: number };
}

/**
 * Attack action with acknowledgment support
 */
export interface AttackTargetRequest extends ActionRequest {
  characterId: string;
  targetId: string;
}

/**
 * End turn action with acknowledgment support
 */
export interface EndTurnRequest extends ActionRequest {
  // No additional fields needed
}

/**
 * Rest action with acknowledgment support
 */
export interface RestRequest extends ActionRequest {
  characterId: string;
  type: 'short' | 'long';
  cardToLose?: string;
}

/**
 * Rest decision action with acknowledgment support
 */
export interface RestActionRequest extends ActionRequest {
  characterId: string;
  action: 'accept' | 'reroll';
}

// ============================================================
// Error Codes
// ============================================================

/**
 * Standard error codes for action failures
 */
export const ActionErrorCodes = {
  // Connection errors
  NOT_CONNECTED: 'NOT_CONNECTED',
  TIMEOUT: 'TIMEOUT',

  // Game state errors
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_ACTION: 'INVALID_ACTION',
  CHARACTER_NOT_FOUND: 'CHARACTER_NOT_FOUND',
  TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',

  // Card errors
  CARD_NOT_IN_HAND: 'CARD_NOT_IN_HAND',
  CARDS_ALREADY_SELECTED: 'CARDS_ALREADY_SELECTED',

  // Movement errors
  INVALID_HEX: 'INVALID_HEX',
  HEX_BLOCKED: 'HEX_BLOCKED',
  INSUFFICIENT_MOVEMENT: 'INSUFFICIENT_MOVEMENT',

  // Attack errors
  TARGET_OUT_OF_RANGE: 'TARGET_OUT_OF_RANGE',
  NO_ATTACK_AVAILABLE: 'NO_ATTACK_AVAILABLE',

  // Rest errors
  INSUFFICIENT_CARDS_FOR_REST: 'INSUFFICIENT_CARDS_FOR_REST',
  REST_NOT_ALLOWED: 'REST_NOT_ALLOWED',

  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ActionErrorCode = (typeof ActionErrorCodes)[keyof typeof ActionErrorCodes];
