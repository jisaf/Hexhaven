import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import {
  ValidationError,
  AuthError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ErrorResponse,
  HTTP_STATUS,
} from '../types/errors';

/**
 * Global error handler middleware
 *
 * Maps all errors to standardized HTTP responses:
 * - Custom errors (ValidationError, AuthError, etc.) → mapped status codes
 * - Prisma errors (unique constraint, not found, etc.) → appropriate status codes
 * - Unknown errors → 500 INTERNAL_SERVER_ERROR
 *
 * Error responses include:
 * - Standardized format with error code, message, status
 * - Stack traces only in development (not in production)
 * - Detailed logging with full stack traces
 */

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) {
  // Log error with stack trace for debugging
  console.error('[Error Handler]', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle custom application errors
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(formatErrorResponse(err, req.path));
  }

  if (err instanceof AuthError) {
    return res.status(err.statusCode).json(formatErrorResponse(err, req.path));
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json(formatErrorResponse(err, req.path));
  }

  if (err instanceof ConflictError) {
    return res.status(err.statusCode).json(formatErrorResponse(err, req.path));
  }

  if (err instanceof RateLimitError) {
    const response = formatErrorResponse(err, req.path);
    if (err.retryAfter) {
      res.setHeader('Retry-After', err.retryAfter.toISOString());
    }
    return res.status(err.statusCode).json(response);
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, req, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    } as ErrorResponse);
  }

  // Handle unknown errors (500)
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: req.path,
      // Include stack trace only in development
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  } as ErrorResponse);
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
): Response {
  switch (err.code) {
    case 'P2002': // Unique constraint violation
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {
          code: 'CONFLICT',
          message: `A record with this ${getFieldFromMeta(err.meta)} already exists`,
          statusCode: HTTP_STATUS.CONFLICT,
          details: { field: getFieldFromMeta(err.meta) },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      } as ErrorResponse);

    case 'P2025': // Record not found
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
          statusCode: HTTP_STATUS.NOT_FOUND,
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      } as ErrorResponse);

    case 'P2003': // Foreign key constraint failed
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid reference to related resource',
          statusCode: HTTP_STATUS.BAD_REQUEST,
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      } as ErrorResponse);

    default:
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'DATABASE_ERROR',
          message:
            process.env.NODE_ENV === 'production'
              ? 'A database error occurred'
              : err.message,
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      } as ErrorResponse);
  }
}

/**
 * Format error into standard response format
 */
function formatErrorResponse(
  err:
    | ValidationError
    | AuthError
    | NotFoundError
    | ConflictError
    | RateLimitError,
  path: string,
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      timestamp: new Date().toISOString(),
      path,
    },
  };

  // Add error-specific details
  if (err instanceof ValidationError && err.errors) {
    response.error.details = { errors: err.errors };
  }

  if (err instanceof NotFoundError && err.resource) {
    response.error.details = { resource: err.resource };
  }

  if (err instanceof ConflictError && err.field) {
    response.error.details = { field: err.field };
  }

  if (err instanceof RateLimitError && err.retryAfter) {
    response.error.details = { retryAfter: err.retryAfter.toISOString() };
  }

  // Include stack trace in development only
  if (process.env.NODE_ENV !== 'production') {
    response.error.details = {
      ...response.error.details,
      stack: err.stack,
    };
  }

  return response;
}

/**
 * Extract field name from Prisma error metadata
 */
function getFieldFromMeta(meta: any): string {
  if (meta && meta.target && Array.isArray(meta.target)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return meta.target.join(', ');
  }
  return 'field';
}
