# Claude Code Agents & Commands

This document describes all custom slash commands and specialized agents available in the Hexhaven project.

## Table of Contents

- [Slash Commands](#slash-commands)
  - [Development & Testing](#development--testing)
  - [Feature Development Workflow](#feature-development-workflow-speckit)
  - [Internal Commands](#internal-commands)
- [Specialized Agents](#specialized-agents)
- [Hooks & Automation](#hooks--automation)

---

## Slash Commands

### Development & Testing

#### `/servers`

**Purpose**: Intelligently start or restart development servers

**Location**: `.claude/commands/servers.md`

**Features**:
- Checks if servers are running on ports 3000, 3001, 5173
- Kills existing processes cleanly before restart
- Auto-detects if database migrations are needed
- Chooses startup method intelligently:
  - `npm run dev` - Quick startup for testing
  - `start-dev.sh` - Full setup with migrations/seeding
- Runs servers in background with logs
- Verifies servers are accessible

**Usage**:
```bash
/servers
```

**Output Logs**:
- Backend: `/tmp/hexhaven-backend.log`
- Frontend: `/tmp/hexhaven-frontend.log`
- Startup script: `/tmp/hexhaven-startup.log`

**Model**: Haiku with thinking off (fast execution)

---

#### `/visual [smoke|full]`

**Purpose**: Run visual regression tests with Playwright MCP

**Location**: `frontend/.claude/commands/visual.md`

**Test Modes**:

1. **Smoke Test** (default) - 7 steps (definition of done):
   - Navigate and verify page load
   - Click Create Game button
   - Enter nickname
   - Submit and verify lobby
   - Start game
   - Verify hex map loads
   - Verify cards appear

2. **Full Test** - 13 steps (comprehensive):
   - All smoke test steps plus:
   - Character selection
   - Card selection
   - Movement
   - Combat
   - Monster AI turn
   - Scenario completion

**Features**:
- Auto-starts servers via `/servers` before testing
- Uses Playwright MCP browser tools (real Chromium ARM64)
- Semantic locators (accessibility tree-based)
- Screenshots with 5-day auto-cleanup
- Bug tracking to `frontend/tests/bugs.md`
- Pixel 6 viewport (412×915px)

**Screenshot Naming**:
```
[branch]-[timestamp]-[mode]-[step]-[description].png

Example:
002-postgres-user-db-20251204T105342Z-smoke-01-landing.png
```

**Screenshot Location**: `frontend/public/test-videos/`

**View Gallery**: http://localhost:5173/test-videos

**Usage**:
```bash
/visual smoke    # Run 7-step smoke test (default)
/visual full     # Run 13-step comprehensive test
/visual          # Defaults to smoke
```

**Model**: Haiku with thinking off (efficient testing)

**Prerequisites**:
- Chromium symlinked at `/opt/google/chrome/chrome`
- MCP browser tools configured

---

#### `/min <command>`

**Purpose**: Execute commands quickly with Haiku model

**Location**: `.claude/commands/min.md`

**Features**:
- Switches to Haiku model
- Disables thinking mode
- Executes command
- Restores Sonnet model
- Re-enables thinking mode

**Usage**:
```bash
/min update the README
/min fix typo in header component
/min add console.log for debugging
```

**Best for**:
- Quick fixes
- Simple changes
- Straightforward tasks
- When speed matters

---

### Feature Development Workflow (SpecKit)

Complete end-to-end workflow for feature development from specification to implementation.

#### `/speckit.specify <description>`

**Purpose**: Create feature specification from natural language

**Location**: `.claude/commands/speckit.specify.md`

**Process**:
1. Analyzes feature description
2. Generates short name (2-4 words)
3. Checks for existing branches
4. Creates numbered feature branch (e.g., `003-user-auth`)
5. Generates spec.md using template
6. Validates specification quality
7. Asks up to 3 clarification questions if needed

**Creates**:
- Feature branch: `NNN-short-name`
- `specs/NNN-short-name/spec.md`
- `specs/NNN-short-name/checklists/requirements.md`

**Sections in spec.md**:
- Feature Overview
- User Scenarios & Testing
- Functional Requirements
- Success Criteria (measurable, technology-agnostic)
- Key Entities
- Assumptions
- Out of Scope

**Usage**:
```bash
/speckit.specify Add user authentication with email/password
/speckit.specify Implement real-time chat for multiplayer games
/speckit.specify Create analytics dashboard for game statistics
```

**Quality Validation**:
- No implementation details (frameworks, languages)
- Technology-agnostic success criteria
- Testable requirements
- Max 3 clarification questions

---

#### `/speckit.clarify`

**Purpose**: Identify and resolve underspecified areas in the spec

**Location**: `.claude/commands/speckit.clarify.md`

**Process**:
1. Analyzes current spec.md
2. Identifies underspecified areas
3. Asks up to 5 targeted questions
4. Updates spec with answers
5. Re-validates specification

**Usage**:
```bash
/speckit.clarify
```

**Best used when**:
- Spec has ambiguous requirements
- Edge cases need clarification
- Scope boundaries are unclear

---

#### `/speckit.plan`

**Purpose**: Generate technical implementation plan

**Location**: `.claude/commands/speckit.plan.md`

**Process**:
1. Loads spec.md and project constitution
2. Evaluates gates (YAGNI, KISS, DRY, security)
3. **Phase 0**: Research & unknowns resolution
   - Creates `research.md`
4. **Phase 1**: Design & contracts
   - Creates `data-model.md` (entities, relationships)
   - Creates `contracts/` (API specs)
   - Creates `quickstart.md` (setup guide)
5. Updates agent context (CLAUDE.md)

**Creates**:
- `specs/NNN-feature/plan.md`
- `specs/NNN-feature/research.md`
- `specs/NNN-feature/data-model.md`
- `specs/NNN-feature/contracts/` directory
- `specs/NNN-feature/quickstart.md`

**Usage**:
```bash
/speckit.plan
```

**Gate Validations**:
- YAGNI: Only implement what's needed now
- KISS: Simplest solution that works
- DRY: No unnecessary code duplication
- Security: Identified and addressed
- Performance: Requirements justified

---

#### `/speckit.tasks`

**Purpose**: Generate actionable, dependency-ordered task list

**Location**: `.claude/commands/speckit.tasks.md`

**Process**:
1. Loads plan.md, spec.md, data-model.md, contracts/
2. Maps tasks to user stories (from spec)
3. Organizes by priority (P1, P2, P3)
4. Identifies parallel opportunities
5. Creates independent test criteria per story

**Task Format**:
```markdown
- [ ] T001 Task description in path/to/file.ts
- [ ] T002 [P] Parallelizable task in other/file.ts
- [ ] T003 [P] [US1] User Story 1 task in src/component.tsx
```

**Labels**:
- `[P]` - Parallelizable (no dependencies)
- `[US1]`, `[US2]`, etc. - User story mapping

**Phases**:
1. **Setup** - Project initialization
2. **Foundational** - Blocking prerequisites
3. **User Stories** - One phase per story (P1, P2, P3...)
4. **Polish** - Cross-cutting concerns

**Creates**:
- `specs/NNN-feature/tasks.md`

**Usage**:
```bash
/speckit.tasks
```

**Features**:
- Dependency graph
- Parallel execution examples
- Independent test criteria per story
- MVP scope suggestions

---

#### `/speckit.implement`

**Purpose**: Execute implementation from tasks.md

**Location**: `.claude/commands/speckit.implement.md`

**Process**:
1. Loads tasks.md
2. Processes tasks in dependency order
3. Executes each task
4. Updates task status (checkbox)
5. Runs tests if specified
6. Proceeds to next task

**Usage**:
```bash
/speckit.implement
```

**Tracks**:
- Task completion status
- Test results
- Implementation progress

---

#### `/speckit.analyze`

**Purpose**: Cross-artifact consistency analysis

**Location**: `.claude/commands/speckit.analyze.md`

**Process**:
1. Loads spec.md, plan.md, tasks.md
2. Validates consistency across artifacts
3. Checks for gaps and inconsistencies
4. Reports issues (non-destructive)

**Validates**:
- All spec requirements have tasks
- All tasks map to requirements
- Plan aligns with spec
- No orphaned tasks

**Usage**:
```bash
/speckit.analyze
```

---

#### `/speckit.checklist`

**Purpose**: Generate custom feature validation checklist

**Location**: `.claude/commands/speckit.checklist.md`

**Process**:
1. Analyzes feature requirements
2. Creates custom checklist
3. Based on spec.md requirements

**Usage**:
```bash
/speckit.checklist
```

---

#### `/speckit.constitution`

**Purpose**: Manage project principles and standards

**Location**: `.claude/commands/speckit.constitution.md`

**Process**:
1. Creates/updates `.specify/memory/constitution.md`
2. Defines coding standards
3. Sets architecture principles
4. Updates dependent templates

**Usage**:
```bash
/speckit.constitution
```

**Defines**:
- Code style guidelines
- Architecture patterns
- Testing requirements
- Security standards

---

### Internal Commands

#### `/context-load`

**Purpose**: Load project context at session start

**Location**: `.claude/commands/context-load.md`

**Process**:
1. Switches to Haiku with thinking off
2. Reads documentation files:
   - `/home/opc/hexhaven/README.md`
   - `/home/opc/hexhaven/PRD.md`
   - `/home/opc/hexhaven/specs/001-gloomhaven-multiplayer/spec.md`
   - `/home/opc/hexhaven/specs/002-postgres-user-db/spec.md`
3. Switches back to Sonnet with thinking on
4. Reports loaded context

**Usage**:
```bash
/context-load
```

**Note**: Auto-runs at session start/resume via hook

**Model**: Haiku with thinking off

---

## Specialized Agents

Claude Code includes specialized agents for complex, multi-step tasks.

### General-Purpose Agent

**Type**: `general-purpose`

**Purpose**: Complex tasks, code search, multi-step operations

**Tools Available**: All tools (Read, Write, Edit, Bash, Grep, Glob, etc.)

**Best for**:
- Searching across large codebases
- Multi-step refactoring
- Complex investigations

**Usage** (automatic via Task tool):
```
When you need to search for patterns across many files
When task requires multiple exploration rounds
```

---

### Explore Agent

**Type**: `Explore`

**Purpose**: Fast codebase exploration and search

**Tools Available**: All tools

**Thoroughness Levels**:
- `quick` - Basic searches
- `medium` - Moderate exploration
- `very thorough` - Comprehensive analysis

**Best for**:
- Finding files by patterns
- Searching code for keywords
- Understanding codebase structure
- Answering "how does X work?" questions

**Usage** (automatic via Task tool):
```
"Where are errors from the client handled?"
"What is the codebase structure?"
"How do API endpoints work?"
```

---

### Plan Agent

**Type**: `Plan`

**Purpose**: Software architecture and implementation planning

**Tools Available**: All tools

**Best for**:
- Designing implementation strategies
- Creating step-by-step plans
- Identifying critical files
- Evaluating architectural trade-offs

**Usage** (automatic via Task tool):
```
When task requires planning before implementation
When architectural decisions needed
When multiple approaches exist
```

---

### Claude Code Guide Agent

**Type**: `claude-code-guide`

**Purpose**: Answer questions about Claude Code features and usage

**Tools Available**: Glob, Grep, Read, WebFetch, WebSearch

**Best for**:
- Questions about Claude Code features
- How to use specific features (hooks, commands, MCP)
- Claude Agent SDK architecture
- Development questions

**Usage** (automatic via Task tool):
```
"Can Claude Code do X?"
"How do I write a slash command?"
"How do hooks work?"
```

---

## Hooks & Automation

### Session Start Hooks

**Configured in**: `.claude/settings.local.json`

**Events**:
- `startup` - New session starts
- `resume` - Session resumes

**Current Hook**: `/context-load`
- Runs automatically at session start/resume
- Loads README, PRD, and all spec files
- Uses Haiku for efficiency

**Configuration**:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "/context-load"
          }
        ]
      }
    ]
  }
}
```

---

### Pre-Commit Hooks

**Configured in**: `.claude/settings.local.json`

**Event**: Before any `git commit` command

**Current Hook**: Visual smoke tests
- Runs `/visual smoke` before commit
- Checks for bugs in `frontend/tests/bugs.md`
- If bugs found:
  - STOPS commit
  - Fixes bugs
  - Re-runs tests
  - Only proceeds after all tests pass

**Configuration**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(git commit*)",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "CRITICAL: Before committing, run `/visual smoke`..."
          }
        ]
      }
    ]
  }
}
```

