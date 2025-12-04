# Claude Code Configuration

This directory contains Claude Code configuration for the Hexhaven project.

## Structure

- **`commands/`** - Slash commands (committed to repo)
  - Custom commands like `/context-load`, `/min`, `/visual`, etc.
  - Available to all developers

- **`settings.json`** - Shared settings (committed to repo)
  - Hooks that run for all developers
  - Team-wide configuration
  - Currently includes PreToolUse hook for automated visual testing before commits

- **`settings.local.json`** - Local settings (gitignored)
  - Machine-specific permissions
  - Local overrides
  - Not shared across developers

## Adding New Slash Commands

Create a new `.md` file in the `commands/` directory:

```markdown
---
description: Brief description of what this command does
model: haiku  # Optional: specify model (haiku/sonnet/opus)
thinking: false  # Optional: enable/disable thinking
---

## Goal
What this command accomplishes

## Task
Detailed instructions for Claude
```

Then commit it to share with the team.

## Adding New Hooks

Edit `settings.json` to add hooks that should apply to all developers:

```json
{
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "PermissionRequest": [...]
  }
}
```

Note: SessionStart hooks have known issues and are not recommended. Use slash commands instead.

## Local Permissions

Each developer maintains their own `settings.local.json` with approved permissions for their machine. This file is gitignored and should not be committed.
