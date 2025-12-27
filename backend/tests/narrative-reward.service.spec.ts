/**
 * Narrative Reward Service Tests
 *
 * Tests for:
 * - TTL-based cleanup mechanism for accumulated rewards (memory leak fix)
 * - Room lifecycle integration
 * - Reward calculation and persistence
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NarrativeRewardService } from '../src/services/narrative-reward.service';
import { PrismaService } from '../src/services/prisma.service';

describe('NarrativeRewardService', () => {
  let service: NarrativeRewardService;
  let mockPrismaService: {
    character: {
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrismaService = {
      character: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NarrativeRewardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NarrativeRewardService>(NarrativeRewardService);
  });

  afterEach(() => {
    // Clean up any pending timers
    service.stopCleanupTimer();
  });

  describe('TTL-based Cleanup', () => {
    it('should automatically clean up stale room rewards after TTL expires', async () => {
      jest.useFakeTimers();

      // Apply rewards to a room
      const roomCode = 'STALE';
      const rewards = { gold: 100, xp: 50 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      await service.applyRewards(roomCode, rewards, players);

      // Verify rewards are tracked
      const rewardsBefore = service.getAccumulatedRewards(roomCode);
      expect(rewardsBefore.size).toBeGreaterThan(0);

      // Advance time past the TTL (default should be 2 hours)
      jest.advanceTimersByTime(2 * 60 * 60 * 1000 + 1000);

      // Trigger cleanup check
      service.runCleanup();

      // Verify rewards are cleaned up
      const rewardsAfter = service.getAccumulatedRewards(roomCode);
      expect(rewardsAfter.size).toBe(0);

      jest.useRealTimers();
    });

    it('should NOT clean up rewards that are within TTL', async () => {
      jest.useFakeTimers();

      const roomCode = 'FRESH';
      const rewards = { gold: 100, xp: 50 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      await service.applyRewards(roomCode, rewards, players);

      // Advance time but stay within TTL
      jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

      // Trigger cleanup check
      service.runCleanup();

      // Verify rewards are still present
      const rewardsAfter = service.getAccumulatedRewards(roomCode);
      expect(rewardsAfter.size).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should update room access time when rewards are applied', async () => {
      jest.useFakeTimers();

      const roomCode = 'ACTIVE';
      const rewards = { gold: 50, xp: 25 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      // Apply rewards initially
      await service.applyRewards(roomCode, rewards, players);

      // Advance time close to TTL
      jest.advanceTimersByTime(1.9 * 60 * 60 * 1000); // 1.9 hours

      // Apply more rewards - should refresh TTL
      await service.applyRewards(roomCode, rewards, players);

      // Advance time past original TTL but within refreshed TTL
      jest.advanceTimersByTime(30 * 60 * 1000); // 30 more minutes

      // Trigger cleanup
      service.runCleanup();

      // Rewards should still be present due to refreshed TTL
      const rewardsAfter = service.getAccumulatedRewards(roomCode);
      expect(rewardsAfter.size).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should update room access time when accumulated rewards are read', async () => {
      jest.useFakeTimers();

      const roomCode = 'READ_ACCESS';
      const rewards = { gold: 50, xp: 25 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      // Apply rewards - must await async operation
      await service.applyRewards(roomCode, rewards, players);

      // Advance time close to TTL
      jest.advanceTimersByTime(1.9 * 60 * 60 * 1000);

      // Read rewards - should refresh TTL
      service.getAccumulatedRewards(roomCode, true); // refreshTTL = true

      // Advance time past original TTL
      jest.advanceTimersByTime(30 * 60 * 1000);

      // Trigger cleanup
      service.runCleanup();

      // Rewards should still be present
      const rewardsAfter = service.getAccumulatedRewards(roomCode);
      expect(rewardsAfter.size).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should clean up multiple stale rooms in one cleanup run', async () => {
      jest.useFakeTimers();

      const rewards = { gold: 50, xp: 25 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      // Create multiple rooms
      await service.applyRewards('ROOM1', rewards, players);
      await service.applyRewards('ROOM2', rewards, players);
      await service.applyRewards('ROOM3', rewards, players);

      // Advance time past TTL
      jest.advanceTimersByTime(2.5 * 60 * 60 * 1000);

      // Trigger cleanup
      service.runCleanup();

      // All rooms should be cleaned up
      expect(service.getAccumulatedRewards('ROOM1').size).toBe(0);
      expect(service.getAccumulatedRewards('ROOM2').size).toBe(0);
      expect(service.getAccumulatedRewards('ROOM3').size).toBe(0);

      jest.useRealTimers();
    });

    it('should start periodic cleanup on service initialization', () => {
      // Verify cleanup timer is set
      expect(service.isCleanupTimerActive()).toBe(true);
    });

    it('should stop cleanup timer when requested', () => {
      service.stopCleanupTimer();
      expect(service.isCleanupTimerActive()).toBe(false);
    });
  });

  describe('Room Lifecycle Integration', () => {
    it('should clear rewards when room is explicitly cleared', async () => {
      const roomCode = 'EXPLICIT';
      const rewards = { gold: 100, xp: 50 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      await service.applyRewards(roomCode, rewards, players);
      expect(service.getAccumulatedRewards(roomCode).size).toBeGreaterThan(0);

      service.clearAccumulatedRewards(roomCode);
      expect(service.getAccumulatedRewards(roomCode).size).toBe(0);
    });

    it('should also clear room timestamp when rewards are cleared', async () => {
      const roomCode = 'CLEAR_TS';
      const rewards = { gold: 100, xp: 50 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      await service.applyRewards(roomCode, rewards, players);
      service.clearAccumulatedRewards(roomCode);

      // Room should no longer have a last access timestamp
      expect(service.hasRoomData(roomCode)).toBe(false);
    });
  });

  describe('Reward Application', () => {
    it('should correctly apply rewards to all players', async () => {
      const roomCode = 'MULTI';
      const rewards = { gold: 100, xp: 50 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
        { id: 'p2', userId: 'user2', characterId: 'char2' },
      ];

      const result = await service.applyRewards(roomCode, rewards, players);

      expect(result.success).toBe(true);
      expect(result.rewardedPlayers).toHaveLength(2);
      expect(mockPrismaService.character.update).toHaveBeenCalledTimes(2);
    });

    it('should distribute collective rewards evenly', async () => {
      const roomCode = 'COLLECTIVE';
      const rewards = { gold: 100, xp: 50, distribution: 'collective' as const };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
        { id: 'p2', userId: 'user2', characterId: 'char2' },
      ];

      const result = await service.applyRewards(roomCode, rewards, players);

      expect(result.success).toBe(true);
      expect(result.rewardedPlayers[0].gold).toBe(50); // 100 / 2
      expect(result.rewardedPlayers[0].xp).toBe(25);   // 50 / 2
    });

    it('should give full rewards to triggerer only when distribution is triggerer', async () => {
      const roomCode = 'TRIGGER';
      const rewards = { gold: 100, xp: 50, distribution: 'triggerer' as const };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
        { id: 'p2', userId: 'user2', characterId: 'char2' },
      ];

      const result = await service.applyRewards(roomCode, rewards, players, 'user1');

      expect(result.success).toBe(true);
      expect(result.rewardedPlayers).toHaveLength(1);
      expect(result.rewardedPlayers[0].playerId).toBe('p1');
      expect(result.rewardedPlayers[0].gold).toBe(100);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.character.update.mockRejectedValue(new Error('DB Error'));

      const roomCode = 'ERROR';
      const rewards = { gold: 100, xp: 50 };
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      const result = await service.applyRewards(roomCode, rewards, players);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Accumulated Rewards Tracking', () => {
    it('should accumulate rewards across multiple applications', async () => {
      const roomCode = 'ACCUM';
      const players = [
        { id: 'p1', userId: 'user1', characterId: 'char1' },
      ];

      await service.applyRewards(roomCode, { gold: 50, xp: 25 }, players);
      await service.applyRewards(roomCode, { gold: 30, xp: 15 }, players);

      const accumulated = service.getAccumulatedRewards(roomCode);
      const userRewards = accumulated.get('user1');

      expect(userRewards?.gold).toBe(80);
      expect(userRewards?.xp).toBe(40);
    });
  });
});
