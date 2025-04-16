import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/logger.js';
import { formatToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

type QueryRunnableParams = {
  runnableTypeUri: string;
  resourceId?: string | null;
  query: string;
  variables?: Record<string, any> | null;
};

export const tool: Tool = {
  name: "guardrails_query_runnable",
  description: "Executes a GraphQL query against a specific runnable type URI, optionally using a resource ID for context",
  inputSchema: {
    type: "object",
    properties: {
      runnableTypeUri: {
        type: "string",
        description: "The URI of the runnable type (policy or control type)"
      },
      resourceId: {
        type: "string",
        description: "Optional resource ID to provide context for the query"
      },
      query: {
        type: "string",
        description: "The GraphQL query to execute"
      },
      variables: {
        type: "object",
        description: "Optional variables for the query"
      }
    },
    required: ["runnableTypeUri", "query"],
    additionalProperties: false
  },
  handler: async ({ runnableTypeUri, resourceId, query, variables = {} }: QueryRunnableParams) => {
    try {
      // Construct the endpoint with query parameters
      const endpoint = `/api/v5/graphql?runnableTypeUri=${encodeURIComponent(runnableTypeUri)}${resourceId ? `&resourceId=${encodeURIComponent(resourceId)}` : ''}`;

      const result = await executeQuery(query, variables || {}, endpoint);
      logger.debug("Query executed successfully");
      return formatToolResponse(result);
    } catch (error: any) {
      logger.error("Error executing query:", error);
      return errorResponse(error.message);
    }
  }
}; 