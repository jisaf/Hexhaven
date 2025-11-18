import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable CORS for frontend
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'http://localhost:5173', // Vite dev server
        'http://localhost:4173', // Vite preview
        'http://150.136.173.159', // Production IP
        'http://10.1.1.80:5173', // Network dev server
      ];

  // In development, allow all origins
  const isDevelopment = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: isDevelopment ? true : corsOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  const server = await app.listen(port, '0.0.0.0');
  logger.log(`Application is listening on port ${port}`);

  // Manually initialize WebSocket after server starts
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
  const gameGateway = app.get(require('./websocket/game.gateway').GameGateway);
  gameGateway.server = io;

  // Call afterInit manually since decorators aren't working
  gameGateway.afterInit(io);

  // Wire up connection handlers
  io.on('connection', (socket) => {
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
  });

  logger.log('GameGateway handlers wired up to Socket.IO server')
}
void bootstrap();
