export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

class Logger {
  private formatError(err: unknown) {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }
    if (typeof err === 'string') {
      return { message: err };
    }
    return undefined;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, err?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: this.formatError(err),
    };

    if (process.env.NODE_ENV === 'production') {
      // In production, emit serialized JSON for log aggregation (Datadog, CloudWatch, etc.)
      const output = JSON.stringify(entry);
      if (level === 'error') {
        console.error(output);
      } else if (level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      // In development / test, print readable message with prefix
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      if (level === 'error') {
        console.error(prefix, message, context || '', err || '');
      } else if (level === 'warn') {
        console.warn(prefix, message, context || '');
      } else if (level === 'debug') {
        console.debug(prefix, message, context || '');
      } else {
        console.log(prefix, message, context || '');
      }
    }

    return entry;
  }

  info(message: string, context?: Record<string, any>) {
    return this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    return this.log('warn', message, context);
  }

  error(message: string, err?: unknown, context?: Record<string, any>) {
    return this.log('error', message, context, err);
  }

  debug(message: string, context?: Record<string, any>) {
    return this.log('debug', message, context);
  }
}

export const logger = new Logger();
