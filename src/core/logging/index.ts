type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

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

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

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
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(prefix, entry.message, entry.data ?? '');
          break;
      }
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.addLog(this.createEntry('debug', message, context, data));
  }

  info(message: string, context?: string, data?: unknown): void {
    this.addLog(this.createEntry('info', message, context, data));
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.addLog(this.createEntry('warn', message, context, data));
  }

  error(message: string, context?: string, data?: unknown): void {
    this.addLog(this.createEntry('error', message, context, data));
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
