import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeQuery } from "../utils/graphqlClient.js";

interface QueryRunnableParams {
  runnableTypeUri: string;
  resourceId?: string;
  query: string;
  variables?: Record<string, any>;
}

export function registerQueryRunnableTool(server: McpServer) {
  server.tool(
    "query_runnable",
    "Executes a GraphQL query against a specific runnable type URI, optionally using a resource ID for context",
    {
      runnableTypeUri: z.string().describe("The URI of the runnable type (policy or control type)"),
      resourceId: z.string().optional().describe("Optional resource ID to provide context for the query"),
      query: z.string().describe("The GraphQL query to execute"),
      variables: z.record(z.any()).optional().describe("Optional variables for the query"),
    },
    async ({ runnableTypeUri, resourceId, query, variables = {} }: QueryRunnableParams) => {
      try {
        // Construct the endpoint with query parameters
        const endpoint = `/api/v5/graphql?runnableTypeUri=${encodeURIComponent(runnableTypeUri)}${resourceId ? `&resourceId=${encodeURIComponent(resourceId)}` : ''}`;

        const result = await executeQuery(query, variables, endpoint);
        return {
          content: [
            {
              type: "text",
              text: result
            }
          ]
        };
      } catch (error: any) {
        console.error(`Error executing query against runnable type: ${error.message}`);
        throw error;
      }
    }
  );
} 