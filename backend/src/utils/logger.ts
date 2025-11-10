/**
 * Structured Logging Service with Correlation IDs
 *
 * Provides structured logging for tracking game sessions and player actions.
 * Uses correlation IDs to trace operations across multiple service calls.
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  correlationId?: string;
  roomCode?: string;
  playerId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private correlationId: string | null = null;
  private context: LogContext = {};

  /**
   * Set correlation ID for the current execution context
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | null {
    return this.correlationId;
  }

  /**
   * Clear correlation ID
   */
  clearCorrelationId(): void {
    this.correlationId = null;
  }

  /**
   * Set persistent context that will be included in all logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.correlationId = this.correlationId;
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Log a message with a specific level
   */
  private log(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.context,
        ...context,
        ...(this.correlationId && { correlationId: this.correlationId }),
      },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // In production, send to logging service (e.g., Winston, Pino)
    // For now, output to console with structured JSON
    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(
    message: string,
    contextOrError?: LogContext | Error,
    error?: Error,
  ): void {
    if (contextOrError instanceof Error) {
      this.log(LogLevel.ERROR, message, {}, contextOrError);
    } else {
      this.log(LogLevel.ERROR, message, contextOrError, error);
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper to create a logger with room context
 */
export function createRoomLogger(roomCode: string): Logger {
  return logger.child({ roomCode });
}

/**
 * Helper to create a logger with player context
 */
export function createPlayerLogger(
  playerId: string,
  roomCode?: string,
): Logger {
  return logger.child({ playerId, roomCode });
}
