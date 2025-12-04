import { Logger } from '@nestjs/common';

const logger = new Logger('PortValidation');

/**
 * Validates and logs port configuration on application startup
 * Helps catch configuration mismatches between frontend and backend
 */
export function validatePortConfiguration(port: number): void {
  const expectedDevPort = 3001;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // Development mode validation
    if (port !== expectedDevPort) {
      logger.warn(
        `⚠️  Backend running on port ${port}, but frontend expects port ${expectedDevPort}. ` +
          `If you get "connection refused" errors, set PORT=${expectedDevPort} in backend/.env`,
      );
    } else {
      logger.log(`✅ Backend running on http://localhost:${port}`);
      logger.log(`   Frontend should connect successfully to this port`);
    }
  } else {
    // Production mode - port is behind Nginx reverse proxy
    logger.log(`✅ Backend running on port ${port} (internal, proxied by Nginx)`);
  }
}
