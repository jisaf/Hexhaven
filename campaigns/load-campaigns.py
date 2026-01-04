#!/usr/bin/env python3
"""
Campaign Loader for Hexhaven
Converts campaign data into game-compatible format and generates seed files
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple


def hex_to_cartesian(q: int, r: int) -> Tuple[int, int]:
    """Convert hex axial coordinates (q, r) to cartesian (x, y)"""
    x = q
    y = r + (q - (q & 1)) // 2
    return x, y


def convert_hex_map_to_layout(hexes: List[Dict]) -> List[Dict]:
    """Convert hex map format to game mapLayout format"""
    layout = []
    for hex_tile in hexes:
        q, r = hex_tile['q'], hex_tile['r']
        x, y = hex_to_cartesian(q, r)

        layout.append({
            'id': f'hex-{q}-{r}',
            'x': x,
            'y': y,
            'terrain': 'obstacle' if hex_tile['terrain'] == 'obstacle' else hex_tile['terrain'],
            'features': []
        })

    return layout


def convert_starting_positions(positions: List[Dict]) -> List[Dict]:
    """Convert starting positions from hex to cartesian"""
    converted = []
    for pos in positions:
        x, y = hex_to_cartesian(pos['q'], pos['r'])
        converted.append({'x': x, 'y': y})
    return converted


def convert_monsters(monster_groups: List[Dict], starting_positions: List[Dict]) -> List[Dict]:
    """Convert monsters to game format"""
    if not monster_groups:
        return [{
            'type': 'enemy-basic',
            'positions': [{'x': 3, 'y': 2}],
            'level': 'normal'
        }]

    converted = []
    for group in monster_groups:
        positions = []
        elite = []

        for i, pos in enumerate(group.get('positions', [])):
            if isinstance(pos, dict) and ('q' in pos and 'r' in pos):
                x, y = hex_to_cartesian(pos['q'], pos['r'])
                positions.append({'x': x, 'y': y})
            elif isinstance(pos, dict) and ('x' in pos and 'y' in pos):
                positions.append(pos)

            # Track elite status
            if i < len(group.get('elite', [])):
                elite.append(group['elite'][i])

        converted.append({
            'type': group.get('type', 'enemy-basic'),
            'positions': positions,
            'elite': elite if elite else [False] * len(positions),
            'level': group.get('level', 'normal')
        })

    return converted


def convert_treasures(treasures: List[Dict]) -> List[Dict]:
    """Convert treasures to game format"""
    if not treasures:
        return []

    converted = []
    for i, treasure in enumerate(treasures):
        # Handle both direct coordinates and position object
        if 'position' in treasure:
            q, r = treasure['position']['q'], treasure['position']['r']
        else:
            q, r = treasure.get('q', 0), treasure.get('r', 0)

        x, y = hex_to_cartesian(q, r)
        converted.append({
            'x': x,
            'y': y,
            'id': treasure.get('id', f'treasure-{i}')
        })

    return converted


def convert_objectives(objectives_list: List[Dict]) -> Dict:
    """Convert objectives to game format"""
    primary = {
        'id': 'primary-kill-all',
        'type': 'kill_all_monsters',
        'description': 'Defeat all enemies',
        'trackProgress': True,
        'milestones': [25, 50, 75, 100]
    }

    secondary = []
    for i, obj in enumerate(objectives_list or []):
        obj_type = obj.get('type', 'collect_treasure')

        # Map objective types from campaign format to game format
        type_map = {
            'collect-items': 'collect_treasure',
            'protect-allies': 'protect',
            'reach-location': 'reach_location'
        }

        secondary.append({
            'id': obj.get('id', f'secondary-{i}'),
            'type': type_map.get(obj_type, 'collect_treasure'),
            'description': obj.get('description', 'Complete objective'),
            'trackProgress': True,
            'rewards': {'experience': 5}
        })

    return {'primary': primary, 'secondary': secondary}


def convert_scenario(scenario: Dict) -> Dict:
    """Convert single scenario to game format"""
    return {
        'name': scenario['name'],
        'difficulty': scenario['difficulty'],
        'mapLayout': convert_hex_map_to_layout(scenario['mapHexes']),
        'playerStartPositions': convert_starting_positions(scenario['startingPositions']),
        'monsterGroups': convert_monsters(scenario.get('monsterGroups', []), scenario['startingPositions']),
        'objectives': convert_objectives(scenario.get('objectives', [])),
        'treasures': convert_treasures(scenario.get('treasures', [])),
        'backgroundImageUrl': scenario.get('background', {}).get('image'),
        'backgroundOpacity': scenario.get('background', {}).get('opacity', 0.7),
        'backgroundOffsetX': scenario.get('background', {}).get('offsetX', 0),
        'backgroundOffsetY': scenario.get('background', {}).get('offsetY', 0),
        'backgroundScale': scenario.get('background', {}).get('scale', 1)
    }


def create_campaign_template(campaign_data: Dict) -> Dict:
    """Create campaign template seed data"""
    return {
        'name': campaign_data['campaign'],
        'description': f"{len(campaign_data['scenarios'])} scenario campaign",
        'deathMode': 'configurable',
        'minPlayers': 1,
        'maxPlayers': 4,
        'requireUniqueClasses': False,
        'scenarios': [
            {
                'scenarioId': scenario['id'],
                'name': scenario['name'],
                'description': scenario.get('description'),
                'unlocksScenarios': scenario.get('unlocksScenarios', []),
                'isStarting': scenario.get('isStarting', False),
                'sequence': scenario['sequence']
            }
            for scenario in campaign_data['scenarios']
        ]
    }


def main():
    """Main execution"""
    print('\n' + '='*70)
    print('🚀 HEXHAVEN CAMPAIGN LOADER')
    print('='*70)
    print('Converting campaigns to game format...\n')

    # Load campaign files
    campaigns_dir = Path(__file__).parent
    arcane_file = campaigns_dir / 'arcane-conspiracy-scenarios.json'
    void_file = campaigns_dir / 'void-expansion-scenarios.json'

    if not arcane_file.exists() or not void_file.exists():
        print('❌ Campaign JSON files not found!')
        print(f'  Expected: {arcane_file}')
        print(f'  Expected: {void_file}')
        sys.exit(1)

    print(f'📖 Loading Arcane Conspiracy campaign...')
    with open(arcane_file) as f:
        arcane_data = json.load(f)

    print(f'📖 Loading Void Expansion campaign...')
    with open(void_file) as f:
        void_data = json.load(f)

    # Convert scenarios
    print(f'\n📝 Converting scenarios to game format...')
    arcane_scenarios = [convert_scenario(s) for s in arcane_data['scenarios']]
    void_scenarios = [convert_scenario(s) for s in void_data['scenarios']]

    print(f'  ✓ Converted {len(arcane_scenarios)} Arcane Conspiracy scenarios')
    print(f'  ✓ Converted {len(void_scenarios)} Void Expansion scenarios')

    # Generate campaign templates
    print(f'\n📋 Creating campaign templates...')
    arcane_template = create_campaign_template(arcane_data)
    void_template = create_campaign_template(void_data)

    # Prepare seed directory
    backend_dir = Path(__file__).parent.parent / 'backend'
    seed_data_dir = backend_dir / 'prisma' / 'seed-data'
    seed_data_dir.mkdir(parents=True, exist_ok=True)

    # Write converted scenarios
    scenarios_output = seed_data_dir / 'scenarios-campaigns.json'
    with open(scenarios_output, 'w') as f:
        json.dump(arcane_scenarios + void_scenarios, f, indent=2)

    print(f'  ✓ Saved {scenarios_output}')

    # Write campaign templates
    templates_output = seed_data_dir / 'campaign-templates.json'
    with open(templates_output, 'w') as f:
        json.dump([arcane_template, void_template], f, indent=2)

    print(f'  ✓ Saved {templates_output}')

    # Print instructions
    print(f'\n' + '='*70)
    print('✅ CONVERSION COMPLETE')
    print('='*70)
    print(f'\nGenerated files:')
    print(f'  1. {scenarios_output.relative_to(backend_dir.parent)}')
    print(f'  2. {templates_output.relative_to(backend_dir.parent)}')

    print(f'\n📋 Next steps:')
    print(f'  1. Update backend/prisma/seed.ts to include campaign seeding')
    print(f'  2. Run: npm run db:seed')
    print(f'  3. Verify in game: Check campaigns are available\n')

    return 0


if __name__ == '__main__':
    sys.exit(main())
