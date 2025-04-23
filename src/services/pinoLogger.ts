import { pino, Logger, LoggerOptions } from 'pino';

// Define custom log levels to match our existing ones
const customLevels = {
  levels: {
    silent: Infinity,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20
  }
};

type LogLevel = keyof typeof customLevels.levels;

// Create base logger configuration
const loggerConfig: LoggerOptions = {
  level: process.env.GUARDRAILS_MCP_LOG_LEVEL || 'info',
  customLevels: customLevels,
  useOnlyCustomLevels: true,
  transport: {
    target: 'pino/file',
    options: { 
      destination: process.stderr,
      sync: true // Ensure logs are written synchronously for MCP protocol
    }
  },
  formatters: {
    level: (label: string) => ({ level: label }),
    // Add bindings for consistent log format
    bindings: () => ({
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown'
    })
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  enabled: process.env.NODE_ENV !== 'test'
};

// Create base logger instance
const baseLogger = pino(loggerConfig);

// Test logger implementation
export class TestLogger {
  private logs: any[] = [];

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    this.logs.push({
      time: timestamp,
      level,
      msg: message,
      ...(args.length > 0 && { args: this.formatArgs(args) })
    });
  }

  private formatArgs(args: any[]): any {
    return args.map(arg => {
      if (arg instanceof Error) {
        const { message, stack, ...rest } = arg;
        return {
          error: {
            message,
            stack,
            ...rest
          }
        };
      }
      return arg;
    });
  }

  getCollectedLogs(): any[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// Export the appropriate logger based on environment
export const logger = process.env.NODE_ENV === 'test' ? new TestLogger() : baseLogger; 