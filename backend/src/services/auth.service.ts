/**
 * Authentication Service
 * Handles user registration, login, JWT token generation, and rate limiting
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import {
  RegisterDto,
  LoginDto,
  TokenPair,
  JwtPayload,
  AuthResponse,
  UserResponse,
} from '../types/auth.types';
import { ConflictError, AuthError, ValidationError } from '../types/errors';

export class AuthService {
  private prisma: PrismaClient;
  private jwtSecret: string;
  private jwtAccessExpiration: string;
  private jwtRefreshExpiration: string;
  private bcryptSaltRounds: number;
  private readonly RATE_LIMIT_MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_LOCKOUT_MINUTES = 15;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.jwtSecret = process.env.JWT_SECRET || 'replace-this-in-production';
    this.jwtAccessExpiration = process.env.JWT_ACCESS_EXPIRATION || '7d';
    this.jwtRefreshExpiration = process.env.JWT_REFRESH_EXPIRATION || '30d';
    this.bcryptSaltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  }

  /**
   * T072: Register a new user
   * Validates password length, checks username uniqueness, hashes password
   */
  async register(username: string, password: string): Promise<AuthResponse> {
    // Validate password length (>=12 chars) - T056
    if (password.length < 12) {
      throw new ValidationError('Password must be at least 12 characters', {
        password: ['Password must be at least 12 characters'],
      });
    }

    // Check username uniqueness - T055
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictError('Username already exists', 'username');
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, this.bcryptSaltRounds);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
      },
    });

    // Generate JWT tokens
    const tokens = await this.generateTokenPair(user.id, user.username);

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  /**
   * T073: Login existing user
   * Handles rate limiting, password verification, and token generation
   */
  async login(username: string, password: string): Promise<AuthResponse> {
    // Find user by username
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    // Generic error message for security (don't reveal if user exists)
    if (!user) {
      throw new AuthError('Invalid credentials');
    }

    // Check if account is locked - T059
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = user.lockedUntil;
      throw new AuthError(
        `Account locked due to too many failed login attempts. Try again after ${retryAfter.toISOString()}`,
        { retryAfter }
      );
    }

    // If lock has expired, reset the lock - T060
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    // Verify password - T058
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts - T074
      await this.handleFailedLogin(user.id, user.failedLoginAttempts);
      throw new AuthError('Invalid credentials');
    }

    // Reset failed attempts on successful login - T057
    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // Generate JWT tokens
    const tokens = await this.generateTokenPair(user.id, user.username);

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  /**
   * T074: Handle failed login attempt (rate limiting)
   * Increments counter, locks account after 5 failures
   */
  private async handleFailedLogin(
    userId: string,
    currentAttempts: number
  ): Promise<void> {
    const newAttempts = currentAttempts + 1;

    // Lock account after 5 failed attempts
    if (newAttempts >= this.RATE_LIMIT_MAX_ATTEMPTS) {
      const lockoutUntil = new Date(
        Date.now() + this.RATE_LIMIT_LOCKOUT_MINUTES * 60 * 1000
      );

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: lockoutUntil,
        },
      });
    } else {
      // Just increment counter
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: newAttempts },
      });
    }
  }

  /**
   * T075: Generate JWT access and refresh token pair
   * Access token: 7 days, Refresh token: 30 days (stored in DB)
   */
  private async generateTokenPair(
    userId: string,
    username: string
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      userId,
      username,
    };

    // Generate access token (short-lived)
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtAccessExpiration,
    } as jwt.SignOptions);

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtRefreshExpiration,
    } as jwt.SignOptions);

    // Store refresh token in database
    const expiresAt = new Date(
      Date.now() + this.parseExpiration(this.jwtRefreshExpiration)
    );

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * T076: Refresh access token using valid refresh token
   * Validates refresh token, generates new token pair, invalidates old refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AuthError('Invalid refresh token');
    }

    // Check if token is expired - T062
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new AuthError('Refresh token expired');
    }

    // Verify JWT signature
    try {
      jwt.verify(refreshToken, this.jwtSecret);
    } catch (error) {
      throw new AuthError('Invalid refresh token');
    }

    // Delete old refresh token (one-time use)
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new token pair
    const tokens = await this.generateTokenPair(
      storedToken.user.id,
      storedToken.user.username
    );

    return tokens;
  }

  /**
   * T077: Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    // Find and delete refresh token - T063
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (storedToken) {
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
    }
    // If token doesn't exist, logout is still successful (idempotent)
  }

  /**
   * T078: Verify JWT access token
   * Returns decoded payload if valid, throws error if invalid/expired
   */
  verifyAccessToken(accessToken: string): JwtPayload {
    try {
      const payload = jwt.verify(accessToken, this.jwtSecret) as JwtPayload;
      return payload;
    } catch (error) {
      throw new AuthError('Invalid or expired access token');
    }
  }

  /**
   * Helper: Convert User model to UserResponse (strip sensitive data)
   */
  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  /**
   * Helper: Parse JWT expiration string to milliseconds
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: { [key: string]: number } = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
