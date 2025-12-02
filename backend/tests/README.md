# Hexhaven Backend Testing Guide

## Overview

This testing suite ensures code quality, security, and performance for the Hexhaven multiplayer game backend. Tests are organized into unit tests, integration tests, and contract tests.

## Test Types

### Unit Tests (`tests/unit/`)

Test individual functions, services, and middleware in isolation with mocked dependencies.

**Coverage Requirements**: 80%+ code coverage

**Examples**:
- `error-handler.test.ts` - Error middleware validation
- `auth.service.test.ts` - Authentication logic
- `character.service.test.ts` - Character management

### Integration Tests (`tests/integration/`)

Test database operations, service interactions, and full workflows with real database connections.

**Test Database**: Uses separate `hexhaven_test` database, reset before each test suite.

**Examples**:
- `auth.integration.test.ts` - Full registration/login flow
- `character-concurrency.test.ts` - Concurrent XP updates
- `game-event-concurrency.test.ts` - Race condition handling

### Contract Tests (`tests/contract/`)

Validate API endpoint contracts (request/response formats, status codes, headers).

**Examples**:
- `auth.contract.test.ts` - POST /api/auth/register, /api/auth/login
- `characters.contract.test.ts` - Character CRUD endpoints
- `games.contract.test.ts` - Game management endpoints

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
npm test -- error-handler.test.ts

# Run tests matching pattern
npm test -- auth

# Run only integration tests
npm test -- integration

# Debug tests
npm run test:debug
```

## Responsive Design Testing Checklist

**Viewport Sizes**:
- Mobile: 375px width (iPhone SE)
- Tablet: 768px width (iPad)
- Desktop: 1920px width (Full HD)

**Browser Compatibility Matrix**:
Test on latest 2 versions of:
- ✅ Chrome/Chromium (including Edge)
- ✅ Firefox
- ✅ Safari (macOS and iOS)
- ✅ Edge (Chromium-based)

**Testing Approach**:
1. Use Playwright for E2E tests with viewport configuration
2. Verify touch targets ≥44px on mobile (WCAG 2.1 AA)
3. Test horizontal scrolling prevention
4. Validate form inputs and buttons at all sizes
5. Check game board rendering and controls

**Playwright Viewport Configuration**:
```typescript
// In E2E test setup
const { test, expect } = require('@playwright/test');

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('renders login form', async ({ page }) => {
    await page.goto('/login');
    // ... assertions
  });
});

test.describe('Tablet viewport', () => {
  test.use({ viewport: { width: 768, height: 1024 } });
  // ... tests
});

test.describe('Desktop viewport', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  // ... tests
});
```

## Accessibility Testing Checklist (WCAG 2.1 AA)

### Keyboard Navigation

All interactive elements must be keyboard accessible:
- **Tab**: Move focus forward
- **Shift+Tab**: Move focus backward
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and dropdowns
- **Arrow Keys**: Navigate within components (dropdowns, tabs, game hex grid)

### ARIA Labels

Required for all interactive elements without visible text:
```typescript
// Good examples
<button aria-label="Close dialog">×</button>
<input type="text" aria-label="Character name" />
<div role="alert" aria-live="polite">Game started!</div>
```

### Color Contrast

Minimum contrast ratios (WCAG 2.1 AA):
- **Text**: 4.5:1 against background
- **UI Components**: 3:1 against adjacent colors
- **Large text** (18pt+): 3:1 against background

Test with:
- Chrome DevTools Lighthouse
- axe DevTools browser extension
- Contrast checker: https://webaim.org/resources/contrastchecker/

### Screen Reader Compatibility

Test with:
- **NVDA** (Windows, free)
- **JAWS** (Windows, commercial)
- **VoiceOver** (macOS/iOS, built-in)
- **TalkBack** (Android, built-in)

**Critical Flows to Test**:
1. Login/registration
2. Character creation
3. Game lobby join
4. Turn-based gameplay
5. Error message announcements

### Focus Management

- Visible focus indicators on all interactive elements
- Focus trap in modals (focus stays within dialog)
- Focus restoration (return focus to trigger element after closing modal)
- Skip navigation links for keyboard users

**Example Focus Test**:
```typescript
test('modal traps focus', async () => {
  // Open modal
  await page.click('[data-testid="open-modal"]');

  // Tab through all focusable elements
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  // Focus should loop back to first element
  const focused = await page.evaluate(() => document.activeElement?.id);
  expect(focused).toBe('modal-first-button');
});
```

## Performance Testing

### Benchmarking Targets

- Authentication: <50ms (P95)
- Character retrieval: <50ms
- Game state queries: <100ms (4 players + 20 monsters)
- Password hashing: <200ms (bcrypt with 12 rounds)

### Running Benchmarks

```bash
# Run all performance benchmarks
npm run test:perf

