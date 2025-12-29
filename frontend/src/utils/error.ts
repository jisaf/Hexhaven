/**
 * Error handling utilities
 */

/**
 * Extract error message from unknown error type
 * @param error - The error object (can be Error, string, or unknown)
 * @param fallback - Fallback message if error cannot be extracted
 * @returns Extracted error message or fallback
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}
