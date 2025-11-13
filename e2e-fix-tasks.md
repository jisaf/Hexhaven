# E2E Testing Application Fixes

## Current Status

**Test Results:** 1 passed, 119 failed
- ✅ Page loads successfully without crashes
- ❌ Browser crashes when interacting with UI elements (clicking buttons)
- ⚠️ 403 Forbidden error for unknown resource during page load

## Root Cause

The application uses **PixiJS** for game rendering, which attempts to initialize WebGL contexts even in headless browser environments where WebGL is disabled. When users click buttons that navigate to game screens, PixiJS tries to create a WebGL renderer, causing the browser to crash.

## Required Application Fixes

### 1. Headless Environment Detection

**Priority: HIGH**
**Location:** `frontend/src/` (main entry point or PixiJS initialization)

Add detection for headless/test environments:

```typescript
// Detect if running in headless mode
function isHeadlessEnvironment(): boolean {
  // Check for Playwright/headless indicators
  return (
    navigator.webdriver === true ||
    /headless/i.test(navigator.userAgent) ||
    process.env.NODE_ENV === 'test' ||
    window.Cypress !== undefined
  );
}
```

### 2. Force Canvas Renderer in Headless Mode

**Priority: HIGH**
**Location:** Where PixiJS Application is initialized

Modify PixiJS initialization to use Canvas2D renderer instead of WebGL when in headless mode:

```typescript
import { Application } from 'pixi.js';

const isHeadless = isHeadlessEnvironment();

const app = new Application({
  // Force canvas renderer in headless mode
  renderer: isHeadless ? 'canvas' : 'webgl',
  forceCanvas: isHeadless,

  // Existing configuration
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x1099bb,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});
```

**Alternative approach** using legacy PixiJS API (if using older version):

```typescript
import * as PIXI from 'pixi.js';

const isHeadless = isHeadlessEnvironment();

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x1099bb,
  // Add this to force canvas
  forceCanvas: isHeadless,
});

// Or explicitly create canvas renderer
if (isHeadless) {
  const renderer = new PIXI.CanvasRenderer({
    width: window.innerWidth,
    height: window.innerHeight,
  });
}
```

### 3. Investigate 403 Forbidden Error

**Priority: MEDIUM**
**Location:** Browser network console during test execution

**Steps to diagnose:**
1. Run a single test with network logging:
   ```bash
   npx playwright test debug-console.spec.ts --headed
   ```

2. Check browser console for the failing resource URL

3. Common causes:
   - Font files blocked by CORS
   - Texture/sprite assets with incorrect paths
   - Service worker registration failing
   - PWA manifest file missing

**Likely fix locations:**
- `frontend/vite.config.ts` - CORS configuration
- `frontend/public/manifest.json` - PWA manifest
- Font loading in CSS files
- Asset paths in component files

### 4. Add E2E Test Environment Variable

**Priority: MEDIUM**
**Location:** `frontend/playwright.config.ts`

Add environment variable to signal test mode:

```typescript
export default defineConfig({
  use: {
    baseURL: process.env.VITE_URL || 'http://localhost:5173',

    // Pass environment variable to application
    extraHTTPHeaders: {
      'X-E2E-Testing': 'true',
    },
  },

  webServer: [
    {
      command: 'cd ../backend && npm run start:prod',
      url: 'http://localhost:3000',
      env: {
        NODE_ENV: 'test',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      env: {
        VITE_E2E_MODE: 'true', // Signal to frontend
        NODE_ENV: 'test',
      },
    }
  ],
});
```

Then check in application:

```typescript
const isE2EMode = import.meta.env.VITE_E2E_MODE === 'true';
```

### 5. Mock Heavy Graphics for Tests (Alternative Approach)

**Priority: LOW** (only if canvas renderer still has issues)
**Location:** Create `frontend/src/__mocks__/pixi.js`

If canvas rendering still causes issues, mock PixiJS entirely for tests:

```typescript
// frontend/src/pixi-wrapper.ts
export async function createPixiApp(config: any) {
  const isTest = isHeadlessEnvironment();

  if (isTest) {
    // Return a mock that satisfies the interface
    return {
      stage: { addChild: () => {}, removeChild: () => {} },
      renderer: { render: () => {} },
      view: document.createElement('canvas'),
      ticker: { add: () => {}, remove: () => {} },
      destroy: () => {},
    };
  }

  // Real PixiJS initialization
  const { Application } = await import('pixi.js');
  return new Application(config);
}
```

### 6. Disable Animations in Test Mode

**Priority: LOW**
**Location:** Animation/game loop code

Reduce animation overhead during tests:

```typescript
if (isHeadlessEnvironment()) {
  // Reduce frame rate or disable animations
  app.ticker.maxFPS = 10; // Lower FPS for tests

  // Or disable completely
  app.ticker.stop();
}
```

## Implementation Order

1. **Phase 1** (Critical for basic tests):
   - Add headless detection function
   - Force Canvas renderer in headless mode
   - Test with `npx playwright test debug-console.spec.ts`

2. **Phase 2** (Fix resource loading):
   - Investigate 403 error
   - Fix asset loading issues
   - Test with basic room creation test

3. **Phase 3** (Optimization):
   - Add E2E environment variables
   - Optimize animations for test mode
   - Run full test suite

## Testing the Fixes

After implementing each fix, test with:

```bash
# Run single test
npx playwright test debug-console.spec.ts --reporter=list

# Run room creation tests
npx playwright test us1-create-room.spec.ts --reporter=list

# Run full suite
npm run test:e2e
```

## Docker Alternative (Recommended for CI/CD)

Instead of application fixes, use Playwright Docker image with GPU support:

```dockerfile
# .github/workflows/e2e.yml or docker-compose.yml
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy application
COPY . .

# Run tests with GPU access
RUN npm run test:e2e
```

Benefits:
- Consistent environment across local/CI
- Includes necessary graphics libraries
- Better WebGL support with software rendering
- No application code changes needed

## Expected Results After Fixes

With these fixes implemented:
- Page loads: ✅ (already working)
- Button interactions: ✅ (should work after canvas renderer fix)
- Room creation: ✅
- Game navigation: ✅
- PixiJS rendering: ✅ (via Canvas2D)

**Estimated implementation time:** 2-4 hours for phases 1-2

## References

- [PixiJS Renderer Options](https://pixijs.download/release/docs/PIXI.Application.html)
- [Playwright Headless Testing](https://playwright.dev/docs/ci)
- [Canvas vs WebGL Performance](https://pixijs.io/guides/basics/choosing-a-renderer.html)
