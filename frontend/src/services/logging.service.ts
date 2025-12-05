import { LogCategory } from '../components/DebugConsole';

class LoggingService {
  log(category: LogCategory, ...args: unknown[]) {
    console.log(`[${category}]`, ...args);
  }

  warn(category: LogCategory, ...args: unknown[]) {
    console.warn(`[${category}]`, ...args);
  }

  error(category: LogCategory, ...args: unknown[]) {
    console.error(`[${category}]`, ...args);
  }

  info(category: LogCategory, ...args: unknown[]) {
    console.info(`[${category}]`, ...args);
  }
}

export const loggingService = new LoggingService();
