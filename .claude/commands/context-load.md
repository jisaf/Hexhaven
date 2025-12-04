---
description: Load project context at session start using Haiku
---

## Goal

Load project context from key documentation files (README, PRD, and all spec.md files) using Claude Haiku (faster model) with thinking disabled, then restore Claude Sonnet with thinking enabled.

## Execution Steps

1. **Switch to Haiku**: Use `/model haiku` to set the model to Claude Haiku
2. **Disable Thinking**: Use `/thinking off` to disable thinking mode
3. **Load Context**: Read and process the following files to establish project context:
   - `/home/opc/hexhaven/README.md` - Project overview and setup instructions
   - `/home/opc/hexhaven/PRD.md` - Product requirements document
   - `/home/opc/hexhaven/specs/001-gloomhaven-multiplayer/spec.md` - Multiplayer feature spec
   - `/home/opc/hexhaven/specs/002-postgres-user-db/spec.md` - Database spec
4. **Restore Sonnet**: Use `/model sonnet` to switch back to Claude Sonnet
5. **Enable Thinking**: Use `/thinking on` to re-enable thinking mode

## Context Loading

Read each of the documentation files listed above to understand:
- Project architecture and structure
- Key features and requirements
- Technical specifications and implementation details
- Setup and configuration requirements

After loading the context, provide a brief confirmation that context has been loaded, listing the files that were processed.

## Task

Load project context from all documentation files.
