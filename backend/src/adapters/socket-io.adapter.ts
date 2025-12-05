import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { LoggingService } from '../services/logging.service';

export class SocketIOAdapter extends IoAdapter {
  constructor(private readonly logger: LoggingService) {
    super();
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : [
          'http://localhost:5173',
          'http://localhost:4173',
          'http://150.136.173.159',
          'http://10.1.1.80:5173',
        ];

    const isDevelopment = process.env.NODE_ENV !== 'production';

    const serverOptions = {
      ...options,
      cors: {
        origin: isDevelopment ? '*' : corsOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    } as ServerOptions;

    this.logger.log('WebSocket', 'Creating Socket.IO server with options:', {
      cors: serverOptions.cors,
      transports: serverOptions.transports,
    });

    const server = super.createIOServer(port, serverOptions);
    this.logger.log('WebSocket', 'Socket.IO server created successfully');

    return server;
  }
}
