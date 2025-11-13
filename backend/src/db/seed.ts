/**
 * Database seed script
 * Populates the database with 6 character classes and 5 scenarios
 * US5 - T173: Updated to load character and scenario data from JSON files
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ========== CHARACTER CLASSES ==========
  console.log('Creating character classes...');

  // Load characters from JSON file (US5 - T173)
  const charactersPath = path.join(__dirname, '../data/characters.json');
  const charactersRaw = fs.readFileSync(charactersPath, 'utf-8');
  const charactersData = JSON.parse(charactersRaw);

  // Load ability cards from JSON file (US5 - T173)
  const abilityCardsPath = path.join(__dirname, '../data/ability-cards.json');
  const abilityCardsRaw = fs.readFileSync(abilityCardsPath, 'utf-8');
  const abilityCardsData = JSON.parse(abilityCardsRaw);

  // Create a map of ability cards by ID for quick lookup
  const abilityCardMap = new Map();
  abilityCardsData.abilityCards.forEach((card: any) => {
    abilityCardMap.set(card.id, card);
  });

  for (const character of charactersData.characters) {
    // Resolve ability card IDs to full card objects
    const abilityDeck = character.abilityCards
      .map((cardId: string) => {
        const card = abilityCardMap.get(cardId);
        if (!card) {
          console.warn(
            `Warning: Ability card ${cardId} not found for ${character.classType}`,
          );
          return null;
        }
        return {
          name: card.name,
          level: card.level,
          initiative: card.initiative,
          topAction: card.topAction,
          bottomAction: card.bottomAction,
        };
      })
      .filter(Boolean); // Remove any null entries

    await prisma.characterClass.upsert({
      where: { className: character.classType },
      update: {},
      create: {
        className: character.classType,
        maxHealth: character.maxHealth,
        description: character.description,
        abilityDeck: abilityDeck,
      },
    });
  }

  console.log(
    `✓ Created ${charactersData.characters.length} character classes from JSON`,
  );

  // ========== SCENARIOS ==========
  console.log('Creating scenarios...');

  // Load scenarios from JSON file (US5 - T173)
  const scenariosPath = path.join(__dirname, '../data/scenarios.json');
  const scenariosRaw = fs.readFileSync(scenariosPath, 'utf-8');
  const scenariosData = JSON.parse(scenariosRaw);

  for (const scenario of scenariosData.scenarios) {
    // Check if scenario already exists by name
    const existing = await prisma.scenario.findFirst({
      where: { name: scenario.name },
    });

    if (!existing) {
      await prisma.scenario.create({
        data: {
          name: scenario.name,
          difficulty: scenario.difficulty,
          objectivePrimary: scenario.objectivePrimary,
          objectiveSecondary: scenario.objectiveSecondary || null,
          mapLayout: scenario.mapLayout,
          monsterGroups: scenario.monsterGroups,
          treasures: scenario.treasures || [],
          playerStartPositions: scenario.playerStartPositions,
        },
      });
    }
  }

  console.log(
    `✓ Created ${scenariosData.scenarios.length} scenarios from JSON`,
  );

  console.log('✅ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
