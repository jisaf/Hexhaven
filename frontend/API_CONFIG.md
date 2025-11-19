# API Configuration Guide

## Overview

The frontend now uses dynamic URL detection that automatically works with:
- ✅ localhost development
- ✅ Any IP address (e.g., 150.136.173.159)
- ✅ Custom domains
- ✅ Different ports

## How It Works

The `frontend/src/config/api.ts` file provides two main functions:

### `getApiUrl()`
Returns the correct API URL based on the current environment:
- **Localhost**: `http://localhost:3000/api`
- **Production/Remote**: `http://<current-host>/api`

### `getWebSocketUrl()`
Returns the correct WebSocket URL:
- **Localhost**: `http://localhost:3000`
- **Production/Remote**: `http://<current-host>`

## Usage

Instead of using environment variables directly, import and use the helper functions:

```typescript
import { getApiUrl, getWebSocketUrl } from '../config/api';

// For API calls
const apiUrl = getApiUrl();
const response = await fetch(`${apiUrl}/rooms`);

// For WebSocket connections
const wsUrl = getWebSocketUrl();
websocketService.connect(wsUrl);
```

## Environment Variables (Optional)

You can still override the auto-detection with environment variables if needed:

**Development** (`.env.development`):
```
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

**Production** (`.env.production`):
```
VITE_API_URL=https://yourdomain.com/api
VITE_WS_URL=https://yourdomain.com
```

## Architecture

### Local Development
```
Frontend (localhost:5173) → Backend (localhost:3000)
                         ↓
                   WebSocket (localhost:3000)
```

### Production with Nginx
```
Client → Nginx (port 80/443)
              ↓
         Frontend files (served statically)
              ↓
         /api → Backend (proxied to port 3000)
              ↓
         WebSocket (upgraded connection)
```

## Files Updated

The following files have been updated to use the dynamic configuration:

1. `frontend/src/config/api.ts` - New configuration helper
2. `frontend/src/pages/Lobby.tsx` - Room creation and management
3. `frontend/src/hooks/useWebSocket.ts` - WebSocket connection
4. `frontend/src/components/ScenarioSelectionPanel.tsx` - Scenario fetching

## Testing

### Test on Localhost
Access: http://localhost:5173
- API URL will be: `http://localhost:3000/api`
- WS URL will be: `http://localhost:3000`

### Test on IP Address
Access: http://150.136.173.159
- API URL will be: `http://150.136.173.159/api`
- WS URL will be: `http://150.136.173.159`

### Test on Custom Domain
Access: https://hexhaven.example.com
- API URL will be: `https://hexhaven.example.com/api`
- WS URL will be: `https://hexhaven.example.com` (wss:// for WebSocket)

## Debugging

The `logApiConfig()` function logs the current configuration:

```typescript
import { logApiConfig } from '../config/api';

logApiConfig();
// Logs: { apiUrl: "...", wsUrl: "...", location: {...} }
```

This is automatically called when the Lobby component mounts, so check your browser console to see the detected URLs.
