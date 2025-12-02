/**
 * Custom Error Classes for Hexhaven Backend
 *
 * Standard error types with associated HTTP status codes:
 * - ValidationError: 400 BAD_REQUEST
 * - AuthError: 401 UNAUTHORIZED
 * - NotFoundError: 404 NOT_FOUND
 * - ConflictError: 409 CONFLICT
 * - RateLimitError: 429 TOO_MANY_REQUESTS
 */

export class ValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends Error {
  public readonly statusCode = 401;
  public readonly code = 'AUTH_ERROR';
  public readonly retryAfter?: Date;

  constructor(message: string = 'Authentication failed', options?: { retryAfter?: Date }) {
    super(message);
    this.name = 'AuthError';
    this.retryAfter = options?.retryAfter;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends Error {
  public readonly statusCode = 404;
  public readonly code = 'NOT_FOUND';
  public readonly resource?: string;

  constructor(message: string, resource?: string) {
    super(message);
    this.name = 'NotFoundError';
    this.resource = resource;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConflictError extends Error {
  public readonly statusCode = 409;
  public readonly code = 'CONFLICT';
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ConflictError';
    this.field = field;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly code = 'RATE_LIMIT_EXCEEDED';
  public readonly retryAfter?: Date;

  constructor(message: string, retryAfter?: Date) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
    timestamp: string;
    path?: string;
  };
}

/**
 * HTTP Status Codes Documentation
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
