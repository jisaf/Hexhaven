/**
 * Database seed script
 * Populates the database with 6 character classes and 5 scenarios
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ========== CHARACTER CLASSES ==========
  console.log('Creating character classes...');

  const characterClasses = [
    {
      className: 'Brute',
      maxHealth: 10,
      description:
        'A powerful melee fighter who can take and deal massive damage.',
      abilityDeck: [
        // Simplified ability deck for MVP - full deck to be added later
        {
          name: 'Trample',
          level: 1,
          initiative: 72,
          topAction: { type: 'attack', value: 3 },
          bottomAction: { type: 'move', value: 3 },
        },
      ],
    },
    {
      className: 'Tinkerer',
      maxHealth: 8,
      description: 'A versatile support class with healing and buff abilities.',
      abilityDeck: [
        {
          name: 'Reviving Ether',
          level: 1,
          initiative: 79,
          topAction: { type: 'heal', value: 3 },
          bottomAction: { type: 'move', value: 2 },
        },
      ],
    },
    {
      className: 'Spellweaver',
      maxHealth: 6,
      description:
        'A powerful elemental mage who manipulates the elemental infusions.',
      abilityDeck: [
        {
          name: 'Fire Orbs',
          level: 1,
          initiative: 64,
          topAction: {
            type: 'attack',
            value: 4,
            range: 3,
            elementGenerate: 'fire',
          },
          bottomAction: { type: 'move', value: 3 },
        },
      ],
    },
    {
      className: 'Scoundrel',
      maxHealth: 8,
      description: 'A fast melee attacker who excels at positioning.',
      abilityDeck: [
        {
          name: 'Quick Hands',
          level: 1,
          initiative: 11,
          topAction: { type: 'loot', value: 1 },
          bottomAction: { type: 'move', value: 4 },
        },
      ],
    },
    {
      className: 'Cragheart',
      maxHealth: 10,
      description: 'A ranged attacker who manipulates obstacles on the map.',
      abilityDeck: [
        {
          name: 'Rumbling Advance',
          level: 1,
          initiative: 29,
          topAction: { type: 'attack', value: 3, range: 3 },
          bottomAction: { type: 'move', value: 3 },
        },
      ],
    },
    {
      className: 'Mindthief',
      maxHealth: 6,
      description: 'An agile melee attacker with mind control abilities.',
      abilityDeck: [
        {
          name: 'Into the Night',
          level: 1,
          initiative: 79,
          topAction: { type: 'attack', value: 2 },
          bottomAction: { type: 'move', value: 3 },
        },
      ],
    },
  ];

  for (const charClass of characterClasses) {
    await prisma.characterClass.upsert({
      where: { className: charClass.className },
      update: {},
      create: charClass,
    });
  }

  console.log(`✓ Created ${characterClasses.length} character classes`);

  // ========== SCENARIOS ==========
  console.log('Creating scenarios...');

  const scenarios = [
    {
      name: 'Black Barrow',
      difficulty: 1,
      objectivePrimary: 'Kill all enemies',
      objectiveSecondary: 'Collect treasure',
      mapLayout: [
        // Simple 5x5 hex grid for MVP
        {
          coordinates: { q: 0, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 1, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 2, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 0, r: 1 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 1, r: 1 },
          terrain: 'obstacle',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 2, r: 1 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 0, r: 2 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: true,
        },
        {
          coordinates: { q: 1, r: 2 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 2, r: 2 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
      ],
      monsterGroups: [
        {
          type: 'Bandit Guard',
          count: 2,
          spawnPoints: [
            { q: 0, r: 0 },
            { q: 2, r: 0 },
          ],
          isElite: false,
        },
      ],
    },
    {
      name: 'Crypt of Blood',
      difficulty: 2,
      objectivePrimary: 'Defeat the boss',
      mapLayout: [
        {
          coordinates: { q: 0, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 1, r: 0 },
          terrain: 'difficult',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 2, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 0, r: 1 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 1, r: 1 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 2, r: 1 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
      ],
      monsterGroups: [
        {
          type: 'Living Bones',
          count: 3,
          spawnPoints: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 },
          ],
          isElite: false,
        },
      ],
    },
    {
      name: 'Ruinous Rift',
      difficulty: 3,
      objectivePrimary: 'Survive 5 rounds',
      mapLayout: [
        {
          coordinates: { q: 0, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 1, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 2, r: 0 },
          terrain: 'hazardous',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
      ],
      monsterGroups: [
        {
          type: 'Cultist',
          count: 2,
          spawnPoints: [
            { q: 0, r: 0 },
            { q: 2, r: 0 },
          ],
          isElite: true,
        },
      ],
    },
    {
      name: 'Decaying Crypt',
      difficulty: 1,
      objectivePrimary: 'Kill all enemies',
      mapLayout: [
        {
          coordinates: { q: 0, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 1, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
      ],
      monsterGroups: [
        {
          type: 'Living Corpse',
          count: 2,
          spawnPoints: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
          ],
          isElite: false,
        },
      ],
    },
    {
      name: 'Mountain Hammer',
      difficulty: 2,
      objectivePrimary: 'Reach the exit',
      objectiveSecondary: 'Defeat the elite guard',
      mapLayout: [
        {
          coordinates: { q: 0, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 1, r: 0 },
          terrain: 'obstacle',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
        {
          coordinates: { q: 2, r: 0 },
          terrain: 'normal',
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        },
      ],
      monsterGroups: [
        {
          type: 'Stone Golem',
          count: 1,
          spawnPoints: [{ q: 1, r: 0 }],
          isElite: true,
        },
      ],
    },
  ];

  for (const scenario of scenarios) {
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
          objectiveSecondary: scenario.objectiveSecondary,
          mapLayout: scenario.mapLayout,
          monsterGroups: scenario.monsterGroups,
        },
      });
    }
  }

  console.log(`✓ Created ${scenarios.length} scenarios`);

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
