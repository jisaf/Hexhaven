import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service - Database connection manager
 *
 * Provides type-safe database access throughout the application.
 * Handles connection lifecycle (connect on init, disconnect on destroy).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Clean database helper for tests
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }

    // Delete in order to respect foreign key constraints
    await this.progression.deleteMany();
    await this.account.deleteMany();
    await this.gameState.deleteMany();
    await this.player.deleteMany();
    await this.gameRoom.deleteMany();
  }
}
