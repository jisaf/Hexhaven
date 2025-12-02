import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/errors';

/**
 * Validation Middleware
 *
 * Validates request data (body, query, params) against Zod schemas
 * Returns 400 BAD_REQUEST with detailed validation errors
 * Logs validation failures for security monitoring
 *
 * Usage:
 *   router.post('/auth/register', validate(registerSchema), registerHandler);
 */

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request data against schema
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request data with validated data
      req.body = (validated as any).body;
      req.query = (validated as any).query;
      req.params = (validated as any).params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log validation failure for security monitoring
        console.warn('[Validation Failed]', {
          path: req.path,
          method: req.method,
          errors: error.issues,
          ip: req.ip,
        });

        // Format validation errors into user-friendly messages
        const errors: Record<string, string[]> = {};
        error.issues.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        // Return standardized validation error
        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Body-only validation (simpler, for most endpoints)
 */
export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.warn('[Body Validation Failed]', {
          path: req.path,
          method: req.method,
          errors: error.issues,
        });

        const errors: Record<string, string[]> = {};
        error.issues.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Query parameters validation
 */
export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.issues.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        next(new ValidationError('Query validation failed', errors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * URL parameters validation
 */
export function validateParams(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.issues.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        next(new ValidationError('Parameter validation failed', errors));
      } else {
        next(error);
      }
    }
  };
}
