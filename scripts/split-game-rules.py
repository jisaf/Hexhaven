#!/usr/bin/env python3
"""
Script to split the large game-rules.md file into manageable chunks.
"""

import os
import re
from pathlib import Path

# Define the split points and their corresponding files
SECTIONS = [
    {
        "file": "scenario-setup.md",
        "title": "Scenario Setup",
        "start": "# Scenario Setup",
        "end": "# Round Overview"
    },
    {
        "file": "character-turns.md",
        "title": "Character Turns & Round Overview",
        "start": "# Round Overview",
        "end": "### MOVE"
    },
    {
        "file": "combat.md",
        "title": "Combat System",
        "start": "### MOVE",
        "end": "### CONDITIONS"
    },
    {
        "file": "conditions-and-elements.md",
        "title": "Conditions & Elements",
        "start": "### CONDITIONS",
        "end": "### ACTIVE BONUSES"
    },
    {
        "file": "abilities.md",
        "title": "Character Abilities",
        "start": "### ACTIVE BONUSES",
        "end": "### CHARACTER DAMAGE"
    },
    {
        "file": "character-management.md",
        "title": "Character Management",
        "start": "### CHARACTER DAMAGE",
        "end": "## Monster Turn"
    },
    {
        "file": "monster-rules.md",
        "title": "Monster Rules",
        "start": "## Monster Turn",
        "end": "## End of Round"
    },
    {
        "file": "end-of-round.md",
        "title": "End of Round & Finishing Scenarios",
        "start": "## End of Round",
        "end": "# Campaign Overview"
    },
    {
        "file": "campaign.md",
        "title": "Campaign Overview",
        "start": "# Campaign Overview",
        "end": "# Playing a Campaign"
    },
    {
        "file": "town-activities.md",
        "title": "Town Activities",
        "start": "# Playing a Campaign",
        "end": "## Scenario Completion"
    },
    {
        "file": "scenario-completion.md",
        "title": "Scenario Completion",
        "start": "## Scenario Completion",
        "end": "# Game Variant: Reduced Randomness"
    },
    {
        "file": "variants.md",
        "title": "Game Variants",
        "start": "# Game Variant: Reduced Randomness",
        "end": "# Credits"
    }
]

def read_game_rules():
    """Read the game-rules.md file"""
    game_rules_path = Path(__file__).parent.parent / "game-rules.md"
    with open(game_rules_path, 'r', encoding='utf-8') as f:
        return f.read()

def extract_section(content, start_marker, end_marker):
    """Extract a section from the content between two markers"""
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print(f"Warning: Start marker not found: {start_marker}")
        return ""

    if end_marker:
        end_idx = content.find(end_marker, start_idx + len(start_marker))
        if end_idx == -1:
            print(f"Warning: End marker not found: {end_marker}")
            return content[start_idx:]
        return content[start_idx:end_idx]
    else:
        return content[start_idx:]

def fix_image_paths(content):
    """Fix image paths to be relative from docs/game-rules/"""
    # Replace img/ with ../../img/
    content = re.sub(r'\(img/', r'(../../img/', content)
    return content

def add_navigation(content, title):
    """Add navigation header to content"""
    header = f"""# {title}

[Back to Index](./index.md)

---

"""
    return header + content

def create_file(filename, content, title):
    """Create a markdown file in docs/game-rules/"""
    docs_dir = Path(__file__).parent.parent / "docs" / "game-rules"
    docs_dir.mkdir(parents=True, exist_ok=True)

    filepath = docs_dir / filename

    # Fix image paths
    content = fix_image_paths(content)

    # Add navigation
    content = add_navigation(content, title)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Created: {filepath}")

def main():
    print("Reading game-rules.md...")
    content = read_game_rules()

    print(f"Total content length: {len(content)} characters")

    for section in SECTIONS:
        print(f"\nProcessing section: {section['title']}")
        section_content = extract_section(content, section['start'], section.get('end'))

        if section_content:
            print(f"  Section length: {len(section_content)} characters")
            create_file(section['file'], section_content, section['title'])
        else:
            print(f"  WARNING: No content extracted for {section['file']}")

    print("\n✓ All files created successfully!")
    print("\nNext steps:")
    print("1. Review the created files in docs/game-rules/")
    print("2. Run: python scripts/update-game-rules-references.py")
    print("3. Verify all cross-references work correctly")

if __name__ == "__main__":
    main()
