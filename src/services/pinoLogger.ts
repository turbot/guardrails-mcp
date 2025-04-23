import { pino, Logger, LoggerOptions } from 'pino';

// Create base logger configuration
const loggerConfig: LoggerOptions = {
  level: process.env.GUARDRAILS_MCP_LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
    // Add bindings for consistent log format
    bindings: () => ({
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown'
    })
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  enabled: true // Always enable, but use different transport for tests
};

// Create and export the logger instance
// Use direct stderr output without worker threads
export const logger = pino({
  ...loggerConfig,
  transport: undefined // Disable transport to use direct output
}, process.stderr); 