#!/usr/bin/env python3
"""
Script to update all references to game-rules.md in the codebase.
"""

import os
import re
from pathlib import Path

# Files that reference game-rules.md
REFERENCE_FILES = [
    "docs/temporary/DOCUMENTATION_REORGANIZATION.md",
    "docs/action-system.md",
    "specs/001-gloomhaven-multiplayer/spec.md",
    "docs/deck-management-system.md",
    ".plan/player-deck-rules.md",
    "specs/001-gloomhaven-multiplayer/checklists/requirements.md",
    "specs/001-gloomhaven-multiplayer/research.md"
]

# Mapping of topics to new file paths
TOPIC_MAPPING = {
    r"combat|attack|damage|advantage|disadvantage": "docs/game-rules/combat.md",
    r"condition|poison|wound|stun|muddle|disarm|immobilize|bless|curse|strengthen|invisible": "docs/game-rules/conditions-and-elements.md",
    r"element|infusion|fire|ice|air|earth|light|dark": "docs/game-rules/conditions-and-elements.md",
    r"move|movement|jump|flying|reveal": "docs/game-rules/character-turns.md",
    r"initiative|card selection|rest|long rest|short rest": "docs/game-rules/character-turns.md",
    r"monster|focus|boss": "docs/game-rules/monster-rules.md",
    r"scenario setup|overlay|trap|treasure|door": "docs/game-rules/scenario-setup.md",
    r"level|leveling|perk|enhancement|retire": "docs/game-rules/town-activities.md",
    r"campaign|party|achievement|prosperity": "docs/game-rules/campaign.md",
    r"item|equipment|shop": "docs/game-rules/core-rules.md",
    r"character mat|ability card|battle goal|modifier": "docs/game-rules/core-rules.md",
}

def update_file(filepath):
    """Update game-rules.md references in a file"""
    path = Path(__file__).parent.parent / filepath

    if not path.exists():
        print(f"Skipping {filepath} (not found)")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace direct references to game-rules.md
    # Pattern 1: [text](game-rules.md) or [text](../game-rules.md) etc.
    content = re.sub(
        r'\[([^\]]+)\]\((?:\.\.\/)*game-rules\.md\)',
        r'[\1](docs/game-rules/index.md)',
        content
    )

    # Pattern 2: [text](/game-rules.md)
    content = re.sub(
        r'\[([^\]]+)\]\(\/game-rules\.md\)',
        r'[\1](/docs/game-rules/index.md)',
        content
    )

    # Pattern 3: References like "see game-rules.md"
    content = re.sub(
        r'(?<![\[\/])game-rules\.md',
        r'docs/game-rules/index.md',
        content
    )

    if content != original_content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Updated: {filepath}")
    else:
        print(f"  No changes: {filepath}")

def main():
    print("Updating game-rules.md references...\n")

    for filepath in REFERENCE_FILES:
        update_file(filepath)

    print("\n✓ Reference updates complete!")
    print("\nManual review needed:")
    print("- Check if context-specific references need different target files")
    print("- Verify relative paths are correct from each file's location")
    print("- Update any skill/command files that load game rules")

if __name__ == "__main__":
    main()
