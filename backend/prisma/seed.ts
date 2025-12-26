import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { UserCharacterService } from '../src/services/user-character.service';

const prisma = new PrismaClient();

interface CharacterClassSeed {
  name: string;
  startingHealth: number;
  maxHealthByLevel: number[];
  handSize: number;
  perks: string[];
  description: string;
  imageUrl: string | null;
}

interface AbilityCardSeed {
  className: string;
  name: string;
  level: number;
  initiative: number;
  topAction: any;
  bottomAction: any;
}

interface ItemSeed {
  name: string;
  slot: 'HEAD' | 'BODY' | 'LEGS' | 'ONE_HAND' | 'TWO_HAND' | 'SMALL';
  usageType: 'PERSISTENT' | 'SPENT' | 'CONSUMED';
  maxUses?: number;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  effects: any[];
  triggers?: any[];
  cost: number;
  description: string | null;
  imageUrl?: string;
}

interface ScenarioSeed {
  name: string;
  difficulty: number;
  mapLayout: any[];
  monsterGroups: any[];
  objectives: any;
  treasures?: any[];
  playerStartPositions?: any[];
  // Background image configuration (Issue #191)
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
  backgroundOffsetX?: number;
  backgroundOffsetY?: number;
  backgroundScale?: number;
}

interface CardLayoutTemplateSeed {
  name: string;
  description?: string;
  modules: any[];
}

