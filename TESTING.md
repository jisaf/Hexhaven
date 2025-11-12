# Testing Guide for Hexhaven

Quick reference for running tests in the Hexhaven project.

## Quick Commands

### All Tests (Pre-commit Check)
```bash
# Run linting, unit tests, and type checking
npm run lint && npm test && npm run build
```

### Unit Tests
```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# With coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### E2E Tests

```bash
# Run all E2E tests (headless)
cd frontend && npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# Interactive UI mode
npm run test:e2e:ui

# Run specific test file
npm run test:e2e tests/e2e/us1-create-room.spec.ts

# View test report
npm run test:e2e:report
```

## Environment Setup

### First Time Setup

**Ubuntu/Debian:**
```bash
cd frontend
npm install
sudo npx playwright install-deps chromium
npx playwright install chromium
```

**macOS/Windows:**
```bash
cd frontend
npm install
npx playwright install chromium
```

**Oracle Linux/RHEL/Other:**
Use Docker (see detailed guide below) or run tests in GitHub Actions.

### Docker (Universal - Recommended)

```bash
# Quick Docker test run
docker run --rm -v $(pwd):/app -w /app/frontend \
  mcr.microsoft.com/playwright:v1.56.1-jammy \
  sh -c "npm ci && npm run test:e2e"
```

For full Docker setup, see [frontend/E2E_TESTING.md](frontend/E2E_TESTING.md).

## CI/CD Pipeline

Tests run automatically on:
- ✅ Every pull request
- ✅ Pushes to main/master branches

**Pipeline stages:**
1. Lint (backend + frontend)
2. Type check (backend + frontend)
3. Unit tests (backend + frontend)
4. Build (backend + frontend)
5. **E2E tests** (Playwright)
6. Quality gates (all must pass)

**View results:**
- GitHub → Actions tab
- Click on workflow run
- Download artifacts for detailed reports

## Detailed Documentation

For comprehensive E2E testing guide including:
- Environment-specific setup instructions
- Docker configuration
- Troubleshooting guide
- Best practices

See: **[frontend/E2E_TESTING.md](frontend/E2E_TESTING.md)**

## Test Structure

```
frontend/tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── us1-*.spec.ts      # User Story 1 tests
│   ├── us2-*.spec.ts      # User Story 2 tests
│   └── us3-*.spec.ts      # User Story 3 tests
└── unit/                   # Unit tests (Jest)
    └── *.test.ts

backend/tests/
├── unit/                   # Unit tests
└── integration/            # Integration tests
```

## Test Coverage

### Current Coverage Goals
- Unit tests: > 80% coverage
- E2E tests: Critical user flows
- Integration tests: API endpoints

### View Coverage Reports

**Unit Tests:**
```bash
# Backend
cd backend && npm test -- --coverage
open coverage/lcov-report/index.html

# Frontend
cd frontend && npm test -- --coverage
open coverage/lcov-report/index.html
```

**E2E Tests:**
```bash
cd frontend
npm run test:e2e
npm run test:e2e:report  # Opens HTML report
```

## Common Issues

### "Executable doesn't exist"
```bash
cd frontend && npx playwright install chromium
```

### "Missing dependencies"
```bash
# Ubuntu/Debian
sudo npx playwright install-deps chromium

# Others: Use Docker
```

### Tests timeout
```bash
# Increase timeout temporarily
npx playwright test --timeout=30000
```

### Port already in use
```bash
# Check what's using ports 3000, 5173
lsof -i :3000
lsof -i :5173

# Kill processes if needed
kill -9 <PID>
```

## Development Workflow

### Before Committing
```bash
# Run full test suite
npm run lint && npm test && npm run test:e2e
```

### Before Creating PR
```bash
# Ensure everything passes
cd backend && npm test && npm run build
cd ../frontend && npm test && npm run build && npm run test:e2e
```

### During PR Review
- Tests run automatically in GitHub Actions
- All tests must pass before merge
- Review test reports in PR checks

## Writing Tests

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');

    // Use data-testid for stable selectors
    await page.locator('[data-testid="button"]').click();

    // Wait for expected result
    await expect(page.locator('[data-testid="result"]'))
      .toBeVisible();
  });
});
```

### Adding Test IDs to Components
```typescript
// Always add data-testid to interactive elements
<button data-testid="create-room-button">
  Create Room
</button>

<div data-testid="room-code">
  {roomCode}
</div>
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Jest Documentation](https://jestjs.io)
- [Project CI Configuration](.github/workflows/ci.yml)
- [Detailed E2E Guide](frontend/E2E_TESTING.md)

## Getting Help

1. Check [E2E_TESTING.md](frontend/E2E_TESTING.md) for detailed troubleshooting
2. Review GitHub Actions logs in your PR
3. Ask in team chat with:
   - OS and architecture
   - Error message
   - Steps to reproduce
