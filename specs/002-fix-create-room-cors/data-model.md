# Data Model: CORS Configuration Fix

**Feature**: 002-fix-create-room-cors
**Date**: 2025-11-11

## Overview

This feature involves configuration changes only - no new data models are introduced. The existing data models for room creation remain unchanged.

## Configuration Entities

### CORS Configuration Object

**Location**: `backend/src/config/env.config.ts`

```typescript
interface CorsConfig {
  origin: string | string[];  // Allowed origins
  credentials: boolean;       // Allow credentials (cookies, auth headers)
  methods?: string[];         // Allowed HTTP methods
  allowedHeaders?: string[];  // Allowed request headers
  exposedHeaders?: string[];  // Headers exposed to client
  maxAge?: number;           // Preflight cache duration (seconds)
}
```

**Fields**:
- `origin`: Single origin string or array of allowed origins
  - Development: `'http://localhost:5173'`
  - Production: Array from `CORS_ORIGIN` env var (comma-separated)
- `credentials`: Always `true` for cookie/session support
- `methods`: HTTP methods allowed for CORS requests
- `allowedHeaders`: Request headers frontend can send
- `exposedHeaders`: Response headers frontend can read
- `maxAge`: Browser caching for preflight OPTIONS requests

**Validation Rules**:
- `origin` must not be `'*'` when `credentials: true` (security requirement)
- `origin` must be valid HTTP(S) URLs
- Production origins must use HTTPS (except localhost)

### Environment Variables

**Existing** (no changes to structure):
```bash
# Backend
PORT=3000
CORS_ORIGIN=http://localhost:5173  # Development default

# Production (multiple origins)
CORS_ORIGIN=https://app.hexhaven.com,https://www.hexhaven.com
```

**New Usage**:
- `CORS_ORIGIN` value now split on commas to support multiple origins
- Applied to both HTTP (main.ts) and WebSocket (game.gateway.ts)

## State Transitions

### CORS Request Flow

```
1. Browser makes preflight OPTIONS request (for non-simple requests)
   ↓
2. Backend validates origin against configured CORS origins
   ↓
3a. If origin allowed → Response with CORS headers
3b. If origin not allowed → Response without CORS headers (browser blocks)
   ↓
4. Browser receives CORS headers (or lack thereof)
   ↓
5a. Headers valid → Browser sends actual request
5b. Headers invalid → Browser blocks request, frontend gets error
```

### WebSocket CORS Flow

```
1. Frontend initiates WebSocket handshake with origin header
   ↓
2. Socket.io validates origin against gateway configuration
   ↓
3a. Origin allowed → WebSocket connection established
3b. Origin rejected → Connection refused with 403
```

## No Database Changes

This feature only modifies application configuration. No database schema changes, migrations, or data persistence required.

## Affected Components

### Backend
- `backend/src/main.ts` - Add `enableCors()` call
- `backend/src/config/env.config.ts` - Parse comma-separated origins
- `backend/src/websocket/game.gateway.ts` - Use config instead of wildcard

### Frontend
- No changes required (already configured correctly)
- `frontend/src/pages/Lobby.tsx:151` - Existing fetch call will work once CORS enabled

### Tests
- `frontend/tests/e2e/us1-create-room.spec.ts` - No changes needed
- Existing tests will pass once CORS is configured

## Security Considerations

### Validation
- Origins validated on every request (stateless)
- No origin mutation or dynamic expansion
- Strict string matching (no regex patterns for security)

### Attack Prevention
- **CSRF**: Credentials with explicit origins prevents CSRF via origin validation
- **XSS**: Not directly CORS-related, handled by CSP and output encoding
- **Man-in-the-Middle**: Use HTTPS in production (enforced by deployment config)

### Audit Trail
- CORS rejections logged at DEBUG level
- No PII in logs (only origin URLs)

## Configuration Matrix

| Environment | HTTP Origin | WebSocket Origin | Credentials | Methods |
|-------------|-------------|------------------|-------------|---------|
| Development | `http://localhost:5173` | Same | `true` | All |
| Test (CI) | `http://localhost:5173` | Same | `true` | All |
| Staging | `https://staging.hexhaven.com` | Same | `true` | All |
| Production | `https://app.hexhaven.com` | Same | `true` | Required only |

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [NestJS: Enable CORS](https://docs.nestjs.com/security/cors)
- [Socket.io: CORS](https://socket.io/docs/v4/handling-cors/)
