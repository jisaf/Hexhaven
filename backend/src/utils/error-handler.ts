/**
 * Error Handling Middleware with User-Friendly Messages
 *
 * Provides centralized error handling with appropriate HTTP status codes
 * and user-friendly error messages.
 */

import { logger } from './logger';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly isOperational: boolean = true,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, true, details);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, true);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, true);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, true);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true);
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super(500, message, false, details);
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
    details?: unknown;
    timestamp: string;
    correlationId?: string;
  };
}

/**
 * Convert error to user-friendly response
 */
export function errorToResponse(
  error: Error | AppError,
  correlationId?: string,
): ErrorResponse {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        timestamp,
        correlationId,
      },
    };
  }

  // Unknown error - don't expose internal details
  return {
    success: false,
    error: {
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp,
      correlationId,
    },
  };
}

/**
 * Log error with appropriate level
 */
export function logError(
  error: Error | AppError,
  context?: Record<string, unknown>,
): void {
  if (error instanceof AppError) {
    if (error.isOperational) {
      // Operational errors (validation, not found, etc.) - log as warnings
      logger.warn(error.message, {
        ...context,
        statusCode: error.statusCode,
        details: error.details,
      });
    } else {
      // Non-operational errors (bugs) - log as errors
      logger.error(error.message, {
        ...context,
        statusCode: error.statusCode,
        details: error.details,
        stack: error.stack,
      });
    }
  } else {
    // Unknown errors - log as errors
    logger.error(error.message, {
      ...context,
      name: error.name,
      stack: error.stack,
    });
  }
}

/**
 * Error handler middleware for Express
 * Note: All 4 parameters are required by Express error handler signature
 */
export function errorHandler(
  error: Error | AppError,
  req: { method: string; url: string },
  res: { status: (code: number) => { json: (data: unknown) => void } },
  ..._: unknown[]
): void {
  const correlationId = logger.getCorrelationId() || undefined;

  // Log the error
  logError(error, {
    method: req.method,
    url: req.url,
    correlationId,
  });

  // Send error response
  const response = errorToResponse(error, correlationId);
  res.status(response.error.statusCode).json(response);
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
) {
  return (req: any, res: any, next: (err?: Error) => void) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Helper to assert non-null values
 */
export function assertExists<T>(
  value: T | null | undefined,
  errorMessage: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(errorMessage);
  }
}

/**
 * Helper to validate conditions
 */
export function assert(condition: boolean, error: AppError): asserts condition {
  if (!condition) {
    throw error;
  }
}
