---
description: Load context, create feature branch, plan and implement with Opus
model: opus
thinking: true
---

## Goal

Start a new feature with fresh context by clearing previous conversation history, loading project context, creating a feature branch from main, planning the implementation with Opus, and implementing with Opus.

## Execution Steps

1. **Switch to Main and Pull**:
   - Checkout main branch: `git checkout main`
   - Pull latest changes: `git pull origin main`
2. **Clear Context**: Execute `/clear` to remove all previous conversation history and start fresh
3. **Load Context**: Execute `/context-load` to load project documentation
4. **Parse Task**: Extract the feature description from the prompt to generate a branch name
5. **Create Branch**:
   - Create descriptive branch name from the task (e.g., "add-user-auth" or "fix-login-bug")
   - Create and checkout new branch: `git checkout -b <branch-name>`
6. **Plan with Opus**: Use Opus model to create a detailed implementation plan by entering plan mode and analyzing the codebase to design the implementation approach
7. **Implement with Opus**: Continue with Opus to implement the planned changes

## Branch Naming Convention

- Use lowercase with hyphens
- Be descriptive but concise
- Examples:
  - "add user authentication" → `add-user-auth`
  - "fix login redirect bug" → `fix-login-redirect`
  - "refactor database layer" → `refactor-db-layer`

## Task

{PROMPT}
