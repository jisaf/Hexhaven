import { Injectable, Logger } from '@nestjs/common';

export type LogCategory =
  | 'Component'
  | 'WebSocket'
  | 'State'
  | 'API'
  | 'Render'
  | 'Game-Logic'
  | 'DB'
  | 'I18n'
  | 'Default';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger('GameLogger');
  private enabledCategories: Set<LogCategory>;

  constructor() {
    const logCategories = process.env.LOG_CATEGORIES;
    if (logCategories) {
      this.enabledCategories = new Set(logCategories.split(',') as LogCategory[]);
      this.logger.log(`Logging enabled for categories: ${logCategories}`);
    } else {
      // Enable all categories by default
      this.enabledCategories = new Set<LogCategory>([
        'Component',
        'WebSocket',
        'State',
        'API',
        'Render',
        'Game-Logic',
        'DB',
        'I18n',
        'Default',
      ]);
      this.logger.log('LOG_CATEGORIES not set. Logging enabled for all categories.');
    }
  }

  log(category: LogCategory, message: string, ...data: unknown[]) {
    if (this.enabledCategories.has(category)) {
      this.logger.log(`[${category}] ${message}`, ...data);
    }
  }

  error(category: LogCategory, message: string, ...data: unknown[]) {
    if (this.enabledCategories.has(category)) {
      this.logger.error(`[${category}] ${message}`, ...data);
    }
  }

  warn(category: LogCategory, message: string, ...data: unknown[]) {
    if (this.enabledCategories.has(category)) {
      this.logger.warn(`[${category}] ${message}`, ...data);
    }
  }

  debug(category: LogCategory, message: string, ...data: unknown[]) {
    if (this.enabledCategories.has(category)) {
      this.logger.debug(`[${category}] ${message}`, ...data);
    }
  }
}
