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
      ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is listening on port ${port}`);
}
void bootstrap();
