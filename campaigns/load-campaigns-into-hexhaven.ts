/**
 * Campaign Loader Script
 * Converts campaign data from campaigns/ directory into Hexhaven game format
 * and generates seed data files for database seeding
 */

import * as fs from 'fs';
import * as path from 'path';

interface HexMap {
  q: number;
  r: number;
  terrain: 'normal' | 'difficult' | 'obstacle';
}

interface HexPosition {
  q: number;
  r: number;
}

interface MonsterGroup {
  type: string;
  positions: { x: number; y: number }[];
  elite?: boolean[];
}

interface Objective {
  id: string;
  type: string;
  description: string;
  hexes?: HexPosition[];
}

interface Treasure {
  x: number;
  y: number;
  id: string;
}

interface PlayerStartPosition {
  x: number;
  y: number;
}

/**
 * Convert hex axial coordinates to cartesian grid for game engine
 */
function hexToCartesian(q: number, r: number): { x: number; y: number } {
  const x = q;
  const y = r + (q - (q & 1)) / 2;
  return { x, y };
}

/**
 * Convert campaign hex format to game mapLayout format
 */
function convertHexesToMapLayout(
  hexes: HexMap[],
  startingPositions: Array<{ player: number; q: number; r: number }>
) {
  const mapLayout = hexes.map((hex, idx) => {
    const { x, y } = hexToCartesian(hex.q, hex.r);
    return {
      id: `hex-${hex.q}-${hex.r}`,
      x,
      y,
      terrain: hex.terrain === 'obstacle' ? 'obstacle' : hex.terrain,
      features: [] as string[]
    };
  });

  const playerStartPositions = startingPositions.map(pos => {
    const { x, y } = hexToCartesian(pos.q, pos.r);
    return { x, y };
  });

  return { mapLayout, playerStartPositions };
}

/**
 * Convert campaign monsters to game format
 */
function convertMonsters(
  monsterGroups: any[],
  startingPositions: Array<{ player: number; q: number; r: number }>
): MonsterGroup[] {
  if (!monsterGroups || monsterGroups.length === 0) {
    // Generate some default monsters if none specified
    return [
      {
        type: 'enemy-basic',
        positions: [{ x: 3, y: 2 }],
        elite: [false]
      }
    ];
  }

  return monsterGroups.map(group => ({
    type: group.type || 'enemy-basic',
    positions: (group.positions || []).map((pos: HexPosition) => {
      const { x, y } = hexToCartesian(pos.q, pos.r);
      return { x, y };
    }),
    elite: group.elite || []
  }));
}

/**
 * Convert campaign treasures to game format
 */
function convertTreasures(treasures: any[]): Treasure[] {
  if (!treasures || treasures.length === 0) {
    return [];
  }

  return treasures.map((treasure, idx) => ({
    x: treasure.x,
    y: treasure.y,
    id: `treasure-${idx}`
  }));
}

/**
 * Convert campaign objectives to game format
 */
function convertObjectives(objectives: any[]): any {
  const primary = {
    id: 'primary-kill-all',
    type: 'kill_all_monsters',
    description: 'Defeat all enemies',
    trackProgress: true,
    milestones: [25, 50, 75, 100]
  };

  const secondary: any[] = [];

  if (objectives && objectives.length > 0) {
    objectives.forEach((obj, idx) => {
      secondary.push({
        id: `secondary-${idx}`,
        type: 'collect_treasure',
        description: obj.description || 'Complete objective',
        trackProgress: true,
        rewards: { experience: 5 }
      });
    });
  }

  return { primary, secondary };
}

/**
 * Load and process campaign data
 */
function loadCampaigns(): {
  arcaneConspiracy: any;
  voidExpansion: any;
} {
  const arcaneFile = fs.readFileSync(
    path.join(__dirname, 'arcane-conspiracy-scenarios.json'),
    'utf-8'
  );
  const voidFile = fs.readFileSync(
    path.join(__dirname, 'void-expansion-scenarios.json'),
    'utf-8'
  );

  return {
    arcaneConspiracy: JSON.parse(arcaneFile),
    voidExpansion: JSON.parse(voidFile)
  };
}

/**
 * Convert campaign scenarios to game format
 */
function convertCampaignScenarios(
  campaignData: any,
  campaignId: string
): any[] {
  return campaignData.scenarios.map((scenario: any) => ({
    name: scenario.name,
    difficulty: scenario.difficulty,
    ...convertHexesToMapLayout(scenario.mapHexes, scenario.startingPositions),
    monsterGroups: convertMonsters(scenario.monsterGroups, scenario.startingPositions),
    objectives: convertObjectives(scenario.objectives),
    treasures: convertTreasures(scenario.treasures),
    backgroundImageUrl: scenario.background?.image,
    backgroundOpacity: scenario.background?.opacity || 0.7,
    backgroundOffsetX: scenario.background?.offsetX || 0,
    backgroundOffsetY: scenario.background?.offsetY || 0,
    backgroundScale: scenario.background?.scale || 1
  }));
}

/**
 * Generate campaign template seed data
 */
function generateCampaignTemplateSeed(
  campaignData: any,
  campaignId: string
): any {
  return {
    name: campaignData.campaign,
    description: `${campaignData.scenarios.length} scenario campaign`,
    deathMode: 'configurable',
    minPlayers: 1,
    maxPlayers: 4,
    requireUniqueClasses: false,
    scenarios: campaignData.scenarios.map((scenario: any, idx: number) => ({
      scenarioId: scenario.id,
      name: scenario.name,
      description: scenario.description,
      unlocksScenarios: scenario.unlocksScenarios || [],
      isStarting: scenario.isStarting || false,
      sequence: scenario.sequence
    }))
  };
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Loading campaigns into Hexhaven format...\n');

  const { arcaneConspiracy, voidExpansion } = loadCampaigns();

  // Convert scenarios
  console.log('📝 Converting Arcane Conspiracy scenarios...');
  const arcaneScenarios = convertCampaignScenarios(arcaneConspiracy, 'arcane-conspiracy');

  console.log('📝 Converting Void Expansion scenarios...');
  const voidScenarios = convertCampaignScenarios(voidExpansion, 'void-expansion');

  // Generate campaign template seed data
  console.log('📋 Generating campaign templates...');
  const arcaneTemplate = generateCampaignTemplateSeed(arcaneConspiracy, 'arcane-conspiracy');
  const voidTemplate = generateCampaignTemplateSeed(voidExpansion, 'void-expansion');

  // Save converted scenarios to seed file
  const allScenarios = [
    ...arcaneScenarios,
    ...voidScenarios
  ];

  const seedDataDir = path.join(__dirname, '../backend/prisma/seed-data');
  const scenarioSeedPath = path.join(seedDataDir, 'scenarios-campaigns.json');
  const campaignTemplatePath = path.join(seedDataDir, 'campaign-templates.json');

  fs.writeFileSync(
    scenarioSeedPath,
    JSON.stringify(allScenarios, null, 2)
  );

  fs.writeFileSync(
    campaignTemplatePath,
    JSON.stringify([arcaneTemplate, voidTemplate], null, 2)
  );

  console.log('\n✅ Campaign conversion complete!\n');
  console.log('Generated files:');
  console.log(`  - ${scenarioSeedPath}`);
  console.log(`  - ${campaignTemplatePath}`);
  console.log('\nNext steps:');
  console.log('1. Update backend/prisma/seed.ts to load campaign-templates.json');
  console.log('2. Run: npm run db:seed');
  console.log('3. Verify campaigns loaded in game database\n');
}

main();
