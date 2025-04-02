import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Buffer } from "buffer";
import colors from "colors";
import { GraphQLClient } from "graphql-request";
import config from "./config/env.js";

const { TURBOT_GRAPHQL_ENDPOINT } = config;

// Import tool registrations
import { registerTools } from "./tools/index.js";

// Import prompt registrations
import { registerPrompts } from "./prompts/index.js";

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
      prompts: {},
      resources: {},
    }
  }
);

// Register tools
registerTools(server);

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
    // We use console.error instead of console.log since console.log will output to stdio, which will confuse the MCP server
    console.error('Turbot Guardrails MCP Server running on stdio');
    console.error('Server Version: 0.0.1');
    console.error(`GraphQL Endpoint: ${TURBOT_GRAPHQL_ENDPOINT}`);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
