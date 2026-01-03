/**
 * Touch gesture constants
 *
 * Centralized constants for touch gesture detection across the application.
 * These values are used to distinguish between intentional taps and scroll/drag gestures.
 */

/**
 * Maximum movement in pixels allowed during a touch before it's considered a scroll/drag
 * rather than a tap. Movement beyond this threshold will:
 * - Prevent onClick from firing
 * - Cancel long-press detection
 * - Mark the touch as a scroll gesture
 */
export const TAP_MOVEMENT_THRESHOLD_PX = 10;
