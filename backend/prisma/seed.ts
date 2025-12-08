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
  type: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  effects: any[];
  cost: number;
  description: string | null;
}

interface ScenarioSeed {
  name: string;
  difficulty: number;
  mapLayout: any[];
  monsterGroups: any[];
  objectives: any;
  treasures?: any[];
  playerStartPositions?: any[];
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
        type: itemData.type,
        rarity: itemData.rarity,
        effects: itemData.effects,
        cost: itemData.cost,
        description: itemData.description,
      },
      create: {
        name: itemData.name,
        type: itemData.type,
        rarity: itemData.rarity,
        effects: itemData.effects,
        cost: itemData.cost,
        description: itemData.description,
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
      },
      create: {
        name: scenarioData.name,
        difficulty: scenarioData.difficulty,
        mapLayout: scenarioData.mapLayout,
        monsterGroups: scenarioData.monsterGroups,
        objectives: scenarioData.objectives,
        treasures: scenarioData.treasures,
        playerStartPositions: scenarioData.playerStartPositions,
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

async function seedTestUsers() {
  console.log('Seeding test users...');

  const userCharacterService = new UserCharacterService(prisma);
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  const password = 'foobarbaz123';
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const testUsersData = [
    { username: 'foo', className: 'Brute' },
    { username: 'bar', className: 'Tinkerer' },
    { username: 'baz', className: 'Spellweaver' },
  ];

  // Fetch all character classes and create a map by name
  const classes = await prisma.characterClass.findMany();
  const classMap = new Map(classes.map((c) => [c.name, c]));

  let userCount = 0;
  let characterCount = 0;

  for (const userData of testUsersData) {
    // Create or update user
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: { passwordHash },
      create: {
        username: userData.username,
        passwordHash,
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

async function main() {
  console.log('Starting database seed...\n');

  try {
    await seedCardLayoutTemplates();
    await seedCharacterClasses();
    await seedAbilityCards();
    await seedTestUsers();
    await seedItems();
    await seedScenarios();

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
