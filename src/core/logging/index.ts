type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private static instance: Logger;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    };
  }

  private emit(entry: LogEntry): void {
    if (import.meta.env.DEV || entry.level === 'error') {
      const prefix = `[ICDP${entry.context ? `:${entry.context}` : ''}]`;
      switch (entry.level) {
        case 'error':
          console.error(prefix, entry.message, entry.data ?? '');
          break;
        case 'warn':
          console.warn(prefix, entry.message, entry.data ?? '');
          break;
        case 'info':
          // eslint-disable-next-line no-console
          console.info(prefix, entry.message, entry.data ?? '');
          break;
      }
    }
  }

  info(message: string, context?: string, data?: unknown): void {
    this.emit(this.createEntry('info', message, context, data));
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.emit(this.createEntry('warn', message, context, data));
  }

  error(message: string, context?: string, data?: unknown): void {
    this.emit(this.createEntry('error', message, context, data));
  }
}

export const logger = Logger.getInstance();
