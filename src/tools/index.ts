import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tool as queryTool } from "./guardrails_query.js";
import { tool as listResourceTypesTool } from "./guardrails_resource_type_list.js";
import { tool as listControlTypesTool } from "./list_control_types.js";
import { tool as listPolicyTypesTool } from "./guardrails_policy_type_list.js";
import { tool as runControlTool } from "./guardrails_control_run.js";
import { tool as queryRunnableTool } from "./guardrails_query_runnable.js";
import { tool as queryRunnableIntrospectionTool } from "./guardrails_query_runnable_introspection.js";
import { tool as processTemplateTool } from "./guardrails_process_template.js";
import { tool as guardrailsControlTypeShowTool } from "./guardrails_control_type_show.js";
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
  processTemplateTool,
  guardrailsControlTypeShowTool
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