async function loadJSON<T>(filename: string): Promise<T[]> {
  // Handle both development (TS) and production (compiled JS) paths
  let seedDataDir = path.join(__dirname, 'seed-data');

  // If running from dist (compiled), look in the source location
  if (__dirname.includes('dist/backend/prisma')) {
    seedDataDir = path.join(__dirname, '../../../prisma/seed-data');
  }

  const filePath = path.join(seedDataDir, filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

async function seedCharacterClasses() {
  console.log('Seeding character classes...');
  const classes = await loadJSON<CharacterClassSeed>('character-classes.json');

  for (const classData of classes) {
    await prisma.characterClass.upsert({
      where: { name: classData.name },
      update: {
        startingHealth: classData.startingHealth,
        maxHealthByLevel: classData.maxHealthByLevel,
        handSize: classData.handSize,
        perks: classData.perks,
        description: classData.description,
        imageUrl: classData.imageUrl,
      },
      create: {
        name: classData.name,
        startingHealth: classData.startingHealth,
        maxHealthByLevel: classData.maxHealthByLevel,
        handSize: classData.handSize,
        perks: classData.perks,
        description: classData.description,
        imageUrl: classData.imageUrl,
      },
    });
  }

  console.log(`✓ Seeded ${classes.length} character classes`);
}

async function seedAbilityCards() {
  console.log('Seeding ability cards...');
  const cards = await loadJSON<AbilityCardSeed>('ability-cards.json');

  // Get all character classes to map names to IDs
  const classes = await prisma.characterClass.findMany();
  const classMap = new Map(classes.map((c: { name: string; id: string }) => [c.name, c.id]));

  let seedCount = 0;
  for (const cardData of cards) {
    const classId = classMap.get(cardData.className);
    if (!classId) {
      console.warn(`Warning: Class "${cardData.className}" not found, skipping card "${cardData.name}"`);
      continue;
    }

    // Use combination of classId + name for uniqueness
    const existingCard = await prisma.abilityCard.findFirst({
      where: {
        classId: classId,
        name: cardData.name,
      },
    });

    if (existingCard) {
      await prisma.abilityCard.update({
        where: { id: existingCard.id },
        data: {
          level: cardData.level,
          initiative: cardData.initiative,
          topAction: cardData.topAction,
          bottomAction: cardData.bottomAction,
        },
      });
    } else {
      await prisma.abilityCard.create({
        data: {
          classId: classId,
          name: cardData.name,
          level: cardData.level,
          initiative: cardData.initiative,
          topAction: cardData.topAction,
          bottomAction: cardData.bottomAction,
        },
      });
    }
    seedCount++;
  }

  console.log(`✓ Seeded ${seedCount} ability cards`);
}

async function seedItems() {
  console.log('Seeding items...');
  const items = await loadJSON<ItemSeed>('items.json');

  for (const itemData of items) {
    await prisma.item.upsert({
      where: { name: itemData.name },
      update: {
        slot: itemData.slot,
        usageType: itemData.usageType,
        maxUses: itemData.maxUses,
        rarity: itemData.rarity,
        effects: itemData.effects,
        triggers: itemData.triggers,
        cost: itemData.cost,
        description: itemData.description,
        imageUrl: itemData.imageUrl,
      },
      create: {
        name: itemData.name,
        slot: itemData.slot,
        usageType: itemData.usageType,
        maxUses: itemData.maxUses,
        rarity: itemData.rarity,
        effects: itemData.effects,
        triggers: itemData.triggers,
        cost: itemData.cost,
        description: itemData.description,
        imageUrl: itemData.imageUrl,
      },
    });
  }

  console.log(`✓ Seeded ${items.length} items`);
}

async function seedScenarios() {
  console.log('Seeding scenarios...');
  const scenarios = await loadJSON<ScenarioSeed>('scenarios.json');

  for (const scenarioData of scenarios) {
    await prisma.scenario.upsert({
      where: { name: scenarioData.name },
      update: {
        difficulty: scenarioData.difficulty,
        mapLayout: scenarioData.mapLayout,
        monsterGroups: scenarioData.monsterGroups,
        objectives: scenarioData.objectives,
        treasures: scenarioData.treasures,
        playerStartPositions: scenarioData.playerStartPositions,
        // Background image configuration (Issue #191)
        backgroundImageUrl: scenarioData.backgroundImageUrl,
        backgroundOpacity: scenarioData.backgroundOpacity,
        backgroundOffsetX: scenarioData.backgroundOffsetX,
        backgroundOffsetY: scenarioData.backgroundOffsetY,
        backgroundScale: scenarioData.backgroundScale,
      },
      create: {
        name: scenarioData.name,
        difficulty: scenarioData.difficulty,
        mapLayout: scenarioData.mapLayout,
        monsterGroups: scenarioData.monsterGroups,
        objectives: scenarioData.objectives,
        treasures: scenarioData.treasures,
        playerStartPositions: scenarioData.playerStartPositions,
        // Background image configuration (Issue #191)
        backgroundImageUrl: scenarioData.backgroundImageUrl,
        backgroundOpacity: scenarioData.backgroundOpacity,
        backgroundOffsetX: scenarioData.backgroundOffsetX,
        backgroundOffsetY: scenarioData.backgroundOffsetY,
        backgroundScale: scenarioData.backgroundScale,
      },
    });
  }

  console.log(`✓ Seeded ${scenarios.length} scenarios`);
}

async function seedCardLayoutTemplates() {
  console.log('Seeding card layout templates...');
  const templates = await loadJSON<CardLayoutTemplateSeed>('card-layout-templates.json');

  for (const templateData of templates) {
    await prisma.cardLayoutTemplate.upsert({
      where: { name: templateData.name },
      update: {
        description: templateData.description,
        modules: templateData.modules,
      },
      create: {
        name: templateData.name,
        description: templateData.description,
        modules: templateData.modules,
      },
    });
  }

  console.log(`✓ Seeded ${templates.length} card layout templates`);
}

async function seedCampaignTemplates() {
  console.log('Seeding campaign templates...');

  // Look up scenarios by name to get their UUIDs
  const forestTrail = await prisma.scenario.findUnique({ where: { name: 'Forest Trail' } });
  const magmaPit = await prisma.scenario.findUnique({ where: { name: 'Magma Pit' } });
  const deepPit = await prisma.scenario.findUnique({ where: { name: 'Deep Pit' } });

  if (!forestTrail || !magmaPit || !deepPit) {
    console.warn('⚠ Campaign scenarios not found in database. Skipping campaign template seeding.');
    console.warn('  Missing:', {
      forestTrail: !forestTrail,
      magmaPit: !magmaPit,
      deepPit: !deepPit,
    });
    return;
  }

  // Flame Vale campaign template with 3 scenarios
  // Uses database scenario UUIDs for proper linking
  const flameValeTemplate = {
    name: 'Flame Vale',
    description: 'A 3-scenario campaign through forest and fiery pits.',
    deathMode: 'configurable', // Users can choose healing or permadeath
    minPlayers: 1,
    maxPlayers: 4,
    isActive: true,
    scenarios: [
      {
        scenarioId: forestTrail.id, // Game scenario: "Forest Trail"
        name: null, // Uses scenario's own name
        description: 'Begin your journey through the forest trail.',
        unlocksScenarios: [magmaPit.id],
        isStarting: true,
        sequence: 1,
      },
      {
        scenarioId: magmaPit.id, // Game scenario: "Magma Pit"
        name: null, // Uses scenario's own name
        description: 'Navigate the treacherous magma pit.',
        unlocksScenarios: [deepPit.id],
        isStarting: false,
        sequence: 2,
      },
      {
        scenarioId: deepPit.id, // Game scenario: "Deep Pit"
        name: null, // Uses scenario's own name
        description: 'The final challenge - descend into the deep pit and defeat the Flame Demon!',
        unlocksScenarios: [], // Final scenario - unlocks nothing
        isStarting: false,
        sequence: 3,
      },
    ],
  };

  // Delete old Gloomhaven Vale template if it exists
  const oldTemplate = await prisma.campaignTemplate.findUnique({
    where: { name: 'Gloomhaven Vale' },
  });
  if (oldTemplate) {
    await prisma.campaignTemplateScenario.deleteMany({
      where: { templateId: oldTemplate.id },
    });
    await prisma.campaignTemplate.delete({
      where: { id: oldTemplate.id },
    });
    console.log('✓ Deleted old "Gloomhaven Vale" campaign template');
  }

  // Check if template already exists
  const existingTemplate = await prisma.campaignTemplate.findUnique({
    where: { name: flameValeTemplate.name },
    include: { scenarios: true },
  });

  if (!existingTemplate) {
    // Create template with scenarios
    await prisma.campaignTemplate.create({
      data: {
        name: flameValeTemplate.name,
        description: flameValeTemplate.description,
        deathMode: flameValeTemplate.deathMode,
        minPlayers: flameValeTemplate.minPlayers,
        maxPlayers: flameValeTemplate.maxPlayers,
        isActive: flameValeTemplate.isActive,
        scenarios: {
          create: flameValeTemplate.scenarios,
        },
      },
    });
    console.log(`✓ Created campaign template: "${flameValeTemplate.name}"`);
  } else {
    // Update existing template - delete old scenarios and create new ones
    await prisma.campaignTemplateScenario.deleteMany({
      where: { templateId: existingTemplate.id },
    });

    await prisma.campaignTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        description: flameValeTemplate.description,
        deathMode: flameValeTemplate.deathMode,
        minPlayers: flameValeTemplate.minPlayers,
        maxPlayers: flameValeTemplate.maxPlayers,
        isActive: flameValeTemplate.isActive,
        scenarios: {
          create: flameValeTemplate.scenarios,
        },
      },
    });
    console.log(`✓ Updated campaign template: "${flameValeTemplate.name}" with new scenarios`);
  }
}

