---
description: Run CI test suite before commit
model: haiku
---

## Goal

Run the full GitHub CI test suite locally before committing to catch failures early.

## Execution Steps

### Step 1: Check Staged Files

```bash
git diff --cached --name-only
```

### Step 2: Determine Required Tests

**SKIP ALL TESTS** if changes are ONLY:
- *.md files (documentation)
- .claude/commands/*.md (slash commands)
- *.json config files (except package.json)
- .gitignore, .env files

If skipping: Output "✓ Skipping CI tests - documentation/config changes only" and exit successfully.

**RUN FULL CI SUITE** for any other changes:

### Step 3: Run Tests Based on Changed Files

Check which directories have changes:
- Backend changes: any file in `backend/` (excluding node_modules)
- Frontend changes: any file in `frontend/` (excluding node_modules)

#### Backend Tests (if backend/ files changed):

```bash
cd backend
npm run lint
npx tsc --noEmit
npm test
npm run build
cd ..
```

#### Frontend Tests (if frontend/ files changed):

```bash
cd frontend
npm run lint
npx tsc -b
npm test
npm run build
cd ..
```

#### Visual Tests (if UI/logic changed):

If changes include:
- `frontend/src/**/*.{ts,tsx,js,jsx}`
- `backend/src/**/*.{ts,js}`
- `*.css`, `*.scss`

Run `/visual smoke` and check `/home/opc/hexhaven/frontend/tests/bugs.md` for bugs.

### Step 4: Report Results

**If all tests pass:**
- Output: "✓ All CI tests passed - safe to commit"
- Exit successfully

**If any test fails:**
- Output: "✗ CI tests failed - fix issues before committing"
- List which tests failed
- Exit with error to block commit

## Important Notes

- This matches the exact CI pipeline from `.github/workflows/ci.yml`
- Tests run in the same order as GitHub CI
- Backend tests require Prisma generation (handled by npm ci)
- Visual tests are optional but recommended for UI changes

## Task

Run the appropriate CI tests based on staged files and report results.
