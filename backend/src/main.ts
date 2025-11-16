import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
// In production, this loads from /opt/hexhaven/.env
// In development, this loads from project root
const envPath = path.resolve(process.cwd(), '.env');
const dotenvResult = dotenv.config({ path: envPath });

// Log environment loading status for debugging
if (dotenvResult.error) {
  console.error(`[Bootstrap] Warning: Could not load .env from ${envPath}`);
  console.error(`[Bootstrap] Error: ${dotenvResult.error.message}`);
  console.log(
    `[Bootstrap] Continuing with system environment variables only`,
  );
} else {
  console.log(`[Bootstrap] Loaded environment from ${envPath}`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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
    ];
  }

  logger.log(`CORS enabled for origins: ${corsOrigins.join(', ')}`);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is listening on port ${port}`);
}
void bootstrap();
