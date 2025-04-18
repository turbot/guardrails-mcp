#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import config from "./config/env.js";
import { logger } from "./services/logger.js";

const { TURBOT_GRAPHQL_ENDPOINT } = config;

// Import tool registrations
import { setupTools } from "./tools/index.js";

// Import prompt registrations
import { registerPrompts, promptCapabilities } from "./prompts/index.js";

// Import resource registrations
import { setupResources, resourceCapabilities } from "./resources/index.js";

// // Import prompt registrations
// import { registerResourcePrompts } from "./prompts/resourceAnalysis.js";
// import { registerSecurityPrompts } from "./prompts/securityAnalysis.js";


// Create an MCP server
const server = new McpServer(
  {
    name: "guardrails",
    version: "0.0.1",
    description: "Use Guardrails to explore and query cloud resources on Turbot Guardrails. Provides tools to execute graphql queries against your Turbot Guardrails workspace.",
    vendor: "Turbot",
    homepage: "https://github.com/turbot/guardrails-mcp",
  },
  {
    capabilities: {
      tools: {},
      prompts: promptCapabilities.prompts,
      resources: resourceCapabilities,
    }
  }
);

// Register tools
setupTools(server.server);

// Register resources
setupResources(server.server);

// // Register prompts
// registerResourcePrompts(server);
// registerSecurityPrompts(server);

// Register prompts
registerPrompts(server);

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('Turbot Guardrails MCP Server running on stdio');
    logger.info('Server Version: 0.0.1');
    logger.info(`GraphQL Endpoint: ${TURBOT_GRAPHQL_ENDPOINT}`);
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch(error => {
  logger.error("Fatal error in main():", error);
  process.exit(1);
});
