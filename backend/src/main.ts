import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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
