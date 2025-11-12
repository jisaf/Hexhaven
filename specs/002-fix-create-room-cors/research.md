# CORS Configuration Research for HexHaven

**Date:** 2025-11-11
**Issue:** Frontend "Failed to fetch" errors due to missing CORS configuration
**Backend:** NestJS on port 3000
**Frontend:** Vite/React on port 5173

## Executive Summary

This research evaluates NestJS CORS configuration approaches for both HTTP and WebSocket connections, with a focus on security, maintainability, and support for development and production environments.

## Current State Analysis

### Backend (`/home/opc/hexhaven/backend/src/main.ts`)
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
```
**Issue:** No CORS configuration enabled in main.ts

### Existing Configuration (`/home/opc/hexhaven/backend/src/config/env.config.ts`)
```typescript
cors: {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}
```
**Status:** Configuration exists but not applied

### WebSocket Gateway (`/home/opc/hexhaven/backend/src/websocket/game.gateway.ts`)
```typescript
@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on environment
    credentials: true,
  },
  namespace: '/game',
})
```
**Issue:** Insecure wildcard origin; needs environment-based configuration

## Research Findings

### 1. How to Properly Enable CORS in NestJS main.ts

#### Method 1: Basic Configuration (Development)
```typescript
app.enableCors(); // Allows all origins
```
**Use Case:** Quick development setup
**Security:** Insecure for production

#### Method 2: Direct Object Configuration
```typescript
app.enableCors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
});
```
**Use Case:** Simple, single-origin setup
**Security:** Secure but inflexible

#### Method 3: Environment-Based Configuration (Recommended)
```typescript
import { config } from './config/env.config';

app.enableCors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: config.cors.credentials,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page'],
  maxAge: 3600, // Cache preflight for 1 hour
});
```
**Use Case:** Production-ready, environment-aware
**Security:** Secure and flexible

### 2. Best Practices for CORS Configuration

#### Development vs. Production

**Development:**
- Allow specific localhost origins (e.g., `http://localhost:5173`)
- Enable credentials for cookie/session support
- Allow all common HTTP methods
- Relaxed but still controlled

**Production:**
- Whitelist specific domains only
- Never use wildcard (`*`) with credentials
- Restrict to required HTTP methods only
- Validate origins dynamically
- Use environment variables for flexibility

#### Security Checklist

1. **Never** use `origin: '*'` in production
2. **Never** combine `origin: '*'` with `credentials: true` (not allowed)
3. **Always** validate origins in production
4. **Always** use HTTPS origins in production
5. **Always** specify required methods explicitly
6. **Consider** using origin validation functions for multiple domains

### 3. CORS with Credentials Support

#### HTTP Configuration
```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = getCorsOrigins(); // From config
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allows cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### Important Notes on Credentials
- `credentials: true` allows cookies, HTTP authentication, and client certificates
- When using credentials, `Access-Control-Allow-Origin` cannot be wildcard
- Frontend must also set `credentials: 'include'` or `withCredentials: true`
- Required for session-based authentication

### 4. CORS for HTTP and WebSocket

NestJS requires separate CORS configuration for HTTP and WebSocket connections.

#### HTTP (main.ts)
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.listen(config.port);
}
```

#### WebSocket (game.gateway.ts)
```typescript
import { config, getCorsOrigins } from '../config/env.config';

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(), // Array of allowed origins
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  namespace: '/game',
})
export class GameGateway {
  // ...
}
```

#### Alternative: IoAdapter Approach
```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure WebSocket CORS globally
  app.useWebSocketAdapter(new IoAdapter(app, {
    cors: {
      origin: config.cors.origin,
      credentials: config.cors.credentials,
    },
  }));

  // Configure HTTP CORS
  app.enableCors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  });

  await app.listen(config.port);
}
```

### 5. Security Considerations

#### Origin Validation Strategies

**Static Whitelist (Simple)**
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://yourdomain.com',
  'https://www.yourdomain.com',
];

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
});
```

**Dynamic Validation (Advanced)**
```typescript
app.enableCors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getCorsOrigins();

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

