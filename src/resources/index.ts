import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../services/logger.js";
import { errorResponse } from "../utils/responseFormatter.mjs";
import { handleStatusResource } from "./status.js";

// Export all available resources
export const resources = [
  handleStatusResource
];

// Export resource capabilities
export const resourceCapabilities = {
  "guardrails://status": {
    name: "status",
    description: "Status information about the Guardrails workspace"
  }
};

// Setup resource handlers
export function setupResources(server: Server) {
  // Register resource list handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      return {
        resources: [
          {
            name: "status",
            uri: "guardrails://status",
            description: "Status information about the Guardrails workspace"
          }
        ]
      };
    } catch (error) {
      logger.error('Error listing resources:', error);
      return errorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // Register resource get handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    try {
      // Try each resource handler until one returns a non-null result
      for (const handler of resources) {
        const result = await handler(uri);
        if (result !== null) {
          return result;
        }
      }
      
      // If no handler returned a result, return an error
      return errorResponse(`Resource not found: ${uri}`);
    } catch (error) {
      logger.error(`Error getting resource ${uri}:`, error);
      return errorResponse(error instanceof Error ? error.message : String(error));
    }
  });
} 