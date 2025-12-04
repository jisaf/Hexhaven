# Backend Port Configuration Reference

**Last Updated**: 2025-12-04
**Status**: Standardized on port 3001 for development

---

## Quick Summary

- **Development:** Port 3001 (Frontend: 5173, Backend: 3001)
- **Production:** Port 3000 (behind Nginx reverse proxy, not exposed)

---

## Development Environment

### URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **WebSocket**: ws://localhost:3001/socket.io

### Port Configuration
- Frontend (Vite): **5173** (default, auto-increments if unavailable)
- Backend (NestJS): **3001** (configurable via PORT env var)

---

## Production Environment

### URLs
- **Frontend**: https://hexhaven.game (served by Nginx)
- **Backend API**: https://hexhaven.game/api (proxied to localhost:3000)
- **WebSocket**: https://hexhaven.game/socket.io (proxied to localhost:3000)

### Architecture
- Nginx listens on ports 80/443 (public)
- Backend runs on port 3000 (internal only, not exposed)
- All external traffic goes through Nginx reverse proxy
- Frontend auto-detects production and uses `/api` path

---

## Files Controlling Port Configuration

### Development (Port 3001)

**Backend:**
- `backend/.env` - Contains `PORT=3001`
- `backend/src/main.ts` - Default fallback to 3001 (line 73)
- `backend/src/config/env.config.ts` - Default fallback to 3001 (line 52)
- `backend/.env.example` - Template with PORT=3001

**Frontend:**
- `frontend/src/config/api.ts` - Auto-detection logic, uses port 3001 for localhost
- `frontend/.env.development` - Optional VITE_BACKEND_PORT override
- `frontend/src/config/api.ts:33` - `getApiUrl()` returns `http://localhost:3001/api`
- `frontend/src/config/api.ts:62` - `getWebSocketUrl()` returns `http://localhost:3001`

### Production (Port 3000)

**Backend:**
- `scripts/setup-server.sh` - Sets `BACKEND_PORT="3000"`
- `/etc/nginx/sites-available/hexhaven` - Nginx config proxies to `localhost:3000`
- `/opt/hexhaven/.env` - Production environment with `PORT=3000`

**Frontend:**
- `frontend/src/config/api.ts` - Detects production and uses `/api` path instead of explicit port

---

## Port Validation

The backend includes automatic port validation on startup:

**File:** `backend/src/config/validate-ports.ts`

**Behavior:**
- Development: Checks if port is 3001, logs warning if different
- Production: Logs that backend is running behind Nginx proxy

**Log Output Examples:**
```
✅ Backend running on http://localhost:3001
   Frontend should connect successfully to this port
```

```
⚠️  Backend running on port 3002, but frontend expects port 3001.
    If you get "connection refused" errors, set PORT=3001 in backend/.env
```

---

## How to Change Development Port

If you need to use a different port (e.g., 3002):

### Backend
1. Edit `backend/.env`
   ```
   PORT=3002
   ```

### Frontend
2. Edit `frontend/.env.development` (or create it)
   ```
   VITE_BACKEND_PORT=3002
   ```

### Restart Servers
3. Restart both frontend and backend:
   ```bash
   npm run dev
   ```

---

## Troubleshooting

### "Backend connection refused" or "Failed to fetch" errors?

**Symptoms:**
- Frontend shows "Failed to fetch active rooms: Failed to fetch"
- WebSocket connection errors in browser console
- "ERR_CONNECTION_REFUSED" at localhost:3001

**Root Cause:** Backend and frontend ports don't match

**Solution Steps:**

1. **Check backend is running:**
   ```bash
   ps aux | grep nest
   # OR
   lsof -i :3001
   ```

2. **Check backend port:**
   ```bash
   cat backend/.env | grep PORT
   ```
   Should show: `PORT=3001`

3. **Check backend logs:**
   ```bash
   npm run dev:backend 2>&1 | grep -i port
   ```
   Should show: "Application is listening on port 3001"

4. **Verify .env file:**
   - Make sure `backend/.env` exists (not just `.env.example`)
   - Verify it contains `PORT=3001`

5. **Restart backend:**
   ```bash
   cd backend
   npm run dev
   ```

### Backend running on wrong port (3000 instead of 3001)?