# Run specific benchmark
npm run test:perf -- auth.bench.ts

# Generate performance report
npm run test:perf -- --json > performance-report.json
```

### Benchmark Example

```typescript
import Benchmark from 'benchmark';

const suite = new Benchmark.Suite();

suite
  .add('AuthService#register', async () => {
    await authService.register({ username: 'testuser', password: 'password123' });
  })
  .add('AuthService#login', async () => {
    await authService.login({ username: 'testuser', password: 'password123' });
  })
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
```

## Test Database Setup

Integration tests use a separate test database that is reset before each test suite.

**Configuration** (`.env.test`):
```bash
DATABASE_URL="postgresql://hexhaven:password@localhost:5432/hexhaven_test"
```

**Automatic Reset**:
Tests automatically:
1. Drop and recreate test database
2. Run all migrations
3. Seed minimal test data
4. Clean up after each test

**Manual Reset**:
```bash
npm run prisma:migrate:reset -- --force
```

## Writing Tests

### Test Structure (AAA Pattern)

```typescript
describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      // Arrange
      const userData = { username: 'newuser', password: 'securepassword123' };

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result.user.username).toBe('newuser');
      expect(result.user.passwordHash).not.toBe('securepassword123');
      expect(result.accessToken).toBeDefined();
    });
  });
});
```

### Mocking Prisma Client

```typescript
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

// In test
prismaMock.user.create.mockResolvedValue({
  id: '123',
  username: 'testuser',
  // ... other fields
});
```

### Testing Async Code

```typescript
it('should handle async errors', async () => {
  await expect(authService.login({ username: 'nonexistent', password: 'wrong' }))
    .rejects
    .toThrow(AuthError);
});
```

## CI/CD Integration

Tests run automatically on:
- Every pull request
- Every push to main
- Scheduled daily runs

**GitHub Actions Configuration**:
```yaml
- name: Run tests
  run: |
    npm test
    npm run test:cov

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Test Coverage Goals

- **Overall**: 80%+
- **Critical paths** (auth, game state): 95%+
- **Services**: 85%+
- **Middleware**: 90%+
- **Routes**: 80%+

View coverage report:
```bash
npm run test:cov
open coverage/lcov-report/index.html
```

## Troubleshooting

### Tests Timeout

Increase timeout for slow operations:
```typescript
it('should complete slow operation', async () => {
  // ... test
}, 10000); // 10 second timeout
```

### Database Connection Issues

Ensure PostgreSQL is running and test database exists:
```bash
psql -U hexhaven -c "CREATE DATABASE hexhaven_test;"
```

### Port Already in Use

Kill process using test port:
```bash
lsof -ti:3001 | xargs kill -9
```

## Best Practices

1. ✅ **Isolate tests** - Each test should be independent
2. ✅ **Use descriptive names** - Test names should explain what they verify
3. ✅ **Test edge cases** - Boundary values, null, empty, very large inputs
4. ✅ **Mock external dependencies** - Don't hit real external APIs in tests
5. ✅ **Clean up after tests** - Delete test data, close connections
6. ✅ **Keep tests fast** - Unit tests <100ms, integration tests <1s
7. ✅ **Test error paths** - Verify error handling, not just happy paths
8. ✅ **Use factories** - Create test data with factories for consistency

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Testing](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe Accessibility Testing](https://www.deque.com/axe/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing/unit-testing)