async function seedTrivialCampaignTemplate() {
  console.log('Seeding trivial training campaign template...');

  // Look up training scenarios by name
  const scenario1 = await prisma.scenario.findUnique({ where: { name: 'Training Dummy - Part 1' } });
  const scenario2 = await prisma.scenario.findUnique({ where: { name: 'Training Dummy - Part 2' } });

  if (!scenario1 || !scenario2) {
    console.warn('⚠ Training scenarios not found. Skipping Trivial Training template.');
    console.warn('  Missing:', { scenario1: !scenario1, scenario2: !scenario2 });
    return;
  }

  // Check if template already exists
  const existingTemplate = await prisma.campaignTemplate.findUnique({
    where: { name: 'Trivial Training' },
    include: { scenarios: true },
  });

  if (!existingTemplate) {
    await prisma.campaignTemplate.create({
      data: {
        name: 'Trivial Training',
        description: 'A simple 2-scenario training campaign. Perfect for learning or quick demos.',
        deathMode: 'healing',
        minPlayers: 1,
        maxPlayers: 4,
        requireUniqueClasses: false,
        isActive: true,
        scenarios: {
          create: [
            {
              scenarioId: scenario1.id,
              name: 'Training Dummy - Part 1',
              description: 'Defeat a single training dummy. Very easy.',
              sequence: 1,
              isStarting: true,
              unlocksScenarios: [scenario2.id],
            },
            {
              scenarioId: scenario2.id,
              name: 'Training Dummy - Part 2',
              description: 'Defeat another training dummy. Complete the campaign!',
              sequence: 2,
              isStarting: false,
              unlocksScenarios: [],
            },
          ],
        },
      },
    });
    console.log('✓ Created campaign template: "Trivial Training"');
  } else {
    // Update existing template
    await prisma.campaignTemplateScenario.deleteMany({
      where: { templateId: existingTemplate.id },
    });

    await prisma.campaignTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        description: 'A simple 2-scenario training campaign. Perfect for learning or quick demos.',
        deathMode: 'healing',
        minPlayers: 1,
        maxPlayers: 4,
        requireUniqueClasses: false,
        isActive: true,
        scenarios: {
          create: [
            {
              scenarioId: scenario1.id,
              name: 'Training Dummy - Part 1',
              description: 'Defeat a single training dummy. Very easy.',
              sequence: 1,
              isStarting: true,
              unlocksScenarios: [scenario2.id],
            },
            {
              scenarioId: scenario2.id,
              name: 'Training Dummy - Part 2',
              description: 'Defeat another training dummy. Complete the campaign!',
              sequence: 2,
              isStarting: false,
              unlocksScenarios: [],
            },
          ],
        },
      },
    });
    console.log('✓ Updated campaign template: "Trivial Training"');
  }
}

