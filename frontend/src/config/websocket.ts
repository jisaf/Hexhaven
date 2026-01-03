/**
 * WebSocket Configuration Constants
 *
 * Issue #419: Centralized timeout and reconnection values
 * These constants are shared across websocket.service.ts and room-session.service.ts
 * to maintain consistency and avoid magic numbers.
 */

/**
 * Socket.IO connection timeout in milliseconds
 * Increased from default 5s to 15s for slow networks (Issue #419)
 */
export const WS_CONNECTION_TIMEOUT_MS = 15000;

/**
 * WebSocket connection wait timeout for room joins
 * Same as WS_CONNECTION_TIMEOUT_MS for consistency
 */
export const WS_CONNECTION_WAIT_TIMEOUT_MS = 15000;

/**
 * Reconnection debounce delay in milliseconds
 * Prevents rapid-fire reconnection handling (Issue #419 HIGH-2)
 */
export const WS_RECONNECT_DEBOUNCE_MS = 500;

/**
 * Initial reconnection delay in milliseconds (Socket.IO)
 */
export const WS_RECONNECTION_DELAY_MS = 1000;

/**
 * Maximum reconnection delay in milliseconds (Socket.IO)
 * Exponential backoff will not exceed this value
 */
export const WS_RECONNECTION_DELAY_MAX_MS = 10000;

/**
 * Maximum number of reconnection attempts
 */
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
