---
description: Load project context at session start using Haiku
model: haiku
thinking: false
---

## Goal

Load project context from key documentation files (README, PRD, and all spec.md files). When used in SessionStart hooks, this runs with Haiku model and thinking disabled for efficiency.

## Task

Read and process the following files to establish project context:

- `/home/opc/hexhaven/README.md` - Project overview and setup instructions
- `/home/opc/hexhaven/PRD.md` - Product requirements document
- `/home/opc/hexhaven/specs/001-gloomhaven-multiplayer/spec.md` - Multiplayer feature spec
- `/home/opc/hexhaven/specs/002-postgres-user-db/spec.md` - Database spec

Understand:
- Project architecture and structure
- Key features and requirements
- Technical specifications and implementation details
- Setup and configuration requirements

After loading the context, provide a brief confirmation that context has been loaded, listing the files that were processed.
