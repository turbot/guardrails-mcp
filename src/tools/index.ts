import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerQueryTool } from "./query_guardrails.js";
import { registerMutationTool } from "./guardrails_mutation.js";
import { registerListResourceTypesTool } from "./list_resource_types.js";
import { registerListControlTypesTool } from "./list_control_types.js";
import { registerListPolicyTypesTool } from "./list_policy_types.js";
import { registerRunControlTool } from "./run_control.js";
import { registerQueryRunnableTool } from "./query_runnable.js";
import { registerQueryRunnableIntrospectionTool } from "./query_runnable_introspection.js";
import { registerProcessTemplateTool } from "./process_template.js";

export function registerTools(server: McpServer) {
  registerQueryTool(server);
  registerMutationTool(server);
  registerListResourceTypesTool(server);
  registerListControlTypesTool(server);
  registerListPolicyTypesTool(server);
  registerRunControlTool(server);
  registerQueryRunnableTool(server);
  registerQueryRunnableIntrospectionTool(server);
  registerProcessTemplateTool(server);
} 