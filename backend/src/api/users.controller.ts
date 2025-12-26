/**
 * Users Controller
 * Endpoints for user profile and role management
 */

import {
  Controller,
  Get,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtPayload } from '../types/auth.types';
import { prisma } from '../db/client';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('api/users')
export class UsersController {
  /**
   * GET /api/users/me
   * Get current authenticated user's profile including roles
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req: AuthenticatedRequest) {
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        roles: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      roles: user.roles,
      createdAt: user.createdAt,
    };
  }
}
