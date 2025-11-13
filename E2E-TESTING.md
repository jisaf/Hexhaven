# E2E Testing Guide

This document describes how to run end-to-end (E2E) tests for Hexhaven using Playwright.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Running Tests Locally](#running-tests-locally)
- [Docker Testing](#docker-testing)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)
- [Known Issues](#known-issues)

## Overview

Hexhaven uses Playwright for E2E testing with support for:

- **Mobile-first testing** on Pixel 6 device profile
- **Headless browser testing** on Oracle Linux and CI environments
- **Docker-based testing** for consistent environments across platforms
- **Multi-architecture support** for amd64 (x86_64) and arm64 (Apple Silicon)

## Prerequisites

### Local Testing (Without Docker)

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Build backend
npm run build:backend
```

### Docker Testing

```bash
# Install Docker and Docker Compose
# See: https://docs.docker.com/get-docker/

# Ensure Docker Buildx is available (for multi-platform builds)
docker buildx version
```

## Running Tests Locally

### Quick Start

```bash
# Run all E2E tests
npm run test:e2e -w frontend

# Run specific test file
npx playwright test tests/e2e/us1-create-room.spec.ts -w frontend

# Run in headed mode (with browser UI)
npx playwright test --headed -w frontend

# Run in debug mode
npx playwright test --debug -w frontend
```

### Configuration

Playwright configuration is in `frontend/playwright.config.ts`:

- **Test directory**: `frontend/tests/e2e/`
- **Base URL**: `http://localhost:5173` (configurable via `VITE_URL`)
- **Browser**: Chromium (optimized for headless Linux)
- **Device**: Pixel 6 mobile profile
- **Timeout**: 10 seconds per test
- **Parallelization**: Disabled in CI (workers=1), enabled locally

### Launch Options

The configuration includes special launch arguments for headless environments:

```typescript
launchOptions: {
  args: [
    '--disable-dev-shm-usage',        // Overcome limited resources in containers
    '--no-sandbox',                    // Required for restricted environments
    '--disable-gpu',                   // Not needed in headless mode
    '--disable-webgl',                 // Disable WebGL (prevents PixiJS crashes)
    '--use-gl=swiftshader',           // Use software rendering
  ],
}
```

## Docker Testing

Docker provides a consistent testing environment across all platforms and eliminates browser/dependency installation issues.

### Architecture

The Docker setup includes three services:

1. **backend**: NestJS backend API (port 3000)
2. **frontend**: Vite dev server (port 5173)
3. **e2e-tests**: Playwright test runner

All services use the same Docker image built from `Dockerfile.e2e`, which is based on `mcr.microsoft.com/playwright:v1.40.0-jammy` with browsers pre-installed.

### Quick Start with Docker

```bash
# Build and run tests (all-in-one)
./scripts/e2e-docker-run.sh --build

# Or run step-by-step:

# 1. Build Docker image
./scripts/e2e-docker-build.sh

# 2. Run tests
./scripts/e2e-docker-run.sh

# 3. Clean up resources
./scripts/e2e-docker-clean.sh
```

### Script Options

**`e2e-docker-run.sh`**:
- `--build`: Build image before running tests
- `--no-cache`: Build without using cache (clean build)

Example:
```bash
# Clean build and run tests
./scripts/e2e-docker-run.sh --build --no-cache
```

### Manual Docker Commands

```bash
# Build image
docker build -f Dockerfile.e2e -t hexhaven-e2e:latest .

# Run with Docker Compose
docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit

# Clean up
docker-compose -f docker-compose.e2e.yml down -v
```

### Multi-Architecture Support

The Dockerfile supports both amd64 (x86_64) and arm64 (Apple Silicon):

```bash
# Build for specific platform
docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile.e2e \
  -t hexhaven-e2e:latest \
  .

# Or for ARM64
docker buildx build \
  --platform linux/arm64 \
  -f Dockerfile.e2e \
  -t hexhaven-e2e:latest \
  .
```

The `e2e-docker-build.sh` script automatically detects your platform and builds accordingly.

### Viewing Test Results

Test results are mounted as volumes and available on your host machine:

```bash
# JUnit XML report (for CI integration)
frontend/test-results/junit.xml

# HTML report (open in browser)
frontend/playwright-report/index.html

# View HTML report
npx playwright show-report frontend/playwright-report
```

## CI/CD Integration

### GitHub Actions

The repository includes `.github/workflows/e2e-tests.yml` with two testing strategies:

#### 1. Docker-based E2E Tests (`e2e-docker` job)

- Builds Docker image with layer caching
- Runs tests in Docker Compose environment
- Uploads test results and reports as artifacts
- Publishes JUnit test report to PR comments

**Benefits**:
- Consistent environment across runs
- Faster setup with cached layers
- Isolated from host system

#### 2. Local E2E Tests (`e2e-local` job)

- Installs Node.js and dependencies natively
- Installs Playwright browsers with system dependencies
- Runs tests directly on the runner

**Benefits**:
- Faster test execution
- Better for debugging
- Lower disk usage

### Triggering Workflows

```bash
# Automatically runs on:
# - Push to main branch
# - Pull requests to main branch

# Manual trigger:
# GitHub UI → Actions → E2E Tests → Run workflow
```

### Optimizations

1. **Caching**:
   - Docker layer cache (`/tmp/.buildx-cache`)
   - npm dependencies (`node_modules`)
   - Playwright browsers (`~/.cache/ms-playwright`)

2. **Concurrency**:
   - Cancels in-progress runs for the same branch
   - Prevents redundant test runs

3. **Fail-fast**:
   - 30-minute job timeout
   - Max 5 test failures before stopping (configured in `playwright.config.ts`)

## Troubleshooting

### Issue: Browser crashes in headless mode

**Symptom**: `page.goto: Target crashed` or `Page crashed`

**Cause**: PixiJS game engine tries to initialize WebGL, which is disabled in headless browsers.

**Solution**: The Playwright configuration includes `--disable-webgl` and `--use-gl=swiftshader` to prevent this. If issues persist, see `e2e-fix-tasks.md` for application-level fixes.

### Issue: Tests fail locally but pass in Docker

**Cause**: Different browser versions or system dependencies

**Solution**: Use Docker for testing to ensure consistency:
```bash
./scripts/e2e-docker-run.sh --build
```

### Issue: `ECONNREFUSED` errors

**Symptom**: Tests fail to connect to backend or frontend

**Cause**: Services not fully started before tests run

**Solution**: Docker Compose uses health checks to ensure services are ready:
```yaml
depends_on:
  backend:
    condition: service_healthy
```

For local testing, wait for services to start:
```bash
# Backend
cd backend && npm run start:prod

# Frontend (in another terminal)
cd frontend && npm run dev

# Wait for both to be ready, then run tests
```

### Issue: Port already in use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**: Kill existing processes or use Docker (which isolates ports):
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use Docker
./scripts/e2e-docker-run.sh
```

### Issue: Out of memory in Docker

**Symptom**: Container exits with code 137

**Solution**: Increase Docker memory limit:
```bash
# Docker Desktop: Settings → Resources → Memory → Increase to 4GB+
# Linux: Update /etc/docker/daemon.json
```

## Known Issues

### PixiJS WebGL Crashes (Documented)

**Status**: Workaround implemented in Playwright config

**Description**: The game uses PixiJS for rendering, which attempts WebGL initialization even in headless mode. This causes browser crashes when interacting with game screens.

**Current Fix**: Browser launch args disable WebGL and force software rendering.

**Permanent Fix**: See `e2e-fix-tasks.md` for application-level changes to detect headless mode and use Canvas2D renderer instead.

**Test Status**:
- ✅ Page loads successfully
- ❌ Button interactions crash browser (119/120 tests failing)

### 403 Forbidden Error

**Status**: Under investigation

**Description**: Browser console shows 403 error for an unknown resource during page load.

**Impact**: Likely non-blocking, but may affect some features.

**Next Steps**: See `e2e-fix-tasks.md` section 3 for diagnostic steps.

## Test Structure

### User Stories

Tests are organized by user story:

- **US1**: Basic room operations
  - `us1-create-room.spec.ts` - Create and join rooms
  - `us1-move-character.spec.ts` - Character movement
  - `us1-start-game.spec.ts` - Game initialization

- **US2**: Gameplay mechanics
  - `us2-attack.spec.ts` - Combat system
  - `us2-card-play.spec.ts` - Card interactions
  - `us2-elements.spec.ts` - Element system
  - `us2-loot.spec.ts` - Loot mechanics
  - `us2-monsters.spec.ts` - Monster AI
  - `us2-scenarios.spec.ts` - Scenario loading

- **US3**: Mobile interactions
  - `us3-touch.spec.ts` - Touch events
  - `us3-orientation.spec.ts` - Device rotation
  - `us3-gestures.spec.ts` - Swipe, pinch, zoom

### Debug Tests

- `debug-console.spec.ts` - Console error detection

## References

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Docker Guide](https://playwright.dev/docs/ci-intro)
- [Docker Multi-platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [PixiJS Renderer Options](https://pixijs.download/release/docs/PIXI.Application.html)

## Getting Help

For issues specific to this project:

1. Check `e2e-fix-tasks.md` for known application-level fixes
2. Review test output in `frontend/test-results/`
3. Check GitHub Actions logs for CI failures
4. Open an issue with:
   - Test command run
   - Full error message
   - `npx playwright --version`
   - Operating system and architecture
