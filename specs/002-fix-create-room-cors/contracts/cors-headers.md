# CORS Headers Contract

**Feature**: 002-fix-create-room-cors
**Date**: 2025-11-11

## HTTP Response Headers

### Successful CORS Response

When a request from an allowed origin is made, the backend MUST include these headers:

```http
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Expose-Headers: X-Total-Count, X-Page
Access-Control-Max-Age: 3600
```

### Preflight OPTIONS Response

For preflight requests (OPTIONS method), backend MUST respond with:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 3600
```

### Rejected CORS Request

When origin is not in allowed list, backend MUST NOT include CORS headers:

```http
HTTP/1.1 200 OK
Content-Type: application/json
(No Access-Control-* headers)
```

Browser will block the response from reaching JavaScript.

## WebSocket Handshake Headers

### Successful WebSocket CORS

When WebSocket handshake from allowed origin:

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: [calculated value]
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

### Rejected WebSocket CORS

When origin not allowed:

```http
HTTP/1.1 403 Forbidden
(Connection closed immediately)
```

## Frontend Request Headers

### Required Request Headers

Frontend MUST send:

```http
Origin: http://localhost:5173
Content-Type: application/json
```

### Optional Request Headers

Frontend MAY send:

```http
Authorization: Bearer <token>
X-Requested-With: XMLHttpRequest
```

## Testing Contract

### Test Case 1: Allowed Origin

**Given**: Frontend on `http://localhost:5173`
**When**: POST to `http://localhost:3000/api/rooms`
**Then**: Response includes `Access-Control-Allow-Origin: http://localhost:5173`

### Test Case 2: Disallowed Origin

**Given**: Request from `http://malicious-site.com`
**When**: POST to `http://localhost:3000/api/rooms`
**Then**: Response lacks `Access-Control-Allow-Origin` header

### Test Case 3: Preflight Request

**Given**: Frontend needs to send JSON with credentials
**When**: Browser sends OPTIONS preflight
**Then**: 204 response with all CORS headers

### Test Case 4: WebSocket Connection

**Given**: Frontend on allowed origin
**When**: Connects to WebSocket namespace `/game`
**Then**: Connection succeeds with CORS headers

## Error Scenarios

### Browser Console Errors (Before Fix)

```
Access to fetch at 'http://localhost:3000/api/rooms' from origin
'http://localhost:5173' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Expected (After Fix)

No CORS errors in browser console. Successful API calls and WebSocket connections.

## Security Invariants

1. **Never** allow wildcard `*` origin with `credentials: true`
2. **Always** validate origin against configured whitelist
3. **Only** allow HTTPS origins in production (except localhost)
4. **Never** trust `Origin` header value without validation
5. **Always** use same-site cookies where applicable (defense in depth)

## Configuration Reference

### Development
```typescript
{
  origin: 'http://localhost:5173',
  credentials: true,
}
```

### Production
```typescript
{
  origin: ['https://app.hexhaven.com', 'https://www.hexhaven.com'],
  credentials: true,
}
```

## Compliance

- ✅ Follows MDN CORS best practices
- ✅ Complies with RFC 6454 (Web Origin Concept)
- ✅ Implements NestJS security recommendations
- ✅ Meets OWASP CORS security guidelines
