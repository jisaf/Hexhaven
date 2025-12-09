/**
 * Unit Tests for HttpExceptionFilter
 */

import { HttpException, HttpStatus, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ValidationError, AuthError, NotFoundError, ConflictError } from '../types/errors';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/test',
    };

    mockArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  describe('Custom Error Types', () => {
    it('should format ValidationError correctly', () => {
      const error = new ValidationError('Validation failed', {
        username: ['Username is required'],
      });

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            statusCode: 400,
            details: { username: ['Username is required'] },
            path: '/api/test',
          }),
        }),
      );
    });

    it('should format AuthError correctly', () => {
      const error = new AuthError('Authentication failed');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTH_ERROR',
            message: 'Authentication failed',
            statusCode: 401,
            path: '/api/test',
          }),
        }),
      );
    });

    it('should format NotFoundError correctly', () => {
      const error = new NotFoundError('User not found', 'User');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'User not found',
            statusCode: 404,
            details: { resource: 'User' },
            path: '/api/test',
          }),
        }),
      );
    });

    it('should format ConflictError correctly', () => {
      const error = new ConflictError('Username already exists', 'username');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'CONFLICT',
            message: 'Username already exists',
            statusCode: 409,
            details: { field: 'username' },
            path: '/api/test',
          }),
        }),
      );
    });
  });

  describe('NestJS HttpException', () => {
    it('should format BadRequestException with string message', () => {
      const error = new BadRequestException('Invalid input');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            statusCode: 400,
            path: '/api/test',
          }),
        }),
      );
    });

    it('should format BadRequestException with array message', () => {
      const error = new BadRequestException(['Field 1 error', 'Field 2 error']);

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Field 1 error, Field 2 error',
            statusCode: 400,
          }),
        }),
      );
    });

    it('should format UnauthorizedException correctly', () => {
      const error = new UnauthorizedException('Invalid token');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTH_ERROR',
            message: 'Invalid token',
            statusCode: 401,
          }),
        }),
      );
    });
  });

  describe('Unknown Errors', () => {
    it('should format generic Error as internal server error', () => {
      const error = new Error('Something went wrong');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            statusCode: 500,
          }),
        }),
      );
    });

    it('should handle non-Error exceptions', () => {
      const error = 'Some string error';

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            statusCode: 500,
          }),
        }),
      );
    });
  });

  describe('Error Response Structure', () => {
    it('should always include timestamp', () => {
      const error = new ValidationError('Test error');

      filter.catch(error, mockArgumentsHost);

      const callArg = mockResponse.json.mock.calls[0][0];
      expect(callArg.error.timestamp).toBeDefined();
      expect(new Date(callArg.error.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should always include path from request', () => {
      mockRequest.url = '/api/auth/login';
      const error = new AuthError('Test error');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            path: '/api/auth/login',
          }),
        }),
      );
    });
  });
});
