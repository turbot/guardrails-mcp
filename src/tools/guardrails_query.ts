import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeQuery } from "../utils/graphqlClient.js";

export function registerQueryTool(server: McpServer) {
  server.tool(
    "guardrails_query",
    "Executes a GraphQL query to retrieve data.",
    {
      query: z.string().describe("GraphQL query string to execute"),
      variables: z.record(z.any()).optional().describe("Optional variables for the mutation")
    },
    async ({ query, variables = {} }) => {
      try {
        const resources = await executeQuery(query, variables);
        return {
          content: [
            {
              type: "text",
              text: resources,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error executing GraphQL query: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );
} 