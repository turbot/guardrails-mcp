import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolRequest, type ServerResult } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../services/pinoLogger.js";
import { errorResponse } from "../utils/responseFormatter.mjs";
import type { ErrorObject } from "ajv";
import AjvModule from "ajv";

// Initialize JSON Schema validator
const Ajv = AjvModule.default || AjvModule;
const ajv = new Ajv();

// Import tools
import { tool as queryTool } from "./guardrails_query.js";
import { tool as listResourceTypesTool } from "./guardrails_resource_type_list.js";
import { tool as listControlTypesTool } from "./guardrails_control_type_list.js";
import { tool as listPolicyTypesTool } from "./guardrails_policy_type_list.js";
import { tool as listResourcesTool } from "./guardrails_resource_list.js";
import { tool as runControlTool } from "./guardrails_control_run.js";
import { tool as queryRunnableTool } from "./guardrails_query_runnable.js";
import { tool as queryRunnableIntrospectionTool } from "./guardrails_query_runnable_introspection.js";
import { tool as processTemplateTool } from "./guardrails_process_template.js";
import { tool as guardrailsControlTypeShowTool } from "./guardrails_control_type_show.js";
import { tool as guardrailsPolicyTypeShowTool } from "./guardrails_policy_type_show.js";
import { tool as guardrailsResourceTypeShowTool } from "./guardrails_resource_type_show.js";
import { tool as guardrailsResourceShowTool } from "./guardrails_resource_show.js";
import { tool as guardrailsControlListTool } from "./guardrails_control_list.js";
import { tool as guardrailsControlShowTool } from "./guardrails_control_show.js";

// Export all tools for server capabilities
export const tools = {
  // Core Guardrails Operations
  guardrails_query: queryTool,                                      // Execute GraphQL queries

  // Resource Operations
  guardrails_resource_list: listResourcesTool,                      // List resources
  guardrails_resource_show: guardrailsResourceShowTool,             // Show resource details

  // Resource Type Operations
  guardrails_resource_type_list: listResourceTypesTool,             // List resource types
  guardrails_resource_type_show: guardrailsResourceTypeShowTool,    // Show resource type details

  // Control Type Operations
  guardrails_control_type_list: listControlTypesTool,               // List control types
  guardrails_control_type_show: guardrailsControlTypeShowTool,      // Show control type details

  // Policy Type Operations
  guardrails_policy_type_list: listPolicyTypesTool,                 // List policy types
  guardrails_policy_type_show: guardrailsPolicyTypeShowTool,        // Show policy type details

  // Control Operations
  guardrails_control_list: guardrailsControlListTool,               // List controls
  guardrails_control_show: guardrailsControlShowTool,               // Show control details
  guardrails_control_run: runControlTool,                           // Run controls

  // Query and Template Operations
  guardrails_query_runnable: queryRunnableTool,                     // Query runnable types
  guardrails_query_runnable_introspection: queryRunnableIntrospectionTool,  // Introspect runnable types
  guardrails_process_template: processTemplateTool,                  // Process templates
};

// Initialize tool handlers
export function setupTools(server: Server) {
  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      return {
        tools: Object.values(tools),
      };
    } catch (error) {
      logger.error('Error listing tools:', error);
      return errorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // Register tool handlers
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;
    
    try {
      // Validate tool exists
      const tool = tools[name as keyof typeof tools];
      if (!tool) {
        logger.error(`Unknown tool: ${name}`);
        return errorResponse(`Unknown tool: ${name}`);
      }

      // Validate tool has handler
      if (!tool.handler) {
        logger.error(`Tool ${name} has no handler defined`);
        return errorResponse(`Tool ${name} has no handler defined`);
      }

      // Validate arguments against the tool's schema
      if (tool.inputSchema) {
        const validate = ajv.compile(tool.inputSchema);
        if (!validate(args)) {
          logger.error(`Invalid arguments for tool ${name}:`, validate.errors);
          
          // Format validation errors in a user-friendly way
          const errors = validate.errors || [];
          const errorMessages = errors.map((err: ErrorObject) => {
            const path = err.instancePath.replace(/^\//, '') || 'input';
            switch (err.keyword) {
              case 'required':
                return `Missing required field: ${err.params.missingProperty}`;
              case 'type':
                return `${path} must be a ${err.params.type}`;
              case 'enum':
                return `${path} must be one of: ${err.params.allowedValues?.join(', ')}`;
              case 'additionalProperties':
                return `Unexpected field: ${err.params.additionalProperty}`;
              default:
                return `${path}: ${err.message}`;
            }
          });

          return errorResponse(errorMessages.join('\n'));
        }
      }

      // Log tool invocation
      logger.info(`Executing tool: ${name}`, { args });

      // Execute tool handler with validated arguments
      const result = await (tool.handler as (args: unknown) => Promise<ServerResult>)(args || {});
      
      // Log tool completion
      logger.info(`Tool ${name} completed`);
      
      return result;
    } catch (error) {
      // Log error
      logger.error(`Error executing tool ${name}:`, error);
      
      // Format and return error
      return errorResponse(error instanceof Error ? error.message : String(error));
    }
  });
} 