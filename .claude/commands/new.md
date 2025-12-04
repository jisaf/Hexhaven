---
description: Load context, create feature branch, execute task
model: sonnet
---

## Goal

Start a new feature by loading project context, creating a feature branch from main, and executing the requested task.

## Execution Steps

1. **Load Context**: Execute `/context-load` to load project documentation
2. **Parse Task**: Extract the feature description from the prompt to generate a branch name
3. **Create Branch**:
   - Ensure we're on main: `git checkout main`
   - Pull latest changes: `git pull origin main`
   - Create descriptive branch name from the task (e.g., "add-user-auth" or "fix-login-bug")
   - Create and checkout new branch: `git checkout -b <branch-name>`
4. **Execute Task**: Proceed with implementing the requested feature or fix

## Branch Naming Convention

- Use lowercase with hyphens
- Be descriptive but concise
- Examples:
  - "add user authentication" → `add-user-auth`
  - "fix login redirect bug" → `fix-login-redirect`
  - "refactor database layer" → `refactor-db-layer`

## Task

{PROMPT}
