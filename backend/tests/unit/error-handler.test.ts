import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { errorHandler } from '../../src/middleware/error.middleware';
import {
  ValidationError,
  AuthError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  HTTP_STATUS,
} from '../../src/types/errors';

/**
 * Error Handler Middleware Tests
 *
 * Tests all error scenarios:
 * - ValidationError → 400 BAD_REQUEST
 * - AuthError → 401 UNAUTHORIZED
 * - NotFoundError → 404 NOT_FOUND
 * - ConflictError → 409 CONFLICT
 * - RateLimitError → 429 TOO_MANY_REQUESTS
 * - Prisma errors → appropriate status codes
 * - Unknown errors → 500 INTERNAL_SERVER_ERROR
 */

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = jest.fn();

    mockReq = {
      path: '/api/test',
      method: 'POST',
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    };

    mockNext = jest.fn();

    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Custom Application Errors', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Validation failed', {
        username: ['Username is required'],
        password: ['Password must be at least 12 characters'],
      });

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            statusCode: 400,
            details: expect.objectContaining({
              errors: {
                username: ['Username is required'],
                password: ['Password must be at least 12 characters'],
              },
            }),
          }),
        }),
      );
    });

    it('should handle AuthError with 401 status', () => {
      const error = new AuthError('Invalid credentials');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTH_ERROR',
            message: 'Invalid credentials',
            statusCode: 401,
          }),
        }),
      );
    });

    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('User not found', 'User');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'User not found',
            statusCode: 404,
            details: expect.objectContaining({
              resource: 'User',
            }),
          }),
        }),
      );
    });

    it('should handle ConflictError with 409 status', () => {
      const error = new ConflictError('Username already exists', 'username');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'CONFLICT',
            message: 'Username already exists',
            statusCode: 409,
            details: expect.objectContaining({
              field: 'username',
            }),
          }),
        }),
      );
    });

    it('should handle RateLimitError with 429 status and Retry-After header', () => {
      const retryAfter = new Date(Date.now() + 900000); // 15 minutes
      const error = new RateLimitError('Too many attempts', retryAfter);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Retry-After',
        retryAfter.toISOString(),
      );
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many attempts',
            statusCode: 429,
          }),
        }),
      );
    });
  });

  describe('Prisma Errors', () => {
    it('should handle Prisma unique constraint violation (P2002) as 409 CONFLICT', () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['username'] },
        },
      );

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'CONFLICT',
            statusCode: 409,
            details: expect.objectContaining({
              field: 'username',
            }),
          }),
        }),
      );
    });

    it('should handle Prisma record not found (P2025) as 404 NOT_FOUND', () => {
      const error = new PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: {},
        },
      );

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            statusCode: 404,
          }),
        }),
      );
    });

    it('should handle Prisma validation error as 400 BAD_REQUEST', () => {
      const error = new PrismaClientValidationError(
        'Invalid input data',
        { clientVersion: '5.0.0' },
      );

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          }),
        }),
      );
    });
  });

  describe('Unknown Errors', () => {
    it('should handle unknown errors as 500 INTERNAL_SERVER_ERROR', () => {
      const error = new Error('Something unexpected happened');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
            statusCode: 500,
          }),
        }),
      );
    });

    it('should hide error message in production for unknown errors', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal database connection failed');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'An unexpected error occurred',
          }),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should include error message in development for unknown errors', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Database connection timeout');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection timeout',
          }),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Response Format', () => {
    it('should include timestamp in all error responses', () => {
      const error = new ValidationError('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should include request path in all error responses', () => {
      const error = new ValidationError('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            path: '/api/test',
          }),
        }),
      );
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new ValidationError('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details?.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
