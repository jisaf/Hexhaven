# Scenario Migration Guide

Guide for converting old scenarios to the new objective format.

## Table of Contents

1. [Overview](#overview)
2. [Before and After Examples](#before-and-after-examples)
3. [Field Mapping](#field-mapping)
4. [Common Patterns](#common-patterns)
5. [Migration Process](#migration-process)
6. [SQL Migration Scripts](#sql-migration-scripts)
7. [Validation Checklist](#validation-checklist)

---

## Overview

### What Changed?

The objective system evolved from simple string-based objectives to a structured, template-based system:

**Old Format** (Pre-Issue #186):
```json
{
  "objectivePrimary": "Kill all enemies",
  "objectiveSecondary": "Loot the treasure chest"
}
```

**New Format** (Post-Issue #186):
```json
{
  "objectives": {
    "primary": {
      "id": "primary-1",
      "type": "kill_all_monsters",
      "description": "Kill all enemies",
      "trackProgress": true
    },
    "secondary": [
      {
        "id": "secondary-1",
        "type": "collect_treasure",
        "description": "Loot the treasure chest",
        "params": { "target": 1 },
        "trackProgress": true,
        "rewards": { "gold": 10 }
      }
    ]
  }
}
```

### Why Migrate?

- **Progress Tracking**: See real-time progress on objectives
- **Flexible Objectives**: Support for 12+ template types
- **Custom Logic**: Write custom JavaScript for unique objectives
- **Rewards**: Assign specific rewards to objectives
- **Failure Conditions**: Add time limits and other failure conditions

---

## Before and After Examples

### Example 1: Simple Kill All Enemies

**Before**:
```json
{
  "id": "scenario-1",
  "name": "Black Barrow",
  "objectivePrimary": "Kill all enemies",
  "objectiveSecondary": "Loot the treasure chest"
}
```

**After**:
```json
{
  "id": "scenario-1",
  "name": "Black Barrow",
  "objectivePrimary": "Kill all enemies",
  "objectiveSecondary": "Loot the treasure chest",
  "objectives": {
    "primary": {
      "id": "primary-1",
      "type": "kill_all_monsters",
      "description": "Defeat all enemies",
      "trackProgress": true
    },
    "secondary": [
      {
        "id": "secondary-1",
        "type": "collect_treasure",
        "description": "Loot the treasure chest",
        "params": {
          "target": 1
        },
        "trackProgress": true,
        "rewards": {
          "gold": 10
        }
      }
    ]
  }
}
```

**Notes**:
- Keep old fields for backward compatibility
- Add new `objectives` field
- Use `kill_all_monsters` template for primary
- Use `collect_treasure` template for secondary

---

### Example 2: Survival Scenario

**Before**:
```json
{
  "id": "scenario-2",
  "name": "Crypt of Blood",
  "objectivePrimary": "Survive 6 rounds",
  "objectiveSecondary": "Kill all undead before round 6"
}
```

**After**:
```json
{
  "id": "scenario-2",
  "name": "Crypt of Blood",
  "objectivePrimary": "Survive 6 rounds",
  "objectiveSecondary": "Kill all undead before round 6",
  "objectives": {
    "primary": {
      "id": "primary-1",
      "type": "survive_rounds",
      "description": "Survive for 6 rounds",
      "params": {
        "rounds": 6
      },
      "trackProgress": true
    },
    "secondary": [
      {
        "id": "secondary-1",
        "type": "custom",
        "description": "Kill all undead before round 6",
        "customFunction": "const allUndead = context.monsters.filter(m => m.type === 'Living Bones'); const deadUndead = allUndead.filter(m => m.isDead); const complete = allUndead.length > 0 && deadUndead.length === allUndead.length && context.game.currentRound < 6; return complete;",
        "trackProgress": false,
        "rewards": {
          "experience": 5,
          "gold": 15
        }
      }
    ]
  }
}
```

**Notes**:
- Use `survive_rounds` template for time-based survival
- Secondary requires custom function for "before round X" logic
- Add rewards for completing secondary

---

### Example 3: Boss Fight

**Before**:
```json
{
  "id": "scenario-3",
  "name": "Inox Encampment",
  "objectivePrimary": "Kill the Inox Shaman (boss)",
  "objectiveSecondary": "Complete in 8 rounds or less"
}
```

**After**:
```json
{
  "id": "scenario-3",
  "name": "Inox Encampment",
  "objectivePrimary": "Kill the Inox Shaman (boss)",
  "objectiveSecondary": "Complete in 8 rounds or less",
  "objectives": {
    "primary": {
      "id": "primary-1",
      "type": "kill_boss",
      "description": "Defeat the Inox Shaman",
      "params": {
        "monsterType": "Inox Shaman"
      },
      "trackProgress": true,
      "milestones": [25, 50, 75]
    },
    "secondary": [
      {
        "id": "secondary-1",
        "type": "custom",
        "description": "Complete in 8 rounds or less",
        "customFunction": "const boss = context.monsters.find(m => m.type === 'Inox Shaman'); if (!boss || !boss.isDead) return false; return context.game.currentRound <= 8;",
        "trackProgress": false,
        "rewards": {
          "experience": 3,
          "gold": 10
        }
      }
    ],
    "failureConditions": [
      {
        "id": "fail-1",
        "type": "time_limit",
        "description": "Time limit exceeded",
        "params": {
          "rounds": 12
        }
      }
    ]
  }
}
```

**Notes**:
- Use `kill_boss` template with boss health tracking
- Add milestones for boss health (25%, 50%, 75%)
- Speed run secondary requires custom function
- Add failure condition for absolute time limit

---

### Example 4: Complex Multi-Objective

**Before**:
```json
{
  "id": "scenario-4",
  "name": "Vermling Nest",
  "objectivePrimary": "Kill all enemies",
  "objectiveSecondary": "Do not let any Vermlings escape (reach the exit)"
}
```

**After**:
```json
{
  "id": "scenario-4",
  "name": "Vermling Nest",
  "objectivePrimary": "Kill all enemies",
  "objectiveSecondary": "Do not let any Vermlings escape (reach the exit)",
  "objectives": {
    "primary": {
      "id": "primary-1",
      "type": "kill_all_monsters",
      "description": "Defeat all enemies",
      "trackProgress": true
    },
    "secondary": [
      {
        "id": "secondary-1",
        "type": "custom",
        "description": "Don't let any Vermlings escape",
        "customFunction": "const exitHex = { q: 3, r: 2 }; const vermlings = context.monsters.filter(m => m.type.includes('Vermling')); const escaped = vermlings.filter(m => !m.isDead && m.position.q === exitHex.q && m.position.r === exitHex.r); return escaped.length === 0;",
        "trackProgress": false,
        "rewards": {
          "experience": 4,
          "gold": 8
        }
      }
    ]
  }
}
```

**Notes**:
- Standard kill all for primary
- Custom function checks if any Vermlings reached exit hex
- Exit hex coordinates must match map design

---

## Field Mapping

### Old → New Mapping Table

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `objectivePrimary` | `objectives.primary.description` | String becomes structured object |
| `objectiveSecondary` | `objectives.secondary[0].description` | String becomes array of objects |
| N/A | `objectives.primary.id` | **Required**: Use "primary-1" |
| N/A | `objectives.primary.type` | **Required**: Choose from templates |
| N/A | `objectives.primary.params` | Optional: Template parameters |
| N/A | `objectives.primary.trackProgress` | Recommended: Set to `true` |
| N/A | `objectives.secondary[].id` | **Required**: Use "secondary-1", "secondary-2", etc. |
| N/A | `objectives.secondary[].type` | **Required**: Template or "custom" |
| N/A | `objectives.secondary[].rewards` | Optional: Bonus rewards |
| N/A | `objectives.failureConditions[]` | Optional: Defeat conditions |

---

## Common Patterns

### Pattern 1: "Kill All Enemies"

**Template**: `kill_all_monsters`

**Migration**:
```json
{
  "id": "primary-1",
  "type": "kill_all_monsters",
  "description": "Defeat all enemies",
  "trackProgress": true
}
```

---

### Pattern 2: "Kill Specific Monster Type"

**Template**: `kill_monster_type`

**Migration**:
```json
{
  "id": "primary-1",
  "type": "kill_monster_type",
  "description": "Eliminate all Bandits",
  "params": {
    "monsterType": "Bandit Guard"
  },
  "trackProgress": true
}
```

---

### Pattern 3: "Survive N Rounds"

**Template**: `survive_rounds`

**Migration**:
```json
{
  "id": "primary-1",
  "type": "survive_rounds",
  "description": "Survive for 5 rounds",
  "params": {
    "rounds": 5
  },
  "trackProgress": true
}
```

---

### Pattern 4: "Collect Treasure"

**Template**: `collect_treasure`

**Migration**:
```json
{
  "id": "secondary-1",
  "type": "collect_treasure",
  "description": "Loot the treasure",
  "params": {
    "target": 1
  },
  "trackProgress": true,
  "rewards": {
    "gold": 10
  }
}
```

---

### Pattern 5: "Complete in X Rounds"

**Template**: `custom` (requires logic)

**Migration**:
```json
{
  "id": "secondary-1",
  "type": "custom",
  "description": "Complete in 8 rounds or less",
  "customFunction": "const allDead = context.monsters.every(m => m.isDead); if (!allDead) return false; return context.game.currentRound <= 8;",
  "trackProgress": false,
  "rewards": {
    "experience": 3
  }
}
```

---

### Pattern 6: "Kill Boss"

**Template**: `kill_boss`

**Migration**:
```json
{
  "id": "primary-1",
  "type": "kill_boss",
  "description": "Defeat the Dragon",
  "params": {
    "monsterType": "Ancient Drake"
  },
  "trackProgress": true,
  "milestones": [25, 50, 75]
}
```

---

## Migration Process

### Step-by-Step Guide

#### Step 1: Backup Current Scenarios

```bash
# Backup scenarios.json
cp backend/src/data/scenarios.json backend/src/data/scenarios.json.backup

# Backup database (if using database scenarios)
pg_dump hexhaven_dev > backup_$(date +%Y%m%d).sql
```

#### Step 2: Identify Scenario Intent

For each scenario, determine:
1. What must players do to win? (primary objective)
2. What can players do for bonus rewards? (secondary objectives)
3. What causes instant defeat? (failure conditions)

#### Step 3: Choose Template or Custom

Match intent to templates:
- "Kill all enemies" → `kill_all_monsters`
- "Kill specific type" → `kill_monster_type`
- "Kill boss" → `kill_boss`
- "Survive time" → `survive_rounds`
- "Collect items" → `collect_loot` or `collect_treasure`
- "Reach location" → `reach_location` or `escape`
- "Other" → `custom` with JavaScript function

#### Step 4: Write Objective JSON

```json
{
  "objectives": {
    "primary": {
      "id": "primary-1",
      "type": "<template>",
      "description": "<player-facing text>",
      "params": { /* template params */ },
      "trackProgress": true
    },
    "secondary": [
      {
        "id": "secondary-1",
        "type": "<template>",
        "description": "<player-facing text>",
        "params": { /* template params */ },
        "trackProgress": true,
        "rewards": {
          "experience": 5,
          "gold": 10
        }
      }
    ],
    "failureConditions": []  // Optional
  }
}
```

#### Step 5: Test Objective Logic

Create a test game:
1. Start scenario
2. Check objectives load correctly
3. Verify progress tracking works
4. Confirm completion triggers properly
5. Test failure conditions

#### Step 6: Update Database (If Applicable)

See [SQL Migration Scripts](#sql-migration-scripts) below.

---

## SQL Migration Scripts

### PostgreSQL Migration

If scenarios are stored in database:

```sql
-- Scenario 1: Add objectives to Black Barrow
UPDATE scenarios
SET objectives = '{
  "primary": {
    "id": "primary-1",
    "type": "kill_all_monsters",
    "description": "Defeat all enemies",
    "trackProgress": true
  },
  "secondary": [
    {
      "id": "secondary-1",
      "type": "collect_treasure",
      "description": "Loot the treasure chest",
      "params": {"target": 1},
      "trackProgress": true,
      "rewards": {"gold": 10}
    }
  ]
}'::jsonb
WHERE id = 'scenario-1';

-- Scenario 2: Add objectives to Crypt of Blood
UPDATE scenarios
SET objectives = '{
  "primary": {
    "id": "primary-1",
    "type": "survive_rounds",
    "description": "Survive for 6 rounds",
    "params": {"rounds": 6},
    "trackProgress": true
  },
  "secondary": [
    {
      "id": "secondary-1",
      "type": "custom",
      "description": "Kill all undead before round 6",
      "customFunction": "const allUndead = context.monsters.filter(m => m.type === ''Living Bones''); const deadUndead = allUndead.filter(m => m.isDead); const complete = allUndead.length > 0 && deadUndead.length === allUndead.length && context.game.currentRound < 6; return complete;",
      "trackProgress": false,
      "rewards": {"experience": 5, "gold": 15}
    }
  ]
}'::jsonb
WHERE id = 'scenario-2';

-- Verify migration
SELECT id, name, objectives->'primary'->>'type' as primary_type
FROM scenarios
WHERE objectives IS NOT NULL;
```

### Batch Migration Script

```sql
-- Create a function to add default objectives to all scenarios
CREATE OR REPLACE FUNCTION migrate_scenario_objectives()
RETURNS void AS $$
DECLARE
  scenario RECORD;
BEGIN
  FOR scenario IN SELECT * FROM scenarios WHERE objectives IS NULL LOOP
    -- Default to kill_all_monsters if no specific objective exists
    UPDATE scenarios
    SET objectives = jsonb_build_object(
      'primary', jsonb_build_object(
        'id', 'primary-1',
        'type', 'kill_all_monsters',
        'description', 'Defeat all enemies',
        'trackProgress', true
      ),
      'secondary', '[]'::jsonb
    )
    WHERE id = scenario.id;

    RAISE NOTICE 'Migrated scenario: %', scenario.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute migration
SELECT migrate_scenario_objectives();

-- Drop function after migration
DROP FUNCTION migrate_scenario_objectives();
```

---

## Validation Checklist

After migration, verify:

### JSON Validation

- [ ] Valid JSON syntax (no trailing commas)
- [ ] All required fields present (`id`, `type`, `description`)
- [ ] Objective IDs are unique within scenario
- [ ] `params` match template requirements
- [ ] Custom functions have no forbidden patterns
- [ ] Reward values are positive integers
- [ ] Milestone percentages are valid (0-100)

### Logic Validation

- [ ] Primary objective can be completed
- [ ] Secondary objectives don't conflict with primary
- [ ] Failure conditions are distinct from primary
- [ ] Custom functions return boolean or ObjectiveResult
- [ ] Monster types match scenario's monsterGroups
- [ ] Location coordinates exist on map
- [ ] Treasure IDs match scenario treasures

### Integration Testing

- [ ] Objectives load when scenario starts
- [ ] Progress updates during gameplay
- [ ] Completion triggers victory/defeat
- [ ] Rewards are granted correctly
- [ ] Frontend displays objectives
- [ ] WebSocket events fire properly

### Database Validation (If Applicable)

```sql
-- Check all scenarios have objectives
SELECT id, name
FROM scenarios
WHERE objectives IS NULL
   OR objectives->>'primary' IS NULL;

-- Verify objective structure
SELECT
  id,
  name,
  objectives->'primary'->>'type' as primary_type,
  jsonb_array_length(objectives->'secondary') as secondary_count
FROM scenarios;
```

---

## Troubleshooting

### Issue: Objectives Don't Load

**Symptoms**: No objectives shown when game starts

**Fixes**:
1. Check JSON syntax in scenarios.json
2. Verify scenario exists in database
3. Check backend logs for parsing errors
4. Ensure ObjectiveEvaluatorService is registered

### Issue: Progress Not Tracking

**Symptoms**: Objective shows 0/0 or no progress

**Fixes**:
1. Verify `trackProgress: true` is set
2. Check template params are correct
3. Ensure game state updates correctly
4. Look for ObjectiveContextBuilder errors

### Issue: Custom Function Fails

**Symptoms**: Error in backend logs, objective always incomplete

**Fixes**:
1. Check for forbidden patterns (see security list)
2. Add null checks for all entities
3. Verify monster/character types match exactly
4. Test function logic in isolation

### Issue: Completion Doesn't Trigger

**Symptoms**: Objective complete but game doesn't end

**Fixes**:
1. Check completion detection runs after turns
2. Verify ScenarioService.checkScenarioCompletion() is called
3. Ensure no failure conditions are triggered
4. Look for concurrent completion issues

---

## Best Practices

1. **Keep Old Fields**: Maintain `objectivePrimary` and `objectiveSecondary` for backward compatibility
2. **Use Templates First**: Only use custom functions when necessary
3. **Test Thoroughly**: Play through scenario to verify objectives work
4. **Add Rewards**: Make secondary objectives worthwhile
5. **Enable Progress**: Set `trackProgress: true` for better UX
6. **Document Intent**: Use clear, player-facing descriptions
7. **Version Control**: Commit scenario changes separately from code
8. **Backup First**: Always backup before batch migrations

---

## Migration Checklist

- [ ] Backed up scenarios.json and database
- [ ] Reviewed all existing scenarios
- [ ] Mapped objectives to templates
- [ ] Added `objectives` field to all scenarios
- [ ] Tested each scenario's objectives
- [ ] Verified progress tracking works
- [ ] Confirmed rewards are granted
- [ ] Checked failure conditions
- [ ] Updated database (if applicable)
- [ ] Ran validation queries
- [ ] Performed integration tests
- [ ] Documented any custom logic
- [ ] Committed changes to version control

---

## Support

For migration issues:
- Review [objective-system-guide.md](./objective-system-guide.md)
- Check [game-completion-system.md](./game-completion-system.md)
- Consult backend logs for errors
- Test in development environment first

---

**Last Updated**: 2025-12-07
**Version**: 1.0.0 (Issue #186 - Game Completion System)
