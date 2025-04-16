import { z } from "zod";
import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/logger.js';
import { formatToolResponse, errorResponse } from '../utils/responseFormatter.mjs';

interface QueryRunnableParams {
  runnableTypeUri: string;
  resourceId?: string;
  query: string;
  variables?: Record<string, any>;
}

export const tool = {
  name: "guardrails_query_runnable",
  description: "Executes a GraphQL query against a specific runnable type URI, optionally using a resource ID for context",
  schema: {
    runnableTypeUri: z.string().describe("The URI of the runnable type (policy or control type)"),
    resourceId: z.string().optional().describe("Optional resource ID to provide context for the query"),
    query: z.string().describe("The GraphQL query to execute"),
    variables: z.record(z.any()).optional().describe("Optional variables for the query"),
  },
  handler: async ({ runnableTypeUri, resourceId, query, variables = {} }: QueryRunnableParams) => {
    try {
      // Construct the endpoint with query parameters
      const endpoint = `/api/v5/graphql?runnableTypeUri=${encodeURIComponent(runnableTypeUri)}${resourceId ? `&resourceId=${encodeURIComponent(resourceId)}` : ''}`;

      const result = await executeQuery(query, variables, endpoint);
      logger.debug("Query executed successfully");
      return formatToolResponse(result);
    } catch (error: any) {
      logger.error("Error executing query:", error);
      return errorResponse(error.message);
    }
  }
}; 