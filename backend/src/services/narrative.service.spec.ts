/**
 * Narrative Service Unit Tests
 *
 * Tests for the narrative state management service.
 * Covers room state management, acknowledgments, and trigger checking.
 */

import { NarrativeService } from './narrative.service';
import { NarrativeConditionService } from './narrative-condition.service';
import type {
  NarrativeContent,
  ScenarioNarrativeDef,
  NarrativeTriggerDef,
  NarrativeGameContext,
} from '../../../shared/types/narrative';

// Mock PrismaService
const mockPrisma = {
  scenarioNarrative: {
    findUnique: jest.fn(),
  },
};

// Create a real NarrativeConditionService for trigger testing
const conditionService = new NarrativeConditionService();

describe('NarrativeService', () => {
  let service: NarrativeService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockPrisma.scenarioNarrative.findUnique.mockReset();

    // Create service with mocked Prisma
    service = new NarrativeService(
      mockPrisma as any,
      conditionService,
    );
  });

  describe('Room State Management', () => {
    const roomCode = 'TEST-ROOM';

    it('should initialize room state correctly', () => {
      service.initializeRoomState(roomCode);

      expect(service.isNarrativeActive(roomCode)).toBe(false);
      expect(service.getActiveNarrative(roomCode)).toBeNull();
    });

    it('should clean up room state correctly', () => {
      service.initializeRoomState(roomCode);

      // Set up some state
      const content: NarrativeContent = {
        title: 'Test',
        text: 'Test narrative',
      };
      const narrative = service.createIntroNarrative(content, [
        { id: 'player-1', name: 'Player 1' },
      ]);
      service.setActiveNarrative(roomCode, narrative);

      // Verify state exists
      expect(service.isNarrativeActive(roomCode)).toBe(true);

      // Clean up
      service.cleanupRoomState(roomCode);

      // Verify state is cleared
      expect(service.isNarrativeActive(roomCode)).toBe(false);
      expect(service.getActiveNarrative(roomCode)).toBeNull();
    });
  });

  describe('Narrative Creation', () => {
    const players = [
      { id: 'player-1', name: 'Player 1' },
      { id: 'player-2', name: 'Player 2' },
    ];
    const content: NarrativeContent = {
      title: 'Test Title',
      text: 'Test narrative text',
      imageUrl: 'http://example.com/image.png',
    };

    it('should create intro narrative with correct structure', () => {
      const narrative = service.createIntroNarrative(content, players);

      expect(narrative.type).toBe('intro');
      expect(narrative.content).toEqual(content);
      expect(narrative.acknowledgments).toHaveLength(2);
      expect(narrative.acknowledgments[0].playerId).toBe('player-1');
      expect(narrative.acknowledgments[0].acknowledged).toBe(false);
      expect(narrative.acknowledgments[1].playerId).toBe('player-2');
      expect(narrative.acknowledgments[1].acknowledged).toBe(false);
      expect(narrative.disconnectedPlayers).toEqual([]);
      expect(narrative.timeoutMs).toBe(60000);
    });

    it('should create victory narrative with correct type', () => {
      const narrative = service.createOutroNarrative('victory', content, players);

      expect(narrative.type).toBe('victory');
      expect(narrative.content).toEqual(content);
    });

    it('should create defeat narrative with correct type', () => {
      const narrative = service.createOutroNarrative('defeat', content, players);

      expect(narrative.type).toBe('defeat');
      expect(narrative.content).toEqual(content);
    });

    it('should create trigger narrative with rewards and effects', () => {
      const trigger: NarrativeTriggerDef = {
        id: 'trigger-1',
        triggerId: 'ambush',
        content,
        conditions: { type: 'round_reached', params: { round: 1 } },
        rewards: { gold: 10, xp: 5 },
        gameEffects: {
          spawnMonsters: [{ type: 'living-bones', hex: { q: 0, r: 0 } }],
        },
      };

      const narrative = service.createTriggerNarrative(trigger, players);

      expect(narrative.type).toBe('trigger');
      expect(narrative.triggerId).toBe('ambush');
      expect(narrative.rewards).toEqual({ gold: 10, xp: 5 });
      expect(narrative.gameEffects?.spawnMonsters).toHaveLength(1);
    });
  });

  describe('Acknowledgment System', () => {
    const roomCode = 'ACK-TEST';
    const players = [
      { id: 'player-1', name: 'Player 1' },
      { id: 'player-2', name: 'Player 2' },
      { id: 'player-3', name: 'Player 3' },
    ];
    const content: NarrativeContent = { text: 'Test' };

    beforeEach(() => {
      service.initializeRoomState(roomCode);
      const narrative = service.createIntroNarrative(content, players);
      service.setActiveNarrative(roomCode, narrative);
    });

    it('should track individual player acknowledgments', () => {
      expect(service.areAllAcknowledged(roomCode)).toBe(false);

      const result = service.acknowledgeNarrative(roomCode, 'player-1');

      expect(result).toBe(false); // Not all acknowledged yet
      expect(service.areAllAcknowledged(roomCode)).toBe(false);
    });

    it('should return true when all players acknowledge', () => {
      service.acknowledgeNarrative(roomCode, 'player-1');
      service.acknowledgeNarrative(roomCode, 'player-2');
      const result = service.acknowledgeNarrative(roomCode, 'player-3');

      expect(result).toBe(true);
      expect(service.areAllAcknowledged(roomCode)).toBe(true);
    });

    it('should return false for unknown player', () => {
      const result = service.acknowledgeNarrative(roomCode, 'unknown-player');

      expect(result).toBe(false);
    });

    it('should return false for no active narrative', () => {
      service.clearActiveNarrative(roomCode);

      const result = service.acknowledgeNarrative(roomCode, 'player-1');

      expect(result).toBe(false);
    });
  });

  describe('Disconnected Player Handling', () => {
    const roomCode = 'DISCONNECT-TEST';
    const players = [
      { id: 'player-1', name: 'Player 1' },
      { id: 'player-2', name: 'Player 2' },
    ];
    const content: NarrativeContent = { text: 'Test' };

    beforeEach(() => {
      service.initializeRoomState(roomCode);
      const narrative = service.createIntroNarrative(content, players);
      service.setActiveNarrative(roomCode, narrative);
    });

    it('should track disconnected players', () => {
      service.markPlayerDisconnected(roomCode, 'player-1');

      const narrative = service.getActiveNarrative(roomCode);
      expect(narrative?.disconnectedPlayers).toContain('player-1');
    });

    it('should not duplicate disconnected players', () => {
      service.markPlayerDisconnected(roomCode, 'player-1');
      service.markPlayerDisconnected(roomCode, 'player-1');

      const narrative = service.getActiveNarrative(roomCode);
      expect(narrative?.disconnectedPlayers).toHaveLength(1);
    });

    it('should not auto-acknowledge before timeout', () => {
      service.markPlayerDisconnected(roomCode, 'player-1');

      // Try auto-acknowledge immediately (before timeout)
      const result = service.autoAcknowledgeDisconnected(roomCode);

      expect(result).toBe(false);
    });
  });

  describe('Narrative Queue', () => {
    const roomCode = 'QUEUE-TEST';
    const content: NarrativeContent = { text: 'Test' };
    const players = [{ id: 'player-1', name: 'Player 1' }];

    beforeEach(() => {
      service.initializeRoomState(roomCode);
    });

    it('should queue narratives when one is active', () => {
      const narrative1 = service.createIntroNarrative(content, players);
      const narrative2 = service.createIntroNarrative({ text: 'Second' }, players);

      service.setActiveNarrative(roomCode, narrative1);
      const queued = service.queueNarrative(roomCode, narrative2);

      expect(queued).toBe(true);
    });

    it('should dequeue narratives in order', () => {
      const narrative1 = service.createIntroNarrative({ text: 'First' }, players);
      const narrative2 = service.createIntroNarrative({ text: 'Second' }, players);
      const narrative3 = service.createIntroNarrative({ text: 'Third' }, players);

      service.queueNarrative(roomCode, narrative1);
      service.queueNarrative(roomCode, narrative2);
      service.queueNarrative(roomCode, narrative3);

      const first = service.dequeueNarrative(roomCode);
      expect(first?.content.text).toBe('First');

      const second = service.dequeueNarrative(roomCode);
      expect(second?.content.text).toBe('Second');

      const third = service.dequeueNarrative(roomCode);
      expect(third?.content.text).toBe('Third');

      const empty = service.dequeueNarrative(roomCode);
      expect(empty).toBeNull();
    });

    it('should limit queue to 3 narratives', () => {
      for (let i = 0; i < 4; i++) {
        service.queueNarrative(
          roomCode,
          service.createIntroNarrative({ text: `Narrative ${i}` }, players),
        );
      }

      // Fourth should be rejected
      let count = 0;
      while (service.dequeueNarrative(roomCode) !== null) {
        count++;
      }
      expect(count).toBe(3);
    });
  });

  describe('Trigger Checking', () => {
    const roomCode = 'TRIGGER-TEST';
    const narrativeDef: ScenarioNarrativeDef = {
      scenarioId: 'scenario-1',
      triggers: [
        {
          id: 'trigger-1',
          triggerId: 'round-3-trigger',
          displayOrder: 1,
          content: { text: 'Round 3 reached!' },
          conditions: { type: 'round_reached', params: { round: 3 } },
        },
        {
          id: 'trigger-2',
          triggerId: 'all-dead-trigger',
          displayOrder: 2,
          content: { text: 'All enemies defeated!' },
          conditions: { type: 'all_enemies_dead' },
        },
      ],
    };

    const baseContext: NarrativeGameContext = {
      currentRound: 1,
      characters: [{ id: 'char-1', characterClass: 'brute', hex: { q: 0, r: 0 } }],
      monsters: [{ id: 'mon-1', type: 'living-bones', isAlive: true }],
      monstersKilled: 0,
      monstersKilledByType: {},
      openedDoors: [],
      collectedTreasures: [],
      collectedLootHexes: [],
    };

    beforeEach(() => {
      service.initializeRoomState(roomCode);
    });

    it('should not fire trigger when conditions not met', () => {
      const trigger = service.checkTriggers(roomCode, narrativeDef, baseContext);

      expect(trigger).toBeNull();
    });

    it('should fire trigger when conditions are met', () => {
      const contextRound3 = { ...baseContext, currentRound: 3 };
      const trigger = service.checkTriggers(roomCode, narrativeDef, contextRound3);

      expect(trigger).not.toBeNull();
      expect(trigger?.triggerId).toBe('round-3-trigger');
    });

    it('should not fire same trigger twice', () => {
      const contextRound3 = { ...baseContext, currentRound: 3 };

      // First check fires the trigger
      const first = service.checkTriggers(roomCode, narrativeDef, contextRound3);
      expect(first?.triggerId).toBe('round-3-trigger');

      // Second check should not fire the same trigger
      const second = service.checkTriggers(roomCode, narrativeDef, contextRound3);
      expect(second).toBeNull();
    });

    it('should fire triggers in displayOrder', () => {
      // Context that satisfies both triggers
      const context: NarrativeGameContext = {
        ...baseContext,
        currentRound: 3,
        monsters: [{ id: 'mon-1', type: 'living-bones', isAlive: false }],
      };

      // First trigger should be round-3 (displayOrder: 1)
      const first = service.checkTriggers(roomCode, narrativeDef, context);
      expect(first?.triggerId).toBe('round-3-trigger');

      // Next trigger should be all-dead (displayOrder: 2)
      const second = service.checkTriggers(roomCode, narrativeDef, context);
      expect(second?.triggerId).toBe('all-dead-trigger');
    });
  });

  describe('Clear Active Narrative', () => {
    const roomCode = 'CLEAR-TEST';

    beforeEach(() => {
      service.initializeRoomState(roomCode);
    });

    it('should return cleared narrative', () => {
      const content: NarrativeContent = { text: 'Test' };
      const narrative = service.createIntroNarrative(content, [
        { id: 'player-1', name: 'Player 1' },
      ]);
      service.setActiveNarrative(roomCode, narrative);

      const cleared = service.clearActiveNarrative(roomCode);

      expect(cleared).toEqual(narrative);
      expect(service.getActiveNarrative(roomCode)).toBeNull();
      expect(service.isNarrativeActive(roomCode)).toBe(false);
    });

    it('should return null when no active narrative', () => {
      const cleared = service.clearActiveNarrative(roomCode);

      expect(cleared).toBeNull();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      // Prime the cache with a mock response
      mockPrisma.scenarioNarrative.findUnique.mockResolvedValue({
        id: 'narrative-1',
        scenarioId: 'scenario-1',
        introText: 'Test intro',
        introTitle: null,
        introImageUrl: null,
        victoryText: null,
        victoryTitle: null,
        victoryImageUrl: null,
        defeatText: null,
        defeatTitle: null,
        defeatImageUrl: null,
        triggers: [],
      });

      // Load narrative to populate cache
      await service.loadScenarioNarrative('scenario-1');
      expect(mockPrisma.scenarioNarrative.findUnique).toHaveBeenCalledTimes(1);

      // Load again - should use cache
      await service.loadScenarioNarrative('scenario-1');
      expect(mockPrisma.scenarioNarrative.findUnique).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache();

      // Load again - should hit database
      await service.loadScenarioNarrative('scenario-1');
      expect(mockPrisma.scenarioNarrative.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
