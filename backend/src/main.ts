import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GameGateway } from './websocket/game.gateway';
import { validatePortConfiguration } from './config/validate-ports';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { CardTemplateCache } from './utils/card-template-cache';
import { PrismaService } from './services/prisma.service';
import { AuthService } from './services/auth.service';

// Load environment variables from .env file
// In production, this loads from /opt/hexhaven/.env
// In development, this loads from project root
const envPath = path.resolve(process.cwd(), '.env');
const dotenvResult = dotenv.config({ path: envPath });

// Log environment loading status for debugging
if (dotenvResult.error) {
  console.error(`[Bootstrap] Warning: Could not load .env from ${envPath}`);
  console.error(`[Bootstrap] Error: ${dotenvResult.error.message}`);
  console.log(`[Bootstrap] Continuing with system environment variables only`);
} else {
  console.log(`[Bootstrap] Loaded environment from ${envPath}`);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Creating NestJS application...');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  logger.log('NestJS application created successfully');

  // Initialize CardTemplateCache (load all card templates once)
  const prismaService = app.get(PrismaService);
  await CardTemplateCache.initialize(prismaService);
  logger.log('CardTemplateCache initialized');

  // Apply global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());
  logger.log('Global exception filter registered');

  // Apply global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payloads to DTO instances
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: false, // Don't throw errors for extra properties
    }),
  );
  logger.log('Global validation pipe registered');

  // Log startup environment info
  logger.log(`Node environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Working directory: ${process.cwd()}`);

  // Enable CORS for frontend
  // Support both CORS_ORIGINS (plural, comma-separated) and CORS_ORIGIN (singular)
  let corsOrigins: string[];
  if (process.env.CORS_ORIGINS) {
    // Multiple origins, comma-separated
    corsOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
  } else if (process.env.CORS_ORIGIN) {
    // Single origin
    corsOrigins = [process.env.CORS_ORIGIN.trim()];
  } else {
    // Default to localhost for development
    corsOrigins = [
      'http://localhost:5173', // Vite dev server
      'http://localhost:4173', // Vite preview
      'http://150.136.173.159', // Production IP
      'http://10.1.1.80:5173', // Network dev server
      'https://test.hexhaven.net', // Domain
      'http://test.hexhaven.net', // Domain (http)
      'https://qa.hexhaven.net', // QA domain
      'http://qa.hexhaven.net', // QA domain (http)
      'https://hexhaven.net', // Production domain
      'http://hexhaven.net', // Production domain (http)
      'https://www.hexhaven.net', // Production domain (www)
      'http://www.hexhaven.net', // Production domain (www, http)
      'https://ripe-wombats-divide.loca.lt', // Frontend tunnel
      'http://localhost:3000', // Backend local
    ];
  }

  logger.log(`CORS enabled for origins: ${corsOrigins.join(', ')}`);

  // In development, allow all origins
  const isDevelopment = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: isDevelopment ? true : corsOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  const server = await app.listen(port, '0.0.0.0');
  logger.log(`Application is listening on port ${port}`);

  // Validate port configuration and log helpful warnings
  validatePortConfiguration(Number(port));

  // TODO: Investigate why NestJS @WebSocketGateway decorators don't work in this setup
  // See commit 71b3194 for context on the decorator issue.
  // The decorators should automatically:
  //   1. Initialize Socket.IO server
  //   2. Register @SubscribeMessage handlers
  //   3. Call lifecycle hooks (afterInit, handleConnection, etc.)
  //
  // Potential causes to investigate:
  //   - Monorepo structure affecting decorator metadata
  //   - Missing or misconfigured Socket.IO adapter
  //   - TypeScript compilation settings (tsconfig.json)
  //   - NestJS version compatibility
  //   - Execution order issues with app.listen()
  //
  // If decorators can be fixed, remove all manual wiring below and simplify to:
  //   await app.listen(port, '0.0.0.0');
  //
  // Manual WebSocket initialization (temporary workaround):
  // Note: NestJS @WebSocketGateway decorators don't work reliably in this setup
  const { Server: SocketIOServer } = await import('socket.io');
  const io = new SocketIOServer(server, {
    cors: {
      origin: isDevelopment ? '*' : corsOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  logger.log(`Socket.IO server initialized on port ${port}`);

  // Get GameGateway instance and wire it up to the Socket.IO server
  const gameGateway = app.get(GameGateway);
  gameGateway.server = io;

  // Get AuthService for JWT verification
  const authService = app.get(AuthService);

  // Call afterInit manually since decorators aren't working
  gameGateway.afterInit(io);

  // Wire up connection handlers with JWT authentication
  io.on('connection', (socket) => {
    // Verify JWT token from auth header
    const token = socket.handshake.auth?.token;

    if (token) {
      try {
        const payload = authService.verifyAccessToken(token);
        // Store database userId on socket for use in all handlers
        socket.data.userId = payload.userId;
        logger.debug(
          `Socket ${socket.id} authenticated as user ${payload.userId}`,
        );
      } catch (error) {
        logger.warn(
          `Socket ${socket.id} failed JWT verification: ${String(error)}`,
        );
        socket.emit('error', {
          code: 'AUTH_INVALID',
          message: 'Invalid or expired token',
        });
        socket.disconnect();
        return;
      }
    } else {
      // No token provided - reject connection for authenticated actions
      logger.warn(`Socket ${socket.id} connected without JWT token`);
      socket.emit('error', {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
      socket.disconnect();
      return;
    }

    gameGateway.handleConnection(socket);

    socket.on('disconnect', () => {
      gameGateway.handleDisconnect(socket);
    });

    socket.on('join_room', (payload) => {
      gameGateway.handleJoinRoom(socket, payload);
    });

    socket.on('leave_room', () => {
      gameGateway.handleLeaveRoom(socket);
    });

    socket.on('select_character', (payload) => {
      gameGateway.handleSelectCharacter(socket, payload);
    });

    socket.on('start_game', (payload) => {
      gameGateway.handleStartGame(socket, payload);
    });

    socket.on('move_character', (payload) => {
      gameGateway.handleMoveCharacter(socket, payload);
    });

    socket.on('select_cards', (payload) => {
      gameGateway.handleSelectCards(socket, payload);
    });

    socket.on('attack_target', (payload) => {
      gameGateway.handleAttackTarget(socket, payload);
    });

    socket.on('collect_loot', (payload) => {
      gameGateway.handleCollectLoot(socket, payload);
    });

    socket.on('end_turn', (payload) => {
      gameGateway.handleEndTurn(socket, payload);
    });

    socket.on('execute-rest', (payload) => {
      gameGateway.handleExecuteRest(socket, payload);
    });

    socket.on('rest-action', (payload) => {
      gameGateway.handleRestAction(socket, payload);
    });

    socket.on('acknowledge_narrative', (payload) => {
      gameGateway.handleAcknowledgeNarrative(socket, payload);
    });
  });

  logger.log('GameGateway handlers wired up to Socket.IO server');
}
void bootstrap();
