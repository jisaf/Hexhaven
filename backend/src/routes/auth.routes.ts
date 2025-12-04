/**
 * Authentication Routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - Login existing user
 * POST /api/auth/refresh - Refresh access token
 * POST /api/auth/logout - Logout and invalidate refresh token
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { prisma } from '../db/client';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validation/schemas';
import { ValidationError } from '../types/errors';

const router = Router();
const authService = new AuthService(prisma);

/**
 * T081: POST /api/auth/register
 * Register a new user with username and password
 */
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError(
          'Invalid registration data',
          validation.error.flatten().fieldErrors as any,
        );
      }

      const { username, password } = validation.data;

      // Register user
      const result = await authService.register(username, password);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * T082: POST /api/auth/login
 * Login with username and password, returns tokens
 */
router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError(
          'Invalid login data',
          validation.error.flatten().fieldErrors as any,
        );
      }

      const { username, password } = validation.data;

      // Login user
      const result = await authService.login(username, password);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * T083: POST /api/auth/refresh
 * Refresh access token using valid refresh token
 */
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validation = refreshTokenSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError(
          'Invalid refresh token data',
          validation.error.flatten().fieldErrors as any,
        );
      }

      const { refreshToken } = validation.data;

      // Refresh tokens
      const tokens = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({ tokens });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * T084: POST /api/auth/logout
 * Logout user by invalidating refresh token
 */
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validation = refreshTokenSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError(
          'Invalid logout data',
          validation.error.flatten().fieldErrors as any,
        );
      }

      const { refreshToken } = validation.data;

      // Logout user
      await authService.logout(refreshToken);

      res.status(204).send(); // No content on successful logout
    } catch (error) {
      next(error);
    }
  },
);

export default router;