async function seedTestUsers() {
  console.log('Seeding test users...');

  const userCharacterService = new UserCharacterService(prisma);
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  const password = 'foobarbaz123';
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const testUsersData = [
    { username: 'foo', className: 'Brute', roles: ['player', 'creator', 'admin'] },
    { username: 'bar', className: 'Tinkerer', roles: ['player', 'creator', 'admin'] },
    { username: 'baz', className: 'Spellweaver', roles: ['player', 'creator', 'admin'] },
  ];

  // Fetch all character classes and create a map by name
  const classes = await prisma.characterClass.findMany();
  const classMap = new Map(classes.map((c) => [c.name, c]));

  let userCount = 0;
  let characterCount = 0;

  for (const userData of testUsersData) {
    // Create or update user with roles
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: { passwordHash, roles: userData.roles },
      create: {
        username: userData.username,
        passwordHash,
        roles: userData.roles,
      },
    });
    userCount++;

    // Check if character already exists
    const existingCharacter = await prisma.character.findFirst({
      where: {
        userId: user.id,
        name: userData.username,
      },
    });

    if (!existingCharacter) {
      const characterClass = classMap.get(userData.className);
      if (!characterClass) {
        console.warn(`Warning: Class "${userData.className}" not found, skipping character for "${userData.username}"`);
        continue;
      }

      // Use UserCharacterService to create character
      await userCharacterService.createCharacter(user.id, {
        name: userData.username,
        classId: characterClass.id,
      });
      characterCount++;
    }
  }

  console.log(`✓ Seeded ${userCount} test users with ${characterCount} new characters`);
}

