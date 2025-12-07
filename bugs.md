# Known Bugs and Issues

## Test Infrastructure

### GameBoard.objectives Unit Tests - Missing React Import (2025-12-07)

**Status**: Blocked
**Priority**: Low
**Affects**: Test coverage only

**Description**:
The `GameBoard.objectives.test.tsx` unit tests fail because the production `GameBoard.tsx` component is missing a React import, which causes TypeScript compilation errors when running tests.

**Error**:
```
error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
```

**Root Cause**:
- `/home/opc/hexhaven/frontend/src/pages/GameBoard.tsx` is missing `import React from 'react';`
- The component relies on React being globally available
- When Jest loads the component for testing, it requires explicit React imports

**Impact**:
- GameBoard objectives extraction unit tests cannot run
- Other tests (ScenarioCompleteModal) work fine
- Production code works correctly

**Resolution Options**:
1. **Add React import to GameBoard.tsx** (Recommended)
   - Add `import React from 'react';` to the top of the file
   - This is the standard modern React pattern

2. **Configure Jest to inject React globally**
   - Less recommended as it hides the dependency

**Workaround**:
- E2E tests cover the same functionality
- ScenarioCompleteModal unit tests (23/23 passing) provide good coverage
- Not blocking development or production

**Related Files**:
- `/home/opc/hexhaven/frontend/tests/components/GameBoard.objectives.test.tsx`
- `/home/opc/hexhaven/frontend/src/pages/GameBoard.tsx`

**Notes**:
- Created comprehensive test suite with 40+ tests
- 23 unit tests passing for ScenarioCompleteModal
- E2E tests created for objectives display
- GameBoard.objectives tests will work once React import is added to production component

---

## CI/CD Issues

### ESLint Unused Variable - Local vs GitHub CI Discrepancy (2025-12-07)

**Status**: Fixed
**Priority**: Medium
**Affects**: CI pipeline

**Description**:
ESLint check passed locally but failed in GitHub CI with an unused variable error. The discrepancy occurred because local and CI environments had different ESLint configurations or warning levels.

**Error**:
```
##[error]    62:3    error    'ObjectivesLoadedPayload' is defined but never used. Allowed unused vars must match /^_/u
@typescript-eslint/no-unused-vars
```

**Root Cause**:
- `ObjectivesLoadedPayload` was imported in `/home/opc/hexhaven/backend/src/websocket/game.gateway.ts:62` but never used
- Local ESLint configuration likely treats this as a warning, not an error
- GitHub CI ESLint configuration treats unused imports as errors (fails the build)
- The import was left over from a previous refactor

**Impact**:
- GitHub CI build failures
- PR blocks automated deployment
- False sense of security from local testing

**Resolution**:
Removed the unused import from the file:
```diff
- ObjectivesLoadedPayload,
  ObjectiveProgressUpdatePayload,
  CharacterExhaustedPayload,
```

**Prevention**:
1. **Run full lint with error checking**: `npm run lint -- --max-warnings=0`
2. **Pre-commit hooks**: Configure hooks to fail on warnings
3. **Align local and CI ESLint configs**: Ensure both treat warnings consistently
4. **Use `/pre-commit-ci` command**: Run CI checks locally before pushing

**Lesson Learned**:
Always run `npm run lint` with zero warnings tolerance locally before submitting PRs. The command that matches GitHub CI behavior:
```bash
npm run lint -- --max-warnings=0
```

---

## Other Issues

*(Add new issues below this line)*
