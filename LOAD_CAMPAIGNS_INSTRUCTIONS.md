# Loading Campaigns into Hexhaven

This guide explains how to load the generated campaign data (Arcane Conspiracy and Void Expansion) into your Hexhaven game database.

## Quick Start

### Step 1: Generate Seed Files
The seed files have already been generated in `/backend/prisma/seed-data/`:
- `campaign-templates.json` - Campaign template definitions
- `scenarios-campaigns.json` - Campaign scenarios converted to game format

### Step 2: Update Seed Script

Add the following to `backend/prisma/seed.ts` in the imports section (after line 7):

```typescript
interface CampaignTemplateSeed {
  name: string;
  description: string;
  deathMode: string;
  minPlayers: number;
  maxPlayers: number;
  requireUniqueClasses: boolean;
  scenarios: Array<{
    scenarioId: string;
    name: string;
    description: string | null;
    unlocksScenarios: string[];
    isStarting: boolean;
    sequence: number;
  }>;
}
```

### Step 3: Add Campaign Seeding Function

Add this function before the `main()` function (before line ~390):

```typescript
async function seedCampaignScenariosAndTemplates() {
  console.log('Seeding campaign scenarios and templates...');

  try {
    // Load campaign scenarios
    const campaignScenarios = await loadJSON<ScenarioSeed>('scenarios-campaigns.json');

    // Seed all campaign scenarios first
    for (const scenarioData of campaignScenarios) {
      await prisma.scenario.upsert({
        where: { name: scenarioData.name },
        update: {
          difficulty: scenarioData.difficulty,
          mapLayout: scenarioData.mapLayout,
          monsterGroups: scenarioData.monsterGroups,
          objectives: scenarioData.objectives,
          treasures: scenarioData.treasures,
          playerStartPositions: scenarioData.playerStartPositions,
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
          backgroundImageUrl: scenarioData.backgroundImageUrl,
          backgroundOpacity: scenarioData.backgroundOpacity,
          backgroundOffsetX: scenarioData.backgroundOffsetX,
          backgroundOffsetY: scenarioData.backgroundOffsetY,
          backgroundScale: scenarioData.backgroundScale,
        },
      });
    }

    console.log(`✓ Seeded ${campaignScenarios.length} campaign scenarios`);

    // Load campaign templates
    const campaignTemplates = await loadJSON<CampaignTemplateSeed>('campaign-templates.json');

    // Seed campaign templates
    for (const templateData of campaignTemplates) {
      // Check if template already exists
      const existingTemplate = await prisma.campaignTemplate.findUnique({
        where: { name: templateData.name },
        include: { scenarios: true },
      });

      if (existingTemplate) {
        // Delete old scenarios
        await prisma.campaignTemplateScenario.deleteMany({
          where: { templateId: existingTemplate.id },
        });
      }

      // Upsert campaign template with scenarios
      const templateScenarios = templateData.scenarios.map(scenario => ({
        scenarioId: scenario.scenarioId,
        name: scenario.name,
        description: scenario.description,
        unlocksScenarios: scenario.unlocksScenarios,
        isStarting: scenario.isStarting,
        sequence: scenario.sequence,
      }));

      await prisma.campaignTemplate.upsert({
        where: { name: templateData.name },
        update: {
          description: templateData.description,
          deathMode: templateData.deathMode,
          minPlayers: templateData.minPlayers,
          maxPlayers: templateData.maxPlayers,
          requireUniqueClasses: templateData.requireUniqueClasses,
          scenarios: {
            create: templateScenarios,
          },
        },
        create: {
          name: templateData.name,
          description: templateData.description,
          deathMode: templateData.deathMode,
          minPlayers: templateData.minPlayers,
          maxPlayers: templateData.maxPlayers,
          requireUniqueClasses: templateData.requireUniqueClasses,
          scenarios: {
            create: templateScenarios,
          },
        },
      });
    }

    console.log(`✓ Seeded ${campaignTemplates.length} campaign templates with scenarios`);
  } catch (error) {
    console.error('Error seeding campaign scenarios and templates:', error);
    throw error;
  }
}
```

### Step 4: Update Main Function

In the `main()` function, add this line after the other seed calls (around line 420):

```typescript
async function main() {
  console.log('Starting database seed...\n');

  try {
    await seedCardLayoutTemplates();
    await seedCharacterClasses();
    await seedAbilityCards();
    await seedTestUsers();
    await seedItems();
    await seedScenarios();
    await seedCampaignTemplates();
    await seedTrivialCampaignTemplate();
    await seedCampaignScenariosAndTemplates(); // ADD THIS LINE
    await seedTrivialTrainingNarratives();
    await seedCharacterInventory();

    console.log('\n✅ Database seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    throw error;
  }
}
```

### Step 5: Verify Seed Files Exist

Before running the seed, verify the files were generated:

```bash
ls -la backend/prisma/seed-data/
```

You should see:
- `campaign-templates.json`
- `scenarios-campaigns.json`

If these don't exist, run from the campaigns directory:
```bash
python3 load-campaigns.py
```

### Step 6: Run Database Seed

From the root hexhaven directory:

```bash
npm run db:seed
```

Output should include:
```
✓ Seeded 30 campaign scenarios
✓ Seeded 2 campaign templates with scenarios
```

### Step 7: Verify Campaigns Loaded

Check the database to confirm campaigns were loaded:

```bash
# Using psql (if available)
psql $DATABASE_URL -c "SELECT name, description FROM campaign_templates;"
```

Or check in the game UI - you should see "Arcane Conspiracy" and "Void Expansion" as available campaign templates.

## Troubleshooting

### "scenarios-campaigns.json not found"
Run the conversion script:
```bash
cd campaigns
python3 load-campaigns.py
```

### "Module not found: CampaignTemplateSeed"
Make sure you added the interface definition to seed.ts

### "Campaign template already exists"
The `upsert` operation handles this automatically, but you may see update logs

### Scenarios not appearing
1. Verify scenario names match between campaigns JSON and generated seed files
2. Check database for duplicate scenario names
3. Clear and reseed the database if needed

## Campaign Details

### Arcane Conspiracy Campaign
- **Theme**: Dungeon crawl uncovering wizard's evil plan
- **Scenarios**: 15 progressive scenarios
- **Progression**: Unlocks based on scenario victories
- **Difficulty Levels**: 1-7
- **Map Type**: Hex-based, topdown fantasy dungeons

### Void Expansion Campaign
- **Theme**: Sci-fi space opera, alien invasion defense
- **Scenarios**: 15 progressive scenarios
- **Progression**: Unlocks based on scenario victories
- **Difficulty Levels**: 1-7
- **Map Type**: Hex-based, topdown space stations and alien planets

## Files Reference

Generated seed files in `backend/prisma/seed-data/`:
- `campaign-templates.json` - 2 campaign templates (Arcane Conspiracy, Void Expansion)
- `scenarios-campaigns.json` - 30 scenarios (15 per campaign)

Database models:
- `CampaignTemplate` - Campaign template definitions
- `CampaignTemplateScenario` - Scenarios within a template
- `Scenario` - Individual scenario game data

## Next Steps

1. **Game Assets**: Upload campaign artwork from `campaigns/campaign-artwork/`
2. **UI Integration**: Update campaign selection UI to show new campaigns
3. **Testing**: Create test campaigns from templates and play through scenarios
4. **Data Validation**: Verify monster placements, objectives, and treasures are correct

---

For questions about campaign structure, see `campaigns/README.md` and `campaigns/CAMPAIGNS_SUMMARY.md`.
