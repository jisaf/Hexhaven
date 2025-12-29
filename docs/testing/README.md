# Testing Documentation

Complete testing guides, reports, and best practices for Hexhaven.

## Testing Overview

Hexhaven uses multiple testing strategies to ensure quality:
- **Unit Tests** - Jest for backend logic and frontend components
- **Integration Tests** - Backend service and database interaction tests
- **Contract Tests** - WebSocket event schema validation
- **E2E Tests** - Playwright for full user story flows
- **Visual Regression Tests** - Screenshot-based UI testing
- **Manual QA** - Structured test plans for new features

---

## Quick Links

### Testing Guides
- [Visual Testing Guide](./VISUAL-TESTING-GUIDE.md) - Playwright MCP visual regression testing
- [E2E Testing Guide for LLM Agents](../E2E_TESTING_GUIDE_FOR_LLM_AGENTS.md) - AI agent testing patterns
- [Frontend Testing README](../../frontend/tests/TESTING.md) - Frontend test patterns
- [Backend Testing README](../../backend/tests/README.md) - Backend test setup

### Test Reports
- [Test Report Index](./TEST_REPORT_INDEX.md) - All test execution reports
- [Visual Test Summary](./VISUAL_TEST_SUMMARY.md) - Visual regression test results
- [Smoke Test Report](./SMOKE_TEST_REPORT.md) - Latest smoke test execution
- [Comprehensive Test Report](./COMPREHENSIVE_TEST_REPORT.md) - Full test suite results

### Quality Reports
- [Quality Report](../quality/QUALITY_REPORT.md) - Code quality metrics
- [Code Quality Reports](../quality/README.md) - All quality assessments

---

## Test Coverage by Component

### Frontend Tests
Location: `/frontend/tests/`

**Unit Tests**
- Component tests (Jest + React Testing Library)
- Hook tests
- Utility function tests
- Coverage target: 80%+

**E2E Tests**
- User story flows (Playwright)
- Cross-browser testing
- Mobile viewport testing
- Screenshot regression

**Test Organization**
```
frontend/tests/
├── unit/              # Unit tests
├── e2e/               # End-to-end tests
├── helpers/           # Test utilities
├── page-objects/      # Page Object Model
└── docs/              # Testing documentation
```

### Backend Tests
Location: `/backend/tests/`

**Unit Tests**
- Service logic tests
- Model validation tests
- Utility function tests
- Coverage target: 80%+

**Integration Tests**
- Database interaction tests
- Service integration tests
- Prisma ORM tests

**Contract Tests**
- WebSocket event validation
- API endpoint contracts
- Type safety validation

**Test Organization**
```
backend/tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── contract/          # Contract tests
└── README.md          # Backend testing guide
```

---

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend

# Run E2E tests
cd frontend && npm run test:e2e

# Run visual tests (smoke)
/visual smoke

# Run visual tests (full)
/visual full

# Test with coverage
npm test -- --coverage

# Test specific file
npm test -- path/to/test.test.ts
```

### CI/CD Testing

Tests run automatically on:
- Pull request creation
- Commits to feature branches
- Merges to main branch
- Manual workflow dispatch

**GitHub Actions Workflow**: `.github/workflows/test.yml`

---

## Writing Tests

### Test Patterns

**Unit Test Pattern**
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = setupTestData();

      // Act
      const result = methodName(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

**E2E Test Pattern**
```typescript
test('user can complete scenario', async ({ page }) => {
  // Navigate
  await page.goto('http://localhost:5173');

  // Interact
  await page.click('[data-testid="create-game"]');
  await page.fill('[data-testid="nickname"]', 'TestPlayer');
  await page.click('[data-testid="submit"]');

  // Assert
  await expect(page.locator('[data-testid="lobby"]')).toBeVisible();
});
```

### Test Data Management

**Shared Constants**
Use shared test data in `/tests/fixtures/`:
```typescript
export const TEST_USER = {
  id: 'test-user-uuid',
  nickname: 'TestPlayer',
};