**Ensures**:
- No broken code gets committed
- Visual tests always pass
- Quality gate before commits

---

## Development Workflow Example

### Creating a New Feature

```bash
# 1. Specify the feature
/speckit.specify Add real-time notifications for game events

# 2. Clarify if needed
/speckit.clarify

# 3. Generate implementation plan
/speckit.plan

# 4. Generate task list
/speckit.tasks

# 5. Implement tasks
/speckit.implement

# 6. Run visual tests
/visual smoke

# 7. Commit (triggers pre-commit hook with auto-testing)
git add .
git commit -m "feat: add real-time notifications"

# 8. Create pull request
gh pr create --title "Add real-time notifications" --body "..."
```

---

## Quick Reference

### Most Used Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/servers` | Start/restart servers | Before testing, when servers down |
| `/visual smoke` | Run smoke tests | Before commits, after changes |
| `/min <cmd>` | Quick execution | Simple, fast tasks |
| `/speckit.specify` | Create spec | Starting new feature |
| `/speckit.plan` | Generate plan | After spec approved |
| `/speckit.tasks` | Generate tasks | After plan complete |
| `/speckit.implement` | Execute tasks | Ready to implement |

### When to Use Which Agent

| Need | Agent | How |
|------|-------|-----|
| Search codebase | Explore | Automatic (via Task tool) |
| Multi-step task | General-Purpose | Automatic (via Task tool) |
| Plan implementation | Plan | Automatic (via Task tool) |
| Claude Code help | Claude Code Guide | Automatic (via Task tool) |

