import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/services/prisma.service';
import { AccountService } from '../../src/services/account.service';
import { ProgressionService } from '../../src/services/progression.service';
import { AccountsController } from '../../src/api/accounts.controller';

/**
 * T197 [US7] Integration test: Anonymous UUID converts to account
 *
 * Test Scenario:
 * 1. Create anonymous player with UUID
 * 2. Play games and accumulate progress (stored in anonymous state)
 * 3. Upgrade anonymous UUID to registered account
 * 4. Verify progress is migrated to account
 * 5. Verify anonymous state is cleaned up
 */

describe('Account Upgrade Integration (T197)', () => {
  let app: INestApplication;
  let accountService: AccountService;
  let progressionService: ProgressionService;

  const mockPrismaService = {
    account: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    progression: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        AccountService,
        ProgressionService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    accountService = moduleFixture.get<AccountService>(AccountService);
    progressionService = moduleFixture.get<ProgressionService>(ProgressionService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Anonymous to Account Upgrade', () => {
    it('should create account from anonymous UUID with progress', async () => {
      const anonymousUuid = '12345678-1234-1234-1234-123456789012';

      const anonymousProgress = {
        scenariosCompleted: 5,
        totalExperience: 150,
        charactersPlayed: ['Brute', 'Tinkerer', 'Spellweaver'],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5']
      };

      // Mock account doesn't exist
      mockPrismaService.account.findUnique.mockResolvedValue(null);

      // Mock account creation
      mockPrismaService.account.create.mockResolvedValue({
        id: 'account-id',
        uuid: anonymousUuid,
        email: null,
        createdAt: new Date(),
      });

      // Mock progression creation
      mockPrismaService.progression.create.mockResolvedValue({
        accountUuid: anonymousUuid,
        scenariosCompleted: 5,
        totalExperience: 150,
        charactersPlayed: JSON.stringify(['Brute', 'Tinkerer', 'Spellweaver']),
        characterExperience: JSON.stringify({}),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify(['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5']),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/accounts')
        .send({
          uuid: anonymousUuid,
          anonymousProgress: anonymousProgress
        })
        .expect(201);

      expect(response.body).toMatchObject({
        uuid: anonymousUuid,
        createdAt: expect.any(String)
      });

      expect(mockPrismaService.account.create).toHaveBeenCalled();
      expect(mockPrismaService.progression.create).toHaveBeenCalled();
    });

    it('should handle upgrade request with no previous progress', async () => {
      const anonymousUuid = '99999999-9999-9999-9999-999999999999';

      mockPrismaService.account.findUnique.mockResolvedValue(null);
      mockPrismaService.account.create.mockResolvedValue({
        id: 'account-id',
        uuid: anonymousUuid,
        email: null,
        createdAt: new Date(),
      });
      mockPrismaService.progression.create.mockResolvedValue({
        accountUuid: anonymousUuid,
        scenariosCompleted: 0,
        totalExperience: 0,
        charactersPlayed: JSON.stringify([]),
        characterExperience: JSON.stringify({}),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify([]),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/accounts')
        .send({
          uuid: anonymousUuid,
          anonymousProgress: null
        })
        .expect(201);

      expect(response.body.uuid).toBe(anonymousUuid);
      expect(mockPrismaService.account.create).toHaveBeenCalled();
      expect(mockPrismaService.progression.create).toHaveBeenCalled();
    });

    it('should prevent duplicate account creation for same UUID', async () => {
      const uuid = '11111111-1111-1111-1111-111111111111';

      // Mock account already exists
      mockPrismaService.account.findUnique.mockResolvedValue({
        id: 'existing-account-id',
        uuid: uuid,
        email: null,
        createdAt: new Date(),
      });

      await request(app.getHttpServer())
        .post('/api/accounts')
        .send({ uuid: uuid, anonymousProgress: null })
        .expect(409); // Conflict - account already exists
    });

    it('should migrate character-specific progression data', async () => {
      const anonymousUuid = '88888888-8888-8888-8888-888888888888';

      const anonymousProgress = {
        scenariosCompleted: 8,
        totalExperience: 240,
        charactersPlayed: ['Brute', 'Spellweaver'],
        characterExperience: {
          'Brute': { level: 2, xp: 60, perksUnlocked: ['Remove two -1 cards'] },
          'Spellweaver': { level: 3, xp: 95, perksUnlocked: ['Add one +1 card', 'Add one +2 card'] }
        },
        completedScenarioIds: Array.from({ length: 8 }, (_, i) => `scenario-${i + 1}`)
      };

      mockPrismaService.account.findUnique.mockResolvedValue(null);
      mockPrismaService.account.create.mockResolvedValue({
        id: 'account-id',
        uuid: anonymousUuid,
        email: null,
        createdAt: new Date(),
      });
      mockPrismaService.progression.create.mockResolvedValue({
        accountUuid: anonymousUuid,
        scenariosCompleted: 8,
        totalExperience: 240,
        charactersPlayed: JSON.stringify(['Brute', 'Spellweaver']),
        characterExperience: JSON.stringify(anonymousProgress.characterExperience),
        perksUnlocked: JSON.stringify(['Remove two -1 cards', 'Add one +1 card', 'Add one +2 card']),
        completedScenarioIds: JSON.stringify(anonymousProgress.completedScenarioIds),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await request(app.getHttpServer())
        .post('/api/accounts')
        .send({
          uuid: anonymousUuid,
          anonymousProgress: anonymousProgress
        })
        .expect(201);

      expect(mockPrismaService.progression.create).toHaveBeenCalled();
    });
  });

  describe('Account Service: upgradeAnonymousAccount', () => {
    it('should successfully upgrade anonymous account via service method', async () => {
      const uuid = '22222222-2222-2222-2222-222222222222';
      const progress = {
        scenariosCompleted: 3,
        totalExperience: 90,
        charactersPlayed: ['Tinkerer'],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3']
      };

      mockPrismaService.account.findUnique.mockResolvedValue(null);
      mockPrismaService.account.create.mockResolvedValue({
        id: 'account-id',
        uuid: uuid,
        email: null,
        createdAt: new Date(),
      });
      mockPrismaService.progression.create.mockResolvedValue({
        accountUuid: uuid,
        scenariosCompleted: 3,
        totalExperience: 90,
        charactersPlayed: JSON.stringify(['Tinkerer']),
        characterExperience: JSON.stringify({}),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify(['scenario-1', 'scenario-2', 'scenario-3']),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const account = await accountService.upgradeAnonymousAccount(uuid, progress);

      expect(account.uuid).toBe(uuid);
      expect(account.createdAt).toBeInstanceOf(Date);
    });

    it('should create progression record when upgrading', async () => {
      const uuid = '33333333-3333-3333-3333-333333333333';
      const progress = {
        scenariosCompleted: 5,
        totalExperience: 150,
        charactersPlayed: ['Brute', 'Tinkerer'],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5']
      };

      mockPrismaService.account.findUnique.mockResolvedValue(null);
      mockPrismaService.account.create.mockResolvedValue({
        id: 'account-id',
        uuid: uuid,
        email: null,
        createdAt: new Date(),
      });
      mockPrismaService.progression.create.mockResolvedValue({
        accountUuid: uuid,
        scenariosCompleted: 5,
        totalExperience: 150,
        charactersPlayed: JSON.stringify(['Brute', 'Tinkerer']),
        characterExperience: JSON.stringify({}),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify(['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5']),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.progression.findUnique.mockResolvedValue({
        accountUuid: uuid,
        scenariosCompleted: 5,
        totalExperience: 150,
        charactersPlayed: JSON.stringify(['Brute', 'Tinkerer']),
        characterExperience: JSON.stringify({}),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify(['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5']),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await accountService.upgradeAnonymousAccount(uuid, progress);

      const progression = await progressionService.getProgression(uuid);

      expect(progression.scenariosCompleted).toBe(5);
      expect(progression.totalExperience).toBe(150);
      expect(progression.charactersPlayed).toHaveLength(2);
    });

    it('should reject upgrade if UUID is invalid format', async () => {
      const invalidUuid = 'not-a-uuid';
      const progress = { scenariosCompleted: 0, totalExperience: 0, charactersPlayed: [], completedScenarioIds: [] };

      await expect(accountService.upgradeAnonymousAccount(invalidUuid, progress)).rejects.toThrow();
    });

    it('should handle very large progression data', async () => {
      const uuid = '44444444-4444-4444-4444-444444444444';
      const progress = {
        scenariosCompleted: 100,
        totalExperience: 3000,
        charactersPlayed: ['Brute', 'Tinkerer', 'Spellweaver', 'Scoundrel', 'Cragheart', 'Mindthief'],
        characterExperience: {
          'Brute': { level: 9, xp: 500, perksUnlocked: Array(11).fill('perk') },
          'Tinkerer': { level: 9, xp: 500, perksUnlocked: Array(11).fill('perk') },
          'Spellweaver': { level: 9, xp: 500, perksUnlocked: Array(11).fill('perk') },
          'Scoundrel': { level: 9, xp: 500, perksUnlocked: Array(11).fill('perk') },
          'Cragheart': { level: 9, xp: 500, perksUnlocked: Array(11).fill('perk') },
          'Mindthief': { level: 9, xp: 500, perksUnlocked: Array(11).fill('perk') }
        },
        completedScenarioIds: Array.from({ length: 100 }, (_, i) => `scenario-${i + 1}`)
      };

      mockPrismaService.account.findUnique.mockResolvedValue(null);
      mockPrismaService.account.create.mockResolvedValue({
        id: 'account-id',
        uuid: uuid,
        email: null,
        createdAt: new Date(),
      });
      mockPrismaService.progression.create.mockResolvedValue({
        accountUuid: uuid,
        scenariosCompleted: 100,
        totalExperience: 3000,
        charactersPlayed: JSON.stringify(['Brute', 'Tinkerer', 'Spellweaver', 'Scoundrel', 'Cragheart', 'Mindthief']),
        characterExperience: JSON.stringify(progress.characterExperience),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify(progress.completedScenarioIds),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.progression.findUnique.mockResolvedValue({
        accountUuid: uuid,
        scenariosCompleted: 100,
        totalExperience: 3000,
        charactersPlayed: JSON.stringify(['Brute', 'Tinkerer', 'Spellweaver', 'Scoundrel', 'Cragheart', 'Mindthief']),
        characterExperience: JSON.stringify(progress.characterExperience),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify(progress.completedScenarioIds),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const account = await accountService.upgradeAnonymousAccount(uuid, progress);
      expect(account.uuid).toBe(uuid);

      const progression = await progressionService.getProgression(uuid);
      expect(progression.scenariosCompleted).toBe(100);
      expect(progression.totalExperience).toBe(3000);
    });
  });

  describe('GET /api/accounts/:uuid/progression', () => {
    it('should retrieve progression for existing account', async () => {
      const uuid = '55555555-5555-5555-5555-555555555555';

      mockPrismaService.progression.findUnique.mockResolvedValue({
        accountUuid: uuid,
        scenariosCompleted: 7,
        totalExperience: 210,
        charactersPlayed: JSON.stringify(['Brute', 'Spellweaver', 'Cragheart']),
        characterExperience: JSON.stringify({}),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify(Array.from({ length: 7 }, (_, i) => `scenario-${i + 1}`)),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${uuid}/progression`)
        .expect(200);

      expect(response.body).toMatchObject({
        uuid: uuid,
        scenariosCompleted: 7,
        totalExperience: 210,
        charactersPlayed: expect.arrayContaining(['Brute', 'Spellweaver', 'Cragheart'])
      });
    });

    it('should return 404 for non-existent account', async () => {
      mockPrismaService.progression.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/accounts/non-existent-uuid/progression')
        .expect(404);
    });

    it('should return empty progression for account with no games played', async () => {
      const uuid = '66666666-6666-6666-6666-666666666666';

      mockPrismaService.progression.findUnique.mockResolvedValue({
        accountUuid: uuid,
        scenariosCompleted: 0,
        totalExperience: 0,
        charactersPlayed: JSON.stringify([]),
        characterExperience: JSON.stringify({}),
        perksUnlocked: JSON.stringify([]),
        completedScenarioIds: JSON.stringify([]),
        scenarioCharacterHistory: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${uuid}/progression`)
        .expect(200);

      expect(response.body.scenariosCompleted).toBe(0);
      expect(response.body.totalExperience).toBe(0);
      expect(response.body.charactersPlayed).toEqual([]);
    });
  });
});
