/**
 * Authentication Controller (NestJS)
 * Endpoints for user registration, login, token refresh, and logout
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { prisma } from '../db/client';
import type {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponse,
  TokenPair,
} from '../types/auth.types';

@Controller('api/auth')
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(prisma);
  }

  /**
   * T081: POST /api/auth/register
   * Register a new user with username and password
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    const { username, password } = registerDto;
    return await this.authService.register(username, password);
  }

  /**
   * T082: POST /api/auth/login
   * Login with username and password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    const { username, password } = loginDto;
    return await this.authService.login(username, password);
  }

  /**
   * T083: POST /api/auth/refresh
   * Refresh access token using valid refresh token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
  ): Promise<{ tokens: TokenPair }> {
    const tokens = await this.authService.refreshAccessToken(
      refreshDto.refreshToken,
    );
    return { tokens };
  }

  /**
   * T084: POST /api/auth/logout
   * Logout user by invalidating refresh token
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() refreshDto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(refreshDto.refreshToken);
  }
}
