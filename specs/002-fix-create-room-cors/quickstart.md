# Quickstart: CORS Configuration Fix

**Feature**: 002-fix-create-room-cors
**Estimated Time**: < 5 minutes

## Quick Setup (Development)

### Prerequisites
- Node.js 20+ installed
- Backend and frontend dependencies installed (`npm ci` in both dirs)
- PostgreSQL running (for backend)

### 1. Enable CORS in Backend (Main Fix)

Edit `backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

### 2. Fix WebSocket CORS (Secondary Fix)

Edit `backend/src/websocket/game.gateway.ts`:

```typescript
import { config } from '../config/env.config';

@WebSocketGateway({
  cors: {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  },
  namespace: '/game',
})
export class GameGateway {
  // ... existing code
}
```

### 3. Add Error Test ID (Test Fix)

Edit `frontend/src/pages/Lobby.tsx` line ~397:

```typescript
{error && mode !== 'joining' && (
  <div className="error-banner" role="alert" data-testid="error-message">
    {error}
  </div>
)}
```

### 4. Test the Fix

```bash
# Terminal 1: Start backend
cd backend && npm run start:dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run E2E tests
cd frontend && CI=true npm run test:e2e tests/e2e/us1-create-room.spec.ts
```

**Expected Result**: All 4 tests pass ✅

### 5. Verify in Browser

1. Open http://localhost:5173
2. Open Browser DevTools → Network tab
3. Click "Create Game"
4. Check response headers include:
   ```
   Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Credentials: true
   ```

## Quick Verification Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] No CORS errors in browser console
- [ ] "Create Game" button creates a room and displays room code
- [ ] E2E tests pass (all 4 tests in us1-create-room.spec.ts)
- [ ] CI/CD pipeline passes (if running in GitHub Actions)

## Environment Variables (Optional)

### Development (default)
No changes needed. Uses `http://localhost:5173` by default.

### Custom Frontend Port
```bash
# backend/.env
CORS_ORIGIN=http://localhost:3000
```

### Production Setup
```bash
# backend/.env.production
CORS_ORIGIN=https://app.hexhaven.com,https://www.hexhaven.com
```

## Troubleshooting

### Issue: Still seeing CORS errors

**Solution 1**: Clear browser cache and reload
**Solution 2**: Check backend logs for startup errors
**Solution 3**: Verify `config.cors.origin` value:
```bash
# Add to main.ts temporarily
console.log('CORS Origin:', config.cors.origin);
```

### Issue: Tests still failing

**Solution 1**: Ensure using `CI=true` for headless mode
**Solution 2**: Check if backend built successfully:
```bash
cd backend && npm run build
```
**Solution 3**: Check Playwright output for specific error

### Issue: WebSocket connection fails

**Solution**: Verify game.gateway.ts uses `config.cors.origin` (not wildcard)

## What's Next?

After this quickstart:
1. Review full implementation plan in `specs/002-fix-create-room-cors/plan.md`
2. Review research findings in `specs/002-fix-create-room-cors/research.md`
3. Implement remaining tasks from `specs/002-fix-create-room-cors/tasks.md` (when generated)

## One-Line Fix (TL;DR)

Add to `backend/src/main.ts` after line 4:
```typescript
app.enableCors({ origin: config.cors.origin, credentials: config.cors.credentials });
```

That's the critical fix. Everything else is best practices and testing.
