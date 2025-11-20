import { Controller, Get } from '@nestjs/common';

/**
 * Health check controller - available at root level (/health)
 * This is separate from the API controller to allow monitoring systems
 * to check application health without API authentication
 */
@Controller()
export class HealthController {
  @Get('health')
  getHealth(): { status: string; timestamp: string; version: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