export const TEST_SCENARIO = {
  id: 'test-scenario-uuid',
  name: 'Test Scenario',
};
```

**Database Seeding**
Backend tests use seeded data:
```bash
# Seed test database
cd backend
export DATABASE_URL="postgresql://..."
npx prisma db seed
```

---

## Test Maintenance

### When to Update Tests
- ✅ New feature added → Add tests
- ✅ Bug fixed → Add regression test
- ✅ Code refactored → Update tests
- ✅ API changed → Update contract tests
- ✅ UI changed → Update E2E/visual tests

### Test Review Checklist
- [ ] Tests are independent (no shared state)
- [ ] Tests are deterministic (no random data)
- [ ] Tests are fast (<1s per unit test)
- [ ] Test names describe behavior
- [ ] Assertions are specific and clear
- [ ] Test data is realistic
- [ ] Edge cases are covered
- [ ] Error paths are tested

### Debugging Failed Tests

**Local Debugging**
```bash
# Run single test with verbose output
npm test -- --verbose path/to/test.test.ts

# Debug E2E tests in headed mode
cd frontend
npx playwright test --headed --debug

# View E2E test trace
npx playwright show-trace trace.zip
```

**CI Debugging**
- Check GitHub Actions logs
- Download test artifacts
- Review screenshot diffs
- Check console output

---

## Visual Testing

### Playwright MCP Integration

Hexhaven uses Playwright MCP for visual regression testing:

**Test Modes**:
- `smoke` - 7-step definition of done (fast)
- `full` - 13-step comprehensive test (thorough)

**Screenshot Management**:
- Screenshots saved to `frontend/public/test-videos/`
- Auto-cleanup after 5 days
- Naming: `[branch]-[timestamp]-[mode]-[step]-[description].png`

**View Screenshots**: http://localhost:5173/test-videos

**Run Visual Tests**:
```bash
/visual smoke    # Quick smoke test
/visual full     # Comprehensive test
```

See [Visual Testing Guide](./VISUAL-TESTING-GUIDE.md) for complete documentation.

---

## Test Infrastructure

### Test Databases

**Development Database**
- Name: `hexhaven_dev`
- Port: 5432
- User: Configure in `backend/.env`

**Test Database**
- Name: `hexhaven_test`
- Port: 5432
- Isolated from dev data
- Reset before each test run

### Test Servers

E2E tests require running servers:
```bash
# Start servers for testing
/servers

# Or manually
npm run dev:backend &
npm run dev:frontend &
```

### Mocking & Stubbing

**Frontend Mocks**
- WebSocket: Jest mocks in `__mocks__/socket.io-client.ts`
- API calls: MSW (Mock Service Worker)
- Services: Manual mocks in `__mocks__/`

**Backend Mocks**
- Database: In-memory Prisma client
- External APIs: Nock for HTTP mocking
- Time: `jest.useFakeTimers()`

---

## Performance Testing

### Load Testing
Not yet implemented. Planned tools:
- k6 for load testing
- Artillery for stress testing
- Lighthouse for frontend performance

### Benchmarking
Performance baselines:
- Frontend load: <2s
- API response: <200ms
- WebSocket latency: <100ms
- Monster AI: <500ms

---

## Related Documentation

- [Test Plan](../test-plan.md) - Overall testing strategy
- [Frontend Testing](../../frontend/tests/TESTING.md) - Frontend-specific patterns
- [Backend Testing](../../backend/tests/README.md) - Backend-specific patterns
- [Visual Testing Guide](./VISUAL-TESTING-GUIDE.md) - Visual regression testing
- [E2E Guide for LLM Agents](../E2E_TESTING_GUIDE_FOR_LLM_AGENTS.md) - AI agent testing

---

**Last Updated**: 2025-12-29
**Maintained By**: QA Team
**Version**: 1.0.0
