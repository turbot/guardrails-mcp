import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tool as queryTool } from "./query_guardrails.js";
import { tool as listResourceTypesTool } from "./list_resource_types.js";
import { tool as listControlTypesTool } from "./list_control_types.js";
import { tool as listPolicyTypesTool } from "./list_policy_types.js";
import { tool as runControlTool } from "./run_control.js";
import { tool as queryRunnableTool } from "./query_runnable.js";
import { tool as queryRunnableIntrospectionTool } from "./query_runnable_introspection.js";
import { tool as processTemplateTool } from "./process_template.js";
import { logger } from "../services/logger.js";

// Register all available tools
const tools = [
  queryTool,
  listResourceTypesTool,
  listControlTypesTool,
  listPolicyTypesTool,
  runControlTool,
  queryRunnableTool,
  queryRunnableIntrospectionTool,
  processTemplateTool
];

// Export tools for server capabilities
export const toolCapabilities = {
  tools: Object.fromEntries(
    tools.map(t => [t.name, {
      name: t.name,
      description: t.description
    }])
  )
};

export function registerTools(server: McpServer) {
  // Register each tool
  tools.forEach(tool => {
    logger.debug(`Registering tool: ${tool.name}`);
    server.tool(
      tool.name,
      tool.description,
      tool.schema,
      tool.handler
    );
  });
} 