**Regex Pattern Matching (Multiple Subdomains)**
```typescript
app.enableCors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedPatterns = [
      /^https:\/\/.*\.yourdomain\.com$/,
      /^http:\/\/localhost:\d+$/,
    ];

    const isAllowed = allowedPatterns.some(pattern =>
      pattern.test(origin)
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

#### Environment Variable Configuration

**.env.development**
```bash
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**.env.production**
```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**Parsing Multiple Origins**
```typescript
export function getCorsOrigins(): string[] {
  if (Array.isArray(config.cors.origin)) {
    return config.cors.origin;
  }
  // Support comma-separated origins
  return config.cors.origin.split(',').map(origin => origin.trim());
}
```

#### Common Security Pitfalls

1. **Using wildcard with credentials** (not allowed by browsers)
2. **Not handling undefined origin** (occurs with non-browser clients)
3. **Exposing sensitive endpoints** without proper validation
4. **Missing preflight OPTIONS handling** (automatically handled by NestJS)
5. **Misconfigured reverse proxies** stripping CORS headers
6. **Over-permissive methods/headers** allowing unnecessary access

#### Additional Security Measures

**Rate Limiting**
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
})
```

**Helmet for Security Headers**
```typescript
import helmet from 'helmet';

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
```

## Decision: Recommended CORS Configuration

### Approach: Environment-Based Configuration with Existing Config Module

Use the existing `env.config.ts` configuration structure and apply it consistently to both HTTP and WebSocket connections.

### Implementation Strategy

1. **Update main.ts** to use existing CORS configuration
2. **Update game.gateway.ts** to use configuration instead of wildcard
3. **Enhance env.config.ts** to support multiple origins (comma-separated)
4. **Set environment variables** for development and production

### Recommended Code

#### main.ts
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config, getCorsOrigins } from './config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for HTTP requests
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 3600, // Cache preflight for 1 hour
  });

  await app.listen(config.port);
}
void bootstrap();
```

#### game.gateway.ts
```typescript
import { getCorsOrigins } from '../config/env.config';

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // ... existing implementation
}
```

#### env.config.ts (enhancement)
```typescript
// Add to existing config
cors: {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173'],
  credentials: true,
},
```

#### .env
```bash
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://localhost:5432/hexhaven_dev
```

## Rationale

### Why This Approach?

1. **Leverages Existing Infrastructure**
   - Uses the established `env.config.ts` pattern
   - Maintains consistency across the codebase
   - No need for additional configuration modules

2. **Security-First Design**
   - Explicit origin whitelisting
   - No wildcard usage in any environment
   - Credentials support for authentication
   - Environment-based configuration

3. **Development-Friendly**
   - Simple localhost configuration for development
   - Easy to test with frontend on port 5173
   - Clear error messages for debugging

4. **Production-Ready**
   - Environment variables for deployment flexibility
   - Support for multiple production domains
   - Proper credentials handling
   - Standard HTTP methods and headers

5. **WebSocket Compatible**
   - Consistent CORS configuration across HTTP and WS
   - Proper Socket.io integration
   - Supports both polling and WebSocket transports

6. **Maintainable**
   - Single source of truth (env.config.ts)
   - Clear separation of concerns
   - Easy to update for new environments

## Alternatives Considered

### Alternative 1: IoAdapter Global Configuration

**Approach:** Use IoAdapter to configure WebSocket CORS globally in main.ts

**Pros:**
- Centralized configuration in one file
- Single point of control

**Cons:**
- Less explicit about WebSocket configuration
- Harder to customize per gateway
- Additional abstraction layer

**Verdict:** Not chosen due to reduced clarity and flexibility

### Alternative 2: Wildcard with Dynamic Validation

**Approach:** Use wildcard with origin validation callback

**Pros:**
- Most flexible approach
- Can implement complex validation logic

**Cons:**
- More complex code
- Potential for validation bugs
- Harder to debug

**Verdict:** Not chosen due to unnecessary complexity for current needs

### Alternative 3: Separate CORS Middleware

**Approach:** Custom CORS middleware with validation logic

**Pros:**
- Maximum control
- Custom error handling
- Can add logging/analytics

**Cons:**
- Reinventing the wheel
- More code to maintain
- Testing overhead

**Verdict:** Not chosen; NestJS built-in CORS is sufficient

### Alternative 4: Allow All Origins in Development

**Approach:** Use `origin: '*'` in development, strict in production

**Pros:**
- Simplest development setup
- No configuration needed locally

**Cons:**
- Different behavior across environments
- Harder to catch CORS issues early
- Security risk if deployed accidentally

**Verdict:** Not chosen; consistency is more important

## Code Examples

### Complete Implementation

#### 1. Environment Configuration
```typescript
// backend/src/config/env.config.ts
export interface Config {
  env: Environment;
  port: number;
  database: {
    url: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  // ... other config
}

function loadConfig(): Config {
  const env = (process.env.NODE_ENV || 'development') as Environment;

  // Parse CORS origins from environment
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const corsOrigins = corsOrigin.split(',').map(origin => origin.trim());

  const config: Config = {
    env,
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/hexhaven_dev',
    },
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    // ... other config
  };