---

## File Locations

### Command Definitions
- `.claude/commands/*.md` - Project-level commands
- `frontend/.claude/commands/*.md` - Frontend-specific commands

### Configuration
- `.claude/settings.local.json` - Project settings & hooks (not committed)

### Generated Artifacts
- `specs/NNN-feature/` - Feature specifications
- `frontend/public/test-videos/` - Visual test screenshots
- `frontend/tests/bugs.md` - Bug tracking

### Logs
- `/tmp/hexhaven-backend.log` - Backend server logs
- `/tmp/hexhaven-frontend.log` - Frontend server logs
- `/tmp/hexhaven-startup.log` - Startup script logs

---

## Best Practices

### Slash Commands
1. Use `/servers` before visual testing to ensure servers are up
2. Run `/visual smoke` before committing (auto-enforced by hook)
3. Use `/min` for quick, simple tasks to save time
4. Follow SpecKit workflow in order: specify → plan → tasks → implement

### Visual Testing
1. Screenshots auto-expire after 5 days
2. Check bugs.md after failed tests
3. Use `smoke` for quick validation, `full` for comprehensive testing
4. Gallery available at http://localhost:5173/test-videos

### Feature Development
1. Always start with `/speckit.specify`
2. Use `/speckit.clarify` if requirements unclear
3. Review plan.md before generating tasks
4. Implement user stories in priority order (P1, P2, P3)
5. Run `/speckit.analyze` to check consistency

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0
