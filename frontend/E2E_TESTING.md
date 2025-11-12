# E2E Testing Guide for Hexhaven

This guide explains how to run end-to-end (E2E) tests in different environments, from local development to CI/CD pipelines.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment-Specific Guides](#environment-specific-guides)
- [Test Execution Strategies](#test-execution-strategies)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# Install dependencies (first time only)
cd frontend
npm install

# Run E2E tests
npm run test:e2e
```

## Environment-Specific Guides

### 1. GitHub Actions (Ubuntu - Recommended for CI/CD)

**Status:** ✅ Fully Supported

The E2E tests run automatically on every PR and push to main/master branches.

**Configuration:**
- Runner: `ubuntu-latest`
- Browser: Chromium (headless)
- Database: PostgreSQL 14 (service container)
- Node: v20

**How it works:**
```yaml
# .github/workflows/ci.yml already configured
- Install Playwright with system dependencies:
  `npx playwright install chromium --with-deps`
- Tests run in headless mode (CI=true)
- Results uploaded as artifacts
- Must pass for PR merge
```

**Viewing Results:**
1. Go to GitHub Actions tab
2. Click on your workflow run
3. Download "playwright-report" artifact
4. Open `index.html` locally

### 2. Docker Container (Any OS)

**Status:** ✅ Recommended for consistency

Run tests in a Docker container to match the CI environment exactly.

**Setup:**

```bash
# Create Dockerfile for E2E testing
cat > frontend/Dockerfile.e2e << 'EOF'
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd frontend && npm ci
RUN cd backend && npm ci

# Copy source code
COPY frontend ./frontend
COPY backend ./backend

# Build backend
RUN cd backend && npm run build

# Set working directory
WORKDIR /app/frontend

# Run tests
CMD ["npm", "run", "test:e2e"]
EOF
```

**Run tests:**

```bash
# Build the Docker image
docker build -f frontend/Dockerfile.e2e -t hexhaven-e2e .

# Run tests
docker run --rm \
  -e CI=true \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/hexhaven_test \
  hexhaven-e2e

# Or with docker-compose
cat > docker-compose.e2e.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: hexhaven_test
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

  e2e-tests:
    build:
      context: .
      dockerfile: frontend/Dockerfile.e2e
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      CI: "true"
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/hexhaven_test
EOF

docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit
```

### 3. Local Development (Ubuntu/Debian)

**Status:** ✅ Fully Supported

**Prerequisites:**
```bash
# Install system dependencies
sudo npx playwright install-deps chromium

# Or manually
sudo apt-get install -y \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libatspi2.0-0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libasound2
```

**Run tests:**
```bash
cd frontend

# Run all tests (with UI)
npm run test:e2e

# Run in headless mode
CI=true npm run test:e2e

# Run specific test file
npm run test:e2e tests/e2e/us1-create-room.spec.ts

# Debug mode (opens browser)
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui
```

### 4. Local Development (macOS)

**Status:** ✅ Fully Supported

**Prerequisites:**
```bash
# No additional system dependencies needed!
# Playwright installs everything automatically
cd frontend
npx playwright install chromium
```

**Run tests:**
```bash
cd frontend

# Run all tests
npm run test:e2e

# Debug with browser UI
npx playwright test --debug

# Interactive UI mode
npx playwright test --ui
```

### 5. Local Development (Windows)

**Status:** ✅ Fully Supported

**Prerequisites:**
```powershell
# Install via PowerShell
cd frontend
npx playwright install chromium
```

**Run tests:**
```powershell
cd frontend

# Run all tests
npm run test:e2e

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

### 6. Oracle Linux / RHEL / CentOS / Fedora

**Status:** ⚠️ Partially Supported

**Challenge:** These distributions use `dnf`/`yum` instead of `apt`, and Playwright's automated dependency installation doesn't work.

**Option A: Use Docker (Recommended)**
Follow the [Docker Container](#2-docker-container-any-os) instructions above.

**Option B: Manual System Dependencies**
```bash
# Install required libraries
sudo dnf install -y \
  atk \
  at-spi2-atk \
  cups-libs \
  at-spi2-core \
  libXcomposite \
  libXdamage \
  libXfixes \
  libXrandr \
  mesa-libgbm \
  pango \
  alsa-lib

# Install Playwright browsers
cd frontend
npx playwright install chromium

# Try running tests
npm run test:e2e
```

**Option C: Remote Development Server**
If local tests don't work, rely on GitHub Actions:
```bash
# Make your changes
git add .
git commit -m "feat: add new feature"
git push

# Create PR - tests run automatically on GitHub
gh pr create --title "My Feature" --body "Description"

# Watch tests in GitHub Actions UI
```

### 7. ARM64 Architecture (Apple Silicon, Oracle Cloud ARM)

**Status:** ⚠️ Limited Support

**Current Status:**
- ✅ Browsers download successfully
- ❌ System dependencies may be missing
- ✅ GitHub Actions works (uses x86_64)

**Recommended Approach:**

```bash
# Option 1: Use Docker with platform specification
docker build --platform linux/amd64 -f frontend/Dockerfile.e2e -t hexhaven-e2e .
docker run --platform linux/amd64 --rm hexhaven-e2e

# Option 2: Run tests in GitHub Actions
# (Already configured, automatically uses x86_64 runners)
git push  # Tests run automatically

# Option 3: Use Rosetta 2 (macOS ARM only)
# This usually works automatically on Apple Silicon
cd frontend
npm run test:e2e
```

## Test Execution Strategies

### Development Workflow

**Fast Feedback Loop:**
```bash
# 1. Run specific test while developing
npx playwright test tests/e2e/us1-create-room.spec.ts

# 2. Use watch mode (requires additional setup)
npx playwright test --ui  # Interactive mode

# 3. Run only changed tests
git diff --name-only | grep .spec.ts | xargs npx playwright test
```

**Before Committing:**
```bash
# Run all tests in headless mode
CI=true npm run test:e2e

# Or use the full test suite
npm test && npm run lint && npm run test:e2e
```

### CI/CD Pipeline

The workflow is already configured in `.github/workflows/ci.yml`:

1. **Lint & Type Check** → Fast feedback
2. **Unit Tests** → Component-level validation
3. **Build** → Ensure compilation succeeds
4. **E2E Tests** → Full integration testing
5. **Quality Gates** → All must pass for merge

**Controlling E2E Test Execution:**

```yaml
# Skip E2E tests for documentation-only changes
on:
  pull_request:
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

### Production Deployment

E2E tests are NOT run on production deployments (they're for pre-merge validation only).

## Troubleshooting

### Issue: "Executable doesn't exist" Error

**Symptom:**
```
Error: browserType.launch: Executable doesn't exist at .../chromium.../chrome
```

**Solution:**
```bash
cd frontend
npx playwright install chromium
```

### Issue: "Host system is missing dependencies"

**Symptom:**
```
Host system is missing dependencies to run browsers.
Please install them with: sudo npx playwright install-deps
```

**Solution for Ubuntu/Debian:**
```bash
cd frontend
sudo npx playwright install-deps chromium
```

**Solution for Other Systems:**
Use Docker (see section above) or refer to environment-specific guide.

### Issue: Tests Timeout

**Symptom:**
```
Timeout of 10000ms exceeded
```

**Solution:**
```bash
# Increase timeouts in playwright.config.ts
timeout: 30 * 1000,  # 30 seconds
expect: {
  timeout: 10 * 1000  # 10 seconds
}

# Or run with increased timeout
npx playwright test --timeout=30000
```

### Issue: WebSocket Connection Failures

**Symptom:**
```
WebSocket connection failed: Error: connect ECONNREFUSED
```

**Solution:**
```bash
# Ensure backend is built
cd ../backend && npm run build

# Check if ports are free
lsof -i :3000  # Backend
lsof -i :5173  # Frontend

# Kill any existing processes
kill -9 <PID>

# Run tests again
cd ../frontend && npm run test:e2e
```

### Issue: Database Connection Errors

**Symptom:**
```
Error: Can't reach database server
```

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL if needed
sudo systemctl start postgresql

# Create test database
createdb hexhaven_test

# Set DATABASE_URL
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hexhaven_test

# Run migrations
cd backend && npx prisma migrate deploy
```

### Issue: Flaky Tests

**Symptoms:**
- Tests pass locally but fail in CI
- Tests fail intermittently

**Solutions:**

1. **Wait for network requests:**
```typescript
// Bad
await page.click('button');
const text = await page.textContent('.result');

// Good
await page.click('button');
await page.waitForLoadState('networkidle');
const text = await page.textContent('.result');
```

2. **Use proper assertions:**
```typescript
// Bad
await page.click('button');
await page.waitForTimeout(1000);

// Good
await page.click('button');
await expect(page.locator('.result')).toBeVisible();
```

3. **Disable animations in tests:**
```typescript
// In test setup
await page.addStyleTag({
  content: '*, *::before, *::after { transition: none !important; animation: none !important; }'
});
```

### Issue: ARM64 Compatibility

**Symptom:**
```
BEWARE: your OS is not officially supported by Playwright
```

**Solution:**
Use Docker with platform specification:
```bash
docker build --platform linux/amd64 -f frontend/Dockerfile.e2e -t hexhaven-e2e .
```

Or rely on GitHub Actions (which uses x86_64 by default).

## Best Practices

1. **Always use test IDs** for stable selectors:
   ```typescript
   // Good
   await page.locator('[data-testid="room-code"]').click();

   // Avoid
   await page.locator('.room-code-display > span').click();
   ```

2. **Run tests locally before pushing:**
   ```bash
   npm run lint && npm test && npm run test:e2e
   ```

3. **Use Docker for consistency:**
   - Matches CI environment exactly
   - Avoids "works on my machine" issues

4. **Keep tests fast:**
   - Current timeout: 10 seconds per test
   - Target: < 5 seconds per test
   - Use `test.skip()` for slow/broken tests temporarily

5. **Monitor test reports:**
   - Check GitHub Actions artifacts
   - Review video recordings for failures
   - Analyze screenshots

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com)
- [Project CI Configuration](.github/workflows/ci.yml)
- [Playwright Config](playwright.config.ts)

## Support

If you encounter issues not covered in this guide:

1. Check GitHub Actions logs for your PR
2. Review Playwright reports in workflow artifacts
3. Ask in team chat with:
   - Your OS and architecture
   - Error message
   - Steps to reproduce
   - Screenshot of terminal output