  // Validation
  if (env === Environment.Production && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set in production');
  }

  return config;
}

export const config = loadConfig();

export function getCorsOrigins(): string[] {
  return config.cors.origin;
}
```

#### 2. Main Application Bootstrap
```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config, getCorsOrigins } from './config/env.config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for HTTP requests
  const corsOrigins = getCorsOrigins();
  logger.log(`Enabling CORS for origins: ${corsOrigins.join(', ')}`);

  app.enableCors({
    origin: corsOrigins,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 3600,
  });

  await app.listen(config.port);
  logger.log(`Application listening on port ${config.port}`);
  logger.log(`Environment: ${config.env}`);
}
void bootstrap();
```

#### 3. WebSocket Gateway
```typescript
// backend/src/websocket/game.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  // ... other imports
} from '@nestjs/websockets';
import { getCorsOrigins } from '../config/env.config';

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  // ... rest of implementation
}
```

#### 4. Frontend Configuration (for reference)

**Fetch API**
```typescript
// frontend/src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function createRoom(scenarioId: string): Promise<Room> {
  const response = await fetch(`${API_BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies/sessions
    body: JSON.stringify({ scenarioId }),
  });

  if (!response.ok) {
    throw new Error('Failed to create room');
  }

  return response.json();
}
```

**Socket.io Client**
```typescript
// frontend/src/services/socket.ts
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const socket = io(`${SOCKET_URL}/game`, {
  transports: ['websocket', 'polling'],
  withCredentials: true, // Important for CORS with credentials
});
```

### Testing CORS Configuration

#### Manual Testing
```bash
# Test from command line
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     --verbose \
     http://localhost:3000/api/rooms

# Should see:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

#### Automated Test
```typescript
// backend/test/cors.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CORS Configuration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply same CORS config as main.ts
    app.enableCors({
      origin: ['http://localhost:5173'],
      credentials: true,
    });
    await app.init();
  });

  it('should allow requests from localhost:5173', () => {
    return request(app.getHttpServer())
      .options('/api/rooms')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'http://localhost:5173')
      .expect('Access-Control-Allow-Credentials', 'true');
  });

  it('should reject requests from unknown origins', () => {
    return request(app.getHttpServer())
      .options('/api/rooms')
      .set('Origin', 'http://evil.com')
      .set('Access-Control-Request-Method', 'POST')
      .expect((res) => {
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Implementation Checklist

- [ ] Update `env.config.ts` to parse comma-separated CORS origins
- [ ] Add CORS configuration to `main.ts` using `app.enableCors()`
- [ ] Update `game.gateway.ts` to use `getCorsOrigins()` instead of wildcard
- [ ] Set `CORS_ORIGIN` environment variable in `.env`
- [ ] Test HTTP endpoints from frontend (e.g., create room)
- [ ] Test WebSocket connection from frontend
- [ ] Add CORS configuration validation to startup logs
- [ ] Document CORS configuration in README or deployment guide
- [ ] Add CORS tests to test suite
- [ ] Configure production environment variables

## References

- [NestJS Official CORS Documentation](https://docs.nestjs.com/security/cors)
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Socket.io CORS Configuration](https://socket.io/docs/v4/handling-cors/)
- [Enabling CORS in NestJS for Production](https://felixastner.com/articles/enabling-cors-in-nestjs)
- [NestJS CORS Best Practices](https://wanago.io/2023/07/17/api-nestjs-cors-cross-origin-resource-sharing/)

## Conclusion

The recommended approach provides a secure, maintainable, and production-ready CORS configuration for HexHaven. It leverages the existing configuration infrastructure, provides environment-based flexibility, and properly secures both HTTP and WebSocket connections. The implementation is straightforward and aligns with NestJS best practices while maintaining security as a top priority.
