import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeMutation } from "../utils/graphqlClient.js";

export function registerMutationTool(server: McpServer) {
  server.tool(
    "guardrails_mutation",
    "Executes a GraphQL mutation to create, update, or delete managing resources, policy settings, and executing controls/policies.",
    {
      mutation: z.string().describe("GraphQL mutation string to execute"),
      variables: z.record(z.any()).optional().describe("Optional variables for the mutation")
    },
    async ({ mutation, variables = {} }) => {
      try {
        const result = await executeMutation(mutation, variables);
        return {
          content: [
            {
              type: "text",
              text: result,
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
              text: `Error executing GraphQL mutation: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );
}