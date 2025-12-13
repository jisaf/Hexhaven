/**
 * Global HTTP Exception Filter
 * Formats all exceptions into a consistent ErrorResponse structure
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import type { ErrorResponse } from '../types/errors';
import {
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../types/errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status: number;
    let errorResponse: ErrorResponse;

    // Handle custom error types
    if (exception instanceof ValidationError) {
      status = exception.statusCode;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          statusCode: status,
          details: exception.errors,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    } else if (exception instanceof AuthError) {
      status = exception.statusCode;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          statusCode: status,
          details: exception.retryAfter
            ? { retryAfter: exception.retryAfter }
            : undefined,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    } else if (exception instanceof ForbiddenError) {
      status = exception.statusCode;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    } else if (exception instanceof NotFoundError) {
      status = exception.statusCode;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          statusCode: status,
          details: exception.resource
            ? { resource: exception.resource }
            : undefined,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    } else if (exception instanceof ConflictError) {
      status = exception.statusCode;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          statusCode: status,
          details: exception.field ? { field: exception.field } : undefined,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    } else if (exception instanceof RateLimitError) {
      status = exception.statusCode;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          statusCode: status,
          details: exception.retryAfter
            ? { retryAfter: exception.retryAfter }
            : undefined,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    } else if (exception instanceof HttpException) {
      // Handle NestJS HttpException
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extract message from NestJS exception response
      let message: string;
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        const msg = (exceptionResponse as any).message;
        message = Array.isArray(msg) ? msg.join(', ') : msg;
      } else {
        message = exception.message;
      }

      errorResponse = {
        error: {
          code: this.getErrorCode(status),
          message,
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    } else {
      // Handle unknown errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        exception instanceof Error
          ? exception.message
          : 'Internal server error';

      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      errorResponse = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Map HTTP status codes to error codes
   */
  private getErrorCode(status: number): string {
    // Compare using explicit numeric values to satisfy @typescript-eslint/no-unsafe-enum-comparison
    switch (status) {
      case 400: // HttpStatus.BAD_REQUEST
        return 'VALIDATION_ERROR';
      case 401: // HttpStatus.UNAUTHORIZED
        return 'AUTH_ERROR';
      case 403: // HttpStatus.FORBIDDEN
        return 'FORBIDDEN';
      case 404: // HttpStatus.NOT_FOUND
        return 'NOT_FOUND';
      case 409: // HttpStatus.CONFLICT
        return 'CONFLICT';
      case 429: // HttpStatus.TOO_MANY_REQUESTS
        return 'RATE_LIMIT_EXCEEDED';
      case 500: // HttpStatus.INTERNAL_SERVER_ERROR
        return 'INTERNAL_SERVER_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }
}
