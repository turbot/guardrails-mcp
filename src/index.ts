#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import config from "./config/env.js";
import { logger } from "./services/pinoLogger.js";
import { setupResources, resourceCapabilities } from "./resources/index.js";
import { setupResourceTemplates, resourceTemplates } from "./resourceTemplates/index.js";
import { setupTools, tools } from "./tools/index.js";
import { registerPrompts, promptCapabilities } from "./prompts/index.js";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

// Server metadata
const SERVER_INFO = {
  name: "guardrails",
  version: pkg.version,
  description: pkg.description,
  vendor: pkg.author,
  homepage: pkg.homepage,
} as const;

// Handle graceful shutdown
function setupShutdownHandlers() {
  const gracefulShutdown = async () => {
    process.exit(0);
  };
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

/**
 * Start the MCP server
 */
async function main() {
  const startTime = Date.now();
  logger.info('Starting server...');

  try {
    // Set up shutdown handlers
    setupShutdownHandlers();
    logger.info('Shutdown handlers configured');

    // Initialize server
    logger.info('Creating MCP server instance...');
    const serverStartTime = Date.now();
    const server = new McpServer(
      SERVER_INFO,
      {
        capabilities: {
          tools,
          prompts: promptCapabilities.prompts,
          resources: resourceCapabilities,
          resourceTemplates
        }
      }
    );
    logger.info(`MCP server instance created (took ${Date.now() - serverStartTime}ms)`);

    // Initialize handlers
    logger.info('Setting up handlers...');
    const handlersStartTime = Date.now();
    setupTools(server.server);
    logger.info('Tools handlers initialized');
    setupResources(server.server);
    logger.info('Resource handlers initialized');
    setupResourceTemplates(server.server);
    logger.info('Resource template handlers initialized');
    registerPrompts(server);
    logger.info(`All handlers initialized successfully (took ${Date.now() - handlersStartTime}ms)`);

    // Connect transport
    logger.info('Connecting transport...');
    const transportStartTime = Date.now();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info(`Transport connected successfully (took ${Date.now() - transportStartTime}ms)`);

    const totalTime = Date.now() - startTime;
    logger.info(`Server started successfully (total initialization time: ${totalTime}ms)`);
    logger.info(`GraphQL Endpoint: ${config.TURBOT_GRAPHQL_ENDPOINT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main();
