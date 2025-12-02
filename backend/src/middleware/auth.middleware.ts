/**
 * Authentication Middleware
 * Extracts and verifies JWT access tokens from Authorization header
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { prisma } from '../db/client';
import { AuthError } from '../types/errors';
import { JwtPayload } from '../types/auth.types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * T079: JWT Authentication Middleware
 * Extracts Bearer token, verifies it, and attaches user payload to request
 */
export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthError('No authorization header provided');
    }

    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthError('Invalid authorization header format. Expected: Bearer <token>');
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AuthError('No token provided');
    }

    // Verify token using AuthService
    const authService = new AuthService(prisma);
    const payload = authService.verifyAccessToken(token);

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    // Pass authentication errors to error handler
    next(error);
  }
}

/**
 * Optional JWT middleware (doesn't fail if no token)
 * Useful for routes that work for both authenticated and anonymous users
 */
export function optionalJWT(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const authService = new AuthService(prisma);
      const payload = authService.verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}