**Possible causes:**
1. `.env` file is missing → Create it from `.env.example`
2. `.env` has wrong value → Edit and change to `PORT=3001`
3. Environment variable override → Check `echo $PORT` in terminal

**Fix:**
```bash
cd backend
cp .env.example .env  # If .env doesn't exist
echo "PORT=3001" >> .env  # Or manually edit .env
npm run dev
```

### Frontend connecting to wrong port?

**Check:**
1. Look at browser console Network tab
2. See what URL it's trying to connect to
3. If it's not localhost:3001, check `frontend/src/config/api.ts`

**Override with environment variable:**
```bash
# frontend/.env.development
VITE_BACKEND_PORT=3001
```

Then restart frontend:
```bash
cd frontend
npm run dev
```

### Production "connection refused" errors?

**Check:**
1. Nginx is running: `sudo systemctl status nginx`
2. Backend is running: `sudo systemctl status hexhaven-backend`
3. Nginx proxy is configured: `sudo cat /etc/nginx/sites-available/hexhaven | grep "proxy_pass"`

Should see:
```nginx
proxy_pass http://localhost:3000/;
```

---

## Port Reference Table

| Component | Development | Production | Type | Exposed |
|-----------|-------------|------------|------|---------|
| Frontend | 5173 | 443 (Nginx) | HTTP/HTTPS | Yes |
| Backend API | 3001 | 3000 | Internal | Development only |
| API Path | /api | /api | Via Nginx proxy | Yes (production) |
| WebSocket | :3001 | /socket.io | Via Nginx proxy | Yes |

---

## Key Files Reference

### Backend Configuration
- **Port defaults**:
  - `backend/src/main.ts:73` - `PORT ?? 3001`
  - `backend/src/config/env.config.ts:52` - `PORT || '3001'`
- **Environment**:
  - `backend/.env` - Active config
  - `backend/.env.example` - Template
- **Validation**:
  - `backend/src/config/validate-ports.ts` - Port validation logic

### Frontend Configuration
- **Port detection**:
  - `frontend/src/config/api.ts:33` - `getApiUrl()` function
  - `frontend/src/config/api.ts:62` - `getWebSocketUrl()` function
- **Environment**:
  - `frontend/.env.development` - Optional VITE_BACKEND_PORT override

### Scripts
- **Development**: `start-dev.sh` - Shows port 3001 in output
- **Production**: `scripts/setup-server.sh` - Sets up Nginx with port 3000

### Documentation
- **README.md** - Updated to show port 3001
- **SETUP.md** - Updated to show port 3001
- **AGENTS.md** - Contains troubleshooting guide

### Production Configuration
- **Nginx**: `/etc/nginx/sites-available/hexhaven` - Reverse proxy config
- **Systemd**: `/etc/systemd/system/hexhaven-backend.service` - Backend service
- **Environment**: `/opt/hexhaven/.env` - Production environment file

---

## Historical Context

### Why Port 3001?

**Before Fix (Inconsistent):**
- Backend defaulted to port 3000 in code
- Actual development `.env` had port 3001
- `.env.example` had port 3000 (didn't match)
- Frontend hardcoded port 3001
- Documentation claimed port 3000
- Result: "Flaky" backend - sometimes 3000, sometimes 3001

**After Fix (Consistent):**
- All development components standardized on port 3001
- Backend defaults to 3001 (matches frontend expectation)
- `.env.example` updated to 3001 (matches actual usage)
- Documentation updated to reflect reality
- Port validation warns of misconfigurations

### Why Different Ports for Dev vs Production?

**Development (3001):**
- Direct connection for debugging
- Port 3000 might conflict with other local services
- Clear separation: Frontend (5173), Backend (3001)

**Production (3000):**
- Backend is internal-only (not exposed to internet)
- Nginx handles all external traffic on 80/443
- Port number doesn't matter externally (proxied via Nginx)
- Port 3000 is historical convention for internal backend

---

## Related Documentation

- **Troubleshooting Guide**: `AGENTS.md` > "Backend Server Port Configuration"
- **Setup Instructions**: `README.md` > "Quick Start"
- **Development Guide**: `SETUP.md` > "Development URLs"
- **Production Deployment**: `PRODUCTION_DEPLOYMENT.md`

---

**Note**: This document is automatically maintained by Claude Code. Last reviewed: 2025-12-04.