/**
 * Seed random items to all characters for testing inventory display
 */
async function seedCharacterInventory() {
  console.log('Seeding character inventory...');

  // Get all characters and items
  const characters = await prisma.character.findMany();
  const items = await prisma.item.findMany();

  if (characters.length === 0) {
    console.log('  No characters found, skipping inventory seeding');
    return;
  }

  if (items.length === 0) {
    console.log('  No items found, skipping inventory seeding');
    return;
  }

  let inventoryCount = 0;
  let equipmentCount = 0;

  // Group items by slot for better distribution
  const itemsBySlot: Record<string, typeof items> = {};
  for (const item of items) {
    if (!itemsBySlot[item.slot]) {
      itemsBySlot[item.slot] = [];
    }
    itemsBySlot[item.slot].push(item);
  }

  for (const character of characters) {
    // Randomly select 3-8 items for each character
    const numItems = Math.floor(Math.random() * 6) + 3;
    const shuffledItems = [...items].sort(() => Math.random() - 0.5);
    const selectedItems = shuffledItems.slice(0, Math.min(numItems, items.length));

    // Track which slots we've equipped to avoid duplicates
    const equippedSlots: Set<string> = new Set();

    for (const item of selectedItems) {
      // Add to inventory (skip if already owned)
      const existingInventory = await prisma.characterInventory.findUnique({
        where: {
          characterId_itemId: {
            characterId: character.id,
            itemId: item.id,
          },
        },
      });

      if (!existingInventory) {
        await prisma.characterInventory.create({
          data: {
            characterId: character.id,
            itemId: item.id,
          },
        });
        inventoryCount++;
      }

      // Equip items to appropriate slots (one per slot, or multiple for SMALL)
      const canEquip = item.slot === 'SMALL' || !equippedSlots.has(item.slot);

      if (canEquip && Math.random() > 0.3) { // 70% chance to equip owned items
        // Check if already equipped
        const existingEquipment = await prisma.characterEquipment.findFirst({
          where: {
            characterId: character.id,
            itemId: item.id,
          },
        });

        if (!existingEquipment) {
          // For SMALL items, find next available slot index
          let slotIndex = 0;
          if (item.slot === 'SMALL') {
            const existingSmallItems = await prisma.characterEquipment.count({
              where: {
                characterId: character.id,
                slot: 'SMALL',
              },
            });
            slotIndex = existingSmallItems;
            if (slotIndex >= 3) continue; // Max 3 small items
          }

          try {
            await prisma.characterEquipment.create({
              data: {
                characterId: character.id,
                itemId: item.id,
                slot: item.slot as any, // ItemSlot enum
                slotIndex,
              },
            });
            equipmentCount++;
            if (item.slot !== 'SMALL') {
              equippedSlots.add(item.slot);
            }
          } catch (err) {
            // Expected: unique constraint violations for slot conflicts
            // Log at debug level for troubleshooting seed issues
            if (process.env.DEBUG_SEED) {
              console.debug(`Skipped equipping ${item.name} to ${character.name}: ${err instanceof Error ? err.message : err}`);
            }
          }
        }
      }
    }
  }

  console.log(`✓ Seeded inventory: ${inventoryCount} items owned, ${equipmentCount} items equipped`);
}

async function main() {
  console.log('Starting database seed...\n');

  try {
    await seedCardLayoutTemplates();
    await seedCharacterClasses();
    await seedAbilityCards();
    await seedTestUsers();
    await seedItems();
    await seedScenarios();
    await seedCampaignTemplates(); // Issue #244 - Campaign Mode (DB-driven templates)
    await seedTrivialCampaignTemplate(); // Trivial 2-scenario campaign for demos
    await seedCharacterInventory(); // Seed random items to characters for testing

    console.log('\n✅ Database seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
