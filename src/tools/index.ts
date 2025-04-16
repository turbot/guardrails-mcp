import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tool as queryTool } from "./guardrails_query.js";
import { tool as listResourceTypesTool } from "./guardrails_resource_type_list.js";
import { tool as listControlTypesTool } from "./guardrails_control_type_list.js";
import { tool as listPolicyTypesTool } from "./guardrails_policy_type_list.js";
import { tool as runControlTool } from "./guardrails_control_run.js";
import { tool as queryRunnableTool } from "./guardrails_query_runnable.js";
import { tool as queryRunnableIntrospectionTool } from "./guardrails_query_runnable_introspection.js";
import { tool as processTemplateTool } from "./guardrails_process_template.js";
import { tool as guardrailsControlTypeShowTool } from "./guardrails_control_type_show.js";
import { logger } from "../services/logger.js";
import { validateInput } from '../utils/validation.js';
import { errorResponse } from '../utils/responseFormatter.mjs';
import { JSONSchemaType } from 'ajv';

interface BaseTool<T = unknown> {
  name: string;
  description: string;
  inputSchema: JSONSchemaType<T>;
  handler: (input: T) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
  }>;
}

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
] as BaseTool[];

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

    // Create a wrapped handler that validates input
    const wrappedHandler = async (input: unknown) => {
      // Validate input against schema
      const validation = validateInput(input, tool.inputSchema);
      if (!validation.isValid) {
        return errorResponse(`Invalid input: ${validation.errors.join(', ')}`);
      }

      // If validation passes, call the original handler
      return tool.handler(input as any);
    };

    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      wrappedHandler
    );
  });
} 