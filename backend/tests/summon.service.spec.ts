/**
 * SummonService Tests (Issue #228 - Phase 2)
 *
 * TDD tests for the SummonService that manages summon lifecycle:
 * - Creating summons from definitions
 * - Validating placement hexes
 * - Getting valid placement options
 * - Killing summons when their owner is exhausted/dies
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SummonService } from '../src/services/summon.service';
import { MonsterAIService } from '../src/services/monster-ai.service';
import { Summon, SummonData } from '../src/models/summon.model';
import { SummonDefinition } from '../../shared/types/modifiers';
import { AxialCoordinates } from '../../shared/types/entities';

describe('SummonService', () => {
  let service: SummonService;
  let monsterAIService: MonsterAIService;

  const baseSummonDefinition: SummonDefinition = {
    name: 'Mystic Ally',
    health: 4,
    attack: 2,
    move: 3,
    range: 1,
    typeIcon: 'ra-wolf-howl',
  };

  const createSummon = (overrides: Partial<SummonData> = {}): Summon => {
    const baseData: SummonData = {
      id: 'summon-1',
      roomId: 'room-1',
      ownerId: 'character-1',
      name: 'Mystic Ally',
      position: { q: 0, r: 0 },
      health: 4,
      maxHealth: 4,
      attack: 2,
      move: 3,
      range: 1,
      conditions: [],
      isDead: false,
      playerControlled: false,
      initiative: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return new Summon({ ...baseData, ...overrides });
  };

  /**
   * Creates a hexMap with a grid of walkable hexes around the origin.
   * By default creates a 5x5 grid centered at (0,0).
   */
  const createHexMap = (
    size: number = 5,
    obstacles: AxialCoordinates[] = [],
  ): Map<string, { terrain?: string }> => {
    const hexMap = new Map<string, { terrain?: string }>();
    const halfSize = Math.floor(size / 2);

    for (let q = -halfSize; q <= halfSize; q++) {
      for (let r = -halfSize; r <= halfSize; r++) {
        const isObstacle = obstacles.some((obs) => obs.q === q && obs.r === r);
        hexMap.set(`${q},${r}`, { terrain: isObstacle ? 'obstacle' : 'normal' });
      }
    }

    return hexMap;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SummonService, MonsterAIService],
    }).compile();

    service = module.get<SummonService>(SummonService);
    monsterAIService = module.get<MonsterAIService>(MonsterAIService);
  });

  describe('createSummon', () => {
    it('should generate valid summon with all stats from definition', () => {
      const definition: SummonDefinition = {
        name: 'Shadow Spirit',
        health: 6,
        attack: 3,
        move: 2,
        range: 0,
        typeIcon: 'ra-ghost',
      };
      const position: AxialCoordinates = { q: 1, r: 1 };

      const summon = service.createSummon(definition, position, 'room-1');

      expect(summon.name).toBe('Shadow Spirit');
      expect(summon.maxHealth).toBe(6);
      expect(summon.currentHealth).toBe(6);
      expect(summon.attack).toBe(3);
      expect(summon.move).toBe(2);
      expect(summon.range).toBe(0);
      expect(summon.typeIcon).toBe('ra-ghost');
      expect(summon.position).toEqual({ q: 1, r: 1 });
      expect(summon.roomId).toBe('room-1');
    });

    it('should set ownerId when provided', () => {
      const position: AxialCoordinates = { q: 0, r: 0 };

      const summon = service.createSummon(
        baseSummonDefinition,
        position,
        'room-1',
        'character-42',
      );

      expect(summon.ownerId).toBe('character-42');
      expect(summon.isScenarioAlly).toBe(false);
    });

    it('should set initiative when provided', () => {
      const position: AxialCoordinates = { q: 0, r: 0 };

      const summon = service.createSummon(
        baseSummonDefinition,
        position,
        'room-1',
        'character-1',
        25,
      );

      expect(summon.initiative).toBe(25);
    });

    it('should generate unique IDs', () => {
      const position: AxialCoordinates = { q: 0, r: 0 };

      const summon1 = service.createSummon(
        baseSummonDefinition,
        position,
        'room-1',
      );
      const summon2 = service.createSummon(
        baseSummonDefinition,
        position,
        'room-1',
      );

      expect(summon1.id).not.toBe(summon2.id);
      expect(summon1.id).toBeTruthy();
      expect(summon2.id).toBeTruthy();
    });

    it('should create scenario ally without ownerId', () => {
      const definition: SummonDefinition = {
        name: 'Escort NPC',
        health: 8,
        attack: 1,
        move: 2,
        range: 0,
        initiative: 50,
      };
      const position: AxialCoordinates = { q: 2, r: 2 };

      const summon = service.createSummon(
        definition,
        position,
        'room-1',
        undefined,
        50,
      );

      expect(summon.ownerId).toBeUndefined();
      expect(summon.isScenarioAlly).toBe(true);
      expect(summon.initiative).toBe(50);
    });

    it('should respect playerControlled from definition', () => {
      const definition: SummonDefinition = {
        ...baseSummonDefinition,
        playerControlled: true,
      };
      const position: AxialCoordinates = { q: 0, r: 0 };

      const summon = service.createSummon(definition, position, 'room-1');

      expect(summon.playerControlled).toBe(true);
    });
  });

  describe('validatePlacement', () => {
    it('should return true for valid adjacent hex', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const targetHex: AxialCoordinates = { q: 1, r: 0 }; // Adjacent
      const hexMap = createHexMap();
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 1;

      const isValid = service.validatePlacement(
        targetHex,
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      expect(isValid).toBe(true);
    });

    it('should reject hexes beyond range', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const targetHex: AxialCoordinates = { q: 3, r: 0 }; // 3 hexes away
      const hexMap = createHexMap();
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 2; // Only 2 range

      const isValid = service.validatePlacement(
        targetHex,
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      expect(isValid).toBe(false);
    });

    it('should reject occupied hexes', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const targetHex: AxialCoordinates = { q: 1, r: 0 };
      const hexMap = createHexMap();
      const occupiedHexes: AxialCoordinates[] = [{ q: 1, r: 0 }]; // Target is occupied
      const maxRange = 1;

      const isValid = service.validatePlacement(
        targetHex,
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      expect(isValid).toBe(false);
    });

    it('should reject obstacle hexes', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const targetHex: AxialCoordinates = { q: 1, r: 0 };
      const obstacles: AxialCoordinates[] = [{ q: 1, r: 0 }];
      const hexMap = createHexMap(5, obstacles); // Has obstacle at (1,0)
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 1;

      const isValid = service.validatePlacement(
        targetHex,
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      expect(isValid).toBe(false);
    });

    it('should reject off-map hexes', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const targetHex: AxialCoordinates = { q: 100, r: 100 }; // Way off the map
      const hexMap = createHexMap(); // 5x5 grid centered at origin
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 200; // Even with huge range, hex doesn't exist

      const isValid = service.validatePlacement(
        targetHex,
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      expect(isValid).toBe(false);
    });

    it('should allow placement at exactly max range', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const targetHex: AxialCoordinates = { q: 2, r: 0 }; // 2 hexes away
      const hexMap = createHexMap();
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 2; // Exactly 2 range

      const isValid = service.validatePlacement(
        targetHex,
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      expect(isValid).toBe(true);
    });
  });

  describe('getValidPlacementHexes', () => {
    it('should return only walkable hexes within range', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const hexMap = createHexMap();
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 1;

      const validHexes = service.getValidPlacementHexes(
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      // Should return 6 adjacent hexes (all at distance 1)
      expect(validHexes.length).toBe(6);
      // All should be at distance 1
      for (const hex of validHexes) {
        const distance = monsterAIService.calculateHexDistance(ownerHex, hex);
        expect(distance).toBe(1);
      }
    });

    it('should exclude occupied hexes', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const hexMap = createHexMap();
      const occupiedHexes: AxialCoordinates[] = [
        { q: 1, r: 0 },
        { q: 0, r: 1 },
      ]; // 2 of the 6 adjacent hexes are occupied
      const maxRange = 1;

      const validHexes = service.getValidPlacementHexes(
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      // Should return 4 hexes (6 adjacent minus 2 occupied)
      expect(validHexes.length).toBe(4);
      // Should not contain occupied hexes
      expect(validHexes.some((h) => h.q === 1 && h.r === 0)).toBe(false);
      expect(validHexes.some((h) => h.q === 0 && h.r === 1)).toBe(false);
    });

    it('should exclude obstacle hexes', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const obstacles: AxialCoordinates[] = [{ q: 1, r: 0 }, { q: -1, r: 0 }];
      const hexMap = createHexMap(5, obstacles);
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 1;

      const validHexes = service.getValidPlacementHexes(
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      // Should return 4 hexes (6 adjacent minus 2 obstacles)
      expect(validHexes.length).toBe(4);
      // Should not contain obstacle hexes
      expect(validHexes.some((h) => h.q === 1 && h.r === 0)).toBe(false);
      expect(validHexes.some((h) => h.q === -1 && h.r === 0)).toBe(false);
    });

    it('should return hexes at multiple distances up to maxRange', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      const hexMap = createHexMap(7); // Larger map
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 2;

      const validHexes = service.getValidPlacementHexes(
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      // 6 hexes at distance 1, 12 hexes at distance 2 = 18 total
      expect(validHexes.length).toBe(18);
      // All should be at distance 1 or 2
      for (const hex of validHexes) {
        const distance = monsterAIService.calculateHexDistance(ownerHex, hex);
        expect(distance).toBeGreaterThanOrEqual(1);
        expect(distance).toBeLessThanOrEqual(2);
      }
    });

    it('should return empty array when no valid hexes exist', () => {
      const ownerHex: AxialCoordinates = { q: 0, r: 0 };
      // All adjacent hexes are obstacles
      const obstacles: AxialCoordinates[] = [
        { q: 1, r: 0 },
        { q: -1, r: 0 },
        { q: 0, r: 1 },
        { q: 0, r: -1 },
        { q: 1, r: -1 },
        { q: -1, r: 1 },
      ];
      const hexMap = createHexMap(5, obstacles);
      const occupiedHexes: AxialCoordinates[] = [];
      const maxRange = 1;

      const validHexes = service.getValidPlacementHexes(
        ownerHex,
        hexMap,
        occupiedHexes,
        maxRange,
      );

      expect(validHexes.length).toBe(0);
    });
  });

  describe('killSummonsByOwner', () => {
    it('should kill all summons with matching ownerId', () => {
      const summons = [
        createSummon({ id: 'summon-1', ownerId: 'char-1' }),
        createSummon({ id: 'summon-2', ownerId: 'char-1' }),
        createSummon({ id: 'summon-3', ownerId: 'char-2' }),
      ];

      const killedSummons = service.killSummonsByOwner(
        'char-1',
        'owner_exhausted',
        summons,
      );

      expect(killedSummons.length).toBe(2);
      expect(killedSummons[0].id).toBe('summon-1');
      expect(killedSummons[1].id).toBe('summon-2');
      expect(killedSummons[0].isDead).toBe(true);
      expect(killedSummons[1].isDead).toBe(true);
    });

    it('should set correct deathReason', () => {
      const summons = [
        createSummon({ id: 'summon-1', ownerId: 'char-1' }),
      ];

      const killedSummons = service.killSummonsByOwner(
        'char-1',
        'owner_died',
        summons,
      );

      expect(killedSummons[0].deathReason).toBe('owner_died');
    });

    it('should ignore summons with different ownerId', () => {
      const summons = [
        createSummon({ id: 'summon-1', ownerId: 'char-1' }),
        createSummon({ id: 'summon-2', ownerId: 'char-2' }),
        createSummon({ id: 'summon-3', ownerId: 'char-3' }),
      ];

      const killedSummons = service.killSummonsByOwner(
        'char-1',
        'owner_exhausted',
        summons,
      );

      // Only char-1's summon should be killed
      expect(killedSummons.length).toBe(1);
      expect(killedSummons[0].ownerId).toBe('char-1');

      // Other summons should still be alive
      const char2Summon = summons.find((s) => s.ownerId === 'char-2');
      const char3Summon = summons.find((s) => s.ownerId === 'char-3');
      expect(char2Summon?.isDead).toBe(false);
      expect(char3Summon?.isDead).toBe(false);
    });

    it('should return empty array when no matching summons', () => {
      const summons = [
        createSummon({ id: 'summon-1', ownerId: 'char-2' }),
        createSummon({ id: 'summon-2', ownerId: 'char-3' }),
      ];

      const killedSummons = service.killSummonsByOwner(
        'char-1',
        'owner_exhausted',
        summons,
      );

      expect(killedSummons.length).toBe(0);
    });

    it('should handle scenario_end reason', () => {
      const summons = [
        createSummon({ id: 'summon-1', ownerId: 'char-1' }),
      ];

      const killedSummons = service.killSummonsByOwner(
        'char-1',
        'scenario_end',
        summons,
      );

      expect(killedSummons[0].deathReason).toBe('scenario_end');
    });

    it('should ignore scenario allies (undefined ownerId)', () => {
      const summons = [
        createSummon({ id: 'summon-1', ownerId: 'char-1' }),
        createSummon({ id: 'summon-2', ownerId: undefined }), // Scenario ally
      ];

      const killedSummons = service.killSummonsByOwner(
        'char-1',
        'owner_exhausted',
        summons,
      );

      // Only char-1's summon should be killed, not the scenario ally
      expect(killedSummons.length).toBe(1);
      expect(killedSummons[0].id).toBe('summon-1');
      expect(summons[1].isDead).toBe(false);
    });
  });
});
