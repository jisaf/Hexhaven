/**
 * Creator Role Guard (Issue #205)
 *
 * NestJS guard for protecting item creation/update routes.
 * Requires user to have 'creator' role.
 * Note: Admin role does NOT grant creator permissions - roles are independent.
 * Users can have both roles if needed.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { prisma } from '../db/client';
import { UserRole } from '../../../shared/types/entities';

@Injectable()
export class CreatorGuard implements CanActivate {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // First verify JWT token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const token = authHeader.substring(7);

    let payload;
    try {
      payload = this.authService.verifyAccessToken(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Then check for creator role (admin does NOT automatically grant creator)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = (user.roles as UserRole[]) || [];
    const hasCreatorRole = roles.includes('creator');

    if (!hasCreatorRole) {
      throw new ForbiddenException(
        'You do not have permission to perform this action. Creator role required.',
      );
    }

    return true;
  }
}

/**
 * Admin Role Guard
 *
 * NestJS guard for protecting admin-only routes.
 * Requires user to have 'admin' role.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // First verify JWT token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const token = authHeader.substring(7);

    let payload;
    try {
      payload = this.authService.verifyAccessToken(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Then check for admin role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = (user.roles as UserRole[]) || [];
    const hasAdminRole = roles.includes('admin');

    if (!hasAdminRole) {
      throw new ForbiddenException(
        'You do not have permission to perform this action. Admin role required.',
      );
    }

    return true;
  }
